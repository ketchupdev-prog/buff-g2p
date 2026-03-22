-- Migration 022: Add email column to users
-- Fixes: "column email does not exist" when generating session token after OTP verification.
-- The verify-otp flow selects/returns id, email from users; JWT and profile flows expect email.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

COMMENT ON COLUMN users.email IS 'User email (optional); set when using email OTP or from profile.';
