/**
 * Notification Handler Service
 * 
 * Configures notification presentation behavior and handles notification responses.
 * Integrates with deep link handler for navigation.
 * 
 * Location: mobile/services/notificationHandler.ts
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { navigateToDeepLink } from './deepLinkHandler';

/**
 * Track analytics event.
 * Integrates with backend analytics endpoint for tracking notification interactions.
 * Falls back to console logging if tracking fails.
 */
const trackEvent = async (eventName: string, properties?: Record<string, any>) => {
  console.log('Analytics event:', eventName, properties);
  
  try {
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Send analytics event to backend
    await fetch(`${API_BASE_URL}/api/v1/mobile/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
        },
      }),
    });
  } catch (error) {
    // Silent fail - don't block user flow
    console.warn('Failed to track analytics event:', error);
  }
};

/**
 * Configure how notifications are presented when app is in foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority || 'medium';
    
    // Configure presentation based on priority
    const shouldShow = priority === 'critical' || priority === 'high';
    
    return {
      shouldShowAlert: shouldShow,
      shouldPlaySound: shouldShow,
      shouldSetBadge: true,
      shouldShowBanner: shouldShow,
      shouldShowList: true,
    };
  }
});

/**
 * Initialize notification response listener.
 * Handles user tapping on notifications.
 * 
 * @returns Cleanup function to remove listener
 */
export function initializeNotificationHandler(): () => void {
  console.log('Initializing notification handler...');
  
  // Handle notification responses (user tapped notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    handleNotificationResponse(response);
  });

  // Handle notifications received while app is in foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    handleNotificationReceived(notification);
  });

  // Return cleanup function
  return () => {
    console.log('Removing notification listeners');
    responseSubscription.remove();
    receivedSubscription.remove();
  };
}

/**
 * Handle notification response (user tapped notification).
 * 
 * @param response - Notification response
 */
function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  console.log('Notification response received:', response);
  
  const notification = response.notification;
  const content = notification.request.content;
  const data = content.data;
  
  // Track notification opened
  trackEvent('notification_opened', {
    type: data?.type,
    notificationId: data?.notificationId,
    actionIdentifier: response.actionIdentifier
  });
  
  // Navigate to deep link if provided
  if (data?.deepLink) {
    console.log('Navigating to deep link from notification:', data.deepLink);
    navigateToDeepLink(data.deepLink as string);
  } else if (data?.route) {
    // Legacy support for route parameter
    console.log('Navigating to route from notification:', data.route);
    navigateToDeepLink(`buffr://${data.route}`);
  } else {
    console.warn('No deep link or route in notification data');
  }
}

/**
 * Handle notification received (app in foreground).
 * 
 * @param notification - Received notification
 */
function handleNotificationReceived(notification: Notifications.Notification): void {
  console.log('Notification received while app in foreground:', notification);
  
  const content = notification.request.content;
  const data = content.data;
  
  // Track notification received
  trackEvent('notification_received', {
    type: data?.type,
    notificationId: data?.notificationId,
    appState: 'foreground'
  });
  
  // Update badge count
  updateBadgeCount();
}

/**
 * Update app badge count based on unread notifications.
 */
async function updateBadgeCount(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }
  
  try {
    // Get delivered notifications
    const delivered = await Notifications.getPresentedNotificationsAsync();
    const count = delivered.length;
    
    // Update badge
    await Notifications.setBadgeCountAsync(count);
    
    console.log('Badge count updated:', count);
  } catch (error) {
    console.error('Failed to update badge count:', error);
  }
}

/**
 * Show a local notification (for testing or app-generated alerts).
 * 
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data
 * @param priority - Notification priority
 */
export async function showLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {},
  priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): Promise<void> {
  try {
    // Determine channel based on priority (Android)
    let channelId = 'default';
    if (Platform.OS === 'android') {
      if (priority === 'critical') {
        channelId = 'critical';
      } else if (data.type?.includes('money') || data.type?.includes('payment')) {
        channelId = 'financial';
      }
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          priority,
          createdAt: new Date().toISOString()
        },
        sound: priority === 'critical' || priority === 'high' ? 'default' : undefined,
        badge: 1,
        ...(Platform.OS === 'android' && { channelId })
      },
      trigger: null // Show immediately
    });
    
    console.log('Local notification shown:', title);
  } catch (error) {
    console.error('Failed to show local notification:', error);
  }
}

/**
 * Dismiss a notification by identifier.
 * 
 * @param notificationId - Notification identifier
 */
export async function dismissNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(notificationId);
    console.log('Notification dismissed:', notificationId);
  } catch (error) {
    console.error('Failed to dismiss notification:', error);
  }
}

/**
 * Dismiss all notifications.
 */
export async function dismissAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
    console.log('All notifications dismissed');
  } catch (error) {
    console.error('Failed to dismiss all notifications:', error);
  }
}

/**
 * Get all delivered notifications.
 * 
 * @returns Array of delivered notifications
 */
export async function getDeliveredNotifications(): Promise<Notifications.Notification[]> {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Failed to get delivered notifications:', error);
    return [];
  }
}

/**
 * Handle notification action (custom actions from notification).
 * 
 * @param action - Action data from notification
 */
export async function handleNotificationAction(action: any): Promise<void> {
  console.log('Handling notification action:', action);
  
  const { type, handler, data } = action;
  
  switch (type) {
    case 'view':
      // Navigate to view
      if (handler) {
        navigateToDeepLink(handler);
      }
      break;
    
    case 'approve':
      // Handle approve action (e.g., approve payment request)
      trackEvent('notification_action_approve', { data });
      if (handler) {
        navigateToDeepLink(handler);
      }
      break;
    
    case 'decline':
      // Handle decline action
      trackEvent('notification_action_decline', { data });
      // Could show confirmation or navigate
      break;
    
    case 'verify':
      // Handle verify action (e.g., proof-of-life)
      trackEvent('notification_action_verify', { data });
      if (handler) {
        navigateToDeepLink(handler);
      }
      break;
    
    default:
      console.warn('Unknown notification action type:', type);
  }
}

/**
 * Test notification system (for development).
 */
export async function testNotification(): Promise<void> {
  await showLocalNotification(
    'Test Notification',
    'This is a test notification from Buffr',
    {
      type: 'system_announcement',
      deepLink: 'buffr://home'
    },
    'medium'
  );
}
