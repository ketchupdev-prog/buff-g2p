# Buffr G2P – Integration Verification

This document verifies project structure, database migrations, and API surfaces so that all integrations (Node backend, Buffr AI Companion, ML models) are visible and runnable.

---

## 1. Project structure (all levels)

Tree excludes `.git`, `node_modules`, `ai` (venv), `__pycache__`. Run from repo root:

```bash
cd /Users/georgenekwaya/buffr-g2p
tree -L 5 -a -I '.git|node_modules|ai|__pycache__|*.pyc|.env|.env.*' --dirsfirst
```

### Backend layout (summary)

```
backend/
├── buffr_ai/                    # Python AI Companion + ML
│   ├── agents/companion/        # Pydantic AI agent, prompts, tools
│   ├── api/
│   │   ├── companion_endpoint.py  # POST /api/buffr-companion/chat
│   │   └── ml_endpoint.py         # /api/ml/* prediction endpoints
│   ├── graph/                   # LangGraph workflow, state, nodes
│   ├── knowledge_base/          # retrieve, curated_sources
│   ├── ml/                      # 12 ML models (fraud, credit, churn, etc.)
│   │   ├── fraud_detection.py
│   │   ├── credit_scoring.py
│   │   ├── churn_prediction.py
│   │   ├── beneficiary_segmentation.py
│   │   ├── expiry_risk.py
│   │   ├── digital_adoption.py
│   │   ├── spending_analysis.py
│   │   ├── nps_scoring.py
│   │   ├── voucher_forecast.py
│   │   ├── agent_demand.py
│   │   ├── transaction_classification.py
│   │   └── agent_network_features.py
│   ├── models/                  # Trained weights (.pkl, .pt) per model – loaded at startup
│   ├── data/                    # Historical CSVs for training/reference
│   ├── ml_service.py            # Unified ML service; loads from models/ when present
│   ├── main.py                  # FastAPI app, mounts companion + ml routers
│   ├── db_utils.py
│   └── requirements.txt
├── migrations/
│   ├── 001_prd_schema.sql
│   ├── 002_analytics_notifications_atm.sql
│   ├── 003_user_profile_and_pin.sql
│   ├── 004_otp_verification.sql
│   ├── 005_fineract_mapping.sql
│   ├── 006_api_and_compliance.sql
│   ├── 007_ai_companion.sql
│   └── 008_knowledge_base.sql
├── scripts/
│   ├── run-migrations.mjs       # Runs all .sql in order
│   ├── check-db.mjs
│   ├── verify_buffr_ai.py
│   └── ingest_knowledge_base.py
├── src/
│   ├── server.ts                # Express app – all /api/v1/* routes
│   ├── lib/                     # db, otp, security, fineract, openBanking, etc.
│   ├── services/                # wallet, voucher, loan, cashout
│   └── integrations/fineract/
├── package.json                 # "migrate": "node scripts/run-migrations.mjs"
└── docs/
```

### Mobile app (summary)

```
mobile/
├── app/                         # Expo Router screens
│   ├── (tabs)/                  # home, vouchers, transactions, profile, etc.
│   ├── onboarding/
│   ├── send-money/, receive/, wallets/, groups/, loans/, bills/, agents/
│   ├── proof-of-life/, add-card/, merchants/, utilities/
│   └── profile/ai-chat.tsx       # Companion chat UI
├── services/                    # auth, vouchers, wallets, namqr, tokenVault, etc.
└── utils/
```

---

## 2. Database migrations

All migrations live in `backend/migrations/` and are run by one script.

| # | File | Purpose |
|---|------|--------|
| 1 | `001_prd_schema.sql` | Core PRD schema (users, wallets, vouchers, transactions, etc.) |
| 2 | `002_analytics_notifications_atm.sql` | Analytics, notifications, ATM-related tables |
| 3 | `003_user_profile_and_pin.sql` | User profile, PIN storage |
| 4 | `004_otp_verification.sql` | OTP verification tables |
| 5 | `005_fineract_mapping.sql` | Fineract mapping tables |
| 6 | `006_api_and_compliance.sql` | API and compliance tables |
| 7 | `007_ai_companion.sql` | AI Companion / LangGraph checkpointer tables |
| 8 | `008_knowledge_base.sql` | Knowledge base documents for Companion RAG |

### How to run migrations

From **backend** directory (requires `DATABASE_URL` in `backend/.env`):

```bash
cd backend
npm run migrate
```

From repo root:

```bash
node backend/scripts/run-migrations.mjs
```

The script loads `backend/.env`, `backend/.env.local`, and root `.env`, then runs each `.sql` file in lexicographic order. It skips statements that fail with `42P07` (table/index already exists). **Ensure all 8 files run without other errors** to confirm migrations are applied.

### Verify migrations were applied

After running, you can inspect schema:

```bash
cd backend
npm run db:schema
# or
node scripts/db-schema.mjs
```

Or connect with `psql $DATABASE_URL` and list tables (e.g. `\dt`).

---

## 3. APIs

There are **two** API surfaces:

1. **Node/Express** (`backend/src/server.ts`) – main mobile/backend API.
2. **Buffr AI** (`backend/buffr_ai/main.py`) – Companion chat + ML predictions.

They run as separate processes. Mobile app typically calls Node for data and a separate base URL for the Companion (e.g. `http://localhost:8000`).

### 3.1 Node Express API (`server.ts`)

Base path: `/api/v1/` (and a few `/api/` routes).

| Group | Example routes |
|-------|----------------|
| **Auth** | `POST /api/v1/mobile/auth/request-otp`, `send-otp`, `verify-otp`, `verify-2fa`, `GET otp-status`, `POST auth/change-pin` |
| **User** | `GET/PATCH /api/v1/mobile/user/profile`, `POST user/proof-of-life`, `GET user/card` |
| **Wallets** | `GET/POST /api/v1/mobile/wallets`, `GET/PATCH/DELETE wallets/:id`, `POST wallets/:id/add-money`, `POST wallets/:id/cashout` |
| **Transactions** | `GET /api/v1/mobile/transactions`, `GET transactions/:id` |
| **Groups** | `GET/POST /api/v1/mobile/groups`, `GET groups/:id`, etc. |
| **Loans** | `GET /api/v1/mobile/loans`, `GET loans/:id`, `POST loans/apply` |
| **Contacts** | `GET/POST /api/v1/mobile/contacts`, `POST contacts/lookup` |
| **Send** | `POST /api/v1/mobile/send`, `POST send-money` |
| **Vouchers** | `GET /api/v1/mobile/vouchers`, `GET vouchers/:id`, `POST vouchers/:id/redeem` |
| **Receive** | `GET/POST receive/voucher/:voucherId`, `receive/:transactionId`, `POST receive/accept-payment` |
| **Events / Notifications** | `GET/POST /api/v1/mobile/events`, `GET/PATCH notifications`, `POST notifications/:id/read`, `accept`, `decline` |
| **Device** | `POST /api/v1/mobile/device/register` |
| **Agents / ATM** | `GET /api/v1/mobile/agents/nearby`, `nampost/nearby`, `smartpay/nearby`, `atms/nearby` |
| **Compliance** | `POST /api/v1/compliance/incident-report`, `GET audit-logs`, `POST affidavit`, `POST monthly-stats` |
| **USSD** | `POST /api/v1/ussd/menu` (and related USSD handlers) |
| **NAMQR / Token Vault** | `POST /api/v1/mobile/namqr/generate`, `validate`, `namqr/merchant`, `tokenvault/validate`, `tokenvault/generate` |
| **Open Banking** | `GET /api/v1/mobile/open-banking/banks`, `POST consent`, `POST token-exchange`, `GET accounts`, `GET accounts/:id/balance`, `GET accounts/:id/transactions` |
| **Cashout** | `POST /api/cashout/atm-code` |
| **Fineract** | `GET /api/v1/mobile/fineract/health`, `GET /api/v1/fineract/offices` |
| **Health** | `GET /healthz` |

### 3.2 Buffr AI FastAPI (`buffr_ai/main.py`)

Base URL when run: e.g. `http://localhost:8000`.

| Route | Method | Purpose |
|-------|--------|---------|
| `/health` | GET | Health check; returns `ml_available: true` |
| `/api/buffr-companion/chat` | POST | Companion chat (HITL); body: `message`, `thread_id`, optional `resume` |
| `/api/ml/health` | GET | ML service health |
| `/api/ml/models` | GET | List available ML models |
| `/api/ml/fraud-detect` | POST | Fraud detection prediction |
| `/api/ml/credit-score` | POST | Credit scoring |
| `/api/ml/churn-predict` | POST | Churn prediction |
| `/api/ml/spending-analyze` | POST | Spending analysis |
| `/api/ml/nps-score` | POST | NPS scoring |
| `/api/ml/digital-adoption` | POST | Digital adoption |
| `/api/ml/beneficiary-segment` | POST | Beneficiary segmentation |
| `/api/ml/voucher-forecast` | POST | Voucher forecast |
| `/api/ml/agent-demand` | POST | Agent demand |
| `/api/ml/expiry-risk` | POST | Expiry risk |
| `/api/ml/classify-transaction` | POST | Transaction classification |

Companion router is in `buffr_ai/api/companion_endpoint.py`; ML router is in `buffr_ai/api/ml_endpoint.py`; both are mounted in `buffr_ai/main.py`.

---

## 4. ML integration checklist

| Item | Location | Status |
|------|----------|--------|
| ML models | `backend/buffr_ai/ml/*.py` (12 modules) | ✅ Present |
| Unified ML service | `backend/buffr_ai/ml_service.py` | ✅ Present |
| ML API router | `backend/buffr_ai/api/ml_endpoint.py` | ✅ Present |
| Mount in FastAPI app | `buffr_ai/main.py` → `app.include_router(ml_router)` | ✅ Wired |
| Trained weights | `backend/buffr_ai/models/<model_name>/` (.pkl, .pt) | ✅ Loaded at startup by `ml_service._load_trained_weights()` |
| Historical data | `backend/buffr_ai/data/*.csv` (training/reference) | ✅ Present |
| Companion router | `buffr_ai/main.py` → `app.include_router(companion_router)` | ✅ Wired |
| DB pool for Companion/checkpointer | `buffr_ai/main.py` lifespan → `get_db_pool()` | ✅ Used |
| Migrations for AI/kb | `007_ai_companion.sql`, `008_knowledge_base.sql` | ✅ Present |

To confirm Buffr AI (and ML) imports and graph compile:

```bash
cd backend
PYTHONPATH=. python scripts/verify_buffr_ai.py
# Expect: "All buffr_ai imports OK", "Graph: CompiledStateGraph", "Done."
```

To run the Buffr AI server (Companion + ML):

```bash
cd backend
pip install -r buffr_ai/requirements.txt
PYTHONPATH=. uvicorn buffr_ai.main:app --reload --port 8000
# Then: GET http://localhost:8000/health
#       GET http://localhost:8000/api/ml/models
#       POST http://localhost:8000/api/buffr-companion/chat with {"message":"...", "thread_id":"..."}
```

---

## 5. Quick verification commands

```bash
# From repo root
cd /Users/georgenekwaya/buffr-g2p

# 1. Migrations (requires DATABASE_URL in backend/.env)
cd backend && npm run migrate

# 2. Node API (build + start)
cd backend && npm run build && npm start

# 3. Buffr AI (Companion + ML)
cd backend && PYTHONPATH=. uvicorn buffr_ai.main:app --reload --port 8000

# 4. Verify Buffr AI imports and graph
cd backend && PYTHONPATH=. python scripts/verify_buffr_ai.py
```

---

**Document version:** 1.0  
**Last updated:** March 2026  
**Purpose:** Single reference for structure, migrations, and APIs for Buffr G2P integrations.

---

## 6. Troubleshooting migrations

- **"column X does not exist"** – The database may already have tables from an earlier run. `CREATE TABLE IF NOT EXISTS` skips creation, so later statements (e.g. indexes) that reference columns from a newer schema can fail. Options: (1) Use a fresh database for development and run `npm run migrate` once; (2) Manually align existing tables with the current migration SQL; (3) Add a migration tracking table and skip already-applied files in `run-migrations.mjs`.
- **DATABASE_URL not set** – Ensure `backend/.env` (or `backend/.env.local`) contains `DATABASE_URL` (Neon PostgreSQL connection string). The migrate script loads these files automatically.
- **SSL warning (pg)** – You may see a warning about `sslmode=prefer`; migrations still run. For future-proofing, use `sslmode=verify-full` in the connection string or the flag indicated in the warning.
