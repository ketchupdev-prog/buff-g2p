/**
 * Push notifications – Buffr G2P.
 * Handles push notification registration and handling.
 * Deep links: incoming payment, voucher, group invite, request-to-pay.
 * Location: services/notifications.ts
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSecureItem, setSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PUSH_TOKEN_KEY = 'expo_push_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications. Call after login.
 * Requests permissions and gets the Expo push token, then sends it to the backend.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Store token locally
    await setSecureItem(PUSH_TOKEN_KEY, token);
    
    // Send token to backend
    if (API_BASE_URL) {
      try {
        const authToken = await getSecureItem('buffr_access_token');
        await fetch(`${API_BASE_URL}/api/v1/mobile/device/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ pushToken: token }),
        });
      } catch (e) {
        console.warn('Failed to register push token with backend:', e);
      }
    }
    
    return token;
  } catch (e) {
    console.error('Error registering for push notifications:', e);
    return null;
  }
}

/**
 * Handle notification tap → deep link. Wire in app/_layout or root.
 * Example: Notifications.addNotificationResponseReceivedListener(response => router.push(response.notification.request.content.data.url))
 */
export function setupNotificationHandlers(): void {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    // Handle deep link based on notification data
    // This should be connected to the router in the app's root layout
    console.log('Notification tapped:', data);
  });
}

/**
 * Get stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  return getSecureItem(PUSH_TOKEN_KEY);
}
