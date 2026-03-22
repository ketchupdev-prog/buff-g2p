/**
 * Voucher Service - Voucher redemption operations
 * Following Buffr G2P service patterns
 */

import { sql } from '../lib/db';
import type { Voucher, TransactionResult } from '../types';
import { redeemVoucherAtomic } from '../lib/transactions';

export async function getUserVouchers(
  userId: string,
  status?: 'available' | 'redeemed' | 'expired'
): Promise<Voucher[]> {
  let rows;
  
  if (status) {
    rows = await sql`
      SELECT * FROM vouchers
      WHERE user_id = ${userId} AND status = ${status}
      ORDER BY expires_at ASC
    `;
  } else {
    rows = await sql`
      SELECT * FROM vouchers
      WHERE user_id = ${userId}
      ORDER BY expires_at ASC
    `;
  }

  return rows.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    type: row.type,
    programme: row.programme,
    expires_at: row.expires_at,
    external_id: row.external_id,
    created_at: row.created_at
  }));
}

export async function getVoucherById(
  voucherId: string,
  userId: string
): Promise<Voucher | null> {
  const rows = await sql`
    SELECT * FROM vouchers
    WHERE id = ${voucherId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] as any;
  return {
    id: row.id,
    user_id: row.user_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    type: row.type,
    programme: row.programme,
    expires_at: row.expires_at,
    external_id: row.external_id,
    created_at: row.created_at
  };
}

export async function redeemVoucher(params: {
  userId: string;
  voucherId: string;
  method: 'wallet' | 'nampost' | 'smartpay';
  walletId?: string;
}): Promise<TransactionResult<{ walletBalance: number }>> {
  try {
    const { userId, voucherId, method, walletId } = params;

    // Validate voucher exists and is redeemable
    const voucher = await getVoucherById(voucherId, userId);
    
    if (!voucher) {
      return {
        success: false,
        error: 'Voucher not found'
      };
    }

    if (voucher.status === 'redeemed') {
      return {
        success: false,
        error: 'Voucher already redeemed'
      };
    }

    if (voucher.status === 'expired' || new Date(voucher.expires_at) < new Date()) {
      return {
        success: false,
        error: 'Voucher expired'
      };
    }

    // Handle wallet redemption
    if (method === 'wallet') {
      if (!walletId) {
        return {
          success: false,
          error: 'Wallet ID required for wallet redemption'
        };
      }

      // Use atomic transaction
      const result = await redeemVoucherAtomic({
        userId,
        voucherId,
        walletId
      });

      return result;
    }

    // Handle other redemption methods (nampost, smartpay)
    // For now, just mark as redeemed
    await sql`
      UPDATE vouchers
      SET status = 'redeemed'
      WHERE id = ${voucherId}
    `;

    await sql`
      INSERT INTO voucher_redemptions (voucher_id, user_id, method, amount_credited)
      VALUES (${voucherId}, ${userId}, ${method}, ${voucher.amount})
    `;

    return {
      success: true,
      data: { walletBalance: 0 }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to redeem voucher'
    };
  }
}

export async function createVoucher(params: {
  userId: string;
  amount: number;
  programme: string;
  type?: string;
  expiresAt: Date;
  externalId?: string;
}): Promise<TransactionResult<Voucher>> {
  try {
    const { userId, amount, programme, type, expiresAt, externalId } = params;

    const rows = await sql`
      INSERT INTO vouchers (
        user_id, amount, currency, status, programme, type, expires_at, external_id
      )
      VALUES (
        ${userId}, 
        ${amount}, 
        'NAD', 
        'available', 
        ${programme}, 
        ${type || null}, 
        ${expiresAt.toISOString()},
        ${externalId || null}
      )
      RETURNING *
    `;

    const voucher = rows[0] as any;

    return {
      success: true,
      data: {
        id: voucher.id,
        user_id: voucher.user_id,
        amount: Number(voucher.amount),
        currency: voucher.currency,
        status: voucher.status,
        type: voucher.type,
        programme: voucher.programme,
        expires_at: voucher.expires_at,
        external_id: voucher.external_id,
        created_at: voucher.created_at
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create voucher'
    };
  }
}

export async function getVoucherStats(userId: string): Promise<{
  total_vouchers: number;
  available_vouchers: number;
  redeemed_vouchers: number;
  total_amount: number;
  redeemed_amount: number;
}> {
  const rows = await sql`
    SELECT 
      COUNT(*) as total_vouchers,
      COUNT(*) FILTER (WHERE status = 'available') as available_vouchers,
      COUNT(*) FILTER (WHERE status = 'redeemed') as redeemed_vouchers,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'redeemed'), 0) as redeemed_amount
    FROM vouchers
    WHERE user_id = ${userId}
  `;

  const stats = rows[0] as any;

  return {
    total_vouchers: Number(stats.total_vouchers),
    available_vouchers: Number(stats.available_vouchers),
    redeemed_vouchers: Number(stats.redeemed_vouchers),
    total_amount: Number(stats.total_amount),
    redeemed_amount: Number(stats.redeemed_amount)
  };
}

export async function expireOldVouchers(): Promise<number> {
  const now = new Date().toISOString();
  
  await sql`
    UPDATE vouchers
    SET status = 'expired'
    WHERE status = 'available'
      AND expires_at <= ${now}
  `;

  // Note: sql tagged template doesn't return count, just empty array for UPDATE
  return 0;
}
