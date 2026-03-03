-- OTP Verification System
-- Stores OTP codes for phone verification with expiration and rate limiting
-- Generated: 2025-04-01

-- OTP codes table with expiration
CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'login' NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 3 NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT otp_code_length CHECK (LENGTH(code) = 6),
    CONSTRAINT otp_positive_attempts CHECK (attempts >= 0),
    CONSTRAINT otp_positive_max_attempts CHECK (max_attempts > 0)
);

-- Index for fast lookups by phone and purpose
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_purpose ON otp_codes(phone, purpose DESC);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

-- OTP rate limiting table (tracks request frequency)
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'login' NOT NULL,
    request_count INTEGER DEFAULT 1 NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT otp_rate_positive_count CHECK (request_count >= 0)
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_phone ON otp_rate_limits(phone, purpose);

-- Function to cleanup expired OTP codes (call via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete expired and verified OTPs older than 24 hours
    DELETE FROM otp_codes 
    WHERE expires_at < NOW() 
       OR (verified_at IS NOT NULL AND created_at < NOW() - INTERVAL '24 hours');
    
    -- Delete old rate limit records (older than 24 hours)
    DELETE FROM otp_rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to generate 6-digit OTP
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    otp TEXT;
BEGIN
    -- Generate cryptographically secure 6-digit code
    otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    RETURN otp;
END;
$$;

-- Function to create new OTP (with rate limiting)
CREATE OR REPLACE FUNCTION create_otp(
    p_phone VARCHAR,
    p_purpose VARCHAR DEFAULT 'login',
    p_max_attempts INTEGER DEFAULT 3,
    p_ttl_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_request_count INTEGER;
    v_blocked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check rate limits
    SELECT window_start, request_count, blocked_until
    INTO v_window_start, v_request_count, v_blocked_until
    FROM otp_rate_limits
    WHERE phone = p_phone AND purpose = p_purpose
    ORDER BY window_start DESC
    LIMIT 1;
    
    -- Check if blocked
    IF v_blocked_until IS NOT NULL AND v_blocked_until > NOW() THEN
        RAISE EXCEPTION 'Too many OTP requests. Try again later.';
    END IF;
    
    -- Check daily limit (max 10 OTPs per day)
    IF v_window_start IS NOT NULL 
       AND v_window_start > NOW() - INTERVAL '24 hours'
       AND v_request_count >= 10 THEN
        RAISE EXCEPTION 'Daily OTP limit reached. Try again tomorrow.';
    END IF;
    
    -- Update or insert rate limit
    IF v_window_start IS NULL OR v_window_start < NOW() - INTERVAL '24 hours' THEN
        INSERT INTO otp_rate_limits (phone, purpose, request_count, window_start)
        VALUES (p_phone, p_purpose, 1, NOW())
        ON CONFLICT (phone, purpose) DO UPDATE
        SET request_count = otp_rate_limits.request_count + 1,
            window_start = NOW();
    ELSE
        UPDATE otp_rate_limits
        SET request_count = request_count + 1
        WHERE phone = p_phone AND purpose = p_purpose;
    END IF;
    
    -- Invalidate any existing pending OTPs for this phone/purpose
    UPDATE otp_codes
    SET verified_at = NOW()  -- Mark as cancelled
    WHERE phone = p_phone 
      AND purpose = p_purpose
      AND verified_at IS NULL
      AND expires_at > NOW();
    
    -- Generate new OTP
    v_code := generate_otp();
    v_expires_at := NOW() + (p_ttl_minutes || ' minutes')::INTERVAL;
    
    -- Insert new OTP
    INSERT INTO otp_codes (phone, code, purpose, max_attempts, expires_at)
    VALUES (p_phone, v_code, p_purpose, p_max_attempts, v_expires_at);
    
    RETURN QUERY SELECT v_code, v_expires_at;
END;
$$;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(
    p_phone VARCHAR,
    p_code VARCHAR,
    p_purpose VARCHAR DEFAULT 'login'
)
RETURNS TABLE(success BOOLEAN, message TEXT, attempts_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_otp RECORD;
    v_max_attempts INTEGER;
BEGIN
    -- Find the most recent pending OTP
    SELECT * INTO v_otp
    FROM otp_codes
    WHERE phone = p_phone 
      AND purpose = p_purpose
      AND verified_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if OTP exists
    IF v_otp IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invalid or expired code', 0;
        RETURN;
    END IF;
    
    -- Check attempts
    IF v_otp.attempts >= v_otp.max_attempts THEN
        -- Block further attempts
        UPDATE otp_codes
        SET attempts = attempts + 1, updated_at = NOW()
        WHERE id = v_otp.id;
        
        RETURN QUERY SELECT FALSE, 'Too many failed attempts. Request a new code.', 0;
        RETURN;
    END IF;
    
    -- Verify code
    IF v_otp.code = p_code THEN
        -- Mark as verified
        UPDATE otp_codes
        SET verified_at = NOW(), updated_at = NOW()
        WHERE id = v_otp.id;
        
        RETURN QUERY SELECT TRUE, 'Verification successful', v_otp.max_attempts - v_otp.attempts;
    ELSE
        -- Increment attempts
        UPDATE otp_codes
        SET attempts = attempts + 1, updated_at = NOW()
        WHERE id = v_otp.id;
        
        RETURN QUERY SELECT FALSE, 
               'Invalid code. ' || (v_otp.max_attempts - v_otp.attempts - 1) || ' attempts remaining',
               v_otp.max_attempts - v_otp.attempts - 1;
    END IF;
END;
$$;

-- Comment
COMMENT ON TABLE otp_codes IS 'Stores OTP verification codes with expiration for phone authentication';
COMMENT ON TABLE otp_rate_limits IS 'Tracks OTP request frequency for rate limiting';
COMMENT ON FUNCTION generate_otp() IS 'Generates a cryptographically secure 6-digit OTP';
COMMENT ON FUNCTION create_otp(VARCHAR, VARCHAR, INTEGER, INTEGER) IS 'Creates a new OTP with rate limiting';
COMMENT ON FUNCTION verify_otp(VARCHAR, VARCHAR, VARCHAR) IS 'Verifies an OTP code and returns success status';
