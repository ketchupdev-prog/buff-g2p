-- =============================================================================
-- Migration: 044_vouchers_portal_columns
-- Purpose: Align `vouchers` with SmartPay mobile + portal issuance (Buffr/Ketchup
--          `voucher.issued` webhook). Safe on DBs that already have columns.
-- Location: fintech/database/migrations/044_vouchers_portal_columns.sql
-- =============================================================================

ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(32);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS voucher_type VARCHAR(80);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS issuer VARCHAR(120);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS redemption_method_allowed JSONB DEFAULT '["wallet","nampost","smartpay"]'::jsonb;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- One active code per voucher row (portal/Ketchup issuance)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_voucher_code_unique
  ON vouchers(voucher_code)
  WHERE voucher_code IS NOT NULL;

COMMENT ON COLUMN vouchers.voucher_code IS 'Customer-facing numeric/code string for redemption (e.g. 12-digit).';
COMMENT ON COLUMN vouchers.metadata IS 'Opaque JSON; webhook source may set buffr/ketchup correlation ids.';
