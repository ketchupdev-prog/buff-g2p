/**
 * Unified Rate Limiting Implementation for Smartpay Backend
 * Location: backend/src/middleware/sharedRateLimiter.ts
 * Purpose: Configuration-driven rate limiter reading from shared YAML config
 * 
 * This implementation reads from shared_config/rate_limits.yaml to maintain consistency
 * across Python and TypeScript backends.
 * 
 * Algorithms:
 * 1. Token Bucket: Smooth rate limiting with burst support
 * 2. Fixed Window: Simple time-windowed request counting
 * 
 * Features:
 * - YAML configuration support
 * - In-memory implementation (production should use Redis)
 * - Per-user and per-IP rate limiting
 * - Security event logging
 * - Automatic cleanup
 * - Environment-specific overrides
 */

import { Request, Response, NextFunction } from 'express';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../lib/db';

interface RateLimitConfig {
  algorithm: 'token_bucket' | 'fixed_window';
  capacity: number;
  refill_rate: number;
  window_ms?: number;
  max_requests?: number;
  path?: string;
  description?: string;
  per_user?: boolean;
  per_ip?: boolean;
  security_level?: string;
  log_violations?: boolean;
}

interface EndpointConfig {
  [key: string]: RateLimitConfig;
}

interface YAMLConfig {
  version: string;
  global: {
    default: RateLimitConfig;
  };
  endpoints: EndpointConfig;
  skip_paths: string[];
  security_logging?: {
    enabled: boolean;
    log_violations?: boolean;
  };
  responses?: {
    status_code: number;
    error_messages: {
      default: string;
      auth?: string;
      payment?: string;
    };
  };
  environments?: {
    [env: string]: any;
  };
}

/**
 * Token Bucket Algorithm Implementation
 * Allows for smooth rate limiting with burst capacity
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(tokens: number = 1): boolean {
    this._refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  private _refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
    
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getRemaining(): number {
    this._refill();
    return Math.floor(this.tokens);
  }

  getRetryAfter(): number {
    this._refill();
    
    if (this.tokens >= 1) {
      return 0;
    }
    
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }
}

/**
 * Fixed Window Algorithm Implementation
 * Simple algorithm that counts requests within fixed time windows
 */
class FixedWindow {
  private count: number = 0;
  private windowStart: number;

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {
    this.windowStart = Date.now();
  }

  consume(tokens: number = 1): boolean {
    this._resetIfNeeded();
    
    if (this.count < this.maxRequests) {
      this.count += tokens;
      return true;
    }
    
    return false;
  }

  private _resetIfNeeded(): void {
    const now = Date.now();
    if (now - this.windowStart >= this.windowMs) {
      this.count = 0;
      this.windowStart = now;
    }
  }

  getRemaining(): number {
    this._resetIfNeeded();
    return Math.max(0, this.maxRequests - this.count);
  }

  getRetryAfter(): number {
    this._resetIfNeeded();
    
    if (this.count < this.maxRequests) {
      return 0;
    }
    
    const now = Date.now();
    const windowEnd = this.windowStart + this.windowMs;
    const retryMs = Math.max(0, windowEnd - now);
    return Math.ceil(retryMs / 1000);
  }
}

type Limiter = TokenBucket | FixedWindow;

/**
 * Rate Limit Configuration Loader
 */
class RateLimitConfigLoader {
  private config: YAMLConfig;
  private environment: string;

  constructor(configPath?: string) {
    const defaultPath = path.join(__dirname, '../../../../packages/shared-config/rate_limits.yaml');
    const finalPath = configPath || defaultPath;
    
    this.config = this._loadConfig(finalPath);
    this.environment = process.env.NODE_ENV || 'development';
    this._applyEnvironmentOverrides();
  }

  private _loadConfig(configPath: string): YAMLConfig {
    try {
      if (!fs.existsSync(configPath)) {
        console.error(`Rate limit config not found: ${configPath}`);
        return this._getDefaultConfig();
      }
      
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContents) as YAMLConfig;
      
      console.log(`✅ Loaded rate limit config from ${configPath}`);
      return config;
    } catch (error) {
      console.error('Failed to load rate limit config:', error);
      return this._getDefaultConfig();
    }
  }

  private _getDefaultConfig(): YAMLConfig {
    return {
      version: '1.0',
      global: {
        default: {
          algorithm: 'token_bucket',
          capacity: 1000,
          refill_rate: 0.2778,
          window_ms: 3600000,
          max_requests: 1000
        }
      },
      endpoints: {},
      skip_paths: ['/', '/health', '/api/health', '/docs']
    };
  }

  private _applyEnvironmentOverrides(): void {
    if (this.config.environments && this.config.environments[this.environment]) {
      const envOverrides = this.config.environments[this.environment];
      this._deepMerge(this.config, envOverrides);
      console.log(`Applied ${this.environment} environment overrides to rate limits`);
    }
  }

  private _deepMerge(base: any, override: any): void {
    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        if (base[key] && typeof base[key] === 'object' && typeof override[key] === 'object') {
          this._deepMerge(base[key], override[key]);
        } else {
          base[key] = override[key];
        }
      }
    }
  }

  getEndpointConfig(reqPath: string): RateLimitConfig | null {
    const endpoints = this.config.endpoints;
    
    for (const [endpointName, config] of Object.entries(endpoints)) {
      const endpointPath = config.path || '';
      if (reqPath === endpointPath || reqPath.startsWith(endpointPath)) {
        return config;
      }
    }
    
    return null;
  }

  getGlobalConfig(): RateLimitConfig {
    return this.config.global.default;
  }

  shouldSkipPath(reqPath: string): boolean {
    return this.config.skip_paths.includes(reqPath);
  }

  shouldLogViolations(): boolean {
    return this.config.security_logging?.enabled || false;
  }

  getConfig(): YAMLConfig {
    return this.config;
  }
}

/**
 * In-Memory Rate Limiter
 * For development and testing. Production should use Redis.
 */
class InMemoryRateLimiter {
  private buckets: Map<string, Limiter> = new Map();
  private cleanupInterval: number = 300000; // 5 minutes
  private lastCleanup: number = Date.now();

  checkRateLimit(
    key: string,
    endpointConfig: RateLimitConfig
  ): { allowed: boolean; retryAfter: number | null; remaining: number } {
    this._cleanupIfNeeded();
    
    if (!this.buckets.has(key)) {
      this.buckets.set(key, this._createLimiter(endpointConfig));
    }
    
    const limiter = this.buckets.get(key)!;
    
    if (limiter.consume()) {
      const remaining = limiter.getRemaining();
      return { allowed: true, retryAfter: null, remaining };
    } else {
      const retryAfter = limiter.getRetryAfter();
      return { allowed: false, retryAfter, remaining: 0 };
    }
  }

  private _createLimiter(config: RateLimitConfig): Limiter {
    const algorithm = config.algorithm || 'token_bucket';
    
    if (algorithm === 'token_bucket') {
      const capacity = config.capacity || 100;
      const refillRate = config.refill_rate || 0.1;
      return new TokenBucket(capacity, refillRate);
    } else if (algorithm === 'fixed_window') {
      const maxRequests = config.max_requests || 100;
      const windowMs = config.window_ms || 900000;
      return new FixedWindow(maxRequests, windowMs);
    } else {
      console.warn(`Unknown algorithm ${algorithm}, defaulting to token_bucket`);
      return new TokenBucket(100, 0.1);
    }
  }

  private _cleanupIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      const initialCount = this.buckets.size;
      
      // Remove buckets that are full (likely inactive)
      for (const [key, bucket] of this.buckets.entries()) {
        if (!this._isBucketActive(bucket)) {
          this.buckets.delete(key);
        }
      }
      
      const removed = initialCount - this.buckets.size;
      if (removed > 0) {
        console.log(`Cleaned up ${removed} inactive rate limit buckets`);
      }
      
      this.lastCleanup = now;
    }
  }

  private _isBucketActive(bucket: Limiter): boolean {
    if (bucket instanceof TokenBucket) {
      return bucket.getRemaining() < (bucket as any).capacity;
    } else if (bucket instanceof FixedWindow) {
      return (bucket as any).count > 0;
    }
    return true;
  }
}

/**
 * Global instances
 */
const configLoader = new RateLimitConfigLoader();
const limiter = new InMemoryRateLimiter();

/**
 * Main rate limiting middleware factory
 */
export function createRateLimiterFromConfig(endpointName?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip rate limiting for certain paths
      if (configLoader.shouldSkipPath(req.path)) {
        next();
        return;
      }
      
      // Get identifier (user ID or IP)
      const identifier = getIdentifier(req);
      
      // Get endpoint-specific config
      let endpointConfig: RateLimitConfig | null = null;
      
      if (endpointName) {
        // Use specific endpoint config
        endpointConfig = configLoader.getConfig().endpoints[endpointName] || null;
      }
      
      if (!endpointConfig) {
        // Try to match by path
        endpointConfig = configLoader.getEndpointConfig(req.path);
      }
      
      if (!endpointConfig) {
        // Use global default
        endpointConfig = configLoader.getGlobalConfig();
      }
      
      // Build rate limit key
      const key = `${identifier}:path:${req.path}`;
      
      // Check rate limit
      const { allowed, retryAfter, remaining } = limiter.checkRateLimit(key, endpointConfig);
      
      if (!allowed) {
        // Log violation if configured
        if (configLoader.shouldLogViolations() && endpointConfig.log_violations) {
          await logRateLimitViolation(req, identifier, endpointConfig);
        }
        
        // Return 429 response
        const errorMessage = getErrorMessage(endpointConfig, configLoader.getConfig());
        
        res.setHeader('X-RateLimit-Limit', String(endpointConfig.capacity || endpointConfig.max_requests || 'unknown'));
        res.setHeader('X-RateLimit-Remaining', '0');
        if (retryAfter) {
          res.setHeader('Retry-After', String(retryAfter));
        }
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: errorMessage,
          retryAfter: retryAfter,
          endpoint: endpointConfig.description || ''
        });
        return;
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', String(endpointConfig.capacity || endpointConfig.max_requests || 'unknown'));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Don't block request on rate limiter failure
      next();
    }
  };
}

/**
 * Get rate limiter for specific endpoint by name
 */
export function getRateLimiterForEndpoint(endpointName: string) {
  return createRateLimiterFromConfig(endpointName);
}

/**
 * Helper: Get identifier for rate limiting
 */
function getIdentifier(req: Request): string {
  // Try to get user ID from auth
  const userId = (req as any).userId;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Helper: Get error message based on endpoint type
 */
function getErrorMessage(config: RateLimitConfig, yamlConfig: YAMLConfig): string {
  const responses = yamlConfig.responses;
  if (!responses) {
    return 'Rate limit exceeded. Please try again later.';
  }
  
  const errorMessages = responses.error_messages;
  const securityLevel = config.security_level;
  const path = config.path || '';
  
  if (securityLevel && ['critical', 'high'].includes(securityLevel) && path.includes('payment')) {
    return errorMessages.payment || errorMessages.default;
  } else if (path.includes('auth') || path.includes('verify-pin')) {
    return errorMessages.auth || errorMessages.default;
  }
  
  return errorMessages.default;
}

/**
 * Helper: Log rate limit violation
 */
async function logRateLimitViolation(
  req: Request,
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  try {
    const userId = (req as any).userId || null;
    const sessionId = (req as any).sessionId || null;
    
    await pool.query(
      `INSERT INTO copilot_security_events 
        (user_id, session_id, event_type, severity, details, auto_blocked, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userId,
        sessionId,
        'rate_limit_exceeded',
        config.security_level === 'critical' ? 'high' : 'medium',
        JSON.stringify({
          identifier,
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
          endpoint: config.description
        }),
        true
      ]
    );
  } catch (error) {
    console.error('Failed to log rate limit violation:', error);
  }
}

/**
 * Export pre-configured rate limiters for backward compatibility
 */
export const strictRateLimiter = getRateLimiterForEndpoint('payments_initiate');
export const standardRateLimiter = getRateLimiterForEndpoint('copilot_chat');
export const lenientRateLimiter = getRateLimiterForEndpoint('transactions_list');
export const moderateRateLimiter = getRateLimiterForEndpoint('copilot_knowledge_search');
/** POST/PATCH /api/v1/users/pin — stricter than generic API traffic */
export const pinSetRateLimiter = getRateLimiterForEndpoint('users_pin_set');
/** POST /api/v1/users/verify-pin — brute-force protection */
export const pinVerifyRateLimiter = getRateLimiterForEndpoint('users_pin_verify');

/**
 * Export factory function for custom configurations
 */
export { createRateLimiterFromConfig as createRateLimiter };
