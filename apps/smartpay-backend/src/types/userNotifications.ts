/**
 * Types for `notifications` table and mobile API list payloads.
 * Location: fintech/apps/smartpay-backend/src/types/userNotifications.ts
 */

/** Row as returned to clients (no user_id). */
export interface UserNotificationPublic {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  read_at: Date | null;
}

/** Full row including user_id (internal / admin). */
export interface UserNotificationRow extends UserNotificationPublic {
  user_id: string;
  updated_at: Date;
}

export interface ListUserNotificationsResult {
  rows: UserNotificationPublic[];
  /** Rows matching the same filter as the list (for pagination). */
  totalMatchingFilter: number;
  /** Unread count for this user (always all unread, ignoring unreadOnly filter). */
  unreadCount: number;
}
