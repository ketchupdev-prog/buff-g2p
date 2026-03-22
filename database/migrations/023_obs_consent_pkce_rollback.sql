-- =============================================================================
-- ROLLBACK MIGRATION: 023_obs_consent_pkce.sql
-- Purpose: Remove PKCE plaintext code verifier storage
-- WARNING: Will break OAuth 2.0 PKCE flows for open banking
-- Reference: OAuth 2.0 PKCE specification
-- =============================================================================

-- Drop index
DROP INDEX IF EXISTS idx_obs_consent_pkce_created_at CASCADE;

-- Drop table
DROP TABLE IF EXISTS obs_consent_pkce CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All pending PKCE code verifiers will be permanently deleted
-- - In-flight consent flows will fail
-- 
-- BREAKING CHANGES:
-- - OAuth 2.0 token exchange will FAIL (missing code_verifier)
-- - Open banking consent flows will be broken
-- - Users mid-consent will need to restart from beginning
-- 
-- SECURITY NOTE:
-- - Only hashed verifiers remain in obs_consents table
-- - Cannot complete token exchange without plaintext verifier
-- 
-- TO RESTORE: Re-run forward migration 023_obs_consent_pkce.sql
-- =============================================================================
