/**
 * GET /api/v1/transactions – List transactions for the authenticated user.
 * Returns both sent and received, ordered by created_at DESC.
 * GET /api/v1/transactions/summary – Aggregates for the last 30 days.
 * Location: backend/src/routes/mobile/transactions.ts
 */
import { Router, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/requireAuth';
import { pool } from '../../lib/db';

/** Single row from type-frequency query */
export interface TransactionSummaryTypeBucket {
  type: string;
  count: number;
}

/** Aggregated transaction stats returned by GET /api/v1/transactions/summary */
export interface TransactionSummary {
  /** Rolling window in days (currently fixed at 30) */
  periodDays: number;
  totalCount: number;
  totalAmount: number;
  byStatus: {
    completed: number;
    pending: number;
    failed: number;
  };
  /** Null when there are no transactions in the period */
  averageAmount: number | null;
  /** Most frequent transaction types, highest count first */
  topTypes: TransactionSummaryTypeBucket[];
}

/** JSON body shape for GET /api/v1/transactions/summary */
export interface TransactionSummaryApiResponse {
  summary: TransactionSummary;
}

const router = Router();

const SUMMARY_PERIOD_DAYS = 30;

router.get(
  '/transactions',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
      const result = await pool.query(
        `SELECT id, type, status, amount, fee, currency,
                source_wallet_id, destination_wallet_id, source_user_id, destination_user_id,
                description, metadata, created_at
         FROM transactions
         WHERE source_user_id = $1 OR destination_user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const transactions = (result.rows || []).map((row: any) => {
        const isOut = row.source_user_id === userId;
        const amount = parseFloat(row.amount ?? 0);
        return {
          id: row.id,
          type: row.type,
          status: row.status,
          amount: isOut ? -amount : amount,
          fee: parseFloat(row.fee ?? 0),
          currency: row.currency || 'NAD',
          description: row.description || row.type,
          created_at: row.created_at,
          direction: isOut ? ('out' as const) : ('in' as const),
        };
      });

      res.status(200).json({ transactions });
    } catch (error) {
      console.error('[GET /api/v1/transactions]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch transactions',
      });
    }
  }
);

/**
 * GET /api/v1/transactions/summary – Aggregated stats for the authenticated user (last 30 days).
 * Must be registered before /api/v1/transactions/:id so "summary" is not captured as an id.
 */
router.get(
  '/transactions/summary',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    try {
      const aggResult = await pool.query<{
        total_count: string;
        total_amount: string | null;
        completed_count: string;
        pending_count: string;
        failed_count: string;
        avg_amount: string | null;
      }>(
        `SELECT
           COUNT(*)::text AS total_count,
           SUM(amount::numeric)::text AS total_amount,
           COUNT(*) FILTER (WHERE status = 'completed')::text AS completed_count,
           COUNT(*) FILTER (WHERE status = 'pending')::text AS pending_count,
           COUNT(*) FILTER (WHERE status = 'failed')::text AS failed_count,
           AVG(amount::numeric)::text AS avg_amount
         FROM transactions
         WHERE (source_user_id = $1 OR destination_user_id = $1)
           AND created_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      );

      const typesResult = await pool.query<{ type: string; type_count: string }>(
        `SELECT type, COUNT(*)::text AS type_count
         FROM transactions
         WHERE (source_user_id = $1 OR destination_user_id = $1)
           AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY type
         ORDER BY COUNT(*) DESC, type ASC
         LIMIT 10`,
        [userId]
      );

      const row = aggResult.rows[0];
      const totalCount = parseInt(row?.total_count ?? '0', 10);
      const totalAmount = parseFloat(row?.total_amount ?? '0') || 0;
      const summary: TransactionSummary = {
        periodDays: SUMMARY_PERIOD_DAYS,
        totalCount,
        totalAmount,
        byStatus: {
          completed: parseInt(row?.completed_count ?? '0', 10),
          pending: parseInt(row?.pending_count ?? '0', 10),
          failed: parseInt(row?.failed_count ?? '0', 10),
        },
        averageAmount:
          totalCount > 0 && row?.avg_amount != null
            ? parseFloat(row.avg_amount)
            : null,
        topTypes: (typesResult.rows || []).map((r) => ({
          type: r.type ?? 'unknown',
          count: parseInt(r.type_count ?? '0', 10),
        })),
      };

      res.status(200).json({ summary });
    } catch (error) {
      console.error('[GET /api/v1/transactions/summary]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch transaction summary',
      });
    }
  }
);

/**
 * GET /api/v1/transactions/:id – Get single transaction details
 * Returns full transaction details with authorization check
 */
router.get(
  '/transactions/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT id, type, status, amount, fee, currency,
                source_wallet_id, destination_wallet_id, 
                source_user_id, destination_user_id,
                description, metadata, created_at
         FROM transactions
         WHERE id = $1 AND (source_user_id = $2 OR destination_user_id = $2)`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ 
          error: 'Not Found', 
          message: 'Transaction not found' 
        });
        return;
      }

      const row = result.rows[0];
      const isOut = row.source_user_id === userId;
      const amount = parseFloat(row.amount ?? 0);

      const transaction = {
        id: row.id,
        type: row.type,
        status: row.status,
        amount,
        fee: parseFloat(row.fee ?? 0),
        currency: row.currency || 'NAD',
        sourceWalletId: row.source_wallet_id,
        destinationWalletId: row.destination_wallet_id,
        sourceUserId: row.source_user_id,
        destinationUserId: row.destination_user_id,
        description: row.description || row.type,
        metadata: row.metadata,
        createdAt: row.created_at,
        direction: isOut ? ('out' as const) : ('in' as const),
      };

      res.status(200).json({ transaction });
    } catch (error) {
      console.error('[GET /api/v1/transactions/:id]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch transaction details'
      });
    }
  }
);

export default router;
