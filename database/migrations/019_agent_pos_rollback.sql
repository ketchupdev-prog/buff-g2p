-- =============================================================================
-- ROLLBACK MIGRATION: 019_agent_pos.sql
-- Purpose: Remove NamPost RFP agent/kiosk POS integration
-- WARNING: Will delete all agent location data
-- Reference: NamPost RFP requirements
-- =============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_agent_type CASCADE;
DROP INDEX IF EXISTS idx_agent_location_geo CASCADE;

-- Drop table
DROP TABLE IF EXISTS agent_locations CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All agent location data will be permanently deleted
-- - NamPost kiosk locations will be lost
-- - ATM and retail agent network data will be removed
-- - POS terminal configurations will be deleted
-- 
-- IMPACT:
-- - Agent finder feature will fail
-- - Cashout location services will be disabled
-- - Voucher redemption at agents will not work
-- - NamPost RFP integration will break
-- - NAMQR agent support will be removed
-- 
-- TO RESTORE: Re-run forward migration 019_agent_pos.sql
-- NOTE: Agent location data must be re-seeded or re-imported
-- =============================================================================
