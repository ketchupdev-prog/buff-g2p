/**
 * Network / offline awareness – Buffr G2P.
 * Exposes isOnline, API reachability check, and a simple retry helper.
 * Location: services/network.ts
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

let _isOnline = true;

/**
 * Current online state. Set via setNetworkState (e.g. from NetInfo listener).
 */
export function isOnline(): boolean {
  return _isOnline;
}

/**
 * Update online state. Call from NetInfo.addEventListener when NetInfo is used.
 */
export function setNetworkState(online: boolean): void {
  _isOnline = online;
}

/**
 * Ping backend /healthz. Use to confirm "real API" is reachable.
 * Returns true if API_BASE_URL is set and GET /healthz returns 200.
 */
export async function checkApiReachable(): Promise<boolean> {
  if (!API_BASE_URL) return false;
  try {
    const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/healthz`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Base URL when using real API (for display in banners).
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Retry a function up to maxRetries times with delayMs between attempts.
 * Useful for transient failures (e.g. network).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000 } = options;
  let lastError: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}
