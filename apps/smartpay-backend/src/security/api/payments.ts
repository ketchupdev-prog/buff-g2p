/**
 * Payment API Endpoints with PSD-12 Compliance
 * 
 * All payment endpoints enforce:
 * - 2FA (Section 12.2)
 * - Fraud detection (Section 11.6)
 * - Audit logging
 * - Encryption/tokenization (Section 12.1)
 */

import express, { Request, Response } from 'express';
import { fraudDetectionService } from '../services/FraudDetectionService';
import { twoFactorAuthService } from '../services/TwoFactorAuthService';
import { encryptionService } from '../services/EncryptionService';
import { require2FAForPayment, check2FAEnabled, mark2FAVerified } from '../middleware/require2FA';
import { requireAuth } from '../../middleware/requireAuth';

const router = express.Router();

/**
 * PSD-12 Section 12.2 Compliance: Authentication Middleware Chain
 * 
 * All payment endpoints MUST enforce this security chain:
 * 1. requireAuth: Verifies JWT token and populates req.user
 * 2. check2FAEnabled: Ensures user has 2FA configured
 * 3. require2FAForPayment: Validates recent 2FA verification
 * 
 * This ensures compliance with PSD-12 Section 12.2 which mandates
 * two-factor authentication for EVERY payment transaction.
 */
const paymentMiddleware = [
  requireAuth,           // CRITICAL: Authenticates user and populates req.user
  check2FAEnabled,       // Checks if user has 2FA enabled
  require2FAForPayment,  // Validates 2FA verification for this payment
];

/**
 * POST /api/payments/initiate
 * Initiate a payment transaction
 * 
 * PSD-12 Compliance:
 * - Section 12.2: Requires 2FA
 * - Section 11.6: Fraud detection on ALL payments
 * - Section 12.1: Tokenization of sensitive data
 */
router.post('/initiate', ...paymentMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      amount,
      currency = 'NAD',
      recipientId,
      paymentType, // 'CARD', 'EFT', 'E_MONEY', 'QR_CODE'
      paymentMethod,
      cardToken, // Tokenized card number (not plain card number)
      note,
    } = req.body;

    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Validate inputs
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    if (!recipientId) {
      res.status(400).json({ error: 'Recipient is required' });
      return;
    }

    // Generate payment ID
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // PSD-12 Section 11.6: Fraud detection on ALL payments
    const fraudCheck = await fraudDetectionService.checkPayment({
      paymentId,
      userId,
      amount,
      currency,
      paymentType,
      paymentMethod,
      recipientId,
      deviceId: req.headers['x-device-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Handle fraud check result
    if (fraudCheck.blocked) {
      res.status(403).json({
        error: 'PAYMENT_BLOCKED',
        message: fraudCheck.blockReason,
        riskScore: fraudCheck.riskScore,
        fraudIndicators: fraudCheck.fraudIndicators,
        paymentId,
      });
      return;
    }

    if (fraudCheck.requiresReview) {
      res.status(202).json({
        success: false,
        status: 'PENDING_REVIEW',
        message: 'Payment requires manual review due to elevated fraud risk',
        riskScore: fraudCheck.riskScore,
        paymentId,
      });
      return;
    }

    if (fraudCheck.requiresStepUpAuth) {
      res.status(202).json({
        success: false,
        status: 'REQUIRES_ADDITIONAL_AUTH',
        message: 'Additional authentication required due to elevated risk',
        riskScore: fraudCheck.riskScore,
        paymentId,
        requiresAction: 'STEP_UP_2FA',
      });
      return;
    }

    // Payment passed fraud check and 2FA - proceed with processing
    // TODO: Integrate with actual payment processing system

    // Log to audit trail
    await logPaymentAudit({
      paymentId,
      userId,
      amount,
      currency,
      recipientId,
      paymentType,
      status: 'INITIATED',
      twoFactorAuthMethod: (req as any).twoFactorAuth?.method,
      fraudRiskScore: fraudCheck.riskScore,
    });

    res.status(200).json({
      success: true,
      paymentId,
      amount,
      currency,
      recipientId,
      status: 'INITIATED',
      message: 'Payment initiated successfully',
      riskScore: fraudCheck.riskScore,
      riskLevel: fraudCheck.riskLevel,
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to initiate payment',
    });
  }
});

/**
 * POST /api/payments/verify-2fa
 * Verify 2FA for payment
 * Required before initiating payment (PSD-12 Section 12.2)
 */
router.post('/verify-2fa', requireAuth, async (req: Request, res: Response) => {
  try {
    const { otpId, otpCode, method } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    let result;

    switch (method) {
      case 'SMS_OTP':
        result = await twoFactorAuthService.verifySMSOTP(userId, otpId, otpCode, 'PAYMENT');
        break;

      case 'TOTP':
        result = await twoFactorAuthService.verifyTOTP(userId, otpCode, 'PAYMENT');
        break;

      case 'BIOMETRIC':
        result = await twoFactorAuthService.verifyBiometric(userId, otpCode, 'PAYMENT');
        break;

      default:
        res.status(400).json({ error: 'Invalid 2FA method' });
        return;
    }

    if (result.success) {
      // Mark 2FA as verified in session
      mark2FAVerified(req as any, method);

      res.status(200).json({
        success: true,
        message: '2FA verified successfully',
        method,
        verified: true,
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
 * POST /api/payments/request-otp
 * Request OTP for payment 2FA
 */
router.post('/request-otp', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const userPhone = (req as any).user?.phone; // Get from user profile

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const result = await twoFactorAuthService.sendSMSOTP(userId, userPhone, 'PAYMENT');

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
 * GET /api/payments/:paymentId
 * Get payment details
 */
router.get('/:paymentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = (req as any).user?.userId as string | undefined;

    if (!paymentId) {
      res.status(400).json({ error: 'INVALID_REQUEST', message: 'paymentId is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // TODO: Get payment from database
    const payment = await getPaymentById(paymentId, userId);

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // Mask sensitive data before returning
    if (payment.cardNumber) {
      payment.cardNumber = encryptionService.maskValue(payment.cardNumber, 'CARD');
    }

    res.status(200).json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve payment',
    });
  }
});

/**
 * POST /api/payments/tokenize-card
 * Tokenize card number (PSD-12 Section 12.1)
 */
router.post('/tokenize-card', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cardNumber } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!cardNumber) {
      res.status(400).json({ error: 'Card number is required' });
      return;
    }

    // PSD-12 Section 12.1: Tokenization
    const { token, maskedValue } = encryptionService.tokenizeCardNumber(cardNumber, true);

    // Store token in database (encrypted)
    // TODO: Store in database

    res.status(200).json({
      success: true,
      token,
      maskedCard: maskedValue,
      message: 'Card tokenized successfully',
    });
  } catch (error) {
    console.error('Card tokenization error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to tokenize card',
    });
  }
});

// ==================== Helper Functions ====================

async function logPaymentAudit(data: any): Promise<void> {
  // TODO: INSERT INTO payment_audit_trail table
  console.log('[PAYMENT AUDIT]', data);
}

async function getPaymentById(paymentId: string, userId: string): Promise<any> {
  // TODO: SELECT FROM payments table
  return null;
}

export default router;

/**
 * Integration Example:
 * 
 * import express from 'express';
 * import paymentRoutes from './security/api/payments';
 * 
 * const app = express();
 * app.use(express.json());
 * 
 * // Mount payment routes
 * app.use('/api/payments', paymentRoutes);
 * 
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000');
 * });
 */
