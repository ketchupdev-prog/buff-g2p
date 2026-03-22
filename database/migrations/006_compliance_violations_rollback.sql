-- =============================================================================
-- ROLLBACK MIGRATION: 006_compliance_violations.sql
-- Purpose: Remove PSD-8 administrative penalty monitoring
-- WARNING: Will delete all compliance violation records
-- Reference: PSD-8 Administrative penalties, BoN reporting
-- =============================================================================

DROP TABLE IF EXISTS compliance_violations CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All compliance violation records will be permanently deleted
-- - Penalty tracking history will be lost
-- - BoN reporting data will be removed
-- - Remediation action records will be deleted
-- 
-- COMPLIANCE WARNING:
-- - Violation monitoring will be DISABLED
-- - May violate PSD-8 administrative penalty requirements
-- - BoN regulatory audit trail will be incomplete
-- 
-- TO RESTORE: Re-run forward migration 006_compliance_violations.sql
-- =============================================================================
