-- =============================================================================
-- ROLLBACK MIGRATION: 015_seed_obs_providers.sql
-- Purpose: Remove seeded OBS mock data providers (FNB, Bank Windhoek)
-- WARNING: Will delete mock provider configurations
-- Reference: OBS testing data
-- =============================================================================

-- Delete seeded mock providers
DELETE FROM data_providers WHERE provider_code IN ('FNB', 'BWK');

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - FNB Namibia mock provider configuration will be deleted
-- - Bank Windhoek mock provider configuration will be deleted
-- 
-- IMPACT:
-- - OBS testing with FNB and Bank Windhoek will fail
-- - Mock endpoints will be unavailable
-- - Development/staging environments may break
-- 
-- NOTE: This rollback only removes seeded data, not the data_providers table
-- 
-- TO RESTORE: Re-run forward migration 015_seed_obs_providers.sql
-- =============================================================================
