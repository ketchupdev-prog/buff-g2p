/**
 * Wallet Management Routes – Smartpay Mobile Backend
 * Handles wallet CRUD operations for authenticated users.
 * Location: backend/src/routes/mobile/wallets.ts
 * 
 * Security: All routes protected by requireAuth middleware
 * Wallet ownership enforced via userId from JWT token
 */
import { Router, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/requireAuth';
import { pool } from '../../lib/db';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createWalletSchema = z.object({
  name: z.string().min(2).max(50),
  type: z.enum(['main', 'savings', 'bills', 'emergency', 'travel', 'shopping', 'custom']),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  currency: z.string().default('NAD'),
  description: z.string().max(200).optional(),
});

const updateWalletSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).optional(),
});

/**
 * GET /api/v1/wallets
 * List all wallets for authenticated user
 */
router.get(
  '/wallets',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT id, name, balance, currency, frozen, wallet_type, icon, color, description, created_at, updated_at
         FROM wallets
         WHERE user_id = $1 AND status != 'archived'
         ORDER BY created_at ASC`,
        [userId]
      );

      const wallets = (result.rows || []).map((row: any) => ({
        id: row.id,
        name: row.name || (row.currency === 'NAD' ? 'Main' : row.currency),
        balance: parseFloat(row.balance ?? 0),
        type: row.wallet_type || 'main',
        currency: row.currency || 'NAD',
        status: row.frozen ? 'frozen' : 'active',
        icon: row.icon || 'wallet-outline',
        color: row.color || '#2563eb',
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      res.status(200).json(wallets);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const transientDbFailure = /timeout|connection terminated|fetch_failed|econnreset|could not connect/i.test(message);

      if (transientDbFailure) {
        // For first-time users and transient DB issues, keep response shape stable with empty wallets.
        console.warn('[GET /api/v1/wallets] transient DB error; returning empty wallets list:', message);
        res.status(200).json([]);
        return;
      }

      console.error('[GET /api/v1/wallets]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch wallets',
      });
    }
  }
);

/**
 * GET /api/v1/wallets/:id
 * Get specific wallet details
 */
router.get(
  '/wallets/:id',
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
        `SELECT id, name, balance, currency, frozen, wallet_type, icon, color, description, created_at, updated_at
         FROM wallets
         WHERE id = $1 AND user_id = $2 AND status != 'archived'`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Not Found', message: 'Wallet not found' });
        return;
      }

      const row = result.rows[0];
      const wallet = {
        id: row.id,
        name: row.name || 'Main',
        balance: parseFloat(row.balance ?? 0),
        type: row.wallet_type || 'main',
        currency: row.currency || 'NAD',
        status: row.frozen ? 'frozen' : 'active',
        icon: row.icon || 'wallet-outline',
        color: row.color || '#2563eb',
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      res.status(200).json({ wallet });
    } catch (error) {
      console.error('[GET /api/v1/wallets/:id]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch wallet',
      });
    }
  }
);

/**
 * POST /api/v1/wallets
 * Create a new wallet
 */
router.post(
  '/wallets',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    try {
      // Validate input
      const validated = createWalletSchema.parse(req.body);

      // Check wallet limit (max 10 wallets per user)
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM wallets WHERE user_id = $1 AND status != 'archived'`,
        [userId]
      );
      
      const walletCount = parseInt(countResult.rows[0]?.count || '0');
      if (walletCount >= 10) {
        res.status(400).json({
          error: 'Wallet Limit Reached',
          message: 'You can have a maximum of 10 active wallets',
        });
        return;
      }

      // Create wallet
      const result = await pool.query(
        `INSERT INTO wallets (user_id, name, balance, currency, wallet_type, icon, color, description, status, frozen)
         VALUES ($1, $2, 0, $3, $4, $5, $6, $7, 'active', false)
         RETURNING id, name, balance, currency, wallet_type, icon, color, description, created_at, updated_at`,
        [userId, validated.name, validated.currency, validated.type, validated.icon, validated.color, validated.description]
      );

      const row = result.rows[0];
      const wallet = {
        id: row.id,
        name: row.name,
        balance: 0,
        type: row.wallet_type,
        currency: row.currency,
        status: 'active',
        icon: row.icon,
        color: row.color,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      res.status(201).json({ wallet, message: 'Wallet created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid wallet data',
          details: error.errors,
        });
        return;
      }

      console.error('[POST /api/v1/wallets]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create wallet',
      });
    }
  }
);

/**
 * PATCH /api/v1/wallets/:id
 * Update wallet details (name, icon, color, description)
 */
router.patch(
  '/wallets/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    try {
      // Validate input
      const validated = updateWalletSchema.parse(req.body);

      // Check if wallet exists and belongs to user
      const checkResult = await pool.query(
        `SELECT id, frozen, status FROM wallets WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Not Found', message: 'Wallet not found' });
        return;
      }

      const wallet = checkResult.rows[0];
      if (wallet.status === 'archived') {
        res.status(400).json({ error: 'Bad Request', message: 'Cannot update archived wallet' });
        return;
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (validated.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(validated.name);
      }
      if (validated.icon !== undefined) {
        updates.push(`icon = $${paramCount++}`);
        values.push(validated.icon);
      }
      if (validated.color !== undefined) {
        updates.push(`color = $${paramCount++}`);
        values.push(validated.color);
      }
      if (validated.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(validated.description);
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Bad Request', message: 'No updates provided' });
        return;
      }

      updates.push(`updated_at = NOW()`);
      values.push(id, userId);

      // Execute update
      const result = await pool.query(
        `UPDATE wallets 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
         RETURNING id, name, balance, currency, wallet_type, icon, color, description, frozen, created_at, updated_at`,
        values
      );

      const row = result.rows[0];
      const updatedWallet = {
        id: row.id,
        name: row.name,
        balance: parseFloat(row.balance ?? 0),
        type: row.wallet_type,
        currency: row.currency,
        status: row.frozen ? 'frozen' : 'active',
        icon: row.icon,
        color: row.color,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      res.status(200).json({ wallet: updatedWallet, message: 'Wallet updated successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid update data',
          details: error.errors,
        });
        return;
      }

      console.error('[PATCH /api/v1/wallets/:id]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update wallet',
      });
    }
  }
);

/**
 * DELETE /api/v1/wallets/:id
 * Archive a wallet (soft delete)
 * Wallet must have zero balance
 */
router.delete(
  '/wallets/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    try {
      // Check if wallet exists and belongs to user
      const checkResult = await pool.query(
        `SELECT balance, wallet_type, status FROM wallets WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: 'Not Found', message: 'Wallet not found' });
        return;
      }

      const wallet = checkResult.rows[0];

      // Cannot archive main wallet
      if (wallet.wallet_type === 'main') {
        res.status(400).json({ error: 'Bad Request', message: 'Cannot archive main wallet' });
        return;
      }

      // Must have zero balance
      const balance = parseFloat(wallet.balance ?? '0');
      if (balance !== 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Wallet must have zero balance to be archived',
          details: { currentBalance: balance },
        });
        return;
      }

      // Already archived
      if (wallet.status === 'archived') {
        res.status(400).json({ error: 'Bad Request', message: 'Wallet is already archived' });
        return;
      }

      // Archive wallet (soft delete)
      await pool.query(
        `UPDATE wallets SET status = 'archived', updated_at = NOW() WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      res.status(200).json({
        success: true,
        message: 'Wallet archived successfully',
      });
    } catch (error) {
      console.error('[DELETE /api/v1/wallets/:id]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to archive wallet',
      });
    }
  }
);

export default router;
