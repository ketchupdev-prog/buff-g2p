-- =============================================================================
-- ROLLBACK MIGRATION: 031_fraud_detection_rules.sql
-- Purpose: Remove PSD-12 §2.5 fraud detection rules engine
-- WARNING: Will delete ALL fraud detection rules and configurations
-- Reference: PSD-12 §2.5 - Fraud detection rules
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_fraud_rule_performance ON fraud_rule_triggers CASCADE;
DROP TRIGGER IF EXISTS update_fraud_rules_updated_at ON fraud_detection_rules CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_fraud_rule_performance() CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_rule_triggers_transaction CASCADE;
DROP INDEX IF EXISTS idx_rule_triggers_alert CASCADE;
DROP INDEX IF EXISTS idx_rule_triggers_rule CASCADE;
DROP INDEX IF EXISTS idx_fraud_rules_type CASCADE;
DROP INDEX IF EXISTS idx_fraud_rules_active CASCADE;

-- Drop tables
DROP TABLE IF EXISTS fraud_rule_triggers CASCADE;
DROP TABLE IF EXISTS fraud_detection_rules CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL fraud detection rules will be permanently deleted
-- - Rule performance metrics will be lost
-- - Rule trigger history will be removed
-- - 10+ seeded fraud detection rules will be deleted
-- 
-- BREAKING CHANGES:
-- - Configurable fraud detection rules engine will be DISABLED
-- - No automated fraud rule processing
-- - Cannot enforce KYC tier transaction limits
-- - Velocity limits, structuring detection, pattern matching all disabled
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-12 §2.5 fraud prevention requirements
-- - PSD-3 KYC tier enforcement will NOT work
-- - Cannot demonstrate rule-based fraud controls
-- 
-- TO RESTORE: Re-run forward migration 031_fraud_detection_rules.sql
-- NOTE: All 10+ fraud detection rules must be re-seeded
-- =============================================================================
