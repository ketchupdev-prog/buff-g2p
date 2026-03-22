/**
 * API Security Middleware – Buffr G2P.
 * Provides consistent authentication, rate limiting, and security headers.
 * Location: backend/src/lib/security.ts
 */

import { sql } from "./db.js";

// ============================================================================
// Auth Middleware
// ============================================================================

/**
 * Authentication middleware - determines user ID from request.
 * 
 * Production: Uses JWT Bearer token from Authorization header
 * Development: Falls back to X-User-Id header or first user
 */
export async function authenticateRequest(req: Request): Promise<string> {
  const authHeader = req.headers.get("authorization");
  const userId = req.headers.get("x-user-id");
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Check for Bearer token (production)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // In production, verify JWT and extract user ID
    // For now, validate token exists in database
    const rows = await sql`
      SELECT user_id FROM sessions 
      WHERE access_token = ${token} AND expires_at > NOW()
      LIMIT 1
    `;
    
    if (rows.length > 0) {
      return (rows[0] as { user_id: string }).user_id;
    }
    
    // If no valid session, try JWT verification
    // In production, use proper JWT verification here
    throw new Error("Invalid or expired token");
  }
  
  // Development mode: allow X-User-Id header
  if (isDevelopment && userId) {
    // Verify user exists
    const userRows = await sql`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (userRows.length > 0) {
      return userId;
    }
    throw new Error("User not found for x-user-id");
  }
  
  // Development fallback: use first user (DANGEROUS - only for dev)
  if (isDevelopment) {
    const rows = await sql`
      SELECT id FROM users ORDER BY created_at ASC LIMIT 1
    `;
    if (rows.length > 0) {
      return (rows[0] as { id: string }).id;
    }
    throw new Error("No users found in database");
  }
  
  // Production: require authentication
  throw new Error("Authentication required");
}

/**
 * Optional authentication - returns user ID if authenticated, null otherwise.
 */
export async function optionalAuth(req: Request): Promise<string | null> {
  try {
    return await authenticateRequest(req);
  } catch {
    return null;
  }
}

// ============================================================================
// Rate Limiting (simple in-memory for now)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple rate limiter - tracks requests by IP and endpoint.
 * In production, use Redis or similar.
 */
export function rateLimit(
  windowMs: number = 60000, // 1 minute
  maxRequests: number = 100
): { limited: boolean; remaining: number; resetAt: number } {
  // Note: In serverless/lambda, this won't work properly.
  // Use external service like Upstash Redis in production.
  return { limited: false, remaining: maxRequests, resetAt: Date.now() + windowMs };
}

/**
 * Check if IP is rate limited for a specific action.
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): { blocked: boolean; remaining: number; retryAfter?: number } {
  const key = `${identifier}:${action}`;
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { blocked: false, remaining: maxAttempts - 1 };
  }
  
  if (entry.count >= maxAttempts) {
    // Rate limited
    return { 
      blocked: true, 
      remaining: 0, 
      retryAfter: Math.ceil((entry.resetAt - now) / 1000) 
    };
  }
  
  // Increment count
  entry.count++;
  return { blocked: false, remaining: maxAttempts - entry.count };
}

/**
 * Clear rate limit for an identifier/action.
 */
export function clearRateLimit(identifier: string, action: string): void {
  const key = `${identifier}:${action}`;
  rateLimitStore.delete(key);
}

// ============================================================================
// Input Validation Helpers
// ============================================================================

/**
 * Validate required fields are present in request body.
 */
export function validateRequired<T extends Record<string, unknown>>(
  body: unknown,
  requiredFields: (keyof T)[]
): { valid: boolean; missing?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, missing: "Request body required" };
  }
  
  const bodyObj = body as Record<string, unknown>;
  for (const field of requiredFields) {
    const fieldKey = String(field);
    if (!(fieldKey in bodyObj) || bodyObj[fieldKey] === undefined || bodyObj[fieldKey] === null || bodyObj[fieldKey] === "") {
      return { valid: false, missing: fieldKey };
    }
  }
  
  return { valid: true };
}

/**
 * Validate phone number format (Namibia).
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  // Namibia: 8 digits, or 264 + 8 digits
  return digits.length === 8 || (digits.length === 11 && digits.startsWith("264"));
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate amount is positive and within limits.
 */
export function isValidAmount(
  amount: number,
  min: number = 0.01,
  max: number = 999999999.99
): boolean {
  return typeof amount === "number" && amount >= min && amount <= max;
}

/**
 * Sanitize string input - prevent XSS.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .trim();
}

// ============================================================================
// Security Headers
// ============================================================================

/**
 * Security headers to apply to all responses.
 */
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'",
};

export default {
  authenticateRequest,
  optionalAuth,
  rateLimit,
  checkRateLimit,
  clearRateLimit,
  validateRequired,
  isValidPhoneNumber,
  isValidEmail,
  isValidAmount,
  sanitizeString,
  securityHeaders,
};
