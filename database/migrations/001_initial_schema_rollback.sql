-- =============================================================================
-- ROLLBACK MIGRATION: 001_initial_schema.sql
-- Purpose: Remove entire SmartPay initial database schema
-- WARNING: This will DESTROY the entire database - ALL DATA WILL BE LOST
-- Reference: Core database foundation - Buffr G2P patterns
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_group_wallets_updated_at ON group_wallets CASCADE;
DROP TRIGGER IF EXISTS update_loans_updated_at ON loans CASCADE;
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets CASCADE;
DROP TRIGGER IF EXISTS update_users_updated_at ON users CASCADE;

-- Drop trigger function (used by multiple tables)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS group_contributions CASCADE;
DROP TABLE IF EXISTS group_wallets CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS otp_codes CASCADE;
DROP TABLE IF EXISTS cash_out_codes CASCADE;
DROP TABLE IF EXISTS p2p_transactions CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS voucher_redemptions CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop extensions
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- CATASTROPHIC DATA LOSS WARNING:
-- - ALL user accounts will be permanently deleted
-- - ALL wallet balances and transaction history will be lost
-- - ALL vouchers and redemptions will be removed
-- - ALL loans and P2P transactions will be deleted
-- - ALL audit logs and analytics will be erased
-- 
-- THIS IS A DESTRUCTIVE OPERATION - ONLY USE FOR:
-- - Complete database reset in development
-- - Disaster recovery scenarios
-- - Fresh installation requirements
-- 
-- NEVER RUN IN PRODUCTION WITHOUT FULL DATABASE BACKUP
-- 
-- TO RESTORE: Re-run forward migration 001_initial_schema.sql
-- =============================================================================
