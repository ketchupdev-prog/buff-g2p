-- Migration 003: Add user profile fields and PIN column
-- Fixes: missing columns in production database

-- Add pin_hash to users if not exists (for change PIN feature)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);

-- Ensure profile columns exist (in case production DB is out of sync)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Fix notifications table - use IF NOT EXISTS for table creation since 001 already has it
-- Add missing columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add index if not exists
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
