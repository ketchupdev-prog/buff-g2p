-- Bank Transfers Table
-- Tracks all bank transfer cash-out operations
-- Migration 018
-- Created: 2026-03-04

CREATE TABLE IF NOT EXISTS bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES linked_bank_accounts(id) ON DELETE RESTRICT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  reference VARCHAR(100) NOT NULL,
  failure_reason TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bank_transfers_user_id ON bank_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_wallet_id ON bank_transfers(wallet_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_status ON bank_transfers(status);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_created_at ON bank_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_reference ON bank_transfers(reference);

-- Comments
COMMENT ON TABLE bank_transfers IS 'Tracks all bank transfer cash-out operations from Buffr wallets to external bank accounts';
COMMENT ON COLUMN bank_transfers.status IS 'Transfer status: pending (initiated), processing (in progress), completed (successful), failed (rejected), cancelled (user cancelled)';
COMMENT ON COLUMN bank_transfers.reference IS 'Unique transaction reference for tracking and reconciliation';
