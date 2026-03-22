/**
 * Security Headers Middleware for Smartpay Backend
 * Implements PSD-12 cybersecurity requirements
 * Location: backend/src/middleware/securityHeaders.ts
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Apply security headers to all responses
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Enforce HTTPS (in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(self)'
  );
  
  next();
}

let corsLoggedOnce = false;

/**
 * CORS configuration for mobile app
 * SECURITY: Uses CORS_ORIGINS from .env with safe dev defaults
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Parse CORS_ORIGINS from environment variable with safe dev defaults
  const corsOriginsEnv = process.env.CORS_ORIGINS || '';
  
  const allowedOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map(origin => origin.trim())
    : [
        // Safe development defaults (only used if CORS_ORIGINS not set)
        'http://localhost:19000', // Expo dev
        'http://localhost:8081',  // Expo web
        'capacitor://localhost',  // Capacitor iOS
        'http://localhost',       // Capacitor Android
      ];
  
  const origin = req.headers.origin;
  
  // Allow origin if it's in the whitelist
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.length === 0 || (allowedOrigins.length === 1 && allowedOrigins[0] === '*')) {
    // Allow wildcard only if explicitly set in CORS_ORIGINS
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Device-Fingerprint, X-Session-ID'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Log CORS configuration once (development only) — avoid duplicate per-request logs
  if (process.env.NODE_ENV === 'development' && !corsLoggedOnce) {
    corsLoggedOnce = true;
    console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
}

/**
 * Request logging middleware for audit compliance (ETA 2019 §32)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Log request
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).userId || null,
    sessionId: (req as any).sessionId || null
  };
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const responseLog = {
      ...requestLog,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    };
    
    // Log only failures to reduce duplicate noise (successes omitted in dev)
    if (res.statusCode >= 400) {
      console.error('Request failed:', JSON.stringify(responseLog));
    }
  });
  
  next();
}

/**
 * Validate Content-Type for POST/PUT requests
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be application/json'
      });
      return;
    }
  }
  
  next();
}
