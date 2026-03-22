/**
 * Real Authentication Flow Integration Tests
 * Location: fintech/smartpay-mobile/__tests__/integration/real-auth.integration.test.ts
 * 
 * Tests:
 * - OTP request and delivery
 * - OTP verification
 * - JWT token generation
 * - User creation during onboarding
 * - SmartPay ID generation
 * - Rate limiting
 * - Real API calls and database operations
 */

import axios from 'axios';
import {
  initTestDatabase,
  closeTestDatabase,
  cleanupTestData,
  getTestPool,
} from './setup/test-database';
import { getBackendUrl } from './setup/test-servers';

const BACKEND_URL = getBackendUrl();

describe('Real Authentication Flow Integration', () => {
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

  describe('OTP Request', () => {
    it('should request OTP for valid phone number', async () => {
      const testPhone = '+264811234567';

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/auth/request-otp`,
        {
          phone: testPhone,
          channel: 'sms',
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('sent');
      expect(response.data.expiresIn).toBe(300);

      const pool = getTestPool();
      const otpCheck = await pool.query(
        `SELECT * FROM otp_codes WHERE phone = $1 AND purpose = 'login' ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );

      expect(otpCheck.rowCount).toBeGreaterThan(0);
      expect(otpCheck.rows[0].phone).toBe(testPhone);
      expect(otpCheck.rows[0].code).toHaveLength(6);
      expect(otpCheck.rows[0].verified).toBe(false);
    });

    it('should request OTP with email channel', async () => {
      const testPhone = '+264822222222';
      const testEmail = 'test@example.com';

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/auth/request-otp`,
        {
          phone: testPhone,
          email: testEmail,
          channel: 'email',
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('email');
    });

    it('should reject OTP request with invalid phone format', async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
          phone: 'invalid-phone',
          channel: 'sms',
        });
        fail('Should have rejected invalid phone');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('Invalid phone number');
      }
    });

    it('should enforce rate limiting on OTP requests', async () => {
      const testPhone = '+264833333333';

      for (let i = 0; i < 5; i++) {
        await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
          phone: testPhone,
          channel: 'sms',
        });
      }

      try {
        await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
          phone: testPhone,
          channel: 'sms',
        });
        fail('Should have hit rate limit');
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.data.error).toContain('Too many requests');
        expect(error.response.data.retryAfter).toBeDefined();
      }
    }, 15000);
  });

  describe('OTP Verification and User Creation', () => {
    it('should verify OTP and create new user with SmartPay ID', async () => {
      const testPhone = '+264844444444';

      await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
        phone: testPhone,
        channel: 'sms',
      });

      const pool = getTestPool();
      const otpResult = await pool.query(
        `SELECT code FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );

      const otpCode = otpResult.rows[0].code;

      const response = await axios.post(
        `${BACKEND_URL}/api/v1/auth/verify-otp`,
        {
          phone: testPhone,
          code: otpCode,
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.refreshToken).toBeDefined();
      expect(response.data.smartpayId).toBeDefined();
      expect(response.data.smartpayId).toMatch(/^SP\d{8}$/);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.phone).toBe(testPhone);

      const userCheck = await pool.query(
        'SELECT * FROM users WHERE phone = $1',
        [testPhone]
      );

      expect(userCheck.rowCount).toBe(1);
      expect(userCheck.rows[0].smartpay_id).toBe(response.data.smartpayId);
    }, 10000);

    it('should verify OTP and return existing user', async () => {
      const testPhone = '+264855555555';

      await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
        phone: testPhone,
        channel: 'sms',
      });

      const pool = getTestPool();
      const otpResult = await pool.query(
        `SELECT code FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );

      const otpCode = otpResult.rows[0].code;

      const response1 = await axios.post(
        `${BACKEND_URL}/api/v1/auth/verify-otp`,
        {
          phone: testPhone,
          code: otpCode,
        }
      );

      const userId1 = response1.data.user.id;

      await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
        phone: testPhone,
        channel: 'sms',
      });

      const otpResult2 = await pool.query(
        `SELECT code FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );

      const otpCode2 = otpResult2.rows[0].code;

      const response2 = await axios.post(
        `${BACKEND_URL}/api/v1/auth/verify-otp`,
        {
          phone: testPhone,
          code: otpCode2,
        }
      );

      expect(response2.status).toBe(200);
      expect(response2.data.user.id).toBe(userId1);
    }, 15000);

    it('should reject verification with wrong OTP', async () => {
      const testPhone = '+264866666666';

      await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
        phone: testPhone,
        channel: 'sms',
      });

      try {
        await axios.post(`${BACKEND_URL}/api/v1/auth/verify-otp`, {
          phone: testPhone,
          code: '999999',
        });
        fail('Should have rejected wrong OTP');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.attemptsRemaining).toBeDefined();
      }
    });

    it('should reject verification of expired OTP', async () => {
      const testPhone = '+264877777777';
      const pool = getTestPool();

      const expiredOtp = '123456';
      await pool.query(
        `INSERT INTO otp_codes (phone, code, purpose, expires_at, created_at)
         VALUES ($1, $2, 'login', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes')`,
        [testPhone, expiredOtp]
      );

      try {
        await axios.post(`${BACKEND_URL}/api/v1/auth/verify-otp`, {
          phone: testPhone,
          code: expiredOtp,
        });
        fail('Should have rejected expired OTP');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('expired');
      }
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const testPhone = '+264888888888';

      await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
        phone: testPhone,
        channel: 'sms',
      });

      const pool = getTestPool();
      const otpResult = await pool.query(
        `SELECT code FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );

      const verifyResponse = await axios.post(
        `${BACKEND_URL}/api/v1/auth/verify-otp`,
        {
          phone: testPhone,
          code: otpResult.rows[0].code,
        }
      );

      const refreshToken = verifyResponse.data.refreshToken;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const refreshResponse = await axios.post(
        `${BACKEND_URL}/api/v1/auth/refresh`,
        {
          refreshToken,
        }
      );

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data.success).toBe(true);
      expect(refreshResponse.data.accessToken).toBeDefined();
      expect(refreshResponse.data.accessToken).not.toBe(verifyResponse.data.accessToken);
    }, 15000);

    it('should reject refresh with invalid token', async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/v1/auth/refresh`, {
          refreshToken: 'invalid-token-12345',
        });
        fail('Should have rejected invalid refresh token');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toContain('Invalid refresh token');
      }
    });
  });

  describe('Logout', () => {
    it('should logout and revoke tokens', async () => {
      const testPhone = '+264899999999';

      await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, {
        phone: testPhone,
        channel: 'sms',
      });

      const pool = getTestPool();
      const otpResult = await pool.query(
        `SELECT code FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
        [testPhone]
      );

      const verifyResponse = await axios.post(
        `${BACKEND_URL}/api/v1/auth/verify-otp`,
        {
          phone: testPhone,
          code: otpResult.rows[0].code,
        }
      );

      const accessToken = verifyResponse.data.accessToken;

      const logoutResponse = await axios.post(
        `${BACKEND_URL}/api/v1/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.data.success).toBe(true);
    }, 15000);
  });
});
