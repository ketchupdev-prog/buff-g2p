-- =============================================================================
-- ROLLBACK MIGRATION: 040_penalty_tracking.sql
-- Purpose: Remove PSD-8 §4.1 enhanced penalty lifecycle tracking
-- WARNING: Will delete all penalty and payment records
-- Reference: PSD-8 §4.1 - Penalty tracking and management
-- =============================================================================

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_log_penalty_status_change ON penalty_tracking CASCADE;
DROP TRIGGER IF EXISTS trigger_auto_update_penalty_status ON penalty_tracking CASCADE;
DROP TRIGGER IF EXISTS update_penalty_tracking_updated_at ON penalty_tracking CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS log_penalty_status_change() CASCADE;
DROP FUNCTION IF EXISTS auto_update_penalty_status() CASCADE;

-- Drop views
DROP VIEW IF EXISTS vw_penalty_summary CASCADE;
DROP VIEW IF EXISTS vw_outstanding_penalties CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_penalty_history_penalty CASCADE;
DROP INDEX IF EXISTS idx_penalty_payments_status CASCADE;
DROP INDEX IF EXISTS idx_penalty_payments_penalty CASCADE;
DROP INDEX IF EXISTS idx_penalty_assigned CASCADE;
DROP INDEX IF EXISTS idx_penalty_overdue CASCADE;
DROP INDEX IF EXISTS idx_penalty_status CASCADE;
DROP INDEX IF EXISTS idx_penalty_violation CASCADE;

-- Drop tables
DROP TABLE IF EXISTS penalty_status_history CASCADE;
DROP TABLE IF EXISTS penalty_payments CASCADE;
DROP TABLE IF EXISTS penalty_tracking CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All penalty records will be permanently deleted
-- - Payment history and installment plans will be lost
-- - Appeal records and outcomes will be removed
-- - Penalty status audit trail will be deleted
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-8 §4.1 penalty tracking requirements
-- - Cannot track penalty lifecycle (issuance, appeal, payment)
-- - BoN penalty management audit trail lost
-- 
-- TO RESTORE: Re-run forward migration 040_penalty_tracking.sql
-- =============================================================================
