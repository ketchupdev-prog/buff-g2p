/**
 * Buffr G2P Backend – Voucher Service
 * 
 * Orchestrates voucher operations with Fineract integration.
 * Per PRD §2.6: Fineract failures are logged but do not fail the user response.
 * 
 * Location: backend/src/services/voucherService.ts
 */

import { sql } from "../lib/db.js";
import { deposit } from "../integrations/fineract/savings.js";
import { isFineractEnabled } from "../lib/fineract.js";
import { postVoucherRedeemed, postVoucherIssued } from "./voucherAccounting.js";

export interface RedeemVoucherParams {
  userId: string;
  voucherId: string;
  method: "wallet" | "nampost" | "smartpay";
  idempotencyKey?: string;
}

export interface RedeemVoucherResult {
  success: boolean;
  walletBalance?: number;
  error?: string;
}

/**
 * Redeem a voucher to a Buffr wallet with optional Fineract sync.
 * 
 * @param params - Redemption parameters
 * @returns RedeemVoucherResult with success status and updated balance
 */
export async function redeemVoucherToWallet(
  params: RedeemVoucherParams
): Promise<RedeemVoucherResult> {
  const { userId, voucherId, method, idempotencyKey } = params;

  // Validate method
  if (method !== "wallet" && method !== "nampost" && method !== "smartpay") {
    return { success: false, error: "method must be wallet, nampost, or smartpay" };
  }

  // Get voucher
  const voucherRows = await sql`
    SELECT id, user_id, amount, currency, status, expires_at
    FROM vouchers
    WHERE id = ${voucherId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (voucherRows.length === 0) {
    return { success: false, error: "Voucher not found" };
  }

  const voucher = voucherRows[0] as {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: string;
    expires_at: Date | null;
  };

  if (voucher.status === "redeemed") {
    return { success: false, error: "Voucher already redeemed" };
  }

  const expiresAt = voucher.expires_at ? new Date(voucher.expires_at) : null;
  if (expiresAt && expiresAt < new Date()) {
    return { success: false, error: "Voucher expired" };
  }

  const amount = Number(voucher.amount ?? 0);

  // Handle wallet redemption
  if (method === "wallet") {
    const walletRows = await sql`
      SELECT id, balance, fineract_savings_account_id, currency
      FROM wallets
      WHERE user_id = ${userId}
      ORDER BY updated_at ASC
      FOR UPDATE
      LIMIT 1
    `;

    if (walletRows.length === 0) {
      return { success: false, error: "No wallet found" };
    }

    const wallet = walletRows[0] as {
      id: string;
      balance: number;
      fineract_savings_account_id: string | null;
      currency: string;
    };
    const newBalance = Number(wallet.balance ?? 0) + amount;

    // Update voucher status
    await sql`UPDATE vouchers SET status = 'redeemed' WHERE id = ${voucherId}`;
    
    // Record redemption
    await sql`
      INSERT INTO voucher_redemptions (voucher_id, user_id, method, amount_credited)
      VALUES (${voucherId}, ${userId}, ${"wallet"}, ${amount})
    `;

    // Credit wallet
    await sql`
      UPDATE wallets
      SET balance = ${newBalance}, updated_at = now()
      WHERE id = ${wallet.id}
    `;

    // Record transaction
    await sql`
      INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
      VALUES (${wallet.id}, ${"voucher_redeem"}, ${amount}, ${"Voucher redeemed to wallet"})
    `;

    // Fineract deposit (per PRD §2.6 - log failures, don't fail user)
    if (isFineractEnabled() && wallet.fineract_savings_account_id != null) {
      const fineractAccountId = Number(wallet.fineract_savings_account_id);
      if (!isNaN(fineractAccountId)) {
        try {
          const depositResult = await deposit({
            savingsAccountId: fineractAccountId,
            amount,
            transactionDate: new Date().toISOString().slice(0, 10),
          });
          if (!depositResult.success) {
            console.error("Fineract deposit on voucher redeem failed:", depositResult.error);
          }
        } catch (err) {
          console.error("Fineract deposit on voucher redeem failed:", err);
        }
      }
    }

    // Voucher accounting (journal entries)
    if (isFineractEnabled()) {
      try {
        const jeResult = await postVoucherRedeemed({
          voucherId,
          walletId: wallet.id,
          amount,
          currency: voucher.currency ?? "NAD",
        });
        if (!jeResult.success) {
          console.error("Voucher accounting (redeem) failed:", jeResult.error);
        }
      } catch (err) {
        console.error("Voucher accounting (redeem) failed:", err);
      }
    }

    return { success: true, walletBalance: newBalance };
  }

  // Handle non-wallet redemption (NamPost, SmartPay)
  await sql`UPDATE vouchers SET status = 'redeemed' WHERE id = ${voucherId}`;
  await sql`
    INSERT INTO voucher_redemptions (voucher_id, user_id, method, amount_credited)
    VALUES (${voucherId}, ${userId}, ${method}, ${amount})
  `;

  // Voucher accounting for non-wallet redemptions
  if (isFineractEnabled()) {
    try {
      const jeResult = await postVoucherRedeemed({
        voucherId,
        walletId: "", // No wallet for non-wallet redemption
        amount,
        currency: voucher.currency ?? "NAD",
      });
      if (!jeResult.success) {
        console.error("Voucher accounting (redeem) failed:", jeResult.error);
      }
    } catch (err) {
      console.error("Voucher accounting (redeem) failed:", err);
    }
  }

  return { success: true };
}

/**
 * Record a voucher issued event with optional Fineract journal entry.
 * 
 * @param voucherId - The voucher ID
 * @param amount - Voucher amount
 * @param currency - Currency code
 * @returns Promise<void>
 */
export async function recordVoucherIssued(
  voucherId: string,
  amount: number,
  currency: string = "NAD"
): Promise<void> {
  if (isFineractEnabled()) {
    try {
      const jeResult = await postVoucherIssued({
        voucherId,
        amount,
        currency,
      });
      if (!jeResult.success) {
        console.error("Voucher accounting (issued) failed:", jeResult.error);
      }
    } catch (err) {
      console.error("Voucher accounting (issued) failed:", err);
    }
  }
}
