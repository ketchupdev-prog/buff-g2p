-- Migration 011: Push Notification Tokens
-- Adds table for managing Expo push notification tokens per user.
-- Run after 010_group_shared_wallets.sql

-- Push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL, -- 'ios' or 'android'
  device_info JSONB, -- { brand, model, osVersion, appVersion }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, token) -- User can have multiple devices
);

-- Notification preferences table (optional per-notification-type preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'voucher', 'transaction', 'security', 'proof_of_life', 'group', 'loan', 'system'
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category)
);

-- Create indexes
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active);
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Trigger to update push_tokens updated_at
CREATE OR REPLACE FUNCTION update_push_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_push_token_timestamp ON push_tokens;
CREATE TRIGGER trigger_update_push_token_timestamp
BEFORE UPDATE ON push_tokens
FOR EACH ROW
EXECUTE FUNCTION update_push_token_timestamp();

-- Comments for documentation
COMMENT ON TABLE push_tokens IS 'Expo push notification tokens for mobile devices';
COMMENT ON TABLE notification_preferences IS 'Per-category notification preferences for users';
COMMENT ON COLUMN push_tokens.token IS 'Expo push token (format: ExponentPushToken[...])';
COMMENT ON COLUMN push_tokens.device_info IS 'Device metadata for debugging and analytics';
