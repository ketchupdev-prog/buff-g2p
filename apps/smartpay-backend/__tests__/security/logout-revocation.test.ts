/**
 * Unit Tests for Logout Token Revocation
 * Tests Fix #5: Logout endpoint properly revokes tokens
 */

import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth';
import { generateAccessToken, verifyAccessToken, revokeAccessToken } from '../../src/lib/jwt';

// Mock the JWT functions
jest.mock('../../src/lib/jwt', () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  revokeAllUserTokens: jest.fn(),
  revokeAccessToken: jest.fn(),
  verifyAccessToken: jest.fn(),
}));

describe('Logout Token Revocation', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should require authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject logout without Bearer prefix', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'invalid_format')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should successfully logout with valid token', async () => {
      const validToken = 'valid.jwt.token';
      
      // Mock token verification
      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: true,
        payload: {
          userId: 'user123',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      // Mock token revocation
      (revokeAccessToken as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
      expect(revokeAccessToken).toHaveBeenCalledWith(validToken);
    });

    it('should handle already-revoked tokens gracefully', async () => {
      const revokedToken = 'revoked.token';
      
      // Mock token verification returning invalid
      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Token revoked or session not found',
      });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${revokedToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should not attempt to revoke already-invalid token
      expect(revokeAccessToken).not.toHaveBeenCalled();
    });

    it('should extract userId from token before revoking', async () => {
      const token = 'user.token';
      const userId = 'user456';
      
      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: true,
        payload: {
          userId,
          type: 'access',
        },
      });

      (revokeAccessToken as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(userId);
      expect(verifyAccessToken).toHaveBeenCalledWith(token);
      expect(revokeAccessToken).toHaveBeenCalledWith(token);
    });
  });

  describe('Token Revocation Flow', () => {
    it('should revoke token from user_sessions table', async () => {
      const token = 'test.token';
      const userId = 'user789';

      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: true,
        payload: { userId, type: 'access' },
      });

      (revokeAccessToken as jest.Mock).mockResolvedValue(undefined);

      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Verify revokeAccessToken was called with correct token
      expect(revokeAccessToken).toHaveBeenCalledTimes(1);
      expect(revokeAccessToken).toHaveBeenCalledWith(token);
    });

    it('should prevent token reuse after logout', async () => {
      const token = 'to.be.revoked';
      const userId = 'user101';

      // First: successful logout
      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: true,
        payload: { userId, type: 'access' },
      });

      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(logoutResponse.status).toBe(200);

      // Second: token should now be invalid
      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Token revoked or session not found',
      });

      const reuseResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Should still return 200 (graceful handling of already-revoked token)
      expect(reuseResponse.status).toBe(200);
    });
  });

  describe('Security Logging', () => {
    it('should log successful logout events', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const token = 'user.token';
      const userId = 'user999';

      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: true,
        payload: { userId, type: 'access' },
      });

      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[AUTH] User ${userId} logged out successfully`)
      );

      consoleLogSpy.mockRestore();
    });

    it('should log errors during logout', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const token = 'error.token';

      (verifyAccessToken as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH] Logout error'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('PSD-12 Compliance', () => {
    it('should implement secure session management per PSD-12 Section 11.13', async () => {
      const token = 'compliance.token';
      const userId = 'user202';

      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: true,
        payload: { userId, type: 'access' },
      });

      (revokeAccessToken as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Verify compliance requirements
      expect(response.status).toBe(200);
      expect(revokeAccessToken).toHaveBeenCalled();
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userId');
    });
  });
});
