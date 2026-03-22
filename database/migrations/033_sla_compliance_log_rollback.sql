-- =============================================================================
-- ROLLBACK MIGRATION: 033_sla_compliance_log.sql
-- Purpose: Remove PSD-7 §3.2 SLA breach tracking system
-- WARNING: Will delete all SLA compliance logs
-- Reference: PSD-7 §3.2 - SLA compliance monitoring
-- =============================================================================

-- Drop view
DROP VIEW IF EXISTS vw_sla_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_sla_log_severity CASCADE;
DROP INDEX IF EXISTS idx_sla_log_breaches CASCADE;
DROP INDEX IF EXISTS idx_sla_log_type_date CASCADE;

-- Drop table
DROP TABLE IF EXISTS sla_compliance_log CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All SLA compliance records will be permanently deleted
-- - SLA breach history will be lost
-- - Remediation tracking will be removed
-- 
-- COMPLIANCE WARNING:
-- - May violate PSD-7 §3.2 SLA monitoring requirements
-- - Cannot track or report SLA breaches to BoN
-- 
-- TO RESTORE: Re-run forward migration 033_sla_compliance_log.sql
-- =============================================================================
