/**
 * Maps SmartPay backend notification rows to in-app NotificationData.
 * Ensures unknown `type` values degrade safely (Namibian regulatory alerts may introduce new types).
 * Location: fintech/apps/smartpay-mobile/services/notificationMapping.ts
 */

import type { Notification } from '@/types/api';
import type { NotificationData, NotificationType } from '@/types/notifications';

const KNOWN_TYPES_LIST: NotificationType[] = [
  'payment_received',
  'payment_sent',
  'kyc_status_update',
  'proof_of_life_reminder',
  'voucher_received',
  'group_invitation',
  'loan_status_update',
  'transaction_failed',
  'wallet_low_balance',
  'payment_request_received',
  'payment_request_paid',
  'system_announcement',
];
const KNOWN_TYPES = new Set<string>(KNOWN_TYPES_LIST);

/** UUID v4 — matches rows stored in PostgreSQL `notifications.id`. */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isServerNotificationId(id: string): boolean {
  return UUID_V4.test(id);
}

export function mapApiNotificationToData(row: Notification): NotificationData {
  const type: NotificationType = KNOWN_TYPES.has(row.type)
    ? (row.type as NotificationType)
    : 'system_announcement';

  const created = row.created_at ?? row.createdAt;
  const timestamp =
    created != null ? new Date(created as string | Date).getTime() : Date.now();

  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? { ...(row.metadata as Record<string, unknown>) }
      : {};

  return {
    id: row.id,
    type,
    title: row.title ?? '',
    body: row.message ?? '',
    read: Boolean(row.read),
    timestamp,
    data: Object.keys(metadata).length ? metadata : undefined,
  };
}
