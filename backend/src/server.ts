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
import { processCashOut, generateAtmCode } from "./services/cashoutService.js";
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

  const rows = await sql`
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
  `;
  if (rows.length === 0) {
    throw new Error("No users found in database");
  }
  return (rows[0] as { id: string }).id;
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

  const result = await verifyOtp({ phone: String(phone), code: String(code), purpose: "login" });
  
  if (result.success) {
    // Generate Buffr ID (same logic as before)
    const digits = String(phone).replace(/\D/g, "").slice(-8) || "00000000";
    const suffix = String(Math.abs(digits.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0))).slice(-8).padStart(8, "0");
    const buffrId = `BFR${digits}${suffix}`.slice(0, 16);
    const last4 = (digits + suffix).slice(-4);
    const cardNumberMasked = `XXXX XXXX XXXX ${last4}`;
    
    res.json({
      success: true,
      buffrId,
      cardNumberMasked,
      token: "dev-session-token",
      expiryDate: null,
    });
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
        // p2p_transactions table may not exist
      }

      res.status(201).json({ transactionId });
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

// --- Location (stub) – PRD §9.4 ---
function parseLatLng(req: Request): { lat: number; lng: number; radius: number } | null {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = req.query.radius != null ? Number(req.query.radius) : 5000;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng, radius: Number.isFinite(radius) && radius > 0 ? radius : 5000 };
}

app.get("/api/v1/mobile/agents/nearby", (req: Request, res: Response) => {
  if (!parseLatLng(req)) return jsonError(res, 400, "Valid lat and lng query params required");
  res.json({ agents: [] });
});

app.get("/api/v1/mobile/nampost/nearby", (req: Request, res: Response) => {
  if (!parseLatLng(req)) return jsonError(res, 400, "Valid lat and lng query params required");
  res.json({ branches: [] });
});

app.get("/api/v1/mobile/smartpay/nearby", (req: Request, res: Response) => {
  if (!parseLatLng(req)) return jsonError(res, 400, "Valid lat and lng query params required");
  res.json({ units: [] });
});

app.get("/api/v1/mobile/atms/nearby", (req: Request, res: Response) => {
  if (!parseLatLng(req)) return jsonError(res, 400, "Valid lat and lng query params required");
  res.json({ atms: [] });
});

// --- Compliance (stub) – PRD §9.4 ---
app.post("/api/v1/compliance/incident-report", (req: Request, res: Response) => {
  const payload = req.body ?? {};
  // Stub: could INSERT into compliance_incident_reports
  res.status(202).json({ accepted: true });
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

app.post("/api/v1/compliance/monthly-stats", (req: Request, res: Response) => {
  res.status(202).json({ accepted: true });
});

// --- USSD – PRD §9.4 ---
const ussdSessions: Map<string, { step: string }> = new Map();

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
    let step = ussdSessions.get(sessionKey)?.step ?? "main";

    if (input === "") {
      step = "main";
    } else if (step === "main") {
      if (input === "1") step = "balance";
      else if (input === "2") step = "voucher";
      else if (input === "3") step = "cashout";
      else step = "main";
    }

    let response: string;
    let endSession = false;

    if (step === "main") {
      ussdSessions.set(sessionKey, { step: "main" });
      response = "Welcome to Buffr\n1. Balance\n2. Voucher\n3. Cash-out code\n";
    } else if (step === "balance") {
      ussdSessions.delete(sessionKey);
      endSession = true;
      try {
        const userRows = await sql`SELECT id FROM users WHERE phone = ${phoneNumber ?? ""} LIMIT 1`;
        if (userRows.length === 0) {
          response = "User not found.";
        } else {
          const uid = (userRows[0] as { id: string }).id;
          const walletRows = await sql`
            SELECT balance, currency FROM wallets WHERE user_id = ${uid} ORDER BY updated_at ASC LIMIT 1
          `;
          const bal = walletRows.length ? Number((walletRows[0] as { balance: number }).balance) : 0;
          response = `Balance: ${bal} NAD`;
        }
      } catch {
        response = "Service unavailable.";
      }
    } else if (step === "voucher") {
      ussdSessions.set(sessionKey, { step: "voucher" });
      response = "Enter voucher code:";
    } else if (step === "cashout") {
      ussdSessions.delete(sessionKey);
      endSession = true;
      response = "Generate cash-out code in the Buffr app.";
    } else {
      response = "Invalid option.";
      endSession = true;
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
      if (rawMethod === "bank") {
        return res.status(501).json({ success: false, error: "Bank transfer cash-out not yet implemented" });
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

// Create OAuth consent request
app.post('/api/v1/mobile/open-banking/consent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bankId, scopes, redirectUri, state } = req.body;
    
    if (!bankId) {
      return res.status(400).json({
        errors: [{ code: 'INVALID_REQUEST', title: 'bankId is required' }],
      });
    }
    
    const consent = await createConsent({
      bankId,
      scopes: scopes || [],
      redirectUri: redirectUri || '',
      state: state || '',
    });
    
    res.json(consent);
  } catch (error: any) {
    res.status(400).json({
      errors: [{ code: 'CONSENT_ERROR', title: error.message }],
    });
  }
});

// Exchange OAuth code for bank tokens
app.post('/api/v1/mobile/open-banking/token-exchange', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bankId, code, redirectUri, codeVerifier } = req.body;
    
    if (!bankId || !code) {
      return res.status(400).json({
        errors: [{ code: 'INVALID_REQUEST', title: 'bankId and code are required' }],
      });
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens({
      bankId,
      code,
      redirectUri: redirectUri || '',
      codeVerifier,
    });
    
    // In production, store tokens in database for the user
    // For now, return success
    res.json({ linked: true });
  } catch (error: any) {
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
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Buffr G2P backend listening on http://localhost:${PORT}`);
  });
}

export default app;

