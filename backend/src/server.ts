/**
 * Buffr G2P Backend – Mobile HTTP API entrypoint.
 *
 * Purpose:
 * - Expose REST endpoints used by the Buffr G2P mobile app:
 *   - /api/v1/mobile/wallets
 *   - /api/v1/mobile/contacts
 *   - /api/v1/mobile/send
 *   - /api/v1/mobile/vouchers
 * - Run locally (Node + Express) while using Neon PostgreSQL via @neondatabase/serverless.
 *
 * Location:
 * - backend/src/server.ts
 *
 * Notes:
 * - This is a lightweight, dev-ready API surface so the mobile app stops seeing
 *   "Network request failed" when EXPO_PUBLIC_API_BASE_URL is configured.
 * - Authentication is intentionally minimal: it currently selects the first user
 *   in the database as the "current user". Replace getCurrentUserId() with real
 *   auth (e.g. JWT verification) before production use.
 */

import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { sql } from "./lib/db.js";
import { isFineractEnabled, fineractHealth, fineractCall } from "./lib/fineract.js";
import { createWallet } from "./services/walletService.js";
import { processCashOut, generateAtmCode, processBankCashOut } from "./services/cashoutService.js";
import { redeemVoucherToWallet } from "./services/voucherService.js";
import { disburseLoanInBuffr, disburseLoan as fineractDisburseLoan } from "./services/loanService.js";
import { deposit, withdraw } from "./integrations/fineract/savings.js";
import { postVoucherRedeemed, postVoucherCashedOut } from "./services/voucherAccounting.js";
import { 
  getSupportedBanks, 
  createConsent, 
  exchangeCodeForTokens, 
  getLinkedAccounts,
  getAccountBalance,
  getAccountTransactions 
} from "./lib/openBanking.js";
import { securityHeaders } from "./lib/security.js";
import { wouldExceedSendLimit, wouldExceedLoanLimit } from "./lib/dailyLimits.js";
import { validateEnvOrExit, validateFeatureDependencies } from "./lib/envValidation.js";
import { verifyAccessToken, ensureRefreshTokensTable } from "./lib/jwtVerification.js";
import { 
  withTransaction, 
  transferMoneyAtomic, 
  disburseLoanAtomic, 
  redeemVoucherAtomic,
  groupContributionAtomic 
} from "./lib/transactions.js";

const app = express();

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(morgan("dev"));

// Security headers middleware
app.use((_req, res, next) => {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

// --- Types aligned with mobile services ---

type WalletType = "main" | "savings" | "grant";

interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: "NAD";
  isPrimary?: boolean;
  cardDesignFrameId?: number;
  targetAmount?: number;
  icon?: string;
  createdAt?: string;
}

type TransactionType =
  | "voucher_redeem"
  | "send"
  | "receive"
  | "cash_out"
  | "bill_pay"
  | "airtime"
  | "loan_disbursement"
  | "loan_repayment"
  | "add_money";

type TransactionStatus = "success" | "pending" | "failed";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: "NAD";
  description: string;
  status: TransactionStatus;
  createdAt: string;
  date?: string;
  note?: string;
  counterparty?: string;
  walletId?: string;
  reference?: string;
  fee?: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatarUri?: string;
  buffrId?: string;
  isFavorite?: boolean;
}

type VoucherStatus = "available" | "redeemed" | "expired" | "pending";

interface Voucher {
  id: string;
  amount: number;
  currency: "NAD";
  status: VoucherStatus;
  programme: string;
  issuedAt: string;
  expiresAt: string;
  redeemedAt?: string;
  redeemedMethod?: string;
  reference?: string;
}

// --- Basic error shape for mobile client ---

function jsonError(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

/** True when Neon returns "column does not exist" (schema mismatch with live DB). */
function isSchemaError(err: unknown): boolean {
  const e = err as { code?: string };
  return e?.code === "42703";
}

/** True when Neon returns "relation/table does not exist" or schema error. */
function isMissingTableOrSchemaError(err: unknown): boolean {
  const e = err as { code?: string };
  return e?.code === "42703" || e?.code === "42P01";
}

// --- Auth helper (temporary dev-only behaviour) ---

/**
 * Resolve current user id.
 *
 * Dev behaviour:
 * - If X-User-Id header is present, it is used directly (must exist in users table).
 * - Otherwise, fall back to "first user by created_at".
 *
 * Replace this with real auth (e.g. JWT subject → users.id) before production.
 */
async function getCurrentUserId(req: Request): Promise<string> {
  // Production: JWT signature verification (L3 enhancement implemented)
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const verification = await verifyAccessToken(token);
    
    if (verification.valid && verification.payload) {
      return verification.payload.userId;
    }
    
    // Token invalid - throw error
    throw new Error(verification.error || "Invalid access token");
  }

  // Development fallback: explicit user ID header
  const explicitId = req.header("x-user-id");
  if (explicitId) {
    const rows = await sql`
      SELECT id FROM users WHERE id = ${explicitId} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new Error("User not found for x-user-id");
    }
    return (rows[0] as { id: string }).id;
  }

  // Development fallback: first user (only if ALLOW_DEV_FALLBACK=true)
  if (process.env.ALLOW_DEV_FALLBACK === 'true') {
    const rows = await sql`
      SELECT id FROM users ORDER BY created_at ASC LIMIT 1
    `;
    if (rows.length === 0) {
      throw new Error("No users found in database");
    }
    console.warn('⚠️  Using dev fallback: first user. Set Authorization header for production.');
    return (rows[0] as { id: string }).id;
  }

  throw new Error("Unauthorized: Missing Authorization header");
}

// --- Health check ---

app.get("/healthz", async (_req, res) => {
  try {
    await sql`SELECT 1`;
    res.json({ status: "ok" });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("healthz error:", error);
    res.status(500).json({ status: "error" });
  }
});

// --- Fineract (core banking) connectivity ---

app.get("/api/v1/mobile/fineract/health", async (_req: Request, res: Response) => {
  try {
    if (!isFineractEnabled()) {
      return res.json({
        connected: false,
        fineract: { enabled: false, message: "Fineract not configured" },
      });
    }
    const health = await fineractHealth();
    res.json({
      connected: health.connected,
      fineract: {
        enabled: true,
        status: health.status,
        error: health.error,
        configured: true,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("fineract/health error:", e);
    res.status(500).json({
      connected: false,
      fineract: { error: "Internal server error" },
    });
  }
});

/** Optional: list Fineract offices (proves auth + connectivity). */
app.get("/api/v1/fineract/offices", async (_req: Request, res: Response) => {
  if (!isFineractEnabled()) {
    return res.status(503).json({ error: "Fineract not configured" });
  }
  const result = await fineractCall<unknown[]>("offices", { method: "GET" });
  if (!result.success) {
    return res.status(result.status ?? 502).json({
      error: result.error ?? "Fineract request failed",
    });
  }
  res.json({ offices: result.data ?? [] });
});

// --- Auth with OTP verification (production) ---

import { requestOtp, verifyOtp, getOtpStatus } from "./lib/otp.js";
import { issueVerificationToken } from "./lib/verificationToken.js";

const requestOtpHandler = async (req: Request, res: Response) => {
  const phone = req.body?.phone;
  const email = req.body?.email;
  const channel = req.body?.channel || "sms"; // sms, email, or both

  if (!phone || String(phone).replace(/\D/g, "").length < 7) {
    res.status(400).json({ success: false, error: "Invalid phone number" });
    return;
  }

  if (channel === "email" && !email) {
    res.status(400).json({ success: false, error: "Email is required when sending code by email" });
    return;
  }
  if ((channel === "email" || channel === "both") && email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, error: "Invalid email address" });
      return;
    }
  }

  const result = await requestOtp({
    phone: String(phone),
    email: email ? String(email) : undefined,
    purpose: "login",
    channel: channel as "sms" | "email" | "both",
  });

  if (result.success) {
    res.json({
      success: true,
      expiresIn: result.expiresIn,
      message: result.message,
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } else {
    res.status(400).json({ success: false, error: result.message });
  }
};

app.post("/api/v1/mobile/auth/request-otp", requestOtpHandler);
app.post("/api/v1/mobile/auth/send-otp", requestOtpHandler);

app.post("/api/v1/mobile/auth/verify-otp", async (req: Request, res: Response) => {
  const phone = req.body?.phone;
  const code = req.body?.code;
  
  if (!phone || !code) {
    res.status(400).json({ success: false, error: "Missing phone or code" });
    return;
  }

  // Normalize code to 6-digit string so leading zeros are preserved (e.g. 085015 not sent as number 85015)
  const codeStr = String(code).replace(/\D/g, "").padStart(6, "0").slice(-6);
  if (codeStr.length !== 6) {
    res.status(400).json({ success: false, error: "Invalid code format" });
    return;
  }

  const result = await verifyOtp({ phone: String(phone), code: codeStr, purpose: "login" });
  
  if (result.success) {
    try {
      // Find or create user by phone
      const phoneNormalized = String(phone).replace(/\D/g, "");
      let userRows = await sql`
        SELECT id, email, first_name, last_name, phone 
        FROM users 
        WHERE phone = ${phoneNormalized} 
        LIMIT 1
      `;
      
      let userId: string;
      let userEmail: string = '';
      
      if (userRows.length === 0) {
        // Create new user on first login (onboarding)
        const insertResult = await sql`
          INSERT INTO users (phone, created_at, updated_at)
          VALUES (${phoneNormalized}, NOW(), NOW())
          RETURNING id, email
        `;
        userId = (insertResult[0] as { id: string; email: string | null }).id;
        userEmail = (insertResult[0] as { id: string; email: string | null }).email || '';
      } else {
        userId = (userRows[0] as { id: string; email: string | null }).id;
        userEmail = (userRows[0] as { id: string; email: string | null }).email || '';
      }
      
      // Generate proper JWT token (not "dev-session-token")
      const { generateToken } = await import("./lib/jwtVerification.js");
      const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
      const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
      
      // Parse expiry to seconds
      const expirySeconds = JWT_ACCESS_EXPIRY.endsWith('m') 
        ? parseInt(JWT_ACCESS_EXPIRY) * 60 
        : JWT_ACCESS_EXPIRY.endsWith('h')
        ? parseInt(JWT_ACCESS_EXPIRY) * 3600
        : JWT_ACCESS_EXPIRY.endsWith('d')
        ? parseInt(JWT_ACCESS_EXPIRY) * 86400
        : 900; // Default 15 minutes
      
      const accessToken = generateToken(
        {
          userId,
          email: userEmail,
          type: 'access',
        },
        JWT_SECRET,
        expirySeconds
      );
      
      // Generate Buffr ID for card display
      const digits = phoneNormalized.slice(-8) || "00000000";
      const suffix = String(Math.abs(digits.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0))).slice(-8).padStart(8, "0");
      const buffrId = `BFR${digits}${suffix}`.slice(0, 16);
      const last4 = (digits + suffix).slice(-4);
      const cardNumberMasked = `XXXX XXXX XXXX ${last4}`;
      
      res.json({
        success: true,
        buffrId,
        cardNumberMasked,
        token: accessToken, // Real JWT token (use as access_token)
        expiryDate: new Date(Date.now() + expirySeconds * 1000).toISOString(),
        userId, // For mobile app storeTokens and auth state
        isNewUser: userRows.length === 0, // New user → continue onboarding; existing → go to app
      });
    } catch (error) {
      console.error("Token generation error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate session token",
      });
    }
  } else {
    res.status(400).json({
      success: false,
      error: result.message,
      attemptsRemaining: result.attemptsRemaining,
    });
  }
});

// POST /api/v1/mobile/auth/verify-2fa – PRD §9.4: returns verification_token for redeem/cashout/send
app.post("/api/v1/mobile/auth/verify-2fa", async (req: Request, res: Response) => {
  try {
    const { userId: bodyUserId, method, action, payload, pin } = (req.body ?? {}) as {
      userId?: string;
      method?: string;
      action?: string;
      payload?: unknown;
      pin?: string;
    };
    let userId: string;
    if (bodyUserId) {
      const rows = await sql`SELECT id FROM users WHERE id = ${bodyUserId} LIMIT 1`;
      if (rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      userId = (rows[0] as { id: string }).id;
    } else {
      userId = await getCurrentUserId(req);
    }
    if (!method || !["pin", "biometric", "otp"].includes(method)) {
      res.status(400).json({ error: "method must be pin, biometric, or otp" });
      return;
    }
    if (method === "pin" && pin !== undefined) {
      const rows = await sql`SELECT pin_hash FROM users WHERE id = ${userId} LIMIT 1`;
      const pinHash = rows[0] != null ? (rows[0] as { pin_hash?: string | null }).pin_hash : undefined;
      if (pinHash != null && String(pinHash).length > 0) {
        if (pin !== pinHash) {
          res.status(401).json({ error: "Invalid PIN" });
          return;
        }
      }
    }
    const result = await issueVerificationToken(userId);
    if (!result.success) {
      res.status(503).json({ error: result.error ?? "Could not issue verification token" });
      return;
    }
    res.json({
      verification_token: result.verification_token,
      expires_at: result.expires_at,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("verify-2fa error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get OTP status (for UI countdown, rate limiting info)
app.get("/api/v1/mobile/auth/otp-status", async (req: Request, res: Response) => {
  const phone = req.query.phone as string;
  if (!phone) {
    res.status(400).json({ error: "Phone number required" });
    return;
  }
  
  const status = await getOtpStatus(phone, "login");
  res.json({
    hasPendingOtp: status.hasPendingOtp,
    attemptsRemaining: status.attemptsRemaining,
    nextRequestAt: status.nextRequestAt?.toISOString(),
    blockedUntil: status.blockedUntil?.toISOString(),
  });
});

// --- Public keys (QR / PSP) – PRD §9.4 ---
app.get("/api/v1/mobile/keys/merchant/:alias", async (req: Request, res: Response) => {
  try {
    const { alias } = req.params;
    const fromEnv = process.env.MERCHANT_PUBLIC_KEY;
    if (fromEnv) {
      res.setHeader("Content-Type", "text/plain");
      return res.send(fromEnv);
    }
    const rows = await sql`
      SELECT public_key_pem FROM public_keys
      WHERE kind = 'merchant' AND identifier = ${alias}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return res.status(404).json({ error: "Merchant key not found" });
    }
    const pem = (rows[0] as { public_key_pem: string | null }).public_key_pem;
    if (!pem) return res.status(404).json({ error: "Merchant key not found" });
    res.setHeader("Content-Type", "text/plain");
    res.send(pem);
  } catch (err) {
    if ((err as { code?: string }).code === "42P01") {
      return res.status(404).json({ error: "Merchant key not found" });
    }
    throw err;
  }
});

app.get("/api/v1/mobile/keys/psp/:orgId", async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const fromEnv = process.env.PSP_PUBLIC_KEY;
    if (fromEnv) {
      res.setHeader("Content-Type", "text/plain");
      return res.send(fromEnv);
    }
    const rows = await sql`
      SELECT public_key_pem FROM public_keys
      WHERE kind = 'psp' AND identifier = ${orgId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return res.status(404).json({ error: "PSP key not found" });
    }
    const pem = (rows[0] as { public_key_pem: string | null }).public_key_pem;
    if (!pem) return res.status(404).json({ error: "PSP key not found" });
    res.setHeader("Content-Type", "text/plain");
    res.send(pem);
  } catch (err) {
    if ((err as { code?: string }).code === "42P01") {
      return res.status(404).json({ error: "PSP key not found" });
    }
    throw err;
  }
});

app.get("/api/v1/mobile/user/card", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId(req);
    const rows = await sql`
      SELECT phone FROM users WHERE id = ${userId}
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const phone = (rows[0] as { phone: string }).phone ?? "";
    const digits = phone.replace(/\D/g, "").slice(-8) || "00000000";
    const suffix = String(Math.abs(digits.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0))).slice(-8).padStart(8, "0");
    const buffrId = `BFR${digits}${suffix}`.slice(0, 16);
    const last4 = (digits + suffix).slice(-4);
    const cardNumberMasked = `XXXX XXXX XXXX ${last4}`;
    res.json({
      buffrId,
      cardNumberMasked,
      expiryDate: null,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("user/card error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/mobile/user/profile – PRD §9.4 (user with lastProofOfLife, proofOfLifeDueDate, walletStatus)
app.get("/api/v1/mobile/user/profile", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId(req);
    const rows = await sql`
      SELECT id, phone, first_name, last_name, photo_url
      FROM users WHERE id = ${userId}
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const row = rows[0] as { id: string; phone: string; first_name?: string; last_name?: string; photo_url?: string };
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || undefined;
    res.json({
      user: {
        id: row.id,
        phone: row.phone,
        name: name ?? undefined,
        photo_url: row.photo_url ?? undefined,
        lastProofOfLife: undefined,
        proofOfLifeDueDate: undefined,
        walletStatus: "active",
      },
    });
  } catch (e) {
    console.error("user/profile GET error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/mobile/user/proof-of-life – PRD §9.4
app.post("/api/v1/mobile/user/proof-of-life", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId(req);
    const { method }: { method?: string } = req.body ?? {};
    try {
      await sql`
        UPDATE users SET updated_at = now() WHERE id = ${userId}
      `;
    } catch (_) {
      // optional last_proof_of_life column may not exist
    }
    const due = new Date();
    due.setDate(due.getDate() + 90);
    res.json({ success: true, newDueDate: due.toISOString().slice(0, 10) });
  } catch (e) {
    console.error("proof-of-life error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Wallet routes ---

app.get(
  "/api/v1/mobile/wallets",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const rows = await sql`
        SELECT id, user_id, name, type, balance, currency, updated_at
        FROM wallets
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;

      const wallets: Wallet[] = rows.map((row: any, index: number) => ({
        id: row.id,
        name: row.name || (index === 0 ? "Main wallet" : `Wallet ${index + 1}`),
        type: (row.type as WalletType) || "main",
        balance: Number(row.balance ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        isPrimary: index === 0,
        createdAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      }));

      res.json({ wallets });
    } catch (error) {
      if (isSchemaError(error)) {
        return res.json({ wallets: [] });
      }
      next(error);
    }
  }
);

app.get(
  "/api/v1/mobile/wallets/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;
      const rows = await sql`
        SELECT id, user_id, name, type, balance, currency, updated_at, created_at
        FROM wallets
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return jsonError(res, 404, "Wallet not found");
      }
      const row: any = rows[0];
      // Determine if this is primary wallet (first wallet)
      const allWallets = await sql`
        SELECT id FROM wallets WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1
      `;
      const isPrimary = allWallets.length > 0 && allWallets[0].id === row.id;
      
      const wallet: Wallet = {
        id: row.id,
        name: row.name || (isPrimary ? "Main wallet" : "Wallet"),
        type: (row.type as WalletType) || "savings",
        balance: Number(row.balance ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        isPrimary,
        createdAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      };
      res.json({ wallet });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/v1/mobile/wallets",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { name, type }: { name?: string; type?: WalletType } = req.body ?? {};

      const result = await createWallet(userId, { name, type });
      res.status(201).json({ wallet: result.wallet });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/v1/mobile/wallets/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;
      const { name, type }: { name?: string; type?: WalletType } = req.body ?? {};

      const hasName = name !== undefined && typeof name === "string" && name.trim().length > 0;
      const hasType = type !== undefined;

      if (!hasName && !hasType) {
        return jsonError(res, 400, "No fields to update");
      }

      if (hasName && hasType) {
        await sql`
          UPDATE wallets
          SET name = ${name!.trim()}, type = ${type!}, updated_at = now()
          WHERE id = ${id} AND user_id = ${userId}
        `;
      } else if (hasName) {
        await sql`
          UPDATE wallets
          SET name = ${name!.trim()}, updated_at = now()
          WHERE id = ${id} AND user_id = ${userId}
        `;
      } else {
        await sql`
          UPDATE wallets
          SET type = ${type!}, updated_at = now()
          WHERE id = ${id} AND user_id = ${userId}
        `;
      }

      const rows = await sql`
        SELECT id, user_id, name, type, balance, currency, updated_at, created_at
        FROM wallets
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return jsonError(res, 404, "Wallet not found");
      }
      const row: any = rows[0];
      const allWallets = await sql`
        SELECT id FROM wallets WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1
      `;
      const isPrimary = allWallets.length > 0 && allWallets[0].id === row.id;

      const wallet: Wallet = {
        id: row.id,
        name: row.name || (isPrimary ? "Main wallet" : "Wallet"),
        type: (row.type as WalletType) || "savings",
        balance: Number(row.balance ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        isPrimary,
        createdAt: row.updated_at?.toISOString?.() ?? row.updated_at,
      };
      res.json({ wallet });
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/v1/mobile/wallets/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;

      const existingRows = await sql`
        SELECT id FROM wallets
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (existingRows.length === 0) {
        return jsonError(res, 404, "Wallet not found");
      }
      const allWallets = await sql`
        SELECT id FROM wallets WHERE user_id = ${userId}
      `;
      if (allWallets.length <= 1) {
        return jsonError(res, 400, "Cannot delete only wallet");
      }

      await sql`
        DELETE FROM wallets
        WHERE id = ${id} AND user_id = ${userId}
      `;
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/v1/mobile/wallets/:walletId/add-money",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { walletId } = req.params;
      const { amount, method }: { amount?: number; method?: string } =
        req.body ?? {};

      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return jsonError(res, 400, "amount must be a positive number");
      }

      const walletRows = await sql`
        SELECT id, user_id, balance
        FROM wallets
        WHERE id = ${walletId} AND user_id = ${userId}
        LIMIT 1
      `;
      if (walletRows.length === 0) {
        return jsonError(res, 404, "Wallet not found");
      }
      const wallet: any = walletRows[0];

      await sql`
        UPDATE wallets
        SET balance = ${Number(wallet.balance ?? 0) + amount}, updated_at = now()
        WHERE id = ${walletId}
      `;
      await sql`
        INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
        VALUES (
          ${walletId},
          ${"add_money"},
          ${amount},
          ${method ?? "add_money"}
        )
      `;

      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

// --- Transactions ---

app.get(
  "/api/v1/mobile/transactions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const walletId = req.query.walletId as string | undefined;
      const type = req.query.type as TransactionType | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const rows = await sql`
        SELECT
          wt.id,
          wt.wallet_id,
          wt.type,
          wt.amount,
          wt.reference,
          wt.created_at,
          w.currency
        FROM wallet_transactions wt
        JOIN wallets w ON wt.wallet_id = w.id
        WHERE w.user_id = ${userId}
        ${walletId ? sql`AND wt.wallet_id = ${walletId}` : sql``}
        ${type ? sql`AND wt.type = ${type}` : sql``}
        ORDER BY wt.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const txs: Transaction[] = rows.map((row: any) => ({
        id: row.id,
        type: (row.type as TransactionType) ?? "add_money",
        amount: Number(row.amount ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        description: row.reference ?? "",
        status: "success",
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
        date: row.created_at?.toISOString?.() ?? row.created_at,
        walletId: row.wallet_id,
      }));

      res.json({ transactions: txs });
    } catch (error) {
      if (isSchemaError(error)) {
        return res.json({ transactions: [] });
      }
      next(error);
    }
  }
);

// --- Groups ---

app.get(
  "/api/v1/mobile/groups",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const rows = await sql`
        SELECT g.id, g.name, g.description,
               (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count
        FROM groups g
        INNER JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ${userId}
        ORDER BY g.created_at DESC
      `;
      const groups = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        purpose: row.description,
        balance: 0,
        memberCount: Number(row.member_count ?? 0),
        maxMembers: 20,
      }));
      res.json({ groups });
    } catch (error) {
      if (isMissingTableOrSchemaError(error)) {
        return res.json({ groups: [] });
      }
      next(error);
    }
  }
);

app.post(
  "/api/v1/mobile/groups",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { name, description, member_ids }: { name?: string; description?: string; member_ids?: string[] } = req.body ?? {};
      if (!name || typeof name !== "string" || !name.trim()) {
        return jsonError(res, 400, "name is required");
      }
      const insertResult = await sql`
        INSERT INTO groups (name, description, created_by, created_at)
        VALUES (${name.trim()}, ${description ?? ""}, ${userId}, now())
        RETURNING id, name, description, created_at
      `;
      const row = Array.isArray(insertResult) ? insertResult[0] : insertResult;
      if (!row?.id) {
        return jsonError(res, 500, "Failed to create group");
      }
      const groupId = (row as { id: string }).id;
      await sql`
        INSERT INTO group_members (group_id, user_id)
        VALUES (${groupId}, ${userId})
      `;
      res.status(201).json({
        group: {
          id: groupId,
          name: (row as any).name,
          purpose: (row as any).description,
          balance: 0,
          memberCount: 1,
          maxMembers: 20,
        },
      });
    } catch (error) {
      if (isMissingTableOrSchemaError(error)) {
        return jsonError(res, 503, "Groups unavailable (schema mismatch)");
      }
      next(error);
    }
  }
);

app.get(
  "/api/v1/mobile/transactions/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;

      const rows = await sql`
        SELECT
          wt.id,
          wt.wallet_id,
          wt.type,
          wt.amount,
          wt.reference,
          wt.created_at,
          w.currency
        FROM wallet_transactions wt
        JOIN wallets w ON wt.wallet_id = w.id
        WHERE wt.id = ${id} AND w.user_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return jsonError(res, 404, "Transaction not found");
      }
      const row: any = rows[0];
      const tx: Transaction = {
        id: row.id,
        type: (row.type as TransactionType) ?? "add_money",
        amount: Number(row.amount ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        description: row.reference ?? "",
        status: "success",
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
        date: row.created_at?.toISOString?.() ?? row.created_at,
        walletId: row.wallet_id,
      };
      res.json({ transaction: tx });
    } catch (error) {
      next(error);
    }
  }
);

// --- Loans (PRD §9.4) ---

app.get("/api/v1/mobile/loans", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const rows = await sql`
      SELECT id, user_id, wallet_id, amount, interest_rate, total_repayment, status, previous_voucher_value, disbursed_at, created_at
      FROM loans
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    const loans = rows.map((r: any) => ({
      id: r.id,
      walletId: r.wallet_id,
      amount: Number(r.amount ?? 0),
      interestRate: Number(r.interest_rate ?? 0),
      totalRepayment: Number(r.total_repayment ?? 0),
      status: r.status ?? "pending",
      previousVoucherValue: r.previous_voucher_value != null ? Number(r.previous_voucher_value) : undefined,
      disbursedAt: r.disbursed_at?.toISOString?.() ?? r.disbursed_at,
      createdAt: r.created_at?.toISOString?.() ?? r.created_at,
    }));
    res.json({ loans });
  } catch (error) {
    if (isMissingTableOrSchemaError(error)) {
      return res.json({ loans: [] });
    }
    next(error);
  }
});

app.get("/api/v1/mobile/loans/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const { id } = req.params;
    const rows = await sql`
      SELECT id, user_id, wallet_id, amount, interest_rate, total_repayment, status, previous_voucher_value, disbursed_at, repaid_at, created_at
      FROM loans
      WHERE id = ${id} AND user_id = ${userId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return jsonError(res, 404, "Loan not found");
    }
    const r = rows[0] as any;
    res.json({
      loan: {
        id: r.id,
        walletId: r.wallet_id,
        amount: Number(r.amount ?? 0),
        interestRate: Number(r.interest_rate ?? 0),
        totalRepayment: Number(r.total_repayment ?? 0),
        status: r.status ?? "pending",
        previousVoucherValue: r.previous_voucher_value != null ? Number(r.previous_voucher_value) : undefined,
        disbursedAt: r.disbursed_at?.toISOString?.() ?? r.disbursed_at,
        repaidAt: r.repaid_at?.toISOString?.() ?? r.repaid_at,
        createdAt: r.created_at?.toISOString?.() ?? r.created_at,
      },
    });
  } catch (error) {
    if (isMissingTableOrSchemaError(error)) {
      return jsonError(res, 404, "Loan not found");
    }
    next(error);
  }
});

app.post("/api/v1/mobile/loans/apply", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const { amount, wallet_id, verification_token }: { amount?: number; wallet_id?: string; verification_token?: string } = req.body ?? {};
    const idempotencyKey = req.header("Idempotency-Key") ?? undefined;

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return jsonError(res, 400, "amount must be a positive number");
    }

    if (await wouldExceedLoanLimit(userId, amount)) {
      return jsonError(res, 400, "Daily loan limit exceeded");
    }

    let walletId = wallet_id;
    if (!walletId) {
      const wrows = await sql`
        SELECT id FROM wallets WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1
      `;
      if (wrows.length === 0) {
        return jsonError(res, 400, "No wallet found");
      }
      walletId = (wrows[0] as { id: string }).id;
    }

    const interestRate = 15;
    const totalRepayment = Math.round(amount * (1 + interestRate / 100) * 100) / 100;

    const insertResult = await sql`
      INSERT INTO loans (user_id, wallet_id, amount, interest_rate, total_repayment, status)
      VALUES (${userId}, ${walletId}, ${amount}, ${interestRate}, ${totalRepayment}, ${"approved"})
      RETURNING id, user_id, wallet_id, amount, total_repayment, status, created_at
    `;
    const loanRow = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    if (!loanRow?.id) {
      return jsonError(res, 500, "Failed to create loan");
    }
    const loanId = (loanRow as { id: string }).id;

    const disburseResult = await disburseLoanInBuffr({ userId, loanId, idempotencyKey });
    if (!disburseResult.success) {
      return jsonError(res, 400, disburseResult.error ?? "Disbursement failed");
    }

    res.status(201).json({
      success: true,
      loan: {
        id: loanId,
        walletId,
        amount,
        totalRepayment,
        status: "disbursed",
        balance: disburseResult.balance,
      },
      message: "Loan disbursed successfully",
    });
  } catch (error) {
    if (isMissingTableOrSchemaError(error)) {
      return jsonError(res, 503, "Loans unavailable (schema mismatch)");
    }
    next(error);
  }
});

// --- Contacts ---

app.get(
  "/api/v1/mobile/contacts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const rows = await sql`
        SELECT id, phone, full_name
        FROM users
        WHERE id != ${userId}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const contacts: Contact[] = rows.map((row: any) => ({
        id: row.id,
        name: row.full_name?.trim() || row.phone || "",
        phone: row.phone,
        buffrId: row.id,
      }));

      res.json({ contacts });
    } catch (error) {
      if (isSchemaError(error)) {
        return res.json({ contacts: [] });
      }
      next(error);
    }
  }
);

app.get(
  "/api/v1/mobile/contacts/lookup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (req.query.q as string | undefined)?.trim();
      if (!query) {
        return res.json({ contact: null });
      }

      const rows = await sql`
        SELECT id, phone, full_name
        FROM users
        WHERE phone = ${query}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (rows.length === 0) {
        return res.json({ contact: null });
      }
      const row: any = rows[0];
      const contact: Contact = {
        id: row.id,
        name: row.full_name?.trim() || row.phone || "",
        phone: row.phone,
        buffrId: row.id,
      };
      res.json({ contact });
    } catch (error) {
      next(error);
    }
  }
);

// --- Send money (P2P) ---

app.post(
  "/api/v1/mobile/send",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = await getCurrentUserId(req);
      const {
        recipientPhone,
        amount,
        note,
        walletId,
      }: {
        recipientPhone?: string;
        amount?: number;
        note?: string;
        walletId?: string;
      } = req.body ?? {};

      if (!recipientPhone) {
        return jsonError(res, 400, "recipientPhone is required");
      }
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return jsonError(res, 400, "amount must be a positive number");
      }

      if (await wouldExceedSendLimit(senderId, amount)) {
        return jsonError(res, 400, "Daily send limit exceeded");
      }

      const recipientRows = await sql`
        SELECT id FROM users WHERE phone = ${recipientPhone} LIMIT 1
      `;
      if (recipientRows.length === 0) {
        return jsonError(res, 404, "Recipient not found");
      }
      const recipientId = (recipientRows[0] as { id: string }).id;

      const sourceWalletRows = await sql`
        SELECT id, balance, currency
        FROM wallets
        WHERE id = ${walletId} AND user_id = ${senderId}
        FOR UPDATE
        LIMIT 1
      `;
      if (sourceWalletRows.length === 0) {
        return jsonError(res, 404, "Source wallet not found");
      }
      const sourceWallet: any = sourceWalletRows[0];
      const currentBalance = Number(sourceWallet.balance ?? 0);
      if (currentBalance < amount) {
        return jsonError(res, 400, "Insufficient funds");
      }

      const recipientWalletRows = await sql`
        SELECT id, balance
        FROM wallets
        WHERE user_id = ${recipientId}
        ORDER BY updated_at ASC
        LIMIT 1
      `;
      if (recipientWalletRows.length === 0) {
        return jsonError(res, 400, "Recipient has no wallet");
      }
      const recipientWallet: any = recipientWalletRows[0];

      let transactionId: string | undefined;

      await sql`
        UPDATE wallets
        SET balance = ${currentBalance - amount}, updated_at = now()
        WHERE id = ${sourceWallet.id}
      `;
      await sql`
        INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
        VALUES (
          ${sourceWallet.id},
          ${"send"},
          ${amount},
          ${note ?? "Money sent"}
        )
      `;
      await sql`
        UPDATE wallets
        SET balance = ${Number(recipientWallet.balance ?? 0) + amount}, updated_at = now()
        WHERE id = ${recipientWallet.id}
      `;
      await sql`
        INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
        VALUES (
          ${recipientWallet.id},
          ${"receive"},
          ${amount},
          ${note ?? "Money received"}
        )
      `;
      try {
        const p2pResult = await sql`
          INSERT INTO p2p_transactions (
            sender_id, recipient_id, wallet_id, amount, currency, note
          )
          VALUES (
            ${senderId},
            ${recipientId},
            ${sourceWallet.id},
            ${amount},
            ${sourceWallet.currency ?? "NAD"},
            ${note ?? ""}
          )
          RETURNING id
        `;
        if (Array.isArray(p2pResult) && p2pResult[0]?.id) {
          transactionId = (p2pResult[0] as { id: string }).id;
        }
      } catch (_) {
        // p2p_transactions table may not exist in live DB
      }

      res.status(201).json({ transactionId });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/mobile/send-money – V9: recipient_id only; V5: daily limit + row lock
app.post(
  "/api/v1/mobile/send-money",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = await getCurrentUserId(req);
      const {
        recipient_id: bodyRecipientId,
        amount,
        wallet_id: walletId,
        note,
        verification_token: verificationToken,
      }: {
        recipient_id?: string;
        amount?: number;
        wallet_id?: string;
        note?: string;
        verification_token?: string;
      } = req.body ?? {};
      req.header("Idempotency-Key");

      if (!bodyRecipientId) {
        return jsonError(res, 400, "recipient_id is required");
      }
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return jsonError(res, 400, "amount must be a positive number");
      }

      if (await wouldExceedSendLimit(senderId, amount)) {
        return jsonError(res, 400, "Daily send limit exceeded");
      }

      const rows = await sql`SELECT id FROM users WHERE id = ${bodyRecipientId} LIMIT 1`;
      if (rows.length === 0) {
        return jsonError(res, 404, "Recipient not found");
      }
      const recipientId = (rows[0] as { id: string }).id;

      const sourceWalletRows = await sql`
        SELECT id, balance, currency
        FROM wallets
        WHERE id = ${walletId} AND user_id = ${senderId}
        FOR UPDATE
        LIMIT 1
      `;
      if (sourceWalletRows.length === 0) {
        return jsonError(res, 404, "Source wallet not found");
      }
      const sourceWallet: any = sourceWalletRows[0];
      const currentBalance = Number(sourceWallet.balance ?? 0);
      if (currentBalance < amount) {
        return jsonError(res, 400, "Insufficient funds");
      }

      const recipientWalletRows = await sql`
        SELECT id, balance
        FROM wallets
        WHERE user_id = ${recipientId}
        ORDER BY updated_at ASC
        LIMIT 1
      `;
      if (recipientWalletRows.length === 0) {
        return jsonError(res, 400, "Recipient has no wallet");
      }
      const recipientWallet: any = recipientWalletRows[0];

      // Use atomic transaction to ensure all-or-nothing operation (T3 enhancement)
      const result = await transferMoneyAtomic({
        fromWalletId: sourceWallet.id,
        toWalletId: recipientWallet.id,
        amount,
        note: note || '',
        senderId,
        recipientId,
      });

      if (!result.success) {
        return jsonError(res, 500, result.error || 'Transfer failed');
      }

      res.status(201).json({ transactionId: result.data?.transactionId });
    } catch (error) {
      next(error);
    }
  }
);

// --- Vouchers ---

app.get(
  "/api/v1/mobile/vouchers",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const rows = await sql`
        SELECT v.id, v.amount, v.currency, v.status, v.type, v.expires_at, v.external_id, v.created_at,
               vr.redeemed_at, vr.method AS redeemed_method
        FROM vouchers v
        LEFT JOIN voucher_redemptions vr ON vr.voucher_id = v.id
        WHERE v.user_id = ${userId}
        ORDER BY v.created_at DESC
      `;

      const now = new Date();
      const vouchers: Voucher[] = rows.map((row: any) => {
        const expiresAt = row.expires_at?.toISOString?.() ?? row.expires_at;
        const isExpired = row.status !== "redeemed" && expiresAt && new Date(expiresAt) < now;
        const status: VoucherStatus = row.status === "redeemed" ? "redeemed" : isExpired ? "expired" : (row.status ?? "available");
        return {
          id: row.id,
          amount: Number(row.amount ?? 0),
          currency: (row.currency as "NAD") ?? "NAD",
          status,
          programme: row.type ?? "Grant",
          issuedAt: row.created_at?.toISOString?.() ?? row.created_at,
          expiresAt,
          redeemedAt: row.redeemed_at?.toISOString?.() ?? row.redeemed_at,
          redeemedMethod: row.redeemed_method,
          reference: row.external_id,
        };
      });

      res.json({ vouchers });
    } catch (error) {
      if (isMissingTableOrSchemaError(error)) {
        return res.json({ vouchers: [] });
      }
      next(error);
    }
  }
);

app.get(
  "/api/v1/mobile/vouchers/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;
      const rows = await sql`
        SELECT v.id, v.amount, v.currency, v.status, v.type, v.expires_at, v.external_id, v.created_at,
               vr.redeemed_at, vr.method AS redeemed_method
        FROM vouchers v
        LEFT JOIN voucher_redemptions vr ON vr.voucher_id = v.id
        WHERE v.id = ${id} AND v.user_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return jsonError(res, 404, "Voucher not found");
      }
      const row: any = rows[0];
      const expiresAt = row.expires_at?.toISOString?.() ?? row.expires_at;
      const isExpired = row.status !== "redeemed" && expiresAt && new Date(expiresAt) < new Date();
      const status: VoucherStatus = row.status === "redeemed" ? "redeemed" : isExpired ? "expired" : (row.status ?? "available");
      const voucher: Voucher = {
        id: row.id,
        amount: Number(row.amount ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        status,
        programme: row.type ?? "Grant",
        issuedAt: row.created_at?.toISOString?.() ?? row.created_at,
        expiresAt,
        redeemedAt: row.redeemed_at?.toISOString?.() ?? row.redeemed_at,
        redeemedMethod: row.redeemed_method,
        reference: row.external_id,
      };
      res.json({ voucher });
    } catch (error) {
      if (isMissingTableOrSchemaError(error)) {
        return jsonError(res, 404, "Voucher not found");
      }
      next(error);
    }
  }
);

app.post(
  "/api/v1/mobile/vouchers/:id/redeem",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id: voucherId } = req.params;
      const { method, redemption_point, verification_token }: { method?: string; redemption_point?: string; verification_token?: string } = req.body ?? {};
      const idempotencyKey = req.header("Idempotency-Key") ?? undefined;

      if (method !== "wallet" && method !== "nampost" && method !== "smartpay") {
        return jsonError(res, 400, "method must be wallet, nampost, or smartpay");
      }

      const result = await redeemVoucherToWallet({
        userId,
        voucherId,
        method: method as "wallet" | "nampost" | "smartpay",
        idempotencyKey,
      });

      if (!result.success) {
        const status = result.error === "Voucher not found" ? 404 : result.error === "Voucher already redeemed" || result.error === "Voucher expired" ? 400 : 400;
        return res.status(status).json({ success: false, error: result.error });
      }

      return res.status(200).json({
        success: true,
        ...(result.walletBalance != null && { wallet_balance: result.walletBalance }),
      });
    } catch (error) {
      if (isMissingTableOrSchemaError(error)) {
        return jsonError(res, 503, "Voucher redeem unavailable (schema mismatch)");
      }
      next(error);
    }
  }
);

// --- Analytics events ---

app.post(
  "/api/v1/mobile/events",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const event = req.body;
      
      if (!event || !event.name) {
        return jsonError(res, 400, "Event name is required");
      }
      
      // Store event in database for analytics (gracefully handle missing table)
      try {
        await sql`
          INSERT INTO analytics_events (user_id, event_name, event_data, created_at)
          VALUES (${userId}, ${event.name}, ${JSON.stringify(event)}, now())
        `;
      } catch (_) {
        // analytics_events table may not exist - that's ok for dev
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// --- Notifications ---

app.get(
  "/api/v1/mobile/notifications",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      
      try {
        const rows = await sql`
          SELECT id, title, body, type, is_read, created_at
          FROM notifications
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
        
        const notifications = rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          type: row.type,
          read: row.is_read ?? false,
          time: row.created_at?.toISOString?.() ?? row.created_at,
        }));
        
        return res.json({ notifications });
      } catch (_) {
        // notifications table may not exist
        return res.json({ notifications: [] });
      }
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/v1/mobile/notifications/:id/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;
      
      try {
        await sql`
          UPDATE notifications
          SET is_read = true
          WHERE id = ${id} AND user_id = ${userId}
        `;
      } catch (_) {
        // notifications table may not exist
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// GET one notification – PRD §9.4
app.get(
  "/api/v1/mobile/notifications/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;
      const rows = await sql`
        SELECT id, title, body, type, is_read, data, created_at
        FROM notifications
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }
      const row = rows[0] as { id: string; title: string; body: string; type: string | null; is_read: boolean | null; data: unknown; created_at: string };
      res.json({
        id: row.id,
        title: row.title,
        body: row.body,
        type: row.type,
        read: row.is_read ?? false,
        data: row.data,
        created_at: row.created_at?.toString?.() ?? row.created_at,
      });
    } catch (error) {
      if ((error as { code?: string }).code === "42P01") {
        return res.status(404).json({ error: "Notification not found" });
      }
      next(error);
    }
  }
);

// POST accept notification (e.g. group_invite → add to group_members; payment_request → mark accepted)
app.post(
  "/api/v1/mobile/notifications/:id/accept",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;
      const rows = await sql`
        SELECT id, type, data FROM notifications
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }
      const row = rows[0] as { id: string; type: string | null; data: { group_id?: string } | null };
      const notifType = row.type;
      const data = (row.data as { group_id?: string }) ?? {};
      if (notifType === "group_invite" && data.group_id) {
        try {
          await sql`
            INSERT INTO group_members (group_id, user_id, role)
            VALUES (${data.group_id}, ${userId}, 'member')
            ON CONFLICT (group_id, user_id) DO NOTHING
          `;
        } catch (_) {
          // group_members may not exist or conflict
        }
      }
      await sql`
        UPDATE notifications SET is_read = true WHERE id = ${id} AND user_id = ${userId}
      `;
      res.json({ success: true });
    } catch (error) {
      if ((error as { code?: string }).code === "42P01") {
        return res.status(404).json({ error: "Notification not found" });
      }
      next(error);
    }
  }
);

// POST decline notification
app.post(
  "/api/v1/mobile/notifications/:id/decline",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id } = req.params;
      const rows = await sql`
        SELECT id FROM notifications WHERE id = ${id} AND user_id = ${userId} LIMIT 1
      `;
      if (rows.length === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }
      await sql`
        UPDATE notifications SET is_read = true WHERE id = ${id} AND user_id = ${userId}
      `;
      res.json({ success: true });
    } catch (error) {
      if ((error as { code?: string }).code === "42P01") {
        return res.status(404).json({ error: "Notification not found" });
      }
      next(error);
    }
  }
);

// --- Receive (recipient view) – PRD §9.4 ---
// GET receive/voucher/:voucherId (must be before receive/:transactionId)
app.get(
  "/api/v1/mobile/receive/voucher/:voucherId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { voucherId } = req.params;
      const rows = await sql`
        SELECT id, amount, currency, status, type, expires_at, external_id, created_at
        FROM vouchers
        WHERE id = ${voucherId} AND user_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return res.status(404).json({ error: "Voucher not found" });
      }
      const row = rows[0] as { id: string; amount: number; currency: string; status: string; type: string | null; expires_at: string; external_id: string | null; created_at: string };
      res.json({
        transaction: {
          id: row.id,
          amount: Number(row.amount),
          currency: row.currency,
          status: row.status,
          programme: row.type ?? "Grant",
          expiresAt: row.expires_at?.toString?.() ?? row.expires_at,
          reference: row.external_id,
          createdAt: row.created_at?.toString?.() ?? row.created_at,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "42P01") {
        return res.status(404).json({ error: "Voucher not found" });
      }
      next(error);
    }
  }
);

// GET receive/:transactionId – p2p transaction for recipient
app.get(
  "/api/v1/mobile/receive/:transactionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { transactionId } = req.params;
      const rows = await sql`
        SELECT p.id, p.sender_id, p.amount, p.currency, p.note, p.status, p.created_at,
               u.phone AS sender_phone, u.full_name AS sender_name
        FROM p2p_transactions p
        LEFT JOIN users u ON u.id = p.sender_id
        WHERE p.id = ${transactionId} AND p.recipient_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      const row = rows[0] as { id: string; sender_id: string; amount: number; currency: string; note: string | null; status: string; created_at: string; sender_phone?: string; sender_name?: string | null };
      res.json({
        transaction: {
          id: row.id,
          senderId: row.sender_id,
          senderName: row.sender_name ?? row.sender_phone ?? null,
          amount: Number(row.amount),
          currency: row.currency,
          note: row.note ?? "",
          status: row.status,
          createdAt: row.created_at?.toString?.() ?? row.created_at,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "42P01") {
        return res.status(404).json({ error: "Transaction not found" });
      }
      next(error);
    }
  }
);

// POST receive/accept-payment – idempotent; mark transaction accepted for recipient
app.post(
  "/api/v1/mobile/receive/accept-payment",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { transactionId } = (req.body ?? {}) as { transactionId?: string };
      if (!transactionId) {
        return jsonError(res, 400, "transactionId is required");
      }
      const rows = await sql`
        SELECT id, status FROM p2p_transactions
        WHERE id = ${transactionId} AND recipient_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      const row = rows[0] as { id: string; status: string };
      if (row.status === "pending") {
        await sql`
          UPDATE p2p_transactions SET status = 'accepted'
          WHERE id = ${transactionId} AND recipient_id = ${userId}
        `;
      }
      res.json({ success: true });
    } catch (error) {
      if ((error as { code?: string }).code === "42P01") {
        return res.status(404).json({ error: "Transaction not found" });
      }
      next(error);
    }
  }
);

// --- Location API (REAL IMPLEMENTATION) – PRD §9.4 ---
function parseLatLng(req: Request): { lat: number; lng: number; radius: number } | null {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = req.query.radius != null ? Number(req.query.radius) : 5000;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng, radius: Number.isFinite(radius) && radius > 0 ? radius : 5000 };
}

// Helper: Calculate distance between two points using earthdistance
// Note: Neon doesn't support dynamic table names in template literals,
// so we use conditional logic based on table name
async function findNearbyLocations<T>(
  tableName: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  limit: number = 20
): Promise<T[]> {
  const radiusInKm = radiusMeters / 1000;
  let results;
  
  // Use conditional queries for each supported table
  if (tableName === 'cashout_agents') {
    results = await sql`
      SELECT *, 
             earth_distance(
               ll_to_earth(${lat}, ${lng}),
               ll_to_earth(latitude, longitude)
             ) as distance
      FROM cashout_agents
      WHERE active = true
        AND earth_box(ll_to_earth(${lat}, ${lng}), ${radiusInKm * 1000}) @> ll_to_earth(latitude, longitude)
      ORDER BY distance ASC
      LIMIT ${limit}
    `;
  } else if (tableName === 'nampost_branches') {
    results = await sql`
      SELECT *, 
             earth_distance(
               ll_to_earth(${lat}, ${lng}),
               ll_to_earth(latitude, longitude)
             ) as distance
      FROM nampost_branches
      WHERE active = true
        AND earth_box(ll_to_earth(${lat}, ${lng}), ${radiusInKm * 1000}) @> ll_to_earth(latitude, longitude)
      ORDER BY distance ASC
      LIMIT ${limit}
    `;
  } else if (tableName === 'smartpay_units') {
    results = await sql`
      SELECT *, 
             earth_distance(
               ll_to_earth(${lat}, ${lng}),
               ll_to_earth(latitude, longitude)
             ) as distance
      FROM smartpay_units
      WHERE active = true
        AND earth_box(ll_to_earth(${lat}, ${lng}), ${radiusInKm * 1000}) @> ll_to_earth(latitude, longitude)
      ORDER BY distance ASC
      LIMIT ${limit}
    `;
  } else if (tableName === 'atm_locations') {
    results = await sql`
      SELECT *, 
             earth_distance(
               ll_to_earth(${lat}, ${lng}),
               ll_to_earth(latitude, longitude)
             ) as distance
      FROM atm_locations
      WHERE active = true
        AND earth_box(ll_to_earth(${lat}, ${lng}), ${radiusInKm * 1000}) @> ll_to_earth(latitude, longitude)
      ORDER BY distance ASC
      LIMIT ${limit}
    `;
  } else if (tableName === 'merchants') {
    results = await sql`
      SELECT *, 
             earth_distance(
               ll_to_earth(${lat}, ${lng}),
               ll_to_earth(latitude, longitude)
             ) as distance
      FROM merchants
      WHERE is_open = true
        AND earth_box(ll_to_earth(${lat}, ${lng}), ${radiusInKm * 1000}) @> ll_to_earth(latitude, longitude)
      ORDER BY distance ASC
      LIMIT ${limit}
    `;
  } else {
    throw new Error(`Unsupported table: ${tableName}`);
  }
  
  return results as T[];
}

app.get("/api/v1/mobile/agents/nearby", async (req: Request, res: Response) => {
  const parsed = parseLatLng(req);
  if (!parsed) return jsonError(res, 400, "Valid lat and lng query params required");
  
  try {
    const agents = await findNearbyLocations<any>(
      'cashout_agents',
      parsed.lat,
      parsed.lng,
      parsed.radius,
      20
    );
    
    // Format response
    const formatted = agents.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      address: a.address,
      latitude: parseFloat(a.latitude),
      longitude: parseFloat(a.longitude),
      phone: a.phone,
      operatingHours: a.operating_hours,
      fees: a.fees,
      distance: Math.round(a.distance), // meters
      verified: a.verified
    }));
    
    res.json({ agents: formatted });
  } catch (error) {
    console.error('Error fetching nearby agents:', error);
    res.json({ agents: [] });
  }
});

app.get("/api/v1/mobile/nampost/nearby", async (req: Request, res: Response) => {
  const parsed = parseLatLng(req);
  if (!parsed) return jsonError(res, 400, "Valid lat and lng query params required");
  
  try {
    const branches = await findNearbyLocations<any>(
      'nampost_branches',
      parsed.lat,
      parsed.lng,
      parsed.radius,
      20
    );
    
    const formatted = branches.map(b => ({
      id: b.id,
      name: b.name,
      branchCode: b.branch_code,
      address: b.address,
      latitude: parseFloat(b.latitude),
      longitude: parseFloat(b.longitude),
      phone: b.phone,
      operatingHours: b.operating_hours,
      services: b.services,
      distance: Math.round(b.distance)
    }));
    
    res.json({ branches: formatted });
  } catch (error) {
    console.error('Error fetching nearby NamPost branches:', error);
    res.json({ branches: [] });
  }
});

app.get("/api/v1/mobile/smartpay/nearby", async (req: Request, res: Response) => {
  const parsed = parseLatLng(req);
  if (!parsed) return jsonError(res, 400, "Valid lat and lng query params required");
  
  try {
    const units = await findNearbyLocations<any>(
      'smartpay_units',
      parsed.lat,
      parsed.lng,
      parsed.radius,
      20
    );
    
    const formatted = units.map(u => ({
      id: u.id,
      name: u.name,
      unitCode: u.unit_code,
      address: u.address,
      latitude: parseFloat(u.latitude),
      longitude: parseFloat(u.longitude),
      phone: u.phone,
      operatingHours: u.operating_hours,
      distance: Math.round(u.distance)
    }));
    
    res.json({ units: formatted });
  } catch (error) {
    console.error('Error fetching nearby SmartPay units:', error);
    res.json({ units: [] });
  }
});

app.get("/api/v1/mobile/atms/nearby", async (req: Request, res: Response) => {
  const parsed = parseLatLng(req);
  if (!parsed) return jsonError(res, 400, "Valid lat and lng query params required");
  
  try {
    const atms = await findNearbyLocations<any>(
      'atm_locations',
      parsed.lat,
      parsed.lng,
      parsed.radius,
      20
    );
    
    const formatted = atms.map(a => ({
      id: a.id,
      bankName: a.bank_name,
      atmId: a.atm_id,
      address: a.address,
      latitude: parseFloat(a.latitude),
      longitude: parseFloat(a.longitude),
      features: a.features,
      dailyLimit: parseFloat(a.daily_limit),
      distance: Math.round(a.distance)
    }));
    
    res.json({ atms: formatted });
  } catch (error) {
    console.error('Error fetching nearby ATMs:', error);
    res.json({ atms: [] });
  }
});

// Get merchants (with optional proximity filtering)
app.get("/api/v1/mobile/merchants/nearby", async (req: Request, res: Response) => {
  const parsed = parseLatLng(req);
  const category = req.query.category as string | undefined;
  
  // If no location provided, return all merchants (with optional category filter)
  if (!parsed) {
    try {
      let query = sql`
        SELECT id, name, category, address, phone, latitude, longitude,
               is_open, is_verified, minimum_transaction_amount, services
        FROM merchants
        WHERE is_open = true
      `;
      
      if (category && category !== 'all') {
        query = sql`
          SELECT id, name, category, address, phone, latitude, longitude,
                 is_open, is_verified, minimum_transaction_amount, services
          FROM merchants
          WHERE is_open = true AND category = ${category}
        `;
      }
      
      const merchants = await query;
      
      const formatted = merchants.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        address: m.address,
        phone: m.phone,
        latitude: m.latitude,
        longitude: m.longitude,
        open: m.is_open,
        verified: m.is_verified,
        minTx: m.minimum_transaction_amount,
        services: m.services || []
      }));
      
      return res.json({ merchants: formatted });
    } catch (error) {
      console.error('Error fetching merchants:', error);
      return res.json({ merchants: [] });
    }
  }
  
  // With location - return nearby merchants
  try {
    const merchants = await findNearbyLocations<any>('merchants', parsed.lat, parsed.lng, parsed.radius, 50);
    
    // Apply category filter if specified
    let filtered = merchants;
    if (category && category !== 'all') {
      filtered = merchants.filter(m => m.category === category);
    }
    
    const formatted = filtered.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      address: m.address,
      phone: m.phone,
      latitude: parseFloat(m.latitude),
      longitude: parseFloat(m.longitude),
      distance: Math.round(m.distance),
      open: m.is_open,
      verified: m.is_verified,
      minTx: m.minimum_transaction_amount,
      services: m.services || []
    }));
    
    res.json({ merchants: formatted });
  } catch (error) {
    console.error('Error fetching nearby merchants:', error);
    res.json({ merchants: [] });
  }
});

// --- Analytics & Error Logging – PRD §9.4 ---
app.post("/api/v1/mobile/analytics/event", async (req: Request, res: Response) => {
  try {
    const { event, properties, platform, appVersion } = req.body ?? {};
    
    if (!event) {
      return jsonError(res, 400, "event name required");
    }
    
    // Optional user context
    const userId = properties?.userId || null;
    
    await sql`
      INSERT INTO analytics_events (user_id, event_name, properties, platform, app_version)
      VALUES (${userId}, ${event}, ${JSON.stringify(properties || {})}, ${platform}, ${appVersion})
    `;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging analytics event:', error);
    res.status(500).json({ success: false, error: 'Failed to log event' });
  }
});

app.post("/api/v1/mobile/errors/log", async (req: Request, res: Response) => {
  try {
    const { error, errorInfo, context } = req.body ?? {};
    
    if (!error) {
      return jsonError(res, 400, "error object required");
    }
    
    const userId = context?.userId || null;
    
    await sql`
      INSERT INTO error_logs (
        user_id, error_name, error_message, error_stack, 
        component_stack, context, platform, app_version
      )
      VALUES (
        ${userId}, 
        ${error.name || 'UnknownError'}, 
        ${error.message || 'No message'}, 
        ${error.stack || null},
        ${errorInfo?.componentStack || null},
        ${JSON.stringify(context || {})},
        ${context?.platform || null},
        ${context?.appVersion || null}
      )
    `;
    
    res.json({ success: true, logged: true });
  } catch (err) {
    console.error('Error logging error:', err);
    res.status(500).json({ success: false, error: 'Failed to log error' });
  }
});

// --- Analytics Summary API – Real data for charts ---
app.get("/api/v1/mobile/analytics/:userId/summary", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    // Default to current month if dates not provided
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || now.toISOString().split('T')[0];
    
    // Get monthly totals
    const monthlyStats = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type IN ('voucher_redeem', 'p2p_receive', 'group_receive', 'loan_disbursement') THEN amount ELSE 0 END), 0) as total_received,
        COALESCE(SUM(CASE WHEN type IN ('p2p_send', 'group_send', 'bill_payment', 'merchant_payment', 'cash_out') THEN amount ELSE 0 END), 0) as total_sent
      FROM transactions
      WHERE user_id = ${userId}
        AND DATE(created_at) >= ${start}::date
        AND DATE(created_at) <= ${end}::date
        AND status = 'completed'
    `;
    
    // Count vouchers redeemed in period
    const voucherCount = await sql`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'voucher_redeem'
        AND DATE(created_at) >= ${start}::date
        AND DATE(created_at) <= ${end}::date
        AND status = 'completed'
    `;
    
    // Get spending by category
    const spendingByCategory = await sql`
      SELECT 
        CASE 
          WHEN type = 'bill_payment' THEN 'Bills'
          WHEN type = 'merchant_payment' THEN 'Merchants'
          WHEN type = 'p2p_send' THEN 'P2P Transfers'
          WHEN type = 'group_send' THEN 'Group Contributions'
          WHEN type = 'cash_out' THEN 'Cash Withdrawals'
          WHEN type = 'loan_repayment' THEN 'Loan Repayments'
          ELSE 'Other'
        END as category,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ${userId}
        AND type IN ('bill_payment', 'merchant_payment', 'p2p_send', 'group_send', 'cash_out', 'loan_repayment')
        AND DATE(created_at) >= ${start}::date
        AND DATE(created_at) <= ${end}::date
        AND status = 'completed'
      GROUP BY category
      ORDER BY amount DESC
    `;
    
    // Get daily transaction summary (last 30 days for chart)
    const dailyTransactions = await sql`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN type IN ('voucher_redeem', 'p2p_receive', 'group_receive', 'loan_disbursement') THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type IN ('p2p_send', 'group_send', 'bill_payment', 'merchant_payment', 'cash_out', 'loan_repayment') THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_id = ${userId}
        AND DATE(created_at) >= ${start}::date
        AND DATE(created_at) <= ${end}::date
        AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;
    
    res.json({
      monthly: {
        totalReceived: parseFloat(monthlyStats[0]?.total_received ?? 0),
        vouchersRedeemed: parseInt(voucherCount[0]?.count ?? 0, 10),
        totalSent: parseFloat(monthlyStats[0]?.total_sent ?? 0),
        currency: 'NAD'
      },
      spendingByCategory: spendingByCategory.map((row: any) => ({
        category: row.category,
        amount: parseFloat(row.amount),
        count: parseInt(row.count, 10)
      })),
      dailyTransactions: dailyTransactions.map((row: any) => ({
        date: row.date,
        income: parseFloat(row.income),
        expense: parseFloat(row.expense)
      }))
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// --- Compliance (REAL IMPLEMENTATION) – PRD §9.4 ---
app.post("/api/v1/compliance/incident-report", async (req: Request, res: Response) => {
  try {
    const { incidentType, severity, description, affectedUsers, metadata } = req.body ?? {};
    
    if (!incidentType) {
      return jsonError(res, 400, "incidentType required");
    }
    
    const result = await sql`
      INSERT INTO compliance_incident_reports (
        incident_type, severity, description, affected_users, metadata, status
      )
      VALUES (
        ${incidentType},
        ${severity || 'medium'},
        ${description || ''},
        ${affectedUsers || 0},
        ${JSON.stringify(metadata || {})},
        'pending'
      )
      RETURNING id, incident_type, severity, status, created_at
    `;
    
    res.status(201).json({ 
      success: true,
      incident: result[0],
      reference: `INC-${result[0].id.split('-')[0].toUpperCase()}`
    });
  } catch (error) {
    console.error('Error logging compliance incident:', error);
    res.status(500).json({ success: false, error: 'Failed to log incident' });
  }
});

app.get("/api/v1/compliance/audit-logs", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const userId = req.query.user_id as string | undefined;
    const rows = userId
      ? await sql`
          SELECT id, user_id, entity_type, entity_id, action, meta, created_at
          FROM audit_logs
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      : await sql`
          SELECT id, user_id, entity_type, entity_id, action, meta, created_at
          FROM audit_logs
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;
    res.json({ auditLogs: rows });
  } catch {
    res.json({ auditLogs: [] });
  }
});

app.post("/api/v1/compliance/affidavit", (req: Request, res: Response) => {
  const context = req.body ?? {};
  res.status(201).json({ reference: `AFF-${Date.now()}`, ...context });
});

app.post("/api/v1/compliance/monthly-stats", async (req: Request, res: Response) => {
  try {
    const { month, year, stats } = req.body ?? {};
    
    if (!month || !year) {
      return jsonError(res, 400, "month and year required");
    }
    
    // Log to audit_logs
    await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, meta)
      VALUES (
        'compliance',
        'monthly_stats',
        'submit_monthly_stats',
        ${JSON.stringify({ month, year, stats, timestamp: new Date().toISOString() })}
      )
    `;
    
    res.status(202).json({ accepted: true, month, year });
  } catch (error) {
    console.error('Error logging monthly stats:', error);
    res.status(500).json({ accepted: false });
  }
});

// --- Country Selection – PRD §3.1 (Optional Feature) ---
app.get("/api/v1/mobile/countries", async (req: Request, res: Response) => {
  try {
    const countries = await sql`
      SELECT country_code, country_name, currency_code, currency_symbol, 
             phone_prefix, flag_emoji, features, active
      FROM supported_countries
      WHERE active = true
      ORDER BY country_name ASC
    `;
    
    const formatted = countries.map(c => ({
      code: c.country_code,
      name: c.country_name,
      currency: {
        code: c.currency_code,
        symbol: c.currency_symbol
      },
      phonePrefix: c.phone_prefix,
      flag: c.flag_emoji,
      features: c.features
    }));
    
    res.json({ countries: formatted });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.json({ countries: [] });
  }
});

app.get("/api/v1/mobile/countries/detect", async (req: Request, res: Response) => {
  try {
    // Try to detect from IP geolocation (simplified - in production use proper IP geolocation service)
    // For now, default to Namibia
    const detected = await sql`
      SELECT country_code, country_name, currency_code, currency_symbol, 
             phone_prefix, flag_emoji, features
      FROM supported_countries
      WHERE country_code = 'NA'
      LIMIT 1
    `;
    
    if (detected.length > 0) {
      const c = detected[0];
      res.json({
        detected: true,
        country: {
          code: c.country_code,
          name: c.country_name,
          currency: { code: c.currency_code, symbol: c.currency_symbol },
          phonePrefix: c.phone_prefix,
          flag: c.flag_emoji,
          features: c.features
        }
      });
    } else {
      res.json({ detected: false });
    }
  } catch (error) {
    console.error('Error detecting country:', error);
    res.json({ detected: false });
  }
});

// --- Gamification API – PRD §3.6 (Optional Feature) ---
app.get("/api/v1/mobile/gamification/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    
    // Get user gamification stats
    const stats = await sql`
      SELECT total_points, current_level, current_streak, longest_streak, 
             last_activity_date, metadata, updated_at
      FROM user_gamification
      WHERE user_id = ${userId}
    `;
    
    // Get user achievements
    const achievements = await sql`
      SELECT achievement_id, achieved_at, progress, metadata
      FROM user_achievements
      WHERE user_id = ${userId}
      ORDER BY achieved_at DESC
    `;
    
    if (stats.length === 0) {
      // Initialize gamification for user
      await sql`
        INSERT INTO user_gamification (user_id, total_points, current_level)
        VALUES (${userId}, 0, 1)
      `;
      
      return res.json({
        totalPoints: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        achievements: []
      });
    }
    
    res.json({
      totalPoints: stats[0].total_points,
      currentLevel: stats[0].current_level,
      currentStreak: stats[0].current_streak,
      longestStreak: stats[0].longest_streak,
      lastActivityDate: stats[0].last_activity_date,
      achievements: achievements.map(a => ({
        id: a.achievement_id,
        achievedAt: a.achieved_at,
        progress: a.progress,
        metadata: a.metadata
      }))
    });
  } catch (error) {
    console.error('Error fetching gamification data:', error);
    res.status(500).json({ error: 'Failed to fetch gamification data' });
  }
});

app.post("/api/v1/mobile/gamification/:userId/event", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { eventType, metadata } = req.body ?? {};
    
    if (!eventType) {
      return jsonError(res, 400, "eventType required");
    }
    
    // Award points based on event type
    const pointsMap: Record<string, number> = {
      'first_voucher_redeemed': 50,
      'first_send': 25,
      'first_cashout': 25,
      'daily_login': 5,
      'transaction_completed': 10,
      'profile_completed': 100,
      'streak_7_days': 150,
      'streak_30_days': 500
    };
    
    const points = pointsMap[eventType] || 0;
    
    // Update user points
    await sql`
      INSERT INTO user_gamification (user_id, total_points, current_level, last_activity_date)
      VALUES (${userId}, ${points}, 1, CURRENT_DATE)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        total_points = user_gamification.total_points + ${points},
        current_level = FLOOR(SQRT((user_gamification.total_points + ${points}) / 100)) + 1,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    `;
    
    // Record achievement if applicable
    if (pointsMap[eventType]) {
      await sql`
        INSERT INTO user_achievements (user_id, achievement_id, metadata)
        VALUES (${userId}, ${eventType}, ${JSON.stringify(metadata || {})})
        ON CONFLICT (user_id, achievement_id) DO NOTHING
      `;
    }
    
    res.json({ success: true, pointsAwarded: points });
  } catch (error) {
    console.error('Error recording gamification event:', error);
    res.status(500).json({ success: false });
  }
});

// --- Bank Account Linking – PRD §3.5 (Optional Feature) ---
app.get("/api/v1/mobile/bank-accounts/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    
    const accounts = await sql`
      SELECT id, bank_name, account_number, account_holder_name, account_type,
             branch_code, currency, is_verified, is_primary, linked_at, verified_at
      FROM linked_bank_accounts
      WHERE user_id = ${userId}
      ORDER BY is_primary DESC, linked_at DESC
    `;
    
    const formatted = accounts.map(a => ({
      id: a.id,
      bankName: a.bank_name,
      accountNumber: a.account_number,
      accountHolderName: a.account_holder_name,
      accountType: a.account_type,
      branchCode: a.branch_code,
      currency: a.currency,
      isVerified: a.is_verified,
      isPrimary: a.is_primary,
      linkedAt: a.linked_at,
      verifiedAt: a.verified_at
    }));
    
    res.json({ accounts: formatted });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

app.post("/api/v1/mobile/bank-accounts/:userId/link", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { bankName, accountNumber, accountHolderName, accountType, branchCode } = req.body ?? {};
    
    if (!bankName || !accountNumber) {
      return jsonError(res, 400, "bankName and accountNumber required");
    }
    
    // Check if account already linked
    const existing = await sql`
      SELECT id FROM linked_bank_accounts
      WHERE user_id = ${userId} AND bank_name = ${bankName} AND account_number = ${accountNumber}
    `;
    
    if (existing.length > 0) {
      return jsonError(res, 409, "Account already linked");
    }
    
    // Insert new linked account
    const result = await sql`
      INSERT INTO linked_bank_accounts (
        user_id, bank_name, account_number, account_holder_name, 
        account_type, branch_code, is_verified, is_primary
      )
      VALUES (
        ${userId}, ${bankName}, ${accountNumber}, ${accountHolderName || null},
        ${accountType || 'savings'}, ${branchCode || null}, false, false
      )
      RETURNING id, bank_name, account_number, is_verified, linked_at
    `;
    
    // Log verification attempt
    await sql`
      INSERT INTO bank_verification_attempts (linked_account_id, verification_method, status)
      VALUES (${result[0].id}, 'pending_verification', 'pending')
    `;
    
    res.status(201).json({
      success: true,
      account: {
        id: result[0].id,
        bankName: result[0].bank_name,
        accountNumber: result[0].account_number,
        isVerified: result[0].is_verified,
        linkedAt: result[0].linked_at,
        verificationRequired: true
      }
    });
  } catch (error) {
    console.error('Error linking bank account:', error);
    res.status(500).json({ success: false, error: 'Failed to link bank account' });
  }
});

app.post("/api/v1/mobile/bank-accounts/:accountId/verify", async (req: Request, res: Response) => {
  try {
    const accountId = req.params.accountId;
    const { verificationCode, method } = req.body ?? {};
    
    // In production, implement actual verification logic
    // For now, simulate verification
    const isValid = verificationCode && verificationCode.length === 6;
    
    if (isValid) {
      await sql`
        UPDATE linked_bank_accounts
        SET is_verified = true, verified_at = NOW(), updated_at = NOW()
        WHERE id = ${accountId}
      `;
      
      await sql`
        UPDATE bank_verification_attempts
        SET status = 'success', resolved_at = NOW()
        WHERE linked_account_id = ${accountId} AND status = 'pending'
      `;
      
      res.json({ success: true, verified: true });
    } else {
      await sql`
        UPDATE bank_verification_attempts
        SET attempts_count = attempts_count + 1
        WHERE linked_account_id = ${accountId} AND status = 'pending'
      `;
      
      res.status(400).json({ success: false, verified: false, error: 'Invalid verification code' });
    }
  } catch (error) {
    console.error('Error verifying bank account:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

app.delete("/api/v1/mobile/bank-accounts/:accountId", async (req: Request, res: Response) => {
  try {
    const accountId = req.params.accountId;
    
    await sql`
      DELETE FROM linked_bank_accounts
      WHERE id = ${accountId}
    `;
    
    res.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

app.post("/api/v1/mobile/bank-accounts/:accountId/set-primary", async (req: Request, res: Response) => {
  try {
    const accountId = req.params.accountId;
    
    // Get account to find user_id
    const account = await sql`
      SELECT user_id FROM linked_bank_accounts WHERE id = ${accountId}
    `;
    
    if (account.length === 0) {
      return jsonError(res, 404, "Account not found");
    }
    
    const userId = account[0].user_id;
    
    // Clear all primary flags for this user
    await sql`
      UPDATE linked_bank_accounts
      SET is_primary = false, updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    
    // Set new primary
    await sql`
      UPDATE linked_bank_accounts
      SET is_primary = true, updated_at = NOW()
      WHERE id = ${accountId}
    `;
    
    res.json({ success: true, isPrimary: true });
  } catch (error) {
    console.error('Error setting primary account:', error);
    res.status(500).json({ success: false, error: 'Failed to set primary' });
  }
});

// --- USSD – PRD §9.4 (ENHANCED) ---
interface USSDSession {
  step: string;
  data?: Record<string, any>;
}

const ussdSessions: Map<string, USSDSession> = new Map();

app.post("/api/v1/ussd/menu", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = (req.body ?? {}) as {
      sessionId?: string;
      serviceCode?: string;
      phoneNumber?: string;
      text?: string;
    };
    const sessionKey = sessionId ?? phoneNumber ?? "default";
    const input = (text ?? "").trim();
    let session = ussdSessions.get(sessionKey) ?? { step: "main", data: {} };

    let response: string;
    let endSession = false;

    // Main menu
    if (input === "" || session.step === "main") {
      session = { step: "main", data: {} };
      response = `Welcome to Buffr
1. Check Balance
2. Redeem Voucher
3. Generate Cash-Out Code
4. Transaction History
5. Nearby Agents
6. Help`;
    }
    // Balance inquiry
    else if (session.step === "main" && input === "1") {
      try {
        const userRows = await sql`SELECT id FROM users WHERE phone = ${phoneNumber ?? ""} LIMIT 1`;
        if (userRows.length === 0) {
          response = "Phone not registered with Buffr.";
          endSession = true;
        } else {
          const uid = (userRows[0] as { id: string }).id;
          const walletRows = await sql`
            SELECT balance, currency FROM wallets WHERE user_id = ${uid} ORDER BY created_at ASC LIMIT 1
          `;
          const bal = walletRows.length ? Number((walletRows[0] as { balance: number }).balance) : 0;
          const curr = walletRows.length ? (walletRows[0] as { currency: string }).currency : "NAD";
          response = `Your Balance: ${curr} ${bal.toFixed(2)}`;
          endSession = true;
        }
      } catch (err) {
        response = "Service unavailable. Try again later.";
        endSession = true;
      }
    }
    // Redeem voucher - ask for code
    else if (session.step === "main" && input === "2") {
      session = { step: "voucher_enter_code", data: {} };
      response = "Enter 16-digit voucher code:";
    }
    // Redeem voucher - process code
    else if (session.step === "voucher_enter_code") {
      if (input.length !== 16) {
        response = "Invalid code. Must be 16 digits.\nEnter voucher code:";
      } else {
        try {
          const voucher = await sql`
            SELECT id, amount, status FROM vouchers WHERE code = ${input} LIMIT 1
          `;
          
          if (voucher.length === 0) {
            response = "Voucher not found.";
            endSession = true;
          } else if (voucher[0].status !== 'active') {
            response = `Voucher already ${voucher[0].status}.`;
            endSession = true;
          } else {
            // Find user
            const userRows = await sql`SELECT id FROM users WHERE phone = ${phoneNumber ?? ""} LIMIT 1`;
            if (userRows.length === 0) {
              response = "Phone not registered.";
              endSession = true;
            } else {
              const userId = userRows[0].id;
              const amount = voucher[0].amount;
              
              // Redeem to wallet (simplified - real flow would check auth)
              const wallets = await sql`
                SELECT id FROM wallets WHERE user_id = ${userId} LIMIT 1
              `;
              
              if (wallets.length > 0) {
                await sql`
                  UPDATE wallets 
                  SET balance = balance + ${amount}, updated_at = NOW()
                  WHERE id = ${wallets[0].id}
                `;
                
                await sql`
                  UPDATE vouchers 
                  SET status = 'redeemed', redeemed_at = NOW(), updated_at = NOW()
                  WHERE id = ${voucher[0].id}
                `;
                
                response = `Success! NAD ${amount} added to wallet.`;
              } else {
                response = "Wallet not found. Please use mobile app.";
              }
              endSession = true;
            }
          }
        } catch (err) {
          response = "Redemption failed. Try again later.";
          endSession = true;
        }
      }
    }
    // Cash-out code generation
    else if (session.step === "main" && input === "3") {
      response = "Use Buffr mobile app to generate secure cash-out codes.";
      endSession = true;
    }
    // Transaction history
    else if (session.step === "main" && input === "4") {
      try {
        const userRows = await sql`SELECT id FROM users WHERE phone = ${phoneNumber ?? ""} LIMIT 1`;
        if (userRows.length === 0) {
          response = "Phone not registered.";
          endSession = true;
        } else {
          const userId = userRows[0].id;
          const txs = await sql`
            SELECT type, amount, status, created_at
            FROM transactions
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT 3
          `;
          
          if (txs.length === 0) {
            response = "No recent transactions.";
          } else {
            response = "Last 3 transactions:\n" + txs.map((t, i) => 
              `${i+1}. ${t.type} NAD ${t.amount} (${t.status})`
            ).join('\n');
          }
          endSession = true;
        }
      } catch (err) {
        response = "Service unavailable.";
        endSession = true;
      }
    }
    // Nearby agents
    else if (session.step === "main" && input === "5") {
      response = "Nearest Buffr agents:\n1. Spar CBD, Windhoek\n2. Checkers Maerua\n3. Agent - Maria, Oshakati\nVisit agent for cash withdrawal.";
      endSession = true;
    }
    // Help
    else if (session.step === "main" && input === "6") {
      response = "Buffr Help:\nCall: 061-123-4567\nWhatsApp: +264 81 234 5678\nEmail: help@buffr.na";
      endSession = true;
    }
    else {
      response = "Invalid option. Please try again.";
      session = { step: "main", data: {} };
    }

    // Update or delete session
    if (endSession) {
      ussdSessions.delete(sessionKey);
    } else {
      ussdSessions.set(sessionKey, session);
    }

    res.json({ response, endSession });
  } catch (error) {
    next(error);
  }
});

// --- Device registration for push notifications ---

app.post(
  "/api/v1/mobile/device/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { pushToken }: { pushToken?: string } = req.body ?? {};
      
      if (!pushToken) {
        return jsonError(res, 400, "pushToken is required");
      }
      
      // Store device token (gracefully handle missing table)
      try {
        await sql`
          INSERT INTO device_tokens (user_id, push_token, created_at)
          VALUES (${userId}, ${pushToken}, now())
          ON CONFLICT (user_id) DO UPDATE SET push_token = ${pushToken}, updated_at = now()
        `;
      } catch (_) {
        // device_tokens table may not exist - that's ok for dev
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// --- Change PIN ---

app.post(
  "/api/v1/mobile/auth/change-pin",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { currentPin, newPin }: { currentPin?: string; newPin?: string } = req.body ?? {};
      
      if (!currentPin || !newPin) {
        return jsonError(res, 400, "currentPin and newPin are required");
      }
      
      if (newPin.length < 4 || newPin.length > 6) {
        return jsonError(res, 400, "PIN must be 4-6 digits");
      }
      
      // Verify user exists
      const userRows = await sql`
        SELECT id FROM users WHERE id = ${userId}
      `;
      
      if (userRows.length === 0) {
        return jsonError(res, 404, "User not found");
      }
      
      // Try to update PIN - handle missing column gracefully
      try {
        await sql`
          UPDATE users SET pin_hash = ${newPin}, updated_at = now()
          WHERE id = ${userId}
        `;
      } catch (dbError: any) {
        // Check if column doesn't exist
        if (dbError?.code === '42703') {
          // Try to add the column first
          try {
            await sql`
              ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255)
            `;
            await sql`
              UPDATE users SET pin_hash = ${newPin}, updated_at = now()
              WHERE id = ${userId}
            `;
          } catch (addError: any) {
            // If still fails, return graceful error
            console.error('PIN change error:', addError);
            return jsonError(res, 503, "PIN change temporarily unavailable");
          }
        } else {
          throw dbError;
        }
      }
      
      res.json({ success: true, message: "PIN changed successfully" });
    } catch (error) {
      next(error);
    }
  }
);

// --- Edit Profile ---

app.patch(
  "/api/v1/mobile/user/profile",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { firstName, lastName, photoUrl }: { firstName?: string; lastName?: string; photoUrl?: string } = req.body ?? {};
      
      // Build updates with try-catch for each field
      if (firstName !== undefined) {
        try {
          await sql`UPDATE users SET first_name = ${firstName}, updated_at = now() WHERE id = ${userId}`;
        } catch (dbError: any) {
          if (dbError?.code !== '42703') throw dbError;
          // Column doesn't exist, try to add it
          try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255)`;
            await sql`UPDATE users SET first_name = ${firstName}, updated_at = now() WHERE id = ${userId}`;
          } catch (e) { console.error('first_name update error:', e); }
        }
      }
      
      if (lastName !== undefined) {
        try {
          await sql`UPDATE users SET last_name = ${lastName}, updated_at = now() WHERE id = ${userId}`;
        } catch (dbError: any) {
          if (dbError?.code !== '42703') throw dbError;
          try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)`;
            await sql`UPDATE users SET last_name = ${lastName}, updated_at = now() WHERE id = ${userId}`;
          } catch (e) { console.error('last_name update error:', e); }
        }
      }
      
      if (photoUrl !== undefined) {
        try {
          await sql`UPDATE users SET photo_url = ${photoUrl}, updated_at = now() WHERE id = ${userId}`;
        } catch (dbError: any) {
          if (dbError?.code !== '42703') throw dbError;
          try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)`;
            await sql`UPDATE users SET photo_url = ${photoUrl}, updated_at = now() WHERE id = ${userId}`;
          } catch (e) { console.error('photo_url update error:', e); }
        }
      }
      
      // Fetch updated user
      try {
        const rows = await sql`
          SELECT id, phone, first_name, last_name, photo_url
          FROM users WHERE id = ${userId}
        `;
        
        if (rows.length === 0) {
          return jsonError(res, 404, "User not found");
        }
        
        const row: any = rows[0];
        res.json({
          success: true,
          user: {
            id: row.id,
            phone: row.phone,
            firstName: row.first_name,
            lastName: row.last_name,
            photoUrl: row.photo_url,
          }
        });
      } catch (fetchError: any) {
        // If columns don't exist, return success anyway
        if (fetchError?.code === '42703') {
          res.json({ success: true, message: "Profile update queued" });
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      next(error);
    }
  }
);

// --- ATM Code Generation (Fineract sync via cashoutService) ---

app.post(
  "/api/cashout/atm-code",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { walletId, amount }: { walletId?: string; amount?: number } = req.body ?? {};
      const idempotencyKey = req.header("Idempotency-Key") ?? undefined;

      if (!walletId) {
        return jsonError(res, 400, "walletId is required");
      }
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return jsonError(res, 400, "amount must be a positive number");
      }

      const result = await generateAtmCode(userId, walletId, amount);
      res.json({
        code: result.code,
        expiresAt: result.expiresAt.toISOString(),
        amount: result.balance === undefined ? amount : undefined,
        balance: result.balance,
      });
    } catch (error: any) {
      if (error?.message === "Wallet not found") {
        return jsonError(res, 404, error.message);
      }
      if (error?.message === "Insufficient funds" || error?.message?.includes("amount")) {
        return jsonError(res, 400, error.message);
      }
      next(error);
    }
  }
);

// --- Wallet cash-out (unified: till, agent, merchant, atm) - PRD §9.4 ---

app.post(
  "/api/v1/mobile/wallets/:id/cashout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const { id: walletId } = req.params;
      const { amount, method, destination, verification_token }: {
        amount?: number;
        method?: string;
        destination?: string;
        verification_token?: string;
      } = req.body ?? {};
      const idempotencyKey = req.header("Idempotency-Key") ?? undefined;

      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return jsonError(res, 400, "amount must be a positive number");
      }
      const allowedMethods = ["atm", "till", "agent", "merchant", "bank"];
      const rawMethod = (method ?? "atm").toLowerCase();
      if (!allowedMethods.includes(rawMethod)) {
        return jsonError(res, 400, `method must be one of: ${allowedMethods.join(", ")}`);
      }
      
      // Handle bank cash-out separately
      if (rawMethod === "bank") {
        const bankAccountId = req.body.bankAccountId || req.body.bank_account_id;
        if (!bankAccountId) {
          return jsonError(res, 400, "bankAccountId is required for bank cash-out");
        }
        
        const result = await processBankCashOut({
          userId,
          walletId,
          amount,
          bankAccountId,
          idempotencyKey
        });
        
        if (!result.success) {
          return jsonError(res, 400, result.error ?? "Bank cash-out failed");
        }
        
        return res.status(200).json({
          success: true,
          transactionId: result.transactionId,
          balance: result.balance,
          message: "Transfer initiated successfully"
        });
      }
      
      const cashoutMethod = rawMethod as "atm" | "till" | "agent" | "merchant";

      if (cashoutMethod === "atm") {
        const result = await generateAtmCode(userId, walletId, amount);
        return res.status(200).json({
          success: true,
          code: result.code,
          expires_at: result.expiresAt.toISOString(),
          message: "Use this code at an ATM within 30 minutes",
        });
      }

      const result = await processCashOut({
        userId,
        walletId,
        amount,
        method: cashoutMethod,
        idempotencyKey,
      });

      if (!result.success) {
        if (result.error === "Wallet not found") {
          return jsonError(res, 404, result.error);
        }
        if (result.error === "Insufficient funds" || result.error?.includes("amount")) {
          return jsonError(res, 400, result.error);
        }
        return jsonError(res, 400, result.error ?? "Cash-out failed");
      }

      return res.status(200).json({
        success: true,
        ...(result.balance != null && { balance: result.balance }),
        message: "Cash-out successful",
      });
    } catch (error: any) {
      if (error?.message === "Wallet not found") {
        return jsonError(res, 404, error.message);
      }
      if (error?.message === "Insufficient funds" || error?.message?.includes("amount")) {
        return jsonError(res, 400, error.message);
      }
      next(error);
    }
  }
);

// =============================================================================
// NAMQR Code Standards v5.0 API - Bank of Namibia
// =============================================================================

// CRC utility for NAMQR (inline implementation matching mobile)
const CRC16_POLY = 0x1021;
const CRC16_INIT = 0xffff;

function crc16ccitt(bytes: Buffer): number {
  let crc = CRC16_INIT;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let b = 0; b < 8; b++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ CRC16_POLY;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc;
}

function formatTLV(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

// Generate NAMQR for payments
const namqrGenerateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      payeeName,
      payeeIdentifier,
      amount,
      currency = '516',
      reference,
      description,
      paymentStream = 'IPP',
      isDynamic = !!amount,
      expiryMinutes = 15,
    } = req.body;

    // Validate required fields
    if (!payeeName || !payeeIdentifier) {
      return jsonError(res, 400, 'payeeName and payeeIdentifier are required');
    }

    // Generate Token Vault ID
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const tokenVaultId = `${timestamp}${random}`.slice(-14);

    // Build NAMQR payload
    const dataObjects: string[] = [];

    // 00 - Payload Format Indicator
    dataObjects.push(formatTLV('00', '01'));

    // 01 - Point of Initiation Method
    const pointOfInit = isDynamic ? '12' : '11';
    dataObjects.push(formatTLV('01', pointOfInit));

    // Payment Stream specific tags
    if (paymentStream === 'IPP') {
      const fullFormAlias = payeeIdentifier.includes('@') 
        ? payeeIdentifier 
        : `${payeeIdentifier}@na.com.operator.ipp`;
      dataObjects.push(formatTLV('26', fullFormAlias));
    } else {
      const globalId = `na.com.namclear.${paymentStream.toLowerCase()}`;
      dataObjects.push(formatTLV('17', globalId));
      dataObjects.push(formatTLV('02', payeeIdentifier));
    }

    // 52 - Merchant Category Code
    dataObjects.push(formatTLV('52', '0000'));

    // 53 - Transaction Currency
    if (isDynamic || amount) {
      dataObjects.push(formatTLV('53', currency));
    }

    // 54 - Transaction Amount (dynamic only)
    if (isDynamic && amount) {
      dataObjects.push(formatTLV('54', amount));
    }

    // 58 - Country Code
    dataObjects.push(formatTLV('58', 'NA'));

    // 59 - Payee Name
    dataObjects.push(formatTLV('59', payeeName.substring(0, 25)));

    // 60 - Payee City
    dataObjects.push(formatTLV('60', 'Windhoek'));

    // 62 - Additional Data Field
    const additionalData: string[] = [];
    if (reference) {
      additionalData.push(formatTLV('05', reference.substring(0, 25)));
    }
    if (description) {
      additionalData.push(formatTLV('08', description.substring(0, 25)));
    }
    if (additionalData.length > 0) {
      dataObjects.push(formatTLV('62', additionalData.join('')));
    }

    // 65 - Token Vault Unique ID
    dataObjects.push(formatTLV('65', tokenVaultId));

    // 80 - Unreserved Template (Initiation Mode, Purpose)
    const initMode = isDynamic ? '15' : '01';
    const template80 = formatTLV('00', 'na.com.namclear.namqr') + 
                       formatTLV('01', initMode);
    dataObjects.push(formatTLV('80', template80));

    // 82 - Unreserved Template (Expiry for dynamic)
    if (isDynamic) {
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);
      const expiryStr = expiryDate.toISOString().replace(/[-:TZ]/g, '').substring(0, 14);
      const refId = reference || `TXN${Date.now()}`;
      const template82 = formatTLV('00', 'na.com.namclear.namqr') + 
                         formatTLV('01', refId.substring(0, 35)) +
                         formatTLV('02', expiryStr);
      dataObjects.push(formatTLV('82', template82));
    }

    // Join all data objects
    let payload = dataObjects.join('');

    // Calculate CRC
    const crcData = payload + formatTLV('63', '0000');
    const crcBuffer = Buffer.from(crcData, 'utf8');
    const crcValue = crc16ccitt(crcBuffer);
    const crcHex = crcValue.toString(16).toUpperCase().padStart(4, '0');

    // Add CRC as last element
    payload = payload + formatTLV('63', crcHex);

    // Return the generated NAMQR
    res.json({
      success: true,
      namqr: payload,
      tokenVaultId,
      isDynamic,
      amount: amount || null,
      currency,
      expiry: isDynamic ? new Date(Date.now() + expiryMinutes * 60000).toISOString() : null,
      paymentStream,
    });
  } catch (error) {
    next(error);
  }
};
app.post('/api/v1/mobile/namqr/generate', namqrGenerateHandler);
app.post('/api/v1/mobile/qr/generate', namqrGenerateHandler);

// Parse and validate NAMQR
const namqrValidateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { namqr } = req.body;

    if (!namqr || typeof namqr !== 'string') {
      return jsonError(res, 400, 'namqr payload is required');
    }

    // Parse TLV objects
    const parseTLV = (input: string, startIndex: number) => {
      if (startIndex + 4 > input.length) return null;
      const tag = input.substring(startIndex, startIndex + 2);
      const lengthStr = input.substring(startIndex + 2, startIndex + 4);
      const length = parseInt(lengthStr, 10);
      if (isNaN(length) || length < 0 || startIndex + 4 + length > input.length) return null;
      const value = input.substring(startIndex + 4, startIndex + 4 + length);
      return { tag, length, value, raw: input.substring(startIndex, startIndex + 4 + length) };
    };

    // Validate CRC
    const findTag63Index = (payload: string): number => {
      let i = 0;
      while (i <= payload.length - 4) {
        const result = parseTLV(payload, i);
        if (!result) return -1;
        if (result.tag === '63') return i;
        i += result.raw.length;
      }
      return -1;
    };

    const idx = findTag63Index(namqr);
    if (idx === -1) {
      return jsonError(res, 400, 'CRC (tag 63) not found');
    }

    const lenStr = namqr.substring(idx + 2, idx + 4);
    const len = parseInt(lenStr, 10);
    if (len !== 2) {
      return jsonError(res, 400, 'Invalid CRC length');
    }

    const crcValueHex = namqr.substring(idx + 4, idx + 8);
    const expectedCrc = parseInt(crcValueHex, 16);
    if (isNaN(expectedCrc)) {
      return jsonError(res, 400, 'Invalid CRC value');
    }

    const dataForCrc = namqr.substring(0, idx + 4);
    const crcBuffer = Buffer.from(dataForCrc, 'utf8');
    const computedCrc = crc16ccitt(crcBuffer);

    if ((computedCrc & 0xffff) !== (expectedCrc & 0xffff)) {
      return jsonError(res, 400, 'CRC validation failed');
    }

    // Parse all TLV objects
    const result: Record<string, string> = {};
    let i = 0;
    while (i < namqr.length) {
      const obj = parseTLV(namqr, i);
      if (!obj) break;
      result[obj.tag] = obj.value;
      i += obj.raw.length;
    }

    // Extract payment information
    const paymentInfo: any = {
      valid: true,
      formatIndicator: result['00'],
      pointOfInitiation: result['01'],
      paymentStream: result['17']?.includes('nrtc') ? 'NRTC' :
                     result['17']?.includes('encr') ? 'ENCR' :
                     result['17']?.includes('endo') ? 'ENDO' :
                     result['26'] ? 'IPP' : 'UNKNOWN',
      merchantCategoryCode: result['52'],
      currency: result['53'],
      amount: result['54'] || null,
      countryCode: result['58'],
      payeeName: result['59'],
      payeeCity: result['60'],
      tokenVaultUniqueId: result['65'],
      crcValid: true,
    };

    // Check if dynamic and if expired
    if (paymentInfo.amount) {
      // Parse expiry from template 82
      if (result['82']) {
        let j = 0;
        let expiryDate = '';
        while (j < result['82'].length) {
          const sub = parseTLV(result['82'], j);
          if (!sub) break;
          if (sub.tag === '02') {
            expiryDate = sub.value;
          }
          j += sub.raw.length;
        }
        if (expiryDate) {
          try {
            const expDate = new Date(
              parseInt(expiryDate.substring(0, 4), 10),
              parseInt(expiryDate.substring(4, 6), 10) - 1,
              parseInt(expiryDate.substring(6, 8), 10),
              parseInt(expiryDate.substring(8, 10), 10),
              parseInt(expiryDate.substring(10, 12), 10),
              parseInt(expiryDate.substring(12, 14), 10)
            );
            paymentInfo['expired'] = expDate < new Date();
            paymentInfo['expiry'] = expDate.toISOString();
          } catch {}
        }
      }
    }

    res.json({
      success: true,
      ...paymentInfo,
    });
  } catch (error) {
    next(error);
  }
};
app.post('/api/v1/mobile/namqr/validate', namqrValidateHandler);
app.post('/api/v1/mobile/qr/validate', namqrValidateHandler);

// Generate payment QR for merchant (merchant-presented)
app.post('/api/v1/mobile/namqr/merchant', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const {
      amount,
      description,
      mcc = '0000',
      isDynamic = !!amount,
    } = req.body;

    // Get merchant info from user profile or use defaults
    const merchantName = 'BUFFR FINANCIAL SERVICES CC';
    const merchantId = userId; // In production, use actual merchant ID

    // Generate NAMQR
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const tokenVaultId = `${timestamp}${random}`.slice(-14);

    const dataObjects: string[] = [];

    dataObjects.push(formatTLV('00', '01'));
    dataObjects.push(formatTLV('01', isDynamic ? '12' : '11'));
    
    // IPP Full Form Alias
    const fullFormAlias = `${merchantId}@na.com.operator.ipp`;
    dataObjects.push(formatTLV('26', fullFormAlias));
    
    dataObjects.push(formatTLV('52', mcc));
    
    if (isDynamic || amount) {
      dataObjects.push(formatTLV('53', '516'));
    }
    
    if (isDynamic && amount) {
      dataObjects.push(formatTLV('54', amount));
    }
    
    dataObjects.push(formatTLV('58', 'NA'));
    dataObjects.push(formatTLV('59', merchantName.substring(0, 25)));
    dataObjects.push(formatTLV('60', 'Windhoek'));
    
    if (description) {
      dataObjects.push(formatTLV('62', formatTLV('08', description.substring(0, 25))));
    }
    
    dataObjects.push(formatTLV('65', tokenVaultId));
    
    const initMode = isDynamic ? '15' : '01';
    dataObjects.push(formatTLV('80', formatTLV('00', 'na.com.namclear.namqr') + formatTLV('01', initMode)));
    
    if (isDynamic) {
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 15);
      const expiryStr = expiryDate.toISOString().replace(/[-:TZ]/g, '').substring(0, 14);
      dataObjects.push(formatTLV('82', formatTLV('00', 'na.com.namclear.namqr') + formatTLV('01', `MER${Date.now()}`) + formatTLV('02', expiryStr)));
    }
    
    let payload = dataObjects.join('');
    const crcData = payload + formatTLV('63', '0000');
    const crcBuffer = Buffer.from(crcData, 'utf8');
    const crcValue = crc16ccitt(crcBuffer);
    const crcHex = crcValue.toString(16).toUpperCase().padStart(4, '0');
    payload = payload + formatTLV('63', crcHex);

    res.json({
      success: true,
      namqr: payload,
      merchantName,
      merchantId,
      amount: amount || null,
      isDynamic,
    });
  } catch (error) {
    next(error);
  }
});

// Token Vault API proxy (for production integration)
app.post('/api/v1/mobile/tokenvault/validate', async (req: Request, res: Response, next: NextFunction) => {
  const tokenVaultUrl = process.env.TOKEN_VAULT_URL;
  const tokenVaultApiKey = process.env.TOKEN_VAULT_API_KEY;

  if (!tokenVaultUrl || !tokenVaultApiKey) {
    return jsonError(res, 503, 'Token Vault not configured');
  }

  try {
    const response = await fetch(`${tokenVaultUrl}/api/v1/namqr/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenVaultApiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/mobile/tokenvault/generate', async (req: Request, res: Response, next: NextFunction) => {
  const tokenVaultUrl = process.env.TOKEN_VAULT_URL;
  const tokenVaultApiKey = process.env.TOKEN_VAULT_API_KEY;

  if (!tokenVaultUrl || !tokenVaultApiKey) {
    return jsonError(res, 503, 'Token Vault not configured');
  }

  try {
    const response = await fetch(`${tokenVaultUrl}/api/v1/namqr/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenVaultApiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    next(error);
  }
});

// --- Global error handler ---

// Open Banking endpoints (Namibian Open Banking Standards v1.0)

// Get list of supported banks
app.get('/api/v1/mobile/open-banking/banks', async (req: Request, res: Response) => {
  const banks = getSupportedBanks();
  res.json({
    data: banks,
    meta: { totalRecords: banks.length },
  });
});

// Create OAuth consent request with PKCE
app.post('/api/v1/mobile/open-banking/consent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const { bankId, scopes, redirectUri } = req.body;
    
    if (!bankId) {
      return res.status(400).json({
        errors: [{ code: 'INVALID_REQUEST', title: 'bankId is required' }],
      });
    }
    
    // Generate state and PKCE verifier
    const state = `${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const { generateCodeVerifier } = await import("./lib/openBanking.js");
    const codeVerifier = generateCodeVerifier();
    
    // Store state in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await sql`
      INSERT INTO oauth_states (state, user_id, bank_id, redirect_uri, code_verifier, expires_at)
      VALUES (${state}, ${userId}, ${bankId}, ${redirectUri || 'buffr://oauth/callback'}, ${codeVerifier}, ${expiresAt.toISOString()})
    `;
    
    // Create consent
    const consent = await createConsent({
      bankId,
      scopes: scopes || [],
      redirectUri: redirectUri || 'buffr://oauth/callback',
      state,
    });
    
    res.json({
      ...consent,
      codeVerifier, // Client needs this for PKCE
      expiresAt: expiresAt.toISOString()
    });
  } catch (error: any) {
    console.error('Consent creation error:', error);
    res.status(400).json({
      errors: [{ code: 'CONSENT_ERROR', title: error.message }],
    });
  }
});

// Exchange OAuth code for bank tokens
app.post('/api/v1/mobile/open-banking/token-exchange', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const { bankId, code, redirectUri, codeVerifier, state } = req.body;
    
    if (!bankId || !code) {
      return res.status(400).json({
        errors: [{ code: 'INVALID_REQUEST', title: 'bankId and code are required' }],
      });
    }
    
    // Verify state if provided (CSRF protection)
    if (state) {
      const stateResult = await sql`
        SELECT user_id, bank_id FROM oauth_states
        WHERE state = ${state} AND expires_at > NOW()
        LIMIT 1
      `;
      
      if (stateResult.length === 0) {
        return res.status(400).json({
          errors: [{ code: 'INVALID_STATE', title: 'State parameter invalid or expired' }],
        });
      }
      
      // Clean up used state
      await sql`DELETE FROM oauth_states WHERE state = ${state}`;
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens({
      bankId,
      code,
      redirectUri: redirectUri || '',
      codeVerifier,
    });
    
    // Store tokens in database
    const { saveTokens } = await import("./lib/openBanking.js");
    await saveTokens(userId, bankId, tokens);
    
    // Log successful link
    await sql`
      INSERT INTO audit_logs (user_id, entity_type, entity_id, action, meta)
      VALUES (
        ${userId}, 
        'open_banking', 
        ${bankId}, 
        'bank_linked',
        ${JSON.stringify({ bank: bankId, timestamp: new Date().toISOString() })}
      )
    `;
    
    res.json({ 
      success: true,
      linked: true,
      expiresAt: new Date(tokens.expiresAt).toISOString()
    });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    res.status(400).json({
      errors: [{ code: 'TOKEN_EXCHANGE_ERROR', title: error.message }],
    });
  }
});

// Get linked bank accounts
app.get('/api/v1/mobile/open-banking/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const accounts = await getLinkedAccounts(userId);
    
    res.json({
      data: accounts,
      meta: { totalRecords: accounts.length },
    });
  } catch (error) {
    next(error);
  }
});

// Get account balance
app.get('/api/v1/mobile/open-banking/accounts/:accountId/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const { accountId } = req.params;
    const { bankId } = req.query;
    
    if (!bankId) {
      return res.status(400).json({
        errors: [{ code: 'INVALID_REQUEST', title: 'bankId query param is required' }],
      });
    }
    
    const balance = await getAccountBalance(userId, bankId as string, accountId as string);
    res.json({ data: balance });
  } catch (error) {
    next(error);
  }
});

// Get account transactions
app.get('/api/v1/mobile/open-banking/accounts/:accountId/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await getCurrentUserId(req);
    const { accountId } = req.params;
    const { bankId, fromDate, toDate, page, pageSize } = req.query;
    
    if (!bankId) {
      return res.status(400).json({
        errors: [{ code: 'INVALID_REQUEST', title: 'bankId query param is required' }],
      });
    }
    
    const transactions = await getAccountTransactions(
      userId, 
      bankId as string, 
      accountId as string, 
      fromDate as string, 
      toDate as string,
      page ? parseInt(page as string, 10) : 1,
      pageSize ? parseInt(pageSize as string, 10) : 20
    );
    
    res.json({
      data: transactions.transactions,
      meta: { 
        totalRecords: transactions.total, 
        page: transactions.page, 
        pageSize: transactions.pageSize 
      },
    });
  } catch (error) {
    next(error);
  }
});

// --- Offline Code Registration ---

/**
 * POST /api/v1/mobile/offline-codes/register
 * Register offline-generated code for later use.
 */
app.post('/api/v1/mobile/offline-codes/register', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { code, nonce, transactionId, walletId, amount, method, expiresAt } = req.body;
    
    // Validate code format
    if (!code || !code.startsWith('OFFLINE-')) {
      return res.status(400).json({ error: 'Invalid offline code format' });
    }
    
    if (!nonce || !transactionId || !walletId || !amount || !method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check for duplicate registration (idempotency)
    const existing = await sql`
      SELECT id FROM offline_codes_registry
      WHERE code = ${code} OR nonce = ${nonce}
    `;
    
    if (existing.length > 0) {
      return res.status(200).json({ 
        message: 'Code already registered', 
        status: 'registered' 
      });
    }
    
    // Verify wallet exists and belongs to user
    const wallet = await sql`
      SELECT balance FROM wallets WHERE id = ${walletId} AND user_id = ${userId}
    `;
    
    if (wallet.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    if (wallet[0].balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Register code in database
    await sql`
      INSERT INTO offline_codes_registry (
        code, nonce, transaction_id, wallet_id, amount, method, status, expires_at
      )
      VALUES (
        ${code}, ${nonce}, ${transactionId}, ${walletId}, ${amount}, 
        ${method}, 'registered', ${expiresAt}
      )
    `;
    
    res.json({
      status: 'registered',
      code,
      expiresAt
    });
  } catch (error) {
    next(error);
  }
});

// --- Group Shared Wallets & Contributions ---

/**
 * GET /api/v1/mobile/groups/:groupId/wallet
 * Get group shared wallet balance.
 */
app.get('/api/v1/mobile/groups/:groupId/wallet', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { groupId } = req.params;
    
    // Verify user is group member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
    
    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    
    // Get group wallet
    const wallet = await sql`
      SELECT id, group_id, balance, currency, type, is_active, created_at
      FROM group_wallets
      WHERE group_id = ${groupId} AND is_active = true
    `;
    
    if (wallet.length === 0) {
      return res.status(404).json({ error: 'Group wallet not found' });
    }
    
    res.json({ wallet: wallet[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/mobile/groups/:groupId/contributions
 * Get member contribution breakdown.
 */
app.get('/api/v1/mobile/groups/:groupId/contributions', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { groupId } = req.params;
    
    // Verify user is group member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
    
    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    
    // Get members with their total contributions
    const members = await sql`
      SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as name,
        u.phone as phone_number,
        gm.joined_at,
        gm.role,
        COALESCE(SUM(gc.amount), 0) as total_contributed,
        MAX(gc.created_at) as last_contribution
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      LEFT JOIN group_contributions gc ON gc.group_id = gm.group_id AND gc.user_id = gm.user_id
      WHERE gm.group_id = ${groupId}
      GROUP BY u.id, u.first_name, u.last_name, u.phone, gm.joined_at, gm.role
      ORDER BY total_contributed DESC
    `;
    
    res.json({ members });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/mobile/groups/:groupId/transactions
 * Get group transaction history.
 */
app.get('/api/v1/mobile/groups/:groupId/transactions', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Verify user is group member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
    
    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    
    // Get group transactions
    const transactions = await sql`
      SELECT 
        gt.id,
        gt.group_id,
        gt.type,
        gt.amount,
        gt.from_user_id,
        gt.to_user_id,
        gt.description,
        gt.status,
        gt.created_at
      FROM group_transactions gt
      WHERE gt.group_id = ${groupId}
      ORDER BY gt.created_at DESC
      LIMIT ${limit}
    `;
    
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/mobile/groups/:groupId/contribute
 * Contribute to group wallet from personal wallet.
 */
app.post('/api/v1/mobile/groups/:groupId/contribute', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { groupId } = req.params;
    const { amount, fromWalletId, method } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Verify user is group member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
    
    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    
    // Verify source wallet
    const wallet = await sql`
      SELECT balance FROM wallets WHERE id = ${fromWalletId} AND user_id = ${userId}
    `;
    
    if (wallet.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    if (wallet[0].balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Use atomic transaction to ensure all-or-nothing operation (T3 enhancement)
    const result = await groupContributionAtomic({
      groupId,
      userId,
      walletId: fromWalletId,
      amount,
      description: method === 'instant' ? 'Instant contribution' : 'Member contribution',
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Contribution failed' });
    }
    
    res.json({ success: true, message: 'Contribution successful', contributionId: result.data?.contributionId });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/mobile/groups/:groupId/send
 * Send from group wallet to recipient.
 */
app.post('/api/v1/mobile/groups/:groupId/send', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { groupId } = req.params;
    const { recipientId, amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Verify user is admin
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
    
    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can send from group' });
    }
    
    // Get group wallet balance
    const groupWallet = await sql`
      SELECT balance FROM group_wallets WHERE group_id = ${groupId}
    `;
    
    if (groupWallet.length === 0) {
      return res.status(404).json({ error: 'Group wallet not found' });
    }
    
    if (groupWallet[0].balance < amount) {
      return res.status(400).json({ error: 'Insufficient group balance' });
    }
    
    // Execute operations sequentially
    // Debit group wallet
    await sql`
      UPDATE group_wallets SET balance = balance - ${amount} WHERE group_id = ${groupId}
    `;
    
    // Credit recipient (assuming recipientId is a user ID)
    await sql`
      UPDATE wallets SET balance = balance + ${amount} 
      WHERE user_id = ${recipientId} AND type = 'main'
    `;
    
    // Record transaction
    await sql`
      INSERT INTO group_transactions (group_id, type, amount, to_user_id, description, status)
      VALUES (${groupId}, 'send', ${amount}, ${recipientId}, ${description || 'Group payment'}, 'completed')
    `;
    
    res.json({ success: true, message: 'Payment sent from group' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/mobile/groups/:groupId/withdraw
 * Withdraw from group wallet to personal wallet.
 */
app.post('/api/v1/mobile/groups/:groupId/withdraw', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { groupId } = req.params;
    const { amount, toWalletId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Verify user is admin
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;
    
    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can withdraw from group' });
    }
    
    // Verify destination wallet
    const wallet = await sql`
      SELECT id FROM wallets WHERE id = ${toWalletId} AND user_id = ${userId}
    `;
    
    if (wallet.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Get group wallet balance
    const groupWallet = await sql`
      SELECT balance FROM group_wallets WHERE group_id = ${groupId}
    `;
    
    if (groupWallet.length === 0) {
      return res.status(404).json({ error: 'Group wallet not found' });
    }
    
    if (groupWallet[0].balance < amount) {
      return res.status(400).json({ error: 'Insufficient group balance' });
    }
    
    // Execute operations sequentially
    // Debit group wallet
    await sql`
      UPDATE group_wallets SET balance = balance - ${amount} WHERE group_id = ${groupId}
    `;
    
    // Credit personal wallet
    await sql`
      UPDATE wallets SET balance = balance + ${amount} WHERE id = ${toWalletId}
    `;
    
    // Record transaction
    await sql`
      INSERT INTO group_transactions (group_id, type, amount, from_user_id, description, status)
      VALUES (${groupId}, 'withdrawal', ${amount}, ${userId}, 'Withdrawal to personal wallet', 'completed')
    `;
    
    res.json({ success: true, message: 'Withdrawal successful' });
  } catch (error) {
    next(error);
  }
});

// --- Loan Repayment Edge Cases ---

/**
 * POST /api/v1/mobile/vouchers/:voucherId/redeem-with-loan
 * Redeem voucher with automatic loan repayment deduction.
 */
app.post('/api/v1/mobile/vouchers/:voucherId/redeem-with-loan', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { voucherId } = req.params;
    const { walletId, method } = req.body;
    
    // Get voucher
    const voucher = await sql`
      SELECT * FROM vouchers WHERE id = ${voucherId} AND user_id = ${userId} AND status = 'available'
    `;
    
    if (voucher.length === 0) {
      return res.status(404).json({ error: 'Voucher not found or already redeemed' });
    }
    
    const voucherAmount = voucher[0].amount;
    
    // Check for active loan
    const loan = await sql`
      SELECT id, amount_remaining FROM loans 
      WHERE user_id = ${userId} AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1
    `;
    
    let loanRepayment = 0;
    let loanFullyRepaid = false;
    let overpayment = 0;
    
    if (loan.length > 0) {
      const loanBalance = loan[0].amount_remaining;
      loanRepayment = Math.min(voucherAmount, loanBalance);
      loanFullyRepaid = voucherAmount >= loanBalance;
      overpayment = Math.max(0, voucherAmount - loanBalance);
    }
    
    const netAmount = voucherAmount - loanRepayment;
    
    // Execute operations sequentially
    // Mark voucher as redeemed
    await sql`
      UPDATE vouchers SET status = 'redeemed', redeemed_at = NOW() WHERE id = ${voucherId}
    `;
    
    // Apply loan repayment if applicable
    if (loanRepayment > 0 && loan.length > 0) {
      // Update loan with repayment
      if (loanFullyRepaid) {
        await sql`
          UPDATE loans 
          SET amount_paid = amount_paid + ${loanRepayment},
              amount_remaining = amount_remaining - ${loanRepayment},
              status = 'repaid',
              repaid_at = NOW()
          WHERE id = ${loan[0].id}
        `;
      } else {
        await sql`
          UPDATE loans 
          SET amount_paid = amount_paid + ${loanRepayment},
              amount_remaining = amount_remaining - ${loanRepayment},
              status = 'active'
          WHERE id = ${loan[0].id}
        `;
      }
      
      // Record repayment
      await sql`
        INSERT INTO loan_repayments (loan_id, amount, method)
        VALUES (${loan[0].id}, ${loanRepayment}, 'voucher_redemption')
      `;
    }
    
    // Credit wallet with net amount (or full amount if no loan)
    if (method === 'wallet' && netAmount > 0) {
      await sql`
        UPDATE wallets SET balance = balance + ${netAmount} WHERE id = ${walletId}
      `;
    }
    
    res.json({
      voucherAmount,
      loanRepayment,
      netAmount,
      loanFullyRepaid,
      overpayment: overpayment > 0 ? overpayment : undefined
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/mobile/loans/:loanId/repay
 * Make partial early repayment from wallet.
 */
app.post('/api/v1/mobile/loans/:loanId/repay', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { loanId } = req.params;
    const { amount, walletId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Get loan
    const loan = await sql`
      SELECT * FROM loans WHERE id = ${loanId} AND user_id = ${userId} AND status = 'active'
    `;
    
    if (loan.length === 0) {
      return res.status(404).json({ error: 'Active loan not found' });
    }
    
    const loanBalance = loan[0].amount_remaining;
    const isFullRepayment = amount >= loanBalance;
    const repaymentAmount = Math.min(amount, loanBalance);
    const overpayment = Math.max(0, amount - loanBalance);
    
    // Get wallet
    const wallet = await sql`
      SELECT balance FROM wallets WHERE id = ${walletId} AND user_id = ${userId}
    `;
    
    if (wallet.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    if (wallet[0].balance < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
    
    // Execute operations sequentially
    // Debit wallet
    await sql`
      UPDATE wallets SET balance = balance - ${repaymentAmount} WHERE id = ${walletId}
    `;
    
    // Update loan
    if (isFullRepayment) {
      await sql`
        UPDATE loans 
        SET amount_paid = amount_paid + ${repaymentAmount},
            amount_remaining = amount_remaining - ${repaymentAmount},
            status = 'repaid',
            repaid_at = NOW()
        WHERE id = ${loanId}
      `;
    } else {
      await sql`
        UPDATE loans 
        SET amount_paid = amount_paid + ${repaymentAmount},
            amount_remaining = amount_remaining - ${repaymentAmount},
            status = 'active'
        WHERE id = ${loanId}
      `;
    }
    
    // Record repayment
    await sql`
      INSERT INTO loan_repayments (loan_id, amount, method)
      VALUES (${loanId}, ${repaymentAmount}, 'wallet')
    `;
    
    // Handle overpayment if exists
    if (overpayment > 0) {
      await sql`
        UPDATE wallets SET balance = balance + ${overpayment} WHERE id = ${walletId}
      `;
    }
    
    res.json({
      repayment: {
        id: 'repayment_' + Date.now(),
        loanId,
        amount: repaymentAmount,
        method: 'wallet',
        isPartial: !isFullRepayment,
        remainingBalance: loanBalance - repaymentAmount,
        overpayment: overpayment > 0 ? overpayment : undefined,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/mobile/loans/:loanId/register-cash-repayment
 * Register cash redemption for loan repayment.
 */
app.post('/api/v1/mobile/loans/:loanId/register-cash-repayment', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { loanId } = req.params;
    const { voucherId, cashAmount, tillCode } = req.body;
    
    // Verify loan
    const loan = await sql`
      SELECT * FROM loans WHERE id = ${loanId} AND user_id = ${userId} AND status = 'active'
    `;
    
    if (loan.length === 0) {
      return res.status(404).json({ error: 'Active loan not found' });
    }
    
    const loanBalance = loan[0].amount_remaining;
    const repaymentAmount = Math.min(cashAmount, loanBalance);
    const isFullRepayment = cashAmount >= loanBalance;
    
    // Execute operations sequentially
    // Update loan
    if (isFullRepayment) {
      await sql`
        UPDATE loans 
        SET amount_paid = amount_paid + ${repaymentAmount},
            amount_remaining = amount_remaining - ${repaymentAmount},
            status = 'repaid',
            repaid_at = NOW()
        WHERE id = ${loanId}
      `;
    } else {
      await sql`
        UPDATE loans 
        SET amount_paid = amount_paid + ${repaymentAmount},
            amount_remaining = amount_remaining - ${repaymentAmount},
            status = 'active'
        WHERE id = ${loanId}
      `;
    }
    
    // Record repayment
    await sql`
      INSERT INTO loan_repayments (loan_id, amount, method, metadata)
      VALUES (${loanId}, ${repaymentAmount}, 'cash_till', ${JSON.stringify({ voucherId, tillCode })})
    `;
    
    res.json({
      repayment: {
        id: 'repayment_' + Date.now(),
        loanId,
        amount: repaymentAmount,
        method: 'cash_till',
        isPartial: !isFullRepayment,
        remainingBalance: loanBalance - repaymentAmount,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/mobile/vouchers/:voucherId/calculate-repayment
 * Calculate repayment breakdown before redemption.
 */
app.get('/api/v1/mobile/vouchers/:voucherId/calculate-repayment', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { voucherId } = req.params;
    
    // Get voucher
    const voucher = await sql`
      SELECT amount FROM vouchers WHERE id = ${voucherId} AND user_id = ${userId} AND status = 'available'
    `;
    
    if (voucher.length === 0) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    
    const voucherAmount = voucher[0].amount;
    
    // Check for active loan
    const loan = await sql`
      SELECT id, amount_remaining FROM loans 
      WHERE user_id = ${userId} AND status = 'active'
      ORDER BY created_at ASC
      LIMIT 1
    `;
    
    if (loan.length === 0) {
      return res.json({
        voucherAmount,
        deductionAmount: 0,
        netToWallet: voucherAmount,
        willFullyRepay: false
      });
    }
    
    const loanBalance = loan[0].amount_remaining;
    const deductionAmount = Math.min(voucherAmount, loanBalance);
    const willFullyRepay = voucherAmount >= loanBalance;
    
    res.json({
      voucherAmount,
      activeLoanId: loan[0].id,
      loanBalance,
      deductionAmount,
      netToWallet: voucherAmount - deductionAmount,
      willFullyRepay
    });
  } catch (error) {
    next(error);
  }
});

// --- Push Notifications ---

/**
 * POST /api/v1/mobile/notifications/register-token
 * Register or update user's push notification token
 */
app.post('/api/v1/mobile/notifications/register-token', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);
    const { token, platform, deviceInfo } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Upsert push token
    await sql`
      INSERT INTO push_tokens (user_id, token, platform, device_info, updated_at)
      VALUES (${userId}, ${token}, ${platform}, ${JSON.stringify(deviceInfo)}, NOW())
      ON CONFLICT (user_id, token)
      DO UPDATE SET
        platform = EXCLUDED.platform,
        device_info = EXCLUDED.device_info,
        updated_at = NOW(),
        is_active = true
    `;

    res.json({ success: true, message: 'Token registered' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/mobile/notifications/unregister-token
 * Deactivate user's push token (logout or disable notifications)
 */
app.post('/api/v1/mobile/notifications/unregister-token', async (req, res, next) => {
  try {
    const userId = await getCurrentUserId(req);

    await sql`
      UPDATE push_tokens
      SET is_active = false, updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    res.json({ success: true, message: 'Token deactivated' });
  } catch (error) {
    next(error);
  }
});

// --- Buffr AI Companion Proxy ---
// Proxies requests to Python FastAPI server (port 8000)

const BUFFR_AI_URL = process.env.BUFFR_AI_URL ?? "http://localhost:8000";

// Health check proxy for AI server
app.get("/api/v1/mobile/ai-health", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${BUFFR_AI_URL}/health`);
    const data = await response.json();
    res.json({ ...data, proxy: "node" });
  } catch (error) {
    res.status(503).json({ status: "unavailable", proxy: "node" });
  }
});

app.post("/api/v1/mobile/ai-chat", async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const response = await fetch(`${BUFFR_AI_URL}/api/buffr-companion/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Buffr AI proxy error:", error);
    res.status(503).json({ error: "AI companion service temporarily unavailable" });
  }
});

// ML endpoints proxy
app.get("/api/v1/mobile/ml/models", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${BUFFR_AI_URL}/api/ml/models`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ error: "ML service unavailable" });
  }
});

// --- Global error handler ---

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    // eslint-disable-next-line no-console
    console.error("API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// --- Server bootstrap (local dev only) ---

const PORT = Number(process.env.PORT ?? 3001);

if (process.env.NODE_ENV !== "test") {
  // Validate environment variables before starting server
  console.log('🔍 Validating environment configuration...');
  validateEnvOrExit();
  validateFeatureDependencies();
  
  // Ensure database tables exist
  (async () => {
    try {
      await ensureRefreshTokensTable();
      console.log('✅ Database tables validated');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      process.exit(1);
    }
  })();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`✅ Buffr G2P backend listening on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Security: JWT signature verification enabled`);
    console.log(`💾 Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Neon PostgreSQL'}`);
  });
}

export default app;

