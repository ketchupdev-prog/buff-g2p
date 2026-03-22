/**
 * Copilot Security Middleware: Tool-specific rate limiting
 * Location: fintech/smartpay/backend/src/middleware/copilotSecurity.ts
 * Reference: PRD §6.2, PSD-12 operational logging
 */
import { Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';

export interface RateLimitConfig {
  toolName: string;
  maxRequests: number;
  windowMinutes: number;
  requiresAuth: boolean;
}

/**
 * Tool-specific rate limits (per PSD-12 safety requirements)
 */
const TOOL_RATE_LIMITS: Record<string, RateLimitConfig> = {
  send_money: { toolName: 'send_money', maxRequests: 10, windowMinutes: 60, requiresAuth: true },
  cash_out: { toolName: 'cash_out', maxRequests: 5, windowMinutes: 60, requiresAuth: true },
  generate_cashout_qr: { toolName: 'generate_cashout_qr', maxRequests: 3, windowMinutes: 30, requiresAuth: true },
  check_balance: { toolName: 'check_balance', maxRequests: 20, windowMinutes: 60, requiresAuth: true },
  transaction_history: { toolName: 'transaction_history', maxRequests: 10, windowMinutes: 60, requiresAuth: true },
  find_nearest_agent: { toolName: 'find_nearest_agent', maxRequests: 10, windowMinutes: 60, requiresAuth: false },
  ussd_instructions: { toolName: 'ussd_instructions', maxRequests: 20, windowMinutes: 60, requiresAuth: false },
  search_knowledge: { toolName: 'search_knowledge', maxRequests: 30, windowMinutes: 60, requiresAuth: false },
};

/**
 * Default rate limit for unspecified tools
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  toolName: 'default',
  maxRequests: 20,
  windowMinutes: 60,
  requiresAuth: false,
};

/**
 * Check rate limit for a tool invocation
 */
async function checkRateLimit(
  userId: string | null,
  toolName: string,
  ipAddress: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const config = TOOL_RATE_LIMITS[toolName] ?? DEFAULT_RATE_LIMIT;
  const identifier = userId ?? ipAddress;
  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

  // Count requests in window
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM rate_limit_log
     WHERE (user_id = $1 OR ip_address = $2)
       AND tool_name = $3
       AND created_at > $4`,
    [userId, ipAddress, toolName, windowStart.toISOString()]
  );

  const count = Number((result.rows[0] as { count: string }).count);
  const remaining = Math.max(0, config.maxRequests - count);
  const resetAt = new Date(Date.now() + config.windowMinutes * 60 * 1000);

  const allowed = count < config.maxRequests;

  // Record request
  await pool.query(
    `INSERT INTO rate_limit_log (user_id, ip_address, tool_name, allowed, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [userId ?? null, ipAddress, toolName, allowed]
  );

  return { allowed, remaining, resetAt };
}

/**
 * Express middleware for copilot tool rate limiting
 */
export function copilotSecurityMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as Request & { userId?: string }).userId ?? null;
      const toolName = req.body?.toolName ?? req.query?.toolName ?? 'unknown';
      const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';

      // Check authentication requirement
      const config = TOOL_RATE_LIMITS[toolName as string] ?? DEFAULT_RATE_LIMIT;
      if (config.requiresAuth && !userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: `The tool "${toolName}" requires authentication. Please log in.`,
        });
        return;
      }

      // Check rate limit
      const rateLimitResult = await checkRateLimit(userId, toolName as string, ipAddress as string);

      if (!rateLimitResult.allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `You have exceeded the rate limit for "${toolName}". Please try again later.`,
          remaining: 0,
          resetAt: rateLimitResult.resetAt.toISOString(),
        });
        return;
      }

      // Add rate limit info to response headers
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

      next();
    } catch (error) {
      console.error('Copilot security middleware error:', error);
      res.status(500).json({ error: 'Security check failed' });
    }
  };
}

/**
 * Check if IP is blocked (for suspicious activity)
 */
async function isIPBlocked(ipAddress: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM blocked_ips
     WHERE ip_address = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [ipAddress]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Block IP address (for suspicious activity)
 */
export async function blockIPAddress(
  ipAddress: string,
  reason: string,
  durationMinutes?: number
): Promise<void> {
  const expiresAt = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60 * 1000)
    : null;

  await pool.query(
    `INSERT INTO blocked_ips (ip_address, reason, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (ip_address) DO UPDATE
     SET reason = $2, expires_at = $3, created_at = NOW()`,
    [ipAddress, reason, expiresAt?.toISOString() ?? null]
  );
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  userId: string | null,
  ipAddress: string,
  activity: string,
  details: Record<string, unknown>
): Promise<void> {
  await pool.query(
    `INSERT INTO suspicious_activity_log
       (user_id, ip_address, activity, details, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [userId ?? null, ipAddress, activity, JSON.stringify(details)]
  );
}
