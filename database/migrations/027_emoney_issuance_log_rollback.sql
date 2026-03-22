-- =============================================================================
-- ROLLBACK MIGRATION: 027_emoney_issuance_log.sql
-- Purpose: Remove PSD-3 §2.6 e-money issuance and redemption audit trail
-- WARNING: Will delete ALL e-money lifecycle audit logs
-- Reference: PSD-3 §2.6 - E-money audit trail
-- =============================================================================

-- Drop function
DROP FUNCTION IF EXISTS log_emoney_operation(UUID, UUID, VARCHAR, NUMERIC, CHAR, NUMERIC, NUMERIC, VARCHAR, VARCHAR, UUID, UUID, NUMERIC, JSONB) CASCADE;

-- Drop views
DROP VIEW IF EXISTS vw_high_value_emoney_operations CASCADE;
DROP VIEW IF EXISTS vw_daily_emoney_summary CASCADE;
DROP VIEW IF EXISTS vw_emoney_float_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_emoney_log_related_tx CASCADE;
DROP INDEX IF EXISTS idx_emoney_log_trust_account CASCADE;
DROP INDEX IF EXISTS idx_emoney_log_flagged CASCADE;
DROP INDEX IF EXISTS idx_emoney_log_amount CASCADE;
DROP INDEX IF EXISTS idx_emoney_log_date CASCADE;
DROP INDEX IF EXISTS idx_emoney_log_operation CASCADE;
DROP INDEX IF EXISTS idx_emoney_log_wallet_date CASCADE;
DROP INDEX IF EXISTS idx_emoney_log_user_date CASCADE;

-- Drop table
DROP TABLE IF EXISTS emoney_issuance_log CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL e-money issuance/redemption audit logs will be permanently deleted
-- - Complete lifecycle tracking history will be lost
-- - Trust account impact records will be removed
-- - High-value transaction monitoring will be disabled
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-3 §2.6 audit trail requirements
-- - Cannot demonstrate proper e-money lifecycle management
-- - BoN regulatory audit trail will be incomplete
-- - Fraud investigation capability severely limited
-- 
-- TO RESTORE: Re-run forward migration 027_emoney_issuance_log.sql
-- =============================================================================
