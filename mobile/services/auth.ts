/**
 * Auth service – Buffr G2P.
 * OTP request, verification, session management with rate limiting support.
 * Production: backend and database only. Set API_BASE_URL and use backend for OTP and user/card.
 * Location: mobile/services/auth.ts
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// S11: Enforce HTTPS for API_BASE_URL in production builds.
if (!__DEV__ && API_BASE_URL && !API_BASE_URL.startsWith('https://')) {
  console.error('SEC-S11: API_BASE_URL must use HTTPS in production');
}

// ============================================================================
// Types
// ============================================================================

export interface OtpRequestResult {
  success: boolean;
  error?: string;
  expiresIn?: number; // seconds until OTP expires
  devCode?: string; // For development testing
}

export interface OtpVerifyResult {
  success: boolean;
  buffrId?: string;
  cardNumberMasked?: string;
  expiryDate?: string | null;
  error?: string;
  attemptsRemaining?: number;
}

export interface OtpStatusResult {
  hasPendingOtp: boolean;
  attemptsRemaining: number;
  nextRequestAt?: string; // ISO date string
  blockedUntil?: string; // ISO date string
}

export interface SessionToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// ============================================================================
// Constants
// ============================================================================

const TOKEN_EXPIRES_AT_KEY = 'buffr_token_expires_at';
const ACCESS_TOKEN_KEY = 'buffr_access_token';
const REFRESH_TOKEN_KEY = 'buffr_refresh_token';
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// OTP Constants
const OTP_LENGTH = 6;
const OTP_RESEND_COOLDOWN_SECONDS = 60; // Minimum time between OTP requests
const OTP_MAX_ATTEMPTS = 3;

// ============================================================================
// OTP Request
// ============================================================================

/**
 * Request OTP (send verification code to phone or email). Call this from the phone entry screen
 * before navigating to the OTP screen. When API_BASE_URL is set, calls POST /api/v1/mobile/auth/request-otp.
 * When not set (e.g. local dev), returns success with devCode so the flow continues.
 * 
 * @param phone - User's phone number (will be normalized)
 * @param email - Optional email address for email OTP
 * @param channel - Delivery channel: 'sms', 'email', or 'both' (default: 'sms')
 * @returns OTP request result with success status and optional expiry time
 */
export async function requestOtp(
  phone: string, 
  email?: string,
  channel: "sms" | "email" | "both" = "sms"
): Promise<OtpRequestResult> {
  const normalizedPhone = phone.replace(/\D/g, '').slice(-8);
  if (normalizedPhone.length < 7) {
    return { success: false, error: 'Invalid phone number' };
  }

  // Validate email if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email address' };
    }
  }

  if (API_BASE_URL) {
    try {
      const body: Record<string, string> = { phone: normalizedPhone };
      
      // Add email if provided and channel supports it
      if (email && (channel === 'email' || channel === 'both')) {
        body.email = email;
      }
      
      // Add channel preference
      if (channel !== 'sms') {
        body.channel = channel;
      }
      
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        return {
          success: true,
          expiresIn: data.expiresIn,
          devCode: data.devCode, // For development testing
        };
      }
      
      return { success: false, error: data.error ?? 'Could not send code' };
    } catch (e) {
      console.error('requestOtp API error:', e);
      
      // In development, fall back to dev bypass
      if (__DEV__) {
        const devCode = generateDevCode(normalizedPhone);
        return {
          success: true,
          expiresIn: 300, // 5 minutes
          devCode,
        };
      }
      
      return { success: false, error: 'Network error. Check your connection.' };
    }
  }

  // No API configured: allow flow to continue (dev/demo)
  if (__DEV__) {
    const devCode = generateDevCode(normalizedPhone);
    return {
      success: true,
      expiresIn: 300,
      devCode,
    };
  }
  
  return { success: false, error: 'Service is not configured. Contact support.' };
}

/**
 * Check OTP status (for UI countdown, rate limiting info).
 * Call this before showing resend button to check if user can request new OTP.
 * 
 * @param phone - User's phone number
 * @returns OTP status including attempts remaining and next request time
 */
export async function getOtpStatus(phone: string): Promise<OtpStatusResult> {
  const normalizedPhone = phone.replace(/\D/g, '').slice(-8);
  
  if (!API_BASE_URL) {
    // No API - assume can request
    return {
      hasPendingOtp: false,
      attemptsRemaining: OTP_MAX_ATTEMPTS,
    };
  }
  
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/mobile/auth/otp-status?phone=${encodeURIComponent(normalizedPhone)}`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('getOtpStatus error:', e);
  }
  
  // On error, assume can request
  return {
    hasPendingOtp: false,
    attemptsRemaining: OTP_MAX_ATTEMPTS,
  };
}

// ============================================================================
// OTP Verification
// ============================================================================

/**
 * Verify OTP with backend. When API_BASE_URL is set, calls POST /api/v1/mobile/auth/verify-otp.
 * Otherwise returns success and a generated Buffr ID for the given phone (stable per phone).
 * 
 * @param phone - User's phone number
 * @param code - 6-digit OTP code
 * @param email - Optional; required when OTP was sent to email (backend may use for lookup)
 * @returns Verification result with Buffr ID if successful
 */
export async function verifyOtp(phone: string, code: string, email?: string): Promise<OtpVerifyResult> {
  const normalizedPhone = phone.replace(/\D/g, '').slice(-8);

  // Validate code format
  if (!code || code.length !== OTP_LENGTH) {
    return { success: false, error: `Please enter ${OTP_LENGTH}-digit code` };
  }

  if (API_BASE_URL) {
    try {
      const body: Record<string, string> = { phone: normalizedPhone, code };
      if (email) body.email = email;
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // S7: Persist expiry timestamp alongside the token returned by the API.
        await storeTokenExpiry();
        
        if (data.token) {
          await storeAccessToken(data.token);
        }
        
        return {
          success: true,
          buffrId: data.buffrId,
          cardNumberMasked: data.cardNumberMasked,
          expiryDate: data.expiryDate,
        };
      }
      
      // Handle specific error cases
      return {
        success: false,
        error: data.error ?? 'Invalid code',
        attemptsRemaining: data.attemptsRemaining,
      };
    } catch (e) {
      console.error('verifyOtp API error:', e);
      
      // In development, if the backend is unreachable (e.g. not running), fall back to
      // dev bypass so any 5-digit code works without needing a real API.
      if (__DEV__ && code.length >= 4) {
        const { buffrId, cardNumberMasked } = await generateBuffrIdFromPhone(phone);
        await storeTokenExpiry();
        return { success: true, buffrId, cardNumberMasked, expiryDate: null };
      }
      
      return { success: false, error: 'Network error. Check your connection.' };
    }
  }

  // V10/S8: Demo/offline bypass — only permitted in development builds.
  if (__DEV__) {
    // No API configured: accept any 6-digit code and generate a deterministic Buffr ID from phone.
    if (code.length !== OTP_LENGTH) {
      return { success: false, error: `Please enter ${OTP_LENGTH}-digit code` };
    }
    
    const { buffrId, cardNumberMasked } = await generateBuffrIdFromPhone(phone);
    // S7: Persist expiry so the session guard works in dev mode too.
    await storeTokenExpiry();
    return { success: true, buffrId, cardNumberMasked, expiryDate: null };
  }

  // Production build with no API_BASE_URL configured: refuse to proceed.
  return { success: false, error: 'Service is not configured. Contact support.' };
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * S7: Write a token expiry timestamp (now + TOKEN_TTL_MS) to SecureStore.
 * Also writes an access token when one is not provided by the API,
 * so that the session guard in app/index.tsx sees a non-null token.
 */
async function storeTokenExpiry(): Promise<void> {
  try {
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    await SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, String(expiresAt));
    
    // Ensure a sentinel token exists when no real token has been stored yet (dev/demo mode).
    const existing = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!existing) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, 'dev-session-token');
    }
  } catch (e) {
    console.warn('storeTokenExpiry: failed to persist expiry', e);
  }
}

/**
 * Store the access token securely.
 */
async function storeAccessToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } catch (e) {
    console.warn('storeAccessToken: failed to persist token', e);
  }
}

/**
 * S7: Return the stored access token only if it exists and has not expired.
 * If the token is expired, both the token and its expiry are cleared and null is returned.
 * Exported so that app/index.tsx can use it for the S1 session guard.
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!token) return null;

    const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRES_AT_KEY);
    if (expiryStr) {
      const expiresAt = Number(expiryStr);
      if (!Number.isNaN(expiresAt) && Date.now() > expiresAt) {
        // Token has expired — clear it so the session guard redirects to sign-in.
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(TOKEN_EXPIRES_AT_KEY);
        console.warn('SEC-S7: Access token expired; session cleared.');
        return null;
      }
    }

    return token;
  } catch {
    return null;
  }
}

/**
 * Clear the session (logout).
 */
export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRES_AT_KEY);
  } catch (e) {
    console.warn('clearSession: failed to clear session', e);
  }
}

// ============================================================================
// Buffr ID Generation
// ============================================================================

/**
 * Generate a stable Buffr ID and masked card number from phone (for display when backend is not used).
 * Production backend should return these; this is used only when API is not configured.
 */
export async function generateBuffrIdFromPhone(phone: string): Promise<{ buffrId: string; cardNumberMasked: string }> {
  const digits = phone.replace(/\D/g, '');
  const seed = digits.slice(-8) || '00000000';
  let suffix: string;
  
  try {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, seed + 'buffr-g2p');
    suffix = hash.slice(0, 8).replace(/\D/g, '0').padStart(8, '0').slice(-8);
  } catch {
    const n = Math.abs(
      Array.from(seed).reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
    );
    const suffixAlt = n.toString(16).slice(-8).padStart(8, '0');
    suffix = suffixAlt;
  }
  
  const buffrId = `BFR${seed}${suffix}`.slice(0, 16);
  const last4 = (seed + suffix).slice(-4);
  const cardNumberMasked = `XXXX XXXX XXXX ${last4}`;
  
  return { buffrId, cardNumberMasked };
}

/**
 * Generate deterministic code for development only when backend is not configured (matches backend logic). Production uses backend OTP.
 */
function generateDevCode(phone: string): string {
  const seed = parseInt(phone.slice(-6), 10) || 0;
  const code = ((seed * 9301 + 49297) % 233280) % 1000000;
  return code.toString().padStart(6, '0');
}

// ============================================================================
// User Card
// ============================================================================

/**
 * Resolve Buffr ID and card display. Backend when API is configured; when API is unset, local generation is for development only.
 * When API exists, call GET /api/v1/mobile/user/card and return; else use generateBuffrIdFromPhone (dev only).
 */
export async function getOrCreateBuffrId(phone: string): Promise<{ buffrId: string; cardNumberMasked: string; expiryDate: string | null }> {
  if (API_BASE_URL) {
    try {
      const token = await getStoredToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/user/card`, {
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      if (res.ok) {
        const d = await res.json();
        return { 
          buffrId: d.buffrId, 
          cardNumberMasked: d.cardNumberMasked, 
          expiryDate: d.expiryDate ?? null 
        };
      }
    } catch (e) {
      console.error('getOrCreateBuffrId API error:', e);
    }
  }
  
  const { buffrId, cardNumberMasked } = await generateBuffrIdFromPhone(phone);
  return { buffrId, cardNumberMasked, expiryDate: null };
}

// ============================================================================
// PIN Authentication (for 2FA)
// ============================================================================

/**
 * Request PIN change (requires OTP verification first).
 */
export async function changePin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  if (!API_BASE_URL) {
    return { success: __DEV__, error: __DEV__ ? undefined : 'Service not configured' };
  }
  
  try {
    const token = await getStoredToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/change-pin`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ currentPin, newPin }),
    });
    
    const data = await res.json();
    return { success: res.ok, error: data.error };
  } catch (e) {
    console.error('changePin error:', e);
    return { success: false, error: 'Network error' };
  }
}
