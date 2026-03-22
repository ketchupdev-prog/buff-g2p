-- =============================================================================
-- ROLLBACK MIGRATION: 036_obs_api_call_logs.sql
-- Purpose: Remove OBS v1.0 §9.1 API call logging system
-- WARNING: Will delete all OBS API call logs
-- Reference: OBS v1.0 §9.1 - API call logging for BoN reporting
-- =============================================================================

-- Drop views
DROP VIEW IF EXISTS vw_obs_monthly_bon_report CASCADE;
DROP VIEW IF EXISTS vw_obs_daily_api_usage CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_obs_api_logs_errors CASCADE;
DROP INDEX IF EXISTS idx_obs_api_logs_status CASCADE;
DROP INDEX IF EXISTS idx_obs_api_logs_endpoint CASCADE;
DROP INDEX IF EXISTS idx_obs_api_logs_tpp_date CASCADE;
DROP INDEX IF EXISTS idx_obs_api_logs_date CASCADE;

-- Drop table
DROP TABLE IF EXISTS obs_api_call_logs CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL OBS API call logs will be permanently deleted
-- - Monthly BoN reporting data will be lost
-- - API performance metrics will be removed
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate OBS v1.0 §9.1 logging requirements
-- - Monthly BoN API usage reports cannot be generated
-- - Cannot track TPP API activity
-- 
-- TO RESTORE: Re-run forward migration 036_obs_api_call_logs.sql
-- =============================================================================
