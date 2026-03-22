/**
 * User Service - User management operations
 * Following Buffr G2P service patterns
 * 
 * PSD-12 §11 Compliance: Phone/email are encrypted before storage
 */

import { sql, pool, transaction } from '../lib/db';
import type { TransactionResult } from '../types';
import type { User } from '@smartpay/shared-types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  encryptPhone,
  hashPhone,
  decryptPhone,
  encryptEmail,
  hashEmail,
  decryptEmail,
} from '../security/encryption-service';

/** Max wrong PIN attempts before temporary lockout */
const PIN_MAX_FAILED_ATTEMPTS = 5;
/** Lockout duration after max failures (minutes) */
const PIN_LOCKOUT_MINUTES = 15;

export type PinVerificationResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'invalid_pin' | 'no_pin_configured' | 'locked';
      lockedUntil?: string;
    };

export async function getUserById(userId: string): Promise<User | null> {
  const rows = await sql`
    SELECT * FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return rows[0] as User;
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const normalizedPhone = normalizePhoneNumber(phone);
  
  // Generate hash for lookup (PSD-12 §11)
  const phoneHash = hashPhone(normalizedPhone);
  
  // First try encrypted lookup, fallback to plaintext for backward compatibility
  const rows = await sql`
    SELECT * FROM users
    WHERE phone_hash = ${phoneHash} OR phone = ${normalizedPhone}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0] as any;

  // Decrypt PII fields if encrypted
  if (user.phone_encrypted) {
    try {
      user.phone = decryptPhone(user.phone_encrypted);
    } catch (error) {
      console.error('Failed to decrypt phone:', error);
    }
  }

  if (user.email_encrypted) {
    try {
      user.email = decryptEmail(user.email_encrypted);
    } catch (error) {
      console.error('Failed to decrypt email:', error);
    }
  }

  return user as User;
}

export async function createUser(params: {
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}): Promise<TransactionResult<User>> {
  try {
    const { phone, email, first_name, last_name } = params;
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check if user already exists
    const existing = await getUserByPhone(normalizedPhone);
    if (existing) {
      return {
        success: false,
        error: 'User with this phone number already exists'
      };
    }

    // Create full name
    const full_name = [first_name, last_name].filter(Boolean).join(' ');

    // Encrypt PII (PSD-12 §11)
    const phoneEncrypted = encryptPhone(normalizedPhone);
    const phoneHash = hashPhone(normalizedPhone);
    
    let emailEncrypted = null;
    let emailHash = null;
    if (email) {
      emailEncrypted = encryptEmail(email);
      emailHash = hashEmail(email);
    }

    // Insert user with encrypted PII
    const rows = await sql`
      INSERT INTO users (
        phone, phone_encrypted, phone_hash,
        email, email_encrypted, email_hash,
        first_name, last_name, full_name, wallet_status
      )
      VALUES (
        ${normalizedPhone}, ${phoneEncrypted}, ${phoneHash},
        ${email || null}, ${emailEncrypted}, ${emailHash},
        ${first_name || null}, 
        ${last_name || null}, 
        ${full_name || null},
        'active'
      )
      RETURNING *
    `;

    const user = rows[0] as User;

    // Create default main wallet
    await sql`
      INSERT INTO wallets (user_id, name, type, balance, currency, is_primary)
      VALUES (${user.id}, 'Main Wallet', 'main', 0, 'NAD', true)
    `;

    // Decrypt for return (user object should have plaintext for app use)
    if (user.phone_encrypted) {
      (user as any).phone = decryptPhone((user as any).phone_encrypted);
    }
    if ((user as any).email_encrypted) {
      (user as any).email = decryptEmail((user as any).email_encrypted);
    }

    return {
      success: true,
      data: user
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'first_name' | 'last_name' | 'email' | 'photo_url'>>
): Promise<TransactionResult<User>> {
  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (updates.first_name !== undefined) {
      updateFields.push(`first_name = $${paramCount++}`);
      updateValues.push(updates.first_name);
    }

    if (updates.last_name !== undefined) {
      updateFields.push(`last_name = $${paramCount++}`);
      updateValues.push(updates.last_name);
    }

    if (updates.email !== undefined) {
      // Encrypt email (PSD-12 §11)
      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(updates.email);
      
      if (updates.email) {
        updateFields.push(`email_encrypted = $${paramCount++}`);
        updateValues.push(encryptEmail(updates.email));
        updateFields.push(`email_hash = $${paramCount++}`);
        updateValues.push(hashEmail(updates.email));
      } else {
        updateFields.push(`email_encrypted = NULL, email_hash = NULL`);
      }
    }

    if (updates.photo_url !== undefined) {
      updateFields.push(`photo_url = $${paramCount++}`);
      updateValues.push(updates.photo_url);
    }

    // Update full_name if first or last name changed
    if (updates.first_name !== undefined || updates.last_name !== undefined) {
      updateFields.push(`full_name = CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))`);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId);

    const queryText = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount++}
      RETURNING *
    `;

    const result = await pool.query(queryText, updateValues);
    const rows = result.rows;

    if (rows.length === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const user = rows[0] as any;

    // Decrypt PII for return
    if (user.phone_encrypted) {
      try {
        user.phone = decryptPhone(user.phone_encrypted);
      } catch (error) {
        console.error('Failed to decrypt phone:', error);
      }
    }
    
    if (user.email_encrypted) {
      try {
        user.email = decryptEmail(user.email_encrypted);
      } catch (error) {
        console.error('Failed to decrypt email:', error);
      }
    }

    return {
      success: true,
      data: user as User
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user profile'
    };
  }
}

export async function setUserPIN(
  userId: string,
  pin: string,
  options?: { allowReplace?: boolean }
): Promise<TransactionResult<void>> {
  try {
    // Validate PIN (should be 4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return {
        success: false,
        error: 'PIN must be 4-6 digits'
      };
    }

    const existing = await sql`
      SELECT pin_hash FROM users WHERE id = ${userId} LIMIT 1
    `;
    const row = existing[0] as { pin_hash?: string | null } | undefined;
    if (row?.pin_hash && !options?.allowReplace) {
      return {
        success: false,
        error:
          'PIN already set; use PATCH /api/v1/users/pin with current_pin and new_pin to change it'
      };
    }

    // Generate salt and hash
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(pin + salt, 10);

    await sql`
      UPDATE users
      SET
        pin_hash = ${hash},
        pin_salt = ${salt},
        pin_failed_attempts = 0,
        pin_locked_until = NULL,
        updated_at = NOW()
      WHERE id = ${userId}
    `;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set PIN'
    };
  }
}

/**
 * Verify PIN for the user. Uses a DB transaction with row lock, increments
 * failed attempts on failure, and applies lockout after PIN_MAX_FAILED_ATTEMPTS.
 */
export async function verifyUserPIN(
  userId: string,
  pin: string
): Promise<PinVerificationResult> {
  try {
    return await transaction(async (client) => {
      const sel = await client.query<{
        pin_hash: string | null;
        pin_salt: string | null;
        pin_failed_attempts: number | null;
        pin_locked_until: Date | null;
      }>(
        `SELECT pin_hash, pin_salt, pin_failed_attempts, pin_locked_until
         FROM users WHERE id = $1 FOR UPDATE`,
        [userId]
      );

      if (sel.rowCount === 0) {
        return { ok: false, reason: 'no_pin_configured' };
      }

      const row = sel.rows[0];
      if (!row) {
        return { ok: false, reason: 'no_pin_configured' };
      }

      const lockedUntil = row.pin_locked_until ? new Date(row.pin_locked_until) : null;
      if (lockedUntil && lockedUntil.getTime() > Date.now()) {
        return {
          ok: false,
          reason: 'locked',
          lockedUntil: lockedUntil.toISOString()
        };
      }

      if (!row.pin_hash || !row.pin_salt) {
        return { ok: false, reason: 'no_pin_configured' };
      }

      const isValid = await bcrypt.compare(pin + row.pin_salt, row.pin_hash);

      if (isValid) {
        await client.query(
          `UPDATE users
           SET pin_failed_attempts = 0, pin_locked_until = NULL, updated_at = NOW()
           WHERE id = $1`,
          [userId]
        );
        return { ok: true };
      }

      const upd = await client.query<{ pin_failed_attempts: number; pin_locked_until: Date | null }>(
        `UPDATE users SET
           pin_failed_attempts = users.pin_failed_attempts + 1,
           pin_locked_until = CASE
             WHEN users.pin_failed_attempts + 1 >= $2
             THEN NOW() + ($3::integer * INTERVAL '1 minute')
             ELSE users.pin_locked_until
           END,
           updated_at = NOW()
         WHERE id = $1
         RETURNING pin_failed_attempts, pin_locked_until`,
        [userId, PIN_MAX_FAILED_ATTEMPTS, PIN_LOCKOUT_MINUTES]
      );

      const after = upd.rows[0];
      const newLock = after?.pin_locked_until ? new Date(after.pin_locked_until) : null;
      const justLocked = newLock !== null && newLock.getTime() > Date.now();

      return {
        ok: false,
        reason: 'invalid_pin',
        ...(justLocked ? { lockedUntil: newLock!.toISOString() } : {})
      };
    });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return { ok: false, reason: 'invalid_pin' };
  }
}

/**
 * Change PIN after verifying the current PIN (same lockout rules as verify).
 */
export async function updateUserPIN(
  userId: string,
  currentPin: string,
  newPin: string
): Promise<TransactionResult<void>> {
  const check = await verifyUserPIN(userId, currentPin);
  if (!check.ok) {
    if (check.reason === 'locked') {
      return {
        success: false,
        error: check.lockedUntil
          ? `PIN temporarily locked until ${check.lockedUntil}`
          : 'PIN temporarily locked due to failed attempts'
      };
    }
    if (check.reason === 'no_pin_configured') {
      return { success: false, error: 'No PIN set; use POST /api/v1/users/pin first' };
    }
    return { success: false, error: 'Current PIN is incorrect' };
  }

  return setUserPIN(userId, newPin, { allowReplace: true });
}

export async function updateProofOfLife(
  userId: string
): Promise<TransactionResult<void>> {
  try {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setMonth(dueDate.getMonth() + 3); // 3 months from now

    await sql`
      UPDATE users
      SET 
        last_proof_of_life = ${now.toISOString()},
        proof_of_life_due_date = ${dueDate.toISOString()},
        updated_at = NOW()
      WHERE id = ${userId}
    `;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update proof of life'
    };
  }
}

export async function getUsersRequiringProofOfLife(): Promise<User[]> {
  const now = new Date().toISOString();
  
  const rows = await sql`
    SELECT * FROM users
    WHERE wallet_status = 'active'
      AND (
        proof_of_life_due_date IS NULL
        OR proof_of_life_due_date <= ${now}
      )
    ORDER BY proof_of_life_due_date ASC NULLS FIRST
    LIMIT 100
  `;

  return rows as User[];
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // Namibia country code: +264
  if (digits.startsWith("264")) {
    return `+${digits}`;
  }
  
  if (digits.startsWith("0")) {
    return `+264${digits.slice(1)}`;
  }
  
  // Assume 8-digit Namibia number
  if (digits.length === 8) {
    return `+264${digits}`;
  }
  
  return `+${digits}`;
}
