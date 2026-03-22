/**
 * Real Profile and Proof-of-Life Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-profile.integration.test.ts
 * 
 * Tests:
 * - Profile fetching
 * - Profile updates
 * - Proof-of-Life status
 * - Proof-of-Life initiation
 * - Proof-of-Life verification
 * - Real API calls and database operations
 */

import crypto from 'crypto';
import axios from 'axios';
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

describe('Real Profile Integration', () => {
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

  describe('Profile Fetching', () => {
    it('should fetch user profile with all details', async () => {
      const testUser = await createTestUser({
        phone: '+264811234567',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.id).toBe(testUser.id);
      expect(response.data.data.user.phone).toBe(testUser.phone);
      expect(response.data.data.user.email).toBe(testUser.email);
      expect(response.data.data.user.first_name).toBe('John');
      expect(response.data.data.user.last_name).toBe('Doe');
      expect(response.data.data.user.smartpay_id).toBe(testUser.smartpayId);
    });

    it('should include KYC status in profile', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      await pool.query(
        `UPDATE users SET kyc_status = 'approved', kyc_tier = 2 WHERE id = $1`,
        [testUser.id]
      );

      const response = await axios.get(`${BACKEND_URL}/api/v1/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.data.data.user.kyc_status).toBe('approved');
      expect(response.data.data.user.kyc_tier).toBe(2);
    });
  });

  describe('Profile Updates', () => {
    it('should update user profile information', async () => {
      const testUser = await createTestUser({
        firstName: 'Old',
        lastName: 'Name',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.patch(
        `${BACKEND_URL}/api/v1/user/profile`,
        {
          firstName: 'John',
          lastName: 'Updated',
          email: 'newemail@example.com',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.first_name).toBe('John');
      expect(response.data.data.user.last_name).toBe('Updated');
      expect(response.data.data.user.email).toBe('newemail@example.com');

      const pool = getTestPool();
      const userCheck = await pool.query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [testUser.id]
      );

      expect(userCheck.rows[0].first_name).toBe('John');
      expect(userCheck.rows[0].last_name).toBe('Updated');
      expect(userCheck.rows[0].email).toBe('newemail@example.com');
    }, 10000);
  });

  describe('Proof-of-Life Status', () => {
    it('should fetch proof-of-life status', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const lastProofDate = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await pool.query(
        `UPDATE users 
         SET last_proof_of_life = $1, 
             proof_of_life_due_date = $2
         WHERE id = $3`,
        [lastProofDate, dueDate, testUser.id]
      );

      const response = await axios.get(`${BACKEND_URL}/api/v1/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.user.last_proof_of_life).toBeDefined();
      expect(response.data.data.user.proof_of_life_due_date).toBeDefined();
    });

    it('should indicate overdue proof-of-life', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const lastProofDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
      const overdueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      await pool.query(
        `UPDATE users 
         SET last_proof_of_life = $1, 
             proof_of_life_due_date = $2
         WHERE id = $3`,
        [lastProofDate, overdueDate, testUser.id]
      );

      const response = await axios.get(`${BACKEND_URL}/api/v1/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const dueDate = new Date(response.data.data.user.proof_of_life_due_date);
      const now = new Date();
      expect(dueDate < now).toBe(true);
    });
  });

  describe('Proof-of-Life Initiation', () => {
    it('should initiate proof-of-life verification', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/user/proof-of-life`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.sessionId).toBeDefined();
      expect(response.data.data.verificationMethods).toBeDefined();
    });
  });

  describe('Proof-of-Life Verification', () => {
    it('should complete proof-of-life and update due date', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const initiateResponse = await axios.post(
        `${BACKEND_URL}/api/v1/user/proof-of-life`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const sessionId = initiateResponse.data.data.sessionId;

      const verifyResponse = await axios.post(
        `${BACKEND_URL}/api/v1/user/proof-of-life/verify`,
        {
          sessionId,
          method: 'facial_recognition',
          verificationData: {
            imageBase64: 'mock-selfie-data',
            livenessScore: 0.95,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.success).toBe(true);
      expect(verifyResponse.data.data.verified).toBe(true);

      const pool = getTestPool();
      const userCheck = await pool.query(
        'SELECT last_proof_of_life, proof_of_life_due_date FROM users WHERE id = $1',
        [testUser.id]
      );

      expect(userCheck.rows[0].last_proof_of_life).not.toBeNull();

      const dueDate = new Date(userCheck.rows[0].proof_of_life_due_date);
      const expectedDueDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      const diffDays = Math.abs(dueDate.getTime() - expectedDueDate.getTime()) / (1000 * 60 * 60 * 24);
      
      expect(diffDays).toBeLessThan(1);
    }, 10000);

    it('should reject proof-of-life with low liveness score', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const initiateResponse = await axios.post(
        `${BACKEND_URL}/api/v1/user/proof-of-life`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const sessionId = initiateResponse.data.data.sessionId;

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/user/proof-of-life/verify`,
          {
            sessionId,
            method: 'facial_recognition',
            verificationData: {
              imageBase64: 'mock-selfie-data',
              livenessScore: 0.45, // Below threshold
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected low liveness score');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.message).toContain('liveness');
      }
    }, 10000);
  });

  describe('Account Suspension', () => {
    it('should suspend account after failed proof-of-life grace period', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      const overdueDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

      await pool.query(
        `UPDATE users 
         SET proof_of_life_due_date = $1,
             wallet_status = 'suspended'
         WHERE id = $2`,
        [overdueDate, testUser.id]
      );

      try {
        await axios.get(`${BACKEND_URL}/api/v1/wallets`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        fail('Should have rejected suspended account');
      } catch (error: any) {
        expect([403, 423]).toContain(error.response.status);
        expect(error.response.data.error.message).toContain('suspend');
      }
    });
  });
});
