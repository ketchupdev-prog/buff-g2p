/**
 * Buffr G2P Backend – Voucher Accounting Service.
 *
 * Tracks voucher lifecycle in Fineract via journal entries:
 * - Voucher issued: Dr Liability, Cr Revenue (or Suspense)
 * - Redeemed to wallet: Dr Liability, Cr Savings (wallet deposit)
 * - Cashed out: Dr Liability, Cr Cash (ATM withdrawal)
 *
 * Location: backend/src/services/voucherAccounting.ts
 */

import { isFineractEnabled } from "../lib/fineract.js";
import { postJournalEntry } from "../integrations/fineract/accounting.js";

/**
 * GL Account IDs - these should be configured in Fineract:
 * - VOUCHER_LIABILITY_ACCOUNT: voucher liability (we owe beneficiaries)
 * - VOUCHER_REVENUE_ACCOUNT: funding source when voucher is issued (or suspense)
 * - EMONEY_LIABILITY_ACCOUNT: e-money / wallet liability (credit when redeem to wallet)
 * - VOUCHER_CASH_ACCOUNT: cash/ATM (credit when cashed out)
 *
 * Set via environment variables; defaults are placeholders.
 */
const VOUCHER_LIABILITY_ACCOUNT_ID = parseInt(process.env.FINERACT_VOUCHER_LIABILITY_ACCOUNT_ID ?? "1", 10);
const VOUCHER_REVENUE_ACCOUNT_ID = parseInt(process.env.FINERACT_VOUCHER_REVENUE_ACCOUNT_ID ?? "2", 10);
const EMONEY_LIABILITY_ACCOUNT_ID = parseInt(process.env.FINERACT_EMONEY_LIABILITY_ACCOUNT_ID ?? "3", 10);
const VOUCHER_CASH_ACCOUNT_ID = parseInt(process.env.FINERACT_VOUCHER_CASH_ACCOUNT_ID ?? "4", 10);

/**
 * Post journal entry for voucher issuance.
 * Dr Voucher Liability, Cr Voucher Revenue
 */
export async function postVoucherIssued(params: {
  voucherId: string;
  amount: number;
  currency?: string;
  officeId?: number;
}): Promise<{ success: boolean; journalEntryId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const { voucherId, amount, currency = "NAD", officeId = 1 } = params;

  try {
    const result = await postJournalEntry({
      officeId,
      transactionDate: new Date().toISOString().slice(0, 10),
      comments: `Voucher issued: ${voucherId}, Amount: ${currency} ${amount}`,
      debits: [
        {
          glAccountId: VOUCHER_LIABILITY_ACCOUNT_ID,
          amount,
        },
      ],
      credits: [
        {
          glAccountId: VOUCHER_REVENUE_ACCOUNT_ID,
          amount,
        },
      ],
      currencyCode: currency,
    });

    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to post voucher issued journal entry:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Post journal entry for voucher redemption to wallet.
 * Dr Voucher Liability (reduce), Cr E-money liability (wallet balance).
 * The actual savings deposit is still done in server.ts via deposit(); this is the GL view.
 */
export async function postVoucherRedeemed(params: {
  voucherId: string;
  walletId: string;
  amount: number;
  currency?: string;
  officeId?: number;
}): Promise<{ success: boolean; journalEntryId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const { voucherId, walletId, amount, currency = "NAD", officeId = 1 } = params;

  try {
    const result = await postJournalEntry({
      officeId,
      transactionDate: new Date().toISOString().slice(0, 10),
      currencyCode: currency,
      comments: `Voucher redeemed: ${voucherId} to wallet ${walletId}, Amount: ${currency} ${amount}`,
      debits: [{ glAccountId: VOUCHER_LIABILITY_ACCOUNT_ID, amount }],
      credits: [{ glAccountId: EMONEY_LIABILITY_ACCOUNT_ID, amount }],
    });

    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to post voucher redeemed journal entry:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Post journal entry for voucher cash-out (ATM/agent/till withdrawal).
 * Dr E-money liability (wallet), Cr Cash (pay-out).
 * The actual withdrawal is still done in server.ts via withdraw(); this is the GL view.
 */
export async function postVoucherCashedOut(params: {
  voucherId: string;
  amount: number;
  currency?: string;
  officeId?: number;
}): Promise<{ success: boolean; journalEntryId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const { voucherId, amount, currency = "NAD", officeId = 1 } = params;

  try {
    const result = await postJournalEntry({
      officeId,
      transactionDate: new Date().toISOString().slice(0, 10),
      currencyCode: currency,
      comments: `Voucher cashed out: ${voucherId}, Amount: ${currency} ${amount}`,
      debits: [{ glAccountId: EMONEY_LIABILITY_ACCOUNT_ID, amount }],
      credits: [{ glAccountId: VOUCHER_CASH_ACCOUNT_ID, amount }],
    });

    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to post voucher cashed out journal entry:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Calculate vouchers due (unredeemed + uncashed).
 * This is a helper to get the total liability outstanding.
 * 
 * In Fineract, this would be queried from the journal entries or a custom report.
 * For now, this is a placeholder that can be extended.
 */
export async function getVouchersDueSummary(): Promise<{
  success: boolean;
  totalIssued?: number;
  totalRedeemed?: number;
  totalCashedOut?: number;
  vouchersDue?: number;
  error?: string;
}> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  // This would require a custom report or summing journal entries
  // For now, return a placeholder - the actual values would come from Neon DB
  // or a Fineract report
  return {
    success: true,
    totalIssued: 0,
    totalRedeemed: 0,
    totalCashedOut: 0,
    vouchersDue: 0,
  };
}
