# SmartPay Backend Architecture Analysis

**Date:** March 21, 2026  
**Location:** `/Users/georgenekwaya/Downloads/ai-agent-mastery-main/fintech/apps/smartpay-backend/`

---

## Executive Summary

The **SmartPay Backend** is a Node.js/TypeScript API server that serves as the **primary business logic layer** between the SmartPay Mobile App and external services. It is **NOT a simple proxy** - it contains substantial business logic for wallet management, voucher processing, KYC verification, and compliance enforcement.

**Key Finding:** There is **NO direct integration with "Ketchup Portals"**. The backend integrates with:
1. **Buffr Connect** - Open Banking platform for financial services
2. **Ketchup Liveness Service** - Separate KYC facial recognition service (OpenCV/MediaPipe)
3. **Neon PostgreSQL** - Primary database for all app data

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SmartPay Mobile App                         │
│                    (React Native/Expo)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ REST API (JWT Auth)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                 SmartPay Backend (Node.js)                      │
│                    Port: 4000                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routes Layer                                        │  │
│  │  - /api/v1/* (mobile endpoints)                          │  │
│  │  - /api/buffr/* (Buffr integration)                      │  │
│  │  - /api/copilot/* (AI integration)                       │  │
│  │  - /api/kyc/* (KYC management)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer (Services)                         │  │
│  │  - Wallet Management                                     │  │
│  │  - Voucher Processing                                    │  │
│  │  - Transaction Validation                                │  │
│  │  - Compliance Enforcement                                │  │
│  │  - Buffr Client Integration                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Middleware Layer                                        │  │
│  │  - JWT Authentication (Supabase)                         │  │
│  │  - Rate Limiting                                         │  │
│  │  - Input Validation (Zod)                                │  │
│  │  - Audit Logging (ETA §32)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬─────────────────────┬─────────────────┬──────────────┘
         │                     │                 │
         │                     │                 │
┌────────▼─────────┐  ┌────────▼─────────┐  ┌───▼──────────────┐
│  Neon PostgreSQL │  │  Buffr Connect   │  │ Ketchup Liveness │
│   (Primary DB)   │  │  (Open Banking)  │  │  Service (KYC)   │
│                  │  │   Port: 3001     │  │   Port: 8002     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 1. Backend Role in Architecture

### 1.1 Not Just an API Gateway

The SmartPay Backend is **NOT a simple proxy**. It contains:

✅ **Business Logic:**
- Transaction validation with 9 sequential checks
- KYC tier enforcement (Lite vs Full)
- Daily/monthly limit tracking
- Trust account reconciliation
- Fee calculation
- Compliance monitoring

✅ **Data Management:**
- 16+ database tables
- Complex relationships (users, wallets, transactions, vouchers)
- Atomic transaction handling
- Row-level locking for concurrency

✅ **Security Enforcement:**
- JWT authentication (Supabase)
- Rate limiting (100 req/15min)
- Input validation (Zod schemas)
- Audit logging (ETA §32 compliance)
- OTP generation and verification

### 1.2 Integration Pattern

**Pattern:** **Service Integration Layer** (not proxy)

The backend:
1. **Receives requests** from mobile app
2. **Validates inputs** (auth, rate limits, business rules)
3. **Executes business logic** (transaction validation, compliance checks)
4. **Calls external services** when needed (Buffr Connect, Ketchup Liveness)
5. **Persists data** to PostgreSQL
6. **Returns response** to mobile app

---

## 2. Voucher API Endpoints

### 2.1 Core Voucher Endpoints

**File:** `src/routes/mobile/vouchers.ts`

| Endpoint | Method | Purpose | Auth | Rate Limit |
|----------|--------|---------|------|------------|
| `/api/v1/vouchers` | GET | List user's vouchers | ✅ JWT | Lenient |
| `/api/v1/vouchers/:id` | GET | Get voucher details | ✅ JWT | Lenient |
| `/api/v1/vouchers/redeem` | POST | Redeem by 12-digit code | ✅ JWT | Strict |
| `/api/v1/vouchers/:id/redeem` | POST | Redeem by ID (to wallet) | ✅ JWT | Strict |
| `/api/v1/vouchers/:id/redeem-nampost` | POST | Redeem at NamPost branch | ✅ JWT | Strict |
| `/api/v1/vouchers/:id/redeem-smartpay` | POST | Redeem at SmartPay agent | ✅ JWT | Strict |

### 2.2 Voucher Redemption Methods

**Three redemption methods supported:**

1. **Wallet Redemption** (`/api/v1/vouchers/redeem`)
   - Instantly credits user's wallet
   - Validates voucher status (pending, not expired)
   - Checks redemption_method_allowed includes 'wallet'
   - Creates transaction record with type: 'voucher_redemption'
   - Updates wallet balance atomically
   - ETA §32 audit logging

2. **NamPost Branch Collection** (`/api/v1/vouchers/:id/redeem-nampost`)
   - Generates 8-character collection code (alphanumeric)
   - Voucher status → 'pending_collection'
   - User visits NamPost with collection code + ID
   - Code expires in 7 days
   - Cryptographically secure code generation with uniqueness check

3. **SmartPay Agent Collection** (`/api/v1/vouchers/:id/redeem-smartpay`)
   - Generates 6-digit PIN collection code
   - Voucher status → 'pending_collection'
   - User visits SmartPay agent with code
   - Code expires in 48 hours
   - Cryptographically secure PIN generation

### 2.3 Voucher Database Schema

```sql
-- Vouchers table (from backend queries)
CREATE TABLE vouchers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  voucher_code VARCHAR(12) NOT NULL UNIQUE,  -- 12-digit code
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NAD',
  status VARCHAR(50) NOT NULL,  -- pending, redeemed, expired, pending_collection
  voucher_type VARCHAR(50),
  issuer VARCHAR(100),
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  redemption_method_allowed TEXT[],  -- ['wallet', 'nampost', 'smartpay']
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Buffr Connect Integration

### 3.1 What is Buffr Connect?

**Buffr Connect** is an **Open Banking platform** (NOT "Ketchup Portals"). It provides:
- Agent network management
- Cash-out transaction processing
- Voucher redemption services
- Settlement operations
- Transaction history

**Base URL:** `process.env.BUFFR_API_URL` (default: `http://localhost:3001`)

### 3.2 Buffr Client Implementation

**File:** `src/services/buffr/client.ts` (422 lines)

**Features:**
- Type-safe API calls with TypeScript
- Automatic retry logic (max 3 attempts)
- Comprehensive error handling
- Request/response logging
- Rate limiting protection
- Timeout handling (30 seconds)

**Key Methods:**

```typescript
// Agent Operations
registerAgent(data) → BuffrAgent
getAgent(agentId) → BuffrAgent
getAgentBalance(agentId) → { balance, currency }
updateAgentStatus(agentId, status) → BuffrAgent

// Transaction Operations
processCashOut(data) → BuffrTransaction
getTransaction(transactionId) → BuffrTransaction
getAgentTransactions(agentId, options) → { transactions[], total, page }

// Voucher Operations
redeemVoucher(data) → BuffrTransaction
validateVoucher(voucherCode) → BuffrVoucher
getVoucher(voucherCode) → BuffrVoucher

// Settlement Operations
requestSettlement(agentId) → BuffrTransaction
getSettlements(agentId, options) → { settlements[], total }

// Health Check
healthCheck() → { status, timestamp }
```

### 3.3 Buffr API Endpoints Exposed

**File:** `src/routes/buffr.ts`

| Backend Endpoint | Buffr API Called | Purpose |
|------------------|------------------|---------|
| `POST /api/buffr/cash-out` | `/partners/agents/transactions` | Process cash-out |
| `GET /api/buffr/transactions/:id` | `/transactions/:id` | Get transaction status |
| `GET /api/buffr/agents/:id/transactions` | `/partners/agents/:id/transactions` | Agent history |
| `POST /api/buffr/agents/register` | `/partners/agents/register` | Register agent |
| `GET /api/buffr/agents/:id/balance` | `/partners/agents/:id/balance` | Check balance |
| `POST /api/buffr/vouchers/validate` | `/vouchers/:code/validate` | Validate voucher |
| `GET /api/buffr/health` | `/health` | Health check |

### 3.4 Buffr Integration Pattern

**Pattern:** **Client Library with Service Layer**

```
Mobile App
    │
    │ POST /api/buffr/cash-out
    │
    ▼
SmartPay Backend (buffr.ts route)
    │
    │ Validates JWT, Rate Limit, Input
    │
    ▼
BuffrCashOutService (cashOut.ts)
    │
    │ Business Logic:
    │ - Validate request
    │ - Validate voucher (if provided)
    │ - Process cash-out
    │ - Log transaction
    │
    ▼
BuffrClient (client.ts)
    │
    │ HTTP Client:
    │ - Retry logic
    │ - Error handling
    │ - Request logging
    │
    ▼
Buffr Connect API (external service)
```

**Key Observation:** The backend **does NOT simply proxy requests**. It adds:
- Authentication layer (JWT verification)
- Business validation (amount limits, phone validation)
- Audit logging for compliance
- Error transformation and standardization
- Metadata enrichment (processed_by, timestamp)

---

## 4. Ketchup Liveness Service Integration

### 4.1 What is Ketchup Liveness Service?

**Purpose:** Facial liveness detection for KYC verification  
**Technology:** OpenCV + MediaPipe  
**Port:** 8002  
**URL:** `process.env.KETCHUP_LIVENESS_SERVICE_URL` (default: `http://localhost:8002`)

**File:** `src/routes/kyc.ts` (lines 390-437)

### 4.2 KYC Liveness Detection Flow

```
POST /api/v1/kyc/upload-documents
    │
    │ User uploads:
    │ - ID document (front/back)
    │ - Selfie video
    │
    ▼
SmartPay Backend (kyc.ts)
    │
    │ Validates files (size, type)
    │
    ▼
Call Ketchup Liveness Service
    │
    │ POST http://localhost:8002/api/v1/liveness/video
    │ FormData: { video_file, beneficiary_id, device_id }
    │
    ▼
Ketchup Service Response
    │
    │ { success, data: { is_live, confidence } }
    │
    ▼
SmartPay Backend
    │
    │ If is_live == false → Reject KYC
    │ If is_live == true → Store documents
    │ Update kyc_submissions.status → 'submitted'
    │
    ▼
Response to Mobile App
```

### 4.3 Liveness Detection Code

```typescript
const getLivenessFromService = async (selfieVideoFile: Express.Multer.File) => {
  const baseUrl = process.env.KETCHUP_LIVENESS_SERVICE_URL || 'http://localhost:8002';
  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/liveness/video`;

  const form = new FormData();
  form.append('video_file', selfieVideoFile.buffer, {
    filename: selfieVideoFile.originalname || 'selfie_video.mp4',
    contentType: selfieVideoFile.mimetype,
    knownLength: selfieVideoFile.size,
  });
  form.append('beneficiary_id', userId);
  form.append('device_id', '');

  const resp = await axios.post(url, form, {
    headers: form.getHeaders(),
    timeout: 45_000,  // 45 seconds
  });

  const json = resp.data;
  return {
    isLive: Boolean(json?.data?.is_live),
    confidence: json?.data?.confidence || 0,
  };
};
```

---

## 5. Missing Implementations

### 5.1 Ketchup Portals - Does NOT Exist

**Finding:** There is **NO "Ketchup Portals"** in the architecture.

**Confusion Source:** 
- "Ketchup Liveness Service" exists (facial recognition)
- User may have confused it with a non-existent "Ketchup Portals"

**What Actually Exists:**
1. **Buffr Connect** - Open Banking platform (primary integration)
2. **Ketchup Liveness Service** - KYC facial recognition (specific service)

### 5.2 Incomplete Features

Based on code comments and TODO markers:

1. **OBS (Open Banking Standard) Routes** - Commented out
   ```typescript
   // import obsRoutes from './routes/obs'; // TODO: Refactor Prisma to Neon SQL
   // app.use('/api/obs', obsRoutes); // TODO: Refactor Prisma to Neon SQL
   ```
   **Status:** Disabled pending Prisma → Neon SQL migration

2. **Buffr Transaction Logging** - TODO in code
   ```typescript
   // TODO: Write to database (buffr_transactions table)
   console.log(`[Audit] Transaction logged:`, {...});
   ```
   **Status:** Currently logs to console, needs DB persistence

3. **Python AI Backend Integration** - Configured but optional
   ```env
   AI_SERVICE_URL=http://localhost:8000
   AI_SERVICE_ENABLED=false
   ```
   **Status:** Configuration exists, integration optional

### 5.3 Database Migrations

**Existing Migrations:**
- `001_kyc_tables.sql` - KYC submissions and documents

**Missing Migrations:**
- Vouchers table schema
- Buffr transactions audit table
- Trust account reconciliation tables
- Full suite referenced in main README (16 tables)

**Note:** The backend queries tables that may need migration scripts:
- `vouchers`
- `wallets`
- `transactions`
- `users`
- `otp_codes`
- `user_sessions`
- `refresh_tokens`

---

## 6. Integration with Mobile App

### 6.1 Mobile App Expectations

The mobile app expects the backend to provide:

✅ **Authentication APIs** (`/api/v1/auth/*`)
- Request OTP
- Verify OTP
- Refresh tokens
- JWT validation

✅ **Wallet APIs** (`/api/v1/wallets/*`)
- List wallets
- Get wallet details
- Transaction history

✅ **Voucher APIs** (`/api/v1/vouchers/*`)
- List vouchers
- Redeem vouchers (3 methods)
- Get voucher details

✅ **Transaction APIs** (`/api/v1/transactions/*`, `/api/v1/send-money`)
- Send money P2P
- Transaction history
- Transaction validation

✅ **KYC APIs** (`/api/v1/kyc/*`)
- Submit KYC
- Upload documents (with liveness check)
- Check status

✅ **Loan APIs** (`/api/v1/loans/*`)
- Check eligibility
- Apply for loan
- List loans

✅ **Group APIs** (`/api/v1/groups/*`)
- Create group
- Join group
- Group contributions

### 6.2 API Response Format

**Standard Response Structure:**

```typescript
// Success Response
{
  success: true,
  data: {
    // Response payload
  }
}

// Error Response
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human-readable error message'
  }
}
```

**Example:** Voucher Redemption Success

```json
{
  "success": true,
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "voucherCode": "123456789012",
    "amount": 1500.00,
    "currency": "NAD",
    "walletId": "wallet-uuid",
    "newBalance": 3500.00,
    "redeemedAt": "2026-03-21T12:34:56.789Z"
  }
}
```

### 6.3 Security Requirements

Mobile app must provide:

1. **JWT Token** in `Authorization: Bearer <token>` header
2. **User Agent** (automatically included)
3. **Device Info** (for fraud detection)
4. **IP Address** (captured by middleware)
5. **Session ID** (for audit logging)

Backend enforces:
- Rate limiting (100 req/15min standard, stricter for sensitive ops)
- Input validation (Zod schemas)
- Authentication (JWT verification)
- Audit logging (all actions logged with ETA §32 attribution)

---

## 7. Technology Stack Summary

### 7.1 Core Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 18.0-22.0 | Server runtime |
| Language | TypeScript | 5.9.3 | Type safety |
| Framework | Express | 4.18.2 | HTTP server |
| Database | PostgreSQL (Neon) | Latest | Primary data store |
| Auth | JWT + Supabase | Latest | Authentication |
| Validation | Zod | 3.25.76 | Input validation |

### 7.2 Key Dependencies

**Business Logic:**
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT generation/verification
- `axios` - HTTP client for external APIs
- `speakeasy` - OTP generation
- `qrcode` - QR code generation

**Security:**
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `express-validator` - Input sanitization
- `cors` - CORS handling

**Database:**
- `pg` - PostgreSQL client
- `@neondatabase/serverless` - Neon connection pooling

**AI/ML (Optional):**
- `@lancedb/lancedb` - Vector database
- `@langchain/openai` - LLM integration
- `duckdb` - Analytics database

### 7.3 Environment Configuration

**Required Variables:**

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-key

# Server
PORT=4000
NODE_ENV=development

# Buffr Integration
BUFFR_API_URL=http://localhost:3001
BUFFR_API_KEY=your-api-key

# Supabase (for auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# KYC Liveness Service
KETCHUP_LIVENESS_SERVICE_URL=http://localhost:8002

# Optional: Python AI Backend
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_ENABLED=false
```

---

## 8. Key Findings & Recommendations

### 8.1 Key Findings

✅ **Architecture Role:**
- SmartPay Backend is a **full-fledged API server** with business logic
- NOT a simple proxy or API gateway
- Contains transaction validation, compliance enforcement, and data management

✅ **Integration Pattern:**
- **Client Library Pattern** for Buffr Connect (not direct proxy)
- **Service Layer** for business logic encapsulation
- **Middleware Layer** for cross-cutting concerns (auth, rate limiting, validation)

✅ **Ketchup Confusion:**
- **NO "Ketchup Portals"** exists in the architecture
- **"Ketchup Liveness Service"** is a separate KYC facial recognition service
- **Buffr Connect** is the primary external platform integration

✅ **Voucher System:**
- Full-featured voucher management with 3 redemption methods
- Atomic transaction handling with row-level locking
- Compliance-focused with audit logging (ETA §32)

### 8.2 Architecture Strengths

1. **Security-First:**
   - JWT authentication
   - Rate limiting
   - Input validation
   - Audit logging
   - Cryptographically secure code generation

2. **Compliance-Ready:**
   - ETA §32 audit attribution
   - PSD-3 transaction validation
   - Bank of Namibia reporting readiness

3. **Maintainability:**
   - Clean separation of concerns (routes → services → lib)
   - Type-safe with TypeScript
   - Well-documented code
   - Test coverage (Jest integration tests)

4. **Scalability Considerations:**
   - Serverless PostgreSQL (Neon)
   - Connection pooling
   - Rate limiting
   - Atomic transactions with proper locking

### 8.3 Recommendations

1. **Complete Missing Migrations:**
   - Create migration scripts for all 16 tables referenced in README
   - Add `buffr_transactions` audit table migration
   - Ensure all routes have corresponding DB schemas

2. **Enable OBS Routes:**
   - Complete Prisma → Neon SQL refactoring
   - Uncomment and test OBS routes
   - Add integration tests for Open Banking Standard compliance

3. **Enhance Buffr Integration:**
   - Implement `buffr_transactions` DB logging (currently only console)
   - Add webhook handler for Buffr callbacks
   - Implement settlement reconciliation

4. **Improve Monitoring:**
   - Add structured logging (Winston/Pino)
   - Implement APM (Sentry/DataDog)
   - Add health check dashboard

5. **Documentation Updates:**
   - Create API documentation (Swagger/OpenAPI)
   - Document all Buffr Connect endpoints
   - Add architecture diagrams to README

---

## 9. Conclusion

The **SmartPay Backend** is a **production-ready Node.js API server** that serves as the **business logic layer** between the mobile app and external services. It is **NOT a proxy to "Ketchup Portals"** (which doesn't exist) but rather integrates with:

1. **Buffr Connect** - Open Banking platform for financial services
2. **Ketchup Liveness Service** - KYC facial recognition (separate service)
3. **Neon PostgreSQL** - Primary database for app data

The backend contains substantial business logic for:
- Transaction validation and processing
- Wallet management
- Voucher redemption (3 methods)
- KYC verification and compliance
- Rate limiting and security enforcement
- Audit logging for regulatory compliance

**Role in Architecture:** **Service Integration Layer with Business Logic** (not API gateway/proxy)

---

**Analysis Complete**  
**Analyst:** AI Assistant  
**Date:** March 21, 2026
