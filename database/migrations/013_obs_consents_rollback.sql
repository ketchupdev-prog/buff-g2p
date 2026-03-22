-- =============================================================================
-- ROLLBACK MIGRATION: 013_obs_consents.sql
-- Purpose: Remove OBS 2025 §5.3 PAR/PKCE consent management system
-- WARNING: Will delete all open banking consent data
-- Reference: OBS 2025 §5.3 - Consent management
-- =============================================================================

-- Drop audit log table first (depends on obs_consents)
DROP TABLE IF EXISTS obs_consent_audit_log CASCADE;

-- Drop consents table (depends on data_providers)
DROP TABLE IF EXISTS obs_consents CASCADE;

-- Drop data providers table
DROP TABLE IF EXISTS data_providers CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All open banking consent records will be permanently deleted
-- - Active user-bank connections will be severed
-- - Consent audit trail will be lost
-- - Data provider configurations will be removed
-- - OAuth 2.0 PKCE verifiers and tokens will be deleted
-- 
-- BREAKING CHANGES WARNING:
-- - All open banking features will FAIL
-- - Account aggregation will be disabled
-- - Payment initiation services will not work
-- - May violate OBS 2025 §5.3 consent management requirements
-- 
-- IMPACT ON USERS:
-- - Users will need to re-consent to all bank connections
-- - Historical consent revocation records will be lost
-- 
-- TO RESTORE: Re-run forward migration 013_obs_consents.sql
-- NOTE: Data provider configurations must be re-seeded
-- =============================================================================
