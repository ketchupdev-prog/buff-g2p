/**
 * Authentication Routes
 * Following Buffr G2P auth patterns
 */

import { Router, Request, Response } from 'express';
import { 
  generateOTP, 
  verifyOTP, 
  checkOTPRateLimit,
  sendOTPSMS,
  sendOTPEmail
} from '../lib/otp';
import { 
  generateAccessToken, 
  generateRefreshToken,
  refreshAccessToken,
  revokeAllUserTokens,
  revokeAccessToken,
  verifyAccessToken
} from '../lib/jwt';
import { getUserByPhone, createUser } from '../services/userService';
import { validateRequired, isValidPhoneNumber, isValidEmail, jsonError } from '../lib/security';

const router = Router();

/**
 * POST /api/v1/auth/request-otp
 * Request OTP for authentication. purpose optional (default 'login') for mobile.
 */
router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const validation = validateRequired(req.body, ['phone', 'channel']);
    if (!validation.valid) {
      return jsonError(res, 400, `Missing field: ${validation.missing}`);
    }

    const { phone, email, channel, purpose: bodyPurpose } = req.body;
    const purpose = bodyPurpose ?? 'login';

    // Validate phone number
    if (!isValidPhoneNumber(phone)) {
      return jsonError(res, 400, 'Invalid phone number');
    }

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return jsonError(res, 400, 'Invalid email address');
    }

    // Check rate limit
    const rateLimitCheck = await checkOTPRateLimit(phone, purpose);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please wait before requesting another OTP',
        retryAfter: rateLimitCheck.retryAfter
      });
    }

    // Generate OTP
    const result = await generateOTP({ phone, purpose });
    
    if (!result) {
      return jsonError(res, 500, 'Failed to generate OTP');
    }

    const { code, expiresAt } = result;

    // Send OTP based on channel
    const sendPromises: Promise<boolean>[] = [];
    
    if (channel === 'sms' || channel === 'both') {
      sendPromises.push(sendOTPSMS(phone, code));
    }
    
    if ((channel === 'email' || channel === 'both') && email) {
      sendPromises.push(sendOTPEmail(email, code));
    }

    await Promise.all(sendPromises);

    res.json({
      success: true,
      message: `Verification code sent to ${channel === 'both' ? 'phone and email' : channel}`,
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(res, 500, message);
  }
});

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and generate tokens. purpose optional (default 'login'). Creates user if not found (mobile sign-up).
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const validation = validateRequired(req.body, ['phone', 'code']);
    if (!validation.valid) {
      return jsonError(res, 400, `Missing field: ${validation.missing}`);
    }

    const { phone, code, purpose: bodyPurpose } = req.body;
    const purpose = bodyPurpose ?? 'login';

    // Verify OTP
    const verifyResult = await verifyOTP({ phone, code, purpose });
    
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message,
        attemptsRemaining: verifyResult.attemptsRemaining
      });
    }

    // Get or create user (mobile: create if not found for seamless sign-up)
    let user = await getUserByPhone(phone);
    
    if (!user) {
      const createResult = await createUser({ phone });
      if (!createResult.success || !createResult.data) {
        return jsonError(res, 500, createResult.error || 'Failed to create user');
      }
      user = createResult.data;
    }

    // Generate tokens
    const accessToken = await generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);
    const smartpayId = (user as { smartpay_id?: string }).smartpay_id ?? `SP${String(user.phone).replace(/\D/g, '').slice(-8)}`;

    res.json({
      success: true,
      accessToken,
      refreshToken,
      token: accessToken, // alias for mobile client
      smartpayId,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        photo_url: user.photo_url,
        wallet_status: user.wallet_status
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(res, 500, message);
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const validation = validateRequired(req.body, ['refreshToken']);
    if (!validation.valid) {
      return jsonError(res, 400, `Missing field: ${validation.missing}`);
    }

    const { refreshToken } = req.body;

    const result = await refreshAccessToken(refreshToken);
    
    if (result.error || !result.accessToken) {
      return jsonError(res, 401, result.error || 'Invalid refresh token');
    }

    res.json({
      success: true,
      accessToken: result.accessToken
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(res, 500, message);
  }
});

/**
 * POST /api/v1/auth/logout
 * Revoke user tokens (PSD-12 Section 11.13 - Secure session management)
 * 
 * SECURITY FIX: Implements proper token revocation to prevent reuse of logged-out tokens.
 * Tokens are immediately invalidated in the database, preventing any further use.
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.header('authorization') || req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonError(res, 401, 'Authentication required');
    }

    const token = authHeader.substring(7);
    
    // Verify and extract userId from token
    const verification = await verifyAccessToken(token);
    
    if (!verification.valid || !verification.payload) {
      // Token already invalid - treat as successful logout
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    }

    const userId = verification.payload.userId;
    
    // CRITICAL SECURITY FIX: Revoke the current access token
    await revokeAccessToken(token);
    
    // Also revoke all refresh tokens for this user (optional - more aggressive)
    // Uncomment if you want to log out all devices
    // await revokeAllUserTokens(userId);
    
    console.log(`[AUTH] User ${userId} logged out successfully, token revoked`);
    
    res.json({
      success: true,
      message: 'Logged out successfully',
      userId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AUTH] Logout error:', error);
    return jsonError(res, 500, message);
  }
});

export default router;
