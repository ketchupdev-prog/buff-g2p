-- =============================================================================
-- ROLLBACK MIGRATION: 014_obs_disputes.sql
-- Purpose: Remove OBS 2025 §10.3 dispute resolution system
-- WARNING: Will delete all open banking dispute records
-- Reference: OBS 2025 §10.3 - Dispute resolution
-- =============================================================================

DROP TABLE IF EXISTS obs_disputes CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All open banking dispute records will be permanently deleted
-- - Dispute resolution history will be lost
-- - Data provider notification records will be removed
-- - Scheme manager escalation data will be deleted
-- 
-- COMPLIANCE WARNING:
-- - May violate OBS 2025 §10.3 dispute resolution requirements
-- - Customer complaint audit trail will be incomplete
-- 
-- TO RESTORE: Re-run forward migration 014_obs_disputes.sql
-- =============================================================================
