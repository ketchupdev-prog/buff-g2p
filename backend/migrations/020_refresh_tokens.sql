-- Migration 020: Refresh Tokens for JWT Token Rotation
-- Implements KNOWN_LIMITATIONS.md L3 - JWT Verification Enhancement
-- Adds support for secure refresh token storage and rotation
-- Run after 019_merchants.sql

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = false;

-- Comments for documentation
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for token rotation and enhanced security';
COMMENT ON COLUMN refresh_tokens.token IS 'Signed JWT refresh token (HMAC-SHA256)';
COMMENT ON COLUMN refresh_tokens.revoked IS 'Token revoked on refresh or logout';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Token expiration timestamp (typically 7 days)';
