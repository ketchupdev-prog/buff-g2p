-- =============================================================================
-- ROLLBACK MIGRATION: 018_invite_deep_link.sql
-- Purpose: Remove invite deep link tracking and analytics
-- WARNING: Will delete all invite click tracking and conversion data
-- Reference: PRD referral analytics
-- =============================================================================

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_update_invite_stats ON invite_clicks CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_invite_stats() CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_invite_stats_conversion CASCADE;
DROP INDEX IF EXISTS idx_invite_stats_registrations CASCADE;
DROP INDEX IF EXISTS idx_invite_stats_code CASCADE;
DROP INDEX IF EXISTS idx_invite_clicks_clicked_at CASCADE;
DROP INDEX IF EXISTS idx_invite_clicks_ip CASCADE;
DROP INDEX IF EXISTS idx_invite_clicks_registered_user CASCADE;
DROP INDEX IF EXISTS idx_invite_clicks_registered CASCADE;
DROP INDEX IF EXISTS idx_invite_clicks_inviter CASCADE;
DROP INDEX IF EXISTS idx_invite_clicks_code CASCADE;

-- Drop tables
DROP TABLE IF EXISTS invite_stats CASCADE;
DROP TABLE IF EXISTS invite_clicks CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All invite click tracking data will be permanently deleted
-- - Invite conversion statistics will be lost
-- - IP address and device tracking will be removed
-- - Referral analytics dashboard data will be deleted
-- 
-- IMPACT:
-- - Invite analytics and reporting will be disabled
-- - Cannot track referral campaign performance
-- - Fraud prevention for duplicate invite abuse will be disabled
-- 
-- TO RESTORE: Re-run forward migration 018_invite_deep_link.sql
-- =============================================================================
