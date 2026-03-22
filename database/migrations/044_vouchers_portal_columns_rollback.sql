-- =============================================================================
-- ROLLBACK MIGRATION: 044_vouchers_portal_columns.sql
-- Purpose: Remove voucher portal/webhook integration columns
-- WARNING: This will delete voucher codes and portal-specific metadata
-- Reference: PSD-12 Art. 66 - E-money issuance, PSD-3 Art. 2(2) - E-money definition
-- =============================================================================

-- Drop unique index first
DROP INDEX IF EXISTS idx_vouchers_voucher_code_unique CASCADE;

-- Remove columns in reverse order (safe with IF EXISTS)
ALTER TABLE vouchers DROP COLUMN IF EXISTS metadata CASCADE;
ALTER TABLE vouchers DROP COLUMN IF EXISTS updated_at CASCADE;
ALTER TABLE vouchers DROP COLUMN IF EXISTS redeemed_at CASCADE;
ALTER TABLE vouchers DROP COLUMN IF EXISTS redemption_method_allowed CASCADE;
ALTER TABLE vouchers DROP COLUMN IF EXISTS issued_at CASCADE;
ALTER TABLE vouchers DROP COLUMN IF EXISTS issuer CASCADE;
ALTER TABLE vouchers DROP COLUMN IF EXISTS voucher_type CASCADE;
ALTER TABLE vouchers DROP COLUMN IF EXISTS voucher_code CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All voucher codes will be permanently deleted
-- - Portal issuance metadata (Buffr/Ketchup webhooks) will be lost
-- - Redemption method configurations will be removed
-- - Issuer information will be deleted
-- 
-- DATA LOSS WARNING:
-- - Active voucher codes will no longer be redeemable via portal
-- - Webhook integration will break (missing columns)
-- 
-- TO RESTORE: Re-run forward migration 044_vouchers_portal_columns.sql
-- =============================================================================
