/**
 * ETA 2019 §32: Attribution and integrity hash for copilot audit log.
 * Location: fintech/smartpay/backend/src/lib/etaAttribution.ts
 */
import crypto from 'crypto';
import { pool } from './db';

export interface EtaAttributionRecord {
  userId: string;
  toolName: string;
  action: string;
  input: Record<string, unknown>;
  result: 'success' | 'failure';
  ipAddress?: string;
  sessionId?: string;
  isAutomated: boolean;
  createdAt: Date;
}

export function generateEtaIntegrityHash(record: EtaAttributionRecord): string {
  const message = [
    record.userId,
    record.toolName,
    record.action,
    record.result,
    record.ipAddress ?? '',
    record.sessionId ?? '',
    record.createdAt.toISOString(),
    JSON.stringify(record.input, Object.keys(record.input).sort()),
  ].join('||');
  return crypto.createHash('sha256').update(message).digest('hex');
}

export async function logWithAttribution(record: EtaAttributionRecord): Promise<void> {
  const hash = generateEtaIntegrityHash(record);
  await pool.query(
    `INSERT INTO copilot_audit_log
       (user_id, tool_name, action, input, result, ip_address, session_id, actor_type, is_automated, integrity_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      record.userId,
      record.toolName,
      record.action,
      JSON.stringify(record.input),
      record.result,
      record.ipAddress ?? null,
      record.sessionId ?? null,
      record.isAutomated ? 'automated' : 'user',
      record.isAutomated,
      hash,
      record.createdAt.toISOString(),
    ]
  );
}
