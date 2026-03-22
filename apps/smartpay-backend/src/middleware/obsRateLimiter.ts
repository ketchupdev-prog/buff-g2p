/**
 * OBS Rate Limiting Middleware
 * 
 * Implements OBS 9.7.1 - TPP Service Levels:
 * - Maximum 4 automated requests per day from same Account Holder
 * - Error rate monitoring
 * - 429 Too Many Requests responses
 */

import { Request, Response, NextFunction } from 'express';
import { pool, sql, query } from '../lib/db';
import { prisma } from '../lib/prisma';
import { OBSErrorCode } from '../types/obs';

interface RateLimitEntry {
  count: number;
  firstRequest: Date;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit per Account Holder per TPP per endpoint
 * Max 4 requests per day (OBS 9.7.1)
 */
export async function obsRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract identifiers
    const tppParticipantId = req.obsHeaders?.ParticipantId;
    const accessToken = req.headers['authorization']?.substring(7);

    if (!tppParticipantId || !accessToken) {
      return next();
    }

    // Get consent to identify account holder
    const token = await prisma.oBSAccessToken.findUnique({
      where: { accessToken },
      include: { consent: true },
    });

    if (!token) {
      return next();
    }

    const accountHolderId = token.consent.accountHolderId;
    const endpoint = req.path;

    // Create rate limit key
    const key = `${tppParticipantId}:${accountHolderId}:${endpoint}`;

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    const now = new Date();

    if (!entry) {
      entry = {
        count: 1,
        firstRequest: now,
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    // Check if 24 hours have passed
    const hoursSinceFirst = (now.getTime() - entry.firstRequest.getTime()) / (1000 * 60 * 60);

    if (hoursSinceFirst >= 24) {
      // Reset counter
      entry = {
        count: 1,
        firstRequest: now,
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    // Check if limit exceeded (4 requests per day)
    if (entry.count >= 4) {
      const retryAfter = Math.ceil(24 - hoursSinceFirst) * 3600; // seconds until reset

      res.setHeader('RetryAfter', retryAfter.toString());
      res.setHeader('x-v', '1');
      res.setHeader('ParticipantId', 'API000001');

      return res.status(429).json({
        errors: [{
          code: OBSErrorCode.TOO_MANY_REQUESTS,
          title: 'Too Many Requests',
          detail: `Rate limit exceeded. Maximum 4 requests per day allowed. Retry after ${retryAfter} seconds.`,
        }],
      });
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    next(); // Don't block on rate limiter errors
  }
}

/**
 * Clean up old entries (run periodically)
 */
export function cleanupRateLimitStore() {
  const now = new Date();
  for (const [key, entry] of rateLimitStore.entries()) {
    const hoursSinceFirst = (now.getTime() - entry.firstRequest.getTime()) / (1000 * 60 * 60);
    if (hoursSinceFirst >= 24) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every hour
setInterval(cleanupRateLimitStore, 60 * 60 * 1000);
