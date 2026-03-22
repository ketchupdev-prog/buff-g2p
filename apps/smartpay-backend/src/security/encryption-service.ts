/**
 * PII Encryption Service - PSD-12 §11 Compliance
 * 
 * Implements AES-256-GCM encryption for PII data protection.
 * Required by PSD-12 Section 11: All PII must be encrypted/tokenized/masked.
 * 
 * Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Separate keys for different PII types
 * - Deterministic hashing for searchable fields
 * - IV (Initialization Vector) included in output
 * - Zero dependencies (uses Node.js crypto)
 * 
 * Location: fintech/apps/smartpay-backend/src/security/encryption-service.ts
 */

import * as crypto from 'crypto';

// Encryption algorithm (PSD-12 compliant)
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // For key derivation

/**
 * Environment variable names for encryption keys
 */
export const KEY_ENV_NAMES = {
  MAIN: 'PII_ENCRYPTION_KEY',
  PHONE: 'PII_PHONE_KEY',
  EMAIL: 'PII_EMAIL_KEY',
  WALLET: 'PII_WALLET_KEY',
} as const;

/**
 * Key types for different PII categories
 */
export type KeyType = 'phone' | 'email' | 'wallet' | 'main';

/**
 * Encryption result containing ciphertext and metadata
 */
export interface EncryptionResult {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  authTag: string; // Base64 encoded
  version: number; // For future key rotation
}

/**
 * Get encryption key from environment variables
 */
function getKey(keyType: KeyType = 'main'): Buffer {
  const envMap: Record<KeyType, string> = {
    phone: KEY_ENV_NAMES.PHONE,
    email: KEY_ENV_NAMES.EMAIL,
    wallet: KEY_ENV_NAMES.WALLET,
    main: KEY_ENV_NAMES.MAIN,
  };

  const envVarName = envMap[keyType];
  const keyBase64 = process.env[envVarName];

  if (!keyBase64) {
    throw new Error(
      `Missing encryption key: ${envVarName}. ` +
      `Generate with: openssl rand -base64 32`
    );
  }

  try {
    const key = Buffer.from(keyBase64, 'base64');
    
    if (key.length !== KEY_LENGTH) {
      throw new Error(
        `Invalid key length for ${envVarName}: expected ${KEY_LENGTH} bytes, got ${key.length}`
      );
    }

    return key;
  } catch (error) {
    throw new Error(
      `Invalid base64 key for ${envVarName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Encrypt PII data using AES-256-GCM
 * 
 * @param plaintext - The data to encrypt
 * @param keyType - Type of key to use (phone, email, wallet, main)
 * @returns Base64 encoded encrypted string in format: version:iv:authTag:ciphertext
 * 
 * @example
 * const encrypted = encryptPII('+264812345678', 'phone');
 * // Returns: "1:abc123...:def456...:ghi789..."
 */
export function encryptPII(plaintext: string, keyType: KeyType = 'main'): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  try {
    const key = getKey(keyType);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    // Format: version:iv:authTag:ciphertext
    // Version 1 = AES-256-GCM
    const result = [
      '1',
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext,
    ].join(':');

    return result;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt PII data encrypted with encryptPII
 * 
 * @param encrypted - Encrypted string in format: version:iv:authTag:ciphertext
 * @param keyType - Type of key to use (must match encryption key)
 * @returns Decrypted plaintext
 * 
 * @example
 * const decrypted = decryptPII('1:abc123...:def456...:ghi789...', 'phone');
 * // Returns: "+264812345678"
 */
export function decryptPII(encrypted: string, keyType: KeyType = 'main'): string {
  if (!encrypted || typeof encrypted !== 'string') {
    throw new Error('Encrypted data must be a non-empty string');
  }

  try {
    const parts = encrypted.split(':');
    
    if (parts.length !== 4) {
      throw new Error(
        `Invalid encrypted format: expected 4 parts (version:iv:authTag:ciphertext), got ${parts.length}`
      );
    }

    const [version, ivBase64, authTagBase64, ciphertext] = parts;

    if (version !== '1') {
      throw new Error(`Unsupported encryption version: ${version}`);
    }

    const key = getKey(keyType);
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create deterministic hash for searchable fields (phone, email)
 * Uses HMAC-SHA256 for consistency and security.
 * 
 * @param plaintext - The data to hash
 * @param keyType - Type of key to use (phone, email, etc.)
 * @returns Hex-encoded hash (64 characters)
 * 
 * @example
 * const hash = hashForSearch('+264812345678', 'phone');
 * // Returns: "a3f2c1..." (consistent for same input)
 * 
 * // Use in SQL WHERE clause:
 * // WHERE phone_hash = $1
 */
export function hashForSearch(plaintext: string, keyType: KeyType = 'main'): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  try {
    const key = getKey(keyType);
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(plaintext);
    return hmac.digest('hex');
  } catch (error) {
    throw new Error(
      `Hash generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Encrypt phone number for storage
 */
export function encryptPhone(phone: string): string {
  return encryptPII(phone, 'phone');
}

/**
 * Decrypt phone number from storage
 */
export function decryptPhone(encrypted: string): string {
  return decryptPII(encrypted, 'phone');
}

/**
 * Create searchable hash for phone number
 */
export function hashPhone(phone: string): string {
  return hashForSearch(phone, 'phone');
}

/**
 * Encrypt email for storage
 */
export function encryptEmail(email: string): string {
  return encryptPII(email, 'email');
}

/**
 * Decrypt email from storage
 */
export function decryptEmail(encrypted: string): string {
  return decryptPII(encrypted, 'email');
}

/**
 * Create searchable hash for email
 */
export function hashEmail(email: string): string {
  return hashForSearch(email, 'email');
}

/**
 * Encrypt wallet identifier for storage
 */
export function encryptWalletIdentifier(identifier: string): string {
  return encryptPII(identifier, 'wallet');
}

/**
 * Decrypt wallet identifier from storage
 */
export function decryptWalletIdentifier(encrypted: string): string {
  return decryptPII(encrypted, 'wallet');
}

/**
 * Mask PII for display/logging (does not require encryption keys)
 * 
 * @param value - Value to mask
 * @param type - Type of value (phone, email, card, etc.)
 * @returns Masked value
 * 
 * @example
 * maskPII('+264812345678', 'phone') // Returns: '*********5678' (all but last 4 masked)
 * maskPII('user@example.com', 'email') // Returns: 'u***@example.com'
 */
export function maskPII(value: string, type: 'phone' | 'email' | 'card' = 'phone'): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  switch (type) {
    case 'phone':
      // Show last 4 digits
      if (value.length <= 4) return '*'.repeat(value.length);
      return '*'.repeat(value.length - 4) + value.slice(-4);

    case 'email': {
      const atIndex = value.indexOf('@');
      if (atIndex <= 0) return value;
      
      const localPart = value.slice(0, atIndex);
      const domain = value.slice(atIndex);
      
      if (localPart.length <= 1) {
        return localPart + '***' + domain;
      }
      
      return localPart[0] + '***' + domain;
    }

    case 'card':
      // Show last 4 digits
      if (value.length <= 4) return '*'.repeat(value.length);
      return '*'.repeat(value.length - 4) + value.slice(-4);

    default:
      // Generic masking
      if (value.length <= 4) return '*'.repeat(value.length);
      return '*'.repeat(value.length - 4) + value.slice(-4);
  }
}

/**
 * Validate that all required encryption keys are configured
 * Call this on server startup to fail fast if keys are missing.
 * 
 * @throws Error if any required keys are missing or invalid
 */
export function validateEncryptionKeys(): void {
  const errors: string[] = [];

  const keyTypes: KeyType[] = ['main', 'phone', 'email', 'wallet'];

  for (const keyType of keyTypes) {
    try {
      getKey(keyType);
    } catch (error) {
      errors.push(
        `${keyType}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Encryption key validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n\n` +
      `Generate keys with: openssl rand -base64 32`
    );
  }
}

/**
 * Generate a random encryption key (for setup/testing)
 * 
 * @returns Base64 encoded key suitable for .env file
 * 
 * @example
 * const key = generateEncryptionKey();
 * console.log(`PII_ENCRYPTION_KEY=${key}`);
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Test encryption/decryption roundtrip
 * Useful for validating keys are working correctly
 * 
 * @param keyType - Type of key to test
 * @returns true if test passes
 * @throws Error if test fails
 */
export function testEncryption(keyType: KeyType = 'main'): boolean {
  const testData = 'test-data-' + Date.now();
  
  try {
    const encrypted = encryptPII(testData, keyType);
    const decrypted = decryptPII(encrypted, keyType);
    
    if (decrypted !== testData) {
      throw new Error(
        `Encryption roundtrip failed: expected "${testData}", got "${decrypted}"`
      );
    }

    // Test hash consistency
    const hash1 = hashForSearch(testData, keyType);
    const hash2 = hashForSearch(testData, keyType);
    
    if (hash1 !== hash2) {
      throw new Error('Hash function is not deterministic');
    }

    return true;
  } catch (error) {
    throw new Error(
      `Encryption test failed for ${keyType}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Export all functions
export default {
  encryptPII,
  decryptPII,
  hashForSearch,
  encryptPhone,
  decryptPhone,
  hashPhone,
  encryptEmail,
  decryptEmail,
  hashEmail,
  encryptWalletIdentifier,
  decryptWalletIdentifier,
  maskPII,
  validateEncryptionKeys,
  generateEncryptionKey,
  testEncryption,
};
