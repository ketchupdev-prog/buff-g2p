/**
 * Network / offline awareness – Buffr G2P.
 * Exposes isOnline and a simple retry helper. Use with NetInfo when installed.
 * Location: services/network.ts
 */

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
