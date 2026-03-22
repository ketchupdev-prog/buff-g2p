/**
 * JWT Authentication Middleware for Smartpay Backend
 * Verifies JWT tokens (Supabase or legacy) and attaches user ID to request
 * Location: backend/src/middleware/requireAuth.ts
 *
 * AUTHENTICATION: JWT only (Supabase or custom JWT with userId).
 * SECURITY: JWT_SECRET required for signing/verifying tokens.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifySupabaseBearerToken } from '../services/auth/supabase-verify';
import { verifyAccessToken as verifyAccessTokenFromDB } from '../lib/jwt';

// Lazy evaluation to ensure dotenv loads first
function getJWTSecret(): string {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error(
      'CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set. ' +
      'Generate a strong random value (e.g., `openssl rand -base64 64`) and set it in .env'
    );
  }
  return JWT_SECRET;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  body: any;
  params: any;
  query: any;
  headers: any;
}

interface JWTPayload {
  userId: string;
  sub?: string;
  email?: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware to require valid JWT authentication
 * Supports Supabase and legacy JWT tokens (backward compatibility)
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // First path: verify as Supabase access token.
    const supabaseCheck = await verifySupabaseBearerToken(token);
    if (supabaseCheck.valid) {
      req.userId = supabaseCheck.principal.sub;
      req.userEmail = supabaseCheck.principal.email;
      req.sessionId = generateSessionId();
      req.ipAddress = extractIpAddress(req);
      req.deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;
      next();
      return;
    }

    // Fallback path: legacy/custom JWT verification with revocation check.
    try {
      const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload & { sub?: string; email?: string };

      const userId = decoded.userId ?? decoded.sub;
      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token payload (missing userId or sub)',
        });
        return;
      }

      // CRITICAL SECURITY FIX: Check if token is revoked in user_sessions table
      // This prevents logout tokens from being reused
      const dbVerification = await verifyAccessTokenFromDB(token);
      if (!dbVerification.valid) {
        console.warn(
          `[Auth] Token revocation check failed for user ${userId}:`,
          dbVerification.error
        );
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has been revoked or session not found',
        });
        return;
      }

      req.userId = String(userId);
      req.userEmail = decoded.email ? String(decoded.email) : undefined;
      req.sessionId = decoded.sessionId || generateSessionId();
      req.ipAddress = extractIpAddress(req);
      req.deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;

      next();
      return;
    } catch (legacyError) {
      console.error(
        '[Auth] Token verification failed (supabase + legacy):',
        legacyError instanceof Error ? legacyError.message : 'Unknown error'
      );

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }
  } catch (error) {
    console.error('[Auth] Authentication error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 * Uses JWT only (Supabase or custom payload with userId/sub).
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.ipAddress = extractIpAddress(req);
      next();
      return;
    }

    const token = authHeader.substring(7);

    const supabaseCheck = await verifySupabaseBearerToken(token);
    if (supabaseCheck.valid) {
      req.userId = supabaseCheck.principal.sub;
      req.userEmail = supabaseCheck.principal.email;
      req.sessionId = generateSessionId();
      req.ipAddress = extractIpAddress(req);
      req.deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload & { sub?: string; email?: string };
      const userId = decoded.userId ?? decoded.sub;
      if (userId) {
        req.userId = String(userId);
        req.userEmail = decoded.email ? String(decoded.email) : undefined;
        req.sessionId = decoded.sessionId || generateSessionId();
      }
    } catch {
      // Token invalid or expired - continue without authentication
    }

    req.ipAddress = extractIpAddress(req);
    req.deviceFingerprint = req.headers['x-device-fingerprint'] as string | undefined;
    next();
  } catch (error) {
    req.ipAddress = extractIpAddress(req);
    next();
  }
}

/**
 * Generate a new JWT token for a user (e.g. after Supabase or custom login)
 */
export function generateToken(userId: string, expiresIn?: string | number): string {
  const payload: JWTPayload = {
    userId,
    sessionId: generateSessionId()
  };
  
  const options: any = { expiresIn: expiresIn || '24h' };
  return jwt.sign(payload, getJWTSecret(), options);
}

/**
 * Verify a JWT token without middleware (JWT only; Supabase or custom payload)
 */
export async function verifyTokenAsync(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload & { sub?: string };
    const userId = decoded.userId ?? decoded.sub;
    return userId ? { ...decoded, userId: String(userId) } : null;
  } catch {
    return null;
  }
}

/**
 * Verify a legacy JWT token without middleware (synchronous)
 * @deprecated Prefer verifyTokenAsync for async verification
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJWTSecret()) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a cryptographically secure session ID
 * SECURITY: Uses crypto.randomBytes instead of Math.random
 */
function generateSessionId(): string {
  const randomPart = crypto.randomBytes(12).toString('base64url');
  return `sess_${Date.now()}_${randomPart}`;
}

/**
 * Extract IP address from request (handles proxies)
 */
function extractIpAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  
  if (forwarded) {
    // Take first IP if multiple (comma-separated)
    const firstIP = forwarded.split(',')[0];
    return firstIP ? firstIP.trim() : 'unknown';
  }
  
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Middleware to check specific user roles/permissions (extensible)
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }
    
    // TODO: Implement role checking from database
    // For now, allow all authenticated users
    next();
  };
}
