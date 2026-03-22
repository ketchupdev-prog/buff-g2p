-- =============================================================================
-- ROLLBACK MIGRATION: 016_groups.sql
-- Purpose: Remove complete group management system
-- WARNING: Will delete ALL group data including savings circles and split bills
-- Reference: PRD group management features
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS maintain_group_member_count ON group_members CASCADE;
DROP TRIGGER IF EXISTS update_split_shares_updated_at ON split_shares CASCADE;
DROP TRIGGER IF EXISTS update_split_requests_updated_at ON split_requests CASCADE;
DROP TRIGGER IF EXISTS update_group_members_updated_at ON group_members CASCADE;
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_group_member_count() CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS group_transactions CASCADE;
DROP TABLE IF EXISTS split_shares CASCADE;
DROP TABLE IF EXISTS split_requests CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All savings circles and group data will be permanently deleted
-- - All split bill requests and shares will be lost
-- - Group transaction history will be removed
-- - Group membership records will be deleted
-- 
-- IMPACT:
-- - Savings circles feature will be completely disabled
-- - Bill splitting feature will not function
-- - Group wallet management will fail
-- - All user group relationships will be lost
-- 
-- TO RESTORE: Re-run forward migration 016_groups.sql
-- =============================================================================
