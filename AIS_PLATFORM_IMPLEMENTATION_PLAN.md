# AIS Platform Standalone Implementation Plan

**Generated:** 2026-03-22  
**Objective:** Close all gaps to make AIS platform fully standalone  
**Current Status:** 92% system health, critical gaps identified  
**Target:** 100% production-ready standalone platform

---

## Executive Summary

The AIS (Account Information Service) platform has solid foundations with **OBS v1.0** compliance, but requires completion of 4 critical areas:

1. **Missing Routes & Endpoints** (23 implementations needed)
2. **Middleware Gaps** (4 critical middleware services)
3. **Database Functions** (18 stored procedures + 12 indexes)
4. **Integration Points** (Bank simulator, webhooks, token management)

**Estimated Effort:** 120-160 hours (3-4 weeks with 1 engineer)  
**Priority:** P0 (Production Blocker)

---

## Part 1: Missing Routes Analysis

### 1.1 Critical Missing Routes (Priority P0)

#### A. Bank Simulator Integration
**File:** `apps/smartpay-backend/src/routes/simulator/bankSimulator.ts` *(NEW)*

**Missing Endpoints:**
```typescript
// Bank Simulator Routes (Mock Data Provider)
POST   /api/v1/simulator/accounts        // Create test account
GET    /api/v1/simulator/accounts/:id    // Get account details
POST   /api/v1/simulator/transactions    // Simulate transaction
POST   /api/v1/simulator/reset           // Reset simulator state
GET    /api/v1/simulator/scenarios       // List test scenarios
POST   /api/v1/simulator/scenarios/:id   // Execute test scenario
```

**Implementation Template:**
```typescript
/**
 * Bank Simulator Routes
 * Mock Data Provider for testing AIS/PIS flows
 * Location: apps/smartpay-backend/src/routes/simulator/bankSimulator.ts
 */
import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth';
import { sql } from '../../lib/db';

const router = Router();

// Test account structure
interface SimulatorAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: 'savings' | 'checking' | 'credit';
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'frozen';
  overdraftLimit?: number;
}

// Test scenarios
const TEST_SCENARIOS = {
  'low-balance': {
    name: 'Low Balance Account',
    balance: 50.00,
    dailyLimit: 1000.00,
    status: 'active',
  },
  'high-balance': {
    name: 'High Balance Account',
    balance: 500000.00,
    dailyLimit: 50000.00,
    status: 'active',
  },
  'frozen-account': {
    name: 'Frozen Account',
    balance: 10000.00,
    status: 'frozen',
  },
  'insufficient-funds': {
    name: 'Insufficient Funds',
    balance: 10.00,
    dailyLimit: 1000.00,
    status: 'active',
  },
};

/**
 * POST /api/v1/simulator/accounts
 * Create test bank account
 */
router.post('/accounts', requireAuth, async (req, res) => {
  try {
    const { scenario = 'high-balance', accountType = 'checking' } = req.body;
    const testScenario = TEST_SCENARIOS[scenario as keyof typeof TEST_SCENARIOS];
    
    if (!testScenario) {
      return res.status(400).json({ error: 'Invalid scenario' });
    }

    const account: SimulatorAccount = {
      id: crypto.randomUUID(),
      accountNumber: `SIM${Math.random().toString().slice(2, 12)}`,
      accountName: testScenario.name,
      accountType,
      balance: testScenario.balance,
      currency: 'NAD',
      status: testScenario.status,
    };

    // Store in simulator_accounts table
    await sql`
      INSERT INTO simulator_accounts (
        id, account_number, account_name, account_type,
        balance, currency, status, created_at
      ) VALUES (
        ${account.id}, ${account.accountNumber}, ${account.accountName},
        ${account.accountType}, ${account.balance}, ${account.currency},
        ${account.status}, NOW()
      )
    `;

    return res.status(201).json(account);
  } catch (error: any) {
    console.error('Simulator create account error:', error);
    return res.status(500).json({ error: 'Failed to create simulator account' });
  }
});

/**
 * POST /api/v1/simulator/transactions
 * Simulate transaction (debit/credit)
 */
router.post('/transactions', requireAuth, async (req, res) => {
  try {
    const { accountId, amount, type, description } = req.body;

    if (!accountId || !amount || !type) {
      return res.status(400).json({ error: 'accountId, amount, and type required' });
    }

    // Get account
    const account = await sql`
      SELECT * FROM simulator_accounts WHERE id = ${accountId}
    `;

    if (account.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account[0].balance);
    const txnAmount = parseFloat(amount);

    // Calculate new balance
    const newBalance = type === 'debit'
      ? currentBalance - txnAmount
      : currentBalance + txnAmount;

    if (newBalance < 0 && !account[0].overdraftLimit) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Update balance
    await sql`
      UPDATE simulator_accounts
      SET balance = ${newBalance}, updated_at = NOW()
      WHERE id = ${accountId}
    `;

    // Insert transaction record
    const transaction = {
      id: crypto.randomUUID(),
      accountId,
      type,
      amount: txnAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description,
      timestamp: new Date().toISOString(),
    };

    await sql`
      INSERT INTO simulator_transactions (
        id, account_id, type, amount, balance_before,
        balance_after, description, created_at
      ) VALUES (
        ${transaction.id}, ${accountId}, ${type}, ${txnAmount},
        ${currentBalance}, ${newBalance}, ${description}, NOW()
      )
    `;

    return res.json(transaction);
  } catch (error: any) {
    console.error('Simulator transaction error:', error);
    return res.status(500).json({ error: 'Failed to process transaction' });
  }
});

/**
 * POST /api/v1/simulator/reset
 * Reset all simulator data
 */
router.post('/reset', requireAuth, async (req, res) => {
  try {
    await sql`DELETE FROM simulator_transactions`;
    await sql`DELETE FROM simulator_accounts`;
    
    return res.json({ message: 'Simulator reset successfully' });
  } catch (error: any) {
    console.error('Simulator reset error:', error);
    return res.status(500).json({ error: 'Failed to reset simulator' });
  }
});

/**
 * GET /api/v1/simulator/scenarios
 * List available test scenarios
 */
router.get('/scenarios', (req, res) => {
  return res.json({ scenarios: TEST_SCENARIOS });
});

export default router;
```

---

#### B. PIS (Payment Initiation Service) Routes
**File:** `apps/smartpay-backend/src/routes/obs/pisRoutes.ts` *(EXISTS, needs completion)*

**Missing Endpoints:**
```typescript
POST   /api/v1/obs/pis/domestic          // Initiate domestic payment
POST   /api/v1/obs/pis/international     // Initiate international payment
GET    /api/v1/obs/pis/payments/:id      // Get payment status
POST   /api/v1/obs/pis/payments/:id/cancel  // Cancel payment
POST   /api/v1/obs/pis/beneficiaries     // Create beneficiary
GET    /api/v1/obs/pis/beneficiaries     // List beneficiaries
```

**Gap:** Current `pisRoutes.ts` only has initiation, missing status tracking & beneficiary management.

**Required Additions:**
```typescript
/**
 * GET /api/v1/obs/pis/payments/:id
 * Get payment status and details
 */
router.get('/payments/:id', requireAuth, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.userId;

    const payment = await sql`
      SELECT * FROM obs_payment_initiations
      WHERE id = ${paymentId} AND user_id = ${userId}
    `;

    if (payment.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.json(payment[0]);
  } catch (error: any) {
    console.error('Get payment error:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment' });
  }
});

/**
 * POST /api/v1/obs/pis/payments/:id/cancel
 * Cancel pending payment
 */
router.post('/payments/:id/cancel', requireAuth, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.userId;

    // Verify payment exists and is pending
    const payment = await sql`
      SELECT * FROM obs_payment_initiations
      WHERE id = ${paymentId} AND user_id = ${userId}
      AND status = 'pending'
    `;

    if (payment.length === 0) {
      return res.status(404).json({ 
        error: 'Payment not found or cannot be cancelled' 
      });
    }

    // Update status
    await sql`
      UPDATE obs_payment_initiations
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${paymentId}
    `;

    return res.json({ 
      message: 'Payment cancelled successfully',
      paymentId 
    });
  } catch (error: any) {
    console.error('Cancel payment error:', error);
    return res.status(500).json({ error: 'Failed to cancel payment' });
  }
});

/**
 * POST /api/v1/obs/pis/beneficiaries
 * Create beneficiary for future payments
 */
router.post('/beneficiaries', requireAuth, async (req, res) => {
  try {
    const { name, accountNumber, bankCode, reference } = req.body;
    const userId = req.userId;

    if (!name || !accountNumber || !bankCode) {
      return res.status(400).json({ 
        error: 'name, accountNumber, and bankCode required' 
      });
    }

    const beneficiary = {
      id: crypto.randomUUID(),
      userId,
      name,
      accountNumber,
      bankCode,
      reference,
      createdAt: new Date().toISOString(),
    };

    await sql`
      INSERT INTO obs_beneficiaries (
        id, user_id, name, account_number, bank_code, reference, created_at
      ) VALUES (
        ${beneficiary.id}, ${userId}, ${name}, ${accountNumber},
        ${bankCode}, ${reference}, NOW()
      )
    `;

    return res.status(201).json(beneficiary);
  } catch (error: any) {
    console.error('Create beneficiary error:', error);
    return res.status(500).json({ error: 'Failed to create beneficiary' });
  }
});

/**
 * GET /api/v1/obs/pis/beneficiaries
 * List user's beneficiaries
 */
router.get('/beneficiaries', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    const beneficiaries = await sql`
      SELECT * FROM obs_beneficiaries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return res.json({ beneficiaries });
  } catch (error: any) {
    console.error('List beneficiaries error:', error);
    return res.status(500).json({ error: 'Failed to retrieve beneficiaries' });
  }
});
```

---

#### C. Consent Management Routes (Enhancement)
**File:** `apps/smartpay-backend/src/routes/obs/consentsRoutes.ts` *(EXISTS, needs additions)*

**Missing Endpoints:**
```typescript
GET    /api/v1/obs/consents/history       // Consent audit trail
POST   /api/v1/obs/consents/:id/extend    // Extend consent duration
POST   /api/v1/obs/consents/:id/modify    // Modify consent scopes
GET    /api/v1/obs/consents/expiring      // Get consents expiring soon
```

**Implementation:**
```typescript
/**
 * GET /api/v1/obs/consents/history
 * Get consent audit trail for user
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;

    const history = await sql`
      SELECT 
        ca.*,
        c.data_provider_id,
        dp.name as provider_name
      FROM obs_consent_audit_log ca
      JOIN obs_consents c ON ca.consent_id = c.id
      JOIN data_providers dp ON c.data_provider_id = dp.id
      WHERE ca.user_id = ${userId}
      ORDER BY ca.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return res.json({ history });
  } catch (error: any) {
    console.error('Consent history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve consent history' });
  }
});

/**
 * POST /api/v1/obs/consents/:id/extend
 * Extend consent expiry date
 */
router.post('/:id/extend', requireAuth, async (req, res) => {
  try {
    const consentId = req.params.id;
    const userId = req.userId;
    const { durationDays = 90 } = req.body;

    // Verify consent ownership
    const consent = await sql`
      SELECT * FROM obs_consents
      WHERE id = ${consentId} AND user_id = ${userId}
      AND status = 'active'
    `;

    if (consent.length === 0) {
      return res.status(404).json({ error: 'Consent not found or inactive' });
    }

    // Calculate new expiry
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + durationDays);

    await sql`
      UPDATE obs_consents
      SET expires_at = ${newExpiry.toISOString()},
          updated_at = NOW()
      WHERE id = ${consentId}
    `;

    // Log audit event
    await logConsentAudit({
      consentId,
      eventType: 'consent_extended',
      userId,
      dataProviderId: consent[0].data_provider_id,
      scopes: consent[0].scopes,
      details: { oldExpiry: consent[0].expires_at, newExpiry },
    });

    return res.json({ 
      message: 'Consent extended successfully',
      newExpiry 
    });
  } catch (error: any) {
    console.error('Extend consent error:', error);
    return res.status(500).json({ error: 'Failed to extend consent' });
  }
});

/**
 * GET /api/v1/obs/consents/expiring
 * Get consents expiring in next 7 days
 */
router.get('/expiring', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { days = 7 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));

    const expiring = await sql`
      SELECT 
        c.*,
        dp.name as provider_name,
        dp.logo_url
      FROM obs_consents c
      JOIN data_providers dp ON c.data_provider_id = dp.id
      WHERE c.user_id = ${userId}
      AND c.status = 'active'
      AND c.expires_at <= ${expiryDate.toISOString()}
      ORDER BY c.expires_at ASC
    `;

    return res.json({ expiring });
  } catch (error: any) {
    console.error('Expiring consents error:', error);
    return res.status(500).json({ error: 'Failed to retrieve expiring consents' });
  }
});
```

---

### 1.2 Secondary Missing Routes (Priority P1)

#### D. Webhook Management Routes
**File:** `apps/smartpay-backend/src/routes/webhookManagement.ts` *(NEW)*

**Purpose:** Manage webhook subscriptions for external systems

```typescript
POST   /api/v1/webhooks/subscribe         // Subscribe to events
GET    /api/v1/webhooks/subscriptions     // List subscriptions
DELETE /api/v1/webhooks/subscriptions/:id // Unsubscribe
POST   /api/v1/webhooks/test               // Test webhook delivery
GET    /api/v1/webhooks/logs               // Webhook delivery logs
POST   /api/v1/webhooks/retry/:id          // Retry failed webhook
```

#### E. Token Management Routes
**File:** `apps/smartpay-backend/src/routes/tokenManagement.ts` *(NEW)*

**Purpose:** Manage OAuth tokens and API keys

```typescript
POST   /api/v1/tokens/refresh              // Refresh access token
POST   /api/v1/tokens/revoke               // Revoke access token
GET    /api/v1/tokens/active               // List active tokens
POST   /api/v1/apikeys/generate            // Generate API key
GET    /api/v1/apikeys                     // List API keys
DELETE /api/v1/apikeys/:id                 // Delete API key
```

---

## Part 2: Missing Middleware

### 2.1 Authentication Middleware (Critical Gap)

**Current Issue:** Multiple TODO comments in `requireAuth.ts` for role-based access control.

**File:** `apps/smartpay-backend/src/middleware/rbac.ts` *(NEW)*

**Implementation:**
```typescript
/**
 * Role-Based Access Control Middleware
 * Location: apps/smartpay-backend/src/middleware/rbac.ts
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './requireAuth';
import { sql } from '../lib/db';

export type UserRole = 'user' | 'agent' | 'admin' | 'tpp' | 'data_provider';

export interface RBACOptions {
  roles: UserRole[];
  requireAll?: boolean;
}

/**
 * Check if user has required role(s)
 */
export function requireRole(options: RBACOptions) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get user roles from database
      const userRoles = await sql`
        SELECT role FROM user_roles
        WHERE user_id = ${userId} AND is_active = true
      `;

      const roles = userRoles.map(r => r.role);

      // Check if user has required roles
      const hasRequiredRole = options.requireAll
        ? options.roles.every(role => roles.includes(role))
        : options.roles.some(role => roles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: options.roles,
          current: roles,
        });
      }

      // Attach roles to request
      req.userRoles = roles;
      next();
    } catch (error: any) {
      console.error('RBAC error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

/**
 * Check specific permission
 */
export function requirePermission(permission: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check permission from database
      const hasPermission = await sql`
        SELECT 1 FROM user_permissions
        WHERE user_id = ${userId}
        AND permission = ${permission}
        AND is_active = true
        LIMIT 1
      `;

      if (hasPermission.length === 0) {
        return res.status(403).json({
          error: 'Permission denied',
          required: permission,
        });
      }

      next();
    } catch (error: any) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Helper: Check if user is admin
 */
export const requireAdmin = requireRole({ roles: ['admin'] });

/**
 * Helper: Check if user is TPP
 */
export const requireTPP = requireRole({ roles: ['tpp'] });

/**
 * Helper: Check if user is data provider
 */
export const requireDataProvider = requireRole({ roles: ['data_provider'] });
```

---

### 2.2 Rate Limiting Middleware (Enhancement)

**Current:** `obsRateLimiter.ts` exists but only for OBS routes

**File:** `apps/smartpay-backend/src/middleware/dynamicRateLimiter.ts` *(NEW)*

**Features:**
- Per-user, per-role, per-endpoint limits
- Redis-backed for distributed systems
- Configurable burst allowance
- Real-time monitoring

**Implementation:**
```typescript
/**
 * Dynamic Rate Limiting Middleware
 * Location: apps/smartpay-backend/src/middleware/dynamicRateLimiter.ts
 */
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './requireAuth';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// In-memory store (replace with Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : (req as AuthenticatedRequest).userId || req.ip || 'anonymous';

    const now = Date.now();
    const record = rateLimitStore.get(key);

    // Reset if window expired
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return next();
    }

    // Check limit
    if (record.count >= config.max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', record.resetTime);

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
    }

    // Increment count
    record.count++;
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', config.max - record.count);
    res.setHeader('X-RateLimit-Reset', record.resetTime);

    next();
  };
}

// Preset configurations
export const rateLimiters = {
  // Standard API (100 req/min)
  standard: createRateLimiter({
    windowMs: 60 * 1000,
    max: 100,
  }),

  // Payment initiation (10 req/min)
  payments: createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
  }),

  // AIS data access (30 req/min)
  ais: createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
  }),

  // TPP (higher limits)
  tpp: createRateLimiter({
    windowMs: 60 * 1000,
    max: 1000,
  }),
};
```

---

### 2.3 Audit Logging Middleware (Critical)

**Current Issue:** Multiple TODO comments in `security/api/audit.ts`

**File:** `apps/smartpay-backend/src/middleware/auditLogger.ts` *(NEW)*

**Implementation:**
```typescript
/**
 * Audit Logging Middleware
 * Logs all API requests for compliance (PSD-12, FIA)
 * Location: apps/smartpay-backend/src/middleware/auditLogger.ts
 */
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './requireAuth';
import { sql } from '../lib/db';

interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  ipAddress: string;
  userAgent: string;
  requestBody?: any;
  responseStatus?: number;
  responseTime?: number;
  errorMessage?: string;
}

export function auditLogger(options?: {
  excludePaths?: RegExp[];
  sensitiveFields?: string[];
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Skip excluded paths
    if (options?.excludePaths?.some(pattern => pattern.test(req.path))) {
      return next();
    }

    // Capture original res.json
    const originalJson = res.json.bind(res);
    let responseBody: any;

    res.json = function (body: any) {
      responseBody = body;
      return originalJson(body);
    };

    // Continue request processing
    res.on('finish', async () => {
      try {
        const responseTime = Date.now() - startTime;

        // Sanitize sensitive data
        const sanitizedBody = sanitizeObject(
          req.body,
          options?.sensitiveFields || ['pin', 'password', 'token', 'secret']
        );

        const auditEntry: AuditLogEntry = {
          userId: (req as AuthenticatedRequest).userId,
          action: req.method,
          resource: req.path,
          method: req.method,
          path: req.path,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          requestBody: sanitizedBody,
          responseStatus: res.statusCode,
          responseTime,
        };

        // Store audit log
        await sql`
          INSERT INTO audit_logs (
            user_id, action, resource, method, path, ip_address,
            user_agent, request_body, response_status, response_time,
            created_at
          ) VALUES (
            ${auditEntry.userId || null},
            ${auditEntry.action},
            ${auditEntry.resource},
            ${auditEntry.method},
            ${auditEntry.path},
            ${auditEntry.ipAddress},
            ${auditEntry.userAgent},
            ${JSON.stringify(auditEntry.requestBody)},
            ${auditEntry.responseStatus},
            ${auditEntry.responseTime},
            NOW()
          )
        `;
      } catch (error) {
        console.error('Audit logging failed:', error);
        // Don't fail the request if audit logging fails
      }
    });

    next();
  };
}

function sanitizeObject(obj: any, sensitiveFields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }
  return sanitized;
}
```

---

### 2.4 Error Handling Middleware (Enhancement)

**Current:** Basic error handling exists, needs standardization

**File:** `apps/smartpay-backend/src/middleware/errorHandler.ts` *(ENHANCE)*

**Features:**
- Consistent error responses
- Error classification (validation, auth, server)
- Automatic error reporting to monitoring
- Compliance-safe error messages (no PII leakage)

```typescript
/**
 * Centralized Error Handler
 * Location: apps/smartpay-backend/src/middleware/errorHandler.ts
 */
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error occurred:', err);

  // Handle known AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle validation errors (Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: (err as any).errors,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication failed',
      },
    });
  }

  // Generic server error
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

// Helper functions
export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
```

---

## Part 3: Missing Database Functions

### 3.1 Required Stored Procedures

**File:** `database/migrations/050_ais_stored_procedures.sql` *(NEW)*

```sql
-- ====================================================================
-- AIS Platform Stored Procedures
-- Purpose: Business logic for consent management, token validation
-- Location: database/migrations/050_ais_stored_procedures.sql
-- ====================================================================

-- 1. Validate Consent Active
CREATE OR REPLACE FUNCTION validate_consent_active(
  p_consent_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_valid BOOLEAN;
BEGIN
  SELECT 
    (status = 'active' AND expires_at > NOW() AND user_id = p_user_id)
  INTO v_is_valid
  FROM obs_consents
  WHERE id = p_consent_id;

  RETURN COALESCE(v_is_valid, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Refresh Access Token
CREATE OR REPLACE FUNCTION refresh_consent_token(
  p_consent_id UUID,
  p_new_access_token TEXT,
  p_new_refresh_token TEXT,
  p_expires_in INTEGER DEFAULT 3600
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE obs_consents
  SET 
    access_token = p_new_access_token,
    refresh_token = p_new_refresh_token,
    token_expires_at = NOW() + (p_expires_in || ' seconds')::INTERVAL,
    updated_at = NOW()
  WHERE id = p_consent_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Revoke Consent Cascade
CREATE OR REPLACE FUNCTION revoke_consent_cascade(
  p_consent_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM obs_consents
    WHERE id = p_consent_id AND user_id = p_user_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update consent status
  UPDATE obs_consents
  SET 
    status = 'revoked',
    access_token = NULL,
    refresh_token = NULL,
    updated_at = NOW()
  WHERE id = p_consent_id;

  -- Log audit event
  INSERT INTO obs_consent_audit_log (
    id, consent_id, event_type, user_id, data_provider_id,
    scopes, details, created_at
  )
  SELECT 
    gen_random_uuid(),
    id,
    'consent_revoked',
    user_id,
    data_provider_id,
    scopes,
    jsonb_build_object('revoked_at', NOW()),
    NOW()
  FROM obs_consents
  WHERE id = p_consent_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get Active Consents Count
CREATE OR REPLACE FUNCTION get_active_consents_count(
  p_user_id UUID,
  p_data_provider_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM obs_consents
  WHERE user_id = p_user_id
    AND status = 'active'
    AND expires_at > NOW()
    AND (p_data_provider_id IS NULL OR data_provider_id = p_data_provider_id);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Expire Old Consents (Cron Job)
CREATE OR REPLACE FUNCTION expire_old_consents()
RETURNS TABLE(expired_count INTEGER) AS $$
BEGIN
  UPDATE obs_consents
  SET 
    status = 'expired',
    access_token = NULL,
    refresh_token = NULL,
    updated_at = NOW()
  WHERE status = 'active'
    AND expires_at <= NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Log AIS API Call
CREATE OR REPLACE FUNCTION log_ais_api_call(
  p_consent_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time_ms INTEGER,
  p_data_provider_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO obs_api_call_logs (
    id, consent_id, endpoint, method, status_code,
    response_time_ms, data_provider_id, created_at
  ) VALUES (
    gen_random_uuid(),
    p_consent_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_data_provider_id,
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Calculate SLA Compliance
CREATE OR REPLACE FUNCTION calculate_sla_compliance(
  p_data_provider_id UUID,
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP DEFAULT NOW()
) RETURNS TABLE(
  uptime_percentage NUMERIC,
  avg_response_time_ms INTEGER,
  success_rate NUMERIC,
  total_calls BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND((SUM(CASE WHEN status_code < 500 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 2) as uptime_percentage,
    AVG(response_time_ms)::INTEGER as avg_response_time_ms,
    ROUND((SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)) * 100, 2) as success_rate,
    COUNT(*) as total_calls
  FROM obs_api_call_logs
  WHERE data_provider_id = p_data_provider_id
    AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Get Consent Usage Statistics
CREATE OR REPLACE FUNCTION get_consent_usage_stats(
  p_consent_id UUID
) RETURNS TABLE(
  total_calls BIGINT,
  last_used_at TIMESTAMP,
  avg_response_time_ms INTEGER,
  endpoints_accessed TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_calls,
    MAX(created_at) as last_used_at,
    AVG(response_time_ms)::INTEGER as avg_response_time_ms,
    ARRAY_AGG(DISTINCT endpoint) as endpoints_accessed
  FROM obs_api_call_logs
  WHERE consent_id = p_consent_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Validate TPP Authorization
CREATE OR REPLACE FUNCTION validate_tpp_authorization(
  p_participant_id TEXT,
  p_requested_scope TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_authorized BOOLEAN;
BEGIN
  SELECT 
    (status = 'active' AND p_requested_scope = ANY(allowed_scopes))
  INTO v_is_authorized
  FROM obs_participants
  WHERE participant_id = p_participant_id
    AND participant_type = 'tpp';

  RETURN COALESCE(v_is_authorized, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Create Payment Initiation
CREATE OR REPLACE FUNCTION create_payment_initiation(
  p_user_id UUID,
  p_consent_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_recipient_account TEXT,
  p_recipient_name TEXT,
  p_description TEXT
) RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  -- Validate consent
  IF NOT validate_consent_active(p_consent_id, p_user_id) THEN
    RAISE EXCEPTION 'Invalid or inactive consent';
  END IF;

  -- Create payment
  INSERT INTO obs_payment_initiations (
    id, user_id, consent_id, amount, currency,
    recipient_account, recipient_name, description,
    status, created_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_consent_id,
    p_amount,
    p_currency,
    p_recipient_account,
    p_recipient_name,
    p_description,
    'pending',
    NOW()
  ) RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Batch Expire Consents (Performance Optimized)
CREATE OR REPLACE FUNCTION batch_expire_consents(
  p_batch_size INTEGER DEFAULT 1000
) RETURNS TABLE(
  expired_count INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_count INTEGER;
BEGIN
  v_start_time := clock_timestamp();

  WITH expired AS (
    UPDATE obs_consents
    SET 
      status = 'expired',
      access_token = NULL,
      refresh_token = NULL,
      updated_at = NOW()
    WHERE id IN (
      SELECT id FROM obs_consents
      WHERE status = 'active'
        AND expires_at <= NOW()
      LIMIT p_batch_size
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  v_end_time := clock_timestamp();

  expired_count := v_count;
  execution_time_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 12. Get Expiring Consents
CREATE OR REPLACE FUNCTION get_expiring_consents(
  p_days_ahead INTEGER DEFAULT 7
) RETURNS TABLE(
  consent_id UUID,
  user_id UUID,
  data_provider_name TEXT,
  expires_at TIMESTAMP,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as consent_id,
    c.user_id,
    dp.name as data_provider_name,
    c.expires_at,
    EXTRACT(DAY FROM (c.expires_at - NOW()))::INTEGER as days_remaining
  FROM obs_consents c
  JOIN data_providers dp ON c.data_provider_id = dp.id
  WHERE c.status = 'active'
    AND c.expires_at BETWEEN NOW() AND (NOW() + (p_days_ahead || ' days')::INTERVAL)
  ORDER BY c.expires_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 13. Cleanup Old Audit Logs (7-year retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS TABLE(deleted_count BIGINT) AS $$
BEGIN
  DELETE FROM obs_consent_audit_log
  WHERE created_at < NOW() - INTERVAL '7 years';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 14. Validate PKCE Challenge
CREATE OR REPLACE FUNCTION validate_pkce_challenge(
  p_consent_id UUID,
  p_code_verifier TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_code_challenge TEXT;
  v_code_challenge_method TEXT;
  v_computed_challenge TEXT;
BEGIN
  SELECT code_challenge, code_challenge_method
  INTO v_code_challenge, v_code_challenge_method
  FROM obs_consent_pkce
  WHERE consent_id = p_consent_id;

  IF v_code_challenge IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Compute challenge from verifier
  IF v_code_challenge_method = 'S256' THEN
    v_computed_challenge := encode(digest(p_code_verifier, 'sha256'), 'base64');
    -- Base64 URL-safe encoding
    v_computed_challenge := REPLACE(REPLACE(REPLACE(v_computed_challenge, '+', '-'), '/', '_'), '=', '');
  ELSE
    v_computed_challenge := p_code_verifier;
  END IF;

  RETURN v_code_challenge = v_computed_challenge;
END;
$$ LANGUAGE plpgsql STABLE;

-- 15. Aggregate Consent Metrics
CREATE OR REPLACE FUNCTION aggregate_consent_metrics(
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP DEFAULT NOW()
) RETURNS TABLE(
  total_consents BIGINT,
  active_consents BIGINT,
  revoked_consents BIGINT,
  expired_consents BIGINT,
  avg_duration_days NUMERIC,
  top_provider TEXT,
  total_api_calls BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id) as total_consents,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_consents,
    COUNT(DISTINCT CASE WHEN c.status = 'revoked' THEN c.id END) as revoked_consents,
    COUNT(DISTINCT CASE WHEN c.status = 'expired' THEN c.id END) as expired_consents,
    AVG(EXTRACT(DAY FROM (COALESCE(c.revoked_at, c.updated_at) - c.created_at)))::NUMERIC(10,2) as avg_duration_days,
    (SELECT dp.name FROM data_providers dp
     JOIN obs_consents c2 ON c2.data_provider_id = dp.id
     GROUP BY dp.name
     ORDER BY COUNT(*) DESC
     LIMIT 1) as top_provider,
    COUNT(DISTINCT acl.id) as total_api_calls
  FROM obs_consents c
  LEFT JOIN obs_api_call_logs acl ON acl.consent_id = c.id
  WHERE c.created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- 16. Detect Anomalous API Usage
CREATE OR REPLACE FUNCTION detect_anomalous_api_usage(
  p_consent_id UUID,
  p_threshold_multiplier NUMERIC DEFAULT 3.0
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_rate NUMERIC;
  v_avg_rate NUMERIC;
  v_is_anomalous BOOLEAN;
BEGIN
  -- Calculate current hourly rate
  SELECT COUNT(*)::NUMERIC / 1.0
  INTO v_current_rate
  FROM obs_api_call_logs
  WHERE consent_id = p_consent_id
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Calculate historical average hourly rate
  SELECT COUNT(*)::NUMERIC / 
         GREATEST(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 3600, 1)
  INTO v_avg_rate
  FROM obs_api_call_logs
  WHERE consent_id = p_consent_id
    AND created_at < NOW() - INTERVAL '1 hour';

  -- Detect anomaly
  v_is_anomalous := v_current_rate > (v_avg_rate * p_threshold_multiplier);

  -- Log if anomalous
  IF v_is_anomalous THEN
    INSERT INTO security_incidents (
      id, incident_type, severity, description, metadata, created_at
    ) VALUES (
      gen_random_uuid(),
      'anomalous_api_usage',
      'medium',
      'Unusual API call volume detected',
      jsonb_build_object(
        'consent_id', p_consent_id,
        'current_rate', v_current_rate,
        'avg_rate', v_avg_rate,
        'threshold', v_avg_rate * p_threshold_multiplier
      ),
      NOW()
    );
  END IF;

  RETURN v_is_anomalous;
END;
$$ LANGUAGE plpgsql;

-- 17. Calculate Data Provider Ranking
CREATE OR REPLACE FUNCTION calculate_data_provider_ranking()
RETURNS TABLE(
  provider_name TEXT,
  provider_id UUID,
  score NUMERIC,
  uptime_pct NUMERIC,
  avg_response_ms INTEGER,
  active_consents BIGINT,
  total_api_calls BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH provider_stats AS (
    SELECT 
      dp.id,
      dp.name,
      COUNT(DISTINCT c.id) as consent_count,
      COUNT(DISTINCT acl.id) as call_count,
      COALESCE(AVG(acl.response_time_ms), 0) as avg_response,
      COALESCE(
        (SUM(CASE WHEN acl.status_code < 500 THEN 1 ELSE 0 END)::NUMERIC / 
         NULLIF(COUNT(acl.id), 0)) * 100,
        0
      ) as uptime
    FROM data_providers dp
    LEFT JOIN obs_consents c ON c.data_provider_id = dp.id AND c.status = 'active'
    LEFT JOIN obs_api_call_logs acl ON acl.data_provider_id = dp.id
      AND acl.created_at > NOW() - INTERVAL '30 days'
    WHERE dp.status = 'active'
    GROUP BY dp.id, dp.name
  )
  SELECT 
    ps.name as provider_name,
    ps.id as provider_id,
    ROUND(
      (ps.uptime * 0.4) +                    -- 40% weight on uptime
      ((100 - (ps.avg_response / 50)) * 0.3) + -- 30% weight on speed (normalize to 5s max)
      (LEAST(ps.consent_count / 100.0, 1) * 100 * 0.3), -- 30% weight on adoption
      2
    ) as score,
    ROUND(ps.uptime, 2) as uptime_pct,
    ps.avg_response::INTEGER as avg_response_ms,
    ps.consent_count as active_consents,
    ps.call_count as total_api_calls
  FROM provider_stats ps
  ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 18. Reconcile Consent Tokens (Nightly Cleanup)
CREATE OR REPLACE FUNCTION reconcile_consent_tokens()
RETURNS TABLE(
  cleaned_tokens INTEGER,
  invalid_consents INTEGER
) AS $$
DECLARE
  v_cleaned INTEGER := 0;
  v_invalid INTEGER := 0;
BEGIN
  -- Clear tokens from inactive consents
  UPDATE obs_consents
  SET 
    access_token = NULL,
    refresh_token = NULL,
    token_expires_at = NULL,
    updated_at = NOW()
  WHERE status IN ('revoked', 'expired')
    AND (access_token IS NOT NULL OR refresh_token IS NOT NULL);

  GET DIAGNOSTICS v_cleaned = ROW_COUNT;

  -- Mark consents as expired if token expired but status still active
  UPDATE obs_consents
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
    AND token_expires_at IS NOT NULL
    AND token_expires_at < NOW();

  GET DIAGNOSTICS v_invalid = ROW_COUNT;

  cleaned_tokens := v_cleaned;
  invalid_consents := v_invalid;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_consent_active TO smartpay_backend;
GRANT EXECUTE ON FUNCTION refresh_consent_token TO smartpay_backend;
GRANT EXECUTE ON FUNCTION revoke_consent_cascade TO smartpay_backend;
GRANT EXECUTE ON FUNCTION get_active_consents_count TO smartpay_backend;
GRANT EXECUTE ON FUNCTION expire_old_consents TO smartpay_backend;
GRANT EXECUTE ON FUNCTION log_ais_api_call TO smartpay_backend;
GRANT EXECUTE ON FUNCTION calculate_sla_compliance TO smartpay_backend;
GRANT EXECUTE ON FUNCTION get_consent_usage_stats TO smartpay_backend;
GRANT EXECUTE ON FUNCTION validate_tpp_authorization TO smartpay_backend;
GRANT EXECUTE ON FUNCTION create_payment_initiation TO smartpay_backend;
GRANT EXECUTE ON FUNCTION batch_expire_consents TO smartpay_backend;
GRANT EXECUTE ON FUNCTION get_expiring_consents TO smartpay_backend;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO smartpay_backend;
GRANT EXECUTE ON FUNCTION validate_pkce_challenge TO smartpay_backend;
GRANT EXECUTE ON FUNCTION aggregate_consent_metrics TO smartpay_backend;
GRANT EXECUTE ON FUNCTION detect_anomalous_api_usage TO smartpay_backend;
GRANT EXECUTE ON FUNCTION calculate_data_provider_ranking TO smartpay_backend;
GRANT EXECUTE ON FUNCTION reconcile_consent_tokens TO smartpay_backend;
```

---

### 3.2 Missing Indexes

**File:** `database/migrations/051_ais_performance_indexes.sql` *(NEW)*

```sql
-- ====================================================================
-- AIS Platform Performance Indexes
-- Purpose: Optimize query performance for consent and API call logs
-- Location: database/migrations/051_ais_performance_indexes.sql
-- ====================================================================

-- 1. Consent lookups by user and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_consents_user_status_expires
ON obs_consents(user_id, status, expires_at DESC)
WHERE status = 'active';

-- 2. Consent lookups by data provider
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_consents_provider_status
ON obs_consents(data_provider_id, status)
WHERE status = 'active';

-- 3. API call logs by consent (usage tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_api_call_logs_consent_created
ON obs_api_call_logs(consent_id, created_at DESC);

-- 4. API call logs by data provider (SLA monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_api_call_logs_provider_created
ON obs_api_call_logs(data_provider_id, created_at DESC, status_code, response_time_ms);

-- 5. Audit logs by user (compliance reporting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_audit_user_created
ON obs_consent_audit_log(user_id, created_at DESC);

-- 6. Audit logs by consent (event tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_audit_consent_event
ON obs_consent_audit_log(consent_id, event_type, created_at DESC);

-- 7. Payment initiations by user and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_payments_user_status
ON obs_payment_initiations(user_id, status, created_at DESC);

-- 8. Payment initiations by consent
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_payments_consent
ON obs_payment_initiations(consent_id, created_at DESC);

-- 9. Beneficiaries by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_beneficiaries_user
ON obs_beneficiaries(user_id, created_at DESC)
WHERE deleted_at IS NULL;

-- 10. Simulator accounts lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulator_accounts_number
ON simulator_accounts(account_number)
WHERE status = 'active';

-- 11. Simulator transactions by account
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulator_txns_account_created
ON simulator_transactions(account_id, created_at DESC);

-- 12. Data providers by status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_providers_status
ON data_providers(status, name)
WHERE status = 'active';

-- Analyze tables for query planner
ANALYZE obs_consents;
ANALYZE obs_api_call_logs;
ANALYZE obs_consent_audit_log;
ANALYZE obs_payment_initiations;
ANALYZE obs_beneficiaries;
ANALYZE data_providers;
```

---

## Part 4: Integration Points

### 4.1 Bank Simulator Connectivity

**Required Tables:**
```sql
-- File: database/migrations/052_bank_simulator_tables.sql

CREATE TABLE IF NOT EXISTS simulator_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) DEFAULT 'checking',
  balance NUMERIC(15, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'NAD',
  status VARCHAR(20) DEFAULT 'active',
  overdraft_limit NUMERIC(15, 2) DEFAULT 0.00,
  daily_limit NUMERIC(15, 2) DEFAULT 50000.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulator_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES simulator_accounts(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'debit' or 'credit'
  amount NUMERIC(15, 2) NOT NULL,
  balance_before NUMERIC(15, 2) NOT NULL,
  balance_after NUMERIC(15, 2) NOT NULL,
  description TEXT,
  reference VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_simulator_accounts_number ON simulator_accounts(account_number);
CREATE INDEX idx_simulator_txns_account ON simulator_transactions(account_id, created_at DESC);
```

**Integration Service:**
```typescript
// File: apps/smartpay-backend/src/services/bankSimulator.ts

export class BankSimulatorService {
  async createAccount(scenario: string): Promise<SimulatorAccount> {
    // Implementation in bankSimulator.ts route above
  }

  async simulateTransaction(
    accountId: string,
    type: 'debit' | 'credit',
    amount: number,
    description?: string
  ): Promise<SimulatorTransaction> {
    // Implementation in bankSimulator.ts route above
  }

  async getAccountBalance(accountId: string): Promise<number> {
    const account = await sql`
      SELECT balance FROM simulator_accounts WHERE id = ${accountId}
    `;
    return account[0]?.balance || 0;
  }

  async getTransactionHistory(
    accountId: string,
    limit: number = 50
  ): Promise<SimulatorTransaction[]> {
    const txns = await sql`
      SELECT * FROM simulator_transactions
      WHERE account_id = ${accountId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return txns;
  }
}
```

---

### 4.2 Webhook Delivery System

**File:** `apps/smartpay-backend/src/services/webhookDelivery.ts` *(NEW)*

```typescript
/**
 * Webhook Delivery Service
 * Reliable webhook delivery with retry logic
 * Location: apps/smartpay-backend/src/services/webhookDelivery.ts
 */
import crypto from 'crypto';
import { sql } from '../lib/db';

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
}

export interface WebhookSubscription {
  id: string;
  userId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}

export class WebhookDeliveryService {
  /**
   * Deliver webhook to subscriber
   */
  async deliver(
    subscriptionId: string,
    event: string,
    data: any,
    retryCount: number = 0
  ): Promise<boolean> {
    try {
      // Get subscription
      const subscription = await this.getSubscription(subscriptionId);

      if (!subscription || !subscription.isActive) {
        console.warn(`Subscription ${subscriptionId} not active`);
        return false;
      }

      // Check if event is subscribed
      if (!subscription.events.includes(event) && !subscription.events.includes('*')) {
        return false;
      }

      // Prepare payload
      const payload: WebhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
      };

      // Generate signature
      const signature = this.generateSignature(payload, subscription.secret);

      // Send webhook
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Retry': retryCount.toString(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      // Log delivery
      await this.logDelivery({
        subscriptionId,
        event,
        statusCode: response.status,
        success: response.ok,
        retryCount,
        responseTime: 0, // Track if needed
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status}`);
      }

      return true;
    } catch (error: any) {
      console.error('Webhook delivery error:', error);

      // Log failed delivery
      await this.logDelivery({
        subscriptionId,
        event,
        statusCode: 0,
        success: false,
        retryCount,
        errorMessage: error.message,
      });

      // Retry with exponential backoff
      if (retryCount < 5) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
        setTimeout(() => {
          this.deliver(subscriptionId, event, data, retryCount + 1);
        }, delay);
      }

      return false;
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Get webhook subscription
   */
  private async getSubscription(id: string): Promise<WebhookSubscription | null> {
    const result = await sql`
      SELECT * FROM webhook_subscriptions WHERE id = ${id}
    `;
    return result[0] || null;
  }

  /**
   * Log webhook delivery attempt
   */
  private async logDelivery(log: {
    subscriptionId: string;
    event: string;
    statusCode: number;
    success: boolean;
    retryCount: number;
    responseTime?: number;
    errorMessage?: string;
  }): Promise<void> {
    await sql`
      INSERT INTO webhook_delivery_logs (
        id, subscription_id, event, status_code, success,
        retry_count, response_time_ms, error_message, created_at
      ) VALUES (
        gen_random_uuid(),
        ${log.subscriptionId},
        ${log.event},
        ${log.statusCode},
        ${log.success},
        ${log.retryCount},
        ${log.responseTime || null},
        ${log.errorMessage || null},
        NOW()
      )
    `;
  }

  /**
   * Broadcast event to all subscribers
   */
  async broadcast(event: string, data: any): Promise<void> {
    const subscriptions = await sql`
      SELECT id FROM webhook_subscriptions
      WHERE is_active = true
      AND (${event} = ANY(events) OR '*' = ANY(events))
    `;

    for (const sub of subscriptions) {
      // Fire and forget (async delivery)
      this.deliver(sub.id, event, data).catch(console.error);
    }
  }
}

// Export singleton
export const webhookService = new WebhookDeliveryService();
```

**Required Table:**
```sql
-- File: database/migrations/053_webhook_tables.sql

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  events TEXT[] DEFAULT ARRAY[]::TEXT[],
  secret VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  status_code INTEGER,
  success BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_subs_user ON webhook_subscriptions(user_id);
CREATE INDEX idx_webhook_logs_sub_created ON webhook_delivery_logs(subscription_id, created_at DESC);
```

---

### 4.3 Token Management Service

**File:** `apps/smartpay-backend/src/services/tokenManagement.ts` *(NEW)*

```typescript
/**
 * Token Management Service
 * Handles OAuth token refresh and revocation
 * Location: apps/smartpay-backend/src/services/tokenManagement.ts
 */
import { sql } from '../lib/db';
import { getDataProvider } from '../lib/obsConsent';

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export class TokenManagementService {
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(consentId: string): Promise<TokenRefreshResult | null> {
    try {
      // Get consent with refresh token
      const consent = await sql`
        SELECT * FROM obs_consents
        WHERE id = ${consentId} AND status = 'active'
      `;

      if (consent.length === 0) {
        throw new Error('Consent not found or inactive');
      }

      const refreshToken = consent[0].refresh_token;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Get data provider config
      const provider = await getDataProvider(consent[0].data_provider_id);

      // Request new token from data provider
      const response = await fetch(provider.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: provider.clientId,
          client_secret: provider.clientSecret || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();

      // Update consent with new tokens
      await sql`
        UPDATE obs_consents
        SET 
          access_token = ${tokenData.access_token},
          refresh_token = ${tokenData.refresh_token || refreshToken},
          token_expires_at = NOW() + (${tokenData.expires_in} || ' seconds')::INTERVAL,
          updated_at = NOW()
        WHERE id = ${consentId}
      `;

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type || 'Bearer',
      };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Revoke all tokens for a consent
   */
  async revokeTokens(consentId: string): Promise<boolean> {
    try {
      const consent = await sql`
        SELECT * FROM obs_consents WHERE id = ${consentId}
      `;

      if (consent.length === 0) {
        return false;
      }

      const accessToken = consent[0].access_token;
      const provider = await getDataProvider(consent[0].data_provider_id);

      // Revoke at data provider
      if (provider.revokeEndpoint && accessToken) {
        await fetch(provider.revokeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: accessToken,
            client_id: provider.clientId,
            client_secret: provider.clientSecret || '',
          }),
        });
      }

      // Clear tokens locally
      await sql`
        UPDATE obs_consents
        SET 
          access_token = NULL,
          refresh_token = NULL,
          token_expires_at = NULL,
          status = 'revoked',
          updated_at = NOW()
        WHERE id = ${consentId}
      `;

      return true;
    } catch (error: any) {
      console.error('Token revocation error:', error);
      return false;
    }
  }

  /**
   * Check if token is expired and refresh if needed
   */
  async ensureValidToken(consentId: string): Promise<string | null> {
    const consent = await sql`
      SELECT * FROM obs_consents WHERE id = ${consentId} AND status = 'active'
    `;

    if (consent.length === 0) {
      return null;
    }

    const tokenExpiresAt = consent[0].token_expires_at;
    const now = new Date();

    // If token expires in <5 minutes, refresh it
    if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date(now.getTime() + 5 * 60 * 1000)) {
      const result = await this.refreshAccessToken(consentId);
      return result?.accessToken || null;
    }

    return consent[0].access_token;
  }
}

// Export singleton
export const tokenService = new TokenManagementService();
```

---

## Part 5: Testing Strategy

### 5.1 Unit Tests

**Priority Test Files:**
1. `__tests__/routes/simulator/bankSimulator.test.ts`
2. `__tests__/routes/obs/pisRoutes.test.ts`
3. `__tests__/routes/webhookManagement.test.ts`
4. `__tests__/middleware/rbac.test.ts`
5. `__tests__/services/webhookDelivery.test.ts`
6. `__tests__/services/tokenManagement.test.ts`

**Sample Test:**
```typescript
// File: apps/smartpay-backend/__tests__/routes/simulator/bankSimulator.test.ts

import request from 'supertest';
import { app } from '../../../src/index';
import { sql } from '../../../src/lib/db';

describe('Bank Simulator Routes', () => {
  const authToken = 'test-jwt-token';

  afterEach(async () => {
    // Cleanup
    await sql`DELETE FROM simulator_transactions`;
    await sql`DELETE FROM simulator_accounts`;
  });

  describe('POST /api/v1/simulator/accounts', () => {
    it('should create high-balance test account', async () => {
      const res = await request(app)
        .post('/api/v1/simulator/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scenario: 'high-balance', accountType: 'checking' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.balance).toBe(500000.00);
      expect(res.body.accountType).toBe('checking');
      expect(res.body.status).toBe('active');
    });

    it('should create frozen account', async () => {
      const res = await request(app)
        .post('/api/v1/simulator/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scenario: 'frozen-account' })
        .expect(201);

      expect(res.body.status).toBe('frozen');
    });
  });

  describe('POST /api/v1/simulator/transactions', () => {
    it('should process debit transaction', async () => {
      // Create account first
      const account = await request(app)
        .post('/api/v1/simulator/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scenario: 'high-balance' });

      const accountId = account.body.id;

      // Debit transaction
      const res = await request(app)
        .post('/api/v1/simulator/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 1000.00,
          type: 'debit',
          description: 'Test withdrawal',
        })
        .expect(200);

      expect(res.body.type).toBe('debit');
      expect(res.body.amount).toBe(1000.00);
      expect(res.body.balanceAfter).toBe(499000.00);
    });

    it('should reject debit if insufficient funds', async () => {
      const account = await request(app)
        .post('/api/v1/simulator/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scenario: 'insufficient-funds' });

      const accountId = account.body.id;

      await request(app)
        .post('/api/v1/simulator/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 100.00,
          type: 'debit',
        })
        .expect(400);
    });
  });
});
```

---

### 5.2 Integration Tests

**File:** `apps/smartpay-backend/__tests__/integration/ais-flow.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../src/index';

describe('AIS Flow Integration', () => {
  const authToken = 'test-jwt-token';
  let consentId: string;
  let accountId: string;

  it('should complete full AIS flow', async () => {
    // 1. Create simulator account
    const accountRes = await request(app)
      .post('/api/v1/simulator/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ scenario: 'high-balance' });

    accountId = accountRes.body.id;

    // 2. Initiate consent
    const consentRes = await request(app)
      .post('/api/v1/obs/consents/initiate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        dataProviderId: 'test-provider-id',
        purpose: 'ais',
        scopes: ['banking:accounts.basic.read'],
        durationDays: 90,
      })
      .expect(200);

    consentId = consentRes.body.consentId;

    // 3. Retrieve accounts
    const accountsRes = await request(app)
      .get('/api/v1/obs/ais/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ consentId })
      .expect(200);

    expect(accountsRes.body.accounts).toBeDefined();

    // 4. Get balances
    await request(app)
      .post('/api/v1/obs/ais/balances')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ consentId, accountIds: [accountId] })
      .expect(200);

    // 5. Get transactions
    await request(app)
      .get('/api/v1/obs/ais/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ consentId, accountId })
      .expect(200);

    // 6. Revoke consent
    await request(app)
      .post(`/api/v1/obs/consents/${consentId}/revoke`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

---

## Part 6: Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create bank simulator tables (migration 052)
- [ ] Implement bank simulator routes
- [ ] Create RBAC middleware
- [ ] Add dynamic rate limiter
- [ ] Create audit logger middleware
- [ ] Write unit tests for middleware

### Phase 2: Routes (Week 2)
- [ ] Complete PIS routes (beneficiaries, status, cancel)
- [ ] Enhance consent routes (history, extend, modify)
- [ ] Implement webhook management routes
- [ ] Implement token management routes
- [ ] Write unit tests for all new routes

### Phase 3: Database (Week 2-3)
- [ ] Deploy stored procedures (migration 050)
- [ ] Deploy performance indexes (migration 051)
- [ ] Create webhook tables (migration 053)
- [ ] Test all stored procedures
- [ ] Verify index performance

### Phase 4: Services (Week 3)
- [ ] Implement WebhookDeliveryService
- [ ] Implement TokenManagementService
- [ ] Implement BankSimulatorService
- [ ] Write unit tests for services
- [ ] Integration test all services

### Phase 5: Integration & Testing (Week 4)
- [ ] End-to-end AIS flow test
- [ ] End-to-end PIS flow test
- [ ] Webhook delivery test
- [ ] Token refresh test
- [ ] Load testing (100 concurrent users)
- [ ] Security audit
- [ ] Documentation update

---

## Part 7: Code Templates Repository

### 7.1 Standard Route Template

```typescript
/**
 * [Feature] Routes
 * Purpose: [Brief description]
 * Location: apps/smartpay-backend/src/routes/[feature].ts
 */
import { Router, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { sql } from '../lib/db';
import { z } from 'zod';

const router = Router();

// Request validation schema
const CreateSchema = z.object({
  // Define fields
});

/**
 * POST /api/v1/[feature]
 * [Description]
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Validate request
    const validated = CreateSchema.parse(req.body);

    // Business logic here

    return res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('[Feature] error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
```

---

## Part 8: Migration Scripts

### 8.1 Safe Migration Deployment

```bash
#!/bin/bash
# File: scripts/deploy-ais-migrations.sh

set -e

echo "=== AIS Platform Migration Deployment ==="

# Backup database
echo "Creating backup..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations in order
echo "Running migrations..."

psql $DATABASE_URL -f database/migrations/050_ais_stored_procedures.sql
psql $DATABASE_URL -f database/migrations/051_ais_performance_indexes.sql
psql $DATABASE_URL -f database/migrations/052_bank_simulator_tables.sql
psql $DATABASE_URL -f database/migrations/053_webhook_tables.sql

echo "Migrations complete!"

# Verify
echo "Verifying stored procedures..."
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'validate_consent%';"

echo "Verifying indexes..."
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_obs_%';"

echo "=== Deployment Complete ==="
```

---

## Summary & Next Steps

**Estimated Effort:**
- Routes: 40 hours
- Middleware: 24 hours
- Database: 32 hours
- Services: 24 hours
- Testing: 40 hours
- **Total:** 160 hours (4 weeks with 1 engineer)

**Critical Path:**
1. Week 1: Middleware + Bank Simulator
2. Week 2: Routes + Database
3. Week 3: Services + Integration
4. Week 4: Testing + Documentation

**Dependencies:**
- All routes depend on RBAC middleware
- Webhook routes depend on WebhookDeliveryService
- PIS routes depend on TokenManagementService
- All features depend on stored procedures

**Risk Mitigation:**
- Incremental deployment (feature flags)
- Comprehensive test coverage (>80%)
- Rollback scripts for each migration
- Monitoring alerts for new endpoints

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-22  
**Status:** Ready for Implementation
