/**
 * Invite System API Routes
 * Location: backend/src/routes/mobile/invite.ts
 * 
 * Handles user invite codes for referral and deep linking
 * Features:
 * - Validate invite codes
 * - Track invite clicks for analytics
 * - Record referral attribution on sign-up
 * - Generate shareable invite links
 * 
 * Security: Mix of authenticated and public endpoints
 * Rate Limiting: Applied to prevent abuse
 */
import { Router, Response } from 'express';
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../../middleware/requireAuth';
import { moderateRateLimiter, lenientRateLimiter } from '../../middleware/rateLimiter';
import { pool, transaction } from '../../lib/db';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const validateInviteCodeSchema = z.object({
  code: z.string()
    .min(6, 'Invite code must be at least 6 characters')
    .max(10, 'Invite code cannot exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Invite code must be uppercase alphanumeric')
});

const registerInviteSchema = z.object({
  inviteCode: z.string()
    .min(6, 'Invite code must be at least 6 characters')
    .max(10, 'Invite code cannot exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Invite code must be uppercase alphanumeric'),
  deviceInfo: z.record(z.any()).optional(),
  ipAddress: z.string().optional()
});

// ============================================================================
// GET /api/v1/invite/validate
// Validate an invite code (public endpoint)
// ============================================================================

router.get(
  '/invite/validate',
  optionalAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: { 
          code: 'INVALID_REQUEST', 
          message: 'Invite code is required as query parameter' 
        }
      });
      return;
    }

    try {
      // Validate code format
      const validated = validateInviteCodeSchema.parse({ code: code.toUpperCase() });

      const result = await transaction(async (client) => {
        // Look up user by invite code
        const userResult = await client.query(
          `SELECT 
            id,
            first_name,
            last_name,
            phone,
            photo_url,
            invite_code,
            created_at
           FROM users
           WHERE invite_code = $1 AND wallet_status = 'active'`,
          [validated.code]
        );

        if (userResult.rows.length === 0) {
          throw new Error('INVALID_CODE');
        }

        const inviter = userResult.rows[0];

        // Track invite click for analytics
        const ipAddress = req.ipAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || null;
        const referrer = req.headers['referer'] || req.headers['referrer'] || null;

        await client.query(
          `INSERT INTO invite_clicks 
            (invite_code, inviter_user_id, ip_address, user_agent, referrer, clicked_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [validated.code, inviter.id, ipAddress, userAgent, referrer]
        );

        // Get invite stats
        const statsResult = await client.query(
          `SELECT 
            total_clicks,
            total_registrations,
            conversion_rate
           FROM invite_stats
           WHERE user_id = $1`,
          [inviter.id]
        );

        const stats = statsResult.rows[0] || {
          total_clicks: 0,
          total_registrations: 0,
          conversion_rate: 0
        };

        return {
          valid: true,
          inviteCode: validated.code,
          inviter: {
            id: inviter.id,
            name: `${inviter.first_name} ${inviter.last_name}`,
            firstName: inviter.first_name,
            photoUrl: inviter.photo_url
          },
          stats: {
            totalClicks: parseInt(stats.total_clicks) + 1,
            totalRegistrations: parseInt(stats.total_registrations),
            conversionRate: parseFloat(stats.conversion_rate || 0)
          }
        };
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid invite code format',
            details: error.errors
          }
        });
        return;
      }

      if (error instanceof Error && error.message === 'INVALID_CODE') {
        res.status(404).json({
          success: false,
          error: { 
            code: 'INVALID_CODE', 
            message: 'Invite code not found or inactive' 
          }
        });
        return;
      }

      console.error('[GET /api/v1/invite/validate] Error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to validate invite code' }
      });
    }
  }
);

// ============================================================================
// POST /api/v1/invite/register
// Record invite attribution when user signs up (authenticated)
// ============================================================================

router.post(
  '/invite/register',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      });
      return;
    }

    try {
      const validated = registerInviteSchema.parse(req.body);

      const result = await transaction(async (client) => {
        // Check if user already has an inviter
        const userResult = await client.query(
          `SELECT invited_by FROM users WHERE id = $1`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('USER_NOT_FOUND');
        }

        const user = userResult.rows[0];

        if (user.invited_by) {
          throw new Error('ALREADY_ATTRIBUTED');
        }

        // Look up inviter by code
        const inviterResult = await client.query(
          `SELECT id, first_name, last_name FROM users WHERE invite_code = $1`,
          [validated.inviteCode.toUpperCase()]
        );

        if (inviterResult.rows.length === 0) {
          throw new Error('INVALID_CODE');
        }

        const inviter = inviterResult.rows[0];

        // Cannot invite yourself
        if (inviter.id === userId) {
          throw new Error('SELF_INVITE');
        }

        // Update user with inviter attribution
        await client.query(
          `UPDATE users SET invited_by = $1, updated_at = NOW() WHERE id = $2`,
          [inviter.id, userId]
        );

        // Find the most recent invite click for this user/code
        const ipAddress = validated.ipAddress || req.ipAddress || 'unknown';
        
        await client.query(
          `UPDATE invite_clicks 
           SET registered = true, 
               registered_user_id = $1, 
               registered_at = NOW()
           WHERE invite_code = $2 
             AND ip_address = $3 
             AND registered = false
           ORDER BY clicked_at DESC
           LIMIT 1`,
          [userId, validated.inviteCode.toUpperCase(), ipAddress]
        );

        // If no matching click found, create one
        const clickResult = await client.query(
          `SELECT id FROM invite_clicks 
           WHERE registered_user_id = $1`,
          [userId]
        );

        if (clickResult.rows.length === 0) {
          await client.query(
            `INSERT INTO invite_clicks 
              (invite_code, inviter_user_id, registered, registered_user_id, 
               registered_at, ip_address, device_info, clicked_at)
             VALUES ($1, $2, true, $3, NOW(), $4, $5, NOW())`,
            [
              validated.inviteCode.toUpperCase(),
              inviter.id,
              userId,
              ipAddress,
              JSON.stringify(validated.deviceInfo || {})
            ]
          );
        }

        return {
          success: true,
          invitedBy: {
            id: inviter.id,
            name: `${inviter.first_name} ${inviter.last_name}`
          },
          inviteCode: validated.inviteCode.toUpperCase()
        };
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Invite attribution recorded successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        });
        return;
      }

      if (error instanceof Error) {
        const errorMap: Record<string, { code: string; status: number; message: string }> = {
          'USER_NOT_FOUND': { 
            code: 'NOT_FOUND', 
            status: 404, 
            message: 'User not found' 
          },
          'ALREADY_ATTRIBUTED': { 
            code: 'CONFLICT', 
            status: 409, 
            message: 'User already has an inviter attributed' 
          },
          'INVALID_CODE': { 
            code: 'NOT_FOUND', 
            status: 404, 
            message: 'Invalid invite code' 
          },
          'SELF_INVITE': { 
            code: 'BAD_REQUEST', 
            status: 400, 
            message: 'Cannot use your own invite code' 
          }
        };

        const errorInfo = errorMap[error.message];
        if (errorInfo) {
          res.status(errorInfo.status).json({
            success: false,
            error: { code: errorInfo.code, message: errorInfo.message }
          });
          return;
        }
      }

      console.error('[POST /api/v1/invite/register] Error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to record invite attribution' }
      });
    }
  }
);

// ============================================================================
// GET /api/v1/invite/me
// Get current user's invite code and stats
// ============================================================================

router.get(
  '/invite/me',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT 
          u.id,
          u.invite_code,
          u.first_name,
          u.last_name,
          COALESCE(s.total_clicks, 0) as total_clicks,
          COALESCE(s.total_registrations, 0) as total_registrations,
          COALESCE(s.conversion_rate, 0) as conversion_rate,
          s.last_click_at,
          s.last_registration_at
         FROM users u
         LEFT JOIN invite_stats s ON s.user_id = u.id
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' }
        });
        return;
      }

      const row = result.rows[0];

      // Generate shareable invite link (adjust base URL as needed)
      const baseUrl = process.env.APP_BASE_URL || 'https://smartpay.app';
      const inviteLink = `${baseUrl}/invite/${row.invite_code}`;

      res.status(200).json({
        success: true,
        data: {
          inviteCode: row.invite_code,
          inviteLink,
          userName: `${row.first_name} ${row.last_name}`,
          stats: {
            totalClicks: parseInt(row.total_clicks),
            totalRegistrations: parseInt(row.total_registrations),
            conversionRate: parseFloat(row.conversion_rate),
            lastClickAt: row.last_click_at,
            lastRegistrationAt: row.last_registration_at
          }
        }
      });
    } catch (error) {
      console.error('[GET /api/v1/invite/me] Error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch invite information' }
      });
    }
  }
);

// ============================================================================
// GET /api/v1/invite/referrals
// Get list of users referred by current user
// ============================================================================

router.get(
  '/invite/referrals',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      });
      return;
    }

    try {
      const result = await pool.query(
        `SELECT 
          id,
          first_name,
          last_name,
          phone,
          photo_url,
          created_at
         FROM users
         WHERE invited_by = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      const referrals = result.rows.map((row: any) => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`,
        phone: row.phone,
        photoUrl: row.photo_url,
        joinedAt: row.created_at
      }));

      res.status(200).json({
        success: true,
        data: {
          referrals,
          count: referrals.length
        }
      });
    } catch (error) {
      console.error('[GET /api/v1/invite/referrals] Error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch referrals' }
      });
    }
  }
);

// ============================================================================
// GET /api/v1/invite/leaderboard
// Get top inviters (public leaderboard)
// ============================================================================

router.get(
  '/invite/leaderboard',
  optionalAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const maxLimit = Math.min(limit, 100);

      const result = await pool.query(
        `SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.photo_url,
          s.total_registrations,
          s.conversion_rate
         FROM invite_stats s
         JOIN users u ON u.id = s.user_id
         WHERE u.wallet_status = 'active'
         ORDER BY s.total_registrations DESC, s.conversion_rate DESC
         LIMIT $1`,
        [maxLimit]
      );

      const leaderboard = result.rows.map((row: any, index: number) => ({
        rank: index + 1,
        userId: row.id,
        name: `${row.first_name} ${row.last_name}`,
        photoUrl: row.photo_url,
        totalReferrals: parseInt(row.total_registrations),
        conversionRate: parseFloat(row.conversion_rate)
      }));

      res.status(200).json({
        success: true,
        data: {
          leaderboard,
          count: leaderboard.length
        }
      });
    } catch (error) {
      console.error('[GET /api/v1/invite/leaderboard] Error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch leaderboard' }
      });
    }
  }
);

export default router;
