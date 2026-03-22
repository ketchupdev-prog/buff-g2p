/**
 * Ensure a user row exists for the given id (from JWT).
 * Used by KYC and profile so first-time users get a row without a separate registration step.
 * When email matches TEST_USER_EMAIL, sets first_name, last_name, national_id from env so the
 * canonical test user (Pendapala Nekulilo) is picked up for KYC and display.
 * Location: backend/src/lib/ensureUser.ts
 */
import { pool } from './db';

export async function ensureUser(userId: string, email?: string): Promise<boolean> {
  // Avoid NOT NULL constraint violations on columns like `phone` by checking existence first.
  // During OTP flows, the user is expected to already exist (created by createUser({ phone })).
  const existing = await pool.query(`SELECT id FROM users WHERE id = $1::uuid LIMIT 1`, [userId]);
  if ((existing.rowCount ?? 0) > 0) {
    // Apply canonical test-user hydration only when we have an email match.
    const testEmail = process.env.TEST_USER_EMAIL;
    if (email && testEmail && email.trim().toLowerCase() === testEmail.trim().toLowerCase()) {
      const firstName = process.env.TEST_USER_FIRST_NAME ?? '';
      const lastName = process.env.TEST_USER_LAST_NAME ?? '';
      const nationalId = process.env.TEST_USER_NATIONAL_ID ?? null;
      const avatarUrl = '/avatars/pendo-avatar.png';
      // Cast bound params so Postgres can infer types (avoids 42P18 on jsonb_build_object + NULL).
      await pool.query(
        `UPDATE users 
           SET first_name = $1::text,
               last_name = $2::text,
               national_id = $3::text,
               metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('avatar_url', $4::text),
               updated_at = NOW()
         WHERE id = $5::uuid`,
        [firstName, lastName, nationalId, avatarUrl, userId]
      );
    }
    return true;
  }

  // Insert minimal user row (provide required columns for NOT NULL constraints).
  // NOTE: phone is NOT NULL; we use '' when the phone is unknown.
  const res = await pool.query(
    `INSERT INTO users (id, phone, first_name, last_name, kyc_tier, kyc_verified, account_status)
     VALUES ($1::uuid, ''::text, '', '', 'basic', false, 'active')
     ON CONFLICT (id) DO NOTHING`,
    [userId]
  );

  const testEmail = process.env.TEST_USER_EMAIL;
  if (email && testEmail && email.trim().toLowerCase() === testEmail.trim().toLowerCase()) {
    const firstName = process.env.TEST_USER_FIRST_NAME ?? '';
    const lastName = process.env.TEST_USER_LAST_NAME ?? '';
    const nationalId = process.env.TEST_USER_NATIONAL_ID ?? null;
    const avatarUrl = '/avatars/pendo-avatar.png';
    await pool.query(
      `UPDATE users 
         SET first_name = $1::text,
             last_name = $2::text,
             national_id = $3::text,
             metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('avatar_url', $4::text),
             updated_at = NOW()
       WHERE id = $5::uuid`,
      [firstName, lastName, nationalId, avatarUrl, userId]
    );
  }

  return (res.rowCount ?? 0) > 0;
}
