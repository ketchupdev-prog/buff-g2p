/**
 * Analytical Query Functions for Smartpay
 * Location: fintech/smartpay/backend/src/lib/analyticsQueries.ts
 * Reference: PRD §4.6.2 - Analytics use cases
 * 
 * Use Cases:
 * - "How much did I withdraw in cash this month?"
 * - "Show my last grant payment"
 * - "What did I spend on groceries?"
 * - Transaction pattern analysis for fraud detection
 */

import { queryDuckDBPrepared } from './duckdb';

export interface MonthlyWithdrawalSummary {
  month: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  cashoutMethods: Array<{ method: string; amount: number; count: number }>;
}

export interface SpendingByCategory {
  category: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  topMerchants: Array<{ merchant: string; amount: number }>;
}

export interface TransactionSearchResult {
  transactionId: string;
  type: string;
  amount: number;
  recipient?: string;
  merchantName?: string;
  category?: string;
  status: string;
  createdAt: string;
  description?: string;
}

export interface GrantPayment {
  grantId: string;
  programName: string;
  amount: number;
  disbursementDate: string;
  status: string;
  walletId: string;
}

/**
 * Get monthly cash withdrawal summary
 * Use case: "How much did I withdraw in cash this month?"
 */
export async function getMonthlyWithdrawals(
  userId: string,
  month?: string // Format: 'YYYY-MM', defaults to current month
): Promise<MonthlyWithdrawalSummary> {
  const targetMonth = month || new Date().toISOString().substring(0, 7);
  
  const sql = `
    WITH monthly_cashouts AS (
      SELECT 
        t.amount,
        t.metadata->>'cashout_method' as method,
        DATE_TRUNC('month', t.created_at) as month
      FROM transactions t
      WHERE t.user_id = ?
        AND t.type IN ('cashout', 'agent_cashout', 'merchant_cashout')
        AND t.status = 'completed'
        AND DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', ?::TIMESTAMP)
    )
    SELECT
      ? as month,
      COALESCE(SUM(amount), 0) as total_amount,
      COUNT(*) as transaction_count,
      COALESCE(AVG(amount), 0) as average_amount
    FROM monthly_cashouts;
  `;
  
  const results = await queryDuckDBPrepared<{
    month: string;
    total_amount: number;
    transaction_count: number;
    average_amount: number;
  }>(sql, [userId, targetMonth, targetMonth]);
  
  // Get breakdown by cashout method
  const methodSql = `
    SELECT 
      COALESCE(t.metadata->>'cashout_method', 'unknown') as method,
      SUM(t.amount) as amount,
      COUNT(*) as count
    FROM transactions t
    WHERE t.user_id = ?
      AND t.type IN ('cashout', 'agent_cashout', 'merchant_cashout')
      AND t.status = 'completed'
      AND DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', ?::TIMESTAMP)
    GROUP BY method
    ORDER BY amount DESC;
  `;
  
  const methods = await queryDuckDBPrepared<{ method: string; amount: number; count: number }>(
    methodSql,
    [userId, targetMonth]
  );
  
  const summary = results[0] || {
    month: targetMonth,
    total_amount: 0,
    transaction_count: 0,
    average_amount: 0,
  };
  
  return {
    month: summary.month,
    totalAmount: summary.total_amount,
    transactionCount: summary.transaction_count,
    averageAmount: summary.average_amount,
    cashoutMethods: methods,
  };
}

/**
 * Get spending breakdown by category
 * Use case: "What did I spend on groceries?"
 */
export async function getSpendingByCategory(
  userId: string,
  period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  category?: string
): Promise<SpendingByCategory[]> {
  const periodDaysMap = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  };
  
  const periodDays = periodDaysMap[period];
  
  // Build SQL query based on whether category filter is provided
  const sql = category ? `
    WITH spending_data AS (
      SELECT 
        COALESCE(t.category, 'uncategorized') as category,
        t.amount,
        t.merchant_name,
        t.created_at
      FROM transactions t
      WHERE t.user_id = ?
        AND t.type IN ('payment', 'purchase', 'merchant_payment')
        AND t.status = 'completed'
        AND t.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * ?
        AND t.category = ?
    ),
    category_totals AS (
      SELECT
        category,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM spending_data
      GROUP BY category
    ),
    total_spending AS (
      SELECT SUM(amount) as total FROM spending_data
    )
    SELECT
      ct.category,
      ct.total_amount,
      ct.transaction_count,
      ROUND((ct.total_amount / NULLIF(ts.total, 0)) * 100, 2) as percentage
    FROM category_totals ct
    CROSS JOIN total_spending ts
    ORDER BY ct.total_amount DESC;
  ` : `
    WITH spending_data AS (
      SELECT 
        COALESCE(t.category, 'uncategorized') as category,
        t.amount,
        t.merchant_name,
        t.created_at
      FROM transactions t
      WHERE t.user_id = ?
        AND t.type IN ('payment', 'purchase', 'merchant_payment')
        AND t.status = 'completed'
        AND t.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * ?
    ),
    category_totals AS (
      SELECT
        category,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM spending_data
      GROUP BY category
    ),
    total_spending AS (
      SELECT SUM(amount) as total FROM spending_data
    )
    SELECT
      ct.category,
      ct.total_amount,
      ct.transaction_count,
      ROUND((ct.total_amount / NULLIF(ts.total, 0)) * 100, 2) as percentage
    FROM category_totals ct
    CROSS JOIN total_spending ts
    ORDER BY ct.total_amount DESC;
  `;
  
  const params = category ? [userId, periodDays, category] : [userId, periodDays];
  const results = await queryDuckDBPrepared<{
    category: string;
    total_amount: number;
    transaction_count: number;
    percentage: number;
  }>(sql, params);
  
  // Get top merchants for each category
  const resultsWithMerchants: SpendingByCategory[] = await Promise.all(
    results.map(async (cat) => {
      const merchantSql = `
        SELECT 
          merchant_name as merchant,
          SUM(amount) as amount
        FROM transactions t
        WHERE t.user_id = ?
          AND t.category = ?
          AND t.type IN ('payment', 'purchase', 'merchant_payment')
          AND t.status = 'completed'
          AND t.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * ?
          AND t.merchant_name IS NOT NULL
        GROUP BY merchant_name
        ORDER BY amount DESC
        LIMIT 3;
      `;
      
      const merchants = await queryDuckDBPrepared<{ merchant: string; amount: number }>(
        merchantSql,
        [userId, cat.category, periodDays]
      );
      
      return {
        category: cat.category,
        totalAmount: cat.total_amount,
        transactionCount: cat.transaction_count,
        percentage: cat.percentage,
        topMerchants: merchants,
      };
    })
  );
  
  return resultsWithMerchants;
}

/**
 * Search transaction history with advanced filters
 * Use case: General transaction search and analysis
 */
export async function getTransactionHistory(
  userId: string,
  filters: {
    startDate?: string;
    endDate?: string;
    type?: string;
    minAmount?: number;
    maxAmount?: number;
    status?: string;
    searchTerm?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ transactions: TransactionSearchResult[]; total: number }> {
  const {
    startDate,
    endDate,
    type,
    minAmount,
    maxAmount,
    status,
    searchTerm,
    limit = 50,
    offset = 0,
  } = filters;
  
  let whereConditions = ['t.user_id = ?'];
  const params: any[] = [userId];
  
  if (startDate) {
    whereConditions.push('t.created_at >= ?::TIMESTAMP');
    params.push(startDate);
  }
  
  if (endDate) {
    whereConditions.push('t.created_at <= ?::TIMESTAMP');
    params.push(endDate);
  }
  
  if (type) {
    whereConditions.push('t.type = ?');
    params.push(type);
  }
  
  if (minAmount !== undefined) {
    whereConditions.push('t.amount >= ?');
    params.push(minAmount);
  }
  
  if (maxAmount !== undefined) {
    whereConditions.push('t.amount <= ?');
    params.push(maxAmount);
  }
  
  if (status) {
    whereConditions.push('t.status = ?');
    params.push(status);
  }
  
  if (searchTerm) {
    whereConditions.push(
      "(t.recipient ILIKE ? OR t.merchant_name ILIKE ? OR t.description ILIKE ?)"
    );
    const searchPattern = `%${searchTerm}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // Get total count (using string concatenation to avoid template literal interpolation)
  const countSql = 
    'SELECT COUNT(*) as total\n' +
    '    FROM transactions t\n' +
    '    WHERE ' + whereClause + ';';
  
  const countResult = await queryDuckDBPrepared<{ total: number }>(countSql, params);
  const total = countResult[0]?.total || 0;
  
  // Get transactions (using string concatenation to avoid template literal interpolation)
  const sql = 
    'SELECT\n' +
    '      t.id as transaction_id,\n' +
    '      t.type,\n' +
    '      t.amount,\n' +
    '      t.recipient,\n' +
    '      t.merchant_name,\n' +
    '      t.category,\n' +
    '      t.status,\n' +
    '      t.created_at,\n' +
    '      t.description\n' +
    '    FROM transactions t\n' +
    '    WHERE ' + whereClause + '\n' +
    '    ORDER BY t.created_at DESC\n' +
    '    LIMIT ? OFFSET ?;';
  
  const transactions = await queryDuckDBPrepared<TransactionSearchResult>(
    sql,
    [...params, limit, offset]
  );
  
  return { transactions, total };
}

/**
 * Get grant payment history
 * Use case: "Show my last grant payment"
 */
export async function getGrantPayments(
  userId: string,
  limit: number = 10
): Promise<GrantPayment[]> {
  const sql = `
    SELECT
      g.id as grant_id,
      g.program_name,
      g.amount,
      g.disbursement_date,
      g.status,
      g.wallet_id
    FROM grants g
    WHERE g.user_id = ?
    ORDER BY g.disbursement_date DESC
    LIMIT ?;
  `;
  
  return queryDuckDBPrepared<GrantPayment>(sql, [userId, limit]);
}

/**
 * Detect unusual transaction patterns (fraud detection)
 * Optional: DuckPGQ graph analysis
 */
export async function detectUnusualPatterns(
  userId: string,
  windowDays: number = 7
): Promise<{
  rapidTransactions: number;
  unusualAmounts: number;
  newRecipients: number;
  riskScore: number;
}> {
  // Check for rapid transactions (more than 5 in 1 hour)
  const rapidSql = `
    SELECT COUNT(*) as count
    FROM (
      SELECT
        created_at,
        LAG(created_at) OVER (ORDER BY created_at) as prev_time
      FROM transactions
      WHERE user_id = ?
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * ?
        AND status = 'completed'
    ) t
    WHERE EXTRACT(EPOCH FROM (created_at - prev_time)) < 3600
    GROUP BY DATE_TRUNC('hour', created_at)
    HAVING COUNT(*) > 5;
  `;
  
  const rapidResults = await queryDuckDBPrepared<{ count: number }>(rapidSql, [userId, windowDays]);
  const rapidTransactions = rapidResults.reduce((sum, r) => sum + r.count, 0);
  
  // Check for amounts significantly above user's average
  const unusualAmountSql = `
    WITH user_avg AS (
      SELECT AVG(amount) as avg_amount, STDDEV(amount) as std_amount
      FROM transactions
      WHERE user_id = ?
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * ?
        AND status = 'completed'
    )
    SELECT COUNT(*) as count
    FROM transactions t, user_avg
    WHERE t.user_id = ?
      AND t.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * ?
      AND t.status = 'completed'
      AND t.amount > (user_avg.avg_amount + (2 * user_avg.std_amount));
  `;
  
  const unusualResults = await queryDuckDBPrepared<{ count: number }>(
    unusualAmountSql,
    [userId, windowDays * 4, userId, windowDays]
  );
  const unusualAmounts = unusualResults[0]?.count || 0;
  
  // Check for new recipients
  const newRecipientsSql = `
    SELECT COUNT(DISTINCT recipient) as count
    FROM transactions
    WHERE user_id = ?
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * ?
      AND status = 'completed'
      AND recipient NOT IN (
        SELECT DISTINCT recipient
        FROM transactions
        WHERE user_id = ?
          AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * ?
          AND status = 'completed'
      );
  `;
  
  const newRecipResults = await queryDuckDBPrepared<{ count: number }>(
    newRecipientsSql,
    [userId, windowDays, userId, windowDays]
  );
  const newRecipients = newRecipResults[0]?.count || 0;
  
  // Calculate simple risk score (0-100)
  const riskScore = Math.min(
    100,
    (rapidTransactions * 20) + (unusualAmounts * 15) + (newRecipients * 10)
  );
  
  return {
    rapidTransactions,
    unusualAmounts,
    newRecipients,
    riskScore,
  };
}

/**
 * Get spending trends over time
 */
export async function getSpendingTrends(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' = 'weekly',
  weeks: number = 12
): Promise<Array<{ period: string; amount: number; count: number }>> {
  // Build SQL based on period to avoid string interpolation in DATE_TRUNC
  let sql: string;
  
  if (period === 'daily') {
    sql = `
      SELECT
        DATE_TRUNC('day', created_at)::VARCHAR as period,
        SUM(amount) as amount,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ?
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 week' * ?
        AND type IN ('payment', 'purchase', 'merchant_payment')
        AND status = 'completed'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY period ASC;
    `;
  } else if (period === 'weekly') {
    sql = `
      SELECT
        DATE_TRUNC('week', created_at)::VARCHAR as period,
        SUM(amount) as amount,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ?
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 week' * ?
        AND type IN ('payment', 'purchase', 'merchant_payment')
        AND status = 'completed'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY period ASC;
    `;
  } else {
    sql = `
      SELECT
        DATE_TRUNC('month', created_at)::VARCHAR as period,
        SUM(amount) as amount,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ?
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 week' * ?
        AND type IN ('payment', 'purchase', 'merchant_payment')
        AND status = 'completed'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY period ASC;
    `;
  }
  
  return queryDuckDBPrepared<{ period: string; amount: number; count: number }>(sql, [userId, weeks]);
}
