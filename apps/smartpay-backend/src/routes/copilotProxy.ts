/**
 * Proxy POST /copilot/chat to the external AI service (FastAPI / LangGraph copilot).
 * Coexists with copilotEndpoint.ts: /copilot stays local agent; /copilot/chat forwards upstream.
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /copilot/chat
 * Proxy to AI service copilot endpoint
 */
router.post(
  '/copilot/chat',
  requireAuth,
  strictRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const response = await fetch(`${AI_SERVICE_URL}/api/v1/copilot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { Authorization: authHeader }),
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: 'AI service error',
          details: errorText,
        });
      }

      const data = (await response.json()) as unknown;
      res.json(data);
    } catch (error) {
      console.error('Copilot proxy error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(502).json({
        error: 'Failed to connect to AI service',
        message,
      });
    }
  }
);

export default router;
