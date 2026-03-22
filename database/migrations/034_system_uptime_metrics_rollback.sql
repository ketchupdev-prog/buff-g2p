-- =============================================================================
-- ROLLBACK MIGRATION: 034_system_uptime_metrics.sql
-- Purpose: Remove PSD-7 §3.3 system uptime tracking (99.9% target)
-- WARNING: Will delete all uptime metrics
-- Reference: PSD-7 §3.3 - System uptime monitoring
-- =============================================================================

-- Drop views
DROP VIEW IF EXISTS vw_monthly_uptime CASCADE;
DROP VIEW IF EXISTS vw_daily_uptime_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_uptime_downtime CASCADE;
DROP INDEX IF EXISTS idx_uptime_date CASCADE;
DROP INDEX IF EXISTS idx_uptime_service_hour CASCADE;

-- Drop table
DROP TABLE IF EXISTS system_uptime_metrics CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All system uptime metrics will be permanently deleted
-- - Downtime incident tracking will be lost
-- - 99.9% SLA compliance data will be removed
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-7 §3.3 uptime requirements (99.9%)
-- - Cannot demonstrate uptime compliance to BoN
-- - System reliability metrics unavailable
-- 
-- TO RESTORE: Re-run forward migration 034_system_uptime_metrics.sql
-- =============================================================================
