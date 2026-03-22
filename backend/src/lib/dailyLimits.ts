/**
 * Buffr G2P Backend – Daily limits for cash-out and send (PRD §19 V5).
 * Location: backend/src/lib/dailyLimits.ts
 */

import { sql } from "./db.js";

const DAILY_CASHOUT_LIMIT_NAD = Number(process.env.DAILY_CASHOUT_LIMIT_NAD) || 50_000;
const DAILY_SEND_LIMIT_NAD = Number(process.env.DAILY_SEND_LIMIT_NAD) || 20_000;
const DAILY_LOAN_LIMIT_NAD = Number(process.env.DAILY_LOAN_LIMIT_NAD) || 10_000;

export function getDailyCashOutLimitNad(): number {
  return DAILY_CASHOUT_LIMIT_NAD;
}

export function getDailySendLimitNad(): number {
  return DAILY_SEND_LIMIT_NAD;
}

export function getDailyLoanLimitNad(): number {
  return DAILY_LOAN_LIMIT_NAD;
}

/** Sum of cash_out amounts for user today (by wallet_transactions + wallets). */
export async function getDailyCashOutTotalNad(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(wt.amount), 0) AS total
    FROM wallet_transactions wt
    JOIN wallets w ON w.id = wt.wallet_id
    WHERE w.user_id = ${userId}
      AND wt.type = ${"cash_out"}
      AND wt.created_at >= current_date
  `;
  const total = rows[0] != null ? Number((rows[0] as { total: string }).total) : 0;
  return total;
}

/** Sum of send amounts for user today (by p2p_transactions). */
export async function getDailySendTotalNad(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM p2p_transactions
    WHERE sender_id = ${userId}
      AND created_at >= current_date
  `;
  const total = rows[0] != null ? Number((rows[0] as { total: string }).total) : 0;
  return total;
}

export async function wouldExceedCashOutLimit(userId: string, additionalAmount: number): Promise<boolean> {
  const total = await getDailyCashOutTotalNad(userId);
  return total + additionalAmount > DAILY_CASHOUT_LIMIT_NAD;
}

export async function wouldExceedSendLimit(userId: string, additionalAmount: number): Promise<boolean> {
  const total = await getDailySendTotalNad(userId);
  return total + additionalAmount > DAILY_SEND_LIMIT_NAD;
}

/** Sum of loan amounts disbursed today for user. */
export async function getDailyLoanTotalNad(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM loans
    WHERE user_id = ${userId}
      AND status = ${"disbursed"}
      AND disbursed_at >= current_date
  `;
  const total = rows[0] != null ? Number((rows[0] as { total: string }).total) : 0;
  return total;
}

export async function wouldExceedLoanLimit(userId: string, additionalAmount: number): Promise<boolean> {
  const total = await getDailyLoanTotalNad(userId);
  return total + additionalAmount > DAILY_LOAN_LIMIT_NAD;
}
