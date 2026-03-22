-- =============================================================================
-- ROLLBACK MIGRATION: 020_users_kyc.sql
-- Purpose: Remove FIA/CDD-aligned users, wallets, and KYC system
-- WARNING: This will DESTROY the updated user and wallet schema
-- Reference: FIA/CDD compliance, Financial Intelligence Act
-- =============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_kyc_submissions_status CASCADE;
DROP INDEX IF EXISTS idx_kyc_submissions_user CASCADE;
DROP INDEX IF EXISTS idx_wallets_user CASCADE;
DROP INDEX IF EXISTS idx_users_kyc_tier CASCADE;
DROP INDEX IF EXISTS idx_users_phone CASCADE;

-- Drop tables (KYC first due to FK dependency)
DROP TABLE IF EXISTS kyc_submissions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL user accounts will be permanently deleted
-- - ALL wallet balances will be lost
-- - ALL KYC/CDD submissions will be removed
-- - National ID and identity verification data will be deleted
-- 
-- CATASTROPHIC WARNING:
-- - This rollback assumes the old 001_initial_schema users/wallets tables exist
-- - If 001_initial_schema was not applied, database will have NO users/wallets tables
-- - All user data, balances, and KYC records will be PERMANENTLY LOST
-- 
-- COMPLIANCE IMPACT:
-- - FIA record-keeping requirements will be violated
-- - CDD audit trail will be incomplete
-- - Proof of life tracking will be disabled
-- 
-- BEFORE ROLLBACK:
-- 1. Export all user and wallet data for backup
-- 2. Verify 001_initial_schema tables are in place
-- 3. Ensure regulatory approval for data deletion
-- 
-- TO RESTORE: Re-run forward migration 020_users_kyc.sql
-- =============================================================================
