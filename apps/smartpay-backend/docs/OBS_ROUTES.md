# Open Banking (OBS) — backend routes & migration

## Overview

- **Combined router:** `src/routes/obs/index.ts` (mounted at `/api/v1/obs` and `/api/obs`).
- **Mobile / copilot proxy:** `consents`, `ais`, `pis`, `providers` (JWT via `requireAuth`).
- **TPP “bon” API (OBS URI shape):** `src/routes/obsBon.ts` → `/api/v1/obs/bon/v1/...` (headers `ParticipantId`, `x-v`).
- **SCA HTML:** `src/routes/obs-sca.ts` → `/api/v1/obs/v1/authorize` and `/v1/authorize/confirm`.
- **Mock data provider:** `/api/v1/obs/mock/*` (see `mockDataProvider.ts`).

## Database

Run after deploy:

```bash
npm run migrate
```

Migration file: `migrations/011_obs_open_banking.sql`.

- **Mobile flow** uses `obs_consents`, `data_providers`, `obs_consent_pkce`, `obs_consent_audit_log`, `obs_payment_initiations`.
- **Bon OAuth** uses `obs_oauth_consents` and `obs_oauth_access_tokens` (separate from mobile `obs_consents` to avoid schema clashes).
- **AIS/PIS persistence** for bon: `obs_accounts`, `obs_balances`, `obs_transactions`, `obs_payments`, `obs_beneficiaries`, plus `obs_api_calls` / `obs_service_level_metrics`.

Dev seeds: `obs_participants` rows `API000001` (DP) and `TPP-SMARTPAY-001` (TPP) are inserted with `ON CONFLICT DO NOTHING`.

## Sample curl

Replace `BASE` and `JWT`. Mobile endpoints require `Authorization: Bearer <JWT>`.

```bash
BASE=http://localhost:4000
JWT=your_jwt_here

# List data providers
curl -sS -H "Authorization: Bearer $JWT" "$BASE/api/v1/obs/providers"

# Initiate user consent (mobile)
curl -sS -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  "$BASE/api/v1/obs/consents/initiate" \
  -d '{"dataProviderId":"<uuid-from-providers>","purpose":"ais","scopes":["banking:accounts.basic.read"],"durationDays":90}'

# OAuth callback (browser redirect target; query params)
curl -sS "$BASE/api/v1/obs/consents/callback?code=...&state=..."

# AIS accounts (requires active consent)
curl -sS -H "Authorization: Bearer $JWT" "$BASE/api/v1/obs/ais/accounts?consentId=<consent-uuid>"

# Bon PAR (TPP — no user JWT; OBS headers)
curl -sS -X POST -H "Content-Type: application/json" \
  -H "ParticipantId: TPP-SMARTPAY-001" -H "x-v: 1" \
  "$BASE/api/v1/obs/bon/v1/common/par" \
  -d '{"client_id":"TPP-SMARTPAY-001","dp_participant_id":"API000001",...}'
```

## Security note

Mobile `obs_consents.access_token` stores the data-provider access token in plaintext for outbound AIS/PIS calls. For production, replace with vault/KMS or column-level encryption.
