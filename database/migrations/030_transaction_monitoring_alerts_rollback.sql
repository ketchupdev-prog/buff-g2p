-- =============================================================================
-- ROLLBACK MIGRATION: 030_transaction_monitoring_alerts.sql
-- Purpose: Remove PSD-12 §2.5 real-time transaction monitoring system
-- WARNING: Will delete ALL fraud detection alerts
-- Reference: PSD-12 §2.5 - Transaction monitoring
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_calculate_alert_priority ON transaction_monitoring_alerts CASCADE;
DROP TRIGGER IF EXISTS update_alerts_updated_at ON transaction_monitoring_alerts CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS calculate_alert_priority() CASCADE;

-- Drop views
DROP VIEW IF EXISTS vw_fraud_detection_metrics CASCADE;
DROP VIEW IF EXISTS vw_alert_queue CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_alerts_detection_rule CASCADE;
DROP INDEX IF EXISTS idx_alerts_type_date CASCADE;
DROP INDEX IF EXISTS idx_alerts_risk_score CASCADE;
DROP INDEX IF EXISTS idx_alerts_open CASCADE;
DROP INDEX IF EXISTS idx_alerts_status_severity CASCADE;
DROP INDEX IF EXISTS idx_alerts_transaction CASCADE;
DROP INDEX IF EXISTS idx_alerts_user_status CASCADE;

-- Drop table
DROP TABLE IF EXISTS transaction_monitoring_alerts CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL fraud detection alerts will be permanently deleted
-- - Alert investigation history will be lost
-- - Case management data will be removed
-- - Feedback loop data for ML model improvement will be deleted
-- 
-- BREAKING CHANGES:
-- - Real-time fraud detection will be COMPLETELY DISABLED
-- - No transaction monitoring or alerting
-- - Cannot track fraud patterns or suspicious activity
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-12 §2.5 transaction monitoring requirements
-- - Fraud detection capabilities will be ELIMINATED
-- - Cannot demonstrate anti-fraud controls
-- 
-- TO RESTORE: Re-run forward migration 030_transaction_monitoring_alerts.sql
-- =============================================================================
