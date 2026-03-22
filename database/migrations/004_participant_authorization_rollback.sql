-- =============================================================================
-- ROLLBACK MIGRATION: 004_participant_authorization.sql
-- Purpose: Remove PSD-6 clearing & settlement participant authorization
-- WARNING: Will delete NPS participant status tracking
-- Reference: PSD-6 Clearing & settlement, BoN/NAMFISA authorization
-- =============================================================================

-- Drop table
DROP TABLE IF EXISTS nps_participant_status CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All NPS participant authorization records will be deleted
-- - SmartPay authorization status will be lost
-- - Authorized services tracking will be removed
-- - BoN and NAMFISA reference data will be deleted
-- 
-- COMPLIANCE WARNING:
-- - NPS participant authorization tracking will be DISABLED
-- - May violate PSD-6 clearing & settlement requirements
-- - BoN regulatory reporting will be impacted
-- 
-- TO RESTORE: Re-run forward migration 004_participant_authorization.sql
-- NOTE: Will recreate SmartPay as 'pending' - manual re-authorization may be needed
-- =============================================================================
