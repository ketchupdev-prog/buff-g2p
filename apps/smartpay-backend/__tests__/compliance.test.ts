/**
 * Compliance Library Tests
 * Tests PSD and ETA compliance implementations
 * Location: fintech/smartpay/backend/__tests__/compliance.test.ts
 */
import { checkEmoneyLimits, recordTransaction } from '../src/lib/emoneyLimits';
import { calculateTransactionFee, formatFeeDisplay, recordFeeTransaction } from '../src/lib/feeCalculator';
import { generateEtaIntegrityHash, logWithAttribution } from '../src/lib/etaAttribution';
import { generateNAMQRCashoutPayload, validateNAMQRPayload, generateCashoutQR } from '../src/lib/namqrCashout';
import { generatePKCEChallenge, generateState, initiateConsent, handleConsentCallback } from '../src/lib/obsConsent';
import { pool } from '../src/lib/db';

jest.mock('../src/lib/db');
const mockPool = pool as jest.Mocked<typeof pool>;

describe('PSD-3: E-money Limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkEmoneyLimits', () => {
    it('should allow transaction within limits', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ kyc_tier: 'standard' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ max_single_transaction: 10000, max_daily_transaction: 50000, max_monthly_transaction: 200000 }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [{ total_sent: 5000 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ total_sent: 50000 }], rowCount: 1 } as any);

      const result = await checkEmoneyLimits({
        userId: 'user-123',
        walletId: 'w1',
        amount: 2000,
        type: 'send',
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeDefined();
    });

    it('should reject transaction exceeding single transaction limit', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ kyc_tier: 'basic' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ max_single_transaction: 5000, max_daily_transaction: 20000, max_monthly_transaction: 80000 }],
          rowCount: 1,
        } as any);

      const result = await checkEmoneyLimits({
        userId: 'user-123',
        walletId: 'w1',
        amount: 6000,
        type: 'send',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Single transaction limit');
      expect(result.reason).toContain('N$5000');
    });

    it('should reject transaction exceeding daily limit', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ kyc_tier: 'standard' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ max_single_transaction: 10000, max_daily_transaction: 50000, max_monthly_transaction: 200000 }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [{ total_sent: 48000 }], rowCount: 1 } as any);

      const result = await checkEmoneyLimits({
        userId: 'user-123',
        walletId: 'w1',
        amount: 3000,
        type: 'send',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily transaction limit reached');
      expect(result.remaining).toBe(2000);
    });

    it('should reject transaction exceeding monthly limit', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ kyc_tier: 'standard' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ max_single_transaction: 10000, max_daily_transaction: 50000, max_monthly_transaction: 200000 }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [{ total_sent: 10000 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ total_sent: 198000 }], rowCount: 1 } as any);

      const result = await checkEmoneyLimits({
        userId: 'user-123',
        walletId: 'w1',
        amount: 5000,
        type: 'send',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Monthly transaction limit reached');
      expect(result.remaining).toBe(2000);
    });

    it('should handle missing tier gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{}], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ max_single_transaction: 5000, max_daily_transaction: 20000, max_monthly_transaction: 80000 }],
          rowCount: 1,
        } as any)
        .mockResolvedValueOnce({ rows: [{ total_sent: 0 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ total_sent: 0 }], rowCount: 1 } as any);

      const result = await checkEmoneyLimits({
        userId: 'user-123',
        walletId: 'w1',
        amount: 1000,
        type: 'send',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('recordTransaction', () => {
    it('should insert new daily and monthly totals', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      await recordTransaction('user-123', 2000);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('emoney_daily_totals'),
        expect.arrayContaining(['user-123', expect.any(String), 2000])
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('emoney_monthly_totals'),
        expect.any(Array)
      );
    });
  });
});

describe('PSD-10: Fee Calculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTransactionFee', () => {
    it('should calculate fee with flat + percentage', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ fee_flat: 5.0, fee_percentage: 0.01, fee_cap: null, vat_inclusive: false }],
        rowCount: 1,
      } as any);

      const result = await calculateTransactionFee({
        paymentStream: 'p2p',
        transactionType: 'send_money',
        channel: 'mobile_app',
        amount: 1000,
      });

      expect(result.feeFlat).toBe(5.0);
      expect(result.feePercentage).toBe(0.01);
      expect(result.calculatedFee).toBe(15.0); // 5 + (1000 * 0.01)
      expect(result.breakdown.vat).toBe(2.25); // 15% of 15
      expect(result.finalFee).toBe(17.25); // 15 + VAT
    });

    it('should apply fee cap when exceeded', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ fee_flat: 10.0, fee_percentage: 0.05, fee_cap: 50.0, vat_inclusive: false }],
        rowCount: 1,
      } as any);

      const result = await calculateTransactionFee({
        paymentStream: 'p2p',
        transactionType: 'send_money',
        channel: 'mobile_app',
        amount: 2000,
      });

      expect(result.calculatedFee).toBe(110.0); // 10 + (2000 * 0.05) = 110
      expect(result.finalFee).toBe(57.5); // Capped at 50 + 15% VAT = 57.5
    });

    it('should handle VAT inclusive fees', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ fee_flat: 10.0, fee_percentage: 0.02, fee_cap: null, vat_inclusive: true }],
        rowCount: 1,
      } as any);

      const result = await calculateTransactionFee({
        paymentStream: 'p2p',
        transactionType: 'send_money',
        channel: 'mobile_app',
        amount: 500,
      });

      expect(result.finalFee).toBe(20.0); // No VAT added
      expect(result.breakdown.vat).toBeUndefined();
      expect(result.vatInclusive).toBe(true);
    });

    it('should return zero fee when no schedule found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await calculateTransactionFee({
        paymentStream: 'p2p',
        transactionType: 'send_money',
        channel: 'mobile_app',
        amount: 100,
      });

      expect(result.finalFee).toBe(0);
      expect(result.totalAmount).toBe(100);
    });
  });

  describe('formatFeeDisplay', () => {
    it('should format fee display with all components', () => {
      const feeResult = {
        feeFlat: 5.0,
        feePercentage: 0.01,
        calculatedFee: 15.0,
        feeCap: null,
        finalFee: 17.25,
        vatInclusive: false,
        totalAmount: 1017.25,
        breakdown: { baseFee: 15.0, cappedFee: 15.0, vat: 2.25 },
      };

      const display = formatFeeDisplay(feeResult);
      expect(display).toContain('N$5.00 flat');
      expect(display).toContain('1.00% of transaction');
      expect(display).toContain('15% VAT');
      expect(display).toContain('N$17.25');
    });

    it('should format capped fee display', () => {
      const feeResult = {
        feeFlat: 10.0,
        feePercentage: 0.05,
        calculatedFee: 110.0,
        feeCap: 50.0,
        finalFee: 57.5,
        vatInclusive: false,
        totalAmount: 2057.5,
        breakdown: { baseFee: 110.0, cappedFee: 50.0, vat: 7.5 },
      };

      const display = formatFeeDisplay(feeResult);
      expect(display).toContain('capped at N$50.00');
    });
  });

  describe('recordFeeTransaction', () => {
    it('should record fee in audit log', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any);

      const feeResult = {
        feeFlat: 5.0,
        feePercentage: 0.01,
        calculatedFee: 15.0,
        feeCap: null,
        finalFee: 17.25,
        vatInclusive: false,
        totalAmount: 1017.25,
        breakdown: { baseFee: 15.0, cappedFee: 15.0, vat: 2.25 },
      };

      await recordFeeTransaction('user-123', 'tx-456', feeResult);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('fee_audit_log'),
        expect.arrayContaining(['user-123', 'tx-456', 17.25, expect.any(String)])
      );
    });
  });
});

describe('ETA 2019 §32: Attribution & Integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEtaIntegrityHash', () => {
    it('should generate consistent SHA-256 hash', () => {
      const record = {
        userId: 'user-123',
        toolName: 'initiate_send_money',
        action: 'send',
        input: { amount: 100, to: 'ben-456' },
        result: 'success' as const,
        ipAddress: '192.168.1.1',
        sessionId: 'sess-789',
        isAutomated: false,
        createdAt: new Date('2026-03-15T10:30:00Z'),
      };

      const hash1 = generateEtaIntegrityHash(record);
      const hash2 = generateEtaIntegrityHash(record);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hash for different input', () => {
      const record1 = {
        userId: 'user-123',
        toolName: 'initiate_send_money',
        action: 'send',
        input: { amount: 100, to: 'ben-456' },
        result: 'success' as const,
        isAutomated: false,
        createdAt: new Date('2026-03-15T10:30:00Z'),
      };

      const record2 = {
        ...record1,
        input: { amount: 200, to: 'ben-456' },
      };

      const hash1 = generateEtaIntegrityHash(record1);
      const hash2 = generateEtaIntegrityHash(record2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle missing optional fields', () => {
      const record = {
        userId: 'user-123',
        toolName: 'get_wallet_overview',
        action: 'view',
        input: {},
        result: 'success' as const,
        isAutomated: true,
        createdAt: new Date('2026-03-15T10:30:00Z'),
      };

      const hash = generateEtaIntegrityHash(record);
      expect(hash).toHaveLength(64);
    });
  });

  describe('logWithAttribution', () => {
    it('should log attribution record with integrity hash', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any);

      const record = {
        userId: 'user-123',
        toolName: 'initiate_send_money',
        action: 'send',
        input: { amount: 100 },
        result: 'success' as const,
        ipAddress: '192.168.1.1',
        sessionId: 'sess-789',
        isAutomated: false,
        createdAt: new Date('2026-03-15T10:30:00Z'),
      };

      await logWithAttribution(record);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('copilot_audit_log'),
        expect.arrayContaining([
          'user-123',
          'initiate_send_money',
          'send',
          expect.any(String),
          'success',
          '192.168.1.1',
          'sess-789',
          'user',
          false,
          expect.stringMatching(/^[a-f0-9]{64}$/),
          expect.any(String),
        ])
      );
    });

    it('should differentiate automated vs user actions', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any);

      const record = {
        userId: 'user-123',
        toolName: 'get_wallet_overview',
        action: 'view',
        input: {},
        result: 'success' as const,
        isAutomated: true,
        createdAt: new Date(),
      };

      await logWithAttribution(record);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['automated', true])
      );
    });
  });
});

describe('NAMQR v5.0: QR Code Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateNAMQRCashoutPayload', () => {
    it('should generate valid NAMQR v5.0 payload', () => {
      const input = {
        tokenVaultId: 'ABCD-EFGH-JKLM-NPQR',
        payeeName: 'Smartpay Agent',
        payeeCity: 'Windhoek',
        amount: 500,
        currency: 'NAD',
        transactionRef: 'TX123456789',
        expiresAt: new Date('2026-03-15T12:30:00Z'),
        merchantCategoryCode: '0000',
      };

      const payload = generateNAMQRCashoutPayload(input);

      expect(payload['00']).toBe('01'); // Payload format v5.0
      expect(payload['01']).toBe('14'); // Dynamic payer-presented
      expect(payload['53']).toBe('516'); // NAD currency code
      expect(payload['54']).toBe('500.00'); // Amount
      expect(payload['58']).toBe('NA'); // Namibia country code
      expect(payload['59']).toContain('Smartpay Agent');
      expect(payload['60']).toContain('Windhoek');
      expect(payload['65']).toBe('ABCD-EFGH-JKLM-NPQR'); // Token Vault ID
      expect(payload['63']).toHaveLength(4); // CRC-16
    });

    it('should truncate payee name to 25 characters', () => {
      const input = {
        tokenVaultId: 'TEST-TEST-TEST-TEST',
        payeeName: 'Very Long Agent Name That Exceeds Twenty Five Characters',
        payeeCity: 'Windhoek',
        amount: 100,
        currency: 'NAD',
        transactionRef: 'TX123',
        expiresAt: new Date(),
        merchantCategoryCode: '0000',
      };

      const payload = generateNAMQRCashoutPayload(input);
      expect(payload['59'].length).toBeLessThanOrEqual(25);
    });

    it('should include CRC-16 checksum as last tag', () => {
      const input = {
        tokenVaultId: 'TEST-QRCD-1234-5678',
        payeeName: 'Agent',
        payeeCity: 'City',
        amount: 250,
        currency: 'NAD',
        transactionRef: 'TX999',
        expiresAt: new Date(),
        merchantCategoryCode: '0000',
      };

      const payload = generateNAMQRCashoutPayload(input);
      expect(payload['63']).toMatch(/^[A-F0-9]{4}$/);
    });
  });

  describe('validateNAMQRPayload', () => {
    it('should validate correct NAMQR payload', () => {
      const validQR = '00020101' + '01021452' + '0410000054' + '06500.00' + '6304ABCD';
      const result = validateNAMQRPayload(validQR);
      expect(result.valid).toBe(true);
    });

    it('should reject payload too short', () => {
      const result = validateNAMQRPayload('000201');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should reject invalid format indicator', () => {
      const invalidQR = '00020299999999'; // Length >= 10, invalid format version (02)
      const result = validateNAMQRPayload(invalidQR);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported payload format version');
    });

    it('should reject missing CRC-16', () => {
      const invalidQR = '000201010102145204100000540650';
      const result = validateNAMQRPayload(invalidQR);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing CRC-16');
    });
  });

  describe('generateCashoutQR', () => {
    it('should generate QR and store in token vault', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await generateCashoutQR('user-123', 'w1', 500, 'agent');

      expect(result.tokenVaultId).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(result.qrPayload['65']).toBe(result.tokenVaultId);
      expect(result.qrString).toContain('000201');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('token_vault'),
        expect.any(Array)
      );
    });

    it('should set expiry to 30 minutes', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 } as any);

      const before = Date.now();
      const result = await generateCashoutQR('user-123', 'w1', 500, 'agent');
      const after = Date.now();

      const expiryTime = result.expiresAt.getTime();
      expect(expiryTime).toBeGreaterThanOrEqual(before + 29 * 60 * 1000);
      expect(expiryTime).toBeLessThanOrEqual(after + 31 * 60 * 1000);
    });
  });
});

describe('OBS: Consent & PKCE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePKCEChallenge', () => {
    it('should generate valid PKCE code verifier and challenge', () => {
      const pkce = generatePKCEChallenge();

      expect(pkce.codeVerifier).toHaveLength(43);
      expect(pkce.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(pkce.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(pkce.codeChallengeMethod).toBe('S256');
    });

    it('should generate different verifiers each time', () => {
      const pkce1 = generatePKCEChallenge();
      const pkce2 = generatePKCEChallenge();

      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
    });

    it('should generate S256 hash correctly', () => {
      const pkce = generatePKCEChallenge();
      const crypto = require('crypto');
      const expectedChallenge = crypto
        .createHash('sha256')
        .update(pkce.codeVerifier)
        .digest('base64url');

      expect(pkce.codeChallenge).toBe(expectedChallenge);
    });
  });

  describe('generateState', () => {
    it('should generate cryptographically secure state', () => {
      const state = generateState();
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(state.length).toBeGreaterThan(30);
    });

    it('should generate unique states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('initiateConsent', () => {
    it('should create consent record with PKCE', async () => {
      const mockProvider = {
        id: 'dp-fnb',
        provider_code: 'FNB',
        provider_name: 'First National Bank',
        authorization_endpoint: 'https://fnb.na/authorize',
        token_endpoint: 'https://fnb.na/token',
        par_endpoint: null,
        revocation_endpoint: null,
        accounts_endpoint: 'https://fnb.na/api/accounts',
        balances_endpoint: 'https://fnb.na/api/balances',
        transactions_endpoint: 'https://fnb.na/api/transactions',
        payments_endpoint: null,
        is_active: true,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockProvider], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'consent-123' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any) // obs_consent_pkce insert
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await initiateConsent(
        'user-123',
        'dp-fnb',
        ['accounts', 'balances', 'transactions'],
        'ais',
        90
      );

      expect(result.consentId).toBe('consent-123');
      expect(result.authorizationUrl).toContain('https://fnb.na/authorize');
      expect(result.authorizationUrl).toContain('code_challenge=');
      expect(result.authorizationUrl).toContain('state=');
      expect(result.state).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should use PAR when provider supports it', async () => {
      const mockProvider = {
        id: 'dp-fnb',
        provider_code: 'FNB',
        provider_name: 'First National Bank',
        authorization_endpoint: 'https://fnb.na/authorize',
        token_endpoint: 'https://fnb.na/token',
        par_endpoint: 'https://fnb.na/par',
        revocation_endpoint: null,
        accounts_endpoint: 'https://fnb.na/api/accounts',
        balances_endpoint: 'https://fnb.na/api/balances',
        transactions_endpoint: 'https://fnb.na/api/transactions',
        payments_endpoint: null,
        is_active: true,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockProvider], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'consent-123' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any) // obs_consent_pkce insert
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ request_uri: 'urn:request:abc123' }),
      });

      const result = await initiateConsent('user-123', 'dp-fnb', ['accounts'], 'ais', 90);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://fnb.na/par',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-fapi-interaction-id': expect.any(String),
          }),
        })
      );

      expect(result.authorizationUrl).toContain('request_uri=');
    });
  });

  describe('handleConsentCallback', () => {
    it('should exchange code using plaintext code_verifier from PKCE store', async () => {
      const plainVerifier = 'plaintext-verifier-for-token-exchange';
      const mockConsentRow = {
        id: 'consent-456',
        user_id: 'user-123',
        data_provider_id: 'dp-fnb',
        redirect_uri: 'https://smartpay.app/obs/callback',
        scopes: ['accounts'],
      };
      const mockProviderRow = {
        id: 'dp-fnb',
        provider_code: 'FNB',
        provider_name: 'First National Bank',
        authorization_endpoint: 'https://fnb.na/authorize',
        token_endpoint: 'https://fnb.na/token',
        par_endpoint: null,
        revocation_endpoint: null,
        accounts_endpoint: null,
        balances_endpoint: null,
        transactions_endpoint: null,
        payments_endpoint: null,
        is_active: true,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockConsentRow], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockProviderRow], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ code_verifier: plainVerifier }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'at-secret',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'accounts',
        }),
      });

      const result = await handleConsentCallback('auth-code-xyz', 'state-abc');

      expect(result.consentId).toBe('consent-456');
      expect(result.accessToken).toBe('at-secret');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://fnb.na/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(`code_verifier=${encodeURIComponent(plainVerifier)}`),
        })
      );
    });

    it('should throw when PKCE verifier is missing for state', async () => {
      const mockConsentRow = {
        id: 'consent-456',
        user_id: 'user-123',
        data_provider_id: 'dp-fnb',
        redirect_uri: 'https://smartpay.app/obs/callback',
        scopes: ['accounts'],
      };
      const mockProviderRow = {
        id: 'dp-fnb',
        provider_code: 'FNB',
        provider_name: 'FNB',
        authorization_endpoint: 'https://fnb.na/authorize',
        token_endpoint: 'https://fnb.na/token',
        par_endpoint: null,
        revocation_endpoint: null,
        accounts_endpoint: null,
        balances_endpoint: null,
        transactions_endpoint: null,
        payments_endpoint: null,
        is_active: true,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockConsentRow], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockProviderRow], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(handleConsentCallback('code', 'state-abc')).rejects.toThrow(
        'Missing PKCE code verifier'
      );
    });
  });
});

// (Removed intentionally skipped copilot tools network resilience tests.)
