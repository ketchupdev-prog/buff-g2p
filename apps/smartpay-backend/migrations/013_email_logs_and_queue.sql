-- Email Logs and Queue Tables
-- Tracks all email delivery for compliance and retry logic

-- Email Logs Table (audit trail)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email_hash TEXT NOT NULL, -- SHA-256 hash for privacy
  recipient_domain TEXT, -- Domain for analytics
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'compliance_alert', 'trust_reconciliation', 'receipt', 'notification'
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  provider TEXT NOT NULL, -- 'sendgrid', 'smtp', 'test'
  message_id TEXT, -- Provider's message ID
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email Queue Table (for retry logic)
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL, -- Plain text (encrypted at rest)
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  email_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=highest, 10=lowest
  max_attempts INTEGER DEFAULT 3,
  attempt_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_hash ON email_logs(recipient_email_hash);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry ON email_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority, created_at);

-- View for failed emails needing retry
CREATE OR REPLACE VIEW email_retry_queue AS
SELECT *
FROM email_queue
WHERE status = 'pending'
  AND attempt_count < max_attempts
  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
ORDER BY priority ASC, created_at ASC;

COMMENT ON TABLE email_logs IS 'PSD-12 compliant email audit log (7-year retention)';
COMMENT ON TABLE email_queue IS 'Email retry queue with exponential backoff';
COMMENT ON COLUMN email_queue.priority IS 'Priority 1-10 (1=highest): compliance=1, alerts=3, receipts=5, notifications=7';
