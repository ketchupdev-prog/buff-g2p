/**
 * Push Notifications Service
 * 
 * Handles Expo push notification registration, permissions, and token management.
 * Integrates with backend for token storage and notification delivery.
 * 
 * Location: mobile/services/pushNotifications.ts
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSecureItem } from './secureStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Register for push notifications.
 * Requests permissions, gets Expo push token, and registers with backend.
 * 
 * @returns Push token or null if registration failed
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id'
    });

    const token = tokenData.data;
    console.log('Expo push token obtained:', token);

    // Configure notification channels (Android)
    if (Platform.OS === 'android') {
      await configureAndroidChannels();
    }

    // Register token with backend
    await registerTokenWithBackend(token);

    return token;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Configure Android notification channels.
 */
async function configureAndroidChannels() {
  // Default channel
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Buffr Notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0029D6',
    sound: 'default',
    enableVibrate: true,
    showBadge: true
  });

  // Critical alerts channel (high priority)
  await Notifications.setNotificationChannelAsync('critical', {
    name: 'Critical Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#E11D48',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC
  });

  // Financial notifications channel
  await Notifications.setNotificationChannelAsync('financial', {
    name: 'Financial Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
    sound: 'default',
    enableVibrate: true,
    showBadge: true
  });

  console.log('Android notification channels configured');
}

/**
 * Register push token with backend.
 * 
 * @param token - Expo push token
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      console.warn('No auth token, skipping push token registration');
      return;
    }

    const response = await fetch(`${API_URL}/api/v1/mobile/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          model: Device.modelName,
          osVersion: Device.osVersion,
          appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Token registration failed: ${response.status}`);
    }

    console.log('Push token registered successfully with backend');
  } catch (error) {
    console.error('Failed to register push token with backend:', error);
  }
}

/**
 * Unregister push token (e.g., on logout).
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const authToken = await getSecureItem('buffr_access_token');
    if (!authToken) {
      return;
    }

    await fetch(`${API_URL}/api/v1/mobile/notifications/unregister-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log('Push token unregistered successfully');
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}

/**
 * Check if push notifications are enabled.
 * 
 * @returns True if permissions are granted
 */
export async function arePushNotificationsEnabled(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Request push notification permissions.
 * 
 * @returns True if permissions granted
 */
export async function requestPushPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Get current Expo push token.
 * 
 * @returns Push token or null
 */
export async function getCurrentPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id'
    });
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Get badge count.
 * 
 * @returns Current badge count
 */
export async function getBadgeCount(): Promise<number> {
  if (Platform.OS === 'ios') {
    return await Notifications.getBadgeCountAsync();
  }
  return 0;
}

/**
 * Set badge count.
 * 
 * @param count - Badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(count);
  }
}

/**
 * Clear all notifications.
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await setBadgeCount(0);
  console.log('All notifications cleared');
}

/**
 * Schedule a local notification (for testing).
 * 
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data
 * @param seconds - Seconds until notification fires
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: any = {},
  seconds: number = 1
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default'
    },
    trigger: seconds === 0 ? null : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds }
  });

  console.log('Local notification scheduled:', identifier);
  return identifier;
}

/**
 * Cancel a scheduled notification.
 * 
 * @param identifier - Notification identifier
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
  console.log('Scheduled notification cancelled:', identifier);
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('All scheduled notifications cancelled');
}
