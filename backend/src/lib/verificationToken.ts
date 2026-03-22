/**
 * Buffr G2P Backend – 2FA verification tokens.
 *
 * Issues short-lived tokens for redeem, cash-out, send after PIN/biometric.
 * PRD §9.4: verify-2fa returns { verification_token, expires_at }.
 * Location: backend/src/lib/verificationToken.ts
 */

import { sql } from "./db.js";
import { randomBytes } from "crypto";

const TTL_MINUTES = parseInt(process.env.VERIFICATION_TOKEN_TTL_MINUTES ?? "15", 10);

export interface IssueResult {
  success: boolean;
  verification_token?: string;
  expires_at?: string;
  error?: string;
}

/**
 * Issue a verification token for the user after 2FA (PIN or biometric).
 * Stores in verification_tokens table; returns token and expiry.
 */
export async function issueVerificationToken(userId: string): Promise<IssueResult> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  try {
    await sql`
      INSERT INTO verification_tokens (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt})
    `;
    return {
      success: true,
      verification_token: token,
      expires_at: expiresAt.toISOString(),
    };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "42P01" || code === "42703") {
      return { success: false, error: "Verification tokens table not available" };
    }
    throw err;
  }
}

/**
 * Validate a verification token: must exist and not be expired.
 * Returns userId if valid, null otherwise.
 */
export async function validateVerificationToken(token: string): Promise<string | null> {
  if (!token || typeof token !== "string" || token.length < 16) {
    return null;
  }
  try {
    const rows = await sql`
      SELECT user_id FROM verification_tokens
      WHERE token = ${token} AND expires_at > now()
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return (rows[0] as { user_id: string }).user_id;
  } catch {
    return null;
  }
}
