-- =============================================================================
-- ROLLBACK MIGRATION: 009_content_views.sql
-- Purpose: Remove knowledge base content views tracking system
-- WARNING: Will delete all educational content analytics
-- Reference: PRD §4.6.3 - Educational Content System
-- =============================================================================

-- Drop views first
DROP VIEW IF EXISTS user_learning_progress CASCADE;
DROP VIEW IF EXISTS content_popularity CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_content_views_user_content CASCADE;
DROP INDEX IF EXISTS idx_content_views_action CASCADE;
DROP INDEX IF EXISTS idx_content_views_viewed_at CASCADE;
DROP INDEX IF EXISTS idx_content_views_content_id CASCADE;
DROP INDEX IF EXISTS idx_content_views_user_id CASCADE;

-- Drop table
DROP TABLE IF EXISTS content_views CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All content view tracking data will be permanently deleted
-- - User learning progress history will be lost
-- - Content popularity analytics will be removed
-- - Session-based interaction tracking will be deleted
-- 
-- IMPACT:
-- - Educational content personalization will be disabled
-- - Content recommendation engine will not function
-- - Learning analytics dashboard will fail
-- - User engagement metrics will be unavailable
-- 
-- TO RESTORE: Re-run forward migration 009_content_views.sql
-- =============================================================================
