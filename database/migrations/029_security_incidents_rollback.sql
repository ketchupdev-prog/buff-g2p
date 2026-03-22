-- =============================================================================
-- ROLLBACK MIGRATION: 029_security_incidents.sql
-- Purpose: Remove PSD-12 §2.3 security incident tracking system
-- WARNING: Will delete ALL security incident records
-- Reference: PSD-12 §2.3 - Security incident response
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_calculate_incident_response_times ON security_incidents CASCADE;
DROP TRIGGER IF EXISTS update_security_incidents_updated_at ON security_incidents CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS calculate_incident_response_times() CASCADE;

-- Drop views
DROP VIEW IF EXISTS vw_incident_response_metrics CASCADE;
DROP VIEW IF EXISTS vw_critical_incidents CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_incident_actions_type CASCADE;
DROP INDEX IF EXISTS idx_incident_actions_incident CASCADE;
DROP INDEX IF EXISTS idx_security_incidents_open CASCADE;
DROP INDEX IF EXISTS idx_security_incidents_bon_pending CASCADE;
DROP INDEX IF EXISTS idx_security_incidents_status CASCADE;
DROP INDEX IF EXISTS idx_security_incidents_type_date CASCADE;
DROP INDEX IF EXISTS idx_security_incidents_severity_status CASCADE;

-- Drop tables
DROP TABLE IF EXISTS incident_response_actions CASCADE;
DROP TABLE IF EXISTS security_incidents CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL security incident records will be permanently deleted
-- - Incident response timelines will be lost
-- - BoN notification history will be removed
-- - Law enforcement case references will be deleted
-- - Evidence tracking data will be lost
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-12 §2.3 incident response requirements
-- - Cannot demonstrate security incident management
-- - BoN notification obligations cannot be tracked
-- - Incident response time KRIs unavailable
-- 
-- TO RESTORE: Re-run forward migration 029_security_incidents.sql
-- =============================================================================
