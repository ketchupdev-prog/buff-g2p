/**
 * Real Open Banking Flow Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-open-banking.integration.test.ts
 * 
 * Tests:
 * - PAR consent creation via Ketchup Portals
 * - OAuth flow with bank simulator
 * - Account fetching via portal proxy
 * - Transaction fetching
 * - Consent storage in database
 * - Consent revocation
 */

import axios from 'axios';
import crypto from 'crypto';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  generateTestToken,
  getTestPool,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();

describe('Real Open Banking Flow Integration', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Consent Creation and OAuth Flow', () => {
    it('should create OBS consent with PAR endpoint', async () => {
      const testUser = await createTestUser({
        phone: '+264811234567',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/obs/consents`,
        {
          dataProviderId: 'dp-fnb-test',
          purpose: 'ais',
          scopes: ['accounts', 'balances', 'transactions'],
          expiresIn: 90,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.consentId).toBeDefined();
      expect(response.data.data.authorizationUrl).toBeDefined();
      expect(response.data.data.authorizationUrl).toContain('authorize');

      const pool = getTestPool();
      const consentCheck = await pool.query(
        'SELECT * FROM obs_consents WHERE id = $1',
        [response.data.data.consentId]
      );

      expect(consentCheck.rowCount).toBe(1);
      expect(consentCheck.rows[0].user_id).toBe(testUser.id);
      expect(consentCheck.rows[0].status).toBe('awaiting_authorization');
    }, 10000);

    it('should validate OAuth callback and update consent status', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const consentResponse = await axios.post(
        `${BACKEND_URL}/api/v1/obs/consents`,
        {
          dataProviderId: 'dp-fnb-test',
          purpose: 'ais',
          scopes: ['accounts'],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const consentId = consentResponse.data.data.consentId;
      const authCode = 'test-auth-code-12345';

      const callbackResponse = await axios.post(
        `${BACKEND_URL}/api/v1/obs/consents/${consentId}/callback`,
        {
          code: authCode,
          state: 'valid-state',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.data.success).toBe(true);

      const pool = getTestPool();
      const updatedConsent = await pool.query(
        'SELECT status FROM obs_consents WHERE id = $1',
        [consentId]
      );

      expect(updatedConsent.rows[0].status).toBe('authorized');
    }, 10000);
  });

  describe('Account Information Service (AIS)', () => {
    it('should fetch bank accounts via portal proxy', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const consentId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO obs_consents (id, user_id, data_provider_id, purpose, scopes, status, expires_at, created_at)
         VALUES ($1, $2, 'dp-fnb-test', 'ais', $3, 'authorized', NOW() + INTERVAL '90 days', NOW())`,
        [consentId, testUser.id, JSON.stringify(['accounts', 'balances'])]
      );

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/obs/ais/accounts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            consentId,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.accounts).toBeDefined();
      expect(Array.isArray(response.data.data.accounts)).toBe(true);
    }, 10000);

    it('should fetch account balances via portal proxy', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const consentId = crypto.randomUUID();
      const accountId = 'test-account-123';

      await pool.query(
        `INSERT INTO obs_consents (id, user_id, data_provider_id, purpose, scopes, status, expires_at, created_at)
         VALUES ($1, $2, 'dp-fnb-test', 'ais', $3, 'authorized', NOW() + INTERVAL '90 days', NOW())`,
        [consentId, testUser.id, JSON.stringify(['balances'])]
      );

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/obs/ais/balances/${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            consentId,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.balance).toBeDefined();
    }, 10000);

    it('should fetch transactions via portal proxy', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const consentId = crypto.randomUUID();
      const accountId = 'test-account-456';

      await pool.query(
        `INSERT INTO obs_consents (id, user_id, data_provider_id, purpose, scopes, status, expires_at, created_at)
         VALUES ($1, $2, 'dp-fnb-test', 'ais', $3, 'authorized', NOW() + INTERVAL '90 days', NOW())`,
        [consentId, testUser.id, JSON.stringify(['transactions'])]
      );

      const response = await axios.get(
        `${BACKEND_URL}/api/v1/obs/ais/transactions/${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            consentId,
            fromDate: '2026-01-01',
            toDate: '2026-03-21',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transactions).toBeDefined();
      expect(Array.isArray(response.data.data.transactions)).toBe(true);
    }, 10000);
  });

  describe('Consent Management', () => {
    it('should list user consents', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const consent1 = crypto.randomUUID();
      const consent2 = crypto.randomUUID();

      await pool.query(
        `INSERT INTO obs_consents (id, user_id, data_provider_id, purpose, scopes, status, expires_at, created_at)
         VALUES 
           ($1, $2, 'dp-fnb', 'ais', $3, 'authorized', NOW() + INTERVAL '90 days', NOW()),
           ($4, $2, 'dp-standard', 'ais', $3, 'authorized', NOW() + INTERVAL '90 days', NOW())`,
        [consent1, testUser.id, JSON.stringify(['accounts']), consent2]
      );

      const response = await axios.get(`${BACKEND_URL}/api/v1/obs/consents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.consents).toHaveLength(2);

      const consentIds = response.data.data.consents.map((c: any) => c.id);
      expect(consentIds).toContain(consent1);
      expect(consentIds).toContain(consent2);
    }, 10000);

    it('should revoke consent and update status', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const consentId = crypto.randomUUID();

      await pool.query(
        `INSERT INTO obs_consents (id, user_id, data_provider_id, purpose, scopes, status, expires_at, created_at)
         VALUES ($1, $2, 'dp-fnb', 'ais', $3, 'authorized', NOW() + INTERVAL '90 days', NOW())`,
        [consentId, testUser.id, JSON.stringify(['accounts'])]
      );

      const response = await axios.delete(
        `${BACKEND_URL}/api/v1/obs/consents/${consentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const revokedConsent = await pool.query(
        'SELECT status FROM obs_consents WHERE id = $1',
        [consentId]
      );

      expect(revokedConsent.rows[0].status).toBe('revoked');
    }, 10000);

    it('should reject consent creation without required scopes', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/obs/consents`,
          {
            dataProviderId: 'dp-fnb-test',
            purpose: 'ais',
            scopes: [],
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected empty scopes');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
      }
    });
  });

  describe('Cash Out to Bank via OBS', () => {
    it('should cash out to linked bank account', async () => {
      const testUser = await createTestUser();
      const testWallet = await createTestWallet({
        userId: testUser.id,
        balance: 5000,
      });

      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const consentId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO obs_consents (id, user_id, data_provider_id, purpose, scopes, status, expires_at, created_at)
         VALUES ($1, $2, 'dp-fnb', 'pis', $3, 'authorized', NOW() + INTERVAL '90 days', NOW())`,
        [consentId, testUser.id, JSON.stringify(['payment_initiation'])]
      );

      const initialBalance = await getWalletBalance(testWallet.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/cash-out/bank`,
        {
          walletId: testWallet.id,
          amount: 1000,
          bankAccount: '1234567890',
          bankCode: 'FNB_NA',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.transactionId).toBeDefined();

      await waitForCondition(async () => {
        const balance = await getWalletBalance(testWallet.id);
        return balance < initialBalance;
      }, 5000);

      const finalBalance = await getWalletBalance(testWallet.id);
      expect(finalBalance).toBe(initialBalance - 1000);
    }, 10000);
  });
});
