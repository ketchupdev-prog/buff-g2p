/**
 * JWT Signature Verification
 * 
 * Purpose: Production-grade JWT verification with signature validation
 * Location: backend/src/lib/jwtVerification.ts
 * 
 * Implements: KNOWN_LIMITATIONS.md L3 - JWT Verification Enhancement
 * 
 * Features:
 * - Signature verification using HMAC-SHA256
 * - Expiration validation
 * - Token rotation support
 * - Refresh token mechanism
 * - Type-safe token payloads
 */

import * as crypto from 'crypto';
import { sql } from './db.js';

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh' | 'payment';
  jti?: string; // JWT ID for token rotation
}

export interface VerifyResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

/**
 * Generate a new JWT token with signature
 */
export function generateToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  secret: string,
  expirySeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expirySeconds,
    jti: crypto.randomBytes(16).toString('hex'), // Unique token ID for rotation
  };

  // Create header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // Base64URL encode
  const base64Header = base64UrlEncode(JSON.stringify(header));
  const base64Payload = base64UrlEncode(JSON.stringify(fullPayload));

  // Create signature
  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Verify JWT token signature and expiration
 */
export function verifyToken(token: string, secret: string): VerifyResult {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const signatureInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureInput)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload;

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    // Verify issued at (not in future)
    if (payload.iat && payload.iat > now + 60) {
      // Allow 60s clock skew
      return { valid: false, error: 'Token issued in future' };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Verification failed' };
  }
}

/**
 * Verify access token with database check
 */
export async function verifyAccessToken(token: string): Promise<VerifyResult> {
  // First verify signature
  const result = verifyToken(token, process.env.JWT_SECRET!);
  if (!result.valid || !result.payload) {
    return result;
  }

  // Check if token type is correct
  if (result.payload.type !== 'access') {
    return { valid: false, error: 'Invalid token type' };
  }

  // Check if token is revoked in database
  const rows = await sql`
    SELECT * FROM user_sessions 
    WHERE token = ${token} AND user_id = ${result.payload.userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return { valid: false, error: 'Token revoked or session not found' };
  }

  const session = rows[0];
  if (new Date(session.expires_at) < new Date()) {
    return { valid: false, error: 'Session expired' };
  }

  return { valid: true, payload: result.payload };
}

/**
 * Verify refresh token with database check
 */
export async function verifyRefreshToken(token: string): Promise<VerifyResult> {
  const result = verifyToken(token, process.env.JWT_REFRESH_SECRET!);
  if (!result.valid || !result.payload) {
    return result;
  }

  if (result.payload.type !== 'refresh') {
    return { valid: false, error: 'Invalid token type' };
  }

  // Check if refresh token exists and is not used
  const rows = await sql`
    SELECT * FROM refresh_tokens 
    WHERE token = ${token} 
    AND user_id = ${result.payload.userId}
    AND revoked = false
    LIMIT 1
  `;

  if (rows.length === 0) {
    return { valid: false, error: 'Refresh token invalid or revoked' };
  }

  return { valid: true, payload: result.payload };
}

/**
 * Rotate refresh token (invalidate old, create new)
 */
export async function rotateRefreshToken(
  oldToken: string,
  userId: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const verification = await verifyRefreshToken(oldToken);
  if (!verification.valid || !verification.payload) {
    return null;
  }

  // Revoke old refresh token
  await sql`
    UPDATE refresh_tokens 
    SET revoked = true, revoked_at = NOW()
    WHERE token = ${oldToken}
  `;

  // Get user email
  const userRows = await sql`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
  if (userRows.length === 0) return null;

  const email = userRows[0].email;

  // Generate new tokens
  const accessToken = generateToken(
    { userId, email, type: 'access' },
    process.env.JWT_SECRET!,
    parseExpiry(process.env.JWT_ACCESS_EXPIRY || '15m')
  );

  const refreshToken = generateToken(
    { userId, email, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    parseExpiry(process.env.JWT_REFRESH_EXPIRY || '7d')
  );

  // Store new refresh token
  const refreshExpiry = new Date(Date.now() + parseExpiry(process.env.JWT_REFRESH_EXPIRY || '7d') * 1000);
  await sql`
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${refreshToken}, ${refreshExpiry})
  `;

  // Update session with new access token
  const accessExpiry = new Date(Date.now() + parseExpiry(process.env.JWT_ACCESS_EXPIRY || '15m') * 1000);
  await sql`
    INSERT INTO user_sessions (user_id, token, expires_at)
    VALUES (${userId}, ${accessToken}, ${accessExpiry})
    ON CONFLICT (user_id) 
    DO UPDATE SET token = ${accessToken}, expires_at = ${accessExpiry}, last_active_at = NOW()
  `;

  return { accessToken, refreshToken };
}

/**
 * Revoke all tokens for a user (logout)
 */
export async function revokeAllTokens(userId: string): Promise<void> {
  await sql`DELETE FROM user_sessions WHERE user_id = ${userId}`;
  await sql`UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE user_id = ${userId} AND revoked = false`;
}

/**
 * Parse expiry string (e.g., "15m", "7d") to seconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // Default 15 minutes

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}

/**
 * Base64URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64url');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

/**
 * Migration: Create refresh_tokens table if not exists
 * Run this as part of server startup
 */
export async function ensureRefreshTokensTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      revoked BOOLEAN DEFAULT false,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      INDEX idx_refresh_tokens_user_id (user_id),
      INDEX idx_refresh_tokens_token (token)
    )
  `;
}
