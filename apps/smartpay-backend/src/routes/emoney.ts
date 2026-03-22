// =====================================================
// E-MONEY API ENDPOINTS
// Compliant with Bank of Namibia PSD-3 & PSN 2025
// =====================================================
//
// NOTE: This file requires database pool integration and implementation
// of helper functions (getWalletByUserId, etc.) before it can be used.
// It serves as a comprehensive API specification and implementation template.
// =====================================================

import express, { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  TransactionValidator,
  KycTier,
  UserType,
  TransactionType,
  KYC_LIMITS
} from '../lib/transactionValidation';
import { pool } from '../lib/db';

const router = express.Router();

// Validator uses PG pool (required for limit checks)
const validator = new TransactionValidator(pool);

// Helper functions for currency conversion
const nadToCents = (nad: number): number => Math.round(nad * 100);
const centsToNAD = (cents: number): number => cents / 100;
const formatCurrency = (cents: number): string => `N$${(cents / 100).toFixed(2)}`;

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Authentication middleware
 */
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement JWT authentication
    // Extract user from token
    // const token = req.headers.authorization?.split(' ')[1];
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = await getUserById(decoded.userId);
    
    // For now, mock user
    (req as any).user = {
      id: 1,
      phone_number: '+264811234567',
      full_name: 'John Doe',
      kyc_tier: KycTier.LITE,
      kyc_status: 'APPROVED',
      status: 'ACTIVE'
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

/**
 * Validation error handler
 */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// =====================================================
// 1. WALLET OPERATIONS
// =====================================================

/**
 * GET /api/v1/wallet/balance
 * Get current wallet balance and limits
 */
router.get('/wallet/balance', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const wallet = await getWalletByUserId(user.id);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const limits = KYC_LIMITS[user.kyc_tier as KycTier][wallet.user_type as UserType];
    
    // Get daily usage
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = await getDailyTransactionSummary(wallet.id, today);
    
    // Get monthly usage
    const now = new Date();
    const monthlyUsage = await getMonthlyTransactionSummary(
      wallet.id,
      now.getFullYear(),
      now.getMonth() + 1
    );
    
    res.json({
      wallet_number: wallet.wallet_number,
      balance: centsToNAD(wallet.balance),
      balance_formatted: formatCurrency(wallet.balance),
      currency: 'NAD',
      
      kyc_tier: user.kyc_tier,
      wallet_type: wallet.wallet_type,
      
      limits: {
        // Note: KYC_LIMITS in this codebase is expressed in cents.
        // Single-transaction max is not currently modeled; daily + monthly balance are.
        max_daily_transaction: centsToNAD(limits.dailyLimitCents),
        max_monthly_balance: centsToNAD(limits.monthlyBalanceLimitCents)
      },
      
      usage: {
        daily: {
          used: centsToNAD(dailyUsage?.total_amount || 0),
          remaining: centsToNAD(Math.max(0, limits.dailyLimitCents - (dailyUsage?.total_amount || 0))),
          limit: centsToNAD(limits.dailyLimitCents)
        },
        monthly: {
          balance: centsToNAD(wallet.balance),
          limit: centsToNAD(limits.monthlyBalanceLimitCents),
          utilization_percentage: (wallet.balance / limits.monthlyBalanceLimitCents) * 100
        }
      },
      
      status: wallet.status,
      last_transaction: wallet.last_transaction_at
    });
    
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/wallet/transactions
 * Get wallet transaction history
 */
router.get(
  '/wallet/transactions',
  authenticate,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('type')
      .optional()
      .isIn([
        TransactionType.LOAD,
        TransactionType.TRANSFER_OUT,
        TransactionType.TRANSFER_IN,
        TransactionType.PAYMENT,
        TransactionType.REDEMPTION,
        TransactionType.REVERSAL,
        TransactionType.FEE,
        TransactionType.REFUND,
      ])
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const wallet = await getWalletByUserId(user.id);
      
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string | undefined;
      
      const transactions = await getWalletTransactions(wallet.id, { limit, offset, type });
      const totalCount = await getWalletTransactionCount(wallet.id, type);
      
      res.json({
        transactions: transactions.map(tx => ({
          id: tx.id,
          reference: tx.transaction_reference,
          type: tx.type,
          amount: centsToNAD(tx.amount),
          amount_formatted: formatCurrency(tx.amount),
          fee: tx.fee_amount ? centsToNAD(tx.fee_amount) : 0,
          description: tx.description,
          status: tx.status,
          created_at: tx.created_at,
          completed_at: tx.completed_at
        })),
        pagination: {
          limit,
          offset,
          total: totalCount,
          has_more: offset + limit < totalCount
        }
      });
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// =====================================================
// 2. E-MONEY ISSUANCE (LOAD WALLET)
// =====================================================

/**
 * POST /api/v1/wallet/load
 * Load money into wallet (e-money issuance)
 * Reference: PSD-3 Section 3.6 - E-money issued on receipt of funds
 */
router.post(
  '/wallet/load',
  authenticate,
  [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least N$1'),
    body('payment_method').isIn(['BANK_TRANSFER', 'CASH_AGENT', 'CARD']).withMessage('Invalid payment method'),
    body('payment_reference').isString().notEmpty().withMessage('Payment reference is required'),
    body('agent_code').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const wallet = await getWalletByUserId(user.id);
      
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      const amount = nadToCents(parseFloat(req.body.amount));
      const paymentMethod = req.body.payment_method;
      const paymentReference = req.body.payment_reference;
      const agentCode = req.body.agent_code;
      
      // Validate transaction
      const validationResult = await validator.validateTransaction(
        wallet,
        wallet, // Recipient is same as sender for loads
        amount,
        TransactionType.LOAD,
        user,
        user
      );
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: validationResult.errorCode,
          message: validationResult.errorMessage,
          required_action: validationResult.requiredAction,
          metadata: validationResult.metadata
        });
      }
      
      // Process load transaction
      const transaction = await processLoadTransaction({
        wallet_id: wallet.id,
        amount,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        agent_code: agentCode
      });
      
      res.status(201).json({
        message: 'Wallet loaded successfully',
        transaction: {
          reference: transaction.transaction_reference,
          amount: centsToNAD(transaction.amount),
          amount_formatted: formatCurrency(transaction.amount),
          new_balance: centsToNAD(wallet.balance + amount),
          new_balance_formatted: formatCurrency(wallet.balance + amount),
          status: transaction.status,
          created_at: transaction.created_at
        }
      });
      
    } catch (error) {
      console.error('Error loading wallet:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// =====================================================
// 3. E-MONEY REDEMPTION (CASH-OUT)
// =====================================================

/**
 * POST /api/v1/wallet/cashout
 * Cash out from wallet (e-money redemption)
 * Reference: PSD-3 Section 3.6(d) - Redeemable upon demand for cash
 */
router.post(
  '/wallet/cashout',
  authenticate,
  [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least N$1'),
    body('redemption_method').isIn(['BANK_TRANSFER', 'CASH_AGENT']).withMessage('Invalid redemption method'),
    body('bank_account').optional().isString(),
    body('agent_code').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const wallet = await getWalletByUserId(user.id);
      
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      const amount = nadToCents(parseFloat(req.body.amount));
      const redemptionMethod = req.body.redemption_method;
      
      // Validate transaction
      const validationResult = await validator.validateTransaction(
        wallet,
        null, // No recipient for cashouts
        amount,
        TransactionType.CASHOUT,
        user,
        null
      );
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: validationResult.errorCode,
          message: validationResult.errorMessage,
          required_action: validationResult.requiredAction,
          metadata: validationResult.metadata
        });
      }
      
      // Process cashout transaction
      const transaction = await processCashoutTransaction({
        wallet_id: wallet.id,
        amount,
        redemption_method: redemptionMethod,
        bank_account: req.body.bank_account,
        agent_code: req.body.agent_code
      });
      
      res.status(201).json({
        message: 'Cash-out successful',
        transaction: {
          reference: transaction.transaction_reference,
          amount: centsToNAD(transaction.amount),
          amount_formatted: formatCurrency(transaction.amount),
          fee: transaction.fee_amount ? centsToNAD(transaction.fee_amount) : 0,
          new_balance: centsToNAD(wallet.balance - amount),
          new_balance_formatted: formatCurrency(wallet.balance - amount),
          status: transaction.status,
          created_at: transaction.created_at
        }
      });
      
    } catch (error) {
      console.error('Error processing cashout:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// =====================================================
// 4. P2P TRANSFER
// =====================================================

/**
 * POST /api/v1/wallet/transfer
 * Transfer money to another wallet (P2P)
 * Reference: PSD-3 Section 3.6(c) - Accepted as means of payment
 */
router.post(
  '/wallet/transfer',
  authenticate,
  [
    body('recipient_phone').optional().isMobilePhone('any'),
    body('recipient_wallet').optional().isString(),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least N$1'),
    body('description').optional().isString(),
    body('pin').isString().notEmpty().withMessage('PIN is required')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const senderWallet = await getWalletByUserId(user.id);
      
      if (!senderWallet) {
        return res.status(404).json({ error: 'Sender wallet not found' });
      }
      
      // Verify PIN
      const pinValid = await verifyUserPin(user.id, req.body.pin);
      if (!pinValid) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
      
      // Find recipient wallet
      let recipientWallet;
      if (req.body.recipient_phone) {
        recipientWallet = await getWalletByPhone(req.body.recipient_phone);
      } else if (req.body.recipient_wallet) {
        recipientWallet = await getWalletByWalletNumber(req.body.recipient_wallet);
      } else {
        return res.status(400).json({ error: 'Recipient phone or wallet number required' });
      }
      
      if (!recipientWallet) {
        return res.status(404).json({ error: 'Recipient wallet not found' });
      }
      
      if (senderWallet.id === recipientWallet.id) {
        return res.status(400).json({ error: 'Cannot transfer to yourself' });
      }
      
      const amount = nadToCents(parseFloat(req.body.amount));
      const recipientUser = await getUserById(recipientWallet.user_id);
      
      // Validate transaction
      const validationResult = await validator.validateTransaction(
        senderWallet,
        recipientWallet,
        amount,
        TransactionType.TRANSFER_P2P,
        user,
        recipientUser
      );
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: validationResult.errorCode,
          message: validationResult.errorMessage,
          required_action: validationResult.requiredAction,
          metadata: validationResult.metadata
        });
      }
      
      // Process transfer
      const transaction = await processP2PTransfer({
        sender_wallet_id: senderWallet.id,
        recipient_wallet_id: recipientWallet.id,
        amount,
        description: req.body.description
      });
      
      // Send notifications to both parties
      await sendTransferNotification(user, recipientUser, transaction);
      
      res.status(201).json({
        message: 'Transfer successful',
        transaction: {
          reference: transaction.transaction_reference,
          amount: centsToNAD(transaction.amount),
          amount_formatted: formatCurrency(transaction.amount),
          fee: transaction.fee_amount ? centsToNAD(transaction.fee_amount) : 0,
          recipient: {
            name: recipientUser.full_name,
            phone: recipientUser.phone_number
          },
          new_balance: centsToNAD(senderWallet.balance - amount),
          new_balance_formatted: formatCurrency(senderWallet.balance - amount),
          status: transaction.status,
          created_at: transaction.created_at
        }
      });
      
    } catch (error) {
      console.error('Error processing transfer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// =====================================================
// 5. KYC MANAGEMENT
// =====================================================

/**
 * GET /api/v1/kyc/status
 * Get current KYC status and tier information
 */
router.get('/kyc/status', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const wallet = await getWalletByUserId(user.id);
    const kycDocument = await getLatestKYCDocument(user.id);
    
    const limits = TransactionLimitsConfig.getLimits(user.kyc_tier, wallet?.wallet_type || WalletType.INDIVIDUAL);
    
    res.json({
      current_tier: user.kyc_tier,
      kyc_status: user.kyc_status,
      verified_at: user.kyc_verified_at,
      expires_at: user.kyc_expires_at,
      
      current_limits: {
        max_single_transaction: centsToNAD(limits.maxSingleTransaction),
        max_daily_transaction: centsToNAD(limits.maxDailyTransaction),
        max_monthly_balance: centsToNAD(limits.maxMonthlyBalance)
      },
      
      can_upgrade: user.kyc_tier === KYCTier.LITE,
      
      upgrade_benefits: user.kyc_tier === KYCTier.LITE ? {
        tier: KYCTier.FULL,
        limits: {
          max_single_transaction: wallet?.wallet_type === WalletType.BUSINESS ? 'N$50,000' : 'N$20,000',
          max_daily_transaction: wallet?.wallet_type === WalletType.BUSINESS ? 'N$50,000' : 'N$20,000',
          max_monthly_balance: wallet?.wallet_type === WalletType.BUSINESS ? 'N$100,000' : 'N$50,000'
        }
      } : null,
      
      document_status: kycDocument ? {
        verification_status: kycDocument.verification_status,
        submitted_at: kycDocument.created_at,
        rejection_reason: kycDocument.rejection_reason
      } : null
    });
    
  } catch (error) {
    console.error('Error fetching KYC status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/kyc/upgrade
 * Submit Full KYC documents for upgrade
 * Reference: PSN 2025 Section 5, Table 4
 */
router.post(
  '/kyc/upgrade',
  authenticate,
  [
    body('national_id_number').optional().isString(),
    body('passport_number').optional().isString(),
    body('residential_address').isString().notEmpty(),
    body('telephone_number').optional().isMobilePhone('any'),
    body('mobile_number').isMobilePhone('any'),
    body('contact_email').isEmail(),
    body('is_business').optional().isBoolean(),
    body('company_registration_number').optional().isString(),
    body('nature_of_business').optional().isString(),
    body('business_location').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      if (user.kyc_tier === KYCTier.FULL) {
        return res.status(400).json({ error: 'Already at Full KYC tier' });
      }
      
      // Create KYC document record
      const kycDocument = await createKYCDocument({
        user_id: user.id,
        tier: KYCTier.FULL,
        ...req.body,
        verification_status: 'PENDING'
      });
      
      res.status(201).json({
        message: 'KYC upgrade application submitted successfully',
        kyc_application: {
          id: kycDocument.id,
          tier: kycDocument.tier,
          status: kycDocument.verification_status,
          submitted_at: kycDocument.created_at
        },
        next_steps: [
          'Upload required documents (ID, proof of residence, selfie)',
          'Wait for verification (typically 24-48 hours)',
          'You will be notified once verification is complete'
        ]
      });
      
    } catch (error) {
      console.error('Error submitting KYC upgrade:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/v1/kyc/upload-documents
 * Upload KYC documents (ID, proof of residence, selfie)
 */
router.post(
  '/kyc/upload-documents',
  authenticate,
  // TODO: Add multer middleware for file upload
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Get pending KYC document
      const kycDocument = await getLatestKYCDocument(user.id);
      
      if (!kycDocument || kycDocument.verification_status !== 'PENDING') {
        return res.status(400).json({ error: 'No pending KYC application found' });
      }
      
      // TODO: Process uploaded files
      // - Validate file types and sizes
      // - Upload to S3/storage
      // - Update KYC document with URLs
      // - Trigger automated verification (OCR, face matching)
      
      res.json({
        message: 'Documents uploaded successfully',
        status: 'Documents are being verified'
      });
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// =====================================================
// 6. LIMITS & COMPLIANCE
// =====================================================

/**
 * GET /api/v1/limits/check
 * Check if a transaction would exceed limits (pre-validation)
 */
router.get(
  '/limits/check',
  authenticate,
  [
    query('amount').isFloat({ min: 1 }),
    query('type').isIn(['LOAD', 'CASHOUT', 'TRANSFER'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const wallet = await getWalletByUserId(user.id);
      const amount = nadToCents(parseFloat(req.query.amount as string));
      const type = req.query.type as string;
      
      const transactionType = type === 'LOAD' ? TransactionType.LOAD :
                              type === 'CASHOUT' ? TransactionType.CASHOUT :
                              TransactionType.TRANSFER_P2P;
      
      const validationResult = await validator.validateTransaction(
        wallet,
        null,
        amount,
        transactionType,
        user,
        null
      );
      
      res.json({
        allowed: validationResult.isValid,
        error: validationResult.errorCode,
        message: validationResult.errorMessage,
        required_action: validationResult.requiredAction,
        metadata: validationResult.metadata
      });
      
    } catch (error) {
      console.error('Error checking limits:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// =====================================================
// DATABASE HELPER FUNCTIONS (to be implemented)
// =====================================================

async function getWalletByUserId(userId: number): Promise<any> {
  throw new Error('Not implemented');
}

async function getWalletByPhone(phone: string): Promise<any> {
  throw new Error('Not implemented');
}

async function getWalletByWalletNumber(walletNumber: string): Promise<any> {
  throw new Error('Not implemented');
}

async function getUserById(userId: number): Promise<any> {
  throw new Error('Not implemented');
}

async function getDailyTransactionSummary(walletId: number, date: string): Promise<any> {
  throw new Error('Not implemented');
}

async function getMonthlyTransactionSummary(walletId: number, year: number, month: number): Promise<any> {
  throw new Error('Not implemented');
}

async function getWalletTransactions(walletId: number, options: any): Promise<any[]> {
  throw new Error('Not implemented');
}

async function getWalletTransactionCount(walletId: number, type?: string): Promise<number> {
  throw new Error('Not implemented');
}

async function processLoadTransaction(data: any): Promise<any> {
  throw new Error('Not implemented');
}

async function processCashoutTransaction(data: any): Promise<any> {
  throw new Error('Not implemented');
}

async function processP2PTransfer(data: any): Promise<any> {
  throw new Error('Not implemented');
}

async function verifyUserPin(userId: number, pin: string): Promise<boolean> {
  throw new Error('Not implemented');
}

async function sendTransferNotification(sender: any, recipient: any, transaction: any): Promise<void> {
  // Send SMS/push notification
}

async function getLatestKYCDocument(userId: number): Promise<any> {
  throw new Error('Not implemented');
}

async function createKYCDocument(data: any): Promise<any> {
  throw new Error('Not implemented');
}

export default router;
