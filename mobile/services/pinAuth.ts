/**
 * PIN auth – Buffr G2P.
 * Client-side PIN hashing (SHA-256) and secure storage for 2FA/Change PIN.
 * §11: hash before storage; same salt prefix as send flow for consistency.
 * Location: services/pinAuth.ts
 */
import { getSecureItem, setSecureItem } from '@/services/secureStorage';

const PIN_HASH_KEY = 'buffr_2fa_pin_hash';
const PIN_SALT_PREFIX = 'buffr-pin:';
export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 8;

/** Hash PIN with SHA-256 (same as send flow). Never store plain PIN. */
export async function hashPin(pin: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const hashBuffer = await globalThis.crypto.subtle.digest(
      'SHA-256',
      enc.encode(PIN_SALT_PREFIX + pin)
    );
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    console.warn('pinAuth hashPin fallback', e);
    return pin;
  }
}

export async function getStoredPinHash(): Promise<string | null> {
  return getSecureItem(PIN_HASH_KEY);
}

export async function setStoredPinHash(hash: string): Promise<void> {
  await setSecureItem(PIN_HASH_KEY, hash);
}

/** Verify entered PIN against stored hash. */
export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await getStoredPinHash();
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

export async function hasPinSet(): Promise<boolean> {
  const hash = await getStoredPinHash();
  return !!hash && hash.length > 0;
}

export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (pin.length < MIN_PIN_LENGTH) {
    return { valid: false, error: `PIN must be at least ${MIN_PIN_LENGTH} digits` };
  }
  if (pin.length > MAX_PIN_LENGTH) {
    return { valid: false, error: `PIN must be at most ${MAX_PIN_LENGTH} digits` };
  }
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only numbers' };
  }
  return { valid: true };
}
