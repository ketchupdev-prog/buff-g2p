/**
 * Analytics – Buffr G2P.
 * Event helper for key actions. Log locally; plug in third-party SDK (e.g. segment, mixpanel) when needed.
 * Location: services/analytics.ts
 */

export type AnalyticsEvent =
  | { name: 'onboarding_complete' }
  | { name: 'send_money'; amount: number; recipientType?: 'p2p' | 'group' }
  | { name: 'request_money'; amount: number; context?: 'group' }
  | { name: 'voucher_redeem'; voucherId: string; method?: string }
  | { name: 'cash_out'; amount: number; method?: string }
  | { name: 'group_create' }
  | { name: 'group_add_member'; groupId: string }
  | { name: 'wallet_add_money'; walletId: string; amount?: number }
  | { name: 'screen_view'; screen: string }
  | { name: string; [key: string]: unknown };

const isDev = __DEV__;

/**
 * Record an event. In dev, logs to console; in production, can send to backend or third-party SDK.
 */
export function recordEvent(event: AnalyticsEvent): void {
  if (isDev) {
    console.log('[Analytics]', event.name, event);
  }
  // TODO: when backend or SDK is ready:
  // await fetch('/api/v1/mobile/events', { method: 'POST', body: JSON.stringify(event) });
  // or: analytics.track(event.name, event);
}
