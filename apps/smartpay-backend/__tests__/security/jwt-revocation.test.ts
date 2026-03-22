/**
 * Unit Tests for JWT Revocation Check
 * Tests Fix #2: Legacy JWT path checks user_sessions table
 */

import { requireAuth } from '../../src/middleware/requireAuth';
import { generateAccessToken, revokeAccessToken, verifyAccessToken } from '../../src/lib/jwt';
import { Request, Response } from 'express';

// Mock dependencies
jest.mock('../../src/lib/jwt', () => ({
  generateAccessToken: jest.fn(),
  revokeAccessToken: jest.fn(),
  verifyAccessToken: jest.fn(),
}));

jest.mock('../../src/services/auth/supabase-verify', () => ({
  verifySupabaseBearerToken: jest.fn().mockResolvedValue({ valid: false }),
}));

describe('JWT Revocation Check', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();

    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Revocation Flow', () => {
    it('should reject revoked tokens from user_sessions table', async () => {
      const token = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      // Mock verifyAccessToken to return token not found
      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Token revoked or session not found',
      });

      await requireAuth(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: expect.stringContaining('revoked'),
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow valid tokens that exist in user_sessions', async () => {
      const token = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      // Mock successful verification
      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: true,
        payload: {
          userId: 'user123',
          type: 'access',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      });

      await requireAuth(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(verifyAccessToken).toHaveBeenCalledWith(token);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should check database after JWT signature verification', async () => {
      const token = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await requireAuth(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      // Verify that verifyAccessToken (DB check) was called
      expect(verifyAccessToken).toHaveBeenCalled();
    });
  });

  describe('Logout Scenario', () => {
    it('should prevent token reuse after logout', async () => {
      const userId = 'user123';
      const token = 'user.token.here';

      // Simulate logout - token is revoked
      (revokeAccessToken as jest.Mock).mockResolvedValue(undefined);
      await revokeAccessToken(token);

      // Try to use revoked token
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Token revoked or session not found',
      });

      await requireAuth(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Security Compliance', () => {
    it('should log security warning for revoked token attempts', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const token = 'revoked.token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (verifyAccessToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Token revoked',
      });

      await requireAuth(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token revocation check failed'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
