/**
 * Rate Limiting Middleware for Smartpay Backend
 * LEGACY FILE - Now uses shared YAML configuration
 * Location: backend/src/middleware/rateLimiter.ts
 * 
 * This file now re-exports rate limiters from sharedRateLimiter.ts
 * which reads from shared_config/rate_limits.yaml for consistency
 * across Python and TypeScript backends.
 * 
 * Migration: All rate limiters now use YAML-based configuration
 * Reference: shared_config/rate_limits.yaml
 */

// Re-export from shared rate limiter (YAML-based)
export {
  strictRateLimiter,
  standardRateLimiter,
  lenientRateLimiter,
  moderateRateLimiter,
  pinSetRateLimiter,
  pinVerifyRateLimiter,
  createRateLimiter,
  getRateLimiterForEndpoint
} from './sharedRateLimiter';

// Legacy createRateLimiter is now handled by sharedRateLimiter
// All configuration is read from shared_config/rate_limits.yaml
