/**
 * In-app + push notification state: merges server-backed inbox (GET /api/v1/notifications)
 * with device-delivered items (Expo) so users recover missed pushes after cold start.
 * Badge count is derived from `notifications` (single source of truth).
 * Location: fintech/apps/smartpay-mobile/contexts/NotificationsContext.tsx
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { notificationService } from '@/services/notifications';
import { mapApiNotificationToData, isServerNotificationId } from '@/services/notificationMapping';
import type { NotificationData } from '@/types/notifications';

const NOTIFICATIONS_STORAGE_KEY = 'smartpay_notifications';
const MAX_STORED_NOTIFICATIONS = 100;

interface RefreshOptions {
  /** When true, do not toggle `isLoading` (e.g. pull-to-refresh, tab focus). */
  silent?: boolean;
}

interface NotificationsContextType {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  pushToken: string | null;
  permissionGranted: boolean;
  addNotification: (notification: NotificationData) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  requestPermission: () => Promise<boolean>;
  refreshNotifications: (options?: RefreshOptions) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const router = useRouter();
  const notificationsRef = useRef<NotificationData[]>([]);
  notificationsRef.current = notifications;

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const saveNotifications = useCallback(async (list: NotificationData[]) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }, []);

  const loadNotificationsFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed: NotificationData[] = JSON.parse(stored);
        setNotifications(parsed);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  const refreshNotifications = useCallback(
    async (options?: RefreshOptions) => {
      const silent = options?.silent === true;
      if (!silent) setIsLoading(true);
      try {
        const remote = await notificationService.getNotifications({ limit: 100, offset: 0 });
        if (remote?.notifications) {
          const remoteMapped = remote.notifications.map(mapApiNotificationToData);
          const remoteIds = new Set(remoteMapped.map((n) => n.id));

          const storedRaw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
          const localParsed: NotificationData[] = storedRaw ? JSON.parse(storedRaw) : [];
          const localOnly = localParsed.filter((n) => !remoteIds.has(n.id));

          const merged = [...remoteMapped, ...localOnly]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, MAX_STORED_NOTIFICATIONS);

          setNotifications(merged);
          await saveNotifications(merged);
        } else {
          await loadNotificationsFromStorage();
        }
      } catch (error) {
        console.error('refreshNotifications error:', error);
        await loadNotificationsFromStorage();
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [loadNotificationsFromStorage, saveNotifications]
  );

  const addNotification = useCallback(
    async (notification: NotificationData) => {
      setNotifications((prev) => {
        const deduped = prev.filter((n) => n.id !== notification.id);
        const updated = [notification, ...deduped].slice(0, MAX_STORED_NOTIFICATIONS);
        void saveNotifications(updated);
        return updated;
      });
    },
    [saveNotifications]
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (isServerNotificationId(notificationId)) {
        await notificationService.markNotificationAsRead(notificationId);
      }
      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        void saveNotifications(updated);
        return updated;
      });
    },
    [saveNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    await notificationService.markAllNotificationsAsRead();
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      void saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const clearAll = useCallback(async () => {
    const current = notificationsRef.current;
    const serverIds = current.filter((n) => isServerNotificationId(n.id)).map((n) => n.id);
    for (let i = 0; i < serverIds.length; i += 8) {
      const chunk = serverIds.slice(i, i + 8);
      await Promise.all(chunk.map((id) => notificationService.deleteNotification(id)));
    }
    setNotifications([]);
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
      await notificationService.clearBadgeCount();
      await notificationService.dismissAll();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, []);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (isServerNotificationId(notificationId)) {
        await notificationService.deleteNotification(notificationId);
      }
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== notificationId);
        void saveNotifications(updated);
        return updated;
      });
      await notificationService.dismissNotification(notificationId);
    },
    [saveNotifications]
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await notificationService.requestPermissions();
      setPermissionGranted(status.granted);

      if (status.granted) {
        const token = await notificationService.getPushToken();
        if (token) setPushToken(token);
      }

      return status.granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    void notificationService.setBadgeCount(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        setIsLoading(true);
        await notificationService.setupChannels();
        await refreshNotifications({ silent: true });

        const { status } = await Notifications.getPermissionsAsync();
        setPermissionGranted(status === 'granted');

        if (status === 'granted') {
          const token = await notificationService.getPushToken();
          if (token) setPushToken(token);
        }

        const cachedToken = await notificationService.getCachedPushToken();
        if (cachedToken) setPushToken(cachedToken);
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeNotifications();

    const notificationListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const payload = notificationService.parsePayload(notification);
        if (payload) {
          const notificationData: NotificationData = {
            id: notification.request.identifier,
            type: payload.type,
            title: payload.title,
            body: payload.message,
            data: payload.metadata,
            timestamp: notification.date,
            read: false,
          };
          await addNotification(notificationData);
        }
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const notificationId = response.notification.request.identifier;
        await markAsRead(notificationId);

        const payload = notificationService.parsePayload(response.notification);
        if (payload) {
          const deepLink = notificationService.getDeepLink(payload);
          if (deepLink) {
            setTimeout(() => {
              router.push(deepLink as any);
            }, 100);
          }
        }
      }
    );

    return () => {
      const remove = (Notifications as any).removeNotificationSubscription as
        | ((sub: unknown) => void)
        | undefined;
      remove?.(notificationListener);
      remove?.(responseListener);
    };
  }, [addNotification, markAsRead, refreshNotifications, router]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        pushToken,
        permissionGranted,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification,
        requestPermission,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextType {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
}
