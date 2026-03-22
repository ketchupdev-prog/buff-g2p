-- =============================================================================
-- ROLLBACK MIGRATION: 041_bon_reporting_queue.sql
-- Purpose: Remove PSD-8 §5.1 automated BoN reporting queue
-- WARNING: Will delete all BoN reporting queue data
-- Reference: PSD-8 §5.1 - Automated regulatory reporting
-- =============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS update_bon_queue_updated_at ON bon_reporting_queue CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS schedule_monthly_bon_reports(VARCHAR) CASCADE;

-- Drop views
DROP VIEW IF EXISTS vw_bon_monthly_reporting_schedule CASCADE;
DROP VIEW IF EXISTS vw_bon_reports_pending CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_bon_gen_history_report CASCADE;
DROP INDEX IF EXISTS idx_bon_queue_pending CASCADE;
DROP INDEX IF EXISTS idx_bon_queue_overdue CASCADE;
DROP INDEX IF EXISTS idx_bon_queue_type CASCADE;
DROP INDEX IF EXISTS idx_bon_queue_status CASCADE;

-- Drop tables
DROP TABLE IF EXISTS bon_report_generation_history CASCADE;
DROP TABLE IF EXISTS bon_reporting_queue CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All scheduled BoN reports will be permanently deleted
-- - Report generation history will be lost
-- - Pending and submitted report tracking will be removed
-- 
-- BREAKING CHANGES:
-- - Automated monthly BoN reporting will be COMPLETELY DISABLED
-- - No tracking of report submissions or acknowledgements
-- - Report scheduling automation will not function
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-8 §5.1 regulatory reporting requirements
-- - Cannot track or manage BoN report submissions
-- - Risk of missing critical reporting deadlines
-- 
-- TO RESTORE: Re-run forward migration 041_bon_reporting_queue.sql
-- =============================================================================
