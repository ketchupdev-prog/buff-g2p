/**
 * Deep Link Handler Service
 * 
 * Handles deep link parsing and navigation for push notifications and external links.
 * Maps deep link paths to app routes.
 * 
 * Location: mobile/services/deepLinkHandler.ts
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

export interface DeepLinkRoute {
  path: string;
  params?: Record<string, string>;
}

/**
 * Parse a deep link URL into path and params.
 * 
 * @param url - Deep link URL (e.g., buffr://receive/voucher/123)
 * @returns Parsed route with path and params
 */
export function parseDeepLink(url: string): DeepLinkRoute | null {
  try {
    const parsed = Linking.parse(url);
    
    if (!parsed.hostname) {
      console.warn('Invalid deep link: missing hostname');
      return null;
    }

    // Remove leading slash from path
    const path = parsed.path?.replace(/^\//, '') || '';
    const params = parsed.queryParams || {};

    // Combine hostname and path for full route
    const fullPath = path ? `${parsed.hostname}/${path}` : parsed.hostname;

    return {
      path: fullPath,
      params: params as Record<string, string>
    };
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return null;
  }
}

/**
 * Navigate to a deep link URL.
 * 
 * @param url - Deep link URL
 */
export function navigateToDeepLink(url: string): void {
  console.log('Navigating to deep link:', url);
  
  const route = parseDeepLink(url);
  
  if (!route) {
    console.warn('Invalid deep link:', url);
    return;
  }

  // Map deep link paths to app routes
  const appRoute = mapDeepLinkToAppRoute(route.path);
  
  if (!appRoute) {
    console.warn('No app route found for deep link:', route.path);
    // Fallback to home
    router.push('/(tabs)');
    return;
  }

  // Navigate with params
  try {
    if (Object.keys(route.params || {}).length > 0) {
      router.push({
        pathname: appRoute as any,
        params: route.params
      });
    } else {
      router.push(appRoute as any);
    }
    
    console.log('Navigated to:', appRoute);
  } catch (error) {
    console.error('Navigation failed:', error);
    router.push('/(tabs)');
  }
}

/**
 * Map deep link path to app route.
 * 
 * @param deepLinkPath - Deep link path (e.g., 'receive/voucher/123')
 * @returns App route path
 */
function mapDeepLinkToAppRoute(deepLinkPath: string): string | null {
  // Define route mappings
  const routeMap: Record<string, string> = {
    // Home
    'home': '/(tabs)',
    'index': '/(tabs)',
    
    // Receive
    'receive/voucher': '/receive/voucher',
    'receive/request': '/receive/request',
    'receive/group-invite': '/receive/group-invite',
    'receive': '/receive',
    
    // Proof of Life
    'proof-of-life': '/proof-of-life',
    'proof-of-life/verify': '/proof-of-life',
    
    // Profile & Settings
    'profile/settings/security': '/profile/settings',
    'profile/settings': '/profile/settings',
    'profile/qr-code': '/profile/qr-code',
    'profile': '/(tabs)/profile',
    
    // Loans
    'loans/apply': '/loans/apply',
    'loans': '/loans',
    
    // Transactions
    'transactions': '/(tabs)/transactions',
    
    // Vouchers
    'vouchers': '/(tabs)/vouchers',
    
    // Wallets
    'wallets': '/wallets',
    
    // Groups
    'groups': '/groups',
  };

  // Check for exact match
  if (routeMap[deepLinkPath]) {
    return routeMap[deepLinkPath];
  }

  // Check for pattern matches (e.g., receive/voucher/[id])
  for (const [pattern, appRoute] of Object.entries(routeMap)) {
    if (deepLinkPath.startsWith(pattern)) {
      // Extract ID from path if present
      const remainingPath = deepLinkPath.substring(pattern.length);
      if (remainingPath.startsWith('/')) {
        // Has ID parameter
        const id = remainingPath.substring(1);
        return `${appRoute}/${id}`;
      }
      return appRoute;
    }
  }

  // No match found
  console.warn('No route mapping found for:', deepLinkPath);
  return null;
}

/**
 * Initialize deep link listener.
 * Sets up handlers for initial URL and URL events while app is running.
 */
export function initializeDeepLinkListener(): () => void {
  console.log('Initializing deep link listener...');
  
  // Handle initial URL (app opened from notification)
  Linking.getInitialURL().then(url => {
    if (url) {
      console.log('App opened with initial URL:', url);
      // Wait a bit for app to initialize
      setTimeout(() => {
        navigateToDeepLink(url);
      }, 1000);
    }
  });

  // Handle URLs while app is running
  const subscription = Linking.addEventListener('url', ({ url }) => {
    console.log('Received URL event:', url);
    navigateToDeepLink(url);
  });

  // Return cleanup function
  return () => {
    console.log('Removing deep link listener');
    subscription.remove();
  };
}

/**
 * Get deep link URL for sharing.
 * 
 * @param path - App path (e.g., 'receive/voucher/123')
 * @param params - Optional query params
 * @returns Full deep link URL
 */
export function createDeepLink(path: string, params?: Record<string, string>): string {
  const baseUrl = 'buffr://';
  
  // Remove leading slash if present
  const cleanPath = path.replace(/^\//, '');
  
  // Build URL with params
  if (params && Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return `${baseUrl}${cleanPath}?${queryString}`;
  }
  
  return `${baseUrl}${cleanPath}`;
}

/**
 * Test if deep link is valid.
 * 
 * @param url - Deep link URL
 * @returns True if valid
 */
export function isValidDeepLink(url: string): boolean {
  try {
    const parsed = Linking.parse(url);
    return parsed.hostname !== null && parsed.hostname !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get app's deep link prefix for configuration.
 * 
 * @returns Deep link prefix
 */
export function getDeepLinkPrefix(): string {
  return 'buffr://';
}

/**
 * Get universal link domain (for iOS).
 * 
 * @returns Universal link domain
 */
export function getUniversalLinkDomain(): string {
  return 'buffr.app';
}
