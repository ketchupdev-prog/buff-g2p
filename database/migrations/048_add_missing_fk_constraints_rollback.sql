-- =============================================================================
-- ROLLBACK MIGRATION: 048_add_missing_fk_constraints.sql
-- Purpose: Remove foreign key constraints added in migration 048
-- WARNING: Will remove referential integrity checks
-- Reference: Database safety - FK constraints
-- =============================================================================

-- Drop FK constraints in reverse order
ALTER TABLE transaction_monitoring_alerts DROP CONSTRAINT IF EXISTS transaction_monitoring_alerts_transaction_id_fkey CASCADE;
ALTER TABLE fraud_detection_rules DROP CONSTRAINT IF EXISTS fraud_detection_rules_created_by_fkey CASCADE;
ALTER TABLE bon_reporting_queue DROP CONSTRAINT IF EXISTS fk_bon_reporting_queue_transaction_id CASCADE;
ALTER TABLE penalty_tracking DROP CONSTRAINT IF EXISTS penalty_tracking_violation_id_fkey CASCADE;
ALTER TABLE kri_metrics DROP CONSTRAINT IF EXISTS fk_kri_metrics_wallet_id CASCADE;
ALTER TABLE obs_consent_audit_log DROP CONSTRAINT IF EXISTS fk_obs_consent_audit_log_consent_id CASCADE;
ALTER TABLE compliance_alerts DROP CONSTRAINT IF EXISTS fk_compliance_alerts_transaction_id CASCADE;
ALTER TABLE compliance_alerts DROP CONSTRAINT IF EXISTS fk_compliance_alerts_user_id CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- WARNING:
-- - Referential integrity checks have been removed
-- - Orphaned records may be created
-- - Database consistency is no longer guaranteed by FK constraints
-- 
-- TO RESTORE: Re-run forward migration 048_add_missing_fk_constraints.sql
-- =============================================================================
