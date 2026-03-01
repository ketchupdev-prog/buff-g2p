/**
 * Push notifications – Buffr G2P.
 * Stub for expo-notifications. Install expo-notifications and wire registerForPushNotificationsAsync
 * when backend supports FCM/APNs. Deep links: incoming payment, voucher, group invite, request-to-pay.
 * Location: services/notifications.ts
 */

/**
 * Register for push notifications. Call after login.
 * When expo-notifications is installed:
 *   const token = (await Notifications.getExpoPushTokenAsync()).data;
 *   await fetch(API_BASE_URL + '/api/v1/mobile/device/register', { method: 'POST', body: JSON.stringify({ pushToken: token }) });
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // TODO: install expo-notifications, request permissions, get token, send to backend
  return null;
}

/**
 * Handle notification tap → deep link. Wire in app/_layout or root.
 * Example: Notifications.addNotificationResponseReceivedListener(response => router.push(response.notification.request.content.data.url))
 */
export function setupNotificationHandlers(): void {
  // TODO: Notifications.addNotificationResponseReceivedListener(...)
}
