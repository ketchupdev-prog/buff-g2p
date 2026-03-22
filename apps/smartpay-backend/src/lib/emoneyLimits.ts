/**
 * PSD-3: E-money transaction and balance limits. Enforce before any debit.
 * Location: fintech/smartpay/backend/src/lib/emoneyLimits.ts
 */
import { pool } from './db';

export interface LimitCheckInput {
  userId: string;
  walletId: string;
  amount: number;
  type: 'send' | 'cashout';
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

export async function checkEmoneyLimits(input: LimitCheckInput): Promise<LimitCheckResult> {
  const { userId, amount } = input;
  const tierRes = await pool.query(`SELECT kyc_tier FROM users WHERE id = $1`, [userId]);
  const tier = (tierRes.rows[0] as { kyc_tier?: string } | undefined)?.kyc_tier ?? 'basic';

  const limitsRes = await pool.query(`SELECT * FROM emoney_limits WHERE tier = $1`, [tier]);
  const limits = limitsRes.rows[0] as Record<string, unknown> | undefined;
  if (!limits) return { allowed: false, reason: 'Limits not configured for tier' };

  const maxSingle = Number(limits.max_single_transaction);
  if (amount > maxSingle) {
    return { allowed: false, reason: `Single transaction limit is N$${maxSingle} for your account tier.` };
  }

  const today = new Date().toISOString().slice(0, 10);
  const dailyRes = await pool.query(
    `SELECT COALESCE(total_sent, 0) as total_sent FROM emoney_daily_totals WHERE user_id = $1 AND date = $2`,
    [userId, today]
  );
  const dailySent = Number((dailyRes.rows[0] as { total_sent?: number } | undefined)?.total_sent ?? 0);
  const maxDaily = Number(limits.max_daily_transaction);
  if (dailySent + amount > maxDaily) {
    const remaining = maxDaily - dailySent;
    return { allowed: false, reason: `Daily transaction limit reached. Remaining today: N$${remaining.toFixed(2)}.`, remaining };
  }

  const yearMonth = today.slice(0, 7);
  const monthlyRes = await pool.query(
    `SELECT COALESCE(total_sent, 0) as total_sent FROM emoney_monthly_totals WHERE user_id = $1 AND year_month = $2`,
    [userId, yearMonth]
  );
  const monthlySent = Number((monthlyRes.rows[0] as { total_sent?: number } | undefined)?.total_sent ?? 0);
  const maxMonthly = Number(limits.max_monthly_transaction);
  if (monthlySent + amount > maxMonthly) {
    const remaining = maxMonthly - monthlySent;
    return { allowed: false, reason: `Monthly transaction limit reached. Remaining this month: N$${remaining.toFixed(2)}.`, remaining };
  }

  return { allowed: true, remaining: maxDaily - dailySent - amount };
}

export async function recordTransaction(userId: string, amount: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);
  await pool.query(
    `INSERT INTO emoney_daily_totals (user_id, date, total_sent) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, date) DO UPDATE SET total_sent = emoney_daily_totals.total_sent + $3`,
    [userId, today, amount]
  );
  await pool.query(
    `INSERT INTO emoney_monthly_totals (user_id, year_month, total_sent) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, year_month) DO UPDATE SET total_sent = emoney_monthly_totals.total_sent + $3`,
    [userId, yearMonth, amount]
  );
}
