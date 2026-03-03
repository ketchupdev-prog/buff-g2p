# Buffr G2P – Database structure (Neon PostgreSQL)

Full schema as defined by `backend/migrations/*.sql`. Same database as Ketchup Portal (`DATABASE_URL`).  
**DB check:** `node backend/scripts/check-db.mjs` or `npm run db:check` (from backend).

---

## 1. Tables and columns (full structure)

### users
*Migration: 001 (+ 003 pin/profile, 005 fineract)*

| Column | Type | Constraints / notes |
|--------|------|----------------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| phone | VARCHAR(20) | NOT NULL, UNIQUE |
| first_name | VARCHAR(100) | 003 |
| last_name | VARCHAR(100) | 003 |
| photo_url | TEXT | 003 |
| last_proof_of_life | TIMESTAMPTZ | |
| proof_of_life_due_date | TIMESTAMPTZ | |
| wallet_status | VARCHAR(20) | NOT NULL, DEFAULT 'active', CHECK (active/frozen/deactivated) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| pin_hash | VARCHAR(255) | 003 |
| fineract_client_id | BIGINT | 005 |

**Indexes:** `idx_users_proof_of_life_due` ON (proof_of_life_due_date) WHERE wallet_status = 'active'.

---

### proof_of_life_events
*001*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| method | VARCHAR(50) | NOT NULL |
| performed_by | UUID | REFERENCES users(id) |
| performed_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| ip_address | INET | |
| user_agent | TEXT | |

**Indexes:** `idx_proof_of_life_user` ON (user_id, performed_at DESC).

---

### vouchers
*001*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| amount | NUMERIC(14,2) | NOT NULL |
| currency | CHAR(3) | NOT NULL, DEFAULT 'NAD' |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'available' |
| type | VARCHAR(50) | |
| expires_at | TIMESTAMPTZ | NOT NULL |
| external_id | VARCHAR(100) | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_vouchers_user_status` ON (user_id, status).

**Note:** If the table was created from an older schema without `user_id`/`status`, 001 repair adds them; the index may have been skipped (see “Missing / skipped” below).

---

### voucher_redemptions
*001*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| voucher_id | UUID | NOT NULL, REFERENCES vouchers(id) |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| method | VARCHAR(20) | NOT NULL |
| redemption_point | VARCHAR(200) | |
| amount_credited | NUMERIC(14,2) | NOT NULL |
| redeemed_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_voucher_redemptions_user` ON (user_id, redeemed_at DESC).

---

### wallets
*001 + 005*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| name | VARCHAR(100) | NOT NULL |
| type | VARCHAR(20) | NOT NULL, DEFAULT 'main' |
| balance | NUMERIC(14,2) | NOT NULL, DEFAULT 0, CHECK (>= 0) |
| currency | CHAR(3) | NOT NULL, DEFAULT 'NAD' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| fineract_savings_account_id | BIGINT | 005 |

**Indexes:** `idx_wallets_user` ON (user_id).

---

### wallet_transactions
*001 + 006*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| wallet_id | UUID | NOT NULL, REFERENCES wallets(id) |
| type | VARCHAR(50) | NOT NULL |
| amount | NUMERIC(14,2) | NOT NULL |
| balance_after | NUMERIC(14,2) | |
| reference_type | VARCHAR(50) | |
| reference_id | UUID | |
| description | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| reference | TEXT | 006 |

**Indexes:** `idx_wallet_tx_wallet_created` ON (wallet_id, created_at DESC).

---

### cash_out_codes
*001*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| code | VARCHAR(6) | NOT NULL, UNIQUE |
| amount | NUMERIC(14,2) | NOT NULL |
| currency | CHAR(3) | NOT NULL, DEFAULT 'NAD' |
| method | VARCHAR(20) | NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| used_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_cash_out_codes_code` ON (code), `idx_cash_out_codes_user_expires` ON (user_id, expires_at).

---

### loans
*001 + 005*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| wallet_id | UUID | REFERENCES wallets(id) |
| amount | NUMERIC(14,2) | NOT NULL |
| interest_rate | NUMERIC(5,2) | NOT NULL, DEFAULT 15.00 |
| total_repayment | NUMERIC(14,2) | NOT NULL |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' |
| previous_voucher_value | NUMERIC(14,2) | |
| disbursed_at | TIMESTAMPTZ | |
| repaid_at | TIMESTAMPTZ | |
| repayment_voucher_redemption_id | UUID | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| fineract_loan_id | BIGINT | 005 |

**Indexes:** `idx_loans_user_status` ON (user_id, status).

---

### loan_repayments
*001*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| loan_id | UUID | NOT NULL, REFERENCES loans(id) |
| amount | NUMERIC(14,2) | NOT NULL |
| voucher_redemption_id | UUID | NOT NULL, REFERENCES voucher_redemptions(id) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

---

### notifications
*001 + 002 (IF NOT EXISTS) + 003*

001 defines: id, user_id, type, title, body, data (JSONB), **read** (BOOLEAN), created_at.  
002 defines a second shape: title NOT NULL, **is_read**, etc. With `CREATE TABLE IF NOT EXISTS`, whichever runs first wins. 003 adds `type`, `data`, `is_read` if missing.

**Expected columns (after 003):** id, user_id, type, title, body, data, read and/or is_read, created_at.

**Indexes:** `idx_notifications_user_read` ON (user_id, read, created_at DESC) — 001; 003 also creates index on (user_id, is_read, created_at DESC). If the table has `is_read` but not `read`, the 001 index may be skipped (see “Missing / skipped” below).

---

### groups
*001*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | VARCHAR(100) | NOT NULL |
| description | TEXT | |
| created_by | UUID | NOT NULL, REFERENCES users(id) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

---

### group_members
*001*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| group_id | UUID | NOT NULL, REFERENCES groups(id) |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| role | VARCHAR(20) | DEFAULT 'member' |
| joined_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| UNIQUE(group_id, user_id) | | |

**Indexes:** `idx_group_members_user` ON (user_id).

---

### p2p_transactions
*001*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| sender_id | UUID | NOT NULL, REFERENCES users(id) |
| recipient_id | UUID | NOT NULL, REFERENCES users(id) |
| wallet_id | UUID | NOT NULL, REFERENCES wallets(id) |
| amount | NUMERIC(14,2) | NOT NULL |
| currency | CHAR(3) | NOT NULL, DEFAULT 'NAD' |
| note | TEXT | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'completed' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_p2p_recipient` ON (recipient_id, created_at DESC).

---

### analytics_events
*002*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| event_name | VARCHAR(255) | NOT NULL |
| event_data | JSONB | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_analytics_events_user_id`, `idx_analytics_events_created_at`.

---

### device_tokens
*002*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id), UNIQUE |
| push_token | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_device_tokens_user_id`.

---

### atm_codes
*002*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| wallet_id | UUID | NOT NULL, REFERENCES wallets(id) |
| code | VARCHAR(6) | NOT NULL |
| amount | DECIMAL(15,2) | NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| used_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_atm_codes_user_id`, `idx_atm_codes_code`, `idx_atm_codes_expires_at`.

---

### otp_codes
*004*

| Column | Type | Constraints |
|--------|------|--------------|
| id | SERIAL | PRIMARY KEY |
| phone | VARCHAR(20) | NOT NULL |
| code | VARCHAR(6) | NOT NULL, CHECK (length 6) |
| purpose | VARCHAR(20) | NOT NULL, DEFAULT 'login' |
| attempts | INTEGER | NOT NULL, DEFAULT 0 |
| max_attempts | INTEGER | NOT NULL, DEFAULT 3 |
| expires_at | TIMESTAMPTZ | NOT NULL |
| verified_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_otp_codes_phone_purpose`, `idx_otp_codes_expires_at`.

---

### otp_rate_limits
*004 + 004b*

| Column | Type | Constraints |
|--------|------|--------------|
| id | SERIAL | PRIMARY KEY |
| phone | VARCHAR(20) | NOT NULL |
| purpose | VARCHAR(20) | NOT NULL, DEFAULT 'login' |
| request_count | INTEGER | NOT NULL, DEFAULT 1 |
| window_start | TIMESTAMPTZ | NOT NULL |
| blocked_until | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_otp_rate_limits_phone` ON (phone, purpose); **004b:** UNIQUE index `otp_rate_limits_phone_purpose_key` ON (phone, purpose) — required for `create_otp()` ON CONFLICT.

---

### fineract_sync_log
*005*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NOT NULL |
| fineract_id | BIGINT | NOT NULL |
| action | VARCHAR(50) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_fineract_sync_log_entity`, `idx_fineract_sync_log_created`.

---

### public_keys
*006*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| kind | VARCHAR(20) | NOT NULL |
| identifier | VARCHAR(255) | NOT NULL |
| public_key_pem | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| UNIQUE(kind, identifier) | | |

**Indexes:** `idx_public_keys_kind_identifier`.

---

### compliance_incident_reports
*006*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| reported_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| payload | JSONB | |
| reported_by | VARCHAR(255) | |

**Indexes:** `idx_compliance_incident_reported_at`.

---

### audit_logs
*006*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | REFERENCES users(id) |
| entity_type | VARCHAR(50) | |
| entity_id | UUID | |
| action | VARCHAR(100) | NOT NULL |
| meta | JSONB | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_audit_logs_user_created`, `idx_audit_logs_entity`.

---

### verification_tokens
*006*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | UUID | NOT NULL, REFERENCES users(id) |
| token | VARCHAR(255) | NOT NULL, UNIQUE |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_verification_tokens_token`, `idx_verification_tokens_expires`.

---

### conversations
*007*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| session_id | TEXT | NOT NULL |
| user_id | TEXT | |
| user_message | TEXT | NOT NULL |
| assistant_response | TEXT | NOT NULL |
| agents_consulted | TEXT[] | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** `idx_conversations_session_id`, `idx_conversations_user_id`.

---

### exchange_rates
*007*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| base_currency | TEXT | NOT NULL, DEFAULT 'NAD' |
| target_currency | TEXT | NOT NULL |
| rate | DECIMAL(15,6) | NOT NULL |
| trend | TEXT | DEFAULT 'stable' |
| source | TEXT | DEFAULT 'exchangerate.host' |
| fetched_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| fetched_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** UNIQUE `idx_exchange_rates_unique` ON (base_currency, target_currency, fetched_date); `idx_exchange_rates_target_fetched`.

---

### exchange_rate_fetch_log
*007*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| fetch_date | DATE | NOT NULL |
| fetch_time | TIME | NOT NULL |
| currencies_fetched | INTEGER | NOT NULL, DEFAULT 0 |
| success | BOOLEAN | NOT NULL, DEFAULT true |
| api_source | TEXT | DEFAULT 'exchangerate.host' |
| error_message | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

**Indexes:** UNIQUE `idx_exchange_rate_fetch_log_unique` ON (fetch_date, fetch_time); `idx_exchange_rate_fetch_log_date`.

---

### knowledge_base_documents
*008*

| Column | Type | Constraints |
|--------|------|--------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| scope | VARCHAR(20) | NOT NULL, DEFAULT 'global', CHECK (global/user) |
| user_id | TEXT | (required if scope = 'user') |
| title | TEXT | NOT NULL |
| source | TEXT | NOT NULL |
| content | TEXT | NOT NULL |
| metadata | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| content_search | tsvector | 008, GENERATED (title || content), stored |

**Indexes:** UNIQUE partial on (source) WHERE scope='global' and user_id IS NULL; UNIQUE partial on (user_id, source) WHERE scope='user'; `idx_kb_documents_scope_user`, `idx_kb_documents_source`, GIN `idx_kb_documents_content_search`.

---

## 2. Functions (OTP – 004)

| Function | Returns | Purpose |
|----------|---------|--------|
| `cleanup_expired_otps()` | void | Deletes expired/verified OTPs and old rate-limit rows (call via cron). |
| `generate_otp()` | TEXT | Returns a 6-digit cryptographically secure OTP. |
| `create_otp(p_phone VARCHAR, p_purpose VARCHAR DEFAULT 'login', p_max_attempts INTEGER DEFAULT 3, p_ttl_minutes INTEGER DEFAULT 5)` | TABLE(code TEXT, expires_at TIMESTAMPTZ) | Creates OTP with rate limiting; requires unique index on otp_rate_limits(phone, purpose) (004b). |
| `verify_otp(p_phone VARCHAR, p_code VARCHAR, p_purpose VARCHAR DEFAULT 'login')` | TABLE(success BOOLEAN, message TEXT, attempts_remaining INTEGER) | Verifies OTP and marks used. |

---

## 3. Extensions

- **uuid-ossp** – 007 (IF NOT EXISTS). Used for gen_random_uuid() / uuid_generate_v4.

---

## 4. Missing / skipped items (notes)

- **notifications table shape:** 001 uses column `read`; 002 uses `is_read`. Whichever migration creates the table first wins. 003 adds `is_read` if missing. Code should use one name consistently; if the table has only `is_read`, index `idx_notifications_user_read` (on `read`) is skipped by the migration runner (42703).
- **vouchers:** If the table existed without `user_id` or `status`, 001 adds them via repair; if the index creation still fails (e.g. column missing in an older DB), the runner skips `idx_vouchers_user_status` (42703).
- **LangGraph checkpointer:** Not in migrations. 007 comment: “LangGraph checkpointer tables are created by the library at runtime (AsyncPostgresSaver.setup()).” So any LangGraph persistence tables are created when the AI service runs, not by run-migrations.
- **Migration runner:** Skips statements that fail with **42P07** (relation already exists) or **42703** (undefined column), so some indexes may be missing on older DBs until columns are aligned.

---

## 5. Running migrations and DB check

**Migrations** (from repo root; `DATABASE_URL` in `backend/.env`):

```bash
node backend/scripts/run-migrations.mjs
```

From backend: `npm run migrate`.

**DB check** (connectivity only):

```bash
node backend/scripts/check-db.mjs
```

From backend: `npm run db:check`.

**Verification:** DB check passes when Neon is reachable and `SELECT 1` succeeds (“DB OK: connected (same Neon as Ketchup Portal)”). It does not verify table count or column presence; for that, query `information_schema` or run the app/OTP flow.
