/**
 * Accessibility Utilities
 * 
 * Helper functions and utilities for WCAG 2.1 Level AA compliance.
 * Includes contrast checking, screen reader support, and dynamic type.
 * 
 * Location: mobile/utils/accessibility.ts
 */

import { AccessibilityInfo, Platform, PixelRatio } from 'react-native';
import { useState, useEffect } from 'react';

/**
 * Calculate contrast ratio between two colors.
 * WCAG 2.1 requires 4.5:1 for normal text, 3:1 for large text.
 * 
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @returns Contrast ratio
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fgLuminance = getRelativeLuminance(foreground);
  const bgLuminance = getRelativeLuminance(background);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color.
 * 
 * @param hexColor - Color in hex format
 * @returns Relative luminance (0-1)
 */
function getRelativeLuminance(hexColor: string): number {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

/**
 * Check if contrast meets WCAG AA standards.
 * 
 * @param foreground - Foreground color
 * @param background - Background color
 * @param isLargeText - Is text large (≥18pt or ≥14pt bold)
 * @returns True if contrast is sufficient
 */
export function meetsContrastRequirement(
  foreground: string, 
  background: string, 
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}

/**
 * Hook to detect if screen reader is enabled.
 * 
 * @returns True if screen reader is active
 */
export function useScreenReaderEnabled(): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  
  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isScreenReaderEnabled().then(setIsEnabled);
    
    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsEnabled
    );
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  return isEnabled;
}

/**
 * Hook to detect if reduce motion is enabled.
 * 
 * @returns True if reduce motion is enabled
 */
export function useReduceMotion(): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  
  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled().then(setIsEnabled);
    
    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsEnabled
    );
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  return isEnabled;
}

/**
 * Hook to detect if reduce transparency is enabled (iOS).
 * 
 * @returns True if reduce transparency is enabled
 */
export function useReduceTransparency(): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    
    // Check initial state
    AccessibilityInfo.isReduceTransparencyEnabled?.().then(setIsEnabled);
    
    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setIsEnabled
    );
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  return isEnabled;
}

/**
 * Hook for font scale factor.
 * Respects user's system font size preferences.
 * 
 * @returns Current font scale factor
 */
export function useFontScale(): number {
  const [fontScale, setFontScale] = useState(PixelRatio.getFontScale());
  
  useEffect(() => {
    // Note: React Native doesn't provide a direct listener for font scale changes
    // This is a simplified version - for production, consider a more robust solution
    const checkFontScale = () => {
      const newScale = PixelRatio.getFontScale();
      if (newScale !== fontScale) {
        setFontScale(newScale);
      }
    };
    
    const interval = setInterval(checkFontScale, 1000);
    
    return () => clearInterval(interval);
  }, [fontScale]);
  
  return fontScale;
}

/**
 * Get scaled font size based on user's font scale preferences.
 * 
 * @param baseFontSize - Base font size
 * @param maxScale - Maximum scale factor (default 1.3)
 * @returns Scaled font size
 */
export function getScaledFontSize(baseFontSize: number, maxScale: number = 1.3): number {
  const fontScale = PixelRatio.getFontScale();
  const scale = Math.min(fontScale, maxScale);
  return baseFontSize * scale;
}

/**
 * Announce message to screen reader.
 * 
 * @param message - Message to announce
 * @param options - Announcement options
 */
export function announceForAccessibility(
  message: string, 
  options?: { queue?: boolean }
): void {
  AccessibilityInfo.announceForAccessibility(message);
  console.log('[Screen Reader]:', message);
}

/**
 * Set accessibility focus to a specific element.
 * 
 * @param reactTag - React tag of element to focus
 */
export function setAccessibilityFocus(reactTag: number): void {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
}

/**
 * Check if bold text is enabled (iOS).
 * 
 * @returns True if bold text is enabled
 */
export async function isBoldTextEnabled(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  try {
    return await AccessibilityInfo.isBoldTextEnabled?.() || false;
  } catch {
    return false;
  }
}

/**
 * Check if grayscale is enabled (iOS).
 * 
 * @returns True if grayscale is enabled
 */
export async function isGrayscaleEnabled(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  try {
    return await AccessibilityInfo.isGrayscaleEnabled?.() || false;
  } catch {
    return false;
  }
}

/**
 * Get minimum touch target size based on platform.
 * 
 * @returns Minimum touch target size (dp)
 */
export function getMinimumTouchTargetSize(): number {
  // WCAG 2.1 AA: minimum 44x44 dp
  // Apple HIG: minimum 44x44 pt
  // Material Design: minimum 48x48 dp
  return Platform.OS === 'ios' ? 44 : 48;
}

/**
 * Validate if element meets minimum touch target size.
 * 
 * @param width - Element width
 * @param height - Element height
 * @returns True if meets minimum size
 */
export function meetsTouchTargetSize(width: number, height: number): boolean {
  const minSize = getMinimumTouchTargetSize();
  return width >= minSize && height >= minSize;
}

/**
 * Get accessible label for amount.
 * 
 * @param amount - Amount
 * @param currency - Currency code
 * @returns Accessible label
 */
export function getAccessibleAmountLabel(amount: number, currency: string = 'NAD'): string {
  return `${currency} ${amount.toFixed(2)} ${currency === 'NAD' ? 'Namibian Dollars' : ''}`;
}

/**
 * Get accessible label for date.
 * 
 * @param date - Date object or ISO string
 * @returns Accessible label
 */
export function getAccessibleDateLabel(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get accessible label for status.
 * 
 * @param status - Status string
 * @returns Accessible label
 */
export function getAccessibleStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Status: Pending',
    'completed': 'Status: Completed',
    'failed': 'Status: Failed',
    'cancelled': 'Status: Cancelled',
    'active': 'Status: Active',
    'frozen': 'Status: Frozen - action required',
    'available': 'Status: Available',
    'expired': 'Status: Expired',
    'redeemed': 'Status: Redeemed'
  };
  
  return statusMap[status.toLowerCase()] || `Status: ${status}`;
}
