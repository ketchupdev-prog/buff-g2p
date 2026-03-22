-- User notifications inbox (mobile + in-app)
-- Supports GET/PATCH/DELETE /api/v1/notifications* and server-side inserts for KYC, payments, POL, etc.
-- Depends on: users (020_users_kyc.sql), update_updated_at_column() (001_initial_schema.sql)

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id)
  WHERE read = false;

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE notifications IS
  'Per-user notification inbox: in-app list + audit trail for customer communications (KYC, payments, proof-of-life, vouchers). Prefer minimal PII in title/message.';

COMMENT ON COLUMN notifications.metadata IS
  'JSON payload: deepLink, transactionId, voucherId, etc. Avoid storing full PII.';
