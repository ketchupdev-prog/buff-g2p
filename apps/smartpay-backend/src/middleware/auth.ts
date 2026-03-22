/**
 * Authentication Middleware
 * Following Buffr G2P auth patterns
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { sql } from '../lib/db';
import { jsonError } from '../lib/security';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId(req);
    req.userId = userId;
    
    // Optionally load full user object
    const userRows = await sql`
      SELECT * FROM users WHERE id = ${userId} LIMIT 1
    `;
    
    if (userRows.length > 0) {
      req.user = userRows[0];
    }
    
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required';
    jsonError(res, 401, message);
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = await getCurrentUserId(req);
    req.userId = userId;
    
    // Load full user object
    const userRows = await sql`
      SELECT * FROM users WHERE id = ${userId} LIMIT 1
    `;
    
    if (userRows.length > 0) {
      req.user = userRows[0];
    }
  } catch (error) {
    // Continue without auth
  }
  
  next();
}

async function getCurrentUserId(req: Request): Promise<string> {
  // Production: JWT signature verification
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const verification = await verifyAccessToken(token);
    
    if (verification.valid && verification.payload) {
      return verification.payload.userId;
    }
    
    throw new Error(verification.error || "Invalid access token");
  }

  // Development fallback: explicit user ID header
  const explicitId = req.header("x-user-id");
  if (explicitId) {
    const rows = await sql`
      SELECT id FROM users WHERE id = ${explicitId} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new Error("User not found for x-user-id");
    }
    return (rows[0] as { id: string }).id;
  }

  // Development fallback: first user (only if ALLOW_DEV_FALLBACK=true)
  if (process.env.ALLOW_DEV_FALLBACK === 'true') {
    const rows = await sql`
      SELECT id FROM users ORDER BY created_at ASC LIMIT 1
    `;
    if (rows.length === 0) {
      throw new Error("No users found");
    }
    return (rows[0] as { id: string }).id;
  }

  throw new Error("Authentication required");
}

export { getCurrentUserId };
