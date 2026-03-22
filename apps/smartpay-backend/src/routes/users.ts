/**
 * User Management Routes
 * Following Buffr G2P user patterns
 * Mounted at /api/v1/users (see routes/mobile/index.ts)
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import {
  getUserById,
  updateUserProfile,
  setUserPIN,
  verifyUserPIN,
  updateUserPIN,
  updateProofOfLife
} from '../services/userService';
import { validateRequired, jsonError } from '../lib/security';
import { pinSetRateLimiter, pinVerifyRateLimiter } from '../middleware/rateLimiter';

const router = Router();

function logPinEvent(
  req: AuthenticatedRequest,
  event: 'pin_set' | 'pin_update' | 'pin_verify',
  outcome: 'success' | 'failure',
  detail: Record<string, unknown> = {}
): void {
  console.log(
    JSON.stringify({
      event,
      outcome,
      userId: req.userId,
      ip: req.ipAddress ?? req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
      ...detail
    })
  );
}

/**
 * GET /api/v1/users/profile
 * Get current user profile
 */
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return jsonError(res, 401, 'Authentication required');
    }

    const user = await getUserById(req.userId);

    if (!user) {
      return jsonError(res, 404, 'User not found');
    }

    res.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      photo_url: user.photo_url,
      wallet_status: user.wallet_status,
      last_proof_of_life: user.last_proof_of_life,
      proof_of_life_due_date: user.proof_of_life_due_date,
      created_at: user.created_at
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(res, 500, message);
  }
});

/**
 * PATCH /api/v1/users/profile
 * Update user profile
 */
router.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return jsonError(res, 401, 'Authentication required');
    }

    const { first_name, last_name, email, photo_url } = req.body;

    const result = await updateUserProfile(req.userId, {
      first_name,
      last_name,
      email,
      photo_url
    });

    if (!result.success || !result.data) {
      return jsonError(res, 400, result.error || 'Failed to update profile');
    }

    res.json({
      success: true,
      user: {
        id: result.data.id,
        phone: result.data.phone,
        email: result.data.email,
        first_name: result.data.first_name,
        last_name: result.data.last_name,
        full_name: result.data.full_name,
        photo_url: result.data.photo_url,
        updated_at: result.data.updated_at
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(res, 500, message);
  }
});

/**
 * POST /api/v1/users/pin
 * Set user PIN (first time only; use PATCH to change)
 */
router.post(
  '/pin',
  requireAuth,
  pinSetRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        return jsonError(res, 401, 'Authentication required');
      }

      const validation = validateRequired(req.body, ['pin']);
      if (!validation.valid) {
        return jsonError(res, 400, `Missing field: ${validation.missing}`);
      }

      const { pin } = req.body;

      const result = await setUserPIN(req.userId, pin);
      if (!result.success) {
        logPinEvent(req, 'pin_set', 'failure', { error: result.error });
        return jsonError(res, 400, result.error || 'Failed to set PIN');
      }

      logPinEvent(req, 'pin_set', 'success');
      res.json({
        success: true,
        message: 'PIN set successfully'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return jsonError(res, 500, message);
    }
  }
);

/**
 * PATCH /api/v1/users/pin
 * Update PIN (requires current_pin + new_pin)
 */
router.patch(
  '/pin',
  requireAuth,
  pinSetRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        return jsonError(res, 401, 'Authentication required');
      }

      const validation = validateRequired(req.body, ['current_pin', 'new_pin']);
      if (!validation.valid) {
        return jsonError(res, 400, `Missing field: ${validation.missing}`);
      }

      const { current_pin, new_pin } = req.body;
      const result = await updateUserPIN(req.userId, current_pin, new_pin);

      if (!result.success) {
        logPinEvent(req, 'pin_update', 'failure', { error: result.error });
        return jsonError(res, 400, result.error || 'Failed to update PIN');
      }

      logPinEvent(req, 'pin_update', 'success');
      res.json({
        success: true,
        message: 'PIN updated successfully'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return jsonError(res, 500, message);
    }
  }
);

/**
 * POST /api/v1/users/verify-pin
 * Verify user PIN
 */
router.post(
  '/verify-pin',
  requireAuth,
  pinVerifyRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        return jsonError(res, 401, 'Authentication required');
      }

      const validation = validateRequired(req.body, ['pin']);
      if (!validation.valid) {
        return jsonError(res, 400, `Missing field: ${validation.missing}`);
      }

      const { pin } = req.body;

      const outcome = await verifyUserPIN(req.userId, pin);

      if (!outcome.ok) {
        logPinEvent(req, 'pin_verify', 'failure', {
          reason: outcome.reason,
          lockedUntil: outcome.lockedUntil
        });

        if (outcome.reason === 'locked') {
          return res.status(423).json({
            success: false,
            message: 'PIN verification temporarily locked due to failed attempts',
            locked_until: outcome.lockedUntil
          });
        }

        if (outcome.reason === 'no_pin_configured') {
          return res.status(400).json({
            success: false,
            message: 'No PIN configured for this account'
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Invalid PIN',
          ...(outcome.lockedUntil ? { locked_until: outcome.lockedUntil } : {})
        });
      }

      logPinEvent(req, 'pin_verify', 'success');
      res.json({
        success: true,
        message: 'PIN verified successfully'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return jsonError(res, 500, message);
    }
  }
);

/**
 * POST /api/v1/users/proof-of-life
 * Update proof of life
 */
router.post('/proof-of-life', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return jsonError(res, 401, 'Authentication required');
    }

    const result = await updateProofOfLife(req.userId);

    if (!result.success) {
      return jsonError(res, 400, result.error || 'Failed to update proof of life');
    }

    res.json({
      success: true,
      message: 'Proof of life updated successfully'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(res, 500, message);
  }
});

export default router;
