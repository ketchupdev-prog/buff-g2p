# Backend API Audit Prompt – Buffr G2P

## Objective
Comprehensive audit of the Buffr G2P backend API implementation. The audit must verify that all endpoints are fully implemented, connected to a **real PostgreSQL database** (no mocks), follow the PRD specifications, and adhere to security, compliance, and performance standards.

## Scope
- **All endpoints** listed in PRD §9.3 and §9.4.
- **Database schema** per PRD §16 (tables: users, wallets, vouchers, loans, transactions, etc.).
- **Authentication & authorization** (JWT, 2FA, role-based access).
- **Error handling, validation, idempotency**.
- **Compliance** with NAMQR, Open Banking, ETA, PSD-12, PSD-1, PSD-3.
- **Integration** with external services: Token Vault, Fineract (if enabled), OAuth banks, SMS/email gateways.

---

## Audit Checklist

### 1. General API Structure
- [ ] Base URL: `EXPO_PUBLIC_API_URL` is configurable via environment variable.
- [ ] All endpoints use HTTPS (TLS 1.2+) in production.
- [ ] Consistent response format: JSON with appropriate HTTP status codes.
- [ ] CORS headers allow only trusted origins.
- [ ] Rate limiting implemented with `X-RateLimit-*` headers.

### 2. Authentication & Authorization (PRD §9.4, §12)
- [ ] `POST /api/v1/mobile/auth/send-otp`: Sends OTP via SMS/email; stores OTP in DB with expiry; rate-limited per phone/email.
- [ ] `POST /api/v1/mobile/auth/verify-otp`: Validates OTP, returns JWT (`buffr_access_token`) and refresh token.
- [ ] `POST /api/v1/mobile/auth/verify-2fa`: Returns `verification_token` after PIN/biometric validation; token short-lived and used for sensitive actions.
- [ ] JWT expiry: 4 hours (configurable). Refresh token mechanism implemented.
- [ ] All protected endpoints require valid JWT in `Authorization: Bearer` header.
- [ ] Role-based access: beneficiaries, agents, admins (if applicable).

### 3. User & Profile Management (PRD §9.4, §2.4)
- [ ] `GET /api/v1/mobile/user/profile`: Returns user details including `proofOfLifeDueDate`, `walletStatus`.
- [ ] `PATCH /api/v1/mobile/user/profile`: Updates `first_name`, `last_name`, `photo_url`.
- [ ] `POST /api/v1/mobile/user/proof-of-life`: Triggers biometric verification; updates `last_proof_of_life` and `proof_of_life_due_date`; sets `wallet_status` accordingly.
- [ ] `POST /api/v1/mobile/agent/proof-of-life`: Agent POS endpoint; updates beneficiary's proof-of-life.

### 4. Vouchers (PRD §2.2, §9.4)
- [ ] `GET /api/v1/mobile/vouchers`: Returns list of vouchers for the authenticated user, paginated.
- [ ] `GET /api/v1/mobile/vouchers/{id}`: Returns single voucher details.
- [ ] `POST /api/v1/mobile/vouchers/{id}/redeem`: Redeems voucher with `method` (`wallet`, `nampost`, `smartpay`). Requires `verification_token`. On success:
  - Credits wallet (if method `wallet`) after deducting any outstanding loan repayment.
  - Creates `voucher_redemptions` record.
  - Updates loan repayment if applicable (see §16.2).
  - Calls Fineract deposit (if enabled).

### 5. Wallets (PRD §2.5, §2.6, §9.4)
- [ ] `GET /api/v1/mobile/wallets`: Lists all wallets for user.
- [ ] `GET /api/v1/mobile/wallets/{id}`: Returns wallet detail with transactions.
- [ ] `POST /api/v1/mobile/wallets`: Creates new wallet. If Fineract enabled, creates Fineract client and savings account; stores `fineract_client_id`, `fineract_savings_account_id`.
- [ ] `PATCH /api/v1/mobile/wallets/{id}`: Updates wallet name.
- [ ] `DELETE /api/v1/mobile/wallets/{id}`: Deletes wallet (non-main only) after transferring balance to main wallet.
- [ ] `POST /api/v1/mobile/wallets/{id}/cashout`: Cash-out request with `method` (till, agent, merchant, atm, bank). Requires `verification_token`. On success:
  - Debits wallet.
  - Creates `wallet_transactions` record.
  - If Fineract enabled, posts withdrawal to savings account.
  - Returns cash-out code or transaction reference.

### 6. Loans (PRD §2.3, §9.4)
- [ ] `GET /api/v1/mobile/loans`: Returns list of user's loans and current offer (`maxAmount = 1/3 of previous voucher value`, interest 15%).
- [ ] `GET /api/v1/mobile/loans/{id}`: Returns loan details.
- [ ] `POST /api/v1/mobile/loans/apply`: Creates loan, disburses to wallet. Requires `verification_token`. On success:
  - Creates loan record with `status = 'disbursed'`.
  - Credits wallet.
  - If Fineract enabled, disburses loan via Fineract.
- [ ] Loan repayment logic (server-side): On voucher redeem to wallet, deduct outstanding loan repayment from voucher amount before crediting wallet; update loan status.

### 7. QR & NAMQR (PRD §4.5, §9.4)
- [ ] `POST /api/v1/mobile/qr/generate`: Returns TLV payload with Token Vault NREF (Tag 65) and CRC (Tag 63). Uses Token Vault API.
- [ ] `POST /api/v1/mobile/qr/validate`: Validates scanned QR against Token Vault; returns decoded data if valid.
- [ ] `GET /api/v1/mobile/keys/merchant/{alias}`: Returns public key for Signed QR (Tag 66) verification.
- [ ] `GET /api/v1/mobile/keys/psp/{orgId}`: Returns PSP public key.

### 8. Send Money (P2P)
- [ ] `POST /api/v1/mobile/send-money`: Requires `verification_token`, `recipient_id`, `amount`, `wallet_id`. Debits sender wallet, credits recipient wallet; inserts `p2p_transactions` and notifications.

### 9. Bills
- [ ] `POST /api/v1/mobile/bills/pay`: Bill payment. Requires `verification_token`. Interacts with external biller APIs if needed.

### 10. Merchants
- [ ] `GET /api/v1/mobile/merchants`: List merchants with categories, location.
- [ ] `POST /api/v1/mobile/merchants/{id}/pay`: Pay merchant; similar to send money but to merchant account.

### 11. Groups (PRD §3.6)
- [ ] `GET /api/v1/mobile/groups`: List user's groups.
- [ ] `POST /api/v1/mobile/groups`: Create group.
- [ ] `GET /api/v1/mobile/groups/{id}`: Group details.
- [ ] `POST /api/v1/mobile/groups/{id}/members`: Add members.
- [ ] `DELETE /api/v1/mobile/groups/{id}/members/{userId}`: Remove member.

### 12. Notifications & Receive Flows (PRD §3.9, §9.3)
- [ ] `GET /api/v1/mobile/notifications`: List notifications.
- [ ] `GET /api/v1/mobile/notifications/{id}`: Get notification detail.
- [ ] `POST /api/v1/mobile/notifications/{id}/accept`: Accept group invite or request.
- [ ] `POST /api/v1/mobile/notifications/{id}/decline`: Decline.
- [ ] `GET /api/v1/mobile/receive/{transactionId}`: Receive money detail.
- [ ] `GET /api/v1/mobile/receive/voucher/{voucherId}`: Receive voucher detail.
- [ ] `POST /api/v1/mobile/receive/accept-payment`: Accept incoming payment.

### 13. Location & Agents
- [ ] `GET /api/v1/mobile/agents/nearby`: Returns agents near lat/lng.
- [ ] `GET /api/v1/mobile/nampost/nearby`: NamPost branches.
- [ ] `GET /api/v1/mobile/smartpay/nearby`: SmartPay units.
- [ ] `GET /api/v1/mobile/atms/nearby`: ATMs.

### 14. Compliance Endpoints (PRD §9.3, §10)
- [ ] `POST /api/v1/compliance/incident-report`: For reporting security incidents (PSD-12).
- [ ] `GET /api/v1/compliance/audit-logs`: Retrieve audit logs (ETA).
- [ ] `POST /api/v1/compliance/affidavit`: Generate affidavit for data messages.
- [ ] `POST /api/v1/compliance/monthly-stats`: Submit monthly statistics to Bank of Namibia.

### 15. USSD Gateway (PRD §3.10, §9.3)
- [ ] `POST /api/v1/ussd/menu`: Handles USSD requests, returns next menu.

### 16. Database Integration (PRD §16)
- [ ] All endpoints use parameterized queries (no raw SQL concatenation).
- [ ] Transactions are used where atomicity required (e.g., voucher redeem + loan repayment).
- [ ] Foreign keys and constraints enforced.
- [ ] Indexes exist on frequently queried columns (e.g., `user_id` in wallets, `phone` in users).
- [ ] Migrations are version-controlled and idempotent.

### 17. Security & Compliance Checks
- [ ] All sensitive data (PIN, tokens) stored hashed/encrypted.
- [ ] No hardcoded secrets; all credentials in environment variables.
- [ ] Idempotency keys supported for financial endpoints (send, cashout, redeem) to prevent double spends.
- [ ] Rate limiting on OTP, login attempts.
- [ ] Row-level locking for balance updates to prevent race conditions.
- [ ] HTTPS enforcement (HSTS, secure cookies).
- [ ] Logging of all financial transactions for audit trail (ETA §24).
- [ ] Integration with Fineract (if enabled) logs failures but does not roll back user-facing transaction.

### 18. Error Handling
- [ ] Consistent error response format: `{ error: { code, message, details? } }`.
- [ ] HTTP status codes appropriate (400, 401, 403, 404, 422, 500).
- [ ] Validation errors return 422 with field-specific messages.
- [ ] 429 Too Many Requests with `Retry-After` header.

### 19. Documentation
- [ ] OpenAPI/Swagger specification available (or equivalent).
- [ ] Environment variable documentation (`.env.example`).
- [ ] Migration scripts documented.

---

## How to Run the Audit

1. Set up a local or staging environment with a **real PostgreSQL database** (no mocks).
2. Run migrations to create schema.
3. Start the backend server.
4. Use a tool like Postman, Insomnia, or automated tests to hit each endpoint with appropriate authentication.
5. Verify request/response shapes against PRD §9.4.
6. Inspect database state after each operation to ensure correct updates.
7. Check logs for errors and audit entries.
8. Test edge cases: invalid tokens, expired OTP, insufficient balance, concurrent requests.

---

## Deliverables

- A report listing all endpoints with status (✅ implemented, ❌ missing, ⚠️ partial).
- For each endpoint, note any discrepancies from PRD.
- List of security/performance findings.
- Recommendations for fixes.

---

**Use this prompt to guide the audit. Ensure that all backend code is reviewed against these criteria, and that no mock data remains – everything must be backed by the database.**
