/**
 * Authentication & 2FA API Endpoints
 * PSD-12 Compliance: Section 12.2 - 2FA REQUIRED for EVERY payment
 * 
 * Provides authentication services for:
 * - 2FA verification
 * - Session management
 * - Token validation
 */

import express, { Request, Response } from 'express';
import { twoFactorAuthService } from '../services/TwoFactorAuthService';

const router = express.Router();

/**
 * POST /api/auth/verify-2fa-session
 * Verify if user has valid 2FA session for payment operations
 * 
 * Called by:
 * - Python backend security middleware
 * - Payment endpoints
 * 
 * Returns:
 * - verified: boolean
 * - method: 2FA method used
 * - expiresAt: session expiry time
 */
router.post('/verify-2fa-session', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    const authHeader = req.headers.authorization;

    if (!user_id) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'user_id is required',
      });
      return;
    }

    if (!authHeader) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authorization header required',
      });
      return;
    }

    // Check if user has active 2FA session
    // TODO: Check session in database/Redis
    // For now, we'll check if the request has a recent 2FA verification
    
    // In production, implement:
    // 1. Check Redis for 2FA session key: `2fa_session:${user_id}`
    // 2. Validate session hasn't expired (5 minutes for payments)
    // 3. Return session details

    // Mock implementation (replace with actual session check)
    const has2FASession = await check2FASession(user_id);

    if (has2FASession) {
      res.status(200).json({
        verified: true,
        method: 'SMS_OTP', // or TOTP, BIOMETRIC
        verifiedAt: new Date(Date.now() - 60000).toISOString(), // 1 min ago
        expiresAt: new Date(Date.now() + 240000).toISOString(), // 4 min from now
      });
    } else {
      res.status(403).json({
        verified: false,
        message: '2FA verification required for payment operations',
        code: 'PSD12_SECTION_12_2_VIOLATION',
      });
    }
  } catch (error) {
    console.error('2FA session verification error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify 2FA session',
    });
  }
});

/**
 * POST /api/auth/verify-2fa
 * Verify 2FA code and create session
 * 
 * Used for:
 * - Payment authorization
 * - Login verification
 * - Sensitive operations
 */
router.post('/verify-2fa', async (req: Request, res: Response) => {
  try {
    const { otpId, otpCode, method, userId, purpose = 'PAYMENT' } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    let result;

    switch (method) {
      case 'SMS_OTP':
        if (!otpId || !otpCode) {
          res.status(400).json({ error: 'otpId and otpCode required for SMS OTP' });
          return;
        }
        result = await twoFactorAuthService.verifySMSOTP(userId, otpId, otpCode, purpose);
        break;

      case 'TOTP':
        if (!otpCode) {
          res.status(400).json({ error: 'otpCode required for TOTP' });
          return;
        }
        result = await twoFactorAuthService.verifyTOTP(userId, otpCode, purpose);
        break;

      case 'BIOMETRIC':
        if (!otpCode) {
          res.status(400).json({ error: 'biometric token required' });
          return;
        }
        result = await twoFactorAuthService.verifyBiometric(userId, otpCode, purpose);
        break;

      default:
        res.status(400).json({ error: 'Invalid 2FA method' });
        return;
    }

    if (result.success) {
      // Create 2FA session
      // TODO: Store session in Redis with 5-minute expiry
      // await redis.setex(`2fa_session:${userId}`, 300, JSON.stringify({ method, verifiedAt: new Date() }));

      res.status(200).json({
        success: true,
        message: '2FA verified successfully',
        method,
        verified: true,
        expiresIn: 300, // 5 minutes in seconds
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify 2FA',
    });
  }
});

/**
 * POST /api/auth/request-otp
 * Request OTP for 2FA
 * 
 * Sends OTP via:
 * - SMS (most common)
 * - Email (optional)
 */
router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const { userId, phoneNumber, purpose = 'PAYMENT' } = req.body;

    if (!userId || !phoneNumber) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'userId and phoneNumber are required',
      });
      return;
    }

    const result = await twoFactorAuthService.sendSMSOTP(userId, phoneNumber, purpose);

    if (result.success) {
      res.status(200).json({
        success: true,
        otpId: result.otpId,
        expiresAt: result.expiresAt,
        message: result.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to send OTP',
    });
  }
});

/**
 * POST /api/auth/setup-totp
 * Setup TOTP authenticator app
 * 
 * Returns:
 * - secret: TOTP secret key
 * - qrCodeUrl: QR code for scanning
 * - backupCodes: Emergency backup codes
 */
router.post('/setup-totp', async (req: Request, res: Response) => {
  try {
    const { userId, userEmail } = req.body;

    if (!userId || !userEmail) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'userId and userEmail are required',
      });
      return;
    }

    const result = await twoFactorAuthService.setupTOTP(userId, userEmail);

    res.status(200).json({
      success: true,
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
      backupCodes: result.backupCodes,
      message: 'TOTP setup successful. Save backup codes in a secure location.',
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to setup TOTP',
    });
  }
});

/**
 * GET /api/auth/2fa-status/:userId
 * Check if user has 2FA enabled
 */
router.get('/2fa-status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'userId is required' });
      return;
    }

    const is2FAEnabled = await twoFactorAuthService.is2FAEnabled(userId);
    const preferredMethod = await twoFactorAuthService.getPreferred2FAMethod(userId);

    res.status(200).json({
      userId,
      is2FAEnabled,
      preferredMethod,
      compliance: is2FAEnabled ? 'PSD-12 COMPLIANT' : 'PSD-12 NON-COMPLIANT - 2FA required for payments',
    });
  } catch (error) {
    console.error('2FA status check error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to check 2FA status',
    });
  }
});

// ==================== Helper Functions ====================

async function check2FASession(userId: string): Promise<boolean> {
  // TODO: Implement actual session check
  // Check Redis: await redis.get(`2fa_session:${userId}`)
  // For development, return false to require 2FA
  return false;
}

export default router;

/**
 * Integration Example:
 * 
 * import express from 'express';
 * import authRoutes from './security/api/auth';
 * 
 * const app = express();
 * app.use(express.json());
 * 
 * // Mount auth routes
 * app.use('/api/auth', authRoutes);
 * 
 * app.listen(4000, () => {
 *   console.log('Server running on port 4000');
 * });
 */
