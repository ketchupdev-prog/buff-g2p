-- =============================================================================
-- ROLLBACK MIGRATION: 010_interchange_surcharge.sql
-- Purpose: Remove PSD-11 ATM surcharge logging system
-- WARNING: Will delete all ATM surcharge tracking data
-- Reference: PSD-11 ATM surcharge transparency
-- =============================================================================

-- Drop view first
DROP VIEW IF EXISTS vw_atm_surcharge_monthly CASCADE;

-- Drop table
DROP TABLE IF EXISTS atm_surcharge_log CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All ATM surcharge transaction logs will be permanently deleted
-- - ATM owner BIN tracking will be removed
-- - Own-bank vs interbank transaction differentiation will be lost
-- - Monthly surcharge analytics will be unavailable
-- 
-- COMPLIANCE IMPACT:
-- - May violate PSD-11 ATM surcharge transparency requirements
-- - Customer surcharge refund claims cannot be verified
-- - Interbank ATM fee reconciliation will fail
-- 
-- TO RESTORE: Re-run forward migration 010_interchange_surcharge.sql
-- =============================================================================
