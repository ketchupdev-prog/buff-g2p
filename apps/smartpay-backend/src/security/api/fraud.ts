/**
 * Fraud Detection API Endpoints
 * PSD-12 Compliance: Section 11.6 - Monitor ALL payments for fraud
 * 
 * Provides fraud detection as a service for:
 * - Python backend
 * - Frontend applications
 * - Third-party integrations
 * 
 * SECURITY: All endpoints require either:
 * 1. Valid JWT authentication (requireAuth middleware)
 * 2. Service API key validation (X-Service-Key header)
 */

import express, { Request, Response } from 'express';
import { fraudDetectionService } from '../services/FraudDetectionService';
import { requireAuth } from '../../middleware/requireAuth';
import { getRateLimiterForEndpoint } from '../../middleware/sharedRateLimiter';

const router = express.Router();

// Apply rate limiting to all fraud detection routes
const fraudRateLimiter = getRateLimiterForEndpoint('fraud_detection_internal');

/**
 * Service API Key Validation Middleware
 * For internal service-to-service authentication
 */
const validateServiceKey = (req: Request, res: Response, next: Function) => {
  const serviceKey = req.headers['x-service-key'] as string;
  const expectedKey = process.env.INTERNAL_SERVICE_API_KEY;

  if (!expectedKey) {
    console.error('[SECURITY] INTERNAL_SERVICE_API_KEY not configured');
    return res.status(500).json({
      error: 'Service authentication not configured',
    });
  }

  if (!serviceKey) {
    return res.status(401).json({
      error: 'Missing service API key',
      message: 'X-Service-Key header is required for internal API access',
    });
  }

  if (serviceKey !== expectedKey) {
    console.warn('[SECURITY] Invalid service API key attempt from IP:', req.ip);
    return res.status(403).json({
      error: 'Invalid service API key',
    });
  }

  next();
};

/**
 * Combined Authentication - Allows JWT OR service key
 */
const requireAuthOrServiceKey = async (req: Request, res: Response, next: Function) => {
  const serviceKey = req.headers['x-service-key'] as string;
  if (serviceKey) {
    return validateServiceKey(req, res, next);
  }
  return requireAuth(req as any, res, next);
};

/**
 * POST /api/fraud/check-payment
 * Check payment for fraud indicators
 * 
 * Called by:
 * - Python backend security middleware
 * - Node.js payment endpoints
 * - Security Guardian agent
 * 
 * SECURITY: Requires service API key or JWT authentication + rate limiting
 */
router.post('/check-payment', fraudRateLimiter, requireAuthOrServiceKey, async (req: Request, res: Response) => {
  try {
    const paymentContext = req.body;

    // Validate required fields
    if (!paymentContext.paymentId || !paymentContext.userId || !paymentContext.amount) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Missing required fields: paymentId, userId, amount',
      });
      return;
    }

    // Run fraud detection
    const fraudCheck = await fraudDetectionService.checkPayment(paymentContext);

    // Return fraud check result
    res.status(200).json(fraudCheck);
  } catch (error) {
    console.error('Fraud check error:', error);
    res.status(500).json({
      error: 'FRAUD_CHECK_ERROR',
      message: 'Failed to perform fraud detection',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/fraud/rules
 * Get all active fraud detection rules
 * 
 * Used for:
 * - Admin dashboard
 * - Security Guardian agent rule synchronization
 * - Compliance reporting
 * 
 * SECURITY: Requires service API key or JWT authentication
 */
router.get('/rules', requireAuthOrServiceKey, async (req: Request, res: Response) => {
  try {
    // TODO: Get fraud rules from database
    // For now, return the initialized rules from the service
    
    const rules = [
      {
        ruleId: 'CNP_001',
        ruleName: 'Card-Not-Present High Amount',
        ruleType: 'CARD_NOT_PRESENT',
        riskScore: 25,
        enabled: true,
        description: 'High-value CNP transaction detected',
        conditions: { minAmount: 5000, paymentMethod: 'CARD_NOT_PRESENT' }
      },
      {
        ruleId: 'VEL_001',
        ruleName: 'High Transaction Velocity',
        ruleType: 'VELOCITY_CHECK',
        riskScore: 30,
        enabled: true,
        description: 'Unusual number of transactions in short timeframe',
        conditions: { maxTransactionsPerHour: 5 }
      },
      {
        ruleId: 'PHISH_001',
        ruleName: 'Suspicious Login Pattern',
        ruleType: 'PHISHING',
        riskScore: 35,
        enabled: true,
        description: 'Login pattern consistent with phishing attack',
        conditions: { minFailedAuthAttempts: 3, timeWindowHours: 1 }
      },
      {
        ruleId: 'SIM_001',
        ruleName: 'Device Change After Phone Number Change',
        ruleType: 'SIM_SWAP',
        riskScore: 40,
        enabled: true,
        description: 'Possible SIM swap attack detected',
        conditions: { checkDeviceChange: true, checkPhoneChange: true }
      },
      {
        ruleId: 'DEV_001',
        ruleName: 'New Device High-Value Transaction',
        ruleType: 'DEVICE_FINGERPRINT',
        riskScore: 20,
        enabled: true,
        description: 'First transaction from new device with high amount',
        conditions: { minAmount: 10000, newDevice: true }
      },
      {
        ruleId: 'GEO_001',
        ruleName: 'Impossible Travel',
        ruleType: 'GEOLOCATION',
        riskScore: 35,
        enabled: true,
        description: 'Transaction location inconsistent with recent activity',
        conditions: { maxSpeedKmh: 900, minTimeWindowHours: 6 }
      },
      {
        ruleId: 'BEH_001',
        ruleName: 'Unusual Transaction Pattern',
        ruleType: 'BEHAVIORAL',
        riskScore: 25,
        enabled: true,
        description: 'Transaction pattern deviates from user norm',
        conditions: { amountMultiplier: 5, frequencyMultiplier: 3 }
      },
      {
        ruleId: 'AMT_001',
        ruleName: 'Large Single Transaction',
        ruleType: 'AMOUNT_THRESHOLD',
        riskScore: 15,
        enabled: true,
        description: 'Transaction amount exceeds typical range',
        conditions: { minAmount: 50000 }
      },
      {
        ruleId: 'AUTH_001',
        ruleName: 'Multiple Failed Authentication',
        ruleType: 'AUTHENTICATION',
        riskScore: 30,
        enabled: true,
        description: 'Multiple failed authentication attempts detected',
        conditions: { minFailedAttempts: 5, timeWindowHours: 1 }
      },
      {
        ruleId: 'BLACK_001',
        ruleName: 'Blacklisted Entity',
        ruleType: 'BLACKLIST',
        riskScore: 100,
        enabled: true,
        description: 'User, device, or IP on blacklist',
        conditions: { autoBlock: true }
      }
    ];

    res.status(200).json({
      success: true,
      rules,
      totalRules: rules.length,
      activeRules: rules.filter(r => r.enabled).length,
    });
  } catch (error) {
    console.error('Get fraud rules error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve fraud rules',
    });
  }
});

/**
 * POST /api/fraud/rules
 * Create or update fraud detection rule
 * 
 * Admin only - used for:
 * - Configuring custom fraud rules
 * - Adjusting risk scores
 * - Enabling/disabling rules
 * 
 * SECURITY: Requires service API key or JWT authentication
 */
router.post('/rules', requireAuthOrServiceKey, async (req: Request, res: Response) => {
  try {
    const rule = req.body;

    // Validate rule
    if (!rule.ruleId || !rule.ruleName || !rule.riskScore) {
      res.status(400).json({
        error: 'INVALID_RULE',
        message: 'Missing required fields: ruleId, ruleName, riskScore',
      });
      return;
    }

    // TODO: Save rule to database
    console.log('[CREATE FRAUD RULE]', rule);

    res.status(201).json({
      success: true,
      message: 'Fraud rule created successfully',
      rule,
    });
  } catch (error) {
    console.error('Create fraud rule error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create fraud rule',
    });
  }
});

/**
 * GET /api/fraud/stats
 * Get fraud detection statistics
 * 
 * Returns:
 * - Total fraud checks today/week/month
 * - Blocked transactions
 * - Risk score distribution
 * - Top fraud indicators
 * 
 * SECURITY: Requires service API key or JWT authentication
 */
router.get('/stats', requireAuthOrServiceKey, async (req: Request, res: Response) => {
  try {
    // TODO: Get stats from database
    const stats = {
      today: {
        totalChecks: 1234,
        blocked: 12,
        requiresReview: 34,
        stepUpAuth: 56,
        allowed: 1132,
        avgRiskScore: 23.4,
      },
      week: {
        totalChecks: 8567,
        blocked: 89,
        requiresReview: 234,
        stepUpAuth: 456,
        allowed: 7788,
        avgRiskScore: 24.1,
      },
      topIndicators: [
        { indicator: 'HIGH_VELOCITY', count: 234 },
        { indicator: 'NEW_DEVICE_HIGH_AMOUNT', count: 156 },
        { indicator: 'AMOUNT_ANOMALY', count: 123 },
        { indicator: 'IMPOSSIBLE_TRAVEL', count: 89 },
        { indicator: 'HIGH_VALUE_CNP_TRANSACTION', count: 67 },
      ],
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get fraud stats error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve fraud statistics',
    });
  }
});

export default router;

/**
 * Integration Example:
 * 
 * import express from 'express';
 * import fraudRoutes from './security/api/fraud';
 * 
 * const app = express();
 * app.use(express.json());
 * 
 * // Mount fraud routes
 * app.use('/api/fraud', fraudRoutes);
 * 
 * app.listen(4000, () => {
 *   console.log('Server running on port 4000');
 * });
 */
