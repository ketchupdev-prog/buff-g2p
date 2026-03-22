-- =============================================================================
-- ROLLBACK MIGRATION: 017_invite_codes.sql
-- Purpose: Remove user invite code system
-- WARNING: Will delete all invite codes and referral relationships
-- Reference: PRD referral program
-- =============================================================================

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_auto_generate_invite_code ON users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS auto_generate_invite_code() CASCADE;
DROP FUNCTION IF EXISTS generate_invite_code() CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_invited_by CASCADE;
DROP INDEX IF EXISTS idx_users_invite_code CASCADE;

-- Remove columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS invited_by CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS invite_code CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All user invite codes will be permanently deleted
-- - Referral relationships will be lost
-- - Invite code deep links will stop working
-- 
-- IMPACT:
-- - User referral program will be disabled
-- - Deep link invite flows will break
-- - Referral attribution will be lost
-- 
-- TO RESTORE: Re-run forward migration 017_invite_codes.sql
-- NOTE: New invite codes will be generated; old codes cannot be recovered
-- =============================================================================
