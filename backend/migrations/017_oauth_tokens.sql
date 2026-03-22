-- Migration 017: OAuth Token Storage for Open Banking
-- Stores access/refresh tokens from bank OAuth flows

CREATE TABLE IF NOT EXISTS oauth_bank_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_id VARCHAR(50) NOT NULL, -- 'bank-windhoek', 'standard-bank', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(20) DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consent_id VARCHAR(100),
  account_ids JSONB, -- Array of linked account IDs from this consent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bank_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_bank_tokens_user ON oauth_bank_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_bank_tokens_bank ON oauth_bank_tokens(bank_id);
CREATE INDEX IF NOT EXISTS idx_oauth_bank_tokens_expires ON oauth_bank_tokens(expires_at);

COMMENT ON TABLE oauth_bank_tokens IS 'OAuth tokens for Open Banking bank connections';

-- Open Banking linked accounts (from OAuth)
CREATE TABLE IF NOT EXISTS open_banking_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_id VARCHAR(50) NOT NULL,
  account_id VARCHAR(100) NOT NULL, -- Bank's account identifier
  account_name VARCHAR(200),
  account_type VARCHAR(50), -- 'current', 'savings', 'credit'
  currency VARCHAR(3) DEFAULT 'NAD',
  sort_code VARCHAR(20),
  account_number_masked VARCHAR(50), -- Last 4 digits visible
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bank_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_open_banking_accounts_user ON open_banking_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_open_banking_accounts_bank ON open_banking_accounts(bank_id);
CREATE INDEX IF NOT EXISTS idx_open_banking_accounts_active ON open_banking_accounts(is_active);

COMMENT ON TABLE open_banking_accounts IS 'Bank accounts linked via Open Banking OAuth';

-- OAuth state tracking (CSRF protection)
CREATE TABLE IF NOT EXISTS oauth_states (
  state VARCHAR(100) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bank_id VARCHAR(50) NOT NULL,
  redirect_uri TEXT,
  code_verifier TEXT, -- For PKCE
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

COMMENT ON TABLE oauth_states IS 'OAuth state parameter tracking for CSRF protection';

-- Create triggers
DROP TRIGGER IF EXISTS update_oauth_bank_tokens_updated_at ON oauth_bank_tokens;
CREATE TRIGGER update_oauth_bank_tokens_updated_at BEFORE UPDATE ON oauth_bank_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_open_banking_accounts_updated_at ON open_banking_accounts;
CREATE TRIGGER update_open_banking_accounts_updated_at BEFORE UPDATE ON open_banking_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup expired states (can be run periodically)
-- DELETE FROM oauth_states WHERE expires_at < NOW();
