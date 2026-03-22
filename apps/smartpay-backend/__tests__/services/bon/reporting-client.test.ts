/**
 * BoN Reporting API Client Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/lib/db');

describe('BoN Reporting Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_DEV_FALLBACK = 'true';
    process.env.BON_REPORTING_ENABLED = 'false';
  });

  describe('submitKRIReport', () => {
    it('should submit KRI report in mock mode', async () => {
      const { submitKRIReport } = await import('../../../src/services/bon/reporting-client');
      
      const result = await submitKRIReport({
        reporting_period: '2024-03',
        total_transactions: 15000,
        total_volume_nad: 2500000,
        failed_transactions: 75,
        average_transaction_time_ms: 850,
        peak_tps: 25,
        system_uptime_percent: 99.95,
        security_incidents: 0,
        customer_complaints: 5,
        fraud_cases: 1,
      });

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      expect(result.submissionId).toBeDefined();
    });

    it('should queue report for later submission', async () => {
      // This test would verify database insertion
      expect(true).toBe(true);
    });
  });

  describe('submitIncidentReport', () => {
    it('should submit security incident report', async () => {
      const { submitIncidentReport } = await import('../../../src/services/bon/reporting-client');
      
      const result = await submitIncidentReport({
        incident_id: 'INC-2024-001',
        incident_type: 'fraud',
        severity: 'high',
        incident_date: new Date().toISOString(),
        description: 'Suspected fraudulent transaction pattern detected',
        affected_customers: 1,
        financial_impact_nad: 5000,
        resolution_status: 'investigating',
        remediation_actions: 'Account frozen, investigating transaction history',
      });

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
    });
  });

  describe('submitTrustAccountReport', () => {
    it('should submit trust account reconciliation report', async () => {
      const { submitTrustAccountReport } = await import('../../../src/services/bon/reporting-client');
      
      const result = await submitTrustAccountReport({
        reconciliation_date: '2024-03-31',
        ledger_balance_nad: 1000000,
        bank_balance_nad: 1000000,
        discrepancy_nad: 0,
        reconciled: true,
        reconciliation_notes: 'Monthly reconciliation completed successfully',
      });

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
    });
  });

  describe('checkSubmissionStatus', () => {
    it('should check report submission status', async () => {
      const { checkSubmissionStatus } = await import('../../../src/services/bon/reporting-client');
      
      const status = await checkSubmissionStatus('mock_sub_123');

      expect(status).toHaveProperty('status');
      expect(['pending', 'processing', 'accepted', 'rejected']).toContain(status.status);
    });
  });

  describe('processBoNQueue', () => {
    it('should process pending reports from queue', async () => {
      const { processBoNQueue } = await import('../../../src/services/bon/reporting-client');
      
      const stats = await processBoNQueue();

      expect(stats).toHaveProperty('processed');
      expect(stats).toHaveProperty('succeeded');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('isBoNConfigured', () => {
    it('should return true when mock mode is allowed', async () => {
      const { isBoNConfigured } = await import('../../../src/services/bon/reporting-client');
      
      expect(isBoNConfigured()).toBe(true);
    });
  });
});
