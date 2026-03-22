/**
 * Buffr Connect API Routes
 * 
 * Purpose: API endpoints for Buffr integration
 * Location: backend/src/routes/buffr.ts
 * 
 * Endpoints:
 * - POST /api/buffr/cash-out - Process cash-out transaction
 * - GET /api/buffr/transactions/:id - Get transaction status
 * - GET /api/buffr/agents/:id/transactions - Get agent transaction history
 * - POST /api/buffr/agents/register - Register new agent with Buffr
 * - GET /api/buffr/agents/:id/balance - Get agent balance
 * - POST /api/buffr/vouchers/validate - Validate voucher
 * - GET /api/buffr/health - Check Buffr API health
 * 
 * Security:
 * - requireAuth middleware - JWT authentication required
 * - Rate limiting - Prevent abuse
 * - Input validation - Sanitize all inputs
 */

import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { 
  validateBuffrCashOut, 
  validateBuffrVoucherValidation,
  validateBuffrAgentRegistration 
} from '../middleware/zodValidation';
import { getBuffrClient } from '../services/buffr/client';
import { getBuffrCashOutService } from '../services/buffr/cashOut';

const router = Router();
// Lazy initialization to ensure dotenv loads first
let buffrClient: ReturnType<typeof getBuffrClient> | null = null;
let cashOutService: ReturnType<typeof getBuffrCashOutService> | null = null;

function getServices() {
  // In tests, avoid module-level caching so each test can inject fresh mocks.
  // Jest sets JEST_WORKER_ID; we also allow NODE_ENV=test.
  const isTestEnv = Boolean(process.env.JEST_WORKER_ID) || process.env.NODE_ENV === 'test';
  if (isTestEnv) {
    return { buffrClient: getBuffrClient(), cashOutService: getBuffrCashOutService() };
  }

  if (!buffrClient) buffrClient = getBuffrClient();
  if (!cashOutService) cashOutService = getBuffrCashOutService();
  return { buffrClient, cashOutService };
}

// ================================
// Cash-Out Operations
// ================================

/**
 * POST /api/buffr/cash-out
 * Process cash-out transaction
 * 
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/cash-out',
  requireAuth,
  strictRateLimiter,
  validateBuffrCashOut,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { agentId, customerPhone, amount, voucherCode } = req.body;

      // Validate input
      if (!agentId || !customerPhone || !amount) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'agentId, customerPhone, and amount are required',
          },
        });
      }

      // Process cash-out
      const { cashOutService } = getServices();
      console.log(`[Buffr API] Processing cash-out for agent ${agentId}, amount: NAD ${amount}`);
      const result = await cashOutService.processCashOut({
        agentId,
        customerPhone,
        amount,
        voucherCode,
        metadata: {
          processed_by: req.userId,
          timestamp: new Date().toISOString(),
        },
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('[Buffr API] Cash-out error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  }
);

/**
 * GET /api/buffr/transactions/:id
 * Get transaction status
 */
router.get(
  '/transactions/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_ID', message: 'Transaction ID is required' },
        });
      }

      const { cashOutService } = getServices();
      const result = await cashOutService.getTransactionStatus(id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('[Buffr API] Get transaction error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch transaction' },
      });
    }
  }
);

/**
 * GET /api/buffr/agents/:id/transactions
 * Get agent transaction history
 */
router.get(
  '/agents/:id/transactions',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { page, limit, status, from_date, to_date } = req.query;

      const { cashOutService } = getServices();
      const result = await cashOutService.getAgentTransactions(id, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        from_date: from_date as string,
        to_date: to_date as string,
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('[Buffr API] Get agent transactions error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch transactions' },
      });
    }
  }
);

// ================================
// Agent Operations
// ================================

/**
 * POST /api/buffr/agents/register
 * Register new agent with Buffr
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/agents/register',
  requireAuth,
  strictRateLimiter,
  validateBuffrAgentRegistration,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, phone, email, location } = req.body;

      if (!name || !phone || !location) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'name, phone, and location are required',
          },
        });
      }

      const { buffrClient } = getServices();
      const result = await buffrClient.registerAgent({ name, phone, email, location });
      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('[Buffr API] Register agent error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to register agent' },
      });
    }
  }
);

/**
 * GET /api/buffr/agents/:id/balance
 * Get agent balance
 */
router.get(
  '/agents/:id/balance',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { buffrClient } = getServices();
      const result = await buffrClient.getAgentBalance(id);
      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('[Buffr API] Get agent balance error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch balance' },
      });
    }
  }
);

// ================================
// Voucher Operations
// ================================

/**
 * POST /api/buffr/vouchers/validate
 * Validate voucher before redemption
 * SECURITY: Protected with JWT auth + Zod validation
 */
router.post(
  '/vouchers/validate',
  requireAuth,
  validateBuffrVoucherValidation,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { voucherCode } = req.body;

      if (!voucherCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_VOUCHER_CODE', message: 'Voucher code is required' },
        });
      }

      const { cashOutService } = getServices();
      const result = await cashOutService.validateVoucher(voucherCode);
      return res.status(result.valid ? 200 : 400).json(result);
    } catch (error) {
      console.error('[Buffr API] Validate voucher error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to validate voucher' },
      });
    }
  }
);

// ================================
// Health Check
// ================================

/**
 * GET /api/buffr/health
 * Check Buffr API connectivity
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const { buffrClient } = getServices();
    const result = await buffrClient.healthCheck();
    return res.status(result.success ? 200 : 503).json({
      ...result,
      smartpay_integration: result.success ? 'active' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Buffr API] Health check error:', error);
    return res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Buffr API is unavailable' },
      smartpay_integration: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
