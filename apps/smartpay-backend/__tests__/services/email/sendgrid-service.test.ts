/**
 * SendGrid Email Service Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/lib/db');

describe('SendGrid Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_DEV_FALLBACK = 'true';
    process.env.SENDGRID_API_KEY = '';
  });

  describe('sendComplianceAlert', () => {
    it('should send compliance alert in mock mode', async () => {
      const { sendComplianceAlert } = await import('../../../src/services/email/sendgrid-service');
      
      const result = await sendComplianceAlert(
        'compliance@smartpay.na',
        'KRI Threshold Exceeded',
        'Transaction failure rate exceeded 5% threshold'
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('test');
      expect(result.messageId).toBeDefined();
    });

    it('should include proper HTML formatting', async () => {
      const { sendComplianceAlert } = await import('../../../src/services/email/sendgrid-service');
      
      const result = await sendComplianceAlert(
        'test@example.com',
        'Test Alert',
        'Test body'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendTrustReconciliationAlert', () => {
    it('should send trust reconciliation alert with discrepancy details', async () => {
      const { sendTrustReconciliationAlert } = await import('../../../src/services/email/sendgrid-service');
      
      const result = await sendTrustReconciliationAlert(
        'finance@smartpay.na',
        -1500.50,
        {
          ledger_balance: 50000.00,
          bank_balance: 48499.50,
          last_reconciliation: '2024-03-20',
        }
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('test');
    });
  });

  describe('sendTransactionReceipt', () => {
    it('should send transaction receipt with proper formatting', async () => {
      const { sendTransactionReceipt } = await import('../../../src/services/email/sendgrid-service');
      
      const result = await sendTransactionReceipt(
        'customer@example.com',
        {
          id: 'txn_123456',
          type: 'payment',
          amount: 250.00,
          currency: 'NAD',
          timestamp: new Date().toISOString(),
          recipient: 'Merchant ABC',
        }
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('test');
    });
  });

  describe('processEmailQueue', () => {
    it('should process pending emails from queue', async () => {
      const { processEmailQueue } = await import('../../../src/services/email/sendgrid-service');
      
      const stats = await processEmailQueue();

      expect(stats).toHaveProperty('processed');
      expect(stats).toHaveProperty('succeeded');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('isSendGridConfigured', () => {
    it('should return false when API key not set', async () => {
      const { isSendGridConfigured } = await import('../../../src/services/email/sendgrid-service');
      
      expect(isSendGridConfigured()).toBe(false);
    });
  });
});
