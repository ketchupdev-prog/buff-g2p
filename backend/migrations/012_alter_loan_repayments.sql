-- Migration 012: Alter loan_repayments to support multiple repayment methods
-- Adds method and metadata columns for edge case handling (cash, partial, manual)
-- Run after 010_group_shared_wallets.sql

-- Add method column (default to 'voucher_redemption' for existing rows)
ALTER TABLE loan_repayments 
ADD COLUMN IF NOT EXISTS method VARCHAR(30) DEFAULT 'voucher_redemption';

-- Add metadata column for additional context (tillCode, voucherId, etc.)
ALTER TABLE loan_repayments 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Make voucher_redemption_id nullable (since cash/wallet methods don't have voucher)
ALTER TABLE loan_repayments 
ALTER COLUMN voucher_redemption_id DROP NOT NULL;

-- Create index on method for filtering
CREATE INDEX IF NOT EXISTS idx_loan_repayments_method ON loan_repayments(method);

-- Update existing rows to have proper method
UPDATE loan_repayments 
SET method = 'voucher_redemption' 
WHERE method IS NULL AND voucher_redemption_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN loan_repayments.method IS 'Repayment method: voucher_redemption, wallet, cash_till, manual';
COMMENT ON COLUMN loan_repayments.metadata IS 'Additional context: { voucherId, tillCode, isPartial, etc. }';
