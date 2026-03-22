-- Migration 016: Bank Account Linking
-- Support for linking external bank accounts to user profiles

CREATE TABLE IF NOT EXISTS linked_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(200),
  account_type VARCHAR(30), -- 'savings', 'checking', 'current'
  branch_code VARCHAR(20),
  currency VARCHAR(3) DEFAULT 'NAD',
  is_verified BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bank_name, account_number)
);

CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_user ON linked_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_verified ON linked_bank_accounts(is_verified);
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_primary ON linked_bank_accounts(is_primary);

COMMENT ON TABLE linked_bank_accounts IS 'User-linked external bank accounts for withdrawals/deposits';

-- Bank account verification attempts (for security)
CREATE TABLE IF NOT EXISTS bank_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_account_id UUID NOT NULL REFERENCES linked_bank_accounts(id) ON DELETE CASCADE,
  verification_method VARCHAR(30), -- 'micro_deposit', 'instant_verification', 'manual'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed'
  attempts_count INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_bank_verification_account ON bank_verification_attempts(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_verification_status ON bank_verification_attempts(status);

COMMENT ON TABLE bank_verification_attempts IS 'Bank account verification attempts for security tracking';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_linked_bank_accounts_updated_at ON linked_bank_accounts;
CREATE TRIGGER update_linked_bank_accounts_updated_at BEFORE UPDATE ON linked_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
