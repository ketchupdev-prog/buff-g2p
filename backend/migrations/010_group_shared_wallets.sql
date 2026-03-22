-- Migration 010: Group Shared Wallets and Contributions
-- Adds tables for group shared wallets, member contributions, and transaction tracking.
-- Run after 009_offline_codes_registry.sql

-- Group wallets table
CREATE TABLE IF NOT EXISTS group_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'NAD',
  type VARCHAR(20) DEFAULT 'shared', -- 'shared' or 'pooled'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id) -- One wallet per group
);

-- Group contributions table (tracks individual member contributions)
CREATE TABLE IF NOT EXISTS group_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  method VARCHAR(20) DEFAULT 'wallet', -- 'wallet' or 'voucher'
  transaction_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group transactions table (all group financial activity)
CREATE TABLE IF NOT EXISTS group_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'contribution', 'withdrawal', 'send', 'receive'
  amount DECIMAL(15, 2) NOT NULL,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Loan repayments table (tracks all loan payment transactions)
CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  method VARCHAR(30) NOT NULL, -- 'voucher_redemption', 'wallet', 'cash_till', 'manual'
  metadata JSONB, -- Extra info like tillCode, voucherId
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_group_contributions_group ON group_contributions(group_id);
CREATE INDEX idx_group_contributions_user ON group_contributions(user_id);
CREATE INDEX idx_group_contributions_created ON group_contributions(created_at);

CREATE INDEX idx_group_transactions_group ON group_transactions(group_id);
CREATE INDEX idx_group_transactions_type ON group_transactions(type);
CREATE INDEX idx_group_transactions_status ON group_transactions(status);
CREATE INDEX idx_group_transactions_created ON group_transactions(created_at);

CREATE INDEX idx_loan_repayments_loan ON loan_repayments(loan_id);
CREATE INDEX idx_loan_repayments_method ON loan_repayments(method);
CREATE INDEX idx_loan_repayments_created ON loan_repayments(created_at);

-- Trigger to update group_wallets updated_at
CREATE OR REPLACE FUNCTION update_group_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_group_wallet_timestamp ON group_wallets;
CREATE TRIGGER trigger_update_group_wallet_timestamp
BEFORE UPDATE ON group_wallets
FOR EACH ROW
EXECUTE FUNCTION update_group_wallet_timestamp();

-- Comments for documentation
COMMENT ON TABLE group_wallets IS 'Shared wallets for group pooling and savings';
COMMENT ON TABLE group_contributions IS 'Individual member contributions to group wallet';
COMMENT ON TABLE group_transactions IS 'All financial activity within groups';
COMMENT ON TABLE loan_repayments IS 'Loan repayment transaction history with auto-deduction support';
