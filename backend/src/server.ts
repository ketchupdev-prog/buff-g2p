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

const app = express();

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(morgan("dev"));

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

// --- Auth stubs (dev/demo) – return JSON so the app does not get HTML 404 ---

app.post("/api/v1/mobile/auth/request-otp", (req: Request, res: Response) => {
  const phone = req.body?.phone;
  if (!phone || String(phone).replace(/\D/g, "").length < 7) {
    res.status(400).json({ success: false, error: "Invalid phone number" });
    return;
  }
  res.json({ success: true });
});

app.post("/api/v1/mobile/auth/verify-otp", (req: Request, res: Response) => {
  const phone = req.body?.phone;
  const code = req.body?.code;
  if (!phone || !code) {
    res.status(400).json({ success: false, error: "Missing phone or code" });
    return;
  }
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

// --- Wallet routes ---

app.get(
  "/api/v1/mobile/wallets",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const rows = await sql`
        SELECT id, name, type, balance, currency, created_at
        FROM wallets
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;

      const wallets: Wallet[] = rows.map((row: any, index: number) => ({
        id: row.id,
        name: row.name,
        type: (row.type as WalletType) ?? "main",
        balance: Number(row.balance ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        isPrimary: index === 0 || row.type === "main",
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      }));

      res.json({ wallets });
    } catch (error) {
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
        SELECT id, name, type, balance, currency, created_at
        FROM wallets
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (rows.length === 0) {
        return jsonError(res, 404, "Wallet not found");
      }
      const row: any = rows[0];
      const wallet: Wallet = {
        id: row.id,
        name: row.name,
        type: (row.type as WalletType) ?? "main",
        balance: Number(row.balance ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        isPrimary: row.type === "main",
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
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

      if (!name || typeof name !== "string") {
        return jsonError(res, 400, "name is required");
      }

      const walletType: WalletType = type ?? "savings";

      const rows = await sql`
        INSERT INTO wallets (user_id, name, type)
        VALUES (${userId}, ${name}, ${walletType})
        RETURNING id, name, type, balance, currency, created_at
      `;
      const row: any = rows[0];
      const wallet: Wallet = {
        id: row.id,
        name: row.name,
        type: (row.type as WalletType) ?? "savings",
        balance: Number(row.balance ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        isPrimary: row.type === "main",
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      };
      res.status(201).json({ wallet });
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
      const { name }: { name?: string } = req.body ?? {};

      const existing = await sql`
        SELECT id, name, type, balance, currency, created_at
        FROM wallets
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (existing.length === 0) {
        return jsonError(res, 404, "Wallet not found");
      }

      const nextName = name ?? (existing[0] as any).name;

      const rows = await sql`
        UPDATE wallets
        SET name = ${nextName}, updated_at = now()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id, name, type, balance, currency, created_at
      `;
      const row: any = rows[0];
      const wallet: Wallet = {
        id: row.id,
        name: row.name,
        type: (row.type as WalletType) ?? "main",
        balance: Number(row.balance ?? 0),
        currency: (row.currency as "NAD") ?? "NAD",
        isPrimary: row.type === "main",
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
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
        SELECT id, type
        FROM wallets
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (existingRows.length === 0) {
        return jsonError(res, 404, "Wallet not found");
      }
      const existing: any = existingRows[0];
      if (existing.type === "main") {
        return jsonError(res, 400, "Cannot delete primary wallet");
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

      await sql.transaction((tx) => [
        tx`
          UPDATE wallets
          SET balance = ${Number(wallet.balance ?? 0) + amount}, updated_at = now()
          WHERE id = ${walletId}
        `,
        tx`
          INSERT INTO wallet_transactions (
            wallet_id, type, amount, balance_after, reference_type, description
          )
          VALUES (
            ${walletId},
            ${"add_money"},
            ${amount},
            ${Number(wallet.balance ?? 0) + amount},
            ${method ?? "add_money"},
            ${"Money added via mobile app"}
          )
        `,
      ]);

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
          wt.description,
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
        description: row.description ?? "",
        status: "success",
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
        date: row.created_at?.toISOString?.() ?? row.created_at,
        walletId: row.wallet_id,
      }));

      res.json({ transactions: txs });
    } catch (error) {
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
          wt.description,
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
        description: row.description ?? "",
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

// --- Contacts ---

app.get(
  "/api/v1/mobile/contacts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = await getCurrentUserId(req);
      const rows = await sql`
        SELECT id, phone, first_name, last_name
        FROM users
        WHERE id != ${userId}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const contacts: Contact[] = rows.map((row: any) => ({
        id: row.id,
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") ||
          row.phone,
        phone: row.phone,
        buffrId: row.id,
      }));

      res.json({ contacts });
    } catch (error) {
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
        SELECT id, phone, first_name, last_name
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
        name: [row.first_name, row.last_name].filter(Boolean).join(" ") ||
          row.phone,
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
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (recipientWalletRows.length === 0) {
        return jsonError(res, 400, "Recipient has no wallet");
      }
      const recipientWallet: any = recipientWalletRows[0];

      let transactionId: string | undefined;

      const txResults = await sql.transaction((tx) => [
        tx`
          UPDATE wallets
          SET balance = ${currentBalance - amount}, updated_at = now()
          WHERE id = ${sourceWallet.id}
        `,
        tx`
          INSERT INTO wallet_transactions (
            wallet_id, type, amount, balance_after, description
          )
          VALUES (
            ${sourceWallet.id},
            ${"send"},
            ${amount},
            ${currentBalance - amount},
            ${note ?? "Money sent"}
          )
        `,
        tx`
          UPDATE wallets
          SET balance = ${Number(recipientWallet.balance ?? 0) + amount}, updated_at = now()
          WHERE id = ${recipientWallet.id}
        `,
        tx`
          INSERT INTO wallet_transactions (
            wallet_id, type, amount, balance_after, description
          )
          VALUES (
            ${recipientWallet.id},
            ${"receive"},
            ${amount},
            ${Number(recipientWallet.balance ?? 0) + amount},
            ${note ?? "Money received"}
          )
        `,
        tx`
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
        `,
      ]);

      const p2pResult = Array.isArray(txResults)
        ? txResults[txResults.length - 1] as any[]
        : [];
      if (p2pResult[0]?.id) {
        transactionId = p2pResult[0].id as string;
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
      const { method }: { method?: string } = req.body ?? {};

      if (method !== "wallet" && method !== "nampost" && method !== "smartpay") {
        return jsonError(res, 400, "method must be wallet, nampost, or smartpay");
      }

      const voucherRows = await sql`
        SELECT id, user_id, amount, currency, status, expires_at
        FROM vouchers
        WHERE id = ${voucherId} AND user_id = ${userId}
        LIMIT 1
      `;
      if (voucherRows.length === 0) {
        return jsonError(res, 404, "Voucher not found");
      }
      const voucher: any = voucherRows[0];
      if (voucher.status === "redeemed") {
        return jsonError(res, 400, "Voucher already redeemed");
      }
      const expiresAt = voucher.expires_at ? new Date(voucher.expires_at) : null;
      if (expiresAt && expiresAt < new Date()) {
        return jsonError(res, 400, "Voucher expired");
      }

      const amount = Number(voucher.amount ?? 0);

      if (method === "wallet") {
        const walletRows = await sql`
          SELECT id, balance
          FROM wallets
          WHERE user_id = ${userId}
          ORDER BY created_at ASC
          LIMIT 1
        `;
        if (walletRows.length === 0) {
          return jsonError(res, 400, "No wallet found");
        }
        const wallet: any = walletRows[0];
        const newBalance = Number(wallet.balance ?? 0) + amount;

        await sql.transaction((tx) => [
          tx`UPDATE vouchers SET status = 'redeemed' WHERE id = ${voucherId}`,
          tx`
            INSERT INTO voucher_redemptions (voucher_id, user_id, method, amount_credited)
            VALUES (${voucherId}, ${userId}, ${"wallet"}, ${amount})
          `,
          tx`
            UPDATE wallets
            SET balance = ${newBalance}, updated_at = now()
            WHERE id = ${wallet.id}
          `,
          tx`
            INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description)
            VALUES (${wallet.id}, ${"voucher_redeem"}, ${amount}, ${newBalance}, ${"Voucher redeemed to wallet"})
          `,
        ]);

        return res.status(200).json({ success: true, walletBalance: newBalance });
      }

      await sql.transaction((tx) => [
        tx`UPDATE vouchers SET status = 'redeemed' WHERE id = ${voucherId}`,
        tx`
          INSERT INTO voucher_redemptions (voucher_id, user_id, method, amount_credited)
          VALUES (${voucherId}, ${userId}, ${method}, ${amount})
        `,
      ]);
      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

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

