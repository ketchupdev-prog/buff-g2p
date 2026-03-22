-- =============================================================================
-- ROLLBACK MIGRATION: 025_wallet_customization.sql
-- Purpose: Remove wallet customization features
-- WARNING: Will delete wallet names, types, icons, and themes
-- Reference: Agentic Copilot wallet management features
-- =============================================================================

-- Drop check constraints
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallet_color CASCADE;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallet_status CASCADE;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallet_type CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_wallets_type CASCADE;
DROP INDEX IF EXISTS idx_wallets_user_status CASCADE;

-- Remove customization columns
ALTER TABLE wallets DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE wallets DROP COLUMN IF EXISTS description CASCADE;
ALTER TABLE wallets DROP COLUMN IF EXISTS color CASCADE;
ALTER TABLE wallets DROP COLUMN IF EXISTS icon CASCADE;
ALTER TABLE wallets DROP COLUMN IF EXISTS wallet_type CASCADE;
ALTER TABLE wallets DROP COLUMN IF EXISTS name CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All custom wallet names will be permanently deleted
-- - Wallet type categorizations will be lost
-- - Custom icons and color themes will be removed
-- - Wallet descriptions will be deleted
-- 
-- IMPACT:
-- - Wallet personalization features will be disabled
-- - Agentic Copilot wallet management features will not work
-- - Users will lose custom wallet organization
-- 
-- NOTE: Original frozen column remains (used by older migrations)
-- 
-- TO RESTORE: Re-run forward migration 025_wallet_customization.sql
-- =============================================================================
