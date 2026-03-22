# SmartPay AI — AI & Data Infrastructure Guide

**Scope:** Python FastAPI service at `fintech/apps/smartpay-ai/`  
**Sources:** `README.md`, `PLANNING.md`, `requirements.txt`, `smartpay_ai/main.py`, API routers, `db_utils.py`, `duckdb_manager.py`, `knowledge_base/*`, `ml/*`, `ml_service.py`, live inspection of `data/analytics.duckdb` (March 2026), and `data/lancedb/` layout.

This document describes the **AI backend infrastructure**: stack, databases, ML models, HTTP API, and how the service integrates with the SmartPay Node backend.

---

## 1. Technology stack

| Layer | Technology | Role |
|--------|------------|------|
| API | **FastAPI** 0.115, **Uvicorn** | REST + lifespan hooks |
| Streaming | **sse-starlette** | SSE for `/api/v1/copilot/chat/stream` |
| Agents | **Pydantic AI** 0.0.14, **LangGraph** 0.2.45, **LangChain** (OpenAI/Anthropic) | Multi-agent copilot, HITL, checkpoints |
| Primary DB | **PostgreSQL** (e.g. Neon) via **asyncpg** + **psycopg** | App data, LangGraph **AsyncPostgresSaver** checkpoints |
| Vectors | **LanceDB** 0.13, **PyArrow** | RAG / knowledge base embeddings |
| Analytics OLAP | **DuckDB** 1.1.3 | Transaction analytics, reporting, ETL targets |
| Embeddings | **sentence-transformers** → **BAAI/bge-m3** (1024-dim) | Query + document vectors (local model download on first use) |
| ML (optional) | **scikit-learn**, **XGBoost**, **joblib**, **numpy/pandas/scipy** | Fraud, credit, clustering, classification, regression |
| HTTP to Node | **httpx** | Profile fetch, health, security middleware → SmartPay API |

**Environment (representative):** see `apps/smartpay-ai/.env.example` — `DATABASE_URL`, `SMARTPAY_API_BASE_URL`, `LLM_PROVIDER` / `LLM_MODEL` / `LLM_API_KEY`, `ML_ENABLED`, `LANCEDB_PATH`, `DUCKDB_PATH`, `BGE_M3_MODEL_NAME`, optional `REDIS_URL`, `ALLOWED_ORIGINS`, `PORT`.

---

## 2. Data stores and schemas

### 2.1 PostgreSQL

- **Purpose:** System of record for SmartPay (users, wallets, transactions, etc.) and **LangGraph checkpoint / thread state** (conversation continuity, HITL).
- **Connection:** `DATABASE_URL` (or `SMARTPAY_CHECKPOINT_DATABASE_URL` for graph only, if set).
- **AI-specific SQL:** migrations under `apps/smartpay-ai` / `smartpay_ai/data/migrations` (per project README — conversation history, preferences, knowledge metadata as applicable).
- **Admin usage:** `GET /api/v1/admin/stats` queries the `checkpoints` table for coarse usage metrics.

### 2.2 DuckDB (`data/analytics.duckdb`)

**Purpose:** Fast analytical queries over synced or generated payment data; feeds **analytics HTTP API**, agent tooling, dashboards, and ML feature pipelines. ETL metadata tracks sync runs.

**Default path:** `DUCKDB_PATH` (default `./data/analytics.duckdb` from app root `apps/smartpay-ai/`).

**Additional bootstrap schema** (when using `get_duckdb()` in `smartpay_ai/db_utils.py`): `transaction_analytics`, `ml_training_data`, `spending_patterns` — useful for lightweight setups; the **DuckDBManager** path is the main analytics surface.

#### Tables observed in the checked-in `analytics.duckdb` (March 2026)

| Table | Purpose |
|-------|---------|
| `transactions` | Core fact table: id, user_id, amount, category, merchant, location, timestamp, wallet_id, status, device_id, ip_address, currency |
| `fraud_events` | Per-transaction fraud flags, risk_score, reasons, review workflow |
| `fraud_rules` | Configurable rule catalog (velocity, amount, device, KYC, etc.) |
| `user_risk_profiles` | Aggregated user risk level/score, counts, kyc_tier |
| `user_spending_patterns` | Monthly rollups: spending, counts, top category, distribution JSON |
| `user_activity_summary` | Daily per-user activity and category JSON |
| `daily_transaction_summary` | Platform-wide daily KPIs (volume, counts, success_rate) |
| `budget_limits` | Per-user per-category monthly limits |
| `groups`, `group_members`, `group_transactions` | Group / Stokvel-style analytics |
| `split_bills`, `split_bill_shares` | Split-bill analytics |
| `etl_metadata` | Last sync time, row counts, status per source table |

**Note:** `DuckDBManager._init_unified_schema()` in code may not match every column of a long-lived file after ETL evolution; treat the **live file** (or `DESCRIBE` / `information_schema`) as authoritative for production.

**Maintenance endpoints:** `POST /api/v1/analytics/system/materialize`, `POST /api/v1/analytics/system/optimize` (CHECKPOINT).

### 2.3 LanceDB (`data/lancedb/`)

**Purpose:** Vector store for **semantic RAG** over FAQs, policy, and product copy; supports **global** vs **user-scoped** documents.

**Default path:** `LANCEDB_PATH` (default `./data/lancedb`).

**On-disk layout (repo sample):** Lance tables such as `knowledge_base.lance/` (and optional `test_kb.lance/`).

**Logical table:** `knowledge_base`  
**Schema** (created in `get_or_create_knowledge_table()` in `smartpay_ai/db_utils.py`):

| Column | Type | Notes |
|--------|------|--------|
| `id` | string | Document id |
| `title` | string | |
| `content` | string | Full text |
| `embedding` | list&lt;float32&gt; length **1024** | bge-m3 |
| `metadata` | string | JSON serialized |
| `user_id` | string | Empty for global docs |
| `scope` | string | `global` or `user` |
| `created_at` | timestamp ms | |

**Retrieval:** `smartpay_ai/knowledge_base/retrieve.py` — cosine-style search via LanceDB, `similarity = 1 - _distance`, default `score_threshold=0.7`, filters by `scope` + `user_id`.

**Ingestion:** `ingest.py` (batch embeddings), admin `POST /api/v1/admin/knowledge-base/ingest` (uses `add_articles_to_knowledge_base` in `retrieve.py` for bulk articles).

---

## 3. ML models (codebase)

All five are wired through **`smartpay_ai.ml_service.MLService`** and `MLModelType`; weights load from `smartpay_ai/models/<model_name>/` when present (`joblib` artifacts + optional `metadata.json` for **ModelRegistry**).

| Model key | Module | Purpose | Reported / target metrics (from README & module docstrings) |
|-----------|--------|---------|------------------------------------------------------------|
| `fraud_detection` | `ml/fraud_detection.py` | Real-time fraud probability, risk level, recommendations | README: ~**93% ROC-AUC**, **86% PR-AUC**; code targets high precision/recall |
| `credit_scoring` | `ml/credit_scoring.py` | Credit score / risk category for lending-style decisions | README: ~**94% ROC-AUC**, **94% PR-AUC** |
| `spending_analysis` | `ml/spending_analysis.py` | Spending segment / pattern + recommendations | README: **Silhouette ~0.71**; targets &gt;80% classification where applicable |
| `transaction_classification` | `ml/transaction_classification.py` | Merchant/category-style labels | README cites **100%** on test set (treat as **synthetic or narrow eval** in production planning) |
| `savings_forecast` | `ml/savings_forecast.py` | Goal achievement / timeline forecasting | README: **R² ~0.95**, **RMSE ~4.41**; module targets **R² &gt; 0.85** |

**Training:** scripts under `smartpay_ai/training/` (e.g. fraud, credit, spending); registry in `smartpay_ai/ml/model_registry.py`.

**Enable serving:** `ML_ENABLED=true` and installed ML dependencies.

---

## 4. HTTP API specification

**Global prefix:** Most features under **`/api/v1/*`**. **OpenAPI:** `/docs`, `/redoc`, `/openapi.json`.

### 4.1 Core & copilot

| Method | Path | Function |
|--------|------|----------|
| `GET` | `/health` | Liveness: `status`, `ml_available`, `graph_available` |
| `GET` | `/` | Service index, endpoint map, rate-limit hints |
| `POST` | `/api/v1/copilot/chat` | LangGraph chat / HITL resume; **`thread_id` required**; JWT → Node profile |
| `POST` | `/api/v1/copilot/chat/stream` | Same contract via **SSE** |

**Copilot auth:** `Authorization: Bearer <JWT>`. Profile: **`GET {SMARTPAY_API_BASE_URL}/api/v1/user/profile`** (see `user_profile.py`).

### 4.2 Health (component)

| Method | Path | Function |
|--------|------|----------|
| `GET` | `/api/v1/health/detailed` | PostgreSQL, LanceDB, DuckDB, ML flag, **Node** `/health`, LangGraph graph on `app.state` |

### 4.3 ML

| Method | Path | Function |
|--------|------|----------|
| `POST` | `/api/v1/ml/predict` | Body: `model_type`, `features`, optional `user_id` |
| `GET` | `/api/v1/ml/models` | Model list + metadata |
| `GET` | `/api/v1/ml/health` | ML subsystem health |
| `POST` | `/api/v1/ml/train` | Background training trigger (dev-oriented) |

**API vs core enum names:** The HTTP layer uses `ModelType` values `fraud_detection`, `transaction_categorization`, `spend_prediction`, `risk_assessment`. The **canonical** internal enum in `ml_service.py` is `MLModelType`: `fraud_detection`, `credit_scoring`, `spending_analysis`, `transaction_classification`, `savings_forecast`. Align clients and consider normalizing the API layer to avoid confusion.

**Implementation note:** `ml_endpoint.py` imports `get_ml_service` from `smartpay_ai.ml`, but the singleton is defined in **`smartpay_ai.ml_service`**. If predictions fail at import time, point the router at `smartpay_ai.ml_service.get_ml_service` or re-export from `smartpay_ai/ml/__init__.py`. Same pattern for `reload_models` used by admin reload.

### 4.4 Admin (JWT + admin role on `request.state.user`)

| Method | Path | Function |
|--------|------|----------|
| `POST` | `/api/v1/admin/knowledge-base/ingest` | Bulk LanceDB ingest |
| `GET` | `/api/v1/admin/stats` | Conversation/checkpoint-derived stats (+ placeholders for latency/intents) |
| `POST` | `/api/v1/admin/models/reload` | Reload ML weights |
| `GET` | `/api/v1/admin/system-info` | Safe config snapshot (paths, flags, versions) |

### 4.5 Analytics (DuckDB)

| Method | Path | Function |
|--------|------|----------|
| `GET` | `/api/v1/analytics/transactions` | Aggregates, category breakdown, time series |
| `GET` | `/api/v1/analytics/transactions/merchant/{merchant}` | Merchant-specific stats |
| `GET` | `/api/v1/analytics/transactions/merchants` | Top merchants |
| `GET` | `/api/v1/analytics/transactions/trends` | Trends: metric × interval |
| `GET` | `/api/v1/analytics/users/{user_id}` | User spending + fraud export for agents |
| `GET` | `/api/v1/analytics/users/{user_id}/spending` | Spending engine insights |
| `GET` | `/api/v1/analytics/fraud` | Fraud stats + high-risk list |
| `GET` | `/api/v1/analytics/fraud/user/{user_id}/risk` | User fraud export |
| `POST` | `/api/v1/analytics/fraud/transaction/{transaction_id}/analyze` | Rule-based anomaly hints |
| `GET` | `/api/v1/analytics/reports/dashboard` | Executive dashboard query |
| `GET` | `/api/v1/analytics/reports/monthly` | Monthly summary |
| `GET` | `/api/v1/analytics/reports/categories` | Category performance |
| `GET` | `/api/v1/analytics/system/info` | DB size, tables, ETL status |
| `POST` | `/api/v1/analytics/etl/sync` | Postgres → DuckDB sync (`pg_conn_string` query param) |
| `POST` | `/api/v1/analytics/system/materialize` | Refresh daily summaries |
| `POST` | `/api/v1/analytics/system/optimize` | CHECKPOINT / optimize |
| `POST` | `/api/v1/analytics/query/execute` | **SELECT-only** ad-hoc SQL (must be locked down in production) |

**Middleware:** CORS, security headers, JWT auth (`AuthMiddleware`, excludes docs), **2FA** and **fraud** middleware for configured payment paths hitting Node, rate limits (`RateLimitMiddleware`, payment-specific limits). See `smartpay_ai/middleware/`.

---

## 5. Integration with SmartPay Backend (Node)

| Integration | Direction | Details |
|-------------|-----------|---------|
| User context | AI → Node | `fetch_user_profile`: **`GET /api/v1/user/profile`** with Bearer token |
| Mobile / gateway | Node → AI | Recommended: **`POST /api/v1/copilot/chat`** on Node proxies to **`${AI_SERVICE_URL}/api/v1/copilot/chat`** with forwarded `Authorization` (see `fintech/README.md`, `copilotProxy.ts`) |
| Health | AI → Node | Detailed health checks **`GET {SMARTPAY_API_BASE_URL}/health`** |
| Security | AI → Node | 2FA / fraud middleware call Node endpoints for payment-class paths (see `middleware/security.py`) |
| ETL | Postgres → DuckDB | `POST /api/v1/analytics/etl/sync` and cron-friendly scripts (e.g. `scripts/etl_sync_cron.py`) |

**Contract:** JWTs issued by SmartPay auth are validated on the AI service and reused to hydrate **one source of truth** for user data on Node.

---

## 6. Deployment requirements

1. **Python** 3.10+ (project uses 3.11+ features in places).  
2. **Install:** `pip install -r apps/smartpay-ai/requirements.txt`.  
3. **Secrets:** `DATABASE_URL`, `LLM_API_KEY` (or provider-specific), never commit `.env`.  
4. **PostgreSQL:** reachable from AI service; run SQL migrations per app README.  
5. **Node backend:** running for profile + proxy + security integrations; set `SMARTPAY_API_BASE_URL`.  
6. **Disk:** LanceDB path writable; DuckDB path writable; **bge-m3** first-run download (~2 GB) if using sentence-transformers locally.  
7. **ML:** `ML_ENABLED=true` and model files under `smartpay_ai/models/` for production inference.  
8. **Production hardening (from PLANNING.md):** monitoring (Sentry/Datadog), Redis for distributed rate limits, backups (Postgres + model artifacts), load testing, secrets manager.  
9. **Process:** `uvicorn smartpay_ai.main:app --host 0.0.0.0 --port 8000` (or `$PORT` on PaaS).  

---

## 7. Related documentation (in-repo)

- `apps/smartpay-ai/README.md` — overview, quick start, endpoint summary  
- `apps/smartpay-ai/PLANNING.md` — architecture, DRY refactors, deployment options  
- `fintech/README.md` — Copilot proxy vs direct Python, versioning  
- `fintech/docs/guides/api/copilot-api.md` — client contract for chat  

---

**Document path:** `fintech/AI_INFRASTRUCTURE_GUIDE.md`  
**Last updated:** 2026-03-22 (reflects codebase and local DuckDB/LanceDB inspection).
