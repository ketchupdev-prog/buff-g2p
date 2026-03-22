-- =============================================================================
-- ROLLBACK MIGRATION: 042_ml_prediction_tables.sql
-- Purpose: Safely remove all ML prediction tables, views, functions, and triggers
-- WARNING: This will permanently delete ALL ML prediction data
-- Reference: PSD-12 Art. 5(f) - Data minimization, PSD-3 Art. 94 - Model governance
-- =============================================================================

-- Drop views first (depend on tables)
DROP VIEW IF EXISTS vw_current_credit_scores CASCADE;
DROP VIEW IF EXISTS vw_ml_spending_summary CASCADE;
DROP VIEW IF EXISTS vw_ml_credit_performance CASCADE;
DROP VIEW IF EXISTS vw_ml_fraud_performance CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_current_credit_score(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_latest_fraud_prediction(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_credit_score_feedback(UUID, BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_fraud_prediction_feedback(UUID, BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_fraud_alert_from_ml() CASCADE;
DROP FUNCTION IF EXISTS expire_old_credit_scores() CASCADE;

-- Drop triggers (explicitly before functions they reference)
DROP TRIGGER IF EXISTS trigger_create_fraud_alert_from_ml ON ml_fraud_predictions CASCADE;
DROP TRIGGER IF EXISTS trigger_expire_old_credit_scores ON ml_credit_scores CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS ml_feature_cache CASCADE;
DROP TABLE IF EXISTS ml_model_performance CASCADE;
DROP TABLE IF EXISTS ml_transaction_classifications CASCADE;
DROP TABLE IF EXISTS ml_spending_predictions CASCADE;
DROP TABLE IF EXISTS ml_credit_scores CASCADE;
DROP TABLE IF EXISTS ml_fraud_predictions CASCADE;

-- Note: Indexes are automatically dropped with their tables

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All ML prediction data will be permanently deleted
-- - Historical model performance metrics will be lost
-- - Cached features will be removed
-- - User credit scores and fraud predictions will be deleted
-- 
-- TO RESTORE: Re-run forward migration 042_ml_prediction_tables.sql
-- =============================================================================
