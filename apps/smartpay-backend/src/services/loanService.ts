/**
 * Loan Service - Loan operations
 * Following Buffr G2P service patterns
 */

import { sql } from '../lib/db';
import type { Loan, TransactionResult } from '../types';
import { disburseLoanAtomic } from '../lib/transactions';

export async function applyForLoan(params: {
  userId: string;
  amount: number;
  walletId: string;
  purpose?: string;
}): Promise<TransactionResult<Loan>> {
  try {
    const { userId, amount, walletId, purpose } = params;

    // Check eligibility based on voucher history
    const voucherRows = await sql`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM voucher_redemptions
      WHERE user_id = ${userId}
    `;
    
    const totalRedeemed = Number(voucherRows[0]?.total || 0);
    const maxLoan = totalRedeemed * 0.5; // 50% of voucher value
    
    if (amount > maxLoan) {
      return {
        success: false,
        error: `Maximum loan amount is NAD ${maxLoan.toFixed(2)} based on voucher history`
      };
    }
    
    // Check existing active loans
    const activeLoans = await sql`
      SELECT COUNT(*) AS count
      FROM loans
      WHERE user_id = ${userId}
        AND status IN ('pending', 'active')
    `;
    
    if (Number(activeLoans[0]?.count || 0) > 0) {
      return {
        success: false,
        error: 'Active loan already exists'
      };
    }
    
    // Calculate repayment (15% interest)
    const interestRate = 15.0;
    const totalRepayment = amount * (1 + interestRate / 100);
    
    // Create loan
    const loanRows = await sql`
      INSERT INTO loans (
        user_id,
        wallet_id,
        amount,
        interest_rate,
        total_repayment,
        status,
        previous_voucher_value
      )
      VALUES (
        ${userId},
        ${walletId},
        ${amount},
        ${interestRate},
        ${totalRepayment},
        'pending',
        ${totalRedeemed}
      )
      RETURNING *
    `;
    
    const loan = loanRows[0] as any;
    
    return {
      success: true,
      data: {
        id: loan.id,
        user_id: loan.user_id,
        wallet_id: loan.wallet_id,
        amount: Number(loan.amount),
        interest_rate: Number(loan.interest_rate),
        total_repayment: Number(loan.total_repayment),
        status: loan.status,
        previous_voucher_value: loan.previous_voucher_value ? Number(loan.previous_voucher_value) : undefined,
        disbursed_at: loan.disbursed_at,
        repaid_at: loan.repaid_at,
        repayment_voucher_redemption_id: loan.repayment_voucher_redemption_id,
        created_at: loan.created_at,
        updated_at: loan.updated_at
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply for loan'
    };
  }
}

export async function disburseLoan(
  loanId: string,
  userId: string
): Promise<TransactionResult<{ newBalance: number }>> {
  try {
    // Get loan details
    const loanRows = await sql`
      SELECT * FROM loans
      WHERE id = ${loanId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (loanRows.length === 0) {
      return {
        success: false,
        error: 'Loan not found'
      };
    }

    const loan = loanRows[0] as any;

    if (loan.status !== 'pending') {
      return {
        success: false,
        error: 'Loan is not in pending status'
      };
    }

    // Disburse using atomic transaction
    const result = await disburseLoanAtomic({
      loanId,
      userId,
      walletId: loan.wallet_id,
      amount: Number(loan.amount)
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disburse loan'
    };
  }
}

export async function getUserLoans(
  userId: string,
  status?: 'pending' | 'active' | 'repaid' | 'defaulted'
): Promise<Loan[]> {
  let rows;
  
  if (status) {
    rows = await sql`
      SELECT * FROM loans
      WHERE user_id = ${userId} AND status = ${status}
      ORDER BY created_at DESC
    `;
  } else {
    rows = await sql`
      SELECT * FROM loans
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
  }

  return rows.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    wallet_id: row.wallet_id,
    amount: Number(row.amount),
    interest_rate: Number(row.interest_rate),
    total_repayment: Number(row.total_repayment),
    status: row.status,
    previous_voucher_value: row.previous_voucher_value ? Number(row.previous_voucher_value) : undefined,
    disbursed_at: row.disbursed_at,
    repaid_at: row.repaid_at,
    repayment_voucher_redemption_id: row.repayment_voucher_redemption_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

export async function getLoanById(
  loanId: string,
  userId: string
): Promise<Loan | null> {
  const rows = await sql`
    SELECT * FROM loans
    WHERE id = ${loanId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] as any;
  return {
    id: row.id,
    user_id: row.user_id,
    wallet_id: row.wallet_id,
    amount: Number(row.amount),
    interest_rate: Number(row.interest_rate),
    total_repayment: Number(row.total_repayment),
    status: row.status,
    previous_voucher_value: row.previous_voucher_value ? Number(row.previous_voucher_value) : undefined,
    disbursed_at: row.disbursed_at,
    repaid_at: row.repaid_at,
    repayment_voucher_redemption_id: row.repayment_voucher_redemption_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function repayLoan(params: {
  loanId: string;
  userId: string;
  walletId: string;
  amount: number;
}): Promise<TransactionResult<void>> {
  try {
    const { loanId, userId, walletId, amount } = params;

    // Get loan details
    const loan = await getLoanById(loanId, userId);
    
    if (!loan) {
      return {
        success: false,
        error: 'Loan not found'
      };
    }

    if (loan.status !== 'active') {
      return {
        success: false,
        error: 'Loan is not active'
      };
    }

    // Check if repayment amount matches total repayment
    if (amount < loan.total_repayment) {
      return {
        success: false,
        error: `Repayment amount must be at least NAD ${loan.total_repayment}`
      };
    }

    // Use transaction
    await sql`BEGIN`;

    try {
      // Debit wallet
      const walletRows = await sql`
        UPDATE wallets
        SET balance = balance - ${amount}, updated_at = NOW()
        WHERE id = ${walletId} AND user_id = ${userId} AND balance >= ${amount}
        RETURNING id, balance
      `;

      if (walletRows.length === 0) {
        throw new Error('Insufficient balance or wallet not found');
      }

      // Update loan status
      await sql`
        UPDATE loans
        SET status = 'repaid', repaid_at = NOW(), updated_at = NOW()
        WHERE id = ${loanId}
      `;

      // Record transaction
      await sql`
        INSERT INTO wallet_transactions (
          wallet_id, type, amount, reference_id, description
        )
        VALUES (
          ${walletId},
          'loan_repayment',
          ${-amount},
          ${loanId},
          'Loan repayment'
        )
      `;

      await sql`COMMIT`;

      return { success: true };
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to repay loan'
    };
  }
}

export async function calculateRepayment(
  amount: number,
  interestRate: number = 15.0
): Promise<{
  principal: number;
  interestRate: number;
  interestAmount: number;
  totalRepayment: number;
}> {
  const interestAmount = amount * (interestRate / 100);
  const totalRepayment = amount + interestAmount;

  return {
    principal: amount,
    interestRate,
    interestAmount,
    totalRepayment
  };
}
