-- =============================================================================
-- ROLLBACK MIGRATION: 021_transactions.sql
-- Purpose: Remove transactions table
-- WARNING: Will delete ALL transaction history
-- Reference: Core transaction system
-- =============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_transactions_created_at CASCADE;
DROP INDEX IF EXISTS idx_transactions_destination_user CASCADE;
DROP INDEX IF EXISTS idx_transactions_source_user CASCADE;

-- Drop table
DROP TABLE IF EXISTS transactions CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL transaction history will be permanently deleted
-- - P2P transfers, cash-outs, voucher redemptions will be lost
-- - Financial audit trail will be removed
-- 
-- CATASTROPHIC WARNING:
-- - This is a CORE table - removing it will BREAK the entire payment system
-- - All features depending on transaction tracking will fail
-- - Group contributions, splits, loans will lose transaction references
-- 
-- TO RESTORE: Re-run forward migration 021_transactions.sql
-- =============================================================================
