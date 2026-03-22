/**
 * Security utilities and middleware
 * Following Buffr G2P security patterns
 */

import { Request, Response, NextFunction } from 'express';

export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'",
};

// Rate limiting store (in-memory for now, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

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
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { blocked: false, remaining: maxAttempts - 1 };
  }
  
  if (entry.count >= maxAttempts) {
    return { 
      blocked: true, 
      remaining: 0, 
      retryAfter: Math.ceil((entry.resetAt - now) / 1000) 
    };
  }
  
  entry.count++;
  return { blocked: false, remaining: maxAttempts - entry.count };
}

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
    if (!(fieldKey in bodyObj) || 
        bodyObj[fieldKey] === undefined || 
        bodyObj[fieldKey] === null || 
        bodyObj[fieldKey] === "") {
      return { valid: false, missing: fieldKey };
    }
  }
  
  return { valid: true };
}

export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  // Namibia: 8 digits, or 264 + 8 digits
  return digits.length === 8 || 
         (digits.length === 11 && digits.startsWith("264"));
}

export function isValidAmount(
  amount: number,
  min: number = 0.01,
  max: number = 999999999.99
): boolean {
  return typeof amount === "number" && amount >= min && amount <= max && !isNaN(amount);
}

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .trim();
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Idempotency key tracking (in-memory for now, use Redis in production)
const idempotencyStore = new Map<string, { response: unknown; expiresAt: number }>();

export function checkIdempotency(key: string): { exists: boolean; response?: unknown } {
  const now = Date.now();
  const entry = idempotencyStore.get(key);
  
  if (!entry || entry.expiresAt < now) {
    return { exists: false };
  }
  
  return { exists: true, response: entry.response };
}

export function storeIdempotentResponse(key: string, response: unknown, ttlSeconds: number = 3600) {
  const expiresAt = Date.now() + (ttlSeconds * 1000);
  idempotencyStore.set(key, { response, expiresAt });
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (entry.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Every minute

export function jsonError(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

export function isSchemaError(err: unknown): boolean {
  const e = err as { code?: string };
  return e?.code === "42703";
}

export function isMissingTableOrSchemaError(err: unknown): boolean {
  const e = err as { code?: string };
  return e?.code === "42703" || e?.code === "42P01";
}
