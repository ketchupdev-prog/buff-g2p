-- OTP rate limits: unique index required by create_otp() ON CONFLICT (phone, purpose).
-- Run after 004_otp_verification.sql. Idempotent (IF NOT EXISTS).

CREATE UNIQUE INDEX IF NOT EXISTS otp_rate_limits_phone_purpose_key
ON otp_rate_limits (phone, purpose);
