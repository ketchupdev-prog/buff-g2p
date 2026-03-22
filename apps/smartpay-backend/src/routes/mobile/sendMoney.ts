/**
 * Send Money API Route
 * Location: fintech/smartpay/backend/src/routes/mobile/sendMoney.ts
 * PSD-3 compliant with daily/monthly limits, PSD-10 fee calculation, ETA §32 audit logging
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { strictRateLimiter } from '../../middleware/rateLimiter';
import { validateSendMoney } from '../../middleware/zodValidation';
import { transaction } from '../../lib/db';
import { calculateTransactionFee } from '../../lib/feeCalculator';
import { checkEmoneyLimits, recordTransaction } from '../../lib/emoneyLimits';
import { logWithAttribution } from '../../lib/etaAttribution';
import { checkFraud, isBuffrAiConfigured, shouldBlockTransaction } from '../../lib/buffrAiClient';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface SendMoneyRequest {
  amount: number;
  beneficiaryId?: string;
  beneficiaryPhone?: string;
  sourceWalletId: string;
  note?: string;
}

/**
 * POST /api/v1/send-money
 * Send money from user's wallet to beneficiary
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/send-money',
  requireAuth,
  strictRateLimiter,
  validateSendMoney,
  async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.userId!;
    const { amount, beneficiaryId, beneficiaryPhone, sourceWalletId, note } = req.body as SendMoneyRequest;

    try {
      // Input validation
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than 0'
          }
        });
      }

      if (!beneficiaryId && !beneficiaryPhone) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_BENEFICIARY',
            message: 'Either beneficiaryId or beneficiaryPhone is required'
          }
        });
      }

      if (!sourceWalletId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_WALLET',
            message: 'sourceWalletId is required'
          }
        });
      }

      // Optional: Buffr AI fraud check before completing (PRD §4.6.5)
      if (isBuffrAiConfigured()) {
        const transactionIdForCheck = uuidv4();
        const fraudResult = await checkFraud({
          transaction_id: transactionIdForCheck,
          user_id: userId,
          amount,
          merchant_name: 'P2P transfer',
          merchant_mcc: 0,
          merchant_location: { lat: 0, lon: 0 },
          user_location: { lat: 0, lon: 0 },
          timestamp: new Date().toISOString(),
          device_fingerprint: (req.headers['x-device-fingerprint'] as string) || 'unknown',
          beneficiary_account_age_days: 0
        });
        if (fraudResult && shouldBlockTransaction(fraudResult)) {
          await logWithAttribution({
            userId,
            toolName: 'send_money',
            action: 'p2p_transfer',
            input: { amount, beneficiaryId: beneficiaryId || beneficiaryPhone, sourceWalletId },
            result: 'failure',
            ipAddress: req.ipAddress,
            sessionId: req.sessionId,
            isAutomated: false,
            createdAt: new Date()
          }).catch(() => {});
          return res.status(403).json({
            success: false,
            error: {
              code: 'RISK_BLOCKED',
              message: 'This transaction could not be completed due to risk checks. Please contact support if you believe this is an error.'
            }
          });
        }
      }

      // Execute transaction with database atomicity
      const result = await transaction(async (client) => {
        // Check e-money limits (PSD-3)
        const limitCheck = await checkEmoneyLimits({
          userId,
          walletId: sourceWalletId,
          amount,
          type: 'send'
        });

        if (!limitCheck.allowed) {
          throw new Error(limitCheck.reason || 'Transaction limit exceeded');
        }

        // Get source wallet and check balance
        const walletResult = await client.query(
          `SELECT balance, currency, status FROM wallets WHERE id = $1 AND user_id = $2`,
          [sourceWalletId, userId]
        );

        if (walletResult.rowCount === 0) {
          throw new Error('Source wallet not found');
        }

        const sourceWallet = walletResult.rows[0] as { balance: string; currency: string; status: string };

        if (sourceWallet.status !== 'active') {
          throw new Error('Source wallet is not active');
        }

        const balance = parseFloat(sourceWallet.balance);

        // Calculate fees (PSD-10)
        const feeResult = await calculateTransactionFee({
          paymentStream: 'emoney',
          transactionType: 'p2p_transfer',
          channel: 'mobile',
          amount
        });

        const totalRequired = amount + feeResult.finalFee;

        if (balance < totalRequired) {
          throw new Error(
            `Insufficient balance. Required: N$${totalRequired.toFixed(2)} (amount + fee), Available: N$${balance.toFixed(2)}`
          );
        }

        // Resolve beneficiary
        let beneficiaryUserId: string;
        let destinationWalletId: string;

        if (beneficiaryId) {
          const beneficiaryResult = await client.query(
            `SELECT user_id, id FROM wallets WHERE id = $1 AND status = 'active'`,
            [beneficiaryId]
          );

          if (beneficiaryResult.rowCount === 0) {
            throw new Error('Beneficiary wallet not found or inactive');
          }

          beneficiaryUserId = beneficiaryResult.rows[0].user_id;
          destinationWalletId = beneficiaryResult.rows[0].id;
        } else if (beneficiaryPhone) {
          const userResult = await client.query(
            `SELECT id FROM users WHERE phone = $1`,
            [beneficiaryPhone]
          );

          if (userResult.rowCount === 0) {
            throw new Error('Beneficiary phone number not found');
          }

          beneficiaryUserId = userResult.rows[0].id;

          // Get beneficiary's default wallet
          const walletResult = await client.query(
            `SELECT id FROM wallets WHERE user_id = $1 AND currency = $2 AND status = 'active' LIMIT 1`,
            [beneficiaryUserId, sourceWallet.currency]
          );

          if (walletResult.rowCount === 0) {
            throw new Error('Beneficiary has no active wallet');
          }

          destinationWalletId = walletResult.rows[0].id;
        } else {
          throw new Error('Invalid beneficiary information');
        }

        // Prevent self-transfer
        if (beneficiaryUserId === userId) {
          throw new Error('Cannot send money to yourself');
        }

        // Create transaction record
        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, source_wallet_id, destination_wallet_id, 
             source_user_id, destination_user_id, description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
          [
            transactionId,
            'p2p_transfer',
            'completed',
            amount,
            feeResult.finalFee,
            sourceWallet.currency,
            sourceWalletId,
            destinationWalletId,
            userId,
            beneficiaryUserId,
            note || 'Money transfer',
            JSON.stringify({
              feeBreakdown: feeResult.breakdown,
              limitCheck: { remaining: limitCheck.remaining }
            })
          ]
        );

        // Update source wallet (debit amount + fee)
        await client.query(
          `UPDATE wallets 
           SET balance = balance - $1, updated_at = NOW()
           WHERE id = $2`,
          [totalRequired, sourceWalletId]
        );

        // Update destination wallet (credit amount)
        await client.query(
          `UPDATE wallets 
           SET balance = balance + $1, updated_at = NOW()
           WHERE id = $2`,
          [amount, destinationWalletId]
        );

        // Get new balance
        const newBalanceResult = await client.query(
          `SELECT balance FROM wallets WHERE id = $1`,
          [sourceWalletId]
        );
        const newBalance = parseFloat(newBalanceResult.rows[0].balance);

        // Record transaction for limit tracking
        await recordTransaction(userId, totalRequired);

        return {
          transactionId,
          status: 'completed',
          amount,
          fee: feeResult.finalFee,
          totalDebited: totalRequired,
          newBalance,
          beneficiaryUserId,
          timestamp: new Date().toISOString()
        };
      });

      // Log with ETA §32 attribution
      await logWithAttribution({
        userId,
        toolName: 'send_money',
        action: 'p2p_transfer',
        input: {
          amount,
          beneficiaryId: beneficiaryId || beneficiaryPhone,
          sourceWalletId
        },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      const duration = Date.now() - startTime;
      console.log(`[SendMoney] Transaction ${result.transactionId} completed in ${duration}ms`);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[SendMoney] Error:', error);

      // Log failure with ETA §32
      await logWithAttribution({
        userId,
        toolName: 'send_money',
        action: 'p2p_transfer',
        input: {
          amount,
          beneficiaryId: beneficiaryId || beneficiaryPhone,
          sourceWalletId
        },
        result: 'failure',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      }).catch(logError => console.error('[SendMoney] Failed to log error:', logError));

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return res.status(400).json({
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: errorMessage
        }
      });
    }
  }
);

export default router;
