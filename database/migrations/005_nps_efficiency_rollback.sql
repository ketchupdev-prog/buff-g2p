-- =============================================================================
-- ROLLBACK MIGRATION: 005_nps_efficiency.sql
-- Purpose: Remove PSD-7 NPS efficiency metrics tracking
-- WARNING: Will delete all NPS performance metrics
-- Reference: PSD-7 NPS efficiency requirements, BoN reporting
-- =============================================================================

-- Drop unique index
DROP INDEX IF EXISTS idx_nps_efficiency_date_stream CASCADE;

-- Drop table
DROP TABLE IF EXISTS nps_efficiency_metrics CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All NPS efficiency metrics will be permanently deleted
-- - Payment stream performance data will be lost
-- - STP rates and availability percentages will be removed
-- - BoN reporting history will be deleted
-- 
-- COMPLIANCE WARNING:
-- - NPS efficiency tracking will be DISABLED
-- - May violate PSD-7 performance reporting requirements
-- - BoN regulatory reporting will fail
-- 
-- TO RESTORE: Re-run forward migration 005_nps_efficiency.sql
-- =============================================================================
