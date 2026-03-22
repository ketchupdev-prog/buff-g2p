/**
 * PSD-6: Participant authorization check for NPS services.
 * Location: fintech/smartpay/backend/src/lib/participantAuth.ts
 */
import { pool } from './db';

export async function isServiceAuthorized(service: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM nps_participant_status
     WHERE participant_id = 'SMARTPAY-001'
       AND authorization_status = 'authorized'
       AND $1 = ANY(authorized_services)
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [service]
  );
  return (res.rowCount ?? 0) > 0;
}
