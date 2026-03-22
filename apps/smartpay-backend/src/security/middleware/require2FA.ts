/**
 * 2FA Enforcement Middleware
 * PSD-12 Compliance: Section 12.2 - 2FA REQUIRED for EVERY payment
 * 
 * This middleware must be applied to ALL payment endpoints
 * Blocks any payment transaction that doesn't have valid 2FA
 */

import { Request, Response, NextFunction } from 'express';
import { twoFactorAuthService } from '../services/TwoFactorAuthService';

interface Authenticated2FARequest extends Request {
  user?: {
    userId: string;
    email: string;
    [key: string]: any;
  };
  payment?: {
    amount: number;
    currency: string;
    recipientId: string;
    [key: string]: any;
  };
  twoFactorAuth?: {
    method: string;
    verified: boolean;
    verifiedAt: Date;
  };
}

/**
 * Middleware to enforce 2FA for payment transactions
 * PSD-12 Section 12.2: "two-factor authentication must be required for EVERY payment"
 */
export async function require2FAForPayment(
  req: Authenticated2FARequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract user from request (assuming authentication middleware has already run)
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Check if 2FA has been verified in this session
    const twoFactorAuth = req.twoFactorAuth;

    if (!twoFactorAuth || !twoFactorAuth.verified) {
      res.status(403).json({
        error: 'TWO_FACTOR_AUTH_REQUIRED',
        message: 'Two-factor authentication is required for all payment transactions',
        code: 'PSD12_SECTION_12_2_VIOLATION',
        compliance: 'PSD-12 Section 12.2 mandates 2FA for EVERY payment',
        requiresAction: '2FA_VERIFICATION',
      });
      return;
    }

    // Check if 2FA verification is recent (within last 5 minutes for payments)
    const verifiedAt = twoFactorAuth.verifiedAt;
    const now = new Date();
    const timeSinceVerification = now.getTime() - verifiedAt.getTime();
    const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (timeSinceVerification > maxAge) {
      res.status(403).json({
        error: 'TWO_FACTOR_AUTH_EXPIRED',
        message: '2FA verification has expired. Please verify again.',
        code: '2FA_EXPIRED',
        requiresAction: '2FA_REVERIFICATION',
      });
      return;
    }

    // Log 2FA compliance for audit trail
    console.log(`[2FA VERIFIED] User: ${user.userId}, Method: ${twoFactorAuth.method}, Payment: ${req.payment?.amount}`);

    // 2FA verified - proceed with payment
    next();
  } catch (error) {
    console.error('2FA middleware error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while verifying 2FA',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Middleware to check if user has 2FA enabled
 * Should be checked during user registration/onboarding
 */
export async function check2FAEnabled(
  req: Authenticated2FARequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
      return;
    }

    const is2FAEnabled = await twoFactorAuthService.is2FAEnabled(user.userId);

    if (!is2FAEnabled) {
      res.status(403).json({
        error: 'TWO_FACTOR_AUTH_NOT_ENABLED',
        message: 'You must enable two-factor authentication before making payments',
        code: 'PSD12_COMPLIANCE_REQUIRED',
        compliance: 'PSD-12 Section 12.2 requires 2FA for all payments',
        requiresAction: '2FA_SETUP',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('2FA enabled check error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while checking 2FA status',
    });
  }
}

/**
 * Middleware to initiate 2FA verification
 * Sends OTP/TOTP challenge to user
 */
export async function initiate2FA(
  req: Authenticated2FARequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
      return;
    }

    // Get user's preferred 2FA method
    const preferred2FAMethod = await twoFactorAuthService.getPreferred2FAMethod(user.userId);

    if (!preferred2FAMethod) {
      res.status(400).json({
        error: 'NO_2FA_METHOD',
        message: 'No 2FA method configured for this user',
        requiresAction: '2FA_SETUP',
      });
      return;
    }

    // Initiate 2FA based on method
    let result;

    switch (preferred2FAMethod) {
      case 'SMS_OTP':
        // Get user's phone number from database
        const phoneNumber = '+264812345678'; // TODO: Get from database
        result = await twoFactorAuthService.sendSMSOTP(user.userId, phoneNumber, 'PAYMENT');
        break;

      case 'TOTP':
        // For TOTP, just inform user to enter code from authenticator app
        result = {
          success: true,
          message: 'Please enter the code from your authenticator app',
        };
        break;

      case 'BIOMETRIC':
        // For biometric, client should handle biometric prompt
        result = {
          success: true,
          message: 'Please verify using biometric authentication',
        };
        break;

      default:
        res.status(400).json({
          error: 'INVALID_2FA_METHOD',
          message: 'Invalid 2FA method',
        });
        return;
    }

    res.status(200).json({
      success: result.success,
      message: result.message,
      method: preferred2FAMethod,
      otpId: (result as any).otpId,
      expiresAt: (result as any).expiresAt,
    });
  } catch (error) {
    console.error('2FA initiation error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while initiating 2FA',
    });
  }
}

/**
 * Utility function to mark 2FA as verified in request
 * Call this after successful 2FA verification
 */
export function mark2FAVerified(
  req: Authenticated2FARequest,
  method: string
): void {
  req.twoFactorAuth = {
    method,
    verified: true,
    verifiedAt: new Date(),
  };
}

/**
 * Example usage in Express route:
 * 
 * // Payment endpoint with 2FA enforcement
 * app.post(
 *   '/api/payments/send',
 *   authenticateUser,           // First: Authenticate user
 *   check2FAEnabled,            // Second: Check if 2FA is enabled
 *   require2FAForPayment,       // Third: Require 2FA verification
 *   async (req, res) => {
 *     // Process payment
 *     // This code only runs if all middleware passes
 *     // PSD-12 Section 12.2 compliance is enforced
 *   }
 * );
 * 
 * // 2FA verification endpoint
 * app.post(
 *   '/api/auth/verify-2fa',
 *   authenticateUser,
 *   async (req, res) => {
 *     const { otpId, otpCode, method } = req.body;
 *     
 *     let result;
 *     if (method === 'SMS_OTP') {
 *       result = await twoFactorAuthService.verifySMSOTP(
 *         req.user.userId,
 *         otpId,
 *         otpCode,
 *         'PAYMENT'
 *       );
 *     } else if (method === 'TOTP') {
 *       result = await twoFactorAuthService.verifyTOTP(
 *         req.user.userId,
 *         otpCode,
 *         'PAYMENT'
 *       );
 *     }
 *     
 *     if (result.success) {
 *       // Mark 2FA as verified in session
 *       mark2FAVerified(req, method);
 *       res.json({ success: true, message: '2FA verified' });
 *     } else {
 *       res.status(400).json({ success: false, error: result.error });
 *     }
 *   }
 * );
 */
