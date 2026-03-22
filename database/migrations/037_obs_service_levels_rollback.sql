-- =============================================================================
-- ROLLBACK MIGRATION: 037_obs_service_levels.sql
-- Purpose: Remove OBS v1.0 §9.2 service level monitoring
-- WARNING: Will delete all OBS SLA tracking data
-- Reference: OBS v1.0 §9.2 - Service level monitoring (99.5% uptime)
-- =============================================================================

-- Drop views
DROP VIEW IF EXISTS vw_obs_monthly_sla_report CASCADE;
DROP VIEW IF EXISTS vw_obs_daily_service_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_obs_service_sla_breach CASCADE;
DROP INDEX IF EXISTS idx_obs_service_date CASCADE;
DROP INDEX IF EXISTS idx_obs_service_hour CASCADE;

-- Drop table
DROP TABLE IF EXISTS obs_service_levels CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All OBS service level metrics will be permanently deleted
-- - 99.5% uptime compliance data will be lost
-- - API latency tracking will be removed
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate OBS v1.0 §9.2 SLA requirements (99.5% uptime)
-- - Cannot demonstrate OBS API reliability
-- - Monthly BoN SLA reports cannot be generated
-- 
-- TO RESTORE: Re-run forward migration 037_obs_service_levels.sql
-- =============================================================================
