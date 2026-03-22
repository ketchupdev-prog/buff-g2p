-- =============================================================================
-- ROLLBACK MIGRATION: 022_missing_tables.sql
-- Purpose: Remove 8 critical missing tables and performance indexes
-- WARNING: This is a LARGE rollback affecting multiple systems
-- Reference: Critical infrastructure tables and indexes
-- =============================================================================

-- Drop schema_migrations tracking table
DROP TABLE IF EXISTS schema_migrations CASCADE;

-- Drop all performance indexes for existing tables
DROP INDEX IF EXISTS idx_obs_audit_consent CASCADE;
DROP INDEX IF EXISTS idx_card_txn_merchant CASCADE;
DROP INDEX IF EXISTS idx_copilot_sec_severity CASCADE;
DROP INDEX IF EXISTS idx_users_status CASCADE;
DROP INDEX IF EXISTS idx_transactions_amount CASCADE;
DROP INDEX IF EXISTS idx_transactions_dest_user_completed CASCADE;
DROP INDEX IF EXISTS idx_transactions_source_user_completed CASCADE;
DROP INDEX IF EXISTS idx_transactions_fraud_detection CASCADE;
DROP INDEX IF EXISTS idx_obs_consent_expiry CASCADE;
DROP INDEX IF EXISTS idx_kyc_pending CASCADE;
DROP INDEX IF EXISTS idx_wallets_active CASCADE;
DROP INDEX IF EXISTS idx_wallets_user_currency CASCADE;
DROP INDEX IF EXISTS idx_transactions_metadata_groupid CASCADE;
DROP INDEX IF EXISTS idx_transactions_type_status CASCADE;

-- Drop 8 critical tables in reverse dependency order
DROP TABLE IF EXISTS loan_applications CASCADE;
DROP TABLE IF EXISTS voucher_redemptions CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS fee_audit_log CASCADE;
DROP TABLE IF EXISTS grants CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS copilot_audit_log CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - 8 critical tables permanently deleted:
--   * copilot_audit_log (ETA §32 compliance)
--   * groups & group_members (savings circles)
--   * grants (G2P disbursements)
--   * fee_audit_log (fee transparency)
--   * rate_limits (API rate limiting)
--   * voucher_redemptions (coupon tracking)
--   * loan_applications (loan processing)
-- - 30+ performance indexes removed
-- 
-- CATASTROPHIC IMPACT:
-- - Savings circles feature completely disabled
-- - G2P grant disbursement tracking lost
-- - Loan application system broken
-- - Rate limiting will not persist across restarts
-- - Fee transparency audit trail deleted
-- - ETA §32 compliance audit logging removed
-- 
-- TO RESTORE: Re-run forward migration 022_missing_tables.sql
-- =============================================================================
