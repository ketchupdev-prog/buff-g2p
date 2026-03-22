# Ecosystem API validation report

- **Generated (UTC):** 2026-03-21T15:54:43Z
- **Run ID:** 20260321-175443
- **TSV:** `validation-run-20260321-175443.tsv`

## Summary

| Metric | Value |
|--------|-------|
| Total rows | 34 |
| Pass | 19 |
| Fail | 0 |
| Skip | 14 |
| Info rows | 1 |
| Avg response time (passed, ms) | 705.6 |
| Max response time (passed, ms) | 12607 |

## URL rewrite (Next.js)

Buffr Connect and Ketchup Portals configure **`/api/v1/:path*` → `/api/:path*`** so clients can call versioned URLs while handlers live under `/api/...`.

## Results by endpoint

| Section | Name | Method | URL | Expected | Actual | Time (ms) | Status | Detail |
|---------|------|--------|-----|----------|--------|-----------|--------|--------|
| health | Backend GET /health | GET | `http://localhost:4000/health` | 200 | 200 | 3 | PASS |  |
| health | Backend GET /health/db | GET | `http://localhost:4000/health/db` | 200|503 | 200 | 241 | PASS |  |
| health | AI GET /health | GET | `http://localhost:8000/health` | 200 | 200 | 14 | PASS |  |
| health | AI GET /api/v1/health/detailed | GET | `http://localhost:8000/api/v1/health/detailed` | 200 | 200 | 499 | PASS |  |
| health | Buffr GET /api/health | GET | `http://localhost:3000/api/health` | 200 | - | - | SKIP | connection refused / unreachable |
| health | Buffr GET /api/v1/health (rewrite→/api/health) | GET | `http://localhost:3000/api/v1/health` | 200 | - | - | SKIP | connection refused / unreachable |
| health | Ketchup GET /api/health | GET | `http://localhost:3001/api/health` | 200|503 | - | - | SKIP | connection refused / unreachable |
| health | Ketchup GET /api/v1/health (rewrite) | GET | `http://localhost:3001/api/v1/health` | 200|503 | - | - | SKIP | connection refused / unreachable |
| legacy-alias | Legacy GET /api/atms/nearby (mirrors v1; may send deprecation headers) | GET | `http://localhost:4000/api/atms/nearby?lat=-22.5597&lng=17.0832&radius=50` | 401 | 401 | 1 | PASS |  |
| obs | OBS GET /api/v1/obs/providers (no auth) | GET | `http://localhost:4000/api/v1/obs/providers` | 401 | 401 | 1 | PASS |  |
| obs | OBS GET /api/v1/obs/consents (no auth) | GET | `http://localhost:4000/api/v1/obs/consents` | 401 | 401 | 1 | PASS |  |
| locations | GET /api/v1/atms/nearby (no auth) | GET | `http://localhost:4000/api/v1/atms/nearby?lat=-22.5597&lng=17.0832&radius` | 401 | 401 | 1 | PASS |  |
| transactions | GET /api/v1/transactions/summary (no auth) | GET | `http://localhost:4000/api/v1/transactions/summary` | 401 | 401 | 0 | PASS |  |
| ai-copilot | POST /api/v1/copilot/chat (empty body → 422) | POST | `http://localhost:8000/api/v1/copilot/chat` | 422 | 422 | 2 | PASS |  |
| ai-copilot | POST /api/v1/copilot/chat (minimal) | POST | `http://localhost:8000/api/v1/copilot/chat` | 200|422|500 | 200 | 12607 | PASS |  |
| ai-ml | GET /api/v1/ml/models | GET | `http://localhost:8000/api/v1/ml/models` | 200|500 | 500 | 3 | PASS |  |
| ai-ml | GET /api/v1/ml/health | GET | `http://localhost:8000/api/v1/ml/health` | 200|500 | 200 | 2 | PASS |  |
| ai-ml | POST /api/v1/ml/predict (empty → 422) | POST | `http://localhost:8000/api/v1/ml/predict` | 422 | 422 | 4 | PASS |  |
| ai-analytics | GET /api/v1/analytics/system/info | GET | `http://localhost:8000/api/v1/analytics/system/info` | 200|500 | 200 | 14 | PASS |  |
| ai-analytics | GET /api/v1/analytics/transactions | GET | `http://localhost:8000/api/v1/analytics/transactions` | 200|500 | 200 | 6 | PASS |  |
| rewrite-buffr | Buffr /api/ping vs /api/v1/ping | GET | `http://localhost:3000/api/ping` | 200 | - | - | SKIP | connection refused / unreachable |
| rewrite-buffr | Buffr /api/v1/ping | GET | `http://localhost:3000/api/v1/ping` | 200 | - | - | SKIP | connection refused / unreachable |
| rewrite-ketchup | Ketchup /api/health/live | GET | `http://localhost:3001/api/health/live` | 200|503 | - | - | SKIP | connection refused / unreachable |
| rewrite-ketchup | Ketchup /api/v1/health/live (rewrite) | GET | `http://localhost:3001/api/v1/health/live` | 200|503 | - | - | SKIP | connection refused / unreachable |
| negative | Backend unknown path → 404 | GET | `http://localhost:4000/api/v1/__validate_not_found__` | 404 | 404 | 4 | PASS |  |
| negative | Buffr unknown path → 404 | GET | `http://localhost:3000/api/v1/__validate_not_found__` | 404 | - | - | SKIP | connection refused / unreachable |
| auth | Backend profile without token → 401 | GET | `http://localhost:4000/api/v1/user/profile` | 401 | 401 | 1 | PASS |  |
| auth | AI auth middleware (documented) | INFO | `http://localhost:8000` | n/a | - | - | INFO | Public: /health, /api/v1/health/detailed, /docs, /openapi.json |
| buffr-api | GET /api/ping | GET | `http://localhost:3000/api/ping` | 200 | - | - | SKIP | connection refused / unreachable |
| buffr-api | GET /api/status | GET | `http://localhost:3000/api/status` | 200|401|500 | - | - | SKIP | connection refused / unreachable |
| buffr-api | GET /api/docs (may redirect) | GET | `http://localhost:3000/api/docs` | 200|301|302|307|308|401 | - | - | SKIP | connection refused / unreachable |
| ketchup-api | GET /api/v1/incidents (likely 401) | GET | `http://localhost:3001/api/v1/incidents` | 401|403|200 | - | - | SKIP | connection refused / unreachable |
| mobile | Metro 8081 | SKIP | `http://localhost:8081` | - | - | - | SKIP | SKIP_MOBILE=1 |
| legacy | POST /api/v1/auth/request-otp (no body → 400/404) | POST | `http://localhost:4000/api/v1/auth/request-otp` | 400|404 | 400 | 2 | PASS |  |

## Script warnings

- Could not mint JWT (run npm install in apps/smartpay-backend). Backend auth probes will be skipped or fail.
- Rewrite direction is /api/v1/* → /api/* in next.config (not the reverse).

## Recommendations

- **SKIP** usually means the host/port was unreachable — start the service or set SKIP_* env vars intentionally.
- Align local **JWT_SECRET** with the running Smartpay backend when testing authenticated routes.
- For AI **500** responses, check DATABASE_URL, DuckDB path, and ML_ENABLED / model artifacts.

## Remaining issues

- No failed HTTP assertions in this run.
