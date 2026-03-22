-- PIN verification lockout (failed attempts + temporary lock)
-- Used by smartpay-backend user PIN endpoints

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

COMMENT ON COLUMN users.pin_failed_attempts IS 'Consecutive failed PIN verifications; reset on success or after lockout window';
COMMENT ON COLUMN users.pin_locked_until IS 'After max failed attempts, PIN verify is rejected until this time';
