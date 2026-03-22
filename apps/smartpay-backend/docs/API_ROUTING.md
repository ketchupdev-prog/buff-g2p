# Smartpay backend API routing

## Canonical versioned API

All HTTP handlers are mounted on **`/api/v1`** via a single composed router (`src/routes/v1/apiRouter.ts`). Route modules use **paths relative to that mount** (for example `GET /wallets` → `GET /api/v1/wallets`).

## Legacy unversioned alias

The **same** router tree is mounted at **`/api`** with deprecation middleware so existing clients that called `/api/copilot`, `/api/wallets`, `/api/buffr/*`, etc. keep working.

Responses from these legacy paths include:

- `API-Version: 1` (all `/api/*` traffic, set globally)
- `Deprecation: true`
- `Link: </api/v1>; rel="successor-version"; title="Smartpay API v1"`
- `Warning: 299 - "Deprecated path; prefer /api/v1/*"`

**Order:** `GET /api/v1/...` is registered before `GET /api/...`, so versioned URLs never receive the legacy-only `Deprecation` middleware from the `/api` mount.

## PSD-12 security module

| Area        | Canonical path              | Legacy path (deprecated) |
|------------|-----------------------------|---------------------------|
| Fraud      | `/api/v1/security/fraud`    | `/api/fraud`              |
| 2FA / auth | `/api/v1/security/auth`     | `/api/auth`               |
| Audit      | `/api/v1/security/audit`    | `/api/audit`              |
| Payments   | `/api/v1/security/payments` | `/api/payments`           |

Legacy security mounts are registered **before** `app.use('/api', legacyApiRouter)` so `/api/auth` remains the PSD-12 API, not mobile OTP.

## Mobile OTP authentication

Mobile login / OTP flows use **`/api/v1/auth/*`** only (`src/routes/auth.ts`). On the legacy `/api` tree, the same handlers are exposed as **`/api/v1/auth/*`** (not `/api/auth/*`) to avoid colliding with `/api/auth` (security).

## Entry points

- `src/index.ts` — mounts `v1Router`, `legacyApiRouter`, and `setupSecurityLegacyRoutes`.
- `src/middleware/apiVersionHeaders.ts` — `API-Version` and deprecation headers.

## Changelog (routing)

- Central v1 router with relative paths in route files.
- Security APIs versioned under `/api/v1/security/*` with backward-compatible legacy roots.
- Legacy `/api/*` alias for the main API (excluding `/api/v1/*` and dedicated security roots).
