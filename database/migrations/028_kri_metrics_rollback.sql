-- =============================================================================
-- ROLLBACK MIGRATION: 028_kri_metrics.sql
-- Purpose: Remove PSD-12 §2.1 Key Risk Indicators tracking system
-- WARNING: Will delete ALL KRI monitoring and reporting data
-- Reference: PSD-12 §2.1 - KRI reporting requirements
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_kri_thresholds_updated_at ON kri_thresholds CASCADE;
DROP TRIGGER IF EXISTS update_kri_metrics_updated_at ON kri_metrics CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS calculate_kri_status(VARCHAR, NUMERIC, NUMERIC) CASCADE;

-- Drop views
DROP VIEW IF EXISTS vw_critical_kri_alerts CASCADE;
DROP VIEW IF EXISTS vw_kri_trends CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_kri_thresholds_active CASCADE;
DROP INDEX IF EXISTS idx_kri_bon_reporting CASCADE;
DROP INDEX IF EXISTS idx_kri_alert_pending CASCADE;
DROP INDEX IF EXISTS idx_kri_risk_level CASCADE;
DROP INDEX IF EXISTS idx_kri_status CASCADE;
DROP INDEX IF EXISTS idx_kri_type_period CASCADE;
DROP INDEX IF EXISTS idx_kri_unique_metric_period CASCADE;
DROP INDEX IF EXISTS idx_kri_date_type CASCADE;

-- Drop tables
DROP TABLE IF EXISTS kri_thresholds CASCADE;
DROP TABLE IF EXISTS kri_metrics CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL KRI metric historical data will be permanently deleted
-- - KRI threshold configurations will be lost
-- - Trend analysis data will be removed
-- - Alert history will be deleted
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-12 §2.1 KRI reporting requirements
-- - Monthly BoN KRI reports cannot be generated
-- - Risk management oversight will be BLIND
-- - Cannot demonstrate proactive risk monitoring
-- 
-- TO RESTORE: Re-run forward migration 028_kri_metrics.sql
-- =============================================================================
