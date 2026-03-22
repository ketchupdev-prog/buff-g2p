/**
 * Real KYC Flow Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-kyc.integration.test.ts
 * 
 * Tests:
 * - KYC status checking
 * - KYC submission with documents
 * - Selfie video liveness detection
 * - Document upload
 * - KYC status transitions
 * - Real API calls and database updates
 */

import axios from 'axios';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  createTestUser,
  generateTestToken,
  getTestPool,
  waitForCondition,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();

describe('Real KYC Flow Integration', () => {
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

  describe('KYC Status', () => {
    it('should fetch KYC status for user', async () => {
      const testUser = await createTestUser({
        phone: '+264811234567',
        firstName: 'John',
        lastName: 'Doe',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/kyc/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.kycStatus).toBeDefined();
      expect(['pending', 'submitted', 'approved', 'rejected']).toContain(
        response.data.data.kycStatus
      );
    });

    it('should return pending status for new user', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const response = await axios.get(`${BACKEND_URL}/api/v1/kyc/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.data.data.kycStatus).toBe('pending');
      expect(response.data.data.tier).toBe(0);
    });
  });

  describe('KYC Submission', () => {
    it('should submit KYC information', async () => {
      const testUser = await createTestUser({
        phone: '+264811234567',
      });

      const token = generateTestToken(testUser.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/kyc/submit`,
        {
          firstName: 'John',
          lastName: 'Doe',
          idNumber: '12345678901234',
          dateOfBirth: '1990-01-15',
          nationality: 'NA',
          address: {
            street: '123 Main Street',
            city: 'Windhoek',
            region: 'Khomas',
            postalCode: '9000',
          },
          businessName: null,
          businessType: null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.submissionId).toBeDefined();

      const pool = getTestPool();
      const submissionCheck = await pool.query(
        'SELECT * FROM kyc_submissions WHERE user_id = $1',
        [testUser.id]
      );

      expect(submissionCheck.rowCount).toBeGreaterThan(0);
      expect(submissionCheck.rows[0].status).toBe('pending_documents');
    }, 10000);

    it('should reject KYC submission with invalid ID number', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/kyc/submit`,
          {
            firstName: 'John',
            lastName: 'Doe',
            idNumber: 'INVALID',
            dateOfBirth: '1990-01-15',
            nationality: 'NA',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected invalid ID number');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
      }
    });
  });

  describe('Document Upload', () => {
    it('should upload KYC documents', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      await axios.post(
        `${BACKEND_URL}/api/v1/kyc/submit`,
        {
          firstName: 'John',
          lastName: 'Doe',
          idNumber: '12345678901234',
          dateOfBirth: '1990-01-15',
          nationality: 'NA',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const mockIdFront = Buffer.from('fake-id-front-image').toString('base64');
      const mockIdBack = Buffer.from('fake-id-back-image').toString('base64');
      const mockProofOfResidence = Buffer.from('fake-proof-of-residence').toString('base64');
      const mockSelfieVideo = Buffer.from('fake-selfie-video').toString('base64');

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/kyc/upload-documents`,
        {
          id_document_front: mockIdFront,
          id_document_back: mockIdBack,
          proof_of_residence: mockProofOfResidence,
          selfie_video: mockSelfieVideo,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const pool = getTestPool();
      const submissionCheck = await pool.query(
        'SELECT status FROM kyc_submissions WHERE user_id = $1',
        [testUser.id]
      );

      expect(['pending_review', 'liveness_failed']).toContain(
        submissionCheck.rows[0].status
      );
    }, 15000);

    it('should reject document upload without selfie video', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      await axios.post(
        `${BACKEND_URL}/api/v1/kyc/submit`,
        {
          firstName: 'John',
          lastName: 'Doe',
          idNumber: '12345678901234',
          dateOfBirth: '1990-01-15',
          nationality: 'NA',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      try {
        await axios.post(
          `${BACKEND_URL}/api/v1/kyc/upload-documents`,
          {
            id_document_front: 'base64-data',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        fail('Should have rejected missing selfie video');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
      }
    });
  });

  describe('KYC Tier Limits', () => {
    it('should verify tier limits after KYC approval', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const pool = getTestPool();
      await pool.query(
        `UPDATE users 
         SET kyc_status = 'approved', kyc_tier = 2, updated_at = NOW()
         WHERE id = $1`,
        [testUser.id]
      );

      const response = await axios.get(`${BACKEND_URL}/api/v1/kyc/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.data.kycStatus).toBe('approved');
      expect(response.data.data.tier).toBe(2);
      expect(response.data.data.limits).toBeDefined();
      expect(response.data.data.limits.dailyLimit).toBeGreaterThan(0);
    });
  });

  describe('Business KYC', () => {
    it('should submit business KYC with certificate', async () => {
      const testUser = await createTestUser();
      const token = generateTestToken(testUser.id);

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/kyc/submit`,
        {
          firstName: 'Jane',
          lastName: 'Business',
          idNumber: '98765432109876',
          dateOfBirth: '1985-05-20',
          nationality: 'NA',
          businessName: 'Test Trading CC',
          businessType: 'close_corporation',
          businessRegistrationNumber: 'CC/2020/12345',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const pool = getTestPool();
      const submissionCheck = await pool.query(
        'SELECT * FROM kyc_submissions WHERE user_id = $1',
        [testUser.id]
      );

      expect(submissionCheck.rows[0].business_name).toBe('Test Trading CC');
      expect(submissionCheck.rows[0].business_type).toBe('close_corporation');
    }, 10000);
  });
});
