/**
 * Notifications Service - SmartPay Mobile
 * Handles user notifications and alerts
 * Location: mobile/services/notifications.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { api } from './api';
import { Notification } from '../types/api';
import type {
  LocalNotificationSchedule,
  NotificationData,
  NotificationPermissionStatus,
  NotificationChannel,
  PushNotificationPayload,
} from '@/types/notifications';

const PUSH_TOKEN_CACHE_KEY = 'smartpay_push_token';

export { Notification };

/**
 * GET /api/v1/notifications response (SmartPay backend).
 * { notifications, unreadCount, total }
 */
export interface NotificationsListResponse {
  notifications: Notification[];
  unreadCount?: number;
  total?: number;
}

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
export async function getNotifications(options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsListResponse | null> {
  try {
    const params: Record<string, unknown> = {};

    if (options?.limit != null) params.limit = options.limit;
    if (options?.offset != null) params.offset = options.offset;
    if (options?.unreadOnly) params.unreadOnly = options.unreadOnly;

    const response = await api.get<NotificationsListResponse>('/api/v1/notifications', {
      params,
      retry: true,
    });

    return {
      notifications: response.notifications ?? [],
      unreadCount: response.unreadCount,
      total: response.total,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('getNotifications: falling back to local cache', error);
    }
    return null;
  }
}

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
  try {
    await api.patch(`/api/v1/notifications/${notificationId}/read`, {});
    return { success: true };
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    return { success: false };
  }
}

/**
 * Mark all notifications as read
 * POST /api/v1/notifications/mark-all-read
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  try {
    await api.post('/api/v1/notifications/mark-all-read', {});
    return { success: true };
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    return { success: false };
  }
}

/**
 * Delete notification
 * DELETE /api/v1/notifications/:id
 */
export async function deleteNotification(notificationId: string): Promise<{ success: boolean }> {
  try {
    await api.delete(`/api/v1/notifications/${notificationId}`);
    return { success: true };
  } catch (error) {
    console.error('deleteNotification error:', error);
    return { success: false };
  }
}

/**
 * Notification service object for convenient access
 */
export const notificationService = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,

  /**
   * Local scheduled notifications (used by `utils/notificationHelpers.ts`).
   */
  scheduleLocal: async (schedule: LocalNotificationSchedule): Promise<void> => {
    try {
      const trigger = schedule.trigger.date
        ? { date: schedule.trigger.date }
        : {
            seconds: schedule.trigger.seconds ?? 1,
            repeats: schedule.trigger.repeats ?? false,
          };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: schedule.title,
          body: schedule.body,
          data: {
            type: schedule.type,
            title: schedule.title,
            message: schedule.body,
            metadata: schedule.data ?? {},
          },
        },
        trigger: trigger as any,
      });
    } catch (error) {
      console.error('scheduleLocal error:', error);
    }
  },

  /**
   * iOS badge count helpers (used by `NotificationsContext`).
   * Notes:
   * - iOS: real badge updates
   * - Android: no-op (still safe)
   */
  setBadgeCount: async (count: number): Promise<void> => {
    try {
      // expo-notifications handles platform differences internally
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('setBadgeCount error:', error);
    }
  },

  clearBadgeCount: async (): Promise<void> => {
    await notificationService.setBadgeCount(0);
  },

  dismissAll: async (): Promise<void> => {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('dismissAll error:', error);
    }
  },

  dismissNotification: async (notificationId: string): Promise<void> => {
    try {
      await Notifications.dismissNotificationAsync(notificationId);
    } catch (error) {
      console.error('dismissNotification error:', error);
    }
  },

  /**
   * Notification permission request + normalization for app usage.
   */
  requestPermissions: async (): Promise<NotificationPermissionStatus> => {
    try {
      const { status, canAskAgain, ios } = await Notifications.requestPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        ios: ios
          ? {
              // App code doesn't rely on the exact iOS enum mapping,
              // but the token must be numeric to satisfy our local type.
              status: status === 'granted' ? 1 : 0,
              allowsAlert: ios.allowsAlert ?? false,
              allowsBadge: ios.allowsBadge ?? false,
              allowsSound: ios.allowsSound ?? false,
            }
          : undefined,
      };
    } catch (error) {
      console.error('requestPermissions error:', error);
      return { granted: false, canAskAgain: true };
    }
  },

  /**
   * Configure notification channels (Android) at app startup.
   */
  setupChannels: async (): Promise<void> => {
    try {
      // Minimal channel set; safe to call multiple times.
      const channels: NotificationChannel[] = [
        {
          id: 'smartpay-default',
          name: 'SmartPay Notifications',
          importance: 5,
          description: 'SmartPay user notifications',
          sound: undefined,
        },
      ];

      for (const ch of channels) {
        await Notifications.setNotificationChannelAsync(ch.id, ch);
      }
    } catch (error) {
      // Don't block app boot if channels can't be set.
      console.error('setupChannels error:', error);
    }
  },

  /**
   * Expo push token retrieval + caching.
   */
  getPushToken: async (): Promise<string | null> => {
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      const token = tokenResponse.data ?? null;
      if (token) {
        await AsyncStorage.setItem(PUSH_TOKEN_CACHE_KEY, token);
      }
      return token;
    } catch (error) {
      console.error('getPushToken error:', error);
      return null;
    }
  },

  getCachedPushToken: async (): Promise<string | null> => {
    try {
      return (await AsyncStorage.getItem(PUSH_TOKEN_CACHE_KEY)) ?? null;
    } catch (error) {
      console.error('getCachedPushToken error:', error);
      return null;
    }
  },

  /**
   * Convert expo-notifications payloads to a typed structure used by the app.
   */
  parsePayload: (notification: Notifications.Notification): PushNotificationPayload | null => {
    try {
      const data = (notification.request.content.data ?? {}) as any;
      const type = data.type as NotificationData['type'];
      if (!type) return null;

      const title = (data.title as string) ?? notification.request.content.title ?? '';
      const message = (data.message as string) ?? notification.request.content.body ?? '';
      const metadata = (data.metadata ?? {}) as Record<string, any>;

      return { type, title, message, metadata: metadata ?? undefined };
    } catch {
      return null;
    }
  },

  /**
   * Extract deep link from push/local notification payloads.
   */
  getDeepLink: (payload: PushNotificationPayload): string | null => {
    return payload.metadata?.deepLink ?? null;
  },
};
