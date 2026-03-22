-- =============================================================================
-- ROLLBACK MIGRATION: 046_copilot_audit_log_alignment.sql
-- Purpose: Remove ETA attribution logging columns from copilot_audit_log
-- WARNING: Will cause INSERT failures in backend ETA attribution writer
-- Reference: ETA 2019 - Electronic Transfer Act attribution requirements
-- =============================================================================

-- Remove ETA attribution columns
ALTER TABLE copilot_audit_log DROP COLUMN IF EXISTS result CASCADE;
ALTER TABLE copilot_audit_log DROP COLUMN IF EXISTS input CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All captured ETA attribution structured payloads will be deleted
-- - Operation result tracking will be removed
-- 
-- BREAKING CHANGES WARNING:
-- - Backend ETA attribution writer will FAIL on INSERT
-- - Copilot logging endpoints will return 500 errors
-- - ETA compliance audit trail will be incomplete
-- 
-- REQUIRED FIXES AFTER ROLLBACK:
-- 1. Update backend to use legacy prompt_snippet-only schema
-- 2. Disable ETA attribution writer or update column references
-- 3. Review ETA 2019 compliance impact
-- 
-- TO RESTORE: Re-run forward migration 046_copilot_audit_log_alignment.sql
-- =============================================================================
