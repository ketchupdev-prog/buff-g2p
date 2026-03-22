/**
 * Transaction management with atomic operations
 * Following Buffr G2P transaction patterns
 */

import { randomUUID } from 'crypto';
import { sql } from './db';
import type { TransactionResult } from '../types';

export async function withTransaction<T>(
  callback: () => Promise<T>
): Promise<TransactionResult<T>> {
  const txId = randomUUID().slice(0, 8);
  
  try {
    await sql`BEGIN`;
    console.log(`[TX-${txId}] Transaction started`);

    const result = await callback();

    await sql`COMMIT`;
    console.log(`[TX-${txId}] Transaction committed`);

    return { success: true, data: result };
  } catch (error) {
    try {
      await sql`ROLLBACK`;
      console.log(`[TX-${txId}] Transaction rolled back`);
    } catch (rollbackError) {
      console.error(`[TX-${txId}] Rollback failed:`, rollbackError);
    }

    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Transaction failed';
    
    return { success: false, error: errorMessage };
  }
}

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

    // 1. Debit source wallet with row lock
    const fromRows = await sql`
      UPDATE wallets 
      SET balance = balance - ${amount}, updated_at = NOW()
      WHERE id = ${fromWalletId} AND balance >= ${amount}
      RETURNING id, balance, currency
    `;

    if (fromRows.length === 0) {
      throw new Error('Insufficient balance or wallet not found');
    }

    // 2. Credit destination wallet with row lock
    const toRows = await sql`
      UPDATE wallets 
      SET balance = balance + ${amount}, updated_at = NOW()
      WHERE id = ${toWalletId}
      RETURNING id, balance, currency
    `;

    if (toRows.length === 0) {
      throw new Error('Recipient wallet not found');
    }

    // 3. Record P2P transaction
    const txRows = await sql`
      INSERT INTO p2p_transactions (
        sender_id, recipient_id, wallet_id, amount, note, status
      )
      VALUES (
        ${senderId}, ${recipientId}, ${fromWalletId}, ${amount}, ${note}, 'completed'
      )
      RETURNING id
    `;

    // 4. Record wallet transactions (audit trail)
    const txId = txRows[0]?.id;
    if (!txId) {
      throw new Error('Failed to create transaction');
    }
    
    await sql`
      INSERT INTO wallet_transactions (wallet_id, type, amount, reference_id, description)
      VALUES 
        (${fromWalletId}, 'send', ${-amount}, ${txId}, ${note}),
        (${toWalletId}, 'receive', ${amount}, ${txId}, ${note})
    `;

    return { transactionId: txId };
  });
}

export async function redeemVoucherAtomic(params: {
  userId: string;
  voucherId: string;
  walletId: string;
}): Promise<TransactionResult<{ walletBalance: number }>> {
  return withTransaction(async () => {
    const { userId, voucherId, walletId } = params;

    // 1. Validate and lock voucher
    const voucherRows = await sql`
      SELECT id, user_id, amount, currency, status, expires_at
      FROM vouchers
      WHERE id = ${voucherId} AND user_id = ${userId}
      FOR UPDATE
      LIMIT 1
    `;

    if (voucherRows.length === 0) {
      throw new Error("Voucher not found");
    }

    const voucher = voucherRows[0] as any;

    if (voucher.status === "redeemed") {
      throw new Error("Voucher already redeemed");
    }

    if (new Date(voucher.expires_at) < new Date()) {
      throw new Error("Voucher expired");
    }

    // 2. Get wallet with row lock
    const walletRows = await sql`
      SELECT id, balance
      FROM wallets
      WHERE id = ${walletId} AND user_id = ${userId}
      FOR UPDATE
      LIMIT 1
    `;

    if (walletRows.length === 0) {
      throw new Error("No wallet found");
    }

    const wallet = walletRows[0] as any;
    const amount = Number(voucher.amount);
    const newBalance = Number(wallet.balance) + amount;

    // 3. Update voucher status
    await sql`UPDATE vouchers SET status = 'redeemed' WHERE id = ${voucherId}`;
    
    // 4. Record redemption
    await sql`
      INSERT INTO voucher_redemptions (voucher_id, user_id, method, amount_credited)
      VALUES (${voucherId}, ${userId}, 'wallet', ${amount})
    `;

    // 5. Credit wallet
    await sql`
      UPDATE wallets
      SET balance = ${newBalance}, updated_at = now()
      WHERE id = ${wallet.id}
    `;

    // 6. Record transaction
    await sql`
      INSERT INTO wallet_transactions (wallet_id, type, amount, reference, description)
      VALUES (${wallet.id}, 'voucher_redeem', ${amount}, ${voucherId}, 'Voucher redeemed')
    `;

    return { walletBalance: newBalance };
  });
}

export async function disburseLoanAtomic(params: {
  loanId: string;
  userId: string;
  walletId: string;
  amount: number;
}): Promise<TransactionResult<{ newBalance: number }>> {
  return withTransaction(async () => {
    const { loanId, userId, walletId, amount } = params;

    // 1. Lock loan
    const loanRows = await sql`
      SELECT *
      FROM loans
      WHERE id = ${loanId} AND user_id = ${userId}
      FOR UPDATE
      LIMIT 1
    `;
    
    if (loanRows.length === 0) {
      throw new Error("Loan not found");
    }
    
    const loan = loanRows[0] as any;
    
    if (loan.status !== "pending") {
      throw new Error("Loan already disbursed or rejected");
    }

    // 2. Lock wallet
    const walletRows = await sql`
      SELECT id, balance
      FROM wallets
      WHERE id = ${walletId} AND user_id = ${userId}
      FOR UPDATE
      LIMIT 1
    `;
    
    if (walletRows.length === 0) {
      throw new Error("Wallet not found");
    }
    
    const wallet = walletRows[0] as any;
    const newBalance = Number(wallet.balance) + amount;
    
    // 3. Credit wallet
    await sql`
      UPDATE wallets
      SET balance = ${newBalance}, updated_at = NOW()
      WHERE id = ${wallet.id}
    `;
    
    // 4. Update loan status
    await sql`
      UPDATE loans
      SET status = 'active', disbursed_at = NOW(), updated_at = NOW()
      WHERE id = ${loanId}
    `;
    
    // 5. Record transaction
    await sql`
      INSERT INTO wallet_transactions (
        wallet_id, type, amount, reference_id, description
      )
      VALUES (
        ${wallet.id},
        'loan_disbursement',
        ${amount},
        ${loanId},
        'Loan disbursement'
      )
    `;
    
    return { newBalance };
  });
}

export async function groupContributionAtomic(params: {
  userId: string;
  groupId: string;
  walletId: string;
  amount: number;
  note?: string;
}): Promise<TransactionResult<{ groupBalance: number }>> {
  return withTransaction(async () => {
    const { userId, groupId, walletId, amount, note } = params;

    // 1. Debit user wallet
    const walletRows = await sql`
      UPDATE wallets 
      SET balance = balance - ${amount}, updated_at = NOW()
      WHERE id = ${walletId} AND user_id = ${userId} AND balance >= ${amount}
      RETURNING id, balance
    `;

    if (walletRows.length === 0) {
      throw new Error('Insufficient balance or wallet not found');
    }

    // 2. Credit group wallet
    const groupRows = await sql`
      UPDATE group_wallets
      SET balance = balance + ${amount}, updated_at = NOW()
      WHERE group_id = ${groupId}
      RETURNING id, balance
    `;

    if (groupRows.length === 0) {
      throw new Error('Group wallet not found');
    }

    const groupBalance = Number(groupRows[0]?.balance || 0);

    // 3. Record contribution
    await sql`
      INSERT INTO group_contributions (
        group_id, user_id, wallet_id, amount, note
      )
      VALUES (
        ${groupId}, ${userId}, ${walletId}, ${amount}, ${note || ''}
      )
    `;

    // 4. Record wallet transaction
    await sql`
      INSERT INTO wallet_transactions (
        wallet_id, type, amount, reference, description
      )
      VALUES (
        ${walletId},
        'group_contribution',
        ${-amount},
        ${groupId},
        ${note || 'Group contribution'}
      )
    `;

    return { groupBalance };
  });
}
