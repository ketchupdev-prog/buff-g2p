-- =============================================================================
-- ROLLBACK MIGRATION: 032_transaction_processing_time.sql
-- Purpose: Remove PSD-7 §3.1 transaction processing time tracking
-- WARNING: Will delete processing time metrics
-- Reference: PSD-7 §3.1 - Transaction processing time
-- =============================================================================

-- Drop view
DROP VIEW IF EXISTS vw_transaction_performance CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_transactions_slow CASCADE;
DROP INDEX IF EXISTS idx_transactions_processing_time CASCADE;

-- Remove columns from transactions table
ALTER TABLE transactions DROP COLUMN IF EXISTS processing_completed_at CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS processing_started_at CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS processing_time_ms CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All transaction processing time data will be permanently deleted
-- - Performance metrics for PSD-7 compliance will be lost
-- 
-- COMPLIANCE WARNING:
-- - May violate PSD-7 §3.1 processing time monitoring requirements
-- - Cannot track or report on transaction processing performance
-- 
-- TO RESTORE: Re-run forward migration 032_transaction_processing_time.sql
-- =============================================================================
