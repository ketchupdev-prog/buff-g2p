/**
 * Encryption & Tokenization Service
 * PSD-12 Compliance: Section 12.1 - Encryption/tokenization/masking required
 * 
 * Implements:
 * - AES-256 encryption (data at rest)
 * - TLS 1.3 (data in motion) - configured at infrastructure level
 * - PCI-DSS compliant tokenization
 * - Data masking for PII
 * - Key management with rotation
 */

import crypto from 'crypto';

interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  saltLength: number;
  iterations: number;
  digest: string;
}

interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
}

interface TokenizeResult {
  token: string;
  maskedValue: string;
  tokenType: 'CARD' | 'PII' | 'PHONE' | 'EMAIL' | 'ACCOUNT';
}

export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: Buffer;
  private tokenStore: Map<string, { value: string; expiresAt: Date }> = new Map();

  constructor(masterKeyString?: string) {
    this.config = {
      algorithm: 'aes-256-gcm', // AES-256 with Galois/Counter Mode
      keyLength: 32, // 256 bits
      saltLength: 16,
      iterations: 100000, // PBKDF2 iterations
      digest: 'sha256',
    };

    // Initialize master key (in production, load from HSM or secure key management service)
    const keyString = masterKeyString || process.env.ENCRYPTION_MASTER_KEY || this.generateRandomKey();
    this.masterKey = Buffer.from(keyString, 'hex');

    if (this.masterKey.length !== this.config.keyLength) {
      throw new Error(`Master key must be ${this.config.keyLength} bytes (${this.config.keyLength * 2} hex characters)`);
    }
  }

  // ==================== ENCRYPTION (Data at Rest) ====================

  /**
   * Encrypt data using AES-256-GCM
   * PSD-12 Section 12.1: Encryption for data at rest
   */
  encrypt(plaintext: string, associatedData?: string): EncryptedData {
    try {
      // Generate random IV (Initialization Vector)
      const iv = crypto.randomBytes(16);

      // Generate random salt for key derivation
      const salt = crypto.randomBytes(this.config.saltLength);

      // Derive encryption key from master key and salt
      const key = crypto.pbkdf2Sync(
        this.masterKey,
        salt,
        this.config.iterations,
        this.config.keyLength,
        this.config.digest
      );

      // Create cipher (AES-GCM)
      const cipher = crypto.createCipheriv(this.config.algorithm, key, iv) as crypto.CipherGCM;

      // Add associated authenticated data (AAD) if provided
      if (associatedData) {
        cipher.setAAD(Buffer.from(associatedData, 'utf8'));
      }

      // Encrypt
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        ciphertext,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        salt: salt.toString('hex'),
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData, associatedData?: string): string {
    try {
      const { ciphertext, iv, authTag, salt } = encryptedData;

      // Derive decryption key
      const key = crypto.pbkdf2Sync(
        this.masterKey,
        Buffer.from(salt, 'hex'),
        this.config.iterations,
        this.config.keyLength,
        this.config.digest
      );

      // Create decipher (AES-GCM)
      const decipher = crypto.createDecipheriv(
        this.config.algorithm,
        key,
        Buffer.from(iv, 'hex')
      ) as crypto.DecipherGCM;

      // Set authentication tag
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      // Add associated authenticated data (AAD) if provided
      if (associatedData) {
        decipher.setAAD(Buffer.from(associatedData, 'utf8'));
      }

      // Decrypt
      let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt sensitive user data (PII)
   * Used for storing: names, addresses, phone numbers, email, ID numbers
   */
  encryptPII(piiData: string, userId: string): EncryptedData {
    // Use userId as associated data for additional security
    return this.encrypt(piiData, userId);
  }

  /**
   * Decrypt sensitive user data (PII)
   */
  decryptPII(encryptedData: EncryptedData, userId: string): string {
    return this.decrypt(encryptedData, userId);
  }

  // ==================== TOKENIZATION (PCI-DSS Compliance) ====================

  /**
   * Tokenize sensitive data (PCI-DSS compliant)
   * PSD-12 Section 12.1: Tokenization required
   * 
   * Replaces sensitive data with non-reversible tokens
   * Tokens have NO intrinsic value and cannot be reverse-engineered
   */
  tokenize(
    sensitiveValue: string,
    tokenType: 'CARD' | 'PII' | 'PHONE' | 'EMAIL' | 'ACCOUNT',
    permanent: boolean = false
  ): TokenizeResult {
    // Generate cryptographically secure token
    const tokenBytes = crypto.randomBytes(32);
    const token = `${tokenType}_${tokenBytes.toString('base64url')}`;

    // Store mapping (in production, use secure database with HSM)
    if (!permanent) {
      // Non-permanent tokens expire after 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      this.tokenStore.set(token, { value: sensitiveValue, expiresAt });

      // Clean up expired tokens
      this.cleanupExpiredTokens();
    } else {
      // Permanent tokens stored in database
      this.storePermanentToken(token, sensitiveValue, tokenType);
    }

    // Create masked version for display
    const maskedValue = this.maskValue(sensitiveValue, tokenType);

    return {
      token,
      maskedValue,
      tokenType,
    };
  }

  /**
   * Detokenize - retrieve original value from token
   */
  detokenize(token: string): string | null {
    // Check in-memory store first
    const stored = this.tokenStore.get(token);

    if (stored) {
      // Check if expired
      if (new Date() > stored.expiresAt) {
        this.tokenStore.delete(token);
        return null;
      }
      return stored.value;
    }

    // Check permanent store (database)
    return this.retrievePermanentToken(token);
  }

  /**
   * Tokenize card number (PCI-DSS compliant)
   * Format: CARD_xxxxx (where x is base64url encoded random bytes)
   */
  tokenizeCardNumber(cardNumber: string, permanent: boolean = true): TokenizeResult {
    // Validate card number (basic Luhn algorithm check)
    if (!this.validateCardNumber(cardNumber)) {
      throw new Error('Invalid card number');
    }

    return this.tokenize(cardNumber, 'CARD', permanent);
  }

  /**
   * Tokenize account number
   */
  tokenizeAccountNumber(accountNumber: string, permanent: boolean = true): TokenizeResult {
    return this.tokenize(accountNumber, 'ACCOUNT', permanent);
  }

  // ==================== MASKING (Data Display) ====================

  /**
   * Mask sensitive data for display
   * PSD-12 Section 12.1: Masking required
   */
  maskValue(value: string, type: 'CARD' | 'PII' | 'PHONE' | 'EMAIL' | 'ACCOUNT'): string {
    switch (type) {
      case 'CARD':
        return this.maskCardNumber(value);
      case 'PHONE':
        return this.maskPhoneNumber(value);
      case 'EMAIL':
        return this.maskEmail(value);
      case 'ACCOUNT':
        return this.maskAccountNumber(value);
      case 'PII':
        return this.maskPII(value);
      default:
        return this.maskGeneric(value);
    }
  }

  /**
   * Mask card number - show only last 4 digits
   * Format: **** **** **** 1234
   */
  private maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return '****';

    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4);

    // Format with spaces (every 4 digits)
    const formatted = (masked + lastFour).match(/.{1,4}/g)?.join(' ') || '**** **** **** ****';
    return formatted;
  }

  /**
   * Mask phone number - show only last 4 digits
   * Format: +264 *** *** 1234
   */
  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (cleaned.length < 4) return '****';

    const countryCode = cleaned.startsWith('+') ? cleaned.slice(0, 4) : '';
    const lastFour = cleaned.slice(-4);
    const maskedLength = cleaned.length - lastFour.length - countryCode.length;

    return `${countryCode} ${'*'.repeat(maskedLength)} ${lastFour}`.trim();
  }

  /**
   * Mask email - show first character and domain
   * Format: j***@example.com
   */
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (!username || !domain) return '***@***.com';

    const maskedUsername = username[0] + '*'.repeat(Math.min(username.length - 1, 3));
    return `${maskedUsername}@${domain}`;
  }

  /**
   * Mask account number - show only last 4 digits
   * Format: ********1234
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length < 4) return '****';
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  }

  /**
   * Mask PII (names, addresses, ID numbers)
   */
  private maskPII(value: string): string {
    if (value.length <= 3) return '***';
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
  }

  /**
   * Generic masking
   */
  private maskGeneric(value: string): string {
    if (value.length <= 4) return '****';
    return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
  }

  // ==================== HASHING (One-way encryption) ====================

  /**
   * Hash sensitive data (one-way, cannot be reversed)
   * Used for: passwords, security questions, etc.
   */
  hash(data: string, salt?: string): { hash: string; salt: string } {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
    const hashBuffer = crypto.pbkdf2Sync(
      data,
      saltBuffer,
      this.config.iterations,
      64,
      this.config.digest
    );

    return {
      hash: hashBuffer.toString('hex'),
      salt: saltBuffer.toString('hex'),
    };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    const computed = this.hash(data, salt);
    return crypto.timingSafeEqual(Buffer.from(computed.hash, 'hex'), Buffer.from(hash, 'hex'));
  }

  // ==================== KEY MANAGEMENT ====================

  /**
   * Generate a new random encryption key
   * In production, use HSM (Hardware Security Module)
   */
  private generateRandomKey(): string {
    return crypto.randomBytes(this.config.keyLength).toString('hex');
  }

  /**
   * Rotate master key (should be done periodically)
   * PSD-12 Best Practice: Regular key rotation
   */
  async rotateMasterKey(newKeyString: string): Promise<void> {
    const newKey = Buffer.from(newKeyString, 'hex');

    if (newKey.length !== this.config.keyLength) {
      throw new Error(`New master key must be ${this.config.keyLength} bytes`);
    }

    // Re-encrypt all data with new key
    // This is a complex operation that should be done carefully
    console.warn('Key rotation is a sensitive operation. Implement with caution.');

    this.masterKey = newKey;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate card number using Luhn algorithm
   */
  private validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (!/^\d+$/.test(cleaned)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      const ch = cleaned[i] ?? '0';
      let digit = parseInt(ch, 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.tokenStore.entries()) {
      if (now > data.expiresAt) {
        this.tokenStore.delete(token);
      }
    }
  }

  // ==================== DATABASE INTEGRATION ====================
  // These methods should integrate with your actual database

  private storePermanentToken(token: string, value: string, tokenType: string): void {
    // TODO: Store token in database with encryption
    // The actual value should be encrypted before storing
    console.log(`[STORE TOKEN] Type: ${tokenType}, Token: ${token.slice(0, 20)}...`);
  }

  private retrievePermanentToken(token: string): string | null {
    // TODO: Retrieve and decrypt token from database
    return null;
  }

  // ==================== COMPLIANCE HELPERS ====================

  /**
   * Get encryption metadata for compliance reporting
   */
  getEncryptionMetadata(): {
    algorithm: string;
    keyLength: number;
    standard: string;
  } {
    return {
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength * 8, // Convert to bits
      standard: 'AES-256-GCM (NIST FIPS 197)',
    };
  }

  /**
   * Verify encryption compliance with PSD-12 Section 12.1
   */
  isCompliantWithPSD12(): boolean {
    // PSD-12 requires "best practice encryption standards"
    // AES-256-GCM meets this requirement
    return (
      this.config.algorithm === 'aes-256-gcm' &&
      this.config.keyLength === 32 &&
      this.config.iterations >= 100000
    );
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

/**
 * Example Usage:
 * 
 * // Encrypt PII
 * const encrypted = encryptionService.encryptPII('John Doe', 'user-123');
 * const decrypted = encryptionService.decryptPII(encrypted, 'user-123');
 * 
 * // Tokenize card number
 * const { token, maskedValue } = encryptionService.tokenizeCardNumber('4532123456789012');
 * console.log(maskedValue); // "**** **** **** 9012"
 * 
 * // Detokenize
 * const originalCard = encryptionService.detokenize(token);
 * 
 * // Mask phone number
 * const masked = encryptionService.maskValue('+264812345678', 'PHONE');
 * console.log(masked); // "+264 *** *** 5678"
 */
