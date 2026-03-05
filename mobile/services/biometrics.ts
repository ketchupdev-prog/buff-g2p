/**
 * Biometric Authentication Service
 * 
 * Purpose: Handle Face ID, Touch ID, and biometric authentication
 * Location: mobile/services/biometrics.ts
 * 
 * Features:
 * - Check device biometric support
 * - Authenticate with biometrics
 * - Store biometric preferences
 * - Handle fallback to PIN
 */

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';

export interface BiometricCapability {
  isAvailable: boolean;
  supportedTypes: string[];
  isEnrolled: boolean;
}

/**
 * Check if biometric authentication is available on device
 */
export async function checkBiometricCapability(): Promise<BiometricCapability> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    const typeNames = supportedTypes.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Touch ID / Fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID / Face Recognition';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris Recognition';
        default:
          return 'Biometric';
      }
    });
    
    return {
      isAvailable: compatible && enrolled,
      supportedTypes: typeNames,
      isEnrolled: enrolled
    };
  } catch (error) {
    console.error('Error checking biometric capability:', error);
    return {
      isAvailable: false,
      supportedTypes: [],
      isEnrolled: false
    };
  }
}

/**
 * Authenticate user with biometrics
 * @param promptMessage - Custom message to show in auth prompt
 * @param cancelLabel - Custom cancel button label
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to continue',
  cancelLabel: string = 'Cancel'
): Promise<{ success: boolean; error?: string }> {
  try {
    const capability = await checkBiometricCapability();
    
    if (!capability.isAvailable) {
      return {
        success: false,
        error: capability.isEnrolled 
          ? 'Biometric authentication not available on this device'
          : 'No biometric credentials enrolled. Please set up Face ID or Touch ID in device settings.'
      };
    }
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });
    
    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error === 'user_cancel'
          ? 'Authentication cancelled'
          : 'Authentication failed'
      };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'Authentication error occurred'
    };
  }
}

/**
 * Check if user has enabled biometric authentication
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric enabled:', error);
    return false;
  }
}

/**
 * Enable biometric authentication for user
 */
export async function enableBiometric(): Promise<{ success: boolean; error?: string }> {
  try {
    const capability = await checkBiometricCapability();
    
    if (!capability.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication not available'
      };
    }
    
    // Test authentication before enabling
    const authResult = await authenticateWithBiometrics(
      'Verify your identity to enable biometric login',
      'Cancel'
    );
    
    if (authResult.success) {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      return { success: true };
    } else {
      return authResult;
    }
  } catch (error) {
    console.error('Error enabling biometric:', error);
    return {
      success: false,
      error: 'Failed to enable biometric authentication'
    };
  }
}

/**
 * Disable biometric authentication for user
 */
export async function disableBiometric(): Promise<void> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
  } catch (error) {
    console.error('Error disabling biometric:', error);
  }
}

/**
 * Authenticate for sensitive operations (send money, cash out, etc.)
 * Falls back to PIN if biometric is not available or disabled
 */
export async function authenticateForSensitiveOperation(
  operation: string = 'complete this action'
): Promise<{ success: boolean; error?: string; usedBiometric: boolean }> {
  try {
    const biometricEnabled = await isBiometricEnabled();
    
    if (!biometricEnabled) {
      return {
        success: false,
        error: 'PIN_REQUIRED',
        usedBiometric: false
      };
    }
    
    const result = await authenticateWithBiometrics(
      `Confirm to ${operation}`,
      'Cancel'
    );
    
    return {
      ...result,
      usedBiometric: result.success
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      usedBiometric: false
    };
  }
}
