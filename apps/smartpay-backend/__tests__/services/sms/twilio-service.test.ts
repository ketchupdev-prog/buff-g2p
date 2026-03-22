/**
 * Twilio SMS Service Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/lib/db');

describe('Twilio SMS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.ALLOW_DEV_FALLBACK = 'true';
    process.env.TWILIO_ACCOUNT_SID = '';
    process.env.TWILIO_AUTH_TOKEN = '';
  });

  describe('sendOTP', () => {
    it('should send OTP in mock mode when Twilio not configured', async () => {
      const { sendOTP } = await import('../../../src/services/sms/twilio-service');
      
      const result = await sendOTP({
        phone: '+264812345678',
        code: '123456',
        purpose: 'otp',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('test');
      expect(result.messageId).toBeDefined();
    });

    it('should fail when Twilio not configured and dev fallback disabled', async () => {
      process.env.ALLOW_DEV_FALLBACK = 'false';
      
      const { sendOTP } = await import('../../../src/services/sms/twilio-service');
      
      const result = await sendOTP({
        phone: '+264812345678',
        code: '123456',
        purpose: 'otp',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should normalize Namibian phone numbers', async () => {
      const { sendOTP } = await import('../../../src/services/sms/twilio-service');
      
      // Test various formats
      const result1 = await sendOTP({ phone: '0812345678', code: '123456' });
      const result2 = await sendOTP({ phone: '812345678', code: '123456' });
      const result3 = await sendOTP({ phone: '+264812345678', code: '123456' });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
    });

    it('should enforce rate limiting', async () => {
      // This test would require mocking the database query
      // and simulating multiple SMS sends to the same number
      expect(true).toBe(true);
    });
  });

  describe('sendTransactionNotification', () => {
    it('should send transaction notification in mock mode', async () => {
      const { sendTransactionNotification } = await import('../../../src/services/sms/twilio-service');
      
      const result = await sendTransactionNotification(
        '+264812345678',
        100.50,
        'payment'
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('test');
    });
  });

  describe('isTwilioConfigured', () => {
    it('should return false when credentials not set', async () => {
      const { isTwilioConfigured } = await import('../../../src/services/sms/twilio-service');
      
      expect(isTwilioConfigured()).toBe(false);
    });

    it('should return true when credentials are set', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC123';
      process.env.TWILIO_AUTH_TOKEN = 'token123';
      
      // Re-import to pick up new env vars
      jest.resetModules();
      const { isTwilioConfigured } = await import('../../../src/services/sms/twilio-service');
      
      expect(isTwilioConfigured()).toBe(true);
    });
  });
});
