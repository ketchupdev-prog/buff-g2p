/**
 * PII Encryption Service Tests - PSD-12 §11 Compliance
 * 
 * Tests encryption, decryption, hashing, and validation for PII data.
 * 
 * Coverage:
 * - Encryption/decryption roundtrip
 * - Hash consistency and determinism
 * - Different key types
 * - Error handling
 * - Performance benchmarks
 * 
 * Location: fintech/apps/smartpay-backend/__tests__/security/encryption.test.ts
 */

import {
  encryptPII,
  decryptPII,
  hashForSearch,
  encryptPhone,
  decryptPhone,
  hashPhone,
  encryptEmail,
  decryptEmail,
  hashEmail,
  maskPII,
  validateEncryptionKeys,
  generateEncryptionKey,
  testEncryption,
  KEY_ENV_NAMES,
} from '../../src/security/encryption-service';

// Setup test encryption keys
beforeAll(() => {
  // Generate test keys
  process.env[KEY_ENV_NAMES.MAIN] = generateEncryptionKey();
  process.env[KEY_ENV_NAMES.PHONE] = generateEncryptionKey();
  process.env[KEY_ENV_NAMES.EMAIL] = generateEncryptionKey();
  process.env[KEY_ENV_NAMES.WALLET] = generateEncryptionKey();
});

describe('PII Encryption Service', () => {
  describe('Key Management', () => {
    test('should validate all encryption keys are configured', () => {
      expect(() => validateEncryptionKeys()).not.toThrow();
    });

    test('should generate valid encryption key', () => {
      const key = generateEncryptionKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      // Base64 key should be ~44 characters for 32 bytes
      expect(key.length).toBeGreaterThan(40);
    });

    test('should throw error when key is missing', () => {
      const originalKey = process.env[KEY_ENV_NAMES.MAIN];
      delete process.env[KEY_ENV_NAMES.MAIN];

      expect(() => validateEncryptionKeys()).toThrow(/Missing encryption key/);

      // Restore key
      process.env[KEY_ENV_NAMES.MAIN] = originalKey;
    });

    test('should throw error when key is invalid format', () => {
      const originalKey = process.env[KEY_ENV_NAMES.MAIN];
      process.env[KEY_ENV_NAMES.MAIN] = 'invalid-key';

      expect(() => validateEncryptionKeys()).toThrow(/Invalid/);

      // Restore key
      process.env[KEY_ENV_NAMES.MAIN] = originalKey;
    });
  });

  describe('Encryption/Decryption', () => {
    test('should encrypt and decrypt plaintext correctly', () => {
      const plaintext = 'sensitive-data-123';
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    test('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'sensitive-data-123';
      const encrypted1 = encryptPII(plaintext);
      const encrypted2 = encryptPII(plaintext);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(decryptPII(encrypted1)).toBe(plaintext);
      expect(decryptPII(encrypted2)).toBe(plaintext);
    });

    test('should encrypt phone number', () => {
      const phone = '+264812345678';
      const encrypted = encryptPhone(phone);
      const decrypted = decryptPhone(encrypted);

      expect(decrypted).toBe(phone);
      expect(encrypted).not.toBe(phone);
      expect(encrypted).toContain(':'); // Version:IV:AuthTag:Ciphertext format
    });

    test('should encrypt email address', () => {
      const email = 'user@example.com';
      const encrypted = encryptEmail(email);
      const decrypted = decryptEmail(encrypted);

      expect(decrypted).toBe(email);
      expect(encrypted).not.toBe(email);
    });

    test('should handle empty string', () => {
      expect(() => encryptPII('')).toThrow(/non-empty string/);
    });

    test('should handle null/undefined', () => {
      expect(() => encryptPII(null as any)).toThrow(/non-empty string/);
      expect(() => encryptPII(undefined as any)).toThrow(/non-empty string/);
    });

    test('should handle special characters', () => {
      const plaintext = 'Special: !@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\n\t\r';
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should handle unicode characters', () => {
      const plaintext = 'Unicode: 你好世界 🌍 Ñáñíbïä';
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should fail decryption with wrong key', () => {
      const plaintext = 'sensitive-data';
      const encrypted = encryptPhone(plaintext);

      // Try to decrypt with different key type
      expect(() => decryptEmail(encrypted)).toThrow();
    });

    test('should fail decryption with corrupted ciphertext', () => {
      const plaintext = 'sensitive-data';
      const encrypted = encryptPII(plaintext);
      const corrupted = encrypted.replace(/a/g, 'b');

      expect(() => decryptPII(corrupted)).toThrow();
    });
  });

  describe('Searchable Hashing', () => {
    test('should generate consistent hash for same input', () => {
      const plaintext = '+264812345678';
      const hash1 = hashPhone(plaintext);
      const hash2 = hashPhone(plaintext);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex = 64 chars
    });

    test('should generate different hashes for different inputs', () => {
      const phone1 = '+264812345678';
      const phone2 = '+264812345679';
      const hash1 = hashPhone(phone1);
      const hash2 = hashPhone(phone2);

      expect(hash1).not.toBe(hash2);
    });

    test('should generate different hashes for different key types', () => {
      const data = 'test@example.com';
      const phoneHash = hashForSearch(data, 'phone');
      const emailHash = hashForSearch(data, 'email');

      expect(phoneHash).not.toBe(emailHash);
    });

    test('should handle email hash', () => {
      const email = 'user@example.com';
      const hash1 = hashEmail(email);
      const hash2 = hashEmail(email);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    test('should be case-sensitive', () => {
      const lower = 'user@example.com';
      const upper = 'USER@EXAMPLE.COM';
      const hashLower = hashEmail(lower);
      const hashUpper = hashEmail(upper);

      expect(hashLower).not.toBe(hashUpper);
    });
  });

  describe('PII Masking', () => {
    test('should mask phone number correctly', () => {
      const phone = '+264812345678';
      const masked = maskPII(phone, 'phone');

      expect(masked).toBe('*********5678');
      expect(masked).toContain('5678');
      expect(masked).not.toContain('81234');
    });

    test('should mask email correctly', () => {
      const email = 'user@example.com';
      const masked = maskPII(email, 'email');

      expect(masked).toBe('u***@example.com');
      expect(masked).toContain('@example.com');
      expect(masked).not.toContain('user');
    });

    test('should mask short phone number', () => {
      const phone = '1234';
      const masked = maskPII(phone, 'phone');

      // Length ≤ 4: mask entirely (no partial reveal)
      expect(masked).toBe('****');
    });

    test('should handle empty string', () => {
      const masked = maskPII('', 'phone');
      expect(masked).toBe('');
    });
  });

  describe('Performance', () => {
    test('should encrypt 1000 phone numbers in < 1 second', () => {
      const start = Date.now();
      const phones = Array.from({ length: 1000 }, (_, i) => `+26481234${String(i).padStart(4, '0')}`);

      for (const phone of phones) {
        encryptPhone(phone);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    test('should decrypt 1000 phone numbers in < 1 second', () => {
      const phone = '+264812345678';
      const encrypted = encryptPhone(phone);
      const encryptedArray = Array(1000).fill(encrypted);

      const start = Date.now();
      for (const enc of encryptedArray) {
        decryptPhone(enc);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    test('should generate 1000 hashes in < 500ms', () => {
      const start = Date.now();
      const phones = Array.from({ length: 1000 }, (_, i) => `+26481234${String(i).padStart(4, '0')}`);

      for (const phone of phones) {
        hashPhone(phone);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Encryption Format', () => {
    test('should have correct format (version:iv:authTag:ciphertext)', () => {
      const plaintext = 'test-data';
      const encrypted = encryptPII(plaintext);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('1'); // Version 1
      expect(parts[1]).toBeDefined(); // IV
      expect(parts[2]).toBeDefined(); // Auth tag
      expect(parts[3]).toBeDefined(); // Ciphertext
    });

    test('should reject invalid format', () => {
      expect(() => decryptPII('invalid')).toThrow(/Invalid encrypted format/);
      expect(() => decryptPII('a:b:c')).toThrow(/Invalid encrypted format/);
      expect(() => decryptPII('2:a:b:c')).toThrow(/Unsupported encryption version/);
    });
  });

  describe('Integration Tests', () => {
    test('should work with real phone number formats', () => {
      const phones = [
        '+264812345678',
        '+1234567890',
        '+44123456789',
        '+86123456789',
        '0812345678', // Local format
      ];

      for (const phone of phones) {
        const encrypted = encryptPhone(phone);
        const decrypted = decryptPhone(encrypted);
        expect(decrypted).toBe(phone);
      }
    });

    test('should work with real email formats', () => {
      const emails = [
        'user@example.com',
        'test.user+tag@example.co.uk',
        'first.last@subdomain.example.com',
        'user123@test-domain.org',
      ];

      for (const email of emails) {
        const encrypted = encryptEmail(email);
        const decrypted = decryptEmail(encrypted);
        expect(decrypted).toBe(email);
      }
    });

    test('should maintain data integrity over multiple operations', () => {
      const data = '+264812345678';

      // Encrypt -> Decrypt -> Encrypt -> Decrypt
      const enc1 = encryptPhone(data);
      const dec1 = decryptPhone(enc1);
      const enc2 = encryptPhone(dec1);
      const dec2 = decryptPhone(enc2);

      expect(dec2).toBe(data);

      // Hash should be consistent
      const hash1 = hashPhone(data);
      const hash2 = hashPhone(dec2);
      expect(hash1).toBe(hash2);
    });
  });

  describe('Self-Test', () => {
    test('should pass self-test for all key types', () => {
      expect(() => testEncryption('main')).not.toThrow();
      expect(() => testEncryption('phone')).not.toThrow();
      expect(() => testEncryption('email')).not.toThrow();
      expect(() => testEncryption('wallet')).not.toThrow();
    });

    test('should return true for successful tests', () => {
      expect(testEncryption('main')).toBe(true);
      expect(testEncryption('phone')).toBe(true);
      expect(testEncryption('email')).toBe(true);
      expect(testEncryption('wallet')).toBe(true);
    });
  });

  describe('PSD-12 Compliance', () => {
    test('should use AES-256-GCM encryption', () => {
      // Verify by checking encrypted format includes auth tag
      const encrypted = encryptPII('test');
      const parts = encrypted.split(':');
      
      expect(parts[0]).toBe('1'); // Version includes algorithm info
      expect(parts[2]).toBeDefined(); // Auth tag present (GCM requirement)
    });

    test('should use 256-bit keys', () => {
      const key = generateEncryptionKey();
      const keyBuffer = Buffer.from(key, 'base64');
      
      expect(keyBuffer.length).toBe(32); // 256 bits = 32 bytes
    });

    test('should prevent tampering (authenticated encryption)', () => {
      const plaintext = 'sensitive-data';
      const encrypted = encryptPII(plaintext);
      
      // Flip one bit in ciphertext so GCM authentication fails reliably
      const parts = encrypted.split(':');
      const ctBuf = Buffer.from(parts[3]!, 'base64');
      ctBuf[0] ^= 0xff;
      parts[3] = ctBuf.toString('base64');
      const tampered = parts.join(':');
      
      // Should fail authentication
      expect(() => decryptPII(tampered)).toThrow();
    });

    test('should support key separation (different PII types)', () => {
      const data = 'test@example.com';
      
      // Encrypt with different keys
      const phoneEnc = encryptPhone(data);
      const emailEnc = encryptEmail(data);
      
      // Should produce different ciphertexts (different keys)
      expect(phoneEnc).not.toBe(emailEnc);
      
      // Should fail cross-decryption
      expect(() => decryptPhone(emailEnc)).toThrow();
      expect(() => decryptEmail(phoneEnc)).toThrow();
    });
  });
});
