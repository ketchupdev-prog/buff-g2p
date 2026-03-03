/**
 * Buffr G2P Backend – Cash-out Service
 * 
 * Orchestrates cash-out flows with Fineract integration.
 * Per PRD §2.6: Fineract failures are logged but do not fail the user response.
 * 
 * Location: backend/src/services/cashoutService.ts
 */

import { sql } from "../lib/db.js";
import { withdraw } from "../integrations/fineract/savings.js";
import { isFineractEnabled } from "../lib/fineract.js";
import { postVoucherCashedOut } from "./voucherAccounting.js";
import { wouldExceedCashOutLimit } from "../lib/dailyLimits.js";

export interface CashOutParams {
  userId: string;
  walletId: string;
  amount: number;
  method: "atm" | "till" | "agent" | "merchant";
  idempotencyKey?: string;
}

export interface CashOutResult {
  success: boolean;
  transactionId?: string;
  balance?: number;
  error?: string;
}

/**
 * Process a cash-out transaction with optional Fineract sync.
 * 
 * @param params - Cash-out parameters
 * @returns CashOutResult with success status and updated balance
 */
export async function processCashOut(params: CashOutParams): Promise<CashOutResult> {
  const { userId, walletId, amount, method, idempotencyKey } = params;

  // 1. Validate amount
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "amount must be a positive number" };
  }

  // 2. Get wallet and verify ownership + balance (row lock for update – V5)
  const walletRows = await sql`
    SELECT id, balance, fineract_savings_account_id, currency
    FROM wallets
    WHERE id = ${walletId} AND user_id = ${userId}
    FOR UPDATE
    LIMIT 1
  `;

  if (walletRows.length === 0) {
    return { success: false, error: "Wallet not found" };
  }

  const wallet = walletRows[0] as {
    id: string;
    balance: number;
    fineract_savings_account_id: string | null;
    currency: string;
  };
  const currentBalance = Number(wallet.balance ?? 0);

  if (currentBalance < amount) {
    return { success: false, error: "Insufficient funds" };
  }

  // V5: daily cash-out limit
  if (await wouldExceedCashOutLimit(userId, amount)) {
    return { success: false, error: "Daily cash-out limit exceeded" };
  }

  const newBalance = currentBalance - amount;

  // 3. Debit wallet in Neon (Buffr database)
  await sql`
    UPDATE wallets
    SET balance = ${newBalance}, updated_at = now()
    WHERE id = ${walletId}
  `;

  await sql`
    INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
    VALUES (${walletId}, ${"cash_out"}, ${amount}, ${`Cash-out via ${method}`})
  `;

  // 4. Fineract withdrawal (optional - per PRD §2.6, failures don't fail user response)
  if (isFineractEnabled() && wallet.fineract_savings_account_id != null) {
    const fineractAccountId = Number(wallet.fineract_savings_account_id);
    if (!isNaN(fineractAccountId)) {
      try {
        const withdrawResult = await withdraw({
          savingsAccountId: fineractAccountId,
          amount,
          transactionDate: new Date().toISOString().slice(0, 10),
        });
        if (!withdrawResult.success) {
          // Log but don't fail - user already sees success in Neon
          console.error("Fineract withdrawal failed:", withdrawResult.error);
        }
      } catch (err) {
        console.error("Fineract withdrawal failed:", err);
      }
    }
  }

  // 5. Voucher accounting for cash-out (optional journal entries)
  if (isFineractEnabled()) {
    try {
      const jeResult = await postVoucherCashedOut({
        voucherId: walletId, // Using walletId as reference
        amount,
        currency: wallet.currency ?? "NAD",
      });
      if (!jeResult.success) {
        console.error("Voucher accounting (cash-out) failed:", jeResult.error);
      }
    } catch (err) {
      console.error("Voucher accounting (cash-out) failed:", err);
    }
  }

  return {
    success: true,
    balance: newBalance,
    transactionId: idempotencyKey,
  };
}

/**
 * Generate an ATM cash-out code for cardless withdrawal.
 * 
 * @param userId - The user's ID
 * @param walletId - The wallet to debit
 * @param amount - Amount to withdraw
 * @returns Object with code and expiry time
 */
export async function generateAtmCode(
  userId: string,
  walletId: string,
  amount: number
): Promise<{ code: string; expiresAt: Date; balance: number }> {
  // Validate amount
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive number");
  }

  // Get wallet (row lock – V5)
  const walletRows = await sql`
    SELECT id, balance, fineract_savings_account_id, currency
    FROM wallets
    WHERE id = ${walletId} AND user_id = ${userId}
    FOR UPDATE
    LIMIT 1
  `;

  if (walletRows.length === 0) {
    throw new Error("Wallet not found");
  }

  const wallet = walletRows[0] as {
    id: string;
    balance: number;
    fineract_savings_account_id: string | null;
    currency: string;
  };
  const currentBalance = Number(wallet.balance ?? 0);

  if (currentBalance < amount) {
    throw new Error("Insufficient funds");
  }

  // V5: daily cash-out limit
  if (await wouldExceedCashOutLimit(userId, amount)) {
    throw new Error("Daily cash-out limit exceeded");
  }

  // Generate 6-digit ATM code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Store the ATM code (table may not exist in all environments)
  try {
    await sql`
      INSERT INTO atm_codes (user_id, wallet_id, code, amount, expires_at, created_at)
      VALUES (${userId}, ${walletId}, ${code}, ${amount}, ${expiresAt}, now())
    `;
  } catch (_) {
    // atm_codes table may not exist - continue without storing
  }

  // Deduct from wallet
  const newBalance = currentBalance - amount;
  await sql`
    UPDATE wallets
    SET balance = ${newBalance}, updated_at = now()
    WHERE id = ${walletId}
  `;
  await sql`
    INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
    VALUES (${walletId}, ${"cash_out"}, ${amount}, ${"ATM withdrawal code: " + code})
  `;

  // Fineract withdrawal (per PRD §2.6 - log failures, don't fail user)
  if (isFineractEnabled() && wallet.fineract_savings_account_id != null) {
    const fineractAccountId = Number(wallet.fineract_savings_account_id);
    if (!isNaN(fineractAccountId)) {
      try {
        const withdrawResult = await withdraw({
          savingsAccountId: fineractAccountId,
          amount,
          transactionDate: new Date().toISOString().slice(0, 10),
        });
        if (!withdrawResult.success) {
          console.error("Fineract withdrawal on ATM cash-out failed:", withdrawResult.error);
        }
      } catch (err) {
        console.error("Fineract withdrawal on ATM cash-out failed:", err);
      }
    }
  }

  // Voucher accounting
  if (isFineractEnabled()) {
    try {
      const jeResult = await postVoucherCashedOut({
        voucherId: walletId,
        amount,
        currency: wallet.currency ?? "NAD",
      });
      if (!jeResult.success) {
        console.error("Voucher accounting (cash-out) failed:", jeResult.error);
      }
    } catch (err) {
      console.error("Voucher accounting (cash-out) failed:", err);
    }
  }

  return { code, expiresAt, balance: newBalance };
}
