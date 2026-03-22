/**
 * Mobile User Operations Routes
 * Location: fintech/smartpay/backend/src/routes/mobile/users.ts
 * User lookup, payment requests, and related operations
 * 
 * PSD-12 §11 Compliance: Uses encrypted phone/email with hash-based lookups
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { lenientRateLimiter, moderateRateLimiter } from '../../middleware/rateLimiter';
import { pool, transaction } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { hashPhone, decryptPhone, decryptEmail } from '../../security/encryption-service';

const router = Router();

/**
 * GET /api/v1/users/lookup
 * Look up a user by SmartPay ID or phone number
 * Used for recipient selection in send money, payment requests, etc.
 */
router.get(
  '/users/lookup',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const { smartpayId, phone } = req.query;

    try {
      if (!smartpayId && !phone) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Either smartpayId or phone parameter is required'
        });
        return;
      }

      let query: string;
      let params: any[];

      if (smartpayId) {
        query = `
          SELECT id, phone, phone_encrypted, email, email_encrypted, 
                 first_name, last_name, photo_url
          FROM users
          WHERE smartpay_id = $1 AND status = 'active'
        `;
        params = [smartpayId];
      } else {
        // Use hash for phone lookup (PSD-12 §11)
        const phoneHash = hashPhone(phone as string);
        query = `
          SELECT id, phone, phone_encrypted, email, email_encrypted,
                 first_name, last_name, photo_url
          FROM users
          WHERE (phone_hash = $1 OR phone = $2) AND status = 'active'
        `;
        params = [phoneHash, phone];
      }

      const result = await pool.query(query, params);

      if (result.rowCount === 0) {
        res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
        return;
      }

      const user = result.rows[0];

      // Decrypt PII if encrypted (PSD-12 §11)
      let userPhone = user.phone;
      if (user.phone_encrypted) {
        try {
          userPhone = decryptPhone(user.phone_encrypted);
        } catch (error) {
          console.error('Failed to decrypt phone for user lookup:', error);
        }
      }

      res.status(200).json({
        user: {
          id: user.id,
          smartpayId: smartpayId || null,
          phone: userPhone,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`,
          photoUrl: user.photo_url
        }
      });
    } catch (error) {
      console.error('[GET /api/v1/users/lookup]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to lookup user'
      });
    }
  }
);

/**
 * POST /api/v1/payment-requests
 * Create a payment request (for receiving money)
 */
router.post(
  '/payment-requests',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, currency, note, expiresIn } = req.body;

    try {
      if (!amount || amount <= 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Valid amount is required'
        });
        return;
      }

      const result = await transaction(async (client) => {
        const requestId = uuidv4();
        const qrString = `smartpay://pay?requestId=${requestId}`;
        const deepLink = `smartpay://payment-request/${requestId}`;
        
        // Default expiry: 24 hours
        const expiryHours = expiresIn || 24;
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        await client.query(
          `INSERT INTO payment_requests 
            (id, requester_user_id, amount, currency, note, status, 
             qr_string, deep_link, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            requestId,
            userId,
            amount,
            currency || 'NAD',
            note || null,
            'pending',
            qrString,
            deepLink,
            expiresAt
          ]
        );

        return {
          requestId,
          amount,
          currency: currency || 'NAD',
          note,
          status: 'pending',
          qrString,
          deepLink,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString()
        };
      });

      res.status(201).json({
        success: true,
        paymentRequest: result
      });
    } catch (error) {
      console.error('[POST /api/v1/payment-requests]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create payment request'
      });
    }
  }
);

/**
 * GET /api/v1/payment-requests/:id
 * Get payment request details
 */
router.get(
  '/payment-requests/:id',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `SELECT 
          pr.id, pr.requester_user_id, pr.amount, pr.currency, pr.note,
          pr.status, pr.qr_string, pr.deep_link, pr.expires_at, pr.created_at,
          pr.paid_at, pr.paid_by_user_id, pr.transaction_id,
          u.first_name, u.last_name, u.phone, u.photo_url
         FROM payment_requests pr
         JOIN users u ON pr.requester_user_id = u.id
         WHERE pr.id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Payment request not found'
        });
        return;
      }

      const pr = result.rows[0];

      res.status(200).json({
        paymentRequest: {
          id: pr.id,
          requester: {
            userId: pr.requester_user_id,
            firstName: pr.first_name,
            lastName: pr.last_name,
            phone: pr.phone,
            photoUrl: pr.photo_url
          },
          amount: parseFloat(pr.amount),
          currency: pr.currency,
          note: pr.note,
          status: pr.status,
          qrString: pr.qr_string,
          deepLink: pr.deep_link,
          expiresAt: pr.expires_at,
          createdAt: pr.created_at,
          paidAt: pr.paid_at,
          paidByUserId: pr.paid_by_user_id,
          transactionId: pr.transaction_id
        }
      });
    } catch (error) {
      console.error('[GET /api/v1/payment-requests/:id]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch payment request'
      });
    }
  }
);

/**
 * POST /api/v1/payment-requests/:id/pay
 * Pay a payment request
 */
router.post(
  '/payment-requests/:id/pay',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { walletId } = req.body;

    try {
      if (!walletId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'walletId is required'
        });
        return;
      }

      const result = await transaction(async (client) => {
        // Get payment request
        const prResult = await client.query(
          `SELECT * FROM payment_requests WHERE id = $1 FOR UPDATE`,
          [id]
        );

        if (prResult.rowCount === 0) {
          throw new Error('Payment request not found');
        }

        const pr = prResult.rows[0];

        if (pr.status !== 'pending') {
          throw new Error('Payment request is not pending');
        }

        if (new Date(pr.expires_at) < new Date()) {
          throw new Error('Payment request has expired');
        }

        if (pr.requester_user_id === userId) {
          throw new Error('Cannot pay your own payment request');
        }

        // Verify wallet
        const walletResult = await client.query(
          `SELECT * FROM wallets WHERE id = $1 AND user_id = $2 AND status = 'active'`,
          [walletId, userId]
        );

        if (walletResult.rowCount === 0) {
          throw new Error('Wallet not found or inactive');
        }

        const wallet = walletResult.rows[0];
        const amount = parseFloat(pr.amount);

        if (parseFloat(wallet.balance) < amount) {
          throw new Error('Insufficient balance');
        }

        // Create transaction
        const transactionId = uuidv4();
        await client.query(
          `INSERT INTO transactions 
            (id, type, status, amount, fee, currency, source_wallet_id, 
             source_user_id, destination_user_id, description, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            transactionId,
            'payment_request',
            'completed',
            amount,
            0,
            pr.currency,
            walletId,
            userId,
            pr.requester_user_id,
            `Payment request - ${pr.note || 'No description'}`,
            JSON.stringify({ paymentRequestId: id })
          ]
        );

        // Debit payer's wallet
        await client.query(
          `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
          [amount, walletId]
        );

        // Credit requester's primary wallet
        await client.query(
          `UPDATE wallets 
           SET balance = balance + $1, updated_at = NOW() 
           WHERE user_id = $2 AND is_primary = true`,
          [amount, pr.requester_user_id]
        );

        // Update payment request
        await client.query(
          `UPDATE payment_requests 
           SET status = 'paid', paid_at = NOW(), paid_by_user_id = $1, transaction_id = $2
           WHERE id = $3`,
          [userId, transactionId, id]
        );

        return {
          transactionId,
          amount,
          currency: pr.currency,
          status: 'completed'
        };
      });

      res.status(200).json({
        success: true,
        payment: result
      });
    } catch (error) {
      console.error('[POST /api/v1/payment-requests/:id/pay]', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({
        error: 'Payment Failed',
        message: errorMessage
      });
    }
  }
);

/**
 * POST /api/v1/payment-requests/:id/cancel
 * Cancel a payment request
 */
router.post(
  '/payment-requests/:id/cancel',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const result = await pool.query(
        `UPDATE payment_requests 
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND requester_user_id = $2 AND status = 'pending'
         RETURNING id, status`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Payment request not found or cannot be cancelled'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Payment request cancelled successfully'
      });
    } catch (error) {
      console.error('[POST /api/v1/payment-requests/:id/cancel]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to cancel payment request'
      });
    }
  }
);

export default router;
