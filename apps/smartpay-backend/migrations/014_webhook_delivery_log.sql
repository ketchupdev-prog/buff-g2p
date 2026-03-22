-- Webhook Delivery Log
-- Enhanced tracking for webhook processing with retry logic

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL, -- Original webhook event ID (for idempotency)
  event_type TEXT NOT NULL,
  source TEXT NOT NULL, -- 'buffr-connect', 'bon', etc.
  payload JSONB NOT NULL,
  signature TEXT,
  status TEXT NOT NULL CHECK (status IN ('received', 'processing', 'completed', 'failed', 'retry_scheduled')),
  attempt_count INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  error_details JSONB,
  processing_duration_ms INTEGER,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_event_id UNIQUE(event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_log_event_type ON webhook_delivery_log(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_log_status ON webhook_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_webhook_log_next_retry ON webhook_delivery_log(next_retry_at) 
  WHERE status = 'retry_scheduled' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_log_created_at ON webhook_delivery_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_log_source ON webhook_delivery_log(source);

-- Dead letter queue view (failed after max attempts)
CREATE OR REPLACE VIEW webhook_dead_letter_queue AS
SELECT *
FROM webhook_delivery_log
WHERE status = 'failed'
  AND attempt_count >= max_attempts
ORDER BY created_at DESC;

-- Retry queue view
CREATE OR REPLACE VIEW webhook_retry_queue AS
SELECT *
FROM webhook_delivery_log
WHERE status = 'retry_scheduled'
  AND attempt_count < max_attempts
  AND next_retry_at <= NOW()
ORDER BY next_retry_at ASC, attempt_count ASC;

COMMENT ON TABLE webhook_delivery_log IS 'Webhook processing log with retry and dead letter queue support';
COMMENT ON COLUMN webhook_delivery_log.event_id IS 'Unique event ID for idempotency (prevents duplicate processing)';
COMMENT ON COLUMN webhook_delivery_log.processing_duration_ms IS 'Processing time in milliseconds for performance monitoring';
