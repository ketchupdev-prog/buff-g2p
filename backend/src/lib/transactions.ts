/**
 * Database Transaction Management
 * 
 * Purpose: Atomic transaction support for critical operations
 * Location: backend/src/lib/transactions.ts
 * 
 * Implements: KNOWN_LIMITATIONS.md T3 - Transaction Management
 * 
 * Neon serverless driver doesn't support .begin() method, so we use
 * explicit BEGIN/COMMIT/ROLLBACK SQL statements for atomic operations.
 * 
 * Features:
 * - Atomic multi-step operations
 * - Automatic rollback on error
 * - Savepoints for nested transactions
 * - Connection pooling friendly
 */

import { sql } from './db.js';
import { randomUUID } from 'crypto';

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute a callback within a database transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 * 
 * @example
 * const result = await withTransaction(async () => {
 *   await sql`UPDATE wallets SET balance = balance - 100 WHERE id = ${fromWalletId}`;
 *   await sql`UPDATE wallets SET balance = balance + 100 WHERE id = ${toWalletId}`;
 *   return { transferred: 100 };
 * });
 */
export async function withTransaction<T>(
  callback: () => Promise<T>
): Promise<TransactionResult<T>> {
  const txId = randomUUID().slice(0, 8);
  
  try {
    // Start transaction
    await sql`BEGIN`;
    console.log(`[TX-${txId}] Transaction started`);

    // Execute callback
    const result = await callback();

    // Commit transaction
    await sql`COMMIT`;
    console.log(`[TX-${txId}] Transaction committed`);

    return { success: true, data: result };
  } catch (error) {
    // Rollback on error
    try {
      await sql`ROLLBACK`;
      console.log(`[TX-${txId}] Transaction rolled back`);
    } catch (rollbackError) {
      console.error(`[TX-${txId}] Rollback failed:`, rollbackError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
    console.error(`[TX-${txId}] Transaction error:`, errorMessage);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute a callback with a savepoint (nested transaction support)
 * Allows partial rollback without affecting parent transaction
 * 
 * @example
 * await withTransaction(async () => {
 *   // Parent operation
 *   await sql`UPDATE accounts SET balance = balance - 100`;
 *   
 *   // Try optional operation with savepoint
 *   await withSavepoint('bonus_points', async () => {
 *     await sql`UPDATE users SET points = points + 10`;
 *   });
 *   
 *   // Parent operation continues even if savepoint fails
 * });
 */
export async function withSavepoint<T>(
  name: string,
  callback: () => Promise<T>
): Promise<TransactionResult<T>> {
  const savepointName = `sp_${name}_${Date.now()}`;
  
  try {
    // Create savepoint
    await sql.unsafe(`SAVEPOINT ${savepointName}`);
    console.log(`[SAVEPOINT] ${savepointName} created`);

    // Execute callback
    const result = await callback();

    // Release savepoint
    await sql.unsafe(`RELEASE SAVEPOINT ${savepointName}`);
    console.log(`[SAVEPOINT] ${savepointName} released`);

    return { success: true, data: result };
  } catch (error) {
    // Rollback to savepoint
    try {
      await sql.unsafe(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      console.log(`[SAVEPOINT] ${savepointName} rolled back`);
    } catch (rollbackError) {
      console.error(`[SAVEPOINT] ${savepointName} rollback failed:`, rollbackError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Savepoint operation failed';
    console.error(`[SAVEPOINT] ${savepointName} error:`, errorMessage);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Transfer money between wallets atomically
 * Ensures both debit and credit happen together or not at all
 */
export async function transferMoneyAtomic(params: {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note: string;
  senderId: string;
  recipientId: string;
}): Promise<TransactionResult<{ transactionId: string }>> {
  return withTransaction(async () => {
    const { fromWalletId, toWalletId, amount, note, senderId, recipientId } = params;

    // Debit source wallet with row lock
    const fromRows = await sql`
      UPDATE wallets 
      SET balance = balance - ${amount}, updated_at = NOW()
      WHERE id = ${fromWalletId} AND balance >= ${amount}
      RETURNING id, balance, currency
    `;

    if (fromRows.length === 0) {
      throw new Error('Insufficient balance or wallet not found');
    }

    const sourceWallet = fromRows[0] as { id: string; balance: number; currency: string };

    // Credit destination wallet with row lock
    const toRows = await sql`
      UPDATE wallets 
      SET balance = balance + ${amount}, updated_at = NOW()
      WHERE id = ${toWalletId}
      RETURNING id, balance
    `;

    if (toRows.length === 0) {
      throw new Error('Destination wallet not found');
    }

    // Record sender transaction
    await sql`
      INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
      VALUES (${fromWalletId}, 'send', ${amount}, ${note || 'Money sent'})
    `;

    // Record recipient transaction
    await sql`
      INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
      VALUES (${toWalletId}, 'receive', ${amount}, ${note || 'Money received'})
    `;

    // Record P2P transaction
    const transactionId = randomUUID();
    await sql`
      INSERT INTO p2p_transactions (
        id, sender_id, recipient_id, wallet_id, amount, currency, note
      )
      VALUES (
        ${transactionId}, ${senderId}, ${recipientId}, ${fromWalletId},
        ${amount}, ${sourceWallet.currency || 'NAD'}, ${note || ''}
      )
    `;

    return { transactionId };
  });
}

/**
 * Process loan disbursement atomically
 * Creates loan record and credits wallet together
 */
export async function disburseLoanAtomic(params: {
  userId: string;
  walletId: string;
  amount: number;
  loanType: string;
  interestRate: number;
  termMonths: number;
}): Promise<TransactionResult<{ loanId: string }>> {
  return withTransaction(async () => {
    const { userId, walletId, amount, loanType, interestRate, termMonths } = params;

    // Create loan record
    const loanId = randomUUID();
    await sql`
      INSERT INTO loans (
        id, user_id, amount, interest_rate, term_months, 
        loan_type, status, disbursed_at, created_at
      )
      VALUES (
        ${loanId}, ${userId}, ${amount}, ${interestRate}, ${termMonths},
        ${loanType}, 'active', NOW(), NOW()
      )
    `;

    // Credit wallet
    await sql`
      UPDATE wallets 
      SET balance = balance + ${amount}
      WHERE id = ${walletId}
      FOR UPDATE
    `;

    // Record transaction
    await sql`
      INSERT INTO wallet_transactions (
        id, wallet_id, amount, transaction_type, description, user_id, created_at
      )
      VALUES (
        ${randomUUID()}, ${walletId}, ${amount}, 'loan_disbursement',
        ${'Loan disbursement: ' + loanType}, ${userId}, NOW()
      )
    `;

    return { loanId };
  });
}

/**
 * Process voucher redemption atomically
 * Marks voucher as redeemed and credits wallet together
 */
export async function redeemVoucherAtomic(params: {
  voucherCode: string;
  walletId: string;
  userId: string;
}): Promise<TransactionResult<{ transactionId: string; amount: number }>> {
  return withTransaction(async () => {
    const { voucherCode, walletId, userId } = params;

    // Check and mark voucher as redeemed with row lock
    const voucherRows = await sql`
      UPDATE vouchers 
      SET 
        status = 'redeemed',
        redeemed_at = NOW(),
        redeemed_by_user_id = ${userId}
      WHERE 
        code = ${voucherCode} 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING id, amount
      FOR UPDATE
    `;

    if (voucherRows.length === 0) {
      throw new Error('Voucher not found, already redeemed, or expired');
    }

    const voucher = voucherRows[0];
    const amount = parseFloat(voucher.amount);

    // Credit wallet
    await sql`
      UPDATE wallets 
      SET balance = balance + ${amount}
      WHERE id = ${walletId}
      FOR UPDATE
    `;

    // Record transaction
    const transactionId = randomUUID();
    await sql`
      INSERT INTO wallet_transactions (
        id, wallet_id, amount, transaction_type, description, user_id, created_at
      )
      VALUES (
        ${transactionId}, ${walletId}, ${amount}, 'voucher_redemption',
        ${'Voucher redeemed: ' + voucherCode}, ${userId}, NOW()
      )
    `;

    return { transactionId, amount };
  });
}

/**
 * Process group contribution atomically
 * Debits contributor wallet and updates group wallet
 */
export async function groupContributionAtomic(params: {
  groupId: string;
  userId: string;
  walletId: string;
  amount: number;
  description: string;
  method?: string;
}): Promise<TransactionResult<{ contributionId: string }>> {
  return withTransaction(async () => {
    const { groupId, userId, walletId, amount, description, method = 'wallet' } = params;

    // Debit user wallet with row lock
    const walletRows = await sql`
      UPDATE wallets 
      SET balance = balance - ${amount}, updated_at = NOW()
      WHERE id = ${walletId} AND balance >= ${amount}
      RETURNING id, balance
    `;

    if (walletRows.length === 0) {
      throw new Error('Insufficient balance');
    }

    // Credit group wallet with row lock
    await sql`
      UPDATE group_wallets 
      SET balance = balance + ${amount}, updated_at = NOW()
      WHERE group_id = ${groupId}
    `;

    // Record contribution
    const contributionId = randomUUID();
    await sql`
      INSERT INTO group_contributions (
        id, group_id, user_id, amount, method, created_at
      )
      VALUES (
        ${contributionId}, ${groupId}, ${userId}, ${amount}, ${method}, NOW()
      )
    `;

    // Record group transaction
    await sql`
      INSERT INTO group_transactions (
        group_id, type, amount, from_user_id, description, status, created_at, completed_at
      )
      VALUES (
        ${groupId}, 'contribution', ${amount}, ${userId}, ${description}, 'completed', NOW(), NOW()
      )
    `;

    return { contributionId };
  });
}
