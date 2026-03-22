-- =============================================================================
-- ROLLBACK MIGRATION: 012_eta_attribution.sql
-- Purpose: Remove ETA 2019 §32 attribution columns from copilot_audit_log
-- WARNING: Will delete device fingerprints and attribution metadata
-- Reference: ETA 2019 §32 - Attribution of data messages
-- =============================================================================

-- Remove ETA attribution columns
ALTER TABLE copilot_audit_log DROP COLUMN IF EXISTS integrity_hash CASCADE;
ALTER TABLE copilot_audit_log DROP COLUMN IF EXISTS is_automated CASCADE;
ALTER TABLE copilot_audit_log DROP COLUMN IF EXISTS actor_type CASCADE;
ALTER TABLE copilot_audit_log DROP COLUMN IF EXISTS session_id CASCADE;
ALTER TABLE copilot_audit_log DROP COLUMN IF EXISTS device_fingerprint CASCADE;
ALTER TABLE copilot_audit_log DROP COLUMN IF EXISTS ip_address CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All device fingerprint data will be permanently deleted
-- - IP address tracking will be removed
-- - Session correlation data will be lost
-- - Actor type classification will be deleted
-- - Integrity hash verification data will be removed
-- 
-- COMPLIANCE WARNING:
-- - May violate ETA 2019 §32 attribution requirements
-- - Cannot verify origin of data messages
-- - Audit trail for electronic transfers will be incomplete
-- 
-- TO RESTORE: Re-run forward migration 012_eta_attribution.sql
-- =============================================================================
