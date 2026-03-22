-- =============================================================================
-- ROLLBACK MIGRATION: 038_interchange_rates.sql
-- Purpose: Remove PSD-11 §3.1 interchange rate caps system
-- WARNING: Will delete all interchange rate configurations
-- Reference: PSD-11 §3.1 - Interchange rate caps
-- =============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS update_interchange_rates_updated_at ON interchange_rates CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS calculate_interchange_fee(VARCHAR, VARCHAR, VARCHAR, NUMERIC) CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_interchange_compliant CASCADE;
DROP INDEX IF EXISTS idx_interchange_effective CASCADE;
DROP INDEX IF EXISTS idx_interchange_card_type CASCADE;

-- Drop table
DROP TABLE IF EXISTS interchange_rates CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All interchange rate configurations will be permanently deleted
-- - 16+ seeded rates (debit/credit/prepaid/NamQR) will be lost
-- - Fee calculation function will be removed
-- 
-- BREAKING CHANGES:
-- - Interchange fee calculation will FAIL
-- - Cannot enforce PSD-11 rate caps (0.25% debit, 0.50% credit)
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-11 §3.1 interchange rate cap requirements
-- - Cannot verify compliance with rate caps
-- 
-- TO RESTORE: Re-run forward migration 038_interchange_rates.sql
-- =============================================================================
