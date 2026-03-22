/**
 * Copilot HTTP/SSE Endpoint
 * Location: fintech/smartpay/backend/src/routes/copilotEndpoint.ts
 * Reference: PRD §4.6.1, CopilotKit integration
 *
 * SECURITY: All copilot endpoints protected with requireAuth middleware
 */
import { Router, Request, Response } from 'express';
import { runSmartpayAgent, AgentMessage } from '../agent/smartpayAgent';
import { logWithAttribution } from '../lib/etaAttribution';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { createAgentContext, dataLayerHealthCheck } from '../lib/agentContext';

const router = Router();

export interface CopilotRequest {
  message: string;
  messageHistory?: AgentMessage[];
  stream?: boolean;
}

/**
 * POST /copilot
 * Main copilot endpoint (mounted at /api/v1 and legacy /api)
 *
 * SECURITY: Protected with requireAuth middleware and strict rate limiting
 */
router.post('/copilot', requireAuth, strictRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, messageHistory = [], stream = false } = req.body as CopilotRequest;

    const userId = req.userId!;
    const sessionId = req.sessionId;
    const ipAddress = req.ipAddress ?? req.ip ?? req.socket.remoteAddress;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    let agentContext;
    try {
      agentContext = await createAgentContext(userId, sessionId, {
        ipAddress: ipAddress ?? undefined,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
      });
    } catch (contextError) {
      console.error('Failed to create agent context:', contextError);
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Data layer initialization failed. Please try again.',
      });
    }

    await logWithAttribution({
      userId,
      toolName: 'copilot',
      action: 'chat_message',
      input: { message, messageHistoryLength: messageHistory.length },
      result: 'success',
      ipAddress: ipAddress ?? undefined,
      sessionId: sessionId ?? undefined,
      isAutomated: true,
      createdAt: new Date(),
    });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      res.write('data: {"type":"connected"}\n\n');

      const result = await runSmartpayAgent({
        userPrompt: message,
        messageHistory,
        userId,
        sessionId,
        stream: true,
        lanceDB: agentContext.lanceDB,
        duckDB: agentContext.duckDB,
      });

      const words = result.response.split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: word + ' ' })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      res.write(`data: ${JSON.stringify({ type: 'done', messageHistory: result.messageHistory })}\n\n`);
      res.end();

      return;
    }

    const result = await runSmartpayAgent({
      userPrompt: message,
      messageHistory,
      userId,
      sessionId,
      stream: false,
      lanceDB: agentContext.lanceDB,
      duckDB: agentContext.duckDB,
    });

    res.json({
      response: result.response,
      toolCalls: result.toolCalls,
      messageHistory: result.messageHistory,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Copilot endpoint error:', error);

    await logWithAttribution({
      userId: (req as AuthenticatedRequest).userId!,
      toolName: 'copilot',
      action: 'chat_message',
      input: { message: req.body.message },
      result: 'failure',
      isAutomated: true,
      createdAt: new Date(),
    });

    res.status(500).json({
      error: 'Copilot request failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /copilot/health
 * Health check for copilot service and data layer
 */
router.get('/copilot/health', async (_req: Request, res: Response) => {
  try {
    const health = await dataLayerHealthCheck();

    res.json({
      status: health.overall ? 'healthy' : 'degraded',
      service: 'smartpay-copilot',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dataLayer: {
        postgres: health.postgres ? 'connected' : 'disconnected',
        lancedb: health.lancedb ? 'connected' : 'disconnected',
        duckdb: health.duckdb ? 'connected' : 'disconnected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'smartpay-copilot',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /copilot/tools
 * List available copilot tools
 */
router.post('/copilot/tools', async (_req: Request, res: Response) => {
  try {
    const { SMARTPAY_TOOLS } = await import('../agent/smartpayAgent');

    const tools = SMARTPAY_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    res.json({ tools, count: tools.length });
  } catch (error) {
    console.error('Error listing tools:', error);
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

export default router;
