-- =============================================================================
-- ROLLBACK MIGRATION: 039_free_withdrawal_tracking.sql
-- Purpose: Remove PSD-11 §3.4 first free ATM withdrawal tracking
-- WARNING: Will delete all free withdrawal tracking data
-- Reference: PSD-11 §3.4 - First free withdrawal per month
-- =============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS update_free_withdrawal_tracking_updated_at ON free_withdrawal_tracking CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_withdrawal_tracking(UUID, NUMERIC, NUMERIC, BOOLEAN, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS determine_withdrawal_fee(UUID, NUMERIC, BOOLEAN) CASCADE;

-- Drop view
DROP VIEW IF EXISTS vw_monthly_free_withdrawal_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_free_withdrawal_eligible CASCADE;
DROP INDEX IF EXISTS idx_free_withdrawal_month CASCADE;
DROP INDEX IF EXISTS idx_free_withdrawal_user_month CASCADE;

-- Drop table
DROP TABLE IF EXISTS free_withdrawal_tracking CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All free withdrawal tracking records will be permanently deleted
-- - Monthly withdrawal counters will be reset
-- - Fee waiver history will be lost
-- 
-- BREAKING CHANGES:
-- - First free withdrawal per month feature will be DISABLED
-- - Fee determination logic will not work
-- 
-- COMPLIANCE WARNING:
-- - May violate PSD-11 §3.4 first free withdrawal requirement
-- - Cannot track or enforce free withdrawal benefit
-- 
-- TO RESTORE: Re-run forward migration 039_free_withdrawal_tracking.sql
-- =============================================================================
