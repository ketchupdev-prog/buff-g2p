/**
 * Unit Tests for Payment Security API Authentication
 * Tests Fix #1: Payment endpoints require authentication
 */

import request from 'supertest';
import express from 'express';
import paymentRoutes from '../../src/security/api/payments';

describe('Payment Security API Authentication', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentRoutes);
  });

  describe('POST /api/payments/initiate', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await request(app)
        .post('/api/payments/initiate')
        .send({
          amount: 100,
          currency: 'NAD',
          recipientId: 'user123',
          paymentType: 'EFT',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          amount: 100,
          currency: 'NAD',
          recipientId: 'user123',
          paymentType: 'EFT',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject request without Bearer prefix', async () => {
      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', 'some_token')
        .send({
          amount: 100,
          currency: 'NAD',
          recipientId: 'user123',
          paymentType: 'EFT',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('authorization header');
    });
  });

  describe('POST /api/payments/verify-2fa', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/verify-2fa')
        .send({
          otpId: 'otp123',
          otpCode: '123456',
          method: 'SMS_OTP',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payments/request-otp', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/request-otp')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/payments/:paymentId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payments/payment123');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payments/tokenize-card', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/tokenize-card')
        .send({
          cardNumber: '4111111111111111',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PSD-12 Compliance Verification', () => {
    it('should enforce authentication middleware chain', async () => {
      // Test that all payment endpoints have requireAuth middleware
      const paymentEndpoints = [
        '/api/payments/initiate',
        '/api/payments/verify-2fa',
        '/api/payments/request-otp',
        '/api/payments/tokenize-card',
      ];

      for (const endpoint of paymentEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({});

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});
