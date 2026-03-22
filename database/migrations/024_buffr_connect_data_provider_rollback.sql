-- =============================================================================
-- ROLLBACK MIGRATION: 024_buffr_connect_data_provider.sql
-- Purpose: Remove Buffr Connect as OBS data provider
-- WARNING: Will disable Buffr Connect integration
-- Reference: Buffr Connect OBS integration
-- =============================================================================

-- Delete Buffr Connect provider
DELETE FROM data_providers WHERE provider_code = 'BUFFR';

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - Buffr Connect data provider configuration will be deleted
-- - OIDC and AIS endpoint configurations will be lost
-- 
-- IMPACT:
-- - SmartPay cannot connect to Buffr Connect for bank account access
-- - Open banking integration via Buffr Connect will fail
-- - Users with existing Buffr Connect consents may lose access
-- 
-- NOTE: This rollback only removes seeded data, not the data_providers table
-- 
-- TO RESTORE: Re-run forward migration 024_buffr_connect_data_provider.sql
-- =============================================================================
