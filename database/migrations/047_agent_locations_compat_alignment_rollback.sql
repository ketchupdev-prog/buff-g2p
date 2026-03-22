-- =============================================================================
-- ROLLBACK MIGRATION: 047_agent_locations_compat_alignment.sql
-- Purpose: Remove PostGIS spatial columns and agent location v1 API compatibility
-- WARNING: This will delete geographic location data and break /api/v1/agents route
-- Reference: PSD-12 Art. 53 - Access to payment account
-- =============================================================================

-- Drop GIN and GIST spatial indexes
DROP INDEX IF EXISTS idx_agent_locations_location_gist CASCADE;
DROP INDEX IF EXISTS idx_agent_locations_services_gin CASCADE;
DROP INDEX IF EXISTS idx_agent_locations_type_active CASCADE;

-- Remove v1 API compatibility columns
ALTER TABLE agent_locations DROP COLUMN IF EXISTS location CASCADE;
ALTER TABLE agent_locations DROP COLUMN IF EXISTS total_reviews CASCADE;
ALTER TABLE agent_locations DROP COLUMN IF EXISTS rating CASCADE;
ALTER TABLE agent_locations DROP COLUMN IF EXISTS contact_phone CASCADE;
ALTER TABLE agent_locations DROP COLUMN IF EXISTS services CASCADE;
ALTER TABLE agent_locations DROP COLUMN IF EXISTS city CASCADE;
ALTER TABLE agent_locations DROP COLUMN IF EXISTS type CASCADE;
ALTER TABLE agent_locations DROP COLUMN IF EXISTS name CASCADE;

-- Note: PostGIS extension is NOT dropped (may be used by other tables)
-- To manually remove: DROP EXTENSION IF EXISTS postgis CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - Geographic point data (latitude/longitude as GEOGRAPHY) will be deleted
-- - Agent ratings and review counts will be lost
-- - Service type arrays will be removed
-- - Location names and contact information will be deleted
-- 
-- BREAKING CHANGES WARNING:
-- - GET /api/v1/agents route will FAIL (missing columns)
-- - Spatial queries (nearby agents) will not work
-- - Mobile app agent finder feature will break
-- 
-- DATA PRESERVED (legacy columns remain):
-- - agent_name, agent_type (legacy columns)
-- - latitude, longitude (as numeric, not GEOGRAPHY)
-- - supports_* boolean flags
-- 
-- TO RESTORE: Re-run forward migration 047_agent_locations_compat_alignment.sql
-- WARNING: Previously migrated data transformations will need to be re-executed
-- =============================================================================
