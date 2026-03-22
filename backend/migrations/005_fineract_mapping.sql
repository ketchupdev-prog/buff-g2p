-- Buffr G2P – Fineract mapping columns and sync audit.
-- Enables backend to store Buffr ↔ Fineract IDs for core banking sync.
-- Run after 001–004. Safe to re-run (IF NOT EXISTS / add column if not exists pattern).

-- Users: Fineract client ID (populated when client is created in Fineract, e.g. on first wallet create)
ALTER TABLE users ADD COLUMN IF NOT EXISTS fineract_client_id BIGINT;

-- Wallets: Fineract savings account ID (populated when savings account is created in Fineract)
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS fineract_savings_account_id BIGINT;

-- Loans: Fineract loan ID (populated when voucher-backed advance is disbursed via Fineract)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS fineract_loan_id BIGINT;

-- Optional: audit log for Fineract sync actions (entity_type, entity_id, fineract_id, action, created_at)
CREATE TABLE IF NOT EXISTS fineract_sync_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       VARCHAR(50) NOT NULL,
  entity_id         UUID NOT NULL,
  fineract_id       BIGINT NOT NULL,
  action            VARCHAR(50) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fineract_sync_log_entity ON fineract_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fineract_sync_log_created ON fineract_sync_log(created_at DESC);
