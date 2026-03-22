# Ecosystem API validation report

- **Generated (UTC):** 2026-03-21T15:56:35Z
- **Run ID:** 20260321-175635
- **TSV:** `validation-run-20260321-175635.tsv`

## Summary

| Metric | Value |
|--------|-------|
| Total rows | 31 |
| Pass | 29 |
| Fail | 0 |
| Skip | 1 |
| Info rows | 1 |
| Avg response time (passed, ms) | 919.0 |
| Max response time (passed, ms) | 13987 |

## URL rewrite (Next.js)

Buffr Connect and Ketchup Portals configure **`/api/v1/:path*` → `/api/:path*`** so clients can call versioned URLs while handlers live under `/api/...`.

## Results by endpoint

| Section | Name | Method | URL | Expected | Actual | Time (ms) | Status | Detail |
|---------|------|--------|-----|----------|--------|-----------|--------|--------|
| health | Backend GET /health | GET | `http://localhost:4000/health` | 200 | 200 | 3 | PASS |  |
| health | Backend GET /health/db | GET | `http://localhost:4000/health/db` | 200|503 | 200 | 1803 | PASS |  |
| health | AI GET /health | GET | `http://localhost:8000/health` | 200 | 200 | 6 | PASS |  |
| health | AI GET /api/v1/health/detailed | GET | `http://localhost:8000/api/v1/health/detailed` | 200 | 200 | 1092 | PASS |  |
| legacy-alias | Legacy GET /api/atms/nearby (mirrors v1; may send deprecation headers) | GET | `http://localhost:4000/api/atms/nearby?lat=-22.5597&lng=17.0832&radius=50` | 401 | 401 | 1 | PASS |  |
| obs | OBS GET /api/v1/obs/providers (no auth) | GET | `http://localhost:4000/api/v1/obs/providers` | 401 | 401 | 1 | PASS |  |
| obs | OBS GET /api/v1/obs/providers (auth) | GET | `http://localhost:4000/api/v1/obs/providers` | 200|500 | 200 | 594 | PASS |  |
| obs | OBS GET /api/v1/obs/consents (auth) | GET | `http://localhost:4000/api/v1/obs/consents` | 200|500 | 200 | 472 | PASS |  |
| obs | OBS GET /api/v1/obs/consents (no auth) | GET | `http://localhost:4000/api/v1/obs/consents` | 401 | 401 | 1 | PASS |  |
| locations | GET /api/v1/atms/nearby (no auth) | GET | `http://localhost:4000/api/v1/atms/nearby?lat=-22.5597&lng=17.0832&radius` | 401 | 401 | 6 | PASS |  |
| locations | GET /api/v1/atms/nearby (no lat/lng → 400) | GET | `http://localhost:4000/api/v1/atms/nearby` | 400 | 400 | 224 | PASS |  |
| locations | GET /api/v1/atms/nearby (auth + coords) | GET | `http://localhost:4000/api/v1/atms/nearby?lat=-22.5597&lng=17.0832&radius` | 200|500 | 500 | 451 | PASS |  |
| locations | GET /api/v1/locations/nampost (no lat/lng → 400) | GET | `http://localhost:4000/api/v1/locations/nampost` | 400 | 400 | 225 | PASS |  |
| locations | GET /api/v1/locations/nampost (auth + coords) | GET | `http://localhost:4000/api/v1/locations/nampost?lat=-22.5597&lng=17.0832&` | 200|500 | 500 | 2540 | PASS |  |
| transactions | GET /api/v1/transactions/summary (no auth) | GET | `http://localhost:4000/api/v1/transactions/summary` | 401 | 401 | 0 | PASS |  |
| transactions | GET /api/v1/transactions/summary (auth) | GET | `http://localhost:4000/api/v1/transactions/summary?days=7` | 200|500 | 200 | 2630 | PASS |  |
| ai-copilot | POST /api/v1/copilot/chat (empty body → 422) | POST | `http://localhost:8000/api/v1/copilot/chat` | 422 | 422 | 6 | PASS |  |
| ai-copilot | POST /api/v1/copilot/chat (minimal) | POST | `http://localhost:8000/api/v1/copilot/chat` | 200|422|500 | 200 | 13987 | PASS |  |
| ai-ml | GET /api/v1/ml/models | GET | `http://localhost:8000/api/v1/ml/models` | 200|500 | 500 | 4 | PASS |  |
| ai-ml | GET /api/v1/ml/health | GET | `http://localhost:8000/api/v1/ml/health` | 200|500 | 200 | 2 | PASS |  |
| ai-ml | POST /api/v1/ml/predict (empty → 422) | POST | `http://localhost:8000/api/v1/ml/predict` | 422 | 422 | 3 | PASS |  |
| ai-analytics | GET /api/v1/analytics/system/info | GET | `http://localhost:8000/api/v1/analytics/system/info` | 200|500 | 200 | 11 | PASS |  |
| ai-analytics | GET /api/v1/analytics/transactions | GET | `http://localhost:8000/api/v1/analytics/transactions` | 200|500 | 200 | 8 | PASS |  |
| negative | Backend unknown path → 404 | GET | `http://localhost:4000/api/v1/__validate_not_found__` | 404 | 404 | 3 | PASS |  |
| auth | Backend profile without token → 401 | GET | `http://localhost:4000/api/v1/user/profile` | 401 | 401 | 1 | PASS |  |
| auth | Backend profile with token → 200 | GET | `http://localhost:4000/api/v1/user/profile` | 200|404|500 | 200 | 1547 | PASS |  |
| auth | AI auth middleware (documented) | INFO | `http://localhost:8000` | n/a | - | - | INFO | Public: /health, /api/v1/health/detailed, /docs, /openapi.json |
| mobile | Metro 8081 | SKIP | `http://localhost:8081` | - | - | - | SKIP | SKIP_MOBILE=1 |
| legacy | Wallets | GET | `http://localhost:4000/api/v1/wallets` | 200|500 | 200 | 446 | PASS |  |
| legacy | Groups | GET | `http://localhost:4000/api/v1/groups` | 200|500 | 200 | 584 | PASS |  |
| legacy | POST /api/v1/auth/request-otp (no body → 400/404) | POST | `http://localhost:4000/api/v1/auth/request-otp` | 400|404 | 400 | 1 | PASS |  |

## Script warnings

- Rewrite direction is /api/v1/* → /api/* in next.config (not the reverse).

## Recommendations

- **SKIP** usually means the host/port was unreachable — start the service or set SKIP_* env vars intentionally.
- Some probes **passed with HTTP 500** (allowed for optional deps). Check agent_locations / PostGIS for location aliases, ML_ENABLED for `/api/v1/ml/models`, and DB logs.
- Align local **JWT_SECRET** with the running Smartpay backend when testing authenticated routes.
- For AI **500** responses, check DATABASE_URL, DuckDB path, and ML_ENABLED / model artifacts.

## Remaining issues

- No failed HTTP assertions in this run.
