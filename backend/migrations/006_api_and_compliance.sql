-- Buffr G2P – API and compliance schema (PRD §9.4, §19).
-- Run after 001–005. Idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Rollback (manual): DROP TABLE IF EXISTS verification_tokens; DROP TABLE IF EXISTS audit_logs;
--   DROP TABLE IF EXISTS compliance_incident_reports; DROP TABLE IF EXISTS public_keys;
-- Do not drop wallet_transactions.reference to avoid breaking existing data.

-- Allow INSERTs that use reference (text) for wallet_transactions
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference TEXT;

-- Public keys for QR (merchant alias, PSP org id) – Signed QR / ListVAE
CREATE TABLE IF NOT EXISTS public_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       VARCHAR(20) NOT NULL,
  identifier VARCHAR(255) NOT NULL,
  public_key_pem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kind, identifier)
);
CREATE INDEX IF NOT EXISTS idx_public_keys_kind_identifier ON public_keys(kind, identifier);

-- Compliance: incident reports (PSD-12)
CREATE TABLE IF NOT EXISTS compliance_incident_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload     JSONB,
  reported_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_compliance_incident_reported_at ON compliance_incident_reports(reported_at DESC);

-- Audit logs (ETA s.24, s.25; query by user or transaction)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  entity_type VARCHAR(50),
  entity_id   UUID,
  action      VARCHAR(100) NOT NULL,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Verification tokens for 2FA (short-lived; used in redeem, cashout, send)
CREATE TABLE IF NOT EXISTS verification_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens(expires_at);
