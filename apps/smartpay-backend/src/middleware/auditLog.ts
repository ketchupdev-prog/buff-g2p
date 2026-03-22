/**
 * Audit Log Middleware: PSD-12 operational logging
 * Location: fintech/smartpay/backend/src/middleware/auditLog.ts
 * Reference: PSD-12, ETA 2019 §24-25 (immutable logs)
 */
import { Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { generateEtaIntegrityHash, logWithAttribution, EtaAttributionRecord } from '../lib/etaAttribution';

export interface AuditLogEntry {
  userId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  method: string;
  path: string;
  toolName?: string;
  action: string;
  input: Record<string, unknown>;
  result: 'success' | 'failure';
  statusCode: number;
  responseTime: number;
  errorMessage?: string;
  isAutomated: boolean;
}

/**
 * Express middleware for audit logging
 */
export function auditLogMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const userId = (req as Request & { userId?: string }).userId ?? null;
    const sessionId = (req as Request & { sessionId?: string }).sessionId ?? null;
    const ipAddress = req.ip ?? req.socket.remoteAddress ?? null;
    const userAgent = req.get('user-agent') ?? null;

    // Capture original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let responseBody: unknown = null;
    let statusCode = 200;
    let result: 'success' | 'failure' = 'success';

    // Override res.json to capture response
    res.json = function (body: unknown): Response {
      responseBody = body;
      statusCode = res.statusCode;
      result = statusCode >= 200 && statusCode < 300 ? 'success' : 'failure';
      return originalJson(body);
    };

    // Override res.send to capture response
    res.send = function (body: unknown): Response {
      responseBody = body;
      statusCode = res.statusCode;
      result = statusCode >= 200 && statusCode < 300 ? 'success' : 'failure';
      return originalSend(body);
    };

    // Log after response is sent
    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;

      try {
        // Extract tool name from request
        const toolName = req.body?.toolName ?? req.query?.toolName ?? extractToolFromPath(req.path);

        // Determine if automated (from AI agent vs. human)
        const isAutomated = req.get('x-copilot-agent') === 'true' || req.path.includes('/api/copilot');

        // Create audit log entry
        const auditEntry: AuditLogEntry = {
          userId,
          sessionId,
          ipAddress,
          userAgent,
          method: req.method,
          path: req.path,
          toolName,
          action: `${req.method} ${req.path}`,
          input: sanitizeInput(req.body),
          result,
          statusCode,
          responseTime,
          errorMessage: result === 'failure' ? extractErrorMessage(responseBody) : undefined,
          isAutomated,
        };

        // Log to copilot_audit_log (immutable, per ETA 2019 §24-25)
        await logAuditEntry(auditEntry);

        // If tool invocation, also log with ETA attribution
        if (toolName && userId) {
          const etaRecord: EtaAttributionRecord = {
            userId,
            toolName,
            action: auditEntry.action,
            input: auditEntry.input,
            result,
            ipAddress: ipAddress ?? undefined,
            sessionId: sessionId ?? undefined,
            isAutomated,
            createdAt: new Date(),
          };

          await logWithAttribution(etaRecord);
        }
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    });

    next();
  };
}

/**
 * Log audit entry to database (immutable)
 */
async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  await pool.query(
    `INSERT INTO copilot_audit_log
       (user_id, session_id, ip_address, user_agent, method, path, tool_name, action,
        input, result, status_code, response_time, error_message, actor_type, is_automated, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
    [
      entry.userId,
      entry.sessionId,
      entry.ipAddress,
      entry.userAgent,
      entry.method,
      entry.path,
      entry.toolName ?? null,
      entry.action,
      JSON.stringify(entry.input),
      entry.result,
      entry.statusCode,
      entry.responseTime,
      entry.errorMessage ?? null,
      entry.isAutomated ? 'automated' : 'user',
      entry.isAutomated,
    ]
  );
}

/**
 * Extract tool name from request path
 */
function extractToolFromPath(path: string): string | undefined {
  const match = path.match(/\/api\/v1\/([^/]+)/);
  return match ? match[1] : undefined;
}

/**
 * Sanitize input to remove sensitive data (PSD-12 data protection)
 */
function sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...input };
  const sensitiveKeys = ['password', 'pin', 'token', 'privateKey', 'secret', 'cvv', 'card_number'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Extract error message from response body
 */
function extractErrorMessage(responseBody: unknown): string | undefined {
  if (typeof responseBody === 'object' && responseBody !== null) {
    const body = responseBody as Record<string, unknown>;
    return (body.error ?? body.message ?? body.errorMessage) as string | undefined;
  }
  return undefined;
}

/**
 * Query audit logs (for compliance reporting)
 */
export async function queryAuditLogs(filters: {
  userId?: string;
  toolName?: string;
  startDate?: Date;
  endDate?: Date;
  result?: 'success' | 'failure';
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.userId) {
    conditions.push(`user_id = $${params.length + 1}`);
    params.push(filters.userId);
  }

  if (filters.toolName) {
    conditions.push(`tool_name = $${params.length + 1}`);
    params.push(filters.toolName);
  }

  if (filters.startDate) {
    conditions.push(`created_at >= $${params.length + 1}`);
    params.push(filters.startDate.toISOString());
  }

  if (filters.endDate) {
    conditions.push(`created_at <= $${params.length + 1}`);
    params.push(filters.endDate.toISOString());
  }

  if (filters.result) {
    conditions.push(`result = $${params.length + 1}`);
    params.push(filters.result);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 100;

  const result = await pool.query(
    `SELECT * FROM copilot_audit_log
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${limit}`,
    params
  );

  return result.rows as AuditLogEntry[];
}
