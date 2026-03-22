-- =============================================================================
-- ROLLBACK MIGRATION: 049_add_performance_indexes.sql
-- Purpose: Remove performance indexes added in migration 049
-- WARNING: Will degrade query performance
-- Reference: Database performance optimization
-- =============================================================================

-- Drop indexes CONCURRENTLY for zero downtime
-- Note: Use CONCURRENTLY to avoid blocking queries during index removal

DROP INDEX CONCURRENTLY IF EXISTS idx_compliance_alerts_user_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_obs_audit_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_daily_tx_totals_wallet_date;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- WARNING:
-- - Query performance will be degraded for:
--   * Daily transaction queries by wallet
--   * OBS audit log recent activity queries
--   * Compliance alert queries by user/status
-- 
-- - Full table scans may occur on large tables
-- - Query response times will increase
-- 
-- TO RESTORE: Re-run forward migration 049_add_performance_indexes.sql
-- =============================================================================
