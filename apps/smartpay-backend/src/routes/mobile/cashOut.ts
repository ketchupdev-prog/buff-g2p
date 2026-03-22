/**
 * Cash-Out API Routes
 * Location: fintech/smartpay/backend/src/routes/mobile/cashOut.ts
 * PSD-3 compliant with limits, PSD-10 fee calculation, ETA §32 audit logging
 * Supports 5 cash-out methods: Bank, Till, Agent, Merchant POS, ATM
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { strictRateLimiter } from '../../middleware/rateLimiter';
import { 
  validateCashOutBank, 
  validateCashOutTill, 
  validateCashOutAgent,
  validateCashOutMerchant,
  validateCashOutATM
} from '../../middleware/zodValidation';
import { transaction } from '../../lib/db';
import { calculateTransactionFee } from '../../lib/feeCalculator';
import { checkEmoneyLimits, recordTransaction } from '../../lib/emoneyLimits';
import { logWithAttribution } from '../../lib/etaAttribution';
import { generateSignedQRData } from '../../lib/signedQR';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface CashOutRequest {
  amount: number;
  walletId: string;
  bankAccount?: string;
  bankCode?: string;
  tillNumber?: string;
  agentCode?: string;
  merchantId?: string;
  atmId?: string;
}

/**
 * POST /api/v1/cash-out/bank
 * Cash out to bank account
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/cash-out/bank',
  requireAuth,
  strictRateLimiter,
  validateCashOutBank,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, walletId, bankAccount, bankCode } = req.body as CashOutRequest;

    try {
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0' }
        });
      }

      if (!walletId || !bankAccount || !bankCode) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'walletId, bankAccount, and bankCode are required'
          }
        });
      }

      const result = await transaction(async (client) => {
        // Check limits
        const limitCheck = await checkEmoneyLimits({
          userId,
          walletId,
          amount,
          type: 'cashout'
        });

        if (!limitCheck.allowed) {
          throw new Error(limitCheck.reason || 'Transaction limit exceeded');
        }

        // Get wallet and check balance
        const walletResult = await client.query(
          `SELECT balance, currency, status FROM wallets WHERE id = $1 AND user_id = $2`,
          [walletId, userId]
        );

        if (walletResult.rowCount === 0) {
          throw new Error('Wallet not found');
        }

        const wallet = walletResult.rows[0] as { balance: string; currency: string; status: string };

        if (wallet.status !== 'active') {
          throw new Error('Wallet is not active');
        }

        // Calculate fees
        const feeResult = await calculateTransactionFee({
          paymentStream: 'emoney',
          transactionType: 'cashout',
          channel: 'bank_transfer',
          amount
        });

        const totalRequired = amount + feeResult.finalFee;
        const balance = parseFloat(wallet.balance);

        if (balance < totalRequired) {
          throw new Error(
            `Insufficient balance. Required: N$${totalRequired.toFixed(2)}, Available: N$${balance.toFixed(2)}`
          );
        }

        // Create transaction
        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, source_wallet_id, source_user_id, 
             description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            transactionId,
            'cashout_bank',
            'pending',
            amount,
            feeResult.finalFee,
            wallet.currency,
            walletId,
            userId,
            `Cash out to bank ${bankCode}`,
            JSON.stringify({
              bankAccount,
              bankCode,
              feeBreakdown: feeResult.breakdown
            })
          ]
        );

        // Update wallet
        await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
          [totalRequired, walletId]
        );

        const newBalanceResult = await client.query(
          `SELECT balance FROM wallets WHERE id = $1`,
          [walletId]
        );
        const newBalance = parseFloat(newBalanceResult.rows[0].balance);

        await recordTransaction(userId, totalRequired);

        return {
          transactionId,
          status: 'pending',
          amount,
          fee: feeResult.finalFee,
          newBalance,
          estimatedCompletion: '1-2 business days'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'cash_out_bank',
        action: 'cashout',
        input: { amount, walletId, bankCode },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[CashOut Bank] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'CASHOUT_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/cash-out/till
 * Cash out at till with offline code
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/cash-out/till',
  requireAuth,
  strictRateLimiter,
  validateCashOutTill,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, walletId, tillNumber } = req.body as CashOutRequest;

    try {
      if (!amount || amount <= 0 || !walletId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Valid amount and walletId are required' }
        });
      }

      const result = await transaction(async (client) => {
        const limitCheck = await checkEmoneyLimits({
          userId,
          walletId,
          amount,
          type: 'cashout'
        });

        if (!limitCheck.allowed) {
          throw new Error(limitCheck.reason || 'Transaction limit exceeded');
        }

        const walletResult = await client.query(
          `SELECT balance, currency FROM wallets WHERE id = $1 AND user_id = $2 AND status = 'active'`,
          [walletId, userId]
        );

        if (walletResult.rowCount === 0) {
          throw new Error('Wallet not found or inactive');
        }

        const wallet = walletResult.rows[0] as { balance: string; currency: string };
        const feeResult = await calculateTransactionFee({
          paymentStream: 'emoney',
          transactionType: 'cashout',
          channel: 'till',
          amount
        });

        const totalRequired = amount + feeResult.finalFee;
        const balance = parseFloat(wallet.balance);

        if (balance < totalRequired) {
          throw new Error(`Insufficient balance. Required: N$${totalRequired.toFixed(2)}`);
        }

        // SECURITY: Generate cryptographically secure offline code with uniqueness check
        const { generate6DigitPIN } = require('../../lib/secureCodeGenerator');
        const offlineCode = await generate6DigitPIN(
          true, // Check uniqueness
          client,
          'transactions',
          "metadata->>'offlineCode'"
        );
        
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, source_wallet_id, source_user_id, 
             description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            transactionId,
            'cashout_till',
            'pending',
            amount,
            feeResult.finalFee,
            wallet.currency,
            walletId,
            userId,
            `Cash out at till ${tillNumber || 'any'}`,
            JSON.stringify({
              tillNumber,
              offlineCode: offlineCode!,
              expiresAt: expiresAt.toISOString(),
              feeBreakdown: feeResult.breakdown
            })
          ]
        );

        await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
          [totalRequired, walletId]
        );

        const newBalanceResult = await client.query(`SELECT balance FROM wallets WHERE id = $1`, [walletId]);
        const newBalance = parseFloat(newBalanceResult.rows[0].balance);

        await recordTransaction(userId, totalRequired);

        return {
          transactionId,
          status: 'pending',
          amount,
          fee: feeResult.finalFee,
          newBalance,
          offlineCode,
          expiresAt: expiresAt.toISOString(),
          instructions: 'Present this code at any SmartPay till to collect cash'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'cash_out_till',
        action: 'cashout',
        input: { amount, walletId, tillNumber },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[CashOut Till] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'CASHOUT_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/cash-out/agent
 * Cash out at agent with QR code
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/cash-out/agent',
  requireAuth,
  strictRateLimiter,
  validateCashOutAgent,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, walletId, agentCode } = req.body as CashOutRequest;

    try {
      if (!amount || amount <= 0 || !walletId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Valid amount and walletId are required' }
        });
      }

      const result = await transaction(async (client) => {
        const limitCheck = await checkEmoneyLimits({
          userId,
          walletId,
          amount,
          type: 'cashout'
        });

        if (!limitCheck.allowed) {
          throw new Error(limitCheck.reason || 'Transaction limit exceeded');
        }

        const walletResult = await client.query(
          `SELECT balance, currency FROM wallets WHERE id = $1 AND user_id = $2 AND status = 'active'`,
          [walletId, userId]
        );

        if (walletResult.rowCount === 0) {
          throw new Error('Wallet not found or inactive');
        }

        const wallet = walletResult.rows[0] as { balance: string; currency: string };
        const feeResult = await calculateTransactionFee({
          paymentStream: 'emoney',
          transactionType: 'cashout',
          channel: 'agent',
          amount
        });

        const totalRequired = amount + feeResult.finalFee;
        const balance = parseFloat(wallet.balance);

        if (balance < totalRequired) {
          throw new Error(`Insufficient balance. Required: N$${totalRequired.toFixed(2)}`);
        }

        const transactionId = uuidv4();
        const qrData = await generateSignedQRData({
          transactionId,
          userId,
          amount,
          type: 'cashout_agent',
          agentCode: agentCode || 'any',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, source_wallet_id, source_user_id, 
             description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            transactionId,
            'cashout_agent',
            'pending',
            amount,
            feeResult.finalFee,
            wallet.currency,
            walletId,
            userId,
            `Cash out at agent ${agentCode || 'any'}`,
            JSON.stringify({
              agentCode,
              qrData,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              feeBreakdown: feeResult.breakdown
            })
          ]
        );

        await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
          [totalRequired, walletId]
        );

        const newBalanceResult = await client.query(`SELECT balance FROM wallets WHERE id = $1`, [walletId]);
        const newBalance = parseFloat(newBalanceResult.rows[0].balance);

        await recordTransaction(userId, totalRequired);

        return {
          transactionId,
          status: 'pending',
          amount,
          fee: feeResult.finalFee,
          newBalance,
          qrCode: qrData,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          instructions: 'Show this QR code to the agent to collect cash'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'cash_out_agent',
        action: 'cashout',
        input: { amount, walletId, agentCode },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[CashOut Agent] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'CASHOUT_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/cash-out/merchant
 * Cash out at merchant POS
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/cash-out/merchant',
  requireAuth,
  strictRateLimiter,
  validateCashOutMerchant,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, walletId, merchantId } = req.body as CashOutRequest;

    try {
      if (!amount || amount <= 0 || !walletId || !merchantId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Valid amount, walletId, and merchantId are required' }
        });
      }

      const result = await transaction(async (client) => {
        const limitCheck = await checkEmoneyLimits({
          userId,
          walletId,
          amount,
          type: 'cashout'
        });

        if (!limitCheck.allowed) {
          throw new Error(limitCheck.reason || 'Transaction limit exceeded');
        }

        const walletResult = await client.query(
          `SELECT balance, currency FROM wallets WHERE id = $1 AND user_id = $2 AND status = 'active'`,
          [walletId, userId]
        );

        if (walletResult.rowCount === 0) {
          throw new Error('Wallet not found or inactive');
        }

        const wallet = walletResult.rows[0] as { balance: string; currency: string };
        const feeResult = await calculateTransactionFee({
          paymentStream: 'emoney',
          transactionType: 'cashout',
          channel: 'merchant_pos',
          amount
        });

        const totalRequired = amount + feeResult.finalFee;
        const balance = parseFloat(wallet.balance);

        if (balance < totalRequired) {
          throw new Error(`Insufficient balance. Required: N$${totalRequired.toFixed(2)}`);
        }

        const transactionId = uuidv4();
        
        // SECURITY: Generate cryptographically secure ATM auth code with uniqueness check
        const { generate6DigitPIN } = require('../../lib/secureCodeGenerator');
        const authCode = await generate6DigitPIN(
          true, // Check uniqueness
          client,
          'transactions',
          "metadata->>'authCode'"
        );

        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, source_wallet_id, source_user_id, 
             description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            transactionId,
            'cashout_merchant',
            'pending',
            amount,
            feeResult.finalFee,
            wallet.currency,
            walletId,
            userId,
            `Cash out at merchant ${merchantId}`,
            JSON.stringify({
              merchantId,
              authCode,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              feeBreakdown: feeResult.breakdown
            })
          ]
        );

        await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
          [totalRequired, walletId]
        );

        const newBalanceResult = await client.query(`SELECT balance FROM wallets WHERE id = $1`, [walletId]);
        const newBalance = parseFloat(newBalanceResult.rows[0].balance);

        await recordTransaction(userId, totalRequired);

        return {
          transactionId,
          status: 'pending',
          amount,
          fee: feeResult.finalFee,
          newBalance,
          authCode,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          instructions: 'Provide this authorization code at the merchant POS'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'cash_out_merchant',
        action: 'cashout',
        input: { amount, walletId, merchantId },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[CashOut Merchant] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'CASHOUT_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/cash-out/atm
 * Cash out at ATM with NAMQR QR code
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/cash-out/atm',
  requireAuth,
  strictRateLimiter,
  validateCashOutATM,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, walletId, atmId } = req.body as CashOutRequest;

    try {
      if (!amount || amount <= 0 || !walletId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Valid amount and walletId are required' }
        });
      }

      const result = await transaction(async (client) => {
        const limitCheck = await checkEmoneyLimits({
          userId,
          walletId,
          amount,
          type: 'cashout'
        });

        if (!limitCheck.allowed) {
          throw new Error(limitCheck.reason || 'Transaction limit exceeded');
        }

        const walletResult = await client.query(
          `SELECT balance, currency FROM wallets WHERE id = $1 AND user_id = $2 AND status = 'active'`,
          [walletId, userId]
        );

        if (walletResult.rowCount === 0) {
          throw new Error('Wallet not found or inactive');
        }

        const wallet = walletResult.rows[0] as { balance: string; currency: string };
        const feeResult = await calculateTransactionFee({
          paymentStream: 'emoney',
          transactionType: 'cashout',
          channel: 'atm',
          amount
        });

        const totalRequired = amount + feeResult.finalFee;
        const balance = parseFloat(wallet.balance);

        if (balance < totalRequired) {
          throw new Error(`Insufficient balance. Required: N$${totalRequired.toFixed(2)}`);
        }

        const transactionId = uuidv4();
        const namqrData = await generateSignedQRData({
          transactionId,
          userId,
          amount,
          type: 'cashout_atm',
          atmId: atmId || 'any',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        });

        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, source_wallet_id, source_user_id, 
             description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            transactionId,
            'cashout_atm',
            'pending',
            amount,
            feeResult.finalFee,
            wallet.currency,
            walletId,
            userId,
            `Cash out at ATM ${atmId || 'any'}`,
            JSON.stringify({
              atmId,
              namqrData,
              expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              feeBreakdown: feeResult.breakdown
            })
          ]
        );

        await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
          [totalRequired, walletId]
        );

        const newBalanceResult = await client.query(`SELECT balance FROM wallets WHERE id = $1`, [walletId]);
        const newBalance = parseFloat(newBalanceResult.rows[0].balance);

        await recordTransaction(userId, totalRequired);

        return {
          transactionId,
          status: 'pending',
          amount,
          fee: feeResult.finalFee,
          newBalance,
          namqrCode: namqrData,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          instructions: 'Scan this NAMQR code at any compatible ATM to withdraw cash'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'cash_out_atm',
        action: 'cashout',
        input: { amount, walletId, atmId },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[CashOut ATM] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'CASHOUT_FAILED', message: errorMessage }
      });
    }
  }
);

export default router;
