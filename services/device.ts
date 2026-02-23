/**
 * Device integration – Buffr G2P.
 * Wrappers for location, gallery, camera (picker), and biometrics.
 * Used by Location/Agents map, onboarding photo, 2FA, proof-of-life. §11.3.2.
 * Location: services/device.ts
 */
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';

// ─── Location ─────────────────────────────────────────────────────────────

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Request foreground location permission. Returns status. */
export async function requestLocationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  } catch (e) {
    console.error('requestLocationPermission error:', e);
    return 'denied';
  }
}

/** Get current position. Requests permission if needed. Returns coords or null. */
export async function getCurrentLocation(): Promise<Coords | null> {
  try {
    const status = await requestLocationPermission();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: 0,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (e) {
    console.error('getCurrentLocation error:', e);
    return null;
  }
}

/** Check if location permission is granted (no prompt). */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Gallery & Camera (image picker) ──────────────────────────────────────

/** Pick a single image from gallery. Returns asset URI or null if cancelled/error. */
export async function pickImageFromGallery(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (e) {
    console.error('pickImageFromGallery error:', e);
    return null;
  }
}

/** Capture a single image with camera. Returns asset URI or null if cancelled/error. */
export async function captureImage(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  } catch (e) {
    console.error('captureImage error:', e);
    return null;
  }
}

// ─── Biometrics ────────────────────────────────────────────────────────────

/** Check if device has biometric hardware and it is enrolled. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/** Get supported biometric types (e.g. fingerprint, facial). */
export async function getBiometricTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
  try {
    return await LocalAuthentication.supportedAuthenticationTypesAsync();
  } catch {
    return [];
  }
}

/** Prompt user for biometric authentication. Returns true if successful. */
export async function authenticateWithBiometric(
  options?: { promptMessage?: string; cancelLabel?: string }
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage ?? 'Verify your identity',
      cancelLabel: options?.cancelLabel ?? 'Cancel',
    });
    return result.success;
  } catch (e) {
    console.error('authenticateWithBiometric error:', e);
    return false;
  }
}
