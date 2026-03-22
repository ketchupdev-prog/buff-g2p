/**
 * Loans API Routes
 * Location: fintech/smartpay/backend/src/routes/mobile/loans.ts
 * Voucher-backed micro-loans with eligibility checking
 * ETA §32 audit logging for all loan operations
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { strictRateLimiter, lenientRateLimiter } from '../../middleware/rateLimiter';
import { validateLoanApplication } from '../../middleware/zodValidation';
import { transaction } from '../../lib/db';
import { logWithAttribution } from '../../lib/etaAttribution';
import { assessCredit, isBuffrAiConfigured } from '../../lib/buffrAiClient';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface LoanApplicationRequest {
  amount: number;
  walletId: string;
  purpose?: string;
}

/**
 * GET /api/v1/loans/eligibility
 * Check loan eligibility and get offer
 */
router.get(
  '/loans/eligibility',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const result = await transaction(async (client) => {
        // Get user's next expected voucher
        const voucherResult = await client.query(
          `SELECT 
            id, amount, currency, expected_date, voucher_type, issuer
           FROM vouchers
           WHERE user_id = $1 
             AND status = 'expected'
             AND expected_date IS NOT NULL
           ORDER BY expected_date ASC
           LIMIT 1`,
          [userId]
        );

        if ((voucherResult.rowCount ?? 0) === 0) {
          return {
            eligible: false,
            reason: 'No expected vouchers found. Loans are backed by future vouchers.',
            maxAmount: 0,
            interestRate: 0,
            repaymentDate: null
          };
        }

        const voucher = voucherResult.rows[0] as {
          id: string;
          amount: string;
          currency: string;
          expected_date: Date;
          voucher_type: string;
          issuer: string;
        };

        const voucherAmount = parseFloat(voucher.amount);

        // Get user's outstanding loans
        const outstandingResult = await client.query(
          `SELECT COALESCE(SUM(amount + interest), 0) as total_outstanding
           FROM loans
           WHERE user_id = $1 
             AND status IN ('active', 'pending')`,
          [userId]
        );

        const totalOutstanding = parseFloat(
          outstandingResult.rows[0]?.total_outstanding || '0'
        );

        // Get user's KYC tier for risk assessment
        const userResult = await client.query(
          `SELECT kyc_tier, credit_score, created_at
           FROM users
           WHERE id = $1`,
          [userId]
        );

        if ((userResult.rowCount ?? 0) === 0) {
          throw new Error('User not found');
        }

        const user = userResult.rows[0] as {
          kyc_tier: string;
          credit_score: number | null;
          created_at: Date;
        };

        // Calculate max loan based on voucher and outstanding balance
        // Conservative: max 70% of expected voucher minus outstanding loans
        const maxLoanAmount = Math.max(0, voucherAmount * 0.7 - totalOutstanding);

        if (maxLoanAmount < 10) {
          // Minimum loan of N$10
          return {
            eligible: false,
            reason:
              totalOutstanding > 0
                ? `You have outstanding loans of N$${totalOutstanding.toFixed(2)}. Repay existing loans first.`
                : 'Expected voucher amount too low for a loan',
            maxAmount: 0,
            interestRate: 0,
            repaymentDate: null,
            outstandingLoans: totalOutstanding
          };
        }

        // Calculate interest rate based on risk factors
        let interestRate = 0.05; // Base 5% monthly

        // Adjust based on KYC tier
        if (user.kyc_tier === 'enhanced') {
          interestRate = 0.03; // 3% for enhanced KYC
        } else if (user.kyc_tier === 'basic') {
          interestRate = 0.07; // 7% for basic KYC
        }

        // Adjust based on credit score if available
        if (user.credit_score !== null) {
          if (user.credit_score > 750) {
            interestRate -= 0.01;
          } else if (user.credit_score < 600) {
            interestRate += 0.02;
          }
        }

        // Adjust for new users (higher risk)
        const accountAgeDays =
          (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < 30) {
          interestRate += 0.02;
        }

        // Cap interest rate
        interestRate = Math.max(0.02, Math.min(0.15, interestRate));

        // Optional: gather aggregates for Buffr AI credit assess (PRD §4.6.5)
        let creditAggregates: {
          transaction_count: number;
          total_transaction_volume: number;
          avg_transaction_amount: number;
          successful_transactions: number;
          failed_transactions: number;
          avg_daily_balance: number;
          account_age_days: number;
        } | null = null;
        if (isBuffrAiConfigured()) {
          const aggResult = await client.query(
            `SELECT
               COUNT(*)::int AS transaction_count,
               COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)::float AS total_volume,
               COUNT(*) FILTER (WHERE status = 'completed')::int AS successful_transactions,
               COUNT(*) FILTER (WHERE status != 'completed' AND status IS NOT NULL)::int AS failed_transactions
             FROM transactions
             WHERE source_user_id = $1 OR destination_user_id = $1`,
            [userId]
          );
          const agg = aggResult.rows[0] as {
            transaction_count: string;
            total_volume: string;
            successful_transactions: string;
            failed_transactions: string;
          };
          const balanceResult = await client.query(
            `SELECT COALESCE(AVG(balance), 0)::float AS avg_balance FROM wallets WHERE user_id = $1`,
            [userId]
          );
          const txCount = parseInt(agg?.transaction_count || '0', 10);
          const totalVol = parseFloat(agg?.total_volume || '0');
          creditAggregates = {
            transaction_count: txCount,
            total_transaction_volume: totalVol,
            avg_transaction_amount: txCount > 0 ? totalVol / txCount : 0,
            successful_transactions: parseInt(agg?.successful_transactions || '0', 10),
            failed_transactions: parseInt(agg?.failed_transactions || '0', 10),
            avg_daily_balance: parseFloat((balanceResult.rows[0] as { avg_balance: string })?.avg_balance || '0'),
            account_age_days: Math.max(0, Math.floor(accountAgeDays))
          };
        }

        return {
          eligible: true,
          maxAmount: Math.floor(maxLoanAmount * 100) / 100,
          currency: voucher.currency,
          interestRate,
          interestRatePercent: (interestRate * 100).toFixed(2) + '%',
          repaymentDate: voucher.expected_date,
          backedByVoucher: {
            voucherId: voucher.id,
            voucherAmount: voucherAmount,
            voucherType: voucher.voucher_type,
            issuer: voucher.issuer,
            expectedDate: voucher.expected_date
          },
          outstandingLoans: totalOutstanding,
          estimatedInterest:
            Math.floor(maxLoanAmount * interestRate * 100) / 100,
          _creditAggregates: creditAggregates
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'check_loan_eligibility',
        action: 'loan_eligibility_check',
        input: {},
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      // Optional: Buffr AI credit assessment to enrich offer (PRD §4.6.5)
      const resultWithAgg = result as Record<string, unknown> & { eligible?: boolean; maxAmount?: number };
      const aggregates = resultWithAgg._creditAggregates as {
        total_transaction_volume: number;
        avg_transaction_amount: number;
        transaction_count: number;
        account_age_days: number;
        successful_transactions: number;
        failed_transactions: number;
        avg_daily_balance: number;
      } | undefined;
      if (aggregates && resultWithAgg.eligible && isBuffrAiConfigured()) {
        const creditResult = await assessCredit({
          user_id: userId,
          total_transaction_volume: aggregates.total_transaction_volume,
          avg_transaction_amount: aggregates.avg_transaction_amount,
          transaction_count: aggregates.transaction_count,
          account_age_days: aggregates.account_age_days,
          successful_transactions: aggregates.successful_transactions,
          failed_transactions: aggregates.failed_transactions,
          avg_daily_balance: aggregates.avg_daily_balance
        });
        if (creditResult) {
          resultWithAgg.creditTier = creditResult.credit_tier;
          resultWithAgg.mlMaxLoanAmount = creditResult.max_loan_amount;
          resultWithAgg.maxAmount = Math.min(
            resultWithAgg.maxAmount ?? 0,
            Math.max(0, creditResult.max_loan_amount)
          );
        }
      }
      delete resultWithAgg._creditAggregates;

      return res.status(200).json({
        success: true,
        data: resultWithAgg
      });
    } catch (error) {
      console.error('[Loan Eligibility] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: { code: 'ELIGIBILITY_CHECK_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/loans/apply
 * Apply for a loan
 * SECURITY: Protected with JWT auth + rate limiting + Zod validation
 */
router.post(
  '/loans/apply',
  requireAuth,
  strictRateLimiter,
  validateLoanApplication,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, walletId, purpose } = req.body as LoanApplicationRequest;

    try {
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0' }
        });
      }

      if (!walletId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_WALLET', message: 'walletId is required' }
        });
      }

      const result = await transaction(async (client) => {
        // Re-check eligibility
        const voucherResult = await client.query(
          `SELECT 
            id, amount, currency, expected_date, voucher_type, issuer
           FROM vouchers
           WHERE user_id = $1 
             AND status = 'expected'
             AND expected_date IS NOT NULL
           ORDER BY expected_date ASC
           LIMIT 1
           FOR UPDATE`,
          [userId]
        );

        if ((voucherResult.rowCount ?? 0) === 0) {
          throw new Error('No expected vouchers found for loan backing');
        }

        const voucher = voucherResult.rows[0] as {
          id: string;
          amount: string;
          currency: string;
          expected_date: Date;
          voucher_type: string;
          issuer: string;
        };

        const voucherAmount = parseFloat(voucher.amount);

        // Check outstanding loans
        const outstandingResult = await client.query(
          `SELECT COALESCE(SUM(amount + interest), 0) as total_outstanding
           FROM loans
           WHERE user_id = $1 
             AND status IN ('active', 'pending')`,
          [userId]
        );

        const totalOutstanding = parseFloat(
          outstandingResult.rows[0]?.total_outstanding || '0'
        );

        const maxLoanAmount = Math.max(0, voucherAmount * 0.7 - totalOutstanding);

        if (amount > maxLoanAmount) {
          throw new Error(
            `Loan amount exceeds eligibility. Maximum: N$${maxLoanAmount.toFixed(2)}`
          );
        }

        // Get user info for interest calculation
        const userResult = await client.query(
          `SELECT kyc_tier, credit_score, created_at
           FROM users
           WHERE id = $1`,
          [userId]
        );

        const user = userResult.rows[0] as {
          kyc_tier: string;
          credit_score: number | null;
          created_at: Date;
        };

        // Calculate interest rate (same logic as eligibility)
        let interestRate = 0.05;
        if (user.kyc_tier === 'enhanced') {
          interestRate = 0.03;
        } else if (user.kyc_tier === 'basic') {
          interestRate = 0.07;
        }
        if (user.credit_score !== null) {
          if (user.credit_score > 750) {
            interestRate -= 0.01;
          } else if (user.credit_score < 600) {
            interestRate += 0.02;
          }
        }
        const accountAgeDays =
          (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < 30) {
          interestRate += 0.02;
        }
        interestRate = Math.max(0.02, Math.min(0.15, interestRate));

        const interestAmount = Math.floor(amount * interestRate * 100) / 100;
        const totalRepayment = amount + interestAmount;

        // Verify wallet exists and belongs to user
        const walletResult = await client.query(
          `SELECT id, currency, balance FROM wallets 
           WHERE id = $1 AND user_id = $2 AND status = 'active'`,
          [walletId, userId]
        );

        if ((walletResult.rowCount ?? 0) === 0) {
          throw new Error('Wallet not found or inactive');
        }

        const wallet = walletResult.rows[0] as {
          id: string;
          currency: string;
          balance: string;
        };

        if (wallet.currency !== voucher.currency) {
          throw new Error(
            `Wallet currency (${wallet.currency}) does not match voucher currency (${voucher.currency})`
          );
        }

        // Create loan record
        const loanId = uuidv4();
        await client.query(
          `INSERT INTO loans 
            (id, user_id, amount, interest, interest_rate, currency, status,
             backed_by_voucher_id, repayment_due_date, wallet_id, purpose,
             disbursed_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            loanId,
            userId,
            amount,
            interestAmount,
            interestRate,
            voucher.currency,
            'active',
            voucher.id,
            voucher.expected_date,
            walletId,
            purpose || 'Personal loan'
          ]
        );

        // Create transaction record
        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, destination_wallet_id, 
             destination_user_id, description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            transactionId,
            'loan_disbursement',
            'completed',
            amount,
            0,
            voucher.currency,
            walletId,
            userId,
            `Loan disbursement - ${purpose || 'Personal loan'}`,
            JSON.stringify({
              loanId,
              interestAmount,
              interestRate,
              repaymentDueDate: voucher.expected_date,
              backedByVoucher: voucher.id
            })
          ]
        );

        // Credit user's wallet
        await client.query(
          `UPDATE wallets 
           SET balance = balance + $1, updated_at = NOW()
           WHERE id = $2`,
          [amount, walletId]
        );

        // Update voucher to mark as loan collateral
        await client.query(
          `UPDATE vouchers 
           SET metadata = metadata || $1::jsonb,
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify({ loanCollateral: loanId }), voucher.id]
        );

        // Get new balance
        const newBalanceResult = await client.query(
          `SELECT balance FROM wallets WHERE id = $1`,
          [walletId]
        );
        const newBalance = parseFloat(newBalanceResult.rows[0].balance);

        return {
          loanId,
          transactionId,
          status: 'active',
          amount,
          interest: interestAmount,
          interestRate,
          interestRatePercent: (interestRate * 100).toFixed(2) + '%',
          totalRepayment,
          currency: voucher.currency,
          repaymentDueDate: voucher.expected_date,
          walletId,
          newBalance,
          disbursedAt: new Date().toISOString(),
          repaymentNote:
            'Loan will be automatically repaid when your voucher is received'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'apply_for_loan',
        action: 'loan_application',
        input: { amount, walletId, purpose },
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
      console.error('[Loan Application] Error:', error);

      await logWithAttribution({
        userId,
        toolName: 'apply_for_loan',
        action: 'loan_application',
        input: { amount, walletId, purpose },
        result: 'failure',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      }).catch(console.error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'LOAN_APPLICATION_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * GET /api/v1/loans
 * Get user's loan history
 */
router.get(
  '/loans',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const result = await transaction(async (client) => {
        const loansResult = await client.query(
          `SELECT 
            id, amount, interest, interest_rate, currency, status,
            backed_by_voucher_id, repayment_due_date, repaid_at,
            purpose, disbursed_at, created_at
           FROM loans
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId]
        );

        return loansResult.rows;
      });

      return res.status(200).json({
        success: true,
        data: {
          loans: result,
          count: result.length
        }
      });
    } catch (error) {
      console.error('[Loans List] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * GET /api/v1/loans/:id
 * Get single loan details with full information
 */
router.get(
  '/loans/:id',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const result = await transaction(async (client) => {
        const loanResult = await client.query(
          `SELECT 
            id, amount, interest, interest_rate, currency, status,
            backed_by_voucher_id, repayment_due_date, repaid_at,
            purpose, disbursed_at, wallet_id, created_at
           FROM loans
           WHERE id = $1 AND user_id = $2`,
          [id, userId]
        );

        if ((loanResult.rowCount ?? 0) === 0) {
          throw new Error('Loan not found');
        }

        const loan = loanResult.rows[0];
        
        // Fetch voucher details if loan is backed by voucher
        let voucherDetails = null;
        if (loan.backed_by_voucher_id) {
          const voucherResult = await client.query(
            `SELECT id, amount, currency, voucher_type, issuer, expected_date, status
             FROM vouchers
             WHERE id = $1`,
            [loan.backed_by_voucher_id]
          );
          if ((voucherResult.rowCount ?? 0) > 0) {
            voucherDetails = voucherResult.rows[0];
          }
        }

        // Fetch wallet details
        let walletDetails = null;
        if (loan.wallet_id) {
          const walletResult = await client.query(
            `SELECT id, name, currency, balance
             FROM wallets
             WHERE id = $1 AND user_id = $2`,
            [loan.wallet_id, userId]
          );
          if ((walletResult.rowCount ?? 0) > 0) {
            walletDetails = walletResult.rows[0];
          }
        }

        return {
          ...loan,
          backedByVoucher: voucherDetails,
          wallet: walletDetails
        };
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Loan Detail] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage === 'Loan not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: errorMessage }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: errorMessage }
      });
    }
  }
);

export default router;
