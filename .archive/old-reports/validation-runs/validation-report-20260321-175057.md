# Ecosystem API validation report

- **Generated (UTC):** 2026-03-21T15:50:57Z
- **Run ID:** 20260321-175057
- **TSV:** 

## Summary

| Metric | Value |
|--------|-------|
| Total rows | 33 |
| Pass | 16 |
| Fail | 3 |
| Skip | 14 |
| Avg response time (passed, ms) | 1245.9 |
| Max response time (passed, ms) | 12851 |

## URL rewrite (Next.js)

Buffr Connect and Ketchup Portals configure ** → ** so clients can call versioned URLs while handlers live under .

## Results by endpoint

| Section | Name | Method | URL | Expected | Actual | Time (ms) | Status | Detail |
|---------|------|--------|-----|----------|--------|-----------|--------|--------|
| health | Backend GET /health | GET |  | 200 | 200 | 7 | PASS |  |
| health | Backend GET /health/db | GET |  | 200|503 | 200 | 1765 | PASS |  |
| health | AI GET /health | GET |  | 200 | 200 | 71 | PASS |  |
| health | AI GET /api/v1/health/detailed | GET |  | 200 | 200 | 2585 | PASS |  |
| health | Buffr GET /api/health | GET |  | 200 | - | - | SKIP | connection refused / unreachable |
| health | Buffr GET /api/v1/health (rewrite→/api/health) | GET |  | 200 | - | - | SKIP | connection refused / unreachable |
| health | Ketchup GET /api/health | GET |  | 200|503 | - | - | SKIP | connection refused / unreachable |
| health | Ketchup GET /api/v1/health (rewrite) | GET |  | 200|503 | - | - | SKIP | connection refused / unreachable |
| obs | OBS GET /api/v1/obs/providers (no auth) | GET |  | 401 | 401 | 2 | PASS |  |
| obs | OBS GET /api/v1/obs/consents (no auth) | GET |  | 401 | 401 | 2 | PASS |  |
| locations | GET /api/v1/atms/nearby (no auth) | GET |  | 401 | 404 | 2 | FAIL | {"error":"Not Found","message":"The requested endpoint does not exist","timestamp":"2026-03-21T15:51 |
| transactions | GET /api/v1/transactions/summary (no auth) | GET |  | 401 | 404 | 4 | FAIL | {"error":"Not Found","message":"The requested endpoint does not exist","timestamp":"2026-03-21T15:51 |
| ai-copilot | POST /api/v1/copilot/chat (empty body → 422) | POST |  | 422 | 422 | 20 | PASS |  |
| ai-copilot | POST /api/v1/copilot/chat (minimal) | POST |  | 200|422|500 | 200 | 12851 | PASS |  |
| ai-ml | GET /api/v1/ml/models | GET |  | 200|500 | 500 | 11 | PASS |  |
| ai-ml | GET /api/v1/ml/health | GET |  | 200|500 | 200 | 3 | PASS |  |
| ai-ml | POST /api/v1/ml/predict (empty → 422) | POST |  | 422 | 422 | 4 | PASS |  |
| ai-analytics | GET /api/v1/analytics/system/info | GET |  | 200|500 | 200 | 82 | PASS |  |
| ai-analytics | GET /api/v1/analytics/transactions | GET |  | 200|500 | 200 | 15 | PASS |  |
| rewrite-buffr | Buffr /api/ping vs /api/v1/ping | GET |  | 200 | - | - | SKIP | connection refused / unreachable |
| rewrite-buffr | Buffr /api/v1/ping | GET |  | 200 | - | - | SKIP | connection refused / unreachable |
| rewrite-ketchup | Ketchup /api/health/live | GET |  | 200|503 | - | - | SKIP | connection refused / unreachable |
| rewrite-ketchup | Ketchup /api/v1/health/live (rewrite) | GET |  | 200|503 | - | - | SKIP | connection refused / unreachable |
| negative | Backend unknown path → 404 | GET |  | 404 | 404 | 24 | PASS |  |
| negative | Buffr unknown path → 404 | GET |  | 404 | - | - | SKIP | connection refused / unreachable |
| auth | Backend profile without token → 401 | GET |  | 401 | 404 | 2 | FAIL | {"error":"Not Found","message":"The requested endpoint does not exist","timestamp":"2026-03-21T15:51 |
| auth | AI auth middleware (documented) | INFO |  | n/a | - | - | PASS | Public: /health, /api/v1/health/detailed, /docs, /openapi.json |
| buffr-api | GET /api/ping | GET |  | 200 | - | - | SKIP | connection refused / unreachable |
| buffr-api | GET /api/status | GET |  | 200|401|500 | - | - | SKIP | connection refused / unreachable |
| buffr-api | GET /api/docs (may redirect) | GET |  | 200|301|302|307|308|401 | - | - | SKIP | connection refused / unreachable |
| ketchup-api | GET /api/v1/incidents (likely 401) | GET |  | 401|403|200 | - | - | SKIP | connection refused / unreachable |
| mobile | Metro 8081 | SKIP |  | - | - | - | SKIP | SKIP_MOBILE=1 |
| legacy | request-otp | POST |  | 400|404 | 400 | - | PASS |  |

## Script warnings

- Could not mint JWT (run npm install in apps/smartpay-backend). Backend auth probes will be skipped or fail.
- Rewrite direction is /api/v1/* → /api/* in next.config (not the reverse).

## Recommendations

- Investigate all **FAIL** rows: wrong HTTP status usually means routing, auth, or upstream dependency mismatch.
- **SKIP** usually means the host/port was unreachable — start the service or set SKIP_* env vars intentionally.
- Align local **JWT_SECRET** with the running Smartpay backend when testing authenticated routes.
- For AI **500** responses, check DATABASE_URL, DuckDB path, and ML_ENABLED / model artifacts.

## Remaining issues

- **GET /api/v1/atms/nearby (no auth)** — got HTTP 404 (expected 401) — 
- **GET /api/v1/transactions/summary (no auth)** — got HTTP 404 (expected 401) — 
- **Backend profile without token → 401** — got HTTP 404 (expected 401) — 
