-- Migration 050: PII Encryption Columns (PSD-12 §11 Compliance)
-- 
-- PSD-12 Section 11 requires ALL PII to be encrypted/tokenized/masked.
-- This migration adds encrypted columns for phone, email, and other PII fields.
--
-- Strategy:
-- 1. Add new encrypted columns alongside existing plaintext columns
-- 2. Add hash columns for searchable fields (phone, email)
-- 3. Maintain backward compatibility during transition
-- 4. Plaintext columns will be dropped in a future migration (after verification)
--
-- Location: fintech/database/migrations/050_encrypt_pii_columns.sql
-- Run with: npm run migrate

-- ============================================================================
-- USERS TABLE - Add encrypted PII columns
-- ============================================================================

-- Phone encryption (required for authentication and communications)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64);

-- Email encryption (PII protection)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

-- Create indexes for hash-based lookups (maintains query performance)
CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash);
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash) WHERE email_hash IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.phone_encrypted IS 'AES-256-GCM encrypted phone number (PSD-12 §11)';
COMMENT ON COLUMN users.phone_hash IS 'HMAC-SHA256 hash for phone lookup (deterministic, searchable)';
COMMENT ON COLUMN users.email_encrypted IS 'AES-256-GCM encrypted email address (PSD-12 §11)';
COMMENT ON COLUMN users.email_hash IS 'HMAC-SHA256 hash for email lookup (deterministic, searchable)';

-- ============================================================================
-- AGENT_LOCATIONS TABLE - Encrypt contact information (if exists)
-- ============================================================================

-- Only add column if table exists (PostGIS-enabled installations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_locations') THEN
    -- Add encrypted contact phone
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agent_locations' AND column_name = 'contact_phone_encrypted'
    ) THEN
      ALTER TABLE agent_locations ADD COLUMN contact_phone_encrypted TEXT;
      COMMENT ON COLUMN agent_locations.contact_phone_encrypted IS 'AES-256-GCM encrypted contact phone (PSD-12 §11)';
    END IF;
    
    -- Add index if contact_phone exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agent_locations' AND column_name = 'contact_phone'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_agent_locations_contact_phone_encrypted 
        ON agent_locations(contact_phone_encrypted) WHERE contact_phone_encrypted IS NOT NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- OTP_CODES TABLE - Encrypt phone numbers (if not already using users.id)
-- ============================================================================

-- OTP codes table stores phone numbers directly
-- Add encrypted column for compliance
ALTER TABLE otp_codes
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64);

-- Index for hash-based lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_hash ON otp_codes(phone_hash, purpose, expires_at);

COMMENT ON COLUMN otp_codes.phone_encrypted IS 'AES-256-GCM encrypted phone number (PSD-12 §11)';
COMMENT ON COLUMN otp_codes.phone_hash IS 'HMAC-SHA256 hash for phone lookup';

-- ============================================================================
-- KYC_SUBMISSIONS TABLE - Additional PII encryption (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kyc_submissions') THEN
    -- Encrypt full name
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'kyc_submissions' AND column_name = 'full_name_encrypted'
    ) THEN
      ALTER TABLE kyc_submissions ADD COLUMN full_name_encrypted TEXT;
      COMMENT ON COLUMN kyc_submissions.full_name_encrypted IS 'AES-256-GCM encrypted full name (PSD-12 §11)';
    END IF;
    
    -- Encrypt ID number
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'kyc_submissions' AND column_name = 'id_number_encrypted'
    ) THEN
      ALTER TABLE kyc_submissions ADD COLUMN id_number_encrypted TEXT;
      COMMENT ON COLUMN kyc_submissions.id_number_encrypted IS 'AES-256-GCM encrypted ID number (PSD-12 §11)';
    END IF;
    
    -- Encrypt address
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'kyc_submissions' AND column_name = 'address_encrypted'
    ) THEN
      ALTER TABLE kyc_submissions ADD COLUMN address_encrypted TEXT;
      COMMENT ON COLUMN kyc_submissions.address_encrypted IS 'AES-256-GCM encrypted address (PSD-12 §11)';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PAYMENT_REQUESTS TABLE - Encrypt sensitive metadata (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_requests') THEN
    -- Note field may contain sensitive information
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'payment_requests' AND column_name = 'note_encrypted'
    ) THEN
      ALTER TABLE payment_requests ADD COLUMN note_encrypted TEXT;
      COMMENT ON COLUMN payment_requests.note_encrypted IS 'AES-256-GCM encrypted note (may contain PII)';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- AUDIT LOG - Record migration execution
-- ============================================================================

INSERT INTO migrations (name) VALUES ('050_encrypt_pii_columns.sql')
ON CONFLICT (name) DO NOTHING;

-- Create audit entry for compliance tracking
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      action, 
      resource_type, 
      changes, 
      created_at
    ) VALUES (
      'PII_ENCRYPTION_MIGRATION',
      'database_schema',
      jsonb_build_object(
        'migration', '050_encrypt_pii_columns.sql',
        'timestamp', NOW(),
        'description', 'Added encrypted columns for PII (PSD-12 §11 compliance)',
        'tables_affected', ARRAY['users', 'otp_codes', 'agent_locations', 'kyc_submissions', 'payment_requests'],
        'encryption_algorithm', 'AES-256-GCM',
        'compliance', 'PSD-12 Section 11'
      ),
      NOW()
    );
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Uncomment to verify columns were added:
-- SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users' 
--   AND column_name LIKE '%encrypted%' OR column_name LIKE '%hash%'
-- ORDER BY ordinal_position;

-- Verify indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'users' 
--   AND (indexname LIKE '%hash%' OR indexname LIKE '%encrypted%');

-- Migration complete
-- Next step: Run data migration script to encrypt existing PII (see scripts/migrate-pii-encryption.ts)
