-- =============================================================================
-- ROLLBACK MIGRATION: 035_tpp_registrations.sql
-- Purpose: Remove OBS v1.0 §6.2 TPP registration tracking
-- WARNING: Will delete all Third-Party Provider registrations
-- Reference: OBS v1.0 §6.2 - TPP authorization
-- =============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS update_tpp_registrations_updated_at ON tpp_registrations CASCADE;

-- Drop view
DROP VIEW IF EXISTS vw_tpp_activity_summary CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_tpp_expiry CASCADE;
DROP INDEX IF EXISTS idx_tpp_type CASCADE;
DROP INDEX IF EXISTS idx_tpp_status CASCADE;

-- Drop table
DROP TABLE IF EXISTS tpp_registrations CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All TPP registration records will be permanently deleted
-- - BoN authorization tracking will be lost
-- - TPP activity metrics will be removed
-- 
-- COMPLIANCE WARNING:
-- - May violate OBS v1.0 §6.2 TPP authorization tracking requirements
-- - Cannot verify TPP authorizations
-- - BoN compliance audit trail incomplete
-- 
-- TO RESTORE: Re-run forward migration 035_tpp_registrations.sql
-- =============================================================================
