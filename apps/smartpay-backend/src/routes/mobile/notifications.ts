/**
 * Notifications API Routes — thin handlers; SQL lives in `lib/userNotificationsRepository.ts`.
 * Location: fintech/apps/smartpay-backend/src/routes/mobile/notifications.ts
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { lenientRateLimiter, moderateRateLimiter } from '../../middleware/rateLimiter';
import { v4 as uuidv4 } from 'uuid';
import * as UserNotifications from '../../lib/userNotificationsRepository';

const router = Router();

/**
 * GET /api/v1/notifications
 * Response: { notifications, unreadCount, total }
 * - `total` = rows matching list filter (all or unreadOnly), for pagination
 * - `unreadCount` = unread for user (badge), independent of unreadOnly
 */
router.get(
  '/notifications',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    try {
      const { rows, totalMatchingFilter, unreadCount } =
        await UserNotifications.listNotificationsForUser(userId, {
          limit,
          offset,
          unreadOnly,
        });

      res.status(200).json({
        notifications: rows,
        unreadCount,
        total: totalMatchingFilter,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const transientDbFailure = /timeout|connection terminated|fetch_failed|econnreset|could not connect/i.test(message);

      if (transientDbFailure) {
        // First-load UX should degrade gracefully to an empty inbox.
        console.warn('[GET /api/v1/notifications] transient DB error; returning empty inbox:', message);
        res.status(200).json({
          notifications: [],
          unreadCount: 0,
          total: 0,
          meta: {
            degraded: true,
            reason: 'temporary_database_unavailable',
          },
        });
        return;
      }

      console.error('[GET /api/v1/notifications]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch notifications',
      });
    }
  }
);

router.patch(
  '/notifications/:id/read',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const row = await UserNotifications.markNotificationRead(userId, id);

      if (!row) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Notification not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        notification: row,
      });
    } catch (error) {
      console.error('[PATCH /api/v1/notifications/:id/read]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to mark notification as read',
      });
    }
  }
);

router.post(
  '/notifications/mark-all-read',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const markedCount = await UserNotifications.markAllNotificationsRead(userId);

      res.status(200).json({
        success: true,
        markedCount,
        message: `Marked ${markedCount} notification(s) as read`,
      });
    } catch (error) {
      console.error('[POST /api/v1/notifications/mark-all-read]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to mark all notifications as read',
      });
    }
  }
);

router.delete(
  '/notifications/:id',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const deleted = await UserNotifications.deleteNotificationForUser(userId, id);

      if (!deleted) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Notification not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      console.error('[DELETE /api/v1/notifications/:id]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete notification',
      });
    }
  }
);

/**
 * POST /api/v1/notifications
 * Creates a row for the authenticated user (dev/testing; services should use repository directly).
 */
router.post(
  '/notifications',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const { type, title, message, metadata } = req.body as {
      type?: string;
      title?: string;
      message?: string;
      metadata?: Record<string, unknown>;
    };
    const userId = req.userId!;

    try {
      if (!type || !title || !message) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'type, title, and message are required',
        });
        return;
      }

      const id = uuidv4();
      const notification = await UserNotifications.insertNotificationForUser({
        id,
        userId,
        type,
        title,
        message,
        metadata: metadata ?? null,
      });

      res.status(201).json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error('[POST /api/v1/notifications]', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create notification',
      });
    }
  }
);

export default router;
