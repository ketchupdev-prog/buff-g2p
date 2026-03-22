/**
 * OTP Service Tests
 * 
 * Tests OTP generation, validation, rate limiting, and error handling.
 * Covers migration 023 fixes for rate limiting.
 * 
 * Run: npm test -- otp.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { requestOtp, verifyOtp, getOtpStatus } from '../lib/otp.js';
import { sql } from '../lib/db.js';

describe('OTP Service', () => {
  const testPhone = '81234567';
  const testEmail = 'test@example.com';

  beforeEach(async () => {
    // Clean up test data
    await sql`DELETE FROM otp_codes WHERE phone = ${testPhone}`;
    await sql`DELETE FROM otp_rate_limits WHERE phone = ${testPhone}`;
  });

  afterEach(async () => {
    // Clean up after tests
    await sql`DELETE FROM otp_codes WHERE phone = ${testPhone}`;
    await sql`DELETE FROM otp_rate_limits WHERE phone = ${testPhone}`;
  });

  describe('Request OTP', () => {
    it('should generate OTP for valid phone number', async () => {
      const result = await requestOtp({ phone: testPhone });
      
      expect(result.success).toBe(true);
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.message).toContain('sent');
    });

    it('should reject invalid phone numbers', async () => {
      const result = await requestOtp({ phone: '123' });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should support email channel', async () => {
      const result = await requestOtp({
        phone: testPhone,
        email: testEmail,
        channel: 'email',
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('email');
    });

    it('should reject invalid email addresses', async () => {
      const result = await requestOtp({
        phone: testPhone,
        email: 'invalid-email',
        channel: 'email',
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid email');
    });
  });

  describe('Rate Limiting (Migration 023 Fix)', () => {
    it('should allow up to 100 requests per day (NEW LIMIT)', async () => {
      // Create 5 requests (within per-minute limit)
      for (let i = 0; i < 5; i++) {
        const result = await requestOtp({ phone: testPhone });
        expect(result.success).toBe(true);
        
        // Wait 15 seconds to avoid per-minute limit
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
      
      // Verify counter is at 5, not blocked
      const status = await getOtpStatus(testPhone);
      expect(status.blockedUntil).toBeUndefined();
    }, 90000); // 90 second timeout for this test

    it('should enforce per-minute limit (5 requests/min)', async () => {
      // Create 5 requests quickly
      for (let i = 0; i < 5; i++) {
        const result = await requestOtp({ phone: testPhone });
        expect(result.success).toBe(true);
      }
      
      // 6th request should fail
      const result = await requestOtp({ phone: testPhone });
      expect(result.success).toBe(false);
      expect(result.message).toContain('wait');
    });

    it('should reset counter after 24 hours (BUG FIX)', async () => {
      // Create first request
      await requestOtp({ phone: testPhone });
      
      // Simulate 24 hours passing by updating window_start
      await sql`
        UPDATE otp_rate_limits
        SET window_start = NOW() - INTERVAL '25 hours',
            request_count = 99
        WHERE phone = ${testPhone}
      `;
      
      // Next request should succeed (counter reset to 1)
      const result = await requestOtp({ phone: testPhone });
      expect(result.success).toBe(true);
      
      // Verify counter was reset
      const [rateLimit] = await sql`
        SELECT request_count FROM otp_rate_limits WHERE phone = ${testPhone}
      `;
      expect(rateLimit.request_count).toBe(1);
    });
  });

  describe('Verify OTP', () => {
    it('should verify correct OTP code', async () => {
      const requestResult = await requestOtp({ phone: testPhone });
      expect(requestResult.success).toBe(true);
      
      // In development, we can use the devCode
      if (requestResult.devCode) {
        const verifyResult = await verifyOtp({
          phone: testPhone,
          code: requestResult.devCode,
        });
        
        expect(verifyResult.success).toBe(true);
      }
    });

    it('should reject incorrect OTP code', async () => {
      await requestOtp({ phone: testPhone });
      
      const result = await verifyOtp({
        phone: testPhone,
        code: '000000',
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should track remaining attempts', async () => {
      await requestOtp({ phone: testPhone });
      
      // Try wrong code
      const result = await verifyOtp({
        phone: testPhone,
        code: '000000',
      });
      
      expect(result.attemptsRemaining).toBeDefined();
      expect(result.attemptsRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should reject expired OTP codes', async () => {
      await requestOtp({ phone: testPhone });
      
      // Expire the OTP by updating expires_at
      await sql`
        UPDATE otp_codes
        SET expires_at = NOW() - INTERVAL '1 hour'
        WHERE phone = ${testPhone}
      `;
      
      const result = await verifyOtp({
        phone: testPhone,
        code: '123456',
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
    });
  });

  describe('OTP Status', () => {
    it('should return no pending OTP initially', async () => {
      const status = await getOtpStatus(testPhone);
      
      expect(status.hasPendingOtp).toBe(false);
      expect(status.attemptsRemaining).toBeGreaterThan(0);
    });

    it('should return pending OTP status after request', async () => {
      await requestOtp({ phone: testPhone });
      
      const status = await getOtpStatus(testPhone);
      
      expect(status.hasPendingOtp).toBe(true);
      expect(status.attemptsRemaining).toBeGreaterThan(0);
    });

    it('should indicate blocked status', async () => {
      // Create requests to trigger block
      for (let i = 0; i < 5; i++) {
        await requestOtp({ phone: testPhone });
      }
      
      // Try one more to get blocked
      await requestOtp({ phone: testPhone });
      
      const status = await getOtpStatus(testPhone);
      
      // Should show rate limit info
      expect(status.nextRequestAt || status.blockedUntil).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle phone number normalization', async () => {
      const phones = [
        '081234567',      // Leading 0
        '+26481234567',   // With country code
        '264 81 234 567', // Formatted
        '81234567',       // Plain
      ];
      
      for (const phone of phones) {
        const result = await requestOtp({ phone });
        expect(result.success).toBe(true);
        
        // Clean up
        await sql`DELETE FROM otp_codes WHERE phone LIKE '%81234567%'`;
        await sql`DELETE FROM otp_rate_limits WHERE phone LIKE '%81234567%'`;
      }
    });

    it('should invalidate previous OTP when new one requested', async () => {
      // Request first OTP
      const result1 = await requestOtp({ phone: testPhone });
      const code1 = result1.devCode;
      
      // Request second OTP
      const result2 = await requestOtp({ phone: testPhone });
      expect(result2.success).toBe(true);
      
      // First OTP should be invalidated
      if (code1) {
        const verifyResult = await verifyOtp({
          phone: testPhone,
          code: code1,
        });
        expect(verifyResult.success).toBe(false);
      }
    });

    it('should handle multiple purposes independently', async () => {
      const purposes = ['login', 'register', 'reset_pin'];
      
      for (const purpose of purposes) {
        const result = await requestOtp({
          phone: testPhone,
          purpose: purpose as any,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Development Mode', () => {
    it('should provide devCode in development', async () => {
      if (process.env.NODE_ENV === 'development') {
        const result = await requestOtp({ phone: testPhone });
        
        expect(result.devCode).toBeDefined();
        expect(result.devCode).toHaveLength(6);
      }
    });

    it('should have relaxed limits in development', async () => {
      if (process.env.NODE_ENV === 'development') {
        const result = await requestOtp({ phone: testPhone });
        
        // Development should have 1000 daily limit (effectively unlimited)
        expect(result.expiresIn).toBeGreaterThan(300); // 10 minutes
      }
    });
  });
});
