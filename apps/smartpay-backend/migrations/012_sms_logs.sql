-- SMS Logs Table
-- Tracks all SMS delivery attempts for audit and compliance (PSD-12 requirement)
-- Retention: 7 years per financial services regulations

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash TEXT NOT NULL, -- SHA-256 hash of phone number for privacy
  phone_last_4 TEXT, -- Last 4 digits for support reference
  message_type TEXT NOT NULL, -- 'otp', 'notification', 'alert'
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced')),
  provider TEXT NOT NULL, -- 'twilio', 'test'
  message_id TEXT, -- Provider's message ID
  cost_nad NUMERIC(10, 4) DEFAULT 0, -- Cost in NAD
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone_hash ON sms_logs(phone_hash);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider ON sms_logs(provider);
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_type ON sms_logs(message_type);

-- Rate limiting view (for quick lookups)
CREATE OR REPLACE VIEW sms_rate_limit_check AS
SELECT 
  phone_hash,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS hourly_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS daily_count
FROM sms_logs
GROUP BY phone_hash;

COMMENT ON TABLE sms_logs IS 'PSD-12 compliant SMS delivery audit log (7-year retention)';
COMMENT ON COLUMN sms_logs.phone_hash IS 'SHA-256 hash of phone number for GDPR/POPIA compliance';
COMMENT ON COLUMN sms_logs.cost_nad IS 'SMS cost in Namibian Dollars for financial tracking';
