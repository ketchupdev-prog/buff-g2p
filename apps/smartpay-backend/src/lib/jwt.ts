/**
 * JWT Token Management
 * Following Buffr G2P JWT patterns
 */

import crypto from 'crypto';
import { sql } from './db';
import type { TokenPayload, VerifyResult } from '../types';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

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
    jti: crypto.randomBytes(16).toString('hex'),
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const base64Header = base64UrlEncode(JSON.stringify(header));
  const base64Payload = base64UrlEncode(JSON.stringify(fullPayload));

  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

export function verifyToken(token: string, secret: string): VerifyResult {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signature] = parts;
    
    if (!headerB64 || !payloadB64 || !signature) {
      return { valid: false, error: 'Invalid token parts' };
    }

    // Verify signature
    const signatureInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureInput)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Token verification failed' };
  }
}

export async function generateAccessToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID();
  const token = generateToken(
    { userId, type: 'access', jti },
    JWT_SECRET,
    ACCESS_TOKEN_EXPIRY
  );

  // Store in database
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY * 1000);
  
  await sql`
    INSERT INTO user_sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
  `;

  return token;
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID();
  const token = generateToken(
    { userId, type: 'refresh', jti },
    JWT_REFRESH_SECRET,
    REFRESH_TOKEN_EXPIRY
  );

  // Store in database
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000);
  
  await sql`
    INSERT INTO refresh_tokens (user_id, token, expires_at, revoked)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString()}, false)
  `;

  return token;
}

export async function verifyAccessToken(token: string): Promise<VerifyResult> {
  // Verify signature
  const result = verifyToken(token, JWT_SECRET);
  if (!result.valid || !result.payload) {
    return result;
  }

  // Check token type
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

  return { valid: true, payload: result.payload };
}

export async function verifyRefreshToken(token: string): Promise<VerifyResult> {
  // Verify signature
  const result = verifyToken(token, JWT_REFRESH_SECRET);
  if (!result.valid || !result.payload) {
    return result;
  }

  // Check token type
  if (result.payload.type !== 'refresh') {
    return { valid: false, error: 'Invalid token type' };
  }

  // Check if token is revoked
  const rows = await sql`
    SELECT * FROM refresh_tokens 
    WHERE token = ${token} AND user_id = ${result.payload.userId} AND revoked = false
    LIMIT 1
  `;

  if (rows.length === 0) {
    return { valid: false, error: 'Token revoked or not found' };
  }

  return { valid: true, payload: result.payload };
}

export async function revokeAccessToken(token: string): Promise<void> {
  await sql`
    DELETE FROM user_sessions
    WHERE token = ${token}
  `;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await sql`
    UPDATE refresh_tokens
    SET revoked = true, revoked_at = NOW()
    WHERE token = ${token}
  `;
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await sql`DELETE FROM user_sessions WHERE user_id = ${userId}`;
  await sql`
    UPDATE refresh_tokens
    SET revoked = true, revoked_at = NOW()
    WHERE user_id = ${userId} AND revoked = false
  `;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken?: string;
  error?: string;
}> {
  const verification = await verifyRefreshToken(refreshToken);
  
  if (!verification.valid || !verification.payload) {
    return { error: verification.error || 'Invalid refresh token' };
  }

  const accessToken = await generateAccessToken(verification.payload.userId);
  
  return { accessToken };
}

export async function cleanupExpiredTokens(): Promise<void> {
  await sql`DELETE FROM user_sessions WHERE expires_at < NOW()`;
  await sql`
    UPDATE refresh_tokens
    SET revoked = true, revoked_at = NOW()
    WHERE expires_at < NOW() AND revoked = false
  `;
}
