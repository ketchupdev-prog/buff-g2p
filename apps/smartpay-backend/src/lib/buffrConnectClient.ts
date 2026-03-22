/**
 * Buffr Connect API Client
 * Location: fintech/smartpay/backend/src/lib/buffrConnectClient.ts
 *
 * Optional integration with Buffr Connect (AIS / Open Banking sandbox).
 * Use for: health checks, sandbox users, AIS accounts/balance/transactions
 * when Smartpay needs to test or use Buffr Connect.
 *
 * Set BUFFR_CONNECT_BASE_URL (or BUFFR_API_BASE) to the Buffr Connect origin
 * (e.g. http://localhost:3000 when running buffr-connect/buffrconnect locally).
 */

// Standardized: prefer BUFFR_CONNECT_URL, fallback to legacy names
const BASE = (
  process.env.BUFFR_CONNECT_URL || 
  process.env.BUFFR_CONNECT_BASE_URL || 
  process.env.BUFFR_API_BASE
)?.replace(/\/$/, '');

export function isBuffrConnectConfigured(): boolean {
  return Boolean(BASE);
}

export interface BuffrHealthResponse {
  status: string;
  timestamp?: string;
}

export interface BuffrSandboxUser {
  username: string;
  password?: string;
  category?: string;
  description?: string;
  expectedBehavior?: string;
  accounts?: unknown[];
  credit_score?: number;
  monthly_income?: number;
}

export interface BuffrSandboxUsersResponse {
  users?: BuffrSandboxUser[];
  total?: number;
  [key: string]: unknown;
}

export interface BuffrAisAccount {
  id: string;
  provider_id?: string;
  account_type?: string;
  account_number?: string;
  account_name?: string;
  currency?: string;
  balance?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface BuffrAisAccountsResponse {
  accounts: BuffrAisAccount[];
}

/**
 * GET /api/health – no auth required.
 */
export async function healthCheck(): Promise<BuffrHealthResponse | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as BuffrHealthResponse;
  } catch (err) {
    console.warn('[BuffrConnect] health error:', err);
    return null;
  }
}

/**
 * GET /api/sandbox/users – list sandbox mock users (may require API key depending on Buffr Connect config).
 */
export async function getSandboxUsers(options?: {
  apiKey?: string;
  category?: string;
  details?: boolean;
}): Promise<BuffrSandboxUsersResponse | null> {
  if (!BASE) return null;
  try {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.details) params.set('details', 'true');
    const url = `${BASE}/api/sandbox/users${params.toString() ? `?${params}` : ''}`;
    const headers: Record<string, string> = {};
    if (options?.apiKey) headers['x-api-key'] = options.apiKey;
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as BuffrSandboxUsersResponse;
  } catch (err) {
    console.warn('[BuffrConnect] sandbox users error:', err);
    return null;
  }
}

/**
 * GET /api/ais/accounts – list AIS accounts (requires Bearer token from OAuth consent).
 */
export async function getAisAccounts(accessToken: string): Promise<BuffrAisAccountsResponse | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/api/ais/accounts`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as BuffrAisAccountsResponse;
  } catch (err) {
    console.warn('[BuffrConnect] AIS accounts error:', err);
    return null;
  }
}
