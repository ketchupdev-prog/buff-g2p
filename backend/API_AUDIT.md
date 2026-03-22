# API Endpoint Audit vs PRD §9.4 (post closure)

**Project:** Buffr G2P backend (`/Users/georgenekwaya/buffr-g2p/backend`)  
**Reference:** PRD §9.4 (mobile/docs/PRD.md), plan: API Endpoints and Security Closure.

---

## 1. API Endpoint Audit Summary

| Category | Method | Path (PRD §9.4) | Status | Notes |
|----------|--------|------------------|--------|-------|
| **Auth** | POST | `/api/v1/mobile/auth/request-otp` | ✅ | Body `{ phone, email?, channel }`. |
| **Auth** | POST | `/api/v1/mobile/auth/send-otp` | ✅ | Alias for request-otp. |
| **Auth** | POST | `/api/v1/mobile/auth/verify-otp` | ✅ | Body `{ phone, code }` → token, user shape. |
| **Auth** | POST | `/api/v1/mobile/auth/verify-2fa` | ✅ | Body `{ userId?, method, action?, payload?, pin? }` → `{ verification_token, expires_at }`. |
| **User** | GET | `/api/v1/mobile/user/profile` | ✅ | |
| **User** | PATCH | `/api/v1/mobile/user/profile` | ✅ | |
| **User** | POST | `/api/v1/mobile/user/proof-of-life` | ✅ | |
| **Vouchers** | GET | `/api/v1/mobile/vouchers` | ✅ | |
| **Vouchers** | GET | `/api/v1/mobile/vouchers/{id}` | ✅ | |
| **Vouchers** | POST | `/api/v1/mobile/vouchers/{id}/redeem` | ✅ | |
| **Wallets** | GET | `/api/v1/mobile/wallets` | ✅ | |
| **Wallets** | GET | `/api/v1/mobile/wallets/{id}` | ✅ | |
| **Wallets** | PATCH | `/api/v1/mobile/wallets/{id}` | ✅ | Parameterized only (B3). |
| **Wallets** | POST | `/api/v1/mobile/wallets/{id}/cashout` | ✅ | |
| **Wallets** | POST | `/api/v1/mobile/wallets` | ✅ | |
| **QR** | POST | `/api/v1/mobile/qr/generate` | ✅ | Alias for namqr/generate. |
| **QR** | POST | `/api/v1/mobile/qr/validate` | ✅ | Alias for namqr/validate. |
| **QR** | GET | `/api/v1/mobile/keys/merchant/{alias}` | ✅ | Env or public_keys table. |
| **QR** | GET | `/api/v1/mobile/keys/psp/{orgId}` | ✅ | Env or public_keys table. |
| **Loans** | GET | `/api/v1/mobile/loans` | ✅ | |
| **Loans** | GET | `/api/v1/mobile/loans/{id}` | ✅ | |
| **Loans** | POST | `/api/v1/mobile/loans/apply` | ✅ | V5 daily limit. |
| **Send** | POST | `/api/v1/mobile/send` | ✅ | recipientPhone; V5 daily limit + FOR UPDATE. |
| **Send** | POST | `/api/v1/mobile/send-money` | ✅ | V9: recipient_id only; V5 daily limit. |
| **Notifications** | GET | `/api/v1/mobile/notifications` | ✅ | |
| **Notifications** | GET | `/api/v1/mobile/notifications/{id}` | ✅ | |
| **Notifications** | PATCH | `/api/v1/mobile/notifications/{id}/read` | ✅ | |
| **Notifications** | POST | `/api/v1/mobile/notifications/{id}/accept` | ✅ | |
| **Notifications** | POST | `/api/v1/mobile/notifications/{id}/decline` | ✅ | |
| **Receive** | GET | `/api/v1/mobile/receive/{transactionId}` | ✅ | |
| **Receive** | GET | `/api/v1/mobile/receive/voucher/{voucherId}` | ✅ | |
| **Receive** | POST | `/api/v1/mobile/receive/accept-payment` | ✅ | Body `{ transactionId }`. |
| **Location** | GET | `/api/v1/mobile/agents/nearby` | ✅ | Stub; lat, lng, radius. |
| **Location** | GET | `/api/v1/mobile/nampost/nearby` | ✅ | Stub. |
| **Location** | GET | `/api/v1/mobile/smartpay/nearby` | ✅ | Stub. |
| **Location** | GET | `/api/v1/mobile/atms/nearby` | ✅ | Stub. |
| **Transactions** | GET | `/api/v1/mobile/transactions` | ✅ | |
| **Compliance** | POST | `/api/v1/compliance/incident-report` | ✅ | Stub 202. |
| **Compliance** | GET | `/api/v1/compliance/audit-logs` | ✅ | Stub or audit_logs table. |
| **Compliance** | POST | `/api/v1/compliance/affidavit` | ✅ | Stub 201. |
| **Compliance** | POST | `/api/v1/compliance/monthly-stats` | ✅ | Stub 202. |
| **USSD** | POST | `/api/v1/ussd/menu` | ✅ | State machine; balance, voucher, cash-out. |
| **Cash-out** | POST | `/api/cashout/atm-code` | ✅ | V5 daily limit + FOR UPDATE. |

---

## 2. Implementation completed (this pass)

- **Migration 006:** `wallet_transactions.reference`, `public_keys`, `compliance_incident_reports`, `audit_logs`, `verification_tokens`.
- **db.ts:** Single env load (B2), `getDatabaseUrl()` (B4); no raw `getEnv()`.
- **verify-2fa:** `lib/verificationToken.ts`; POST auth/verify-2fa returns verification_token, expires_at.
- **Path aliases:** send-otp, qr/generate, qr/validate, send-money (recipient_id or recipientPhone; Idempotency-Key).
- **Keys, notifications, receive:** keys/merchant, keys/psp; GET notifications/:id, accept, decline; receive/:id, receive/voucher/:id, accept-payment.
- **Location, compliance, USSD:** agents/nampost/smartpay/atms nearby (stub); compliance 4 endpoints (stub); POST ussd/menu.
- **V5:** Amount validation and daily limits (DAILY_CASHOUT_LIMIT_NAD, DAILY_SEND_LIMIT_NAD, DAILY_LOAN_LIMIT_NAD); row lock (SELECT FOR UPDATE) in cashout, voucher wallet, send, send-money, loan.
- **V9:** send-money accepts only body `recipient_id`.
- **B3:** PATCH wallets uses only parameterized `sql` (no string concat).
- **B5/B9:** SECURITY.md documents TLS minVersion and query timeout.
- **Mobile V12/S5/G1:** android allowBackup false; offline banner + disable financial actions when offline; BUILD.md for Maps key from CI.

---

## 3. Verification steps

1. **Migrations:** `cd backend && npm run migrate` (runs 006 among others).
2. **Env:** Copy `.env.example`; set `DATABASE_URL`, optional `DAILY_*_LIMIT_NAD`, `MERCHANT_PUBLIC_KEY`, `PSP_PUBLIC_KEY`, `VERIFICATION_TOKEN_TTL_MINUTES`.
3. **Start:** `npm run dev` or `npm start`.
4. **Smoke:** `curl` POST auth/send-otp, auth/verify-2fa, GET keys/merchant/alias, GET notifications/:id, GET receive/:id, POST send-money (recipient_id), GET agents/nearby?lat=-22.5&lng=17, POST ussd/menu, POST compliance/incident-report.

---

## 4. Database migrations

- **006_api_and_compliance.sql:** reference column, public_keys, compliance_incident_reports, audit_logs, verification_tokens. Rollback notes in file.

---

## 5. Security (PRD §19)

- **V5:** Amount and daily limits enforced; row locks in place.
- **V9:** send-money recipient_id only.
- **V12:** android allowBackup false.
- **S5:** Offline banner; send/cash-out confirm disabled when offline.
- **B2:** Single canonical .env load.
- **B3:** PATCH wallets parameterized only.
- **B4:** getDatabaseUrl(); no getEnv().
- **B5/B9:** SECURITY.md.
- **G1:** BUILD.md (Maps key from CI).

---

## 6. New/updated files (this pass)

| File | Change |
|------|--------|
| `backend/migrations/006_api_and_compliance.sql` | New. |
| `backend/src/lib/db.ts` | Single env, getDatabaseUrl. |
| `backend/src/lib/verificationToken.ts` | New. |
| `backend/src/lib/dailyLimits.ts` | New. |
| `backend/src/lib/security.ts` | (unchanged) |
| `backend/SECURITY.md` | New (B5, B9). |
| `backend/src/server.ts` | All new routes; PATCH wallets parameterized; send/send-money limits + FOR UPDATE. |
| `backend/src/services/cashoutService.ts` | V5 daily limit, FOR UPDATE. |
| `backend/src/services/voucherService.ts` | FOR UPDATE on wallet. |
| `backend/src/services/loanService.ts` | FOR UPDATE on wallet. |
| `backend/.env.example` | DAILY_*_LIMIT_NAD, MERCHANT_PUBLIC_KEY, PSP_PUBLIC_KEY, VERIFICATION_TOKEN_TTL_MINUTES. |
| `mobile/app.json` | android allowBackup false. |
| `mobile/contexts/NetworkContext.tsx` | New. |
| `mobile/contexts/AppProviders.tsx` | NetworkProvider. |
| `mobile/app/_layout.tsx` | OfflineBanner when offline. |
| `mobile/app/send-money/confirm.tsx` | Disable when offline. |
| `mobile/app/wallets/[id]/cash-out/confirm.tsx` | Disable when offline. |
| `mobile/BUILD.md` | G1 Maps key from CI. |
| `backend/API_AUDIT.md` | This audit. |
