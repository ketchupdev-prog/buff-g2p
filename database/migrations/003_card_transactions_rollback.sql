-- =============================================================================
-- ROLLBACK MIGRATION: 003_card_transactions.sql
-- Purpose: Remove PSD-4 card transaction standards table
-- WARNING: Will delete all card transaction history
-- Reference: PSD-4 Card payment standards
-- =============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_card_txn_status CASCADE;
DROP INDEX IF EXISTS idx_card_txn_user CASCADE;

-- Drop table
DROP TABLE IF EXISTS card_transactions CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All card transaction history will be permanently deleted
-- - POS, ATM, online, contactless, and QR payment records will be lost
-- - Authorization codes and RRNs will be removed
-- - BOP codes and NAMQR token references will be deleted
-- 
-- IMPACT:
-- - Card payment tracking will be disabled
-- - Transaction reconciliation will not be possible
-- - May impact PSD-4 compliance (card transaction reporting)
-- 
-- TO RESTORE: Re-run forward migration 003_card_transactions.sql
-- =============================================================================
