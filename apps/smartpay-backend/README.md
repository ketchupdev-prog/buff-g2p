# SmartPay Backend (Node.js API Layer)

Production-ready backend API server following Buffr G2P architecture patterns.

**Architecture:** This Node.js backend serves as the primary API layer for user data, wallets, transactions, and authentication. It integrates with the Python AI backend (`backend_python/`) which provides AI Copilot capabilities with 6 agents, 5 ML models, and 3 databases.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Run migrations
npm run migrate

# Seed test data
npm run seed

# Start development server
npm run dev
```

Server runs at: `http://localhost:4000`

## Python AI Backend Integration

The Python AI backend (`backend_python/`) calls this Node.js API for:
- User profile data (DRY principle - single source of truth)
- Wallet operations and balance queries
- Transaction history
- Authentication validation
- Write actions (transfers, wallet creation, bill payments)

**AI Capabilities:**
- 6 AI agents (1 orchestrator + 5 specialists) using Pydantic AI
- LangGraph workflow with Human-in-the-Loop (HITL)
- RAG with bge-m3 embeddings (1024-dim, <50ms semantic search)
- 5 ML models for fraud detection, credit scoring, and analytics
- 3-database architecture: PostgreSQL + LanceDB (bge-m3 vectors) + DuckDB

See `../backend_python/README.md` for complete Python backend documentation and bge-m3 setup.

## Documentation

- **API routing & versioning**: [docs/API_ROUTING.md](./docs/API_ROUTING.md) — canonical `/api/v1/*`, legacy `/api/*`, PSD-12 security mounts
- **Open Banking (OBS)**: [docs/OBS_ROUTES.md](./docs/OBS_ROUTES.md) — mobile/copilot OBS, BoN TPP shape, mock provider
- **Setup Guide**: [BACKEND_SETUP_GUIDE.md](./BACKEND_SETUP_GUIDE.md) - Complete setup and deployment guide
- **Backend architecture analysis (archived)**: [SMARTPAY_BACKEND_ANALYSIS.md](../../.archive/old-reports/SMARTPAY_BACKEND_ANALYSIS.md)

## Features

- **Digital Wallets**: Multi-wallet support with atomic transactions
- **Voucher System**: Social grant distribution and redemption
- **Loan Management**: Voucher-backed microloans
- **P2P Transfers**: Secure peer-to-peer payments
- **Authentication**: ✅ **Supabase JWT + Buffr Connect integration (COMPLETE)**
- **Security**: Rate limiting, input validation, audit logging
- **Open Banking**: Buffr Connect AIS integration for account aggregation

## Architecture

```
backend/
├── src/
│   ├── routes/        # API endpoints
│   ├── services/      # Business logic
│   ├── lib/           # Core utilities
│   ├── middleware/    # Express middleware
│   └── types/         # TypeScript types
├── migrations/        # Database migrations
├── scripts/           # Utility scripts
└── .env.example       # Environment template
```

## API Endpoints

Versioning policy:
- Canonical base path: `/api/v1/*`
- Backward-compatible aliases remain available for selected legacy paths while clients migrate.

### Authentication
- `POST /api/v1/auth/request-otp` - Request OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/validate` - Validate JWT token (called by Python backend)

### Users
- `GET /api/v1/users/profile` - Get user profile (called by Python backend for DRY)
- `PATCH /api/v1/users/profile` - Update profile
- `POST /api/v1/users/pin` - Set PIN
- `POST /api/v1/users/verify-pin` - Verify PIN

### Wallets
- `GET /api/v1/wallets` - List wallets (called by Python backend)
- `POST /api/v1/wallets` - Create wallet (called by Python backend)
- `GET /api/v1/wallets/:id` - Get wallet (called by Python backend)
- `PATCH /api/v1/wallets/:id` - Update wallet
- `GET /api/v1/wallets/:id/transactions` - Get transactions (called by Python backend)

### Transactions
- `POST /api/v1/send-money` - Send money P2P (called by Python backend)
- `POST /api/v1/transactions/send` - Transfer money (called by Python backend)
- `GET /api/v1/transactions` - List transactions (called by Python backend)
- `GET /api/v1/transactions/summary` - Summary stats (optional `days` query)

### Copilot (AI)

Two surfaces coexist on **`/api/v1`** (see [`src/routes/v1/apiRouter.ts`](./src/routes/v1/apiRouter.ts)): the **proxy** is registered first so `/copilot/chat` hits FastAPI when enabled.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | **`/api/v1/copilot/chat`** | **AI proxy** — forwards JSON body and `Authorization` to **`${AI_SERVICE_URL}/api/v1/copilot/chat`** ([`src/routes/copilotProxy.ts`](./src/routes/copilotProxy.ts)). JWT required (`requireAuth` + strict rate limit). |
| `POST` | **`/api/v1/copilot`** | **Local agent** — in-process SmartPay agent via `runSmartpayAgent` ([`src/routes/copilotEndpoint.ts`](./src/routes/copilotEndpoint.ts)). Body: `{ message, messageHistory?, stream? }`. |
| `GET` | **`/api/v1/copilot/health`** | Data layer health (Postgres / LanceDB / DuckDB). |
| `POST` | **`/api/v1/copilot/tools`** | Lists registered agent tools (metadata). |

Knowledge base routes (RAG) live under **`/api/v1/copilot/knowledge/*`** — see [`src/routes/knowledgeBase.ts`](./src/routes/knowledgeBase.ts).

**Environment variables**

| Variable | Purpose |
|----------|---------|
| **`AI_SERVICE_URL`** | Base URL of **smartpay-ai** (default `http://localhost:8000`). Used only by the copilot **proxy**. |
| **`AI_SERVICE_ENABLED`** | Documented in [`.env.example`](./.env.example) for ops (“is FastAPI expected to be up?”). The proxy route stays mounted; ensure `AI_SERVICE_URL` is reachable when testing chat. |

**Testing examples**

```bash
# Local agent (needs JWT)
curl -s -X POST http://localhost:4000/api/v1/copilot \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What wallets do I have?"}'

# Proxy to Python (needs JWT + smartpay-ai on AI_SERVICE_URL)
curl -s -X POST http://localhost:4000/api/v1/copilot/chat \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Show my balance","thread_id":"11111111-1111-4111-8111-111111111111"}'
```

**Scripts:** LanceDB/DuckDB/agent smoke tests: `npx ts-node scripts/testCopilot.ts` (from this app directory).

**Further reading:** [Copilot API guide](../../docs/guides/api/copilot-api.md) · [Test scenarios](../../docs/guides/reference/copilot-test-scenarios.md).

### Open Banking (OBS)
- `GET /api/v1/obs/providers` — list data providers (JWT)
- `GET /api/v1/obs/consents` — list consents (JWT)
- See [docs/OBS_ROUTES.md](./docs/OBS_ROUTES.md) for full OBS surface (AIS/PIS, BoN TPP, mock)

### Vouchers
- `GET /api/v1/vouchers` - List vouchers
- `POST /api/v1/vouchers/:id/redeem` - Redeem voucher

### Loans
- `POST /api/v1/loans/apply` - Apply for loan
- `GET /api/v1/loans` - List loans

### Groups
- `POST /api/v1/groups` - Create group (called by Python backend)
- `GET /api/v1/groups` - List groups (called by Python backend)
- `POST /api/v1/groups/:id/join` - Join group (called by Python backend)

### Agent locations (PostGIS)
All routes require `Authorization: Bearer <JWT>`. Per-route rate limit defaults to **100 requests/minute** (`express-rate-limit`). Override with `AGENTS_RATE_LIMIT_MAX`. Nearest results are cached **15 minutes** in Redis when `REDIS_URL` is set; otherwise an in-memory TTL cache is used.

- `GET /api/v1/agents/nearest?lat=&lng=&radius=&service=&type=` — `radius` in **meters** (default `5000`). Optional `service`: `cashout` | `voucher` | `ewallet` | `namqr`. Optional `type`: `agent` | `atm` | `nampost`. Response: `{ data, agents, count, cached? }` with `distance_meters`, `distance_km`, and legacy fields (`agent_name`, `supports_*`).
- `GET /api/v1/atms/nearby?lat=&lng=&radius=&service=` — **Alias** for nearest search with `type=atm` fixed (mobile clients).
- `GET /api/v1/locations/nampost?lat=&lng=&radius=&service=` — **Alias** for nearest search with `type=nampost` fixed (mobile clients).
- `GET /api/v1/agents/region/:region` — Active agents whose `region` matches (case-insensitive), e.g. `Khomas`, `Erongo`.
- `GET /api/v1/agents/search?q=` — `ILIKE` search on `name` and `city` (min query length 2).
- `GET /api/v1/agents/:agentCode` — Single row by `agent_code`.
- `POST /api/v1/agents` — Create location (`agent_code`, `name`, `type`, `latitude`, `longitude`, optional `address`, `city`, `region`, `services[]`, `operating_hours`, `contact_phone`).

**Migrations:** `migrations/008_enable_postgis.sql`, `009_create_agent_locations.sql`, `010_seed_agent_locations.sql` (run after canonical `fintech/database/migrations` via `npm run migrate`).

**Note:** Endpoints marked with "(called by Python backend)" are used by the AI Copilot system for write actions and data retrieval.

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0
- **Framework**: Express 4.22
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: JWT + OTP
- **Security**: bcryptjs, helmet, rate limiting

## Environment Variables

Required:
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-key

# Server
PORT=4000
NODE_ENV=development

# Python AI Backend Integration (optional)
PYTHON_AI_BACKEND_URL=http://localhost:8000
ENABLE_AI_COPILOT=true

# Copilot: proxy mobile/chat to FastAPI (see src/routes/copilotProxy.ts)
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_ENABLED=true
```

See `.env.example` for all options.

**Python Backend Configuration:**
The Python AI backend (`backend_python/`) requires these environment variables:
```env
# Node.js API Base URL (for calling back to this backend)
SMARTPAY_API_BASE_URL=http://localhost:4000

# LLM
DEEPSEEK_API_KEY=sk-...
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat

# Databases
DATABASE_URL=postgresql://...  # Same PostgreSQL database
LANCEDB_PATH=./data/lancedb
DUCKDB_PATH=./data/analytics.duckdb

# Embeddings (bge-m3 runs locally - no API key needed)
# Python dependencies: sentence-transformers, FlagEmbedding
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm start            # Start production server
npm run migrate      # Run database migrations
npm run seed         # Seed test data
npm test             # Run tests
```

## Database Schema

- `agent_locations` — SmartPay / ATM / NamPost points (`GEOGRAPHY(POINT,4326)`), `services` text array, optional `REDIS_URL` for nearest-query cache.

Tables:
- `users` - User accounts
- `wallets` - Digital wallets
- `wallet_transactions` - Transaction history
- `vouchers` - Social grant vouchers
- `loans` - Loan records
- `p2p_transactions` - P2P transfers
- `otp_codes` - OTP verification
- `user_sessions` - JWT sessions
- `refresh_tokens` - Refresh tokens

## Security Features

- OTP-based authentication with rate limiting
- JWT tokens with short expiry (15 minutes)
- Atomic database transactions
- Row-level locking for concurrent operations
- Input validation and sanitization
- SQL injection prevention
- Rate limiting (100 req/15min)
- Audit logging

## Testing

```bash
# Run all tests
npm test

# Test specific features
npm run test:auth
npm run test:wallets
npm run test:transactions
```

## Deployment

### Railway
```bash
railway init
railway add postgresql
railway up
```

### Docker
```bash
docker build -t smartpay-backend .
docker run -p 4000:4000 --env-file .env smartpay-backend
```

See [BACKEND_SETUP_GUIDE.md](./BACKEND_SETUP_GUIDE.md) for detailed deployment instructions.

## Support

- Setup Guide: [BACKEND_SETUP_GUIDE.md](./BACKEND_SETUP_GUIDE.md)
- API routing: [docs/API_ROUTING.md](./docs/API_ROUTING.md)
- Architecture (archived): [SMARTPAY_BACKEND_ANALYSIS.md](../../.archive/old-reports/SMARTPAY_BACKEND_ANALYSIS.md)

---

**Version**: 1.0.0  
**License**: MIT  
**Architecture**: Following Buffr G2P Patterns  

**Last updated:** 2026-03-21 (Supabase Auth + Buffr Connect Integration Complete)

---

## Supabase Auth Integration

**Status:** ✅ **COMPLETE AND TESTED**

SmartPay backend now fully supports Supabase JWT authentication with seamless Buffr Connect integration.

### Key Components

1. **JWT Verification Service** (`src/services/auth/supabase-verify.ts`)
   - Validates Supabase-issued JWTs using `@supabase/supabase-js`
   - Uses `client.auth.getUser(token)` for secure verification
   - No custom JWT secrets needed

2. **Authentication Middleware** (`src/middleware/requireAuth.ts`)
   - Primary: Verifies Supabase JWTs
   - Fallback: Legacy JWT support for backward compatibility
   - Attaches `userId` and `userEmail` to requests

3. **Buffr Connect Client** (`src/lib/buffrConnectClient.ts`)
   - Forwards Supabase tokens to Buffr Connect
   - Supports AIS (Account Information Services)
   - Environment-based configuration

### Environment Configuration

```bash
# Supabase (from buffr-connect/buffrconnect/.env.local)
SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Buffr Connect Integration
BUFFR_CONNECT_URL=http://localhost:3000
BUFFR_API_KEY=buffr_live_...
BUFFR_WEBHOOK_SECRET=<generate-with-openssl-rand-hex-32>
```

### Testing

Integration tests verify the complete auth flow:

```bash
npm test -- __tests__/integration/auth/

# Tests include:
# - Supabase JWT validation
# - Token refresh flow
# - Buffr Connect integration
# - End-to-end auth flow
```

### Documentation

- **Complete Auth Flow**: [../../docs/AUTH_FLOW.md](../../docs/AUTH_FLOW.md)
- **Integration Guide**: [../../docs/INTEGRATION_GUIDE.md](../../docs/INTEGRATION_GUIDE.md)
- **Buffr API Reference**: [../../docs/guides/api/buffr-reference.md](../../docs/guides/api/buffr-reference.md)

---

**Last updated:** 2026-03-21 (Copilot proxy + local `/copilot` documentation)
