/**
 * Analytics Service – Buffr G2P
 * Fetches transaction analytics and spending data from backend API
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export interface MonthlyAnalytics {
  totalReceived: number;
  vouchersRedeemed: number;
  totalSent: number;
  currency: string;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
  count: number;
}

export interface DailyTransaction {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
}

export interface AnalyticsSummary {
  monthly: MonthlyAnalytics;
  spendingByCategory: SpendingByCategory[];
  dailyTransactions: DailyTransaction[];
}

/**
 * Fetch analytics summary for the authenticated user
 */
export async function fetchAnalyticsSummary(
  userId: string,
  token: string,
  startDate?: string, // YYYY-MM-DD
  endDate?: string    // YYYY-MM-DD
): Promise<AnalyticsSummary> {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL not configured');
  }

  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const url = `${API_BASE_URL}/api/v1/mobile/analytics/${userId}/summary?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch analytics' }));
    throw new Error(errorData.error ?? 'Failed to fetch analytics');
  }

  return response.json();
}

/**
 * Generate date range for current month
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];
  return { startDate, endDate };
}

/**
 * Generate date range for last N days
 */
export function getLastNDaysRange(days: number): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
}
