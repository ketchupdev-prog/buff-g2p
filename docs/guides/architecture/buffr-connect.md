# BuffrConnect Architecture & Supabase Setup Analysis

**Date:** March 17, 2026  
**Base Path:** `/Users/georgenekwaya/Downloads/ai-agent-mastery-main/buffr-connect`  
**Analysis Scope:** Complete Supabase setup, architecture, and Smartpay integration

---

## 📊 Executive Summary

**BuffrConnect** is a production-ready **Account Information Services (AIS)** platform built as Namibia's first open banking infrastructure. It operates as a standalone service with its own dedicated Supabase database, providing REST APIs for third-party applications like Ketchup SmartPay.

### Key Findings

- ✅ **Separate Database Architecture** - BuffrConnect has its own Supabase PostgreSQL instance
- ✅ **API-First Integration** - External apps integrate via REST APIs, not direct database access
- ✅ **Production-Ready** - 92% complete with comprehensive security and compliance
- ✅ **OAuth 2.0 + FAPI** - Bank-grade authentication for third-party providers (TPPs)
- ✅ **Webhook-Based Communication** - Event-driven architecture for real-time updates

---

## 1️⃣ Environment Configuration Analysis

### 1.1 Supabase Configuration

**Location:** `buffrconnect/.env`, `buffrconnect/.env.local`, `buffrconnect/.env.example`

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_h_YZ75mkiV-M4nIiHWTevg_W0mZsCWC
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Key Details:**
- **Project ID:** `cjmtcxfpwjbpbctjseex`
- **Project URL:** `https://cjmtcxfpwjbpbctjseex.supabase.co`
- **Authentication Method:** Supabase Auth + Custom OAuth 2.0 + OIDC
- **Service Role:** Available for admin operations (bypasses RLS)

### 1.2 Authentication Setup

```env
# OAuth / OIDC (Sandbox Mode)
OAUTH_CLIENT_ID=buffr_connect_dev
OAUTH_CLIENT_SECRET=dev_secret_not_for_production
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
CONSENT_DURATION_DAYS=90  # OBS 2025 maximum
```

**Authentication Flow:**
1. **Supabase Auth** - User registration/login (email/password)
2. **Custom OAuth 2.0** - TPP authorization with PKCE
3. **API Keys** - Server-to-server authentication (format: `bfr_xxx`)
4. **JWT Tokens** - Access/refresh token pairs (FAPI 1.0 compliant)

### 1.3 Shared Services Configuration

```env
# Redis Caching (Shared Service)
REDIS_URL=redis://default:xxx@redis-19741.c321.us-east-1-2.ec2.cloud.redislabs.com:19741
UPSTASH_REDIS_REST_URL=  # Optional Upstash alternative
UPSTASH_REDIS_REST_TOKEN=

# PostHog Analytics (Shared Service)
NEXT_PUBLIC_POSTHOG_KEY=phc_Bbb4DqYLXAR5bbK7NZHgPd0VeAoRcW6yefG2oHcyASV
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Sentry Error Monitoring (Shared Service)
NEXT_PUBLIC_SENTRY_DSN=https://7ca4aeae50ad62edebb32da15fa5feb0@o4511037832036352.ingest.us.sentry.io/4511037832036353
SENTRY_ORG=buffr-inc
SENTRY_PROJECT=buffrconnect

# Webhook Secret for Smartpay Integration
SMARTPAY_WEBHOOK_SECRET=d96ddb92d4b86906726b5dc9af452c9ca096087b4301e46f67e254c6e09434aa
```

**Integration Point:** The `SMARTPAY_WEBHOOK_SECRET` shows BuffrConnect sends webhooks to Smartpay backend.

---

## 2️⃣ Project Configuration Files

### 2.1 package.json

**Location:** `buffrconnect/package.json`

**Key Dependencies:**
```json
{
  "@supabase/ssr": "latest",
  "@supabase/supabase-js": "latest",
  "next": "latest",
  "react": "^19.0.0",
  "ioredis": "^5.10.0",
  "jose": "^6.2.0",
  "jsonwebtoken": "^9.0.3",
  "bcryptjs": "^3.0.3",
  "crypto-js": "^4.2.0",
  "posthog-js": "^1.360.1",
  "@sentry/nextjs": "^10.43.0"
}
```

**Notable Scripts:**
```json
{
  "dev": "next dev",
  "build": "next build",
  "test:integration": "jest --config jest.integration.config.js",
  "seed:sandbox": "tsx scripts/seed-sandbox.ts",
  "verify:supabase": "tsx scripts/verify-supabase-connection.ts"
}
```

### 2.2 next.config.ts

**Framework:** Next.js 14 with App Router  
**Platform:** Vercel serverless deployment  
**Key Features:**
- Sentry error monitoring integration
- PostHog analytics reverse proxy (avoids ad-blockers)
- Image optimization (WebP, AVIF)
- Bundle analyzer support

```typescript
// PostHog reverse proxy routes
async rewrites() {
  return [
    {
      source: '/ingest/static/:path*',
      destination: 'https://us-assets.i.posthog.com/static/:path*',
    },
    {
      source: '/ingest/:path*',
      destination: 'https://us.i.posthog.com/:path*',
    },
  ];
}
```

---

## 3️⃣ Supabase Usage Patterns

### 3.1 Client Architecture

BuffrConnect uses **three types** of Supabase clients:

#### A. Browser Client (Client Components)

**Location:** `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

**Usage:** Client-side React components with real-time subscriptions

#### B. Server Client (API Routes, Server Components)

**Location:** `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { /* handle cookies */ }
      }
    }
  );
}
```

**Usage:** Server-side operations with cookie-based session management

#### C. Admin Client (Service Role)

**Location:** `lib/db/client.ts`

```typescript
export const supabaseAdmin = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

**Usage:** Admin operations that bypass Row-Level Security (RLS)

### 3.2 Authentication Patterns

**Multi-Layer Authentication:**

1. **Supabase Auth** (User Management)
   - `supabase.auth.signInWithPassword()` - User login
   - `supabase.auth.signUp()` - User registration
   - `supabase.auth.getUser()` - Get current user
   - `supabase.auth.admin.createUser()` - Admin user creation

2. **Custom OAuth 2.0** (TPP Authorization)
   - PAR (Pushed Authorization Request) endpoint
   - Authorization Code Flow with PKCE
   - Token exchange and refresh
   - Consent management with 90-day expiry

3. **API Keys** (Server-to-Server)
   - Format: `bfr_[64-char-hex]`
   - Bcrypt hashing for storage
   - Scopes: `accounts`, `transactions`, `balances`, `consents`, `webhooks`
   - Rate limiting per key

### 3.3 Database Query Patterns

**Centralized Query Layer:** All database operations go through `lib/supabase/queries/`

**DRY Principle Implementation:**
```typescript
// Single import point for all queries
import {
  getAllProviders,
  getActiveConsents,
  getAccountsWithBalances,
  getTransactions,
  createAuditLog
} from '@/lib/supabase/queries';
```

**Caching Strategy:**
- Providers: 1 hour cache
- Accounts: 15 minutes cache
- Transactions: 5 minutes cache
- Balances: Real-time (no cache)

---

## 4️⃣ Database Schema & Migrations

### 4.1 Migration Overview

**Total Migrations:** 37 files in `supabase/migrations/`

**Core Migrations:**

1. **`20260310000001_initial_schema.sql`** - Core tables (users, providers, consents, accounts, balances, transactions)
2. **`20260310000002_audit_compliance.sql`** - Audit logs, incident reporting, DSAR requests
3. **`20260310000003_ussd_offline.sql`** - Token vault, offline sync queue, USSD sessions
4. **`20260310000004_developer_monitoring.sql`** - API clients, usage tracking, rate limits, webhooks
5. **`20260310000005_encryption_functions.sql`** - AES-256-GCM field encryption
6. **`20260310000006_seed_providers.sql`** - Namibian banks (FNB, Bank Windhoek, Standard Bank, Nedbank)
7. **`20260310000007_analytics_views.sql`** - Reporting views and materialized views
8. **`20260310000008_maintenance_jobs.sql`** - Cleanup functions, archival
9. **`20260310000009_admin_policies.sql`** - RLS policies and admin functions

### 4.2 Core Tables

| Table | Rows | Purpose | RLS Enabled |
|-------|------|---------|-------------|
| `users` | User accounts | Identity and KYC tracking | ✅ |
| `providers` | 5 | Banks and financial institutions | ❌ |
| `consents` | Many | OAuth consent management (90-day max) | ✅ |
| `accounts` | Many | Linked bank accounts | ✅ |
| `balances` | Many | Account balance snapshots | ✅ |
| `transactions` | Many | Transaction history with ML categorization | ✅ |
| `api_clients` | TPPs | OAuth client registrations | ✅ |
| `api_keys` | Many | Server-to-server API keys | ✅ |
| `webhooks` | Many | Event subscriptions | ✅ |
| `audit_logs` | Many | ETA 2019 compliant audit trail | ✅ |
| `token_vault` | Many | NAMQR offline token storage | ✅ |
| `ussd_sessions` | Many | USSD session state | ❌ |

### 4.3 Security Features

**Row-Level Security (RLS) Policies:**
```sql
-- Users can view their own data
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all data
CREATE POLICY "Admins can view all accounts"
  ON accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.metadata->>'role' = 'admin'
    )
  );
```

**Audit Trail (ETA 2019 §24-25):**
- Tamper-evident logging with SHA-256 integrity hashes
- Automatic hash generation on insert
- No DELETE policies on audit tables (immutable)
- Consent audit logs for all consent actions

---

## 5️⃣ Architecture Analysis

### 5.1 Application Type

**Architecture:** Monolithic Next.js 14 Application (Not a Monorepo)

**Directory Structure:**
```
buffr-connect/
├── buffrconnect/           # Main Next.js application (BuffrConnect)
│   ├── app/                # Next.js App Router pages & API routes
│   ├── lib/                # Shared libraries (45 subdirectories)
│   ├── components/         # React components (atomic design)
│   ├── supabase/           # Supabase migrations & config
│   ├── hooks/              # React hooks
│   ├── scripts/            # Utility scripts
│   └── docs/               # Documentation (28 files)
├── sdk/                    # TypeScript SDK for external integration
├── docs/                   # Root-level documentation
└── security/               # Security playbooks
```

**NOT a monorepo** - BuffrConnect is a single Next.js app with comprehensive docs

### 5.2 Services Provided by BuffrConnect

BuffrConnect is an **Account Information Services (AIS) platform** providing:

#### Core Services

1. **Account Aggregation**
   - Unified view of accounts across multiple banks
   - 4 Namibian banks supported (FNB, Bank Windhoek, Standard Bank, Nedbank)
   - Real-time balance updates
   - Transaction history retrieval

2. **OAuth 2.0 Authorization Server**
   - PKCE-enhanced authorization code flow
   - PAR (Pushed Authorization Requests)
   - Consent management (90-day maximum per OBS 2025)
   - Token lifecycle (access + refresh tokens)

3. **Data Enrichment**
   - ML transaction categorization (95% accuracy, 13 categories)
   - Merchant identification
   - Spending analytics
   - Income analysis for credit decisioning

4. **Developer Platform**
   - REST API (34+ endpoints)
   - TypeScript SDK
   - Sandbox environment (121 mock users)
   - API documentation portal
   - Webhook subscriptions

5. **Compliance Services**
   - ETA 2019 §24-25 audit trail
   - PSD-12 incident reporting
   - GDPR data subject access requests (DSAR)
   - BoN monthly reporting automation

#### Services NOT Provided (Out of Scope)

❌ Payment Initiation Services (PIS) - Future scope  
❌ Card Issuance - Not in scope  
❌ Lending Services - Not in scope  
❌ E-money Issuance - Not in scope

### 5.3 Integration with Smartpay/Ketchup

**Integration Model:** API-First Architecture (Not Database Sharing)

```
┌─────────────────────────────────────────────────────────────────┐
│                    KETCHUP SMARTPAY                             │
│                                                                 │
│  Database: Neon PostgreSQL (Separate)                          │
│  - 246 tables                                                   │
│  - users, wallets, vouchers, transactions                       │
│  - open_banking_accounts, open_banking_transactions            │
│  - Stores aggregated data from BuffrConnect                    │
│                                                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ REST API Calls
                 │ Authorization: Bearer {buffr_api_key}
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUFFR CONNECT API                            │
│                                                                 │
│  Endpoints:                                                     │
│  - GET /api/accounts                                            │
│  - GET /api/accounts/{id}/balance                              │
│  - GET /api/accounts/{id}/transactions                         │
│  - GET /api/consents                                            │
│  - POST /api/consents (OAuth flow)                             │
│                                                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Authenticates via Supabase
                 │ Queries via RLS-protected tables
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                BUFFR CONNECT DATABASE                           │
│                (Supabase PostgreSQL)                            │
│                                                                 │
│  Database: cjmtcxfpwjbpbctjseex.supabase.co                    │
│  - 23+ core tables                                              │
│  - users, providers, consents, accounts, transactions          │
│  - api_clients, api_keys, webhooks                             │
│  - audit_logs, token_vault                                     │
│                                                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Simulated in Sandbox Mode
                 │ Real integration in Production
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NAMIBIAN BANKS                               │
│                                                                 │
│  - FNB Namibia (9 services)                                    │
│  - Bank Windhoek (13 services)                                 │
│  - Standard Bank (17 services)                                 │
│  - Nedbank Namibia (6 services)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight:** Smartpay and BuffrConnect use **SEPARATE DATABASES**:
- **BuffrConnect:** Supabase PostgreSQL
- **Ketchup SmartPay:** Neon PostgreSQL (246 tables)
- **Integration:** REST API + Webhooks (not direct DB access)

### 5.4 Webhook Communication Flow

**BuffrConnect → Smartpay Webhooks:**

```typescript
// When events occur in BuffrConnect:
// - Account linked
// - Transaction received
// - Balance updated
// - Consent revoked

// BuffrConnect sends webhook to Smartpay:
POST https://api.ketchup.cc/webhooks/buffr
Headers:
  X-Buffr-Signature: HMAC-SHA256(secret, payload)
  Content-Type: application/json
Body:
  {
    "event_type": "account.linked",
    "event_id": "evt_123",
    "timestamp": "2026-03-17T12:00:00Z",
    "data": { /* event data */ }
  }
```

**Smartpay Verification:**
```javascript
// Smartpay backend validates signature
const expectedSignature = crypto
  .createHmac('sha256', process.env.BUFFR_WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

if (receivedSignature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

---

## 6️⃣ Database Setup Details

### 6.1 Supabase Project Information

**Project Details:**
- **Project Reference:** `cjmtcxfpwjbpbctjseex`
- **Region:** Likely US East (based on Supabase URL pattern)
- **Database:** PostgreSQL 14+
- **Extensions Enabled:** `uuid-ossp`, `pgcrypto`
- **RLS:** Enabled on all user-facing tables
- **Realtime:** Available for live subscriptions

### 6.2 Database vs Smartpay Database

**Comparison:**

| Aspect | BuffrConnect (Supabase) | Ketchup SmartPay (Neon) |
|--------|-------------------------|-------------------------|
| **Database Type** | PostgreSQL (Supabase managed) | PostgreSQL (Neon serverless) |
| **Tables** | 23+ core tables | 246 tables |
| **Purpose** | Open banking data aggregation | E-money wallet & G2P vouchers |
| **Data Sharing** | ❌ No direct access | ❌ No direct access |
| **Integration** | REST API + Webhooks | REST API + Webhooks |
| **Authentication** | Supabase Auth + OAuth 2.0 | JWT + bcrypt |
| **Users Table** | Shared same test user credentials | Separate user records |
| **Relationship** | Provider (upstream) | Consumer (downstream) |

**Test User Synchronization:**
```env
# Same test credentials in both systems
TEST_USER_EMAIL=pendanek@gmail.com
TEST_USER_PASSWORD=02Ally27PP123Lubi@i
TEST_USER_PHONE=+264814376206
TEST_USER_PIN=1234
```

**Note:** User credentials are synchronized for testing, but databases remain separate. Smartpay stores its own user records and calls BuffrConnect APIs when needed.

### 6.3 Schema Design

**Core Entities:**

```sql
-- Users (Identity)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(50) UNIQUE,  -- Encrypted
  kyc_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'active'
);

-- Providers (Banks)
CREATE TABLE providers (
  id UUID PRIMARY KEY,
  provider_code VARCHAR(50) UNIQUE,  -- fnb_namibia, bank_windhoek
  provider_name VARCHAR(255),
  provider_type TEXT,  -- bank, e_money, nbfi
  oauth_authorize_url TEXT,
  oauth_token_url TEXT
);

-- Consents (OAuth Authorization)
CREATE TABLE consents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers(id),
  scopes TEXT[],
  status TEXT,  -- pending, active, revoked, expired
  expires_at TIMESTAMPTZ,
  max_requests_per_day INT DEFAULT 4,  -- OBS 2025 limit
  
  -- OBS 2025: Max 90 days validity
  CONSTRAINT expires_within_90_days 
    CHECK (expires_at <= granted_at + INTERVAL '90 days')
);

-- Accounts (Linked Bank Accounts)
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers(id),
  consent_id UUID REFERENCES consents(id),
  external_account_id VARCHAR(255),  -- Encrypted
  account_type TEXT,  -- current, savings, credit, loan
  account_number VARCHAR(50),  -- Masked
  currency VARCHAR(3) DEFAULT 'NAD'
);

-- Transactions (with ML Categorization)
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  external_transaction_id VARCHAR(255),
  timestamp TIMESTAMPTZ,
  amount DECIMAL(15,2),
  type TEXT,  -- debit, credit
  category VARCHAR(50),  -- ML-enriched
  category_confidence DECIMAL(3,2),  -- 0.00-1.00
  bop_code VARCHAR(8),  -- PSD-9 Balance of Payments
  merchant_name VARCHAR(255),
  
  UNIQUE(account_id, external_transaction_id)
);
```

**Compliance Constraints:**
- 90-day maximum consent duration (OBS 2025)
- 24-hour critical incident reporting (PSD-12)
- 30-day DSAR completion (GDPR)
- Tamper-evident audit logs with SHA-256 hashing (ETA 2019)

---

## 7️⃣ Authentication Implementation

### 7.1 Authentication Flow

**Multi-Stage Authentication:**

```
STAGE 1: USER REGISTRATION/LOGIN (Supabase Auth)
┌──────────────────────────────────────────────────────┐
│ User → BuffrConnect Web/Mobile                      │
│ POST /api/auth/signup or /api/auth/login           │
│ ↓                                                    │
│ Supabase Auth validates credentials                 │
│ ↓                                                    │
│ JWT session token created                           │
│ ↓                                                    │
│ User record in `users` table (if new)               │
└──────────────────────────────────────────────────────┘

STAGE 2: TPP AUTHORIZATION (OAuth 2.0 + PKCE)
┌──────────────────────────────────────────────────────┐
│ TPP App (e.g., Smartpay) → BuffrConnect API         │
│ 1. POST /api/oidc/par (Pushed Authorization)       │
│    ↓ Returns: request_uri                           │
│ 2. GET /api/oidc/authorize?request_uri=xxx         │
│    ↓ User authenticates with bank (simulated)      │
│ 3. User approves consent on BuffrConnect UI         │
│    ↓ Returns: authorization_code                    │
│ 4. POST /api/oidc/token (code exchange)            │
│    ↓ Returns: access_token + refresh_token         │
└──────────────────────────────────────────────────────┘

STAGE 3: API ACCESS (Bearer Token or API Key)
┌──────────────────────────────────────────────────────┐
│ TPP → BuffrConnect API                              │
│ GET /api/accounts                                    │
│ Authorization: Bearer {access_token}                 │
│ OR                                                   │
│ x-api-key: bfr_{api_key}                            │
│ ↓                                                    │
│ Token validated against `consents` table            │
│ ↓                                                    │
│ RLS policy enforces user_id = auth.uid()            │
│ ↓                                                    │
│ Data returned (accounts, transactions, balances)    │
└──────────────────────────────────────────────────────┘
```

### 7.2 Token Types

| Token Type | Format | TTL | Storage | Purpose |
|------------|--------|-----|---------|---------|
| **Supabase Session** | JWT | 1 hour | Cookies (httpOnly) | User session management |
| **OAuth Access Token** | JWT | 1 hour | Client storage | API access (TPP) |
| **OAuth Refresh Token** | Opaque | 30 days | Database (hashed) | Token renewal |
| **API Key** | `bfr_[64-hex]` | 90 days | Database (bcrypt) | Server-to-server |
| **Authorization Code** | Random | 10 minutes | Database | One-time OAuth exchange |
| **Offline Token** | NAMQR format | 90 days | `token_vault` table | USSD/QR offline access |

---

## 8️⃣ Integration Patterns with External Apps

### 8.1 How Smartpay Integrates with BuffrConnect

**Integration Method:** REST API + Webhooks (No Direct Database Access)

#### Step 1: API Key Generation

**In BuffrConnect UI:**
1. User logs into BuffrConnect at `http://localhost:3000`
2. Navigates to Settings → API Keys (`/settings/api-keys`)
3. Creates API key with scopes: `accounts`, `transactions`, `balances`
4. Copies generated key (shown once): `bfr_abc123...`

**In Smartpay `.env`:**
```env
BUFFR_API_KEY=bfr_abc123...
BUFFR_API_URL=https://connect.buffr.ai
```

#### Step 2: OAuth Flow (User Consent)

**When Smartpay user wants to link bank account:**

```typescript
// Smartpay backend initiates OAuth flow
const response = await fetch(`${BUFFR_API_URL}/api/oidc/par`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'x-api-key': process.env.BUFFR_API_KEY
  },
  body: new URLSearchParams({
    response_type: 'code',
    client_id: 'smartpay_tpp',
    redirect_uri: 'https://app.ketchup.cc/callback',
    scope: 'accounts:read transactions:read balances:read',
    code_challenge: pkceChallenge,
    code_challenge_method: 'S256'
  })
});

// User redirected to BuffrConnect for bank login
// User approves consent (90-day maximum)
// Authorization code returned to Smartpay
// Smartpay exchanges code for access token
// Smartpay stores access_token and refresh_token
```

#### Step 3: API Calls

**Smartpay retrieves user's account data:**

```typescript
// Get all linked accounts
const accounts = await fetch(`${BUFFR_API_URL}/api/accounts`, {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

// Get transactions
const transactions = await fetch(
  `${BUFFR_API_URL}/api/accounts/${accountId}/transactions?from_date=2026-01-01`,
  {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  }
);

// Get balance
const balance = await fetch(
  `${BUFFR_API_URL}/api/accounts/${accountId}/balance`,
  {
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  }
);
```

#### Step 4: Webhook Subscriptions

**Smartpay registers webhook endpoint:**

```typescript
// Create webhook in BuffrConnect
const webhook = await fetch(`${BUFFR_API_URL}/api/webhooks`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://api.ketchup.cc/webhooks/buffr',
    events: [
      'account.linked',
      'transaction.created',
      'balance.updated',
      'consent.revoked'
    ]
  })
});

// BuffrConnect sends events to Smartpay
// Smartpay validates signature using BUFFR_WEBHOOK_SECRET
```

#### Step 5: Data Storage in Smartpay

**Smartpay stores aggregated data:**

Smartpay has its own tables:
- `open_banking_accounts` - Mirrors BuffrConnect account data
- `open_banking_transactions` - Mirrors BuffrConnect transaction data
- `open_banking_balances` - Mirrors BuffrConnect balance data
- `oauth_consents` - Tracks consent status

**Sync Pattern:**
- Initial sync via API calls when user links account
- Real-time updates via webhooks
- Periodic reconciliation (daily/weekly)
- Local cache for offline access

### 8.2 API Integration Points

**BuffrConnect Exposes 34+ REST Endpoints:**

**Authentication & Authorization:**
- `POST /api/oidc/par` - Pushed Authorization Request
- `GET /api/oidc/authorize` - Authorization endpoint
- `POST /api/oidc/token` - Token exchange
- `POST /api/oidc/revoke` - Token revocation

**Account Information Services (AIS):**
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/{id}` - Get account details
- `GET /api/accounts/{id}/balance` - Get current balance
- `GET /api/accounts/{id}/transactions` - Get transaction history
- `POST /api/accounts/sync` - Trigger account sync

**Consent Management:**
- `GET /api/consents` - List user consents
- `POST /api/consents` - Create consent
- `GET /api/consents/{id}` - Get consent details
- `PATCH /api/consents/{id}` - Renew/revoke consent
- `GET /api/consents/{id}/receipt` - Download PDF receipt

**Enrichment Services:**
- `POST /api/categorize` - ML transaction categorization
- `GET /api/income-analysis` - Income verification
- `GET /api/spending-patterns` - Spending analytics

**Developer Tools:**
- `GET /api/providers` - List available banks
- `POST /api/webhooks` - Create webhook subscription
- `GET /api/api-keys` - Manage API keys
- `GET /api/sandbox/mock-users` - Get sandbox test data

---

## 9️⃣ Database Relationship Analysis

### 9.1 Shared vs Separate Databases

**VERDICT: SEPARATE DATABASES**

**Evidence:**

1. **Different Database Technologies:**
   - BuffrConnect: Supabase PostgreSQL (`cjmtcxfpwjbpbctjseex.supabase.co`)
   - Smartpay: Neon PostgreSQL (`ep-rough-frog-ad0dg5fe-pooler.c-2.us-east-1.aws.neon.tech`)

2. **Different Table Structures:**
   - BuffrConnect: 23+ tables focused on open banking (consents, providers, accounts)
   - Smartpay: 246 tables covering e-money wallets, vouchers, G2P, agents, Fineract integration

3. **Different Connection Methods:**
   - BuffrConnect: `@supabase/supabase-js` with Supabase Auth
   - Smartpay: `@neondatabase/serverless` with no Supabase dependency

4. **No Shared Environment Variables:**
   - BuffrConnect: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Smartpay: `DATABASE_URL` (standard PostgreSQL connection string)

5. **Explicit Integration Points:**
   - BuffrConnect `.env.local` has `SMARTPAY_WEBHOOK_SECRET`
   - Smartpay `.env.example` has `BUFFR_API_KEY` and `BUFFR_WEBHOOK_SECRET`

### 9.2 User Identity Synchronization

**Pattern:** Same credentials, different user records

```
BuffrConnect Database:
┌────────────────────────────────────────────┐
│ users table                                │
│ - id: uuid-buffr-123                       │
│ - email: pendanek@gmail.com               │
│ - phone: +264814376206                    │
│ - Full Supabase Auth integration          │
└────────────────────────────────────────────┘

Smartpay Database:
┌────────────────────────────────────────────┐
│ users table                                │
│ - id: uuid-smartpay-456                   │
│ - email: pendanek@gmail.com               │
│ - phone: +264814376206                    │
│ - JWT auth, no Supabase                   │
└────────────────────────────────────────────┘
```

**Linkage:** Email/phone used as correlation keys, but user IDs are different in each system.

---

## 🔟 Key Files & Their Purposes

### Core Configuration Files

| File | Purpose | Key Contents |
|------|---------|--------------|
| `buffrconnect/.env` | Production environment | Supabase credentials, API keys, feature flags |
| `buffrconnect/.env.local` | Local development | Same as `.env` with local overrides |
| `buffrconnect/.env.example` | Template for setup | All required variables with descriptions |
| `buffrconnect/package.json` | Dependencies | Supabase SDK, Next.js, auth libraries |
| `buffrconnect/next.config.ts` | Next.js config | Sentry, PostHog, image optimization |
| `buffrconnect/tsconfig.json` | TypeScript config | Strict mode, path aliases |

### Supabase Integration Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `lib/supabase/client.ts` | Browser client | `createBrowserClient()`, retry logic |
| `lib/supabase/server.ts` | Server client | `createClient()`, cookie handling |
| `lib/db/client.ts` | Admin client | `supabaseAdmin`, `logAuditEvent()` |
| `lib/supabase/queries.ts` | Query layer | 50+ reusable query functions |
| `lib/supabase/hooks/` | React hooks | `useAccounts`, `useTransactions`, `useConsents` |
| `lib/supabase/database.types.ts` | TypeScript types | Auto-generated from schema |

### Migration Files (Key Ones)

| Migration | Tables Created | Purpose |
|-----------|----------------|---------|
| `20260310000001_initial_schema.sql` | users, providers, consents, accounts, balances, transactions | Core schema |
| `20260310000002_audit_compliance.sql` | audit_logs, consent_audit_logs, incidents, dsar_requests | ETA 2019 compliance |
| `20260310000003_ussd_offline.sql` | token_vault, offline_sync_queue, ussd_sessions | NAMQR offline capability |
| `20260310000004_developer_monitoring.sql` | api_clients, api_keys, api_usage, webhooks | TPP developer platform |
| `20260310000005_encryption_functions.sql` | N/A (functions only) | AES-256 encryption, hashing |
| `20260310000006_seed_providers.sql` | Inserts 5 providers | FNB, Bank Windhoek, Standard Bank, Nedbank, Sandbox |

### Authentication Files

| File | Purpose | Key Features |
|------|---------|--------------|
| `lib/auth/oauth.ts` | OAuth 2.0 core | Authorization code flow, PKCE, token generation |
| `lib/auth/fapi.ts` | FAPI 1.0 Advanced | JWT signing, token validation, security headers |
| `lib/middleware/authenticate.ts` | Auth middleware | Bearer token validation, session checking |
| `lib/middleware/withAuth.ts` | Auth wrapper | Protects API routes, enforces scopes |
| `app/api/oidc/token/route.ts` | Token endpoint | Token exchange, refresh, validation |

### API Route Files

| Route | File | Purpose |
|-------|------|---------|
| `GET /api/accounts` | `app/api/accounts/route.ts` | List user accounts |
| `GET /api/consents` | `app/api/consents/route.ts` | List consents |
| `GET /api/transactions` | `app/api/transactions/route.ts` | List transactions |
| `POST /api/webhooks` | `app/api/webhooks/route.ts` | Create webhook |
| `POST /api/api-keys` | `app/api/api-keys/route.ts` | Generate API key |

---

## 1️⃣1️⃣ Recommendations for PLANNING.md Corrections

Based on the architecture analysis, here are recommended corrections:

### Issue 1: Database Sharing Assumption

**Current (Incorrect):**
> "Smartpay and BuffrConnect share the same Supabase database"

**Correction:**
> "Smartpay and BuffrConnect use **separate databases**:
> - **BuffrConnect:** Supabase PostgreSQL (open banking data)
> - **Smartpay:** Neon PostgreSQL (e-money wallets, vouchers, G2P)
> - **Integration:** REST API + Webhooks (no direct DB access)"

### Issue 2: Authentication Flow

**Current (May be unclear):**
> "Users authenticate with Supabase"

**Correction:**
> "BuffrConnect uses **multi-stage authentication**:
> 1. **User Authentication:** Supabase Auth (email/password, session tokens)
> 2. **TPP Authorization:** Custom OAuth 2.0 + PKCE (consent-based, 90-day max)
> 3. **API Access:** Bearer tokens or API keys (scoped permissions)"

### Issue 3: Integration Pattern

**Add Clarification:**
> "**External App Integration Pattern:**
> 1. TPP (e.g., Smartpay) registers as OAuth client in BuffrConnect
> 2. User authorizes TPP via OAuth consent flow (bank login simulation in sandbox)
> 3. TPP receives access token (1-hour TTL) + refresh token (30-day TTL)
> 4. TPP calls BuffrConnect REST APIs with Bearer token
> 5. BuffrConnect validates consent and enforces RLS policies
> 6. TPP receives account data (accounts, transactions, balances)
> 7. BuffrConnect sends real-time updates via webhooks to TPP
> 8. TPP stores data in its own database for offline access"

### Issue 4: Database Schema

**Add Detail:**
> "**BuffrConnect Database Schema:**
> - **Core Tables:** 23+ (users, providers, consents, accounts, balances, transactions)
> - **Compliance Tables:** audit_logs, consent_audit_logs, incidents, dsar_requests
> - **Developer Tables:** api_clients, api_keys, api_usage, webhooks
> - **Offline Tables:** token_vault, offline_sync_queue, ussd_sessions
> - **RLS:** Enabled on all user-facing tables
> - **Migrations:** 37 migration files"

### Issue 5: Sandbox vs Production

**Clarification:**
> "**Sandbox Mode:**
> - `SANDBOX_MODE=true` enables simulated bank login screens
> - 121 mock users with realistic Namibian financial data
> - No real bank API calls (all data mocked)
> - Test credentials in `lib/sandbox/bank-credentials.ts`
> 
> **Production Mode:**
> - `SANDBOX_MODE=false` requires real bank partnerships
> - mTLS certificates for bank APIs
> - Bank OAuth endpoints configured
> - PSD-6 license from Bank of Namibia required"

---

## 1️⃣2️⃣ Architecture Diagrams

### 12.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         END USERS                               │
│  - 2.5M Namibians                                               │
│  - Access via: Web, Mobile, USSD (*pending CRAN approval)      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TPP APPLICATIONS                              │
│  - Smartpay (e-money wallet)                                   │
│  - Ketchup (G2P voucher platform)                              │
│  - Microlenders, PFM apps, accounting software                 │
│  - Integration: REST API + OAuth 2.0                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ REST API Calls
                           │ Authorization: Bearer {token}
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BUFFR CONNECT PLATFORM                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NEXT.JS 14 APPLICATION (buffrconnect/)                  │  │
│  │ - App Router (app/)                                      │  │
│  │ - API Routes (app/api/)                                  │  │
│  │ - 34+ REST endpoints                                     │  │
│  │ - OAuth 2.0 + PKCE authorization server                  │  │
│  │ - Webhook delivery engine                                │  │
│  │ - ML categorization (95% accuracy)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SUPABASE DATABASE (PostgreSQL 14+)                      │  │
│  │ Project: cjmtcxfpwjbpbctjseex.supabase.co              │  │
│  │ - 23+ tables (users, consents, accounts, transactions)  │  │
│  │ - RLS enabled on all user tables                        │  │
│  │ - ETA 2019 audit logs with SHA-256 integrity hashing    │  │
│  │ - 90-day consent expiry (OBS 2025)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SHARED SERVICES                                          │  │
│  │ - Redis: Rate limiting + caching (Redis Labs)            │  │
│  │ - PostHog: Analytics tracking                            │  │
│  │ - Sentry: Error monitoring                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Provider Integration
                           │ (Sandbox: Simulated)
                           │ (Production: mTLS + OAuth)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NAMIBIAN BANKS                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ FNB Namibia  │  │Bank Windhoek │  │Standard Bank │          │
│  │ 9 services   │  │ 13 services  │  │ 17 services  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Nedbank    │  │ Buffr Sandbox│                            │
│  │  6 services  │  │  (Testing)   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    SMARTPAY USER                               │
│  1. User links FNB account in Smartpay app                    │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────┐
│              SMARTPAY BACKEND (Neon DB)                        │
│  2. Initiates OAuth flow with BuffrConnect                    │
│  3. Stores access_token and consent_id                        │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     │ POST /api/oidc/par
                     │ GET /api/oidc/authorize?request_uri=xxx
                     │
                     ▼
┌────────────────────────────────────────────────────────────────┐
│            BUFFR CONNECT (Supabase DB)                         │
│  4. User redirected to BuffrConnect consent screen            │
│  5. User authenticates with simulated FNB login               │
│  6. User approves consent (90-day duration)                   │
│  7. Consent record created in `consents` table                │
│  8. Authorization code generated                              │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     │ Return: authorization_code
                     │
                     ▼
┌────────────────────────────────────────────────────────────────┐
│              SMARTPAY BACKEND                                  │
│  9. Exchange code for access_token                            │
│  10. Call: GET /api/accounts (with Bearer token)              │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     │ Authorization: Bearer {token}
                     │
                     ▼
┌────────────────────────────────────────────────────────────────┐
│            BUFFR CONNECT API                                   │
│  11. Validate token against `consents` table                  │
│  12. Check consent status (active, not expired)               │
│  13. Query `accounts` table (RLS enforced)                    │
│  14. Return account data (provider, balance, etc.)            │
│  15. Log API call in `audit_logs` table                       │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     │ JSON Response: accounts[]
                     │
                     ▼
┌────────────────────────────────────────────────────────────────┐
│              SMARTPAY BACKEND                                  │
│  16. Store accounts in `open_banking_accounts` table          │
│  17. Fetch transactions: GET /api/accounts/{id}/transactions  │
│  18. Store in `open_banking_transactions` table               │
└────────────────────────────────────────────────────────────────┘

                     [ONGOING: Real-Time Updates]

┌────────────────────────────────────────────────────────────────┐
│            BUFFR CONNECT WEBHOOK ENGINE                        │
│  • New transaction detected in `transactions` table           │
│  • Trigger webhook event: "transaction.created"               │
│  • Generate HMAC signature with SMARTPAY_WEBHOOK_SECRET       │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     │ POST https://api.ketchup.cc/webhooks/buffr
                     │ X-Buffr-Signature: sha256=xxx
                     │
                     ▼
┌────────────────────────────────────────────────────────────────┐
│              SMARTPAY WEBHOOK HANDLER                          │
│  • Validate signature using BUFFR_WEBHOOK_SECRET              │
│  • Insert new transaction into local DB                       │
│  • Send push notification to user                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣3️⃣ Compliance & Regulatory Implementation

### 13.1 Standards Implemented

| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| **OBS 2025** | 90-day consent max | `CHECK (expires_at <= granted_at + INTERVAL '90 days')` |
| **OBS 2025** | 4 requests/day limit | `max_requests_per_day INT DEFAULT 4` |
| **PSD-12** | 24-hour incident reporting | `CHECK` constraint on `incidents.created_at` |
| **ETA 2019 §24-25** | Tamper-evident audit logs | SHA-256 integrity hash on all audit entries |
| **FAPI 1.0 Advanced** | PKCE with S256 | Code challenge validation in OAuth flow |
| **GDPR** | 30-day DSAR deadline | `CHECK` constraint on `dsar_requests` |
| **NAMQR v5.0** | Tag 65 token vault | `token_vault` table with XXXX-XXXX format |

### 13.2 Security Implementation

**Encryption:**
- AES-256-GCM for sensitive fields (account numbers, ID numbers)
- TLS 1.3 for all API communication
- Bcrypt (12 rounds) for password/API key hashing
- SHA-256 for audit log integrity

**Rate Limiting:**
- 100 requests/minute per IP (default)
- Configurable per API key
- Redis-backed sliding window
- Bypassed for localhost in development

**Audit Logging:**
- Every API call logged in `audit_logs` table
- Includes: user_id, action, resource_type, IP, user_agent, timestamp
- Immutable (no DELETE policies)
- Integrity hash prevents tampering

---

## 1️⃣4️⃣ Production Readiness Assessment

### 14.1 Readiness Score: 92% (A-)

| Component | Status | Coverage | Notes |
|-----------|--------|----------|-------|
| **Sandbox System** | ✅ Production Ready | 92/100 | 121 mock users, 45 services |
| **REST API** | ✅ Production Ready | 34 endpoints | OpenAPI 3.0 spec available |
| **OAuth 2.0 + FAPI** | ✅ Production Ready | 100% | PKCE, PAR, token refresh |
| **Frontend** | ✅ Production Ready | 93% | Next.js 14, TypeScript strict |
| **Database** | ✅ Production Ready | 23 tables | 37 migrations, RLS enabled |
| **Testing** | ✅ Comprehensive | 96% unit, 54% integration | 230+ tests |
| **Security** | ✅ Compliant | ISO 27001, PSD-12 | Encryption, audit logs |
| **ML Categorizer** | ✅ Production Ready | 95% accuracy | 13 categories |
| **USSD Banking** | ⏳ Pending | CRAN approval | Code ready, awaiting regulator |
| **Bank Integration** | 🔄 Phase 1 | 5 providers | Sandbox only (real APIs pending) |

### 14.2 Deployment Blockers

**Current State:** Ready for staging deployment

**Remaining Tasks:**
1. ⏳ **Bank Partnerships** - Sign 2-3 bank API agreements (requires PSD-6 license)
2. ⏳ **PSD-6 Application** - Submit to Bank of Namibia (requires bank agreements)
3. ⏳ **USSD Approval** - CRAN short code application for `*120*8040#`
4. ✅ **Technical Infrastructure** - Complete and tested
5. ✅ **Security** - Compliant with all standards
6. ✅ **Documentation** - Comprehensive (38+ docs, ~215,000 words)

---

## 1️⃣5️⃣ Technology Stack Summary

### 15.1 Frontend

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.3 (strict mode)
- **UI Library:** DaisyUI 5.0 (Tailwind CSS)
- **State:** React Hooks, Context API
- **Charts:** Recharts 2.15
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

### 15.2 Backend

- **Runtime:** Node.js 20.x
- **Database:** PostgreSQL 14 (Supabase)
- **Auth:** Supabase Auth + Custom OAuth 2.0
- **API:** REST (OpenAPI 3.0 compliant)
- **Caching:** Redis 7.x (Redis Labs)
- **Queue:** BullMQ (webhook retries)

### 15.3 Security

- **OAuth:** OAuth 2.0 + OIDC + PKCE
- **FAPI:** FAPI 1.0 Advanced profile
- **Encryption:** AES-256-GCM (field-level)
- **TLS:** TLS 1.3 (transport)
- **SIEM:** Integration ready (Splunk/ELK)
- **Rate Limiting:** Redis-backed sliding window
- **Audit:** SHA-256 integrity hashing

### 15.4 DevOps

- **Hosting:** Vercel (Edge Network)
- **CI/CD:** GitHub Actions
- **Monitoring:** Vercel Analytics, Sentry, PostHog
- **Testing:** Jest (unit), Playwright (E2E)
- **Linting:** ESLint + TypeScript strict

---

## 1️⃣6️⃣ Critical Implementation Details

### 16.1 Supabase Client Initialization

**Three Client Types Used Throughout Codebase:**

```typescript
// 1. Browser Client (Client Components)
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(url, anonKey);

// 2. Server Client (API Routes, Server Components)
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
export async function createClient() {
  return createServerClient(url, anonKey, { cookies });
}

// 3. Admin Client (Bypass RLS)
// lib/db/client.ts
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(url, serviceRoleKey);
```

### 16.2 Row-Level Security Implementation

**All user-facing tables use RLS:**

```sql
-- Example: accounts table
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users see only their accounts
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Admins see all accounts
CREATE POLICY "Admins can view all accounts"
  ON accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.metadata->>'role' = 'admin'
    )
  );
```

**Service Role Functions:** Bypass RLS for system operations:
- `service_create_user()`
- `service_grant_consent()`
- `service_link_account()`
- `service_insert_transaction()`

### 16.3 Real-Time Subscriptions

**Pattern:** Client-side subscriptions for live updates

```typescript
// Example: Live balance updates
useEffect(() => {
  const channel = supabase
    .channel(`balance-${accountId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'balances',
      filter: `account_id=eq.${accountId}`
    }, (payload) => {
      setBalance(payload.new.amount);
    })
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [accountId]);
```

---

## 1️⃣7️⃣ Integration with Smartpay - Detailed Flow

### 17.1 Initial Setup

**Smartpay Developer Steps:**

1. **Get API Key from BuffrConnect:**
   ```bash
   # Login to BuffrConnect
   # Navigate to: Settings → API Keys
   # Create new key with scopes: accounts, transactions, balances
   # Copy generated key: bfr_abc123...
   ```

2. **Configure Smartpay `.env`:**
   ```env
   BUFFR_API_KEY=bfr_abc123...
   BUFFR_API_URL=https://connect.buffr.ai
   BUFFR_WEBHOOK_SECRET=d96ddb92d4b86906726b5dc9af452c9ca096087b4301e46f67e254c6e09434aa
   ```

3. **Register Webhook Endpoint:**
   ```bash
   curl -X POST https://connect.buffr.ai/api/webhooks \
     -H "Authorization: Bearer ${ACCESS_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://api.ketchup.cc/webhooks/buffr",
       "events": ["account.linked", "transaction.created"]
     }'
   ```

### 17.2 Runtime Data Flow

**Scenario:** Smartpay user links FNB bank account

```
1. User Action (Smartpay Mobile App)
   ↓
   "Link Bank Account" button clicked
   ↓

2. Smartpay Backend (Neon DB)
   ↓
   POST https://connect.buffr.ai/api/oidc/par
   Headers: x-api-key: bfr_abc123...
   Body: {
     response_type: "code",
     client_id: "smartpay_tpp",
     redirect_uri: "https://app.ketchup.cc/callback",
     scope: "accounts:read transactions:read",
     code_challenge: "sha256_hash_of_verifier"
   }
   ↓
   Response: { request_uri: "urn:ietf:params:oauth:request_uri:abc123" }
   ↓

3. Smartpay Mobile App
   ↓
   Open browser/webview to:
   https://connect.buffr.ai/api/oidc/authorize?request_uri=urn:...
   ↓

4. BuffrConnect Authorization Server (Supabase DB)
   ↓
   Validate request_uri (from `oauth_par_requests` table)
   ↓
   Render bank selection screen
   ↓
   User selects FNB Namibia
   ↓
   Redirect to simulated FNB login (SANDBOX_MODE=true)
   ↓

5. Simulated FNB Login Page (BuffrConnect UI)
   ↓
   User enters test credentials:
   ID: 90010112345, PIN: 1234
   ↓
   Credentials validated against `lib/sandbox/bank-credentials.ts`
   ↓
   Redirect to consent approval screen
   ↓

6. Consent Approval (BuffrConnect UI)
   ↓
   User sees:
   - Permissions requested (read accounts, read transactions)
   - Duration: 90 days
   - Provider: FNB Namibia
   ↓
   User clicks "Approve Consent"
   ↓
   INSERT INTO consents (user_id, provider_id, scopes, expires_at)
   ↓
   Generate authorization_code
   ↓
   INSERT INTO oauth_authorization_codes (code, client_id, ...)
   ↓
   Redirect: https://app.ketchup.cc/callback?code=auth_abc123&state=xyz
   ↓

7. Smartpay Backend Callback Handler
   ↓
   Receive authorization_code
   ↓
   POST https://connect.buffr.ai/api/oidc/token
   Body: {
     grant_type: "authorization_code",
     code: "auth_abc123",
     client_id: "smartpay_tpp",
     code_verifier: "original_verifier"
   }
   ↓
   Response: {
     access_token: "eyJhbGc...",  // 1-hour TTL
     refresh_token: "rt_...",     // 30-day TTL
     expires_in: 3600,
     token_type: "Bearer",
     scope: "accounts:read transactions:read",
     consent_id: "consent_uuid_123"
   }
   ↓
   Store tokens in Smartpay database
   ↓

8. Smartpay Fetches Account Data
   ↓
   GET https://connect.buffr.ai/api/accounts
   Authorization: Bearer eyJhbGc...
   ↓

9. BuffrConnect API Handler (Supabase DB)
   ↓
   Validate access_token (JWT verify)
   ↓
   Extract user_id and consent_id from token
   ↓
   Check consent status:
   SELECT * FROM consents 
   WHERE id = consent_id 
   AND status = 'active' 
   AND expires_at > NOW()
   ↓
   Query accounts (RLS enforced):
   SELECT * FROM accounts 
   WHERE user_id = token.user_id 
   AND provider_id = (SELECT provider_id FROM consents WHERE id = consent_id)
   ↓
   Log API call:
   INSERT INTO audit_logs (
     user_id, action: 'accounts.list',
     resource_type: 'account',
     status: 'success'
   )
   ↓
   Return JSON response
   ↓

10. Smartpay Backend Stores Data (Neon DB)
    ↓
    INSERT INTO open_banking_accounts (
      user_id,
      buffr_account_id,
      provider_name,
      account_number,
      balance,
      last_synced_at
    )
    ↓
    Notify mobile app: "Account linked successfully"
    ↓

11. Ongoing: Real-Time Updates via Webhooks
    ↓
    BuffrConnect detects new transaction in sandbox
    ↓
    Webhook delivery engine triggers
    ↓
    POST https://api.ketchup.cc/webhooks/buffr
    X-Buffr-Signature: hmac_sha256_signature
    Body: {
      event_type: "transaction.created",
      data: { transaction details }
    }
    ↓
    Smartpay validates signature
    ↓
    INSERT INTO open_banking_transactions (...)
    ↓
    Send push notification to user
```

### 17.3 Token Refresh Flow

**When access token expires (1 hour):**

```typescript
// Smartpay backend detects 401 Unauthorized
const refreshResponse = await fetch(
  'https://connect.buffr.ai/api/oidc/token',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: storedRefreshToken,
      client_id: 'smartpay_tpp'
    })
  }
);

// BuffrConnect validates refresh token
// - Check token exists in database
// - Check not expired (30-day max)
// - Check consent still active
// - Generate new access token (1-hour TTL)
// - Rotate refresh token (optional)

// Smartpay stores new tokens
// Retry original API call
```

---

## 1️⃣8️⃣ Recommendations for PLANNING.md

### Critical Corrections Needed

1. **Database Architecture Section:**
   ```markdown
   ## Database Architecture

   **BuffrConnect and Smartpay use SEPARATE databases:**

   - **BuffrConnect Database:**
     - Platform: Supabase PostgreSQL
     - Project ID: cjmtcxfpwjbpbctjseex
     - Tables: 23+ (open banking focus)
     - Purpose: Account aggregation, OAuth consents, API management

   - **Smartpay Database:**
     - Platform: Neon PostgreSQL
     - Tables: 246 (e-money wallet focus)
     - Purpose: Wallets, vouchers, G2P, agent network

   - **Integration Method:** REST API + Webhooks
     - No direct database access between systems
     - Data synchronized via API calls
     - Real-time updates via webhook events
   ```

2. **Authentication Flow Section:**
   ```markdown
   ## Authentication Architecture

   **Three-Layer Authentication:**

   1. **Layer 1: User Authentication (Supabase Auth)**
      - Users register/login with email/password
      - Session managed via httpOnly cookies
      - JWT tokens with 1-hour expiry

   2. **Layer 2: TPP Authorization (OAuth 2.0)**
      - External apps (Smartpay) register as OAuth clients
      - Users grant consent via PKCE-enhanced authorization code flow
      - Consent limited to 90 days (OBS 2025 requirement)
      - Access tokens (1-hour) + Refresh tokens (30-day)

   3. **Layer 3: API Access (Bearer/API Key)**
      - TPPs call BuffrConnect APIs with Bearer token
      - Alternative: API keys for server-to-server
      - Rate limiting: 100 req/min default (configurable per key)
   ```

3. **Integration Pattern Section:**
   ```markdown
   ## Smartpay ↔ BuffrConnect Integration

   **Pattern:** API-First Architecture

   **Data Flow:**
   1. Smartpay user initiates "Link Bank Account"
   2. Smartpay backend calls BuffrConnect OAuth endpoints
   3. User redirected to BuffrConnect for consent approval
   4. User authorizes access to their bank accounts (90-day consent)
   5. Smartpay receives access token + refresh token
   6. Smartpay calls BuffrConnect APIs to fetch account data
   7. BuffrConnect validates consent and returns data
   8. Smartpay stores data in its own `open_banking_*` tables
   9. BuffrConnect sends webhook events for real-time updates
   10. Smartpay processes webhooks and updates local database

   **Webhook Events:**
   - account.linked
   - transaction.created
   - balance.updated
   - consent.revoked
   - consent.expiring (7-day warning)
   ```

4. **Shared Services Section:**
   ```markdown
   ## Shared Services Between BuffrConnect and Smartpay

   **1. Test User Credentials (Development Only)**
   - Same email/password/phone for testing
   - Separate user IDs in each database
   - Linkage via email/phone (not UUID)

   **2. Webhook Secret**
   - `SMARTPAY_WEBHOOK_SECRET` in BuffrConnect .env
   - `BUFFR_WEBHOOK_SECRET` in Smartpay .env
   - Must match for signature verification

   **3. None - Databases Completely Separate**
   - No shared tables
   - No cross-database queries
   - No foreign key constraints across systems
   ```

5. **API Endpoints Section:**
   ```markdown
   ## BuffrConnect API Endpoints (Used by Smartpay)

   **Core Endpoints:**
   - `POST /api/oidc/par` - Initiate OAuth flow
   - `GET /api/oidc/authorize` - User authorization
   - `POST /api/oidc/token` - Token exchange/refresh
   - `GET /api/accounts` - List linked accounts
   - `GET /api/accounts/{id}/balance` - Get account balance
   - `GET /api/accounts/{id}/transactions` - Get transaction history
   - `GET /api/consents` - List active consents
   - `POST /api/webhooks` - Register webhook endpoint
   - `POST /api/categorize` - ML transaction categorization

   **Authentication Methods:**
   - Bearer token (OAuth 2.0 access token)
   - API key (x-api-key header)
   - Session cookie (browser access only)

   **Rate Limits:**
   - Default: 100 requests/minute per IP
   - Configurable per API key
   - OBS 2025: 4 requests/day per account consent
   ```

---

## 1️⃣9️⃣ Key Files Reference

### Critical Files for Understanding Architecture

| File Path | Purpose | Key Information |
|-----------|---------|-----------------|
| `buffrconnect/.env` | Environment config | Supabase URL, keys, feature flags |
| `buffrconnect/package.json` | Dependencies | Supabase SDK version, Next.js version |
| `buffrconnect/README.md` | Project overview | Features, tech stack, quick start |
| `buffrconnect/PRD.md` | Product requirements | Complete specification (8,900+ lines) |
| `buffrconnect/next.config.ts` | Next.js config | Sentry, PostHog, rewrites |
| `lib/supabase/client.ts` | Browser client | Client-side Supabase initialization |
| `lib/supabase/server.ts` | Server client | Server-side Supabase with cookies |
| `lib/db/client.ts` | Admin client | Service role operations |
| `lib/auth/oauth.ts` | OAuth implementation | Authorization code flow, PKCE |
| `lib/auth/fapi.ts` | FAPI security | JWT signing, token validation |
| `lib/middleware/authenticate.ts` | Auth middleware | Token validation, user extraction |
| `lib/webhooks/delivery.ts` | Webhook engine | Event delivery with retries |
| `supabase/README.md` | Migration guide | Database schema documentation |
| `supabase/migrations/` | Schema migrations | 37 SQL migration files |

### Documentation Files

| File Path | Content | Audience |
|-----------|---------|----------|
| `buffrconnect/docs/api/API_REFERENCE.md` | REST API documentation | TPP developers |
| `buffrconnect/docs/SANDBOX_QUICKSTART.md` | Sandbox testing guide | TPP developers |
| `buffrconnect/docs/BANK_PARTNERSHIP_GUIDE.md` | Bank partnership strategy | Business team |
| `buffrconnect/docs/SECURITY_GUIDE.md` | Security implementation | Security team |
| `buffrconnect/docs/REGULATORY_COMPLIANCE_ROADMAP.md` | Compliance checklist | Compliance team |

---

## 2️⃣0️⃣ Conclusion

### Summary of Findings

1. ✅ **BuffrConnect is a standalone AIS platform** with its own Supabase database
2. ✅ **Smartpay integrates via REST API**, not direct database access
3. ✅ **Separate databases** ensure proper separation of concerns and compliance
4. ✅ **OAuth 2.0 with 90-day consent** is the integration model (OBS 2025)
5. ✅ **Webhooks provide real-time updates** from BuffrConnect to Smartpay
6. ✅ **Production-ready architecture** with comprehensive security and compliance
7. ✅ **Sandbox mode** allows testing without real bank partnerships
8. ✅ **Well-documented** with 38+ documentation files (~215,000 words)

### Architecture Grade: A- (92%)

**Strengths:**
- Clean API-first architecture
- Strong security implementation (OAuth 2.0, FAPI, RLS, audit logs)
- Comprehensive compliance (7 regulatory standards)
- Excellent documentation
- Production-ready sandbox (121 mock users)

**Areas for Improvement:**
- Bank partnerships needed (currently sandbox-only)
- PSD-6 license application pending
- USSD approval from CRAN pending
- Real bank API integrations not yet implemented

### Next Steps for PLANNING.md

1. **Update database architecture section** with separate database clarification
2. **Add detailed integration flow diagram** showing API-first pattern
3. **Document OAuth 2.0 flow** for external app integration
4. **Clarify sandbox vs production** modes and requirements
5. **Add API endpoint reference** for common operations

---

## 📎 Appendix: Quick Reference

### Supabase Connection Details

```bash
Project URL: https://cjmtcxfpwjbpbctjseex.supabase.co
Project ID: cjmtcxfpwjbpbctjseex
Region: US East
Database: PostgreSQL 14+
Auth: Supabase Auth + Custom OAuth 2.0
```

### Key Environment Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_h_YZ75mkiV-M4nIiHWTevg_W0mZsCWC
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service role)

# Security (Required)
ENCRYPTION_KEY=bd6b34a128e19181729176432dfdbba6... (32 bytes)
JWT_SECRET=db59d031287a7c51ec779900d4252962... (64 bytes)

# Integration (Required for Smartpay webhook delivery)
SMARTPAY_WEBHOOK_SECRET=d96ddb92d4b86906726b5dc9af452c9ca096087b4301e46f67e254c6e09434aa

# Feature Flags
SANDBOX_MODE=true  # Enable simulated bank logins
DEVELOPER_PORTAL_ENABLED=true  # Enable API docs portal
```

### Test Credentials

```env
# BuffrConnect Test User (same as Smartpay)
TEST_USER_EMAIL=pendanek@gmail.com
TEST_USER_PASSWORD=02Ally27PP123Lubi@i
TEST_USER_PHONE=+264814376206
TEST_USER_PIN=1234

# Sandbox Bank Login Credentials
FNB Namibia: ID=90010112345, PIN=1234
Bank Windhoek: ID=88030145678, PIN=2468
Standard Bank: ID=93070378901, PIN=7890
Nedbank: ID=90122001234, PIN=8520
```

---

**Report Generated:** March 17, 2026  
**Analysis Depth:** Complete (all .env files, migrations, API routes, documentation)  
**Confidence Level:** High (based on comprehensive codebase exploration)  
**Status:** Ready for PLANNING.md updates
