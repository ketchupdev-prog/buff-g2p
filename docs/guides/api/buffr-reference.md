# BuffrConnect Quick Reference

**Last Updated:** March 17, 2026  
**Full Report:** `BUFFRCONNECT_ARCHITECTURE_REPORT.md`

---

## ⚡ Critical Facts

### Database Setup

```
✅ BuffrConnect uses its OWN Supabase database
✅ Smartpay uses its OWN Neon PostgreSQL database
❌ They DO NOT share a database
✅ Integration via REST API + Webhooks
```

**BuffrConnect Supabase:**
- **Project ID:** `cjmtcxfpwjbpbctjseex`
- **URL:** `https://cjmtcxfpwjbpbctjseex.supabase.co`
- **Tables:** 23+ (users, providers, consents, accounts, transactions, api_keys, webhooks, audit_logs)
- **Purpose:** Open banking data aggregation

**Smartpay Neon:**
- **Connection:** `ep-rough-frog-ad0dg5fe-pooler.c-2.us-east-1.aws.neon.tech`
- **Tables:** 246 (wallets, vouchers, G2P, agents, open_banking_*)
- **Purpose:** E-money wallet & G2P voucher platform

---

## 🔗 Integration Pattern

```
Smartpay (Neon DB)
       ↓
   REST API Call
   Authorization: Bearer {token}
       ↓
BuffrConnect API (Supabase DB)
       ↓
   Validates consent
   Returns data
       ↓
Smartpay stores in open_banking_* tables
```

**Key Point:** Smartpay DOES NOT query BuffrConnect's Supabase database directly. It calls REST APIs.

---

## 🔐 Authentication Layers

| Layer | Technology | Used By | Purpose |
|-------|-----------|---------|---------|
| **1. User Auth** | Supabase Auth | End users | Login to BuffrConnect UI |
| **2. TPP Auth** | OAuth 2.0 + PKCE | Smartpay | Get consent for data access |
| **3. API Auth** | Bearer token or API key | Smartpay backend | Call BuffrConnect APIs |

---

## 📡 API Endpoints (Smartpay Uses These)

```bash
# OAuth Flow
POST /api/oidc/par                                    # Start OAuth
GET /api/oidc/authorize?request_uri=xxx               # User consent
POST /api/oidc/token                                  # Get tokens

# Account Data
GET /api/accounts                                     # List accounts
GET /api/accounts/{id}/balance                        # Get balance
GET /api/accounts/{id}/transactions                   # Get transactions

# Consent Management
GET /api/consents                                     # List consents
PATCH /api/consents/{id}                             # Renew/revoke

# Webhooks
POST /api/webhooks                                    # Register webhook
```

---

## 🔑 Environment Variables

**BuffrConnect (`.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_h_YZ75mkiV-M4nIiHWTevg_W0mZsCWC
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (admin operations)
SMARTPAY_WEBHOOK_SECRET=d96ddb92... (send webhooks to Smartpay)
SANDBOX_MODE=true
```

**Smartpay (`.env.example`):**
```env
DATABASE_URL=postgresql://... (Neon, not Supabase)
BUFFR_API_KEY=bfr_... (get from BuffrConnect UI)
BUFFR_API_URL=https://connect.buffr.ai
BUFFR_WEBHOOK_SECRET=d96ddb92... (validate webhooks from BuffrConnect)
```

---

## 📊 Data Synchronization

**How Smartpay Gets BuffrConnect Data:**

1. **Initial Sync (API Pull):**
   - User links bank account via OAuth
   - Smartpay calls `GET /api/accounts`
   - Smartpay stores in `open_banking_accounts` table

2. **Real-Time Updates (Webhook Push):**
   - BuffrConnect detects new transaction
   - Sends webhook to `https://api.ketchup.cc/webhooks/buffr`
   - Smartpay validates signature and updates local DB

3. **Periodic Reconciliation:**
   - Daily/weekly API calls to ensure data consistency
   - Compare local vs. remote data
   - Flag discrepancies for investigation

---

## 🗂️ Database Schema Comparison

| Table | BuffrConnect (Supabase) | Smartpay (Neon) |
|-------|-------------------------|-----------------|
| **Users** | ✅ `users` (Supabase Auth) | ✅ `users` (JWT auth) |
| **Accounts** | ✅ `accounts` (bank accounts) | ✅ `open_banking_accounts` (synced from BuffrConnect) |
| **Transactions** | ✅ `transactions` (bank txns) | ✅ `open_banking_transactions` (synced) |
| **Consents** | ✅ `consents` (OAuth grants) | ✅ `oauth_consents` (tracks BuffrConnect consents) |
| **Wallets** | ❌ Not in scope | ✅ `wallets`, `ewallet_balances` |
| **Vouchers** | ❌ Not in scope | ✅ `vouchers`, `voucher_redemptions` |
| **API Keys** | ✅ `api_keys` (TPP access) | ❌ Not needed |

---

## 🔧 Supabase Client Usage

**Three Client Types:**

```typescript
// 1. Browser (Client Components)
import { supabase } from '@/lib/supabase/client';
const { data } = await supabase.from('providers').select('*');

// 2. Server (API Routes)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
const { data } = await supabase.from('accounts').select('*');

// 3. Admin (Bypass RLS)
import { supabaseAdmin } from '@/lib/db/client';
const { data } = await supabaseAdmin.from('audit_logs').select('*');
```

---

## 📋 Migration Files (37 Total)

**Core Migrations:**
1. `20260310000001_initial_schema.sql` - Users, providers, accounts
2. `20260310000002_audit_compliance.sql` - Audit logs, incidents
3. `20260310000003_ussd_offline.sql` - Token vault, USSD
4. `20260310000004_developer_monitoring.sql` - API clients, webhooks
5. `20260310000005_encryption_functions.sql` - AES-256 encryption
6. `20260310000006_seed_providers.sql` - 4 Namibian banks + sandbox

---

## 🧪 Testing

**Test Suites:**
- **Unit Tests:** 230+ tests (96% pass rate)
- **Integration Tests:** 93 tests (sandbox API)
- **E2E Tests:** Playwright (OAuth flow, consent)
- **Sandbox Users:** 121 mock users

**Run Tests:**
```bash
npm test                          # All tests
npm run test:integration          # API integration
npm run test:e2e:playwright       # E2E tests
npm run verify:supabase           # Connection test
```

---

## 🚀 Quick Start

```bash
# 1. Setup
cd /Users/georgenekwaya/Downloads/ai-agent-mastery-main/buffr-connect/buffrconnect
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# 2. Install
npm install

# 3. Verify Supabase connection
npm run verify:supabase

# 4. Run migrations (via Supabase dashboard)
# Upload files from supabase/migrations/ to Supabase SQL Editor

# 5. Seed sandbox data
npm run seed:sandbox

# 6. Start dev server
npm run dev

# 7. Test
open http://localhost:3000
```

---

## ⚠️ Common Misconceptions (Corrected)

| Misconception | Reality |
|---------------|---------|
| "BuffrConnect and Smartpay share a database" | ❌ They use separate databases (Supabase vs Neon) |
| "Smartpay queries BuffrConnect's Supabase directly" | ❌ Smartpay calls REST APIs, never direct DB access |
| "Same user ID in both systems" | ❌ Different UUIDs, linked by email/phone |
| "Supabase Auth used by both" | ❌ Only BuffrConnect uses Supabase Auth |
| "Single authentication system" | ❌ Multi-layer: Supabase Auth + OAuth 2.0 + API keys |

---

## 🎯 For PLANNING.md Authors

**Key Points to Include:**

1. **Separate Databases:**
   - BuffrConnect: Supabase (open banking)
   - Smartpay: Neon (e-money wallets)

2. **Integration Method:**
   - REST API calls (not database queries)
   - OAuth 2.0 for user consent
   - Webhooks for real-time updates

3. **Authentication:**
   - Supabase Auth for BuffrConnect users
   - OAuth 2.0 for TPP (Smartpay) authorization
   - API keys for server-to-server

4. **Data Flow:**
   - Smartpay → BuffrConnect API → Supabase DB
   - BuffrConnect Webhooks → Smartpay → Neon DB

5. **Compliance:**
   - 90-day consent maximum (OBS 2025)
   - 4 requests/day per account (OBS 2025)
   - Audit logs with SHA-256 integrity (ETA 2019)

---

**See `BUFFRCONNECT_ARCHITECTURE_REPORT.md` for complete details.**
