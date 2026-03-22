# API consistency — documentation & archive pass (complete)

**Date:** 2026-03-21  
**Scope:** SmartPay monorepo (`fintech/`) — align docs with **`/api/v1/*`** routing, OBS, PIN, FastAPI layout, and PSD-12 security paths.

## What was verified in code/docs

- **Node (`apps/smartpay-backend`):** Canonical router on **`/api/v1/*`**; legacy **`/api/*`** with deprecation middleware where applicable; PSD-12 surface under **`/api/v1/security/*`** with legacy roots documented in [`apps/smartpay-backend/docs/API_ROUTING.md`](apps/smartpay-backend/docs/API_ROUTING.md).
- **OBS:** Documented in [`apps/smartpay-backend/docs/OBS_ROUTES.md`](apps/smartpay-backend/docs/OBS_ROUTES.md).
- **FastAPI AI (`apps/smartpay-ai`):** Copilot, ML, admin, analytics under **`/api/v1/*`**; health remains at **`/health`**.
- **Mobile:** OTP/JWT on **`/api/v1/auth/*`**; PIN on **`/api/v1/users/pin`** and **`/api/v1/users/verify-pin`** (see backend README).

## Copilot endpoint & Node proxy (2026-03)

**AI service (FastAPI):** `POST /api/v1/copilot/chat` is the canonical chat endpoint (see `apps/smartpay-ai/smartpay_ai/api/copilot_endpoint.py`). Health checks may use `GET /api/v1/copilot/health` where exposed.

**Node backend proxy:** `apps/smartpay-backend/src/routes/copilotProxy.ts` mounts **`POST /api/v1/copilot/chat`** with **`requireAuth`** and **`strictRateLimiter`**. The handler forwards the request body and auth context to **`${AI_SERVICE_URL}/api/v1/copilot/chat`**, so mobile clients can set `EXPO_PUBLIC_COPILOT_API_URL` to the Node base (e.g. `http://localhost:4000`) for a single TLS/auth edge in production instead of calling the AI service directly.

**Legacy / parallel routes:** Older or local copilot entrypoints (e.g. `copilotEndpoint.ts` / `/api/v1/copilot`) remain documented in [`apps/smartpay-backend/docs/API_ROUTING.md`](apps/smartpay-backend/docs/API_ROUTING.md); new integrations should prefer **`/api/v1/copilot/chat`** via proxy or direct AI URL per [API_VERSIONING_STRATEGY.md](../API_VERSIONING_STRATEGY.md).

**Ecosystem write-ups:** Root [COPILOT_FIXES_COMPLETE.md](../COPILOT_FIXES_COMPLETE.md), [COPILOT_FIX_SUMMARY.md](../COPILOT_FIX_SUMMARY.md), [COPILOT_TEST_GUIDE.md](../COPILOT_TEST_GUIDE.md).

## Documentation updates (this pass)

- **Root [`README.md`](README.md):** API versioning table, links to `API_ROUTING.md`, `OBS_ROUTES.md`, validation report, `.archive` layout.
- **[`apps/smartpay-backend/README.md`](apps/smartpay-backend/README.md):** Doc links to routing/OBS; OBS summary bullets; archived analysis link.
- **[`apps/smartpay-ai/README.md`](apps/smartpay-ai/README.md):** `SMARTPAY_API_BASE_URL` default port **4000**; profile URL note.
- **[`apps/smartpay-mobile/README.md`](apps/smartpay-mobile/README.md):** Canonical `/api/v1/*`, link to `API_ROUTING.md`; corrected app path `fintech/apps/smartpay-mobile`.
- **Guides:** [`docs/guides/api/python-endpoints.md`](docs/guides/api/python-endpoints.md), [`docs/guides/development/python-setup.md`](docs/guides/development/python-setup.md), [`docs/guides/deployment/checklist.md`](docs/guides/deployment/checklist.md), [`docs/guides/architecture/python-backend-detailed.md`](docs/guides/architecture/python-backend-detailed.md), [`docs/guides/security/security-implementation.md`](docs/guides/security/security-implementation.md) — SmartPay AI and PSD-12 examples updated to **`/api/v1/...`**; security doc distinguishes mobile **`/api/v1/auth/*`** vs PSD-12 **`/api/v1/security/auth/*`**.
- **Copilot:** Node **`POST /api/v1/copilot/chat`** proxy (`copilotProxy.ts`), mobile HTTP layer, and ecosystem fix reports — see [Copilot endpoint & Node proxy](#copilot-endpoint--node-proxy-2026-03) and root `COPILOT_*.md`.

## Archive layout

Completed audits, migration notes, and **timestamped** validation runs were moved under **`.archive/old-reports/`** (see monorepo `README.md`). **`scripts/reports/validation-report-LATEST.md`** remains the current summary; duplicates dated `validation-report-20260321-*.md` were archived.

## Intentionally not bulk-changed

- **Buffr Connect / external Open Banking** examples in [`docs/guides/api/buffr-reference.md`](docs/guides/api/buffr-reference.md) and [`docs/guides/architecture/buffr-connect.md`](docs/guides/architecture/buffr-connect.md) still use paths as exposed by that product; they are not SmartPay Node routes.
- **Third-party / generic** snippets in [`docs/guides/development/type-generation.md`](docs/guides/development/type-generation.md) and illustrative diagrams in [`docs/guides/architecture/rate-limiter.md`](docs/guides/architecture/rate-limiter.md) were left unless they named SmartPay-specific URLs.

## Related implementation doc

Routing behavior is defined in code and summarized in **`apps/smartpay-backend/docs/API_ROUTING.md`** — treat that file as the source of truth for mount order and deprecation headers.

Ecosystem versioning and the Copilot **proxy** pattern: **[`API_VERSIONING_STRATEGY.md`](../API_VERSIONING_STRATEGY.md)** (repo root).
