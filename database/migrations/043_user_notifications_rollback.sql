-- =============================================================================
-- ROLLBACK MIGRATION: 043_user_notifications.sql
-- Purpose: Remove user notifications inbox system
-- WARNING: This will permanently delete ALL user notification history
-- Reference: PSD-12 Art. 52 - Notification requirements, PSD-3 Art. 74 - Communication
-- =============================================================================

-- Drop trigger first (depends on function from 001_initial_schema.sql, but that stays)
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_notifications_user_unread CASCADE;
DROP INDEX IF EXISTS idx_notifications_user_created_at CASCADE;

-- Drop table (will cascade delete all notification records)
DROP TABLE IF EXISTS notifications CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All user notification history will be permanently deleted
-- - In-app notification inbox will be emptied
-- - Audit trail for customer communications (KYC, payments, POL) will be lost
-- 
-- COMPLIANCE NOTE:
-- - Ensure notification requirements are met through alternative channels
-- - May impact PSD-12 Art. 52 compliance (strong customer authentication notifications)
-- 
-- TO RESTORE: Re-run forward migration 043_user_notifications.sql
-- =============================================================================
