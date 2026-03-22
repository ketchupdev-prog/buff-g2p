/**
 * Unit Tests for Internal API Authentication
 * Tests Fix #3: Compliance, Fraud, and Audit APIs require authentication
 */

import request from 'supertest';
import express from 'express';
import complianceRoutes from '../../src/routes/compliance';
import fraudRoutes from '../../src/security/api/fraud';
import auditRoutes from '../../src/security/api/audit';

describe('Internal API Authentication', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', complianceRoutes);
    app.use('/api/fraud', fraudRoutes);
    app.use('/api/audit', auditRoutes);

    // Set service key for tests
    process.env.INTERNAL_SERVICE_API_KEY = 'test-service-key-12345';
  });

  afterAll(() => {
    delete process.env.INTERNAL_SERVICE_API_KEY;
  });

  describe('Compliance API Authentication', () => {
    const complianceEndpoints = [
      { method: 'post', path: '/api/v1/compliance/validate-limits' },
      { method: 'post', path: '/api/v1/compliance/violations' },
      { method: 'post', path: '/api/v1/compliance/estimate-fees' },
      { method: 'post', path: '/api/v1/compliance/security-alert' },
      { method: 'get', path: '/api/v1/compliance/fraud-thresholds' },
      { method: 'get', path: '/api/v1/compliance/kri-metrics' },
      { method: 'get', path: '/api/v1/compliance/config' },
    ];

    it.each(complianceEndpoints)(
      'should reject $method $path without authentication',
      async ({ method, path }) => {
        const response = await request(app)[method as 'get' | 'post'](path)
          .send({});

        expect([401, 403, 500]).toContain(response.status);
      }
    );

    it('should accept valid service API key', async () => {
      const response = await request(app)
        .get('/api/v1/compliance/fraud-thresholds')
        .set('X-Service-Key', 'test-service-key-12345');

      // Should not return 401 or 403
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should reject invalid service API key', async () => {
      const response = await request(app)
        .get('/api/v1/compliance/fraud-thresholds')
        .set('X-Service-Key', 'invalid-key');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Invalid service API key');
    });
  });

  describe('Fraud Detection API Authentication', () => {
    const fraudEndpoints = [
      { method: 'post', path: '/api/fraud/check-payment' },
      { method: 'get', path: '/api/fraud/rules' },
      { method: 'post', path: '/api/fraud/rules' },
      { method: 'get', path: '/api/fraud/stats' },
    ];

    it.each(fraudEndpoints)(
      'should require authentication for $method $path',
      async ({ method, path }) => {
        const response = await request(app)[method as 'get' | 'post'](path)
          .send({});

        expect([401, 403, 500]).toContain(response.status);
      }
    );

    it('should accept service API key for fraud detection', async () => {
      const response = await request(app)
        .get('/api/fraud/rules')
        .set('X-Service-Key', 'test-service-key-12345');

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('Audit API Authentication', () => {
    const auditEndpoints = [
      { method: 'post', path: '/api/audit/log' },
      { method: 'get', path: '/api/audit/logs' },
      { method: 'get', path: '/api/audit/security-events' },
      { method: 'get', path: '/api/audit/compliance-report' },
    ];

    it.each(auditEndpoints)(
      'should require authentication for $method $path',
      async ({ method, path }) => {
        const response = await request(app)[method as 'get' | 'post'](path)
          .send({});

        expect([401, 403, 500]).toContain(response.status);
      }
    );

    it('should accept service API key for audit logging', async () => {
      const response = await request(app)
        .post('/api/audit/log')
        .set('X-Service-Key', 'test-service-key-12345')
        .send({
          event_type: 'test_event',
          timestamp: new Date().toISOString(),
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('Service Key Security', () => {
    it('should log security warnings for invalid service key attempts', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await request(app)
        .get('/api/v1/compliance/config')
        .set('X-Service-Key', 'wrong-key');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid service API key'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return error when service key not configured', async () => {
      const originalKey = process.env.INTERNAL_SERVICE_API_KEY;
      delete process.env.INTERNAL_SERVICE_API_KEY;

      const response = await request(app)
        .get('/api/v1/compliance/config')
        .set('X-Service-Key', 'any-key');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('not configured');

      process.env.INTERNAL_SERVICE_API_KEY = originalKey;
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply rate limiting to internal APIs', async () => {
      // Make multiple requests to test rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/v1/compliance/fraud-thresholds')
          .set('X-Service-Key', 'test-service-key-12345')
      );

      const responses = await Promise.all(requests);

      // All requests should succeed (within rate limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
        if (response.status === 200) {
          expect(response.headers).toHaveProperty('x-ratelimit-limit');
          expect(response.headers).toHaveProperty('x-ratelimit-remaining');
        }
      });
    });
  });
});
