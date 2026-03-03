/**
 * Analytics – Buffr G2P.
 * Event helper for key actions. Log locally; plug in third-party SDK (e.g. segment, mixpanel) when needed.
 * Location: services/analytics.ts
 */

import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

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
 * Record an event. In dev, logs to console; in production, sends to backend.
 */
export async function recordEvent(event: AnalyticsEvent): Promise<void> {
  if (isDev) {
    console.log('[Analytics]', event.name, event);
  }
  
  // Send to backend when API is configured
  if (API_BASE_URL) {
    try {
      const token = await getSecureItem('buffr_access_token');
      await fetch(`${API_BASE_URL}/api/v1/mobile/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(event),
      });
    } catch (e) {
      console.warn('Failed to send analytics event:', e);
    }
  }
}
