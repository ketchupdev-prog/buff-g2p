-- Migration 021: Fix OTP Verification - Leading Zero Bug Fix
-- Bug: OTP codes containing '0' digits (e.g., 085015, 102034) were not being accepted
-- Root cause: VARCHAR comparison was implicitly converting to numeric, stripping leading zeros
-- Solution: Explicit VARCHAR cast in comparison to prevent numeric conversion

-- ============================================================================
-- FIX: Update verify_otp function with explicit VARCHAR cast
-- ============================================================================

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
    
    -- Verify code (EXPLICIT VARCHAR CAST - Bug fix for leading zero issue)
    -- Before: IF v_otp.code = p_code THEN
    -- Issue: PostgreSQL was implicitly converting to numeric, causing '085015' = 85015 (FALSE)
    -- After: Explicit VARCHAR cast ensures string comparison, preserving leading zeros
    IF v_otp.code::VARCHAR = p_code::VARCHAR THEN
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

-- ============================================================================
-- VERIFICATION TEST CASES
-- ============================================================================

-- Test case 1: Code with leading zero (085015)
-- INSERT INTO otp_codes (phone, code, purpose, expires_at) VALUES ('81234567', '085015', 'login', NOW() + INTERVAL '5 minutes');
-- SELECT * FROM verify_otp('81234567', '085015', 'login'); -- Should return success=TRUE

-- Test case 2: Code with multiple zeros (002345)
-- INSERT INTO otp_codes (phone, code, purpose, expires_at) VALUES ('81234568', '002345', 'login', NOW() + INTERVAL '5 minutes');
-- SELECT * FROM verify_otp('81234568', '002345', 'login'); -- Should return success=TRUE

-- Test case 3: Wrong code (should fail)
-- INSERT INTO otp_codes (phone, code, purpose, expires_at) VALUES ('81234569', '123456', 'login', NOW() + INTERVAL '5 minutes');
-- SELECT * FROM verify_otp('81234569', '654321', 'login'); -- Should return success=FALSE

COMMENT ON FUNCTION verify_otp(VARCHAR, VARCHAR, VARCHAR) IS 
  'Verifies OTP code with explicit VARCHAR cast to prevent numeric conversion and preserve leading zeros (e.g., 085015)';
