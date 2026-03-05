# Buffr G2P – Database migrations

This document describes how to run and verify database migrations for the Buffr G2P backend (Neon PostgreSQL). Same database as Ketchup Portal (`DATABASE_URL`).

## Quick reference

| Action | Command |
|--------|---------|
| **Check DB + verify migrations** | `cd backend && npm run db:check` |
| **Run all migrations** | `cd backend && npm run migrate` |

From repo root:

```bash
node backend/scripts/check-db.mjs    # verify migrations
node backend/scripts/run-migrations.mjs   # apply migrations
```

## 1. Prerequisites

- **DATABASE_URL** must be set in `backend/.env` (or `backend/.env.local`). Example:

  ```env
  DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
  ```

- For Neon: use the **pooled** connection string (e.g. host contains `-pooler`) when possible.
- Backend dependencies installed: `cd backend && npm install` (includes `pg`).

## 2. Verify migrations (check script)

Before or after applying migrations, you can verify that the database has all expected tables, columns, functions, and indexes:

```bash
cd backend
npm run db:check
```

- **Exit 0**: Database connected and all migration objects are present.
- **Exit 1**: Either connection failed or some objects are missing (run `npm run migrate` to apply).

The script checks:

| Migration file | What is verified |
|----------------|------------------|
| `001_prd_schema.sql` | Tables: users, wallets, wallet_transactions, vouchers, notifications, loans, groups, p2p_transactions |
| `002_analytics_notifications_atm.sql` | Tables: analytics_events, device_tokens, atm_codes |
| `003_user_profile_and_pin.sql` | Column users.pin_hash |
| `004_otp_verification.sql` | Tables: otp_codes, otp_rate_limits; functions: create_otp, verify_otp, generate_otp |
| `004b_otp_rate_limits_unique.sql` | Unique index otp_rate_limits_phone_purpose_key |
| `005_fineract_mapping.sql` | Table: fineract_sync_log; columns: users.fineract_client_id, wallets.fineract_savings_account_id, loans.fineract_loan_id |
| `006_api_and_compliance.sql` | Tables: public_keys, compliance_incident_reports, audit_logs, verification_tokens; column wallet_transactions.reference |
| `007_ai_companion.sql` | Tables: conversations, exchange_rates, exchange_rate_fetch_log |
| `008_knowledge_base.sql` | Table: knowledge_base_documents |

## 3. Run migrations

To apply all migration SQL files in order:

```bash
cd backend
npm run migrate
```

Or from repo root:

```bash
node backend/scripts/run-migrations.mjs
```

- The script loads `backend/.env`, `backend/.env.local`, and root `.env`.
- It runs every `.sql` file in `backend/migrations/` in **lexicographic order** (001, 002, 003, 004, 004b, 005, 006, 007, 008).
- Statements that fail with **42P07** (relation already exists) or **42703** (undefined column) are skipped so re-runs are safe for idempotent migrations.
- Any other error stops the run and exits 1.

## 4. Migration files

| File | Purpose |
|------|---------|
| `001_prd_schema.sql` | Core PRD schema: users, wallets, transactions, vouchers, loans, groups, notifications, p2p_transactions |
| `002_analytics_notifications_atm.sql` | Analytics events, device tokens, ATM codes |
| `003_user_profile_and_pin.sql` | User profile (first_name, last_name, photo_url) and pin_hash |
| `004_otp_verification.sql` | OTP codes, rate limits, create_otp / verify_otp / generate_otp |
| `004b_otp_rate_limits_unique.sql` | Unique index on otp_rate_limits(phone, purpose) for create_otp ON CONFLICT |
| `005_fineract_mapping.sql` | Fineract IDs on users, wallets, loans; fineract_sync_log |
| `006_api_and_compliance.sql` | verification_tokens, audit_logs, compliance_incident_reports, public_keys; wallet_transactions.reference |
| `007_ai_companion.sql` | conversations, exchange_rates, exchange_rate_fetch_log (AI Companion) |
| `008_knowledge_base.sql` | knowledge_base_documents (full-text search for AI) |

**Note:** LangGraph checkpointer tables (`checkpoints`, `checkpoint_blobs`, etc.) are created at runtime by the Buffr AI Companion (`AsyncPostgresSaver.setup()`), not by these migrations.

## 5. Troubleshooting

- **DATABASE_URL not set**  
  Ensure `backend/.env` contains `DATABASE_URL`. The scripts load it automatically.

- **"relation already exists" (42P07)**  
  Normal when re-running; the migrate script skips these. Use `npm run db:check` to confirm state.

- **"column X does not exist" (42703)**  
  Usually an index referencing a column from a later migration. Options: (1) Use a fresh DB and run `npm run migrate` once; (2) Align schema manually; (3) Run migrations in order and fix any failed statement.

- **OTP / create_otp not working**  
  Ensure 004 and 004b have run so `create_otp` exists and `otp_rate_limits` has the unique index. See `backend/docs/OTP_ONBOARDING.md`.

- **SSL / connection errors**  
  Use `?sslmode=require` (or `verify-full`) in `DATABASE_URL`. For Neon, use the pooled connection string.

## 6. Related docs

- **Schema reference:** `backend/docs/DB_STRUCTURE.md`
- **OTP and onboarding:** `backend/docs/OTP_ONBOARDING.md`
- **Integration overview:** `backend/INTEGRATION_VERIFICATION.md` or `docs/INTEGRATION_VERIFICATION.md`
