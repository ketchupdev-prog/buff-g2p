-- BoN (Bank of Namibia) Reporting Queue Enhancement
-- Ensures bon_reporting_queue exists with proper structure for API client integration

CREATE TABLE IF NOT EXISTS bon_reporting_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('kri', 'incident', 'trust_account', 'transaction_volume', 'compliance')),
  report_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'submitted', 'failed', 'dead_letter')),
  submission_id TEXT, -- BoN's submission ID after successful submit
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bon_queue_status ON bon_reporting_queue(status);
CREATE INDEX IF NOT EXISTS idx_bon_queue_report_type ON bon_reporting_queue(report_type);
CREATE INDEX IF NOT EXISTS idx_bon_queue_next_retry ON bon_reporting_queue(next_retry_at) 
  WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bon_queue_created_at ON bon_reporting_queue(created_at DESC);

-- View for pending reports
CREATE OR REPLACE VIEW bon_pending_reports AS
SELECT *
FROM bon_reporting_queue
WHERE status = 'pending'
  AND attempt_count < max_attempts
  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
ORDER BY created_at ASC;

-- View for failed reports (dead letter)
CREATE OR REPLACE VIEW bon_failed_reports AS
SELECT *
FROM bon_reporting_queue
WHERE status = 'dead_letter'
  OR (status = 'failed' AND attempt_count >= max_attempts)
ORDER BY created_at DESC;

COMMENT ON TABLE bon_reporting_queue IS 'Bank of Namibia regulatory reporting queue with retry logic';
COMMENT ON COLUMN bon_reporting_queue.report_type IS 'Type of BoN report: kri (Key Risk Indicators), incident (Security Incident), trust_account (Trust Account Reconciliation), etc.';
COMMENT ON COLUMN bon_reporting_queue.submission_id IS 'BoN API submission ID for tracking and status checks';
