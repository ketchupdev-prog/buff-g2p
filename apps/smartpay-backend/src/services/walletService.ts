/**
 * Wallet Service - Wallet management operations
 * Following Buffr G2P service patterns
 */

import { sql, pool } from '../lib/db';
import type { CreateWalletRequest, TransactionResult } from '../types';
import type { Wallet } from '@smartpay/shared-types';

export async function createWallet(params: {
  userId: string;
  name: string;
  type: "main" | "savings" | "grant";
}): Promise<TransactionResult<Wallet>> {
  try {
    const { userId, name, type } = params;

    // Check if user already has a wallet of this type
    const existing = await sql`
      SELECT id FROM wallets
      WHERE user_id = ${userId} AND type = ${type}
      LIMIT 1
    `;

    if (existing.length > 0 && type === 'main') {
      return {
        success: false,
        error: 'User already has a main wallet'
      };
    }

    // Create wallet
    const rows = await sql`
      INSERT INTO wallets (user_id, name, type, balance, currency)
      VALUES (${userId}, ${name}, ${type}, 0, 'NAD')
      RETURNING *
    `;

    const wallet = rows[0] as any;

    return {
      success: true,
      data: {
        id: wallet.id,
        user_id: wallet.user_id,
        name: wallet.name,
        type: wallet.type,
        balance: Number(wallet.balance),
        currency: wallet.currency,
        is_primary: wallet.is_primary,
        created_at: wallet.created_at,
        updated_at: wallet.updated_at
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create wallet'
    };
  }
}

export async function getUserWallets(userId: string): Promise<Wallet[]> {
  const rows = await sql`
    SELECT * FROM wallets
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;

  return rows.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    balance: Number(row.balance),
    currency: row.currency,
    is_primary: row.is_primary,
    fineract_savings_account_id: row.fineract_savings_account_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

export async function getWalletById(
  walletId: string,
  userId: string
): Promise<Wallet | null> {
  const rows = await sql`
    SELECT * FROM wallets
    WHERE id = ${walletId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] as any;
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    balance: Number(row.balance),
    currency: row.currency,
    is_primary: row.is_primary,
    fineract_savings_account_id: row.fineract_savings_account_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function updateWallet(
  walletId: string,
  userId: string,
  updates: Partial<Pick<Wallet, 'name' | 'type'>>
): Promise<TransactionResult<Wallet>> {
  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (updates.name) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(updates.name);
    }

    if (updates.type) {
      updateFields.push(`type = $${paramCount++}`);
      updateValues.push(updates.type);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(walletId, userId);

    const queryText = `
      UPDATE wallets
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pool.query(queryText, updateValues);
    const rows = result.rows;

    if (rows.length === 0) {
      return {
        success: false,
        error: 'Wallet not found'
      };
    }

    const row = rows[0] as any;
    return {
      success: true,
      data: {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        type: row.type,
        balance: Number(row.balance),
        currency: row.currency,
        is_primary: row.is_primary,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update wallet'
    };
  }
}

export async function deleteWallet(
  walletId: string,
  userId: string
): Promise<TransactionResult<void>> {
  try {
    // Check balance is zero
    const walletRows = await sql`
      SELECT balance FROM wallets
      WHERE id = ${walletId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (walletRows.length === 0) {
      return {
        success: false,
        error: 'Wallet not found'
      };
    }

    const balance = Number(walletRows[0]?.balance || 0);
    if (balance > 0) {
      return {
        success: false,
        error: 'Cannot delete wallet with non-zero balance'
      };
    }

    // Delete wallet
    const result = await sql`
      DELETE FROM wallets
      WHERE id = ${walletId} AND user_id = ${userId}
    `;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete wallet'
    };
  }
}

export async function getWalletTransactions(
  walletId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  // Verify wallet ownership
  const walletRows = await sql`
    SELECT id FROM wallets
    WHERE id = ${walletId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (walletRows.length === 0) {
    throw new Error('Wallet not found');
  }

  const rows = await sql`
    SELECT * FROM wallet_transactions
    WHERE wallet_id = ${walletId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return rows.map((row: any) => ({
    id: row.id,
    wallet_id: row.wallet_id,
    type: row.type,
    amount: Number(row.amount),
    balance_after: row.balance_after ? Number(row.balance_after) : null,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    reference: row.reference,
    description: row.description,
    created_at: row.created_at
  }));
}
