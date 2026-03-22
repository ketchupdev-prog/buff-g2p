/**
 * Vouchers API Routes
 * Location: fintech/smartpay/backend/src/routes/mobile/vouchers.ts
 * PSD-3 compliant voucher redemption with multiple methods
 * ETA §32 audit logging for all redemption actions
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { strictRateLimiter, lenientRateLimiter } from '../../middleware/rateLimiter';
import { 
  validateRedeemVoucherWalletByCode,
  validateRedeemVoucherNamPost, 
  validateRedeemVoucherSmartPay 
} from '../../middleware/zodValidation';
import { transaction } from '../../lib/db';
import { logWithAttribution } from '../../lib/etaAttribution';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface RedeemVoucherRequest {
  voucherCode?: string;
  location?: string;
  agentCode?: string;
}

interface VoucherWalletRedemptionInput {
  userId: string;
  voucherId?: string;
  voucherCode?: string;
}

function getVoucherRedemptionErrorResponse(error: unknown): { status: number; code: string; message: string } {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const lowered = message.toLowerCase();

  if (lowered.includes('not found')) {
    return { status: 404, code: 'NOT_FOUND', message };
  }
  if (lowered.includes('already been redeemed') || lowered.includes('cannot be redeemed')) {
    return { status: 409, code: 'REDEMPTION_CONFLICT', message };
  }
  if (lowered.includes('expired')) {
    return { status: 410, code: 'VOUCHER_EXPIRED', message };
  }
  return { status: 400, code: 'REDEMPTION_FAILED', message };
}

/**
 * Shared wallet redemption transaction logic.
 * Supports redeeming by voucher ID or 12-digit voucher code.
 */
async function redeemVoucherToWalletTx(
  client: any,
  params: VoucherWalletRedemptionInput
) {
  const { userId, voucherId, voucherCode } = params;
  const lookupById = Boolean(voucherId);

  const voucherLookupQuery = lookupById
    ? `SELECT 
        id, voucher_code, amount, currency, status, voucher_type,
        issuer, expires_at, redemption_method_allowed, metadata
       FROM vouchers
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`
    : `SELECT 
        id, voucher_code, amount, currency, status, voucher_type,
        issuer, expires_at, redemption_method_allowed, metadata
       FROM vouchers
       WHERE voucher_code = $1 AND user_id = $2
       FOR UPDATE`;

  const voucherLookupValue = lookupById ? voucherId : voucherCode;
  const voucherResult = await client.query(voucherLookupQuery, [voucherLookupValue, userId]);

  if (voucherResult.rowCount === 0) {
    throw new Error('Voucher not found');
  }

  const voucher = voucherResult.rows[0] as {
    id: string;
    voucher_code: string;
    amount: string;
    currency: string;
    status: string;
    voucher_type: string;
    issuer: string;
    expires_at: Date;
    redemption_method_allowed: string[];
    metadata: Record<string, unknown>;
  };

  if (voucher.status === 'redeemed') {
    throw new Error('Voucher has already been redeemed');
  }

  if (voucher.status === 'expired') {
    throw new Error('Voucher has expired');
  }

  if (voucher.status !== 'pending') {
    throw new Error(`Voucher cannot be redeemed (status: ${voucher.status})`);
  }

  if (new Date(voucher.expires_at) < new Date()) {
    await client.query(
      `UPDATE vouchers SET status = 'expired', updated_at = NOW() WHERE id = $1`,
      [voucher.id]
    );
    throw new Error('Voucher has expired');
  }

  const allowedMethods = voucher.redemption_method_allowed || ['wallet', 'nampost', 'smartpay'];
  if (!allowedMethods.includes('wallet')) {
    throw new Error('This voucher cannot be redeemed to wallet. Use NamPost or SmartPay location.');
  }

  const walletResult = await client.query(
    `SELECT id, balance FROM wallets 
     WHERE user_id = $1 AND currency = $2 AND status = 'active'
     ORDER BY is_default DESC
     LIMIT 1`,
    [userId, voucher.currency]
  );

  if (walletResult.rowCount === 0) {
    throw new Error(`No active ${voucher.currency} wallet found`);
  }

  const wallet = walletResult.rows[0] as { id: string; balance: string };
  const amount = parseFloat(voucher.amount);
  const transactionId = uuidv4();

  await client.query(
    `INSERT INTO transactions 
      (id, type, status, amount, fee, currency, destination_wallet_id, 
       destination_user_id, description, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      transactionId,
      'voucher_redemption',
      'completed',
      amount,
      0,
      voucher.currency,
      wallet.id,
      userId,
      `Voucher redemption: ${voucher.voucher_code}`,
      JSON.stringify({
        voucherId: voucher.id,
        voucherCode: voucher.voucher_code,
        issuer: voucher.issuer,
        redemptionMethod: 'wallet'
      })
    ]
  );

  await client.query(
    `UPDATE wallets 
     SET balance = balance + $1, updated_at = NOW()
     WHERE id = $2`,
    [amount, wallet.id]
  );

  await client.query(
    `UPDATE vouchers 
     SET status = 'redeemed', redeemed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [voucher.id]
  );

  const newBalanceResult = await client.query(
    `SELECT balance FROM wallets WHERE id = $1`,
    [wallet.id]
  );
  const newBalance = parseFloat(newBalanceResult.rows[0].balance);

  return {
    transactionId,
    voucherCode: voucher.voucher_code,
    amount,
    currency: voucher.currency,
    walletId: wallet.id,
    newBalance,
    redeemedAt: new Date().toISOString()
  };
}

/**
 * GET /api/v1/vouchers
 * Get user's vouchers list
 */
router.get(
  '/vouchers',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const result = await transaction(async (client) => {
        const vouchersResult = await client.query(
          `SELECT 
            id, voucher_code, amount, currency, status, voucher_type,
            issuer, issued_at, expires_at, redeemed_at, 
            redemption_method_allowed, metadata
           FROM vouchers
           WHERE user_id = $1
           ORDER BY issued_at DESC`,
          [userId]
        );

        return vouchersResult.rows;
      });

      return res.status(200).json({
        success: true,
        data: {
          vouchers: result,
          count: result.length
        }
      });
    } catch (error) {
      console.error('[Vouchers List] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * GET /api/v1/vouchers/:id
 * Get specific voucher details
 */
router.get(
  '/vouchers/:id',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const result = await transaction(async (client) => {
        const voucherResult = await client.query(
          `SELECT 
            id, voucher_code, amount, currency, status, voucher_type,
            issuer, issued_at, expires_at, redeemed_at, 
            redemption_method_allowed, metadata
           FROM vouchers
           WHERE id = $1 AND user_id = $2`,
          [id, userId]
        );

        if (voucherResult.rowCount === 0) {
          throw new Error('Voucher not found');
        }

        return voucherResult.rows[0];
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Voucher Details] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/vouchers/:id/redeem
 * Redeem voucher to wallet
 */
router.post(
  '/vouchers/redeem',
  requireAuth,
  strictRateLimiter,
  validateRedeemVoucherWalletByCode,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { voucherCode } = req.body as RedeemVoucherRequest;

    try {
      const result = await transaction(async (client) => {
        return redeemVoucherToWalletTx(client, {
          userId,
          voucherCode
        });
      });

      await logWithAttribution({
        userId,
        toolName: 'redeem_voucher_wallet',
        action: 'voucher_redemption',
        input: { voucherCode, method: 'wallet' },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Redeem Voucher by Code] Error:', error);

      await logWithAttribution({
        userId,
        toolName: 'redeem_voucher_wallet',
        action: 'voucher_redemption',
        input: { voucherCode, method: 'wallet' },
        result: 'failure',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      }).catch(console.error);

      const errorResponse = getVoucherRedemptionErrorResponse(error);
      return res.status(errorResponse.status).json({
        success: false,
        error: { code: errorResponse.code, message: errorResponse.message }
      });
    }
  }
);

/**
 * POST /api/v1/vouchers/:id/redeem
 * Redeem voucher to wallet
 */
router.post(
  '/vouchers/:id/redeem',
  requireAuth,
  strictRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const result = await transaction(async (client) => {
        return redeemVoucherToWalletTx(client, {
          userId,
          voucherId: id
        });
      });

      await logWithAttribution({
        userId,
        toolName: 'redeem_voucher_wallet',
        action: 'voucher_redemption',
        input: { voucherId: id, method: 'wallet' },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Redeem Voucher] Error:', error);

      await logWithAttribution({
        userId,
        toolName: 'redeem_voucher_wallet',
        action: 'voucher_redemption',
        input: { voucherId: id, method: 'wallet' },
        result: 'failure',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      }).catch(console.error);

      const errorResponse = getVoucherRedemptionErrorResponse(error);
      return res.status(errorResponse.status).json({
        success: false,
        error: { code: errorResponse.code, message: errorResponse.message }
      });
    }
  }
);

/**
 * POST /api/v1/vouchers/:id/redeem-nampost
 * Redeem voucher at NamPost branch (generates collection code)
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/vouchers/:id/redeem-nampost',
  requireAuth,
  strictRateLimiter,
  validateRedeemVoucherNamPost,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { location } = req.body as RedeemVoucherRequest;

    try {
      const result = await transaction(async (client) => {
        const voucherResult = await client.query(
          `SELECT 
            id, voucher_code, amount, currency, status, voucher_type,
            expires_at, redemption_method_allowed
           FROM vouchers
           WHERE id = $1 AND user_id = $2
           FOR UPDATE`,
          [id, userId]
        );

        if (voucherResult.rowCount === 0) {
          throw new Error('Voucher not found');
        }

        const voucher = voucherResult.rows[0] as {
          id: string;
          voucher_code: string;
          amount: string;
          currency: string;
          status: string;
          voucher_type: string;
          expires_at: Date;
          redemption_method_allowed: string[];
        };

        if (voucher.status !== 'pending') {
          throw new Error(`Voucher cannot be redeemed (status: ${voucher.status})`);
        }

        if (new Date(voucher.expires_at) < new Date()) {
          throw new Error('Voucher has expired');
        }

        const allowedMethods = voucher.redemption_method_allowed || ['wallet', 'nampost', 'smartpay'];
        if (!allowedMethods.includes('nampost')) {
          throw new Error('This voucher cannot be redeemed at NamPost');
        }

        // SECURITY: Generate cryptographically secure collection code with uniqueness check
        const { generateAlphanumericCode } = require('../../lib/secureCodeGenerator');
        const collectionCode = await generateAlphanumericCode(
          8,
          true, // Check uniqueness
          client,
          'transactions',
          "metadata->>'collectionCode'"
        );
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, destination_user_id, 
             description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            transactionId,
            'voucher_redemption_nampost',
            'pending',
            parseFloat(voucher.amount),
            0,
            voucher.currency,
            userId,
            `Voucher redemption at NamPost: ${voucher.voucher_code}`,
            JSON.stringify({
              voucherId: voucher.id,
              voucherCode: voucher.voucher_code,
              collectionCode,
              location: location || 'any',
              expiresAt: expiresAt.toISOString(),
              redemptionMethod: 'nampost'
            })
          ]
        );

        await client.query(
          `UPDATE vouchers 
           SET status = 'pending_collection', 
               metadata = metadata || $1::jsonb,
               updated_at = NOW()
           WHERE id = $2`,
          [
            JSON.stringify({ collectionCode, collectionExpiresAt: expiresAt.toISOString() }),
            id
          ]
        );

        return {
          transactionId,
          voucherCode: voucher.voucher_code,
          amount: parseFloat(voucher.amount),
          currency: voucher.currency,
          collectionCode,
          expiresAt: expiresAt.toISOString(),
          instructions: 'Visit any NamPost branch and provide this collection code with your ID to collect cash'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'redeem_voucher_nampost',
        action: 'voucher_redemption',
        input: { voucherId: id, method: 'nampost', location },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Redeem Voucher NamPost] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'REDEMPTION_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/vouchers/:id/redeem-smartpay
 * Redeem voucher at SmartPay agent/location (generates collection code)
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/vouchers/:id/redeem-smartpay',
  requireAuth,
  strictRateLimiter,
  validateRedeemVoucherSmartPay,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { agentCode } = req.body as RedeemVoucherRequest;

    try {
      const result = await transaction(async (client) => {
        const voucherResult = await client.query(
          `SELECT 
            id, voucher_code, amount, currency, status, voucher_type,
            expires_at, redemption_method_allowed
           FROM vouchers
           WHERE id = $1 AND user_id = $2
           FOR UPDATE`,
          [id, userId]
        );

        if (voucherResult.rowCount === 0) {
          throw new Error('Voucher not found');
        }

        const voucher = voucherResult.rows[0] as {
          id: string;
          voucher_code: string;
          amount: string;
          currency: string;
          status: string;
          voucher_type: string;
          expires_at: Date;
          redemption_method_allowed: string[];
        };

        if (voucher.status !== 'pending') {
          throw new Error(`Voucher cannot be redeemed (status: ${voucher.status})`);
        }

        if (new Date(voucher.expires_at) < new Date()) {
          throw new Error('Voucher has expired');
        }

        const allowedMethods = voucher.redemption_method_allowed || ['wallet', 'nampost', 'smartpay'];
        if (!allowedMethods.includes('smartpay')) {
          throw new Error('This voucher cannot be redeemed at SmartPay locations');
        }

        // SECURITY: Generate cryptographically secure collection code with uniqueness check
        const { generate6DigitPIN } = require('../../lib/secureCodeGenerator');
        const collectionCode = await generate6DigitPIN(
          true, // Check uniqueness
          client,
          'transactions',
          "metadata->>'collectionCode'"
        );
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, destination_user_id, 
             description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            transactionId,
            'voucher_redemption_smartpay',
            'pending',
            parseFloat(voucher.amount),
            0,
            voucher.currency,
            userId,
            `Voucher redemption at SmartPay: ${voucher.voucher_code}`,
            JSON.stringify({
              voucherId: voucher.id,
              voucherCode: voucher.voucher_code,
              collectionCode,
              agentCode: agentCode || 'any',
              expiresAt: expiresAt.toISOString(),
              redemptionMethod: 'smartpay'
            })
          ]
        );

        await client.query(
          `UPDATE vouchers 
           SET status = 'pending_collection', 
               metadata = metadata || $1::jsonb,
               updated_at = NOW()
           WHERE id = $2`,
          [
            JSON.stringify({ collectionCode, collectionExpiresAt: expiresAt.toISOString() }),
            id
          ]
        );

        return {
          transactionId,
          voucherCode: voucher.voucher_code,
          amount: parseFloat(voucher.amount),
          currency: voucher.currency,
          collectionCode,
          expiresAt: expiresAt.toISOString(),
          instructions: agentCode
            ? `Visit SmartPay agent ${agentCode} and provide this collection code to collect cash`
            : 'Visit any SmartPay agent and provide this collection code to collect cash'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'redeem_voucher_smartpay',
        action: 'voucher_redemption',
        input: { voucherId: id, method: 'smartpay', agentCode },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Redeem Voucher SmartPay] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'REDEMPTION_FAILED', message: errorMessage }
      });
    }
  }
);

export default router;
