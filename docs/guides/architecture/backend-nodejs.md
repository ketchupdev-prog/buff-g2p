# Rate Limiter Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SMARTPAY RATE LIMITING SYSTEM                   │
│                        (Unified YAML Config)                        │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │      shared_config/rate_limits.yaml (312 lines)                 │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │  version: "1.0"                                           │ │ │
│  │  │  global:                                                  │ │ │
│  │  │    default: { capacity: 1000, refill_rate: 0.2778 }      │ │ │
│  │  │  endpoints:                                               │ │ │
│  │  │    copilot_chat: { capacity: 100, refill_rate: 0.1111 }  │ │ │
│  │  │    payments_initiate: { capacity: 10, ... }              │ │ │
│  │  │    transactions_list: { capacity: 60, ... }              │ │ │
│  │  │    [15 more endpoints...]                                │ │ │
│  │  │  skip_paths: ["/", "/health", "/docs", ...]              │ │ │
│  │  │  environments: { development, staging, production }      │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│   TYPESCRIPT BACKEND           │  │   PYTHON BACKEND               │
│   (Node.js/Express)            │  │   (FastAPI)                    │
│                                │  │                                │
│  ┌──────────────────────────┐ │  │  ┌──────────────────────────┐ │
│  │ sharedRateLimiter.ts     │ │  │  │ rate_limiter.py          │ │
│  │ (531 lines)              │ │  │  │ (539 lines)              │ │
│  │                          │ │  │  │                          │ │
│  │ ┌──────────────────────┐ │ │  │  │ ┌──────────────────────┐ │ │
│  │ │ RateLimitConfigLoader│ │ │  │  │ │ RateLimitConfig      │ │ │
│  │ │  - loads YAML        │ │ │  │  │ │  - loads YAML        │ │ │
│  │ │  - env overrides     │ │ │  │  │ │  - env overrides     │ │ │
│  │ └──────────────────────┘ │ │  │  │ └──────────────────────┘ │ │
│  │                          │ │  │  │                          │ │
│  │ ┌──────────────────────┐ │ │  │  │ ┌──────────────────────┐ │ │
│  │ │ TokenBucket          │ │ │  │  │ │ TokenBucket          │ │ │
│  │ │  - burst capacity    │ │ │  │  │ │  - burst capacity    │ │ │
│  │ │  - refill rate       │ │ │  │  │ │  - refill rate       │ │ │
│  │ └──────────────────────┘ │ │  │  │ └──────────────────────┘ │ │
│  │                          │ │  │  │                          │ │
│  │ ┌──────────────────────┐ │ │  │  │ ┌──────────────────────┐ │ │
│  │ │ FixedWindow          │ │ │  │  │ │ FixedWindow          │ │ │
│  │ │  - time windows      │ │ │  │  │ │  - time windows      │ │ │
│  │ │  - request counting  │ │ │  │  │ │  - request counting  │ │ │
│  │ └──────────────────────┘ │ │  │  │ └──────────────────────┘ │ │
│  │                          │ │  │  │                          │ │
│  │ ┌──────────────────────┐ │ │  │  │ ┌──────────────────────┐ │ │
│  │ │ InMemoryRateLimiter  │ │ │  │  │ │ InMemoryRateLimiter  │ │ │
│  │ │  - Map storage       │ │ │  │  │ │  - Dict storage      │ │ │
│  │ │  - auto cleanup      │ │ │  │  │ │  - auto cleanup      │ │ │
│  │ └──────────────────────┘ │ │  │  │ └──────────────────────┘ │ │
│  └──────────────────────────┘ │  │  └──────────────────────────┘ │
│                                │  │                                │
│  ┌──────────────────────────┐ │  │  ┌──────────────────────────┐ │
│  │ rateLimiter.ts (17 lines)│ │  │  │ ConfigurableMiddleware   │ │
│  │ - re-exports from above  │ │  │  │ - FastAPI middleware     │ │
│  └──────────────────────────┘ │  │  └──────────────────────────┘ │
└────────────────────────────────┘  └────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                              │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ index.ts    │  │copilot      │  │ knowledge   │  │ buffr.ts   │ │
│  │ (global)    │  │Endpoint.ts  │  │ Base.ts     │  │            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ sendMoney   │  │ loans.ts    │  │ vouchers.ts │  │incidents.ts│ │
│  │ .ts         │  │             │  │             │  │            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │proofOfLife  │  │ groups.ts   │  │ invite.ts   │                 │
│  │ .ts         │  │             │  │             │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                       │
│  All use: strictRateLimiter, standardRateLimiter,                   │
│           lenientRateLimiter, moderateRateLimiter                   │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        STORAGE & LOGGING                              │
│                                                                       │
│  ┌──────────────────────────┐   ┌──────────────────────────────┐    │
│  │  In-Memory Cache         │   │  PostgreSQL Database         │    │
│  │  ┌────────────────────┐  │   │  ┌────────────────────────┐ │    │
│  │  │ Map<key, Limiter>  │  │   │  │ copilot_security_events│ │    │
│  │  │ - per user/IP      │  │   │  │   - event_type         │ │    │
│  │  │ - auto cleanup     │  │   │  │   - severity           │ │    │
│  │  │ - 5 min interval   │  │   │  │   - user_id            │ │    │
│  │  └────────────────────┘  │   │  │   - details (JSON)     │ │    │
│  └──────────────────────────┘   │  └────────────────────────┘ │    │
│                                  └──────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Future: Redis (for distributed rate limiting)              │   │
│  │  - Shared across multiple instances                         │   │
│  │  - Persistent rate limit state                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

## Request Flow

```
┌──────────────┐
│ HTTP Request │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Express Middleware Chain                                 │
│    - securityHeaders                                        │
│    - corsMiddleware                                         │
│    - requestLogger                                          │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Rate Limiter Middleware (sharedRateLimiter.ts)          │
│                                                             │
│    ┌─────────────────────────────────────────────────┐    │
│    │ A. Check if path should skip rate limiting      │    │
│    │    - /health, /docs, etc.                       │    │
│    └─────────────────────────────────────────────────┘    │
│                        │                                    │
│                        ▼                                    │
│    ┌─────────────────────────────────────────────────┐    │
│    │ B. Get identifier (user ID or IP)               │    │
│    │    - Extract from JWT token                     │    │
│    │    - Fallback to IP address                     │    │
│    └─────────────────────────────────────────────────┘    │
│                        │                                    │
│                        ▼                                    │
│    ┌─────────────────────────────────────────────────┐    │
│    │ C. Load YAML config for endpoint                │    │
│    │    - Match request path to endpoint config      │    │
│    │    - Apply environment overrides                │    │
│    │    - Get algorithm (token_bucket/fixed_window)  │    │
│    └─────────────────────────────────────────────────┘    │
│                        │                                    │
│                        ▼                                    │
│    ┌─────────────────────────────────────────────────┐    │
│    │ D. Check rate limit                             │    │
│    │    - Get/create limiter for key                 │    │
│    │    - Try to consume token/request               │    │
│    │    - Calculate remaining & retry_after          │    │
│    └─────────────────────────────────────────────────┘    │
│                        │                                    │
│             ┌──────────┴──────────┐                        │
│             │                     │                        │
│             ▼                     ▼                        │
│    ┌─────────────┐      ┌────────────────┐               │
│    │  ALLOWED    │      │  RATE LIMITED  │               │
│    │  (200/201)  │      │    (429)       │               │
│    └──────┬──────┘      └────────┬───────┘               │
│           │                      │                        │
│           ▼                      ▼                        │
│    ┌─────────────┐      ┌────────────────┐               │
│    │ Add Headers │      │ Log Violation  │               │
│    │ - Limit     │      │ - DB insert    │               │
│    │ - Remaining │      │ - User/IP/path │               │
│    │ - Reset     │      │ - Severity     │               │
│    └──────┬──────┘      └────────┬───────┘               │
│           │                      │                        │
└───────────┼──────────────────────┼───────────────────────┘
            │                      │
            ▼                      ▼
┌──────────────────┐      ┌──────────────────┐
│ 3. Route Handler │      │ 3. Error Response│
│    - Process req │      │    - 429 status  │
│    - Return data │      │    - Retry-After │
└──────────────────┘      └──────────────────┘
```

## Algorithm Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOKEN BUCKET ALGORITHM                      │
│                                                                 │
│  Time ──────────────────────────────────────────────────────>  │
│                                                                 │
│  Bucket Capacity: 100 tokens                                   │
│  Refill Rate: 0.1111 tokens/second (100 per 15 minutes)       │
│                                                                 │
│  [████████████████████████] 100 tokens (full)                  │
│   ▼ Request (consume 1)                                        │
│  [███████████████████████ ] 99 tokens                          │
│   ▼ Request (consume 1)                                        │
│  [██████████████████████  ] 98 tokens                          │
│   ... (multiple rapid requests)                                │
│  [██                      ] 2 tokens                           │
│   ▼ Request (consume 1)                                        │
│  [█                       ] 1 token                            │
│   ▼ Request (consume 1)                                        │
│  [                        ] 0 tokens ❌ RATE LIMITED            │
│                                                                 │
│  Wait ~9 seconds... (refill to 1 token)                        │
│  [█                       ] 1 token ✅ ALLOWED                  │
│                                                                 │
│  Advantages:                                                   │
│  ✓ Allows bursts while maintaining average rate               │
│  ✓ Smooth rate limiting                                       │
│  ✓ Tokens continuously refill                                 │
│                                                                 │
│  Best For:                                                     │
│  - APIs with occasional bursts                                │
│  - User-facing endpoints                                      │
│  - Flexible rate limiting                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FIXED WINDOW ALGORITHM                       │
│                                                                 │
│  Window 1 (15 min)        Window 2 (15 min)                    │
│  ├───────────────────────┤├───────────────────────┤            │
│  │                       ││                       │            │
│  │ Request 1  ✅          ││                       │            │
│  │ Request 2  ✅          ││                       │            │
│  │ Request 3  ✅          ││                       │            │
│  │ ... (up to 100)       ││                       │            │
│  │ Request 100 ✅         ││                       │            │
│  │ Request 101 ❌ LIMITED ││                       │            │
│  │                       ││ Window resets         │            │
│  │                       ││ Request 1  ✅ (new)   │            │
│  └───────────────────────┘└───────────────────────┘            │
│                                                                 │
│  Max Requests: 100 per window                                  │
│  Window Duration: 900,000ms (15 minutes)                       │
│                                                                 │
│  Advantages:                                                   │
│  ✓ Simple to understand                                       │
│  ✓ Predictable behavior                                       │
│  ✓ Easy to explain to users                                   │
│                                                                 │
│  Best For:                                                     │
│  - Strict rate limits                                         │
│  - Authentication endpoints                                   │
│  - Critical operations                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Override Flow

```
┌──────────────────────────────────────────────────────────┐
│ Configuration Loading Process                            │
└──────────────────────────────────────────────────────────┘

1. Load base YAML config
   ↓
   shared_config/rate_limits.yaml
   ├── version: "1.0"
   ├── global:
   │   └── default: { capacity: 1000, refill_rate: 0.2778 }
   ├── endpoints: { ... }
   └── environments: { development, staging, production }

2. Detect environment
   ↓
   process.env.NODE_ENV = "development" | "staging" | "production"

3. Apply environment overrides (deep merge)
   ↓
   ┌─────────────────────────────────────────────────────┐
   │ Development (10x more lenient)                      │
   │   capacity: 10000 (was 1000)                        │
   │   refill_rate: 2.778 (was 0.2778)                   │
   └─────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────┐
   │ Staging (5x more lenient)                           │
   │   capacity: 5000 (was 1000)                         │
   │   refill_rate: 1.389 (was 0.2778)                   │
   └─────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────┐
   │ Production (strict, as defined)                     │
   │   capacity: 1000                                    │
   │   refill_rate: 0.2778                               │
   │   redis: { enabled: true }                          │
   │   security_logging: { enabled: true }               │
   └─────────────────────────────────────────────────────┘

4. Create rate limiters with merged config
   ↓
   strictRateLimiter, standardRateLimiter, etc.
```

## Memory Management

```
┌──────────────────────────────────────────────────────────────┐
│ In-Memory Rate Limiter State                                │
│                                                              │
│  Map<key, Limiter>                                          │
│  ├── "user:123:/api/copilot" → TokenBucket                 │
│  ├── "user:456:/api/copilot" → TokenBucket                 │
│  ├── "ip:192.168.1.1:/api/health" → TokenBucket            │
│  └── ... (grows with unique user/IP + endpoint combos)     │
│                                                              │
│  Automatic Cleanup (every 5 minutes)                        │
│  ┌────────────────────────────────────────────────┐        │
│  │ 1. Check each bucket's activity                │        │
│  │    - TokenBucket: tokens < capacity (active)   │        │
│  │    - FixedWindow: count > 0 (active)           │        │
│  │                                                 │        │
│  │ 2. Remove inactive buckets                     │        │
│  │    - Full TokenBuckets (not used recently)     │        │
│  │    - Empty FixedWindows (window expired)       │        │
│  │                                                 │        │
│  │ 3. Log cleanup results                         │        │
│  │    "Cleaned up N inactive rate limit buckets"  │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  Memory Growth Prevention                                   │
│  ✓ Periodic cleanup prevents memory leaks                  │
│  ✓ Only active rate limiters kept in memory                │
│  ✓ Scales with concurrent users, not total users           │
└──────────────────────────────────────────────────────────────┘
```

## Security Event Logging

```
┌────────────────────────────────────────────────────────────┐
│ Rate Limit Violation Flow                                 │
└────────────────────────────────────────────────────────────┘

User makes request
   │
   ▼
Rate limiter checks → LIMIT EXCEEDED
   │
   ▼
┌─────────────────────────────────────────────────────────┐
│ Log to copilot_security_events table                    │
│                                                         │
│  INSERT INTO copilot_security_events (                 │
│    user_id,          -- User who exceeded limit        │
│    session_id,       -- Current session                │
│    event_type,       -- 'rate_limit_exceeded'          │
│    severity,         -- Based on endpoint security     │
│    details,          -- JSON with full context         │
│    auto_blocked,     -- true (automatic action)        │
│    created_at        -- Timestamp                      │
│  )                                                      │
│                                                         │
│  Severity Mapping:                                      │
│  - critical → high   (payments, transfers, auth)       │
│  - high → medium     (2FA, admin ops)                  │
│  - default → medium  (copilot, ML endpoints)           │
└─────────────────────────────────────────────────────────┘
   │
   ▼
Return 429 response to user
   │
   ▼
┌─────────────────────────────────────────────────────────┐
│ Security Team Dashboard                                 │
│                                                         │
│  SELECT * FROM copilot_security_events                 │
│  WHERE event_type = 'rate_limit_exceeded'              │
│  ORDER BY created_at DESC                              │
│                                                         │
│  → Monitor for:                                        │
│    - Repeated violations (potential attack)            │
│    - High-severity endpoint abuse                      │
│    - IP patterns (distributed attacks)                 │
│    - Time patterns (coordinated attempts)              │
└─────────────────────────────────────────────────────────┘
```

## Benefits Summary

```
┌──────────────────────────────────────────────────────────┐
│ ✅ SINGLE SOURCE OF TRUTH                               │
│    All rate limits in one YAML file                     │
│    Python and TypeScript read same config               │
│                                                          │
│ ✅ MAINTAINABILITY                                       │
│    Change limits without code changes                   │
│    No redeployment needed (with hot reload)             │
│                                                          │
│ ✅ CONSISTENCY                                           │
│    Same behavior across all backends                    │
│    Environment-specific overrides                       │
│                                                          │
│ ✅ OBSERVABILITY                                         │
│    Rate limit headers on all responses                  │
│    Security event logging                               │
│    Violation tracking                                   │
│                                                          │
│ ✅ SECURITY                                              │
│    Per-user and per-IP limiting                         │
│    Severity classification                              │
│    Automatic blocking for critical endpoints            │
│                                                          │
│ ✅ SCALABILITY                                           │
│    Ready for Redis backend                              │
│    Memory-efficient with cleanup                        │
│    Supports distributed deployments                     │
│                                                          │
│ ✅ FLEXIBILITY                                           │
│    Multiple algorithms (token bucket, fixed window)     │
│    Per-endpoint configuration                           │
│    Custom error messages                                │
└──────────────────────────────────────────────────────────┘
```
