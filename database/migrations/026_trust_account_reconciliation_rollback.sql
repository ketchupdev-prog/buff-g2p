-- =============================================================================
-- ROLLBACK MIGRATION: 026_trust_account_reconciliation.sql
-- Purpose: Remove PSD-3 §2.5 trust account backing and reconciliation
-- WARNING: Will delete ALL trust account data and reconciliation records
-- Reference: PSD-3 §2.5 - Trust account compliance
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_trust_recon_updated_at ON trust_account_reconciliations CASCADE;
DROP TRIGGER IF EXISTS update_trust_accounts_updated_at ON trust_accounts CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS calculate_emoney_float(CHAR) CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_trust_tx_related_tx CASCADE;
DROP INDEX IF EXISTS idx_trust_tx_type CASCADE;
DROP INDEX IF EXISTS idx_trust_tx_account_date CASCADE;
DROP INDEX IF EXISTS idx_trust_recon_critical CASCADE;
DROP INDEX IF EXISTS idx_trust_recon_date CASCADE;
DROP INDEX IF EXISTS idx_trust_recon_status CASCADE;
DROP INDEX IF EXISTS idx_trust_recon_account_date CASCADE;
DROP INDEX IF EXISTS idx_trust_accounts_currency CASCADE;
DROP INDEX IF EXISTS idx_trust_accounts_status CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS trust_account_transactions CASCADE;
DROP TABLE IF EXISTS trust_account_reconciliations CASCADE;
DROP TABLE IF EXISTS trust_accounts CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - ALL trust account configurations will be permanently deleted
-- - ALL daily reconciliation records will be lost
-- - ALL trust account transaction history will be removed
-- - E-money float backing audit trail will be destroyed
-- 
-- COMPLIANCE WARNING:
-- - CRITICAL: May violate PSD-3 §2.5 trust account requirements
-- - E-money backing verification will be IMPOSSIBLE
-- - BoN regulatory reporting will fail
-- - Cannot demonstrate e-money is fully backed
-- 
-- TO RESTORE: Re-run forward migration 026_trust_account_reconciliation.sql
-- =============================================================================
