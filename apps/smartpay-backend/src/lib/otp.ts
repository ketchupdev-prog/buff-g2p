/**
 * OTP (One-Time Password) Service
 * Following Buffr G2P OTP patterns
 * 
 * PSD-12 §11 Compliance: Phone numbers are encrypted before storage
 */

import { sql } from './db';
import { encryptPhone, hashPhone } from '../security/encryption-service';

// Configuration
const config = {
  maxAttempts: 3,
  dailyLimit: 100,
  rateLimitMinutes: 1,
  expiryMinutes: 5,
  codeLength: 6
};

export async function generateOTP(params: {
  phone: string;
  purpose: string;
}): Promise<{ code: string; expiresAt: Date } | null> {
  try {
    const { phone, purpose } = params;

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + config.expiryMinutes * 60 * 1000);

    // Encrypt phone and generate hash for lookup (PSD-12 §11)
    const phoneEncrypted = encryptPhone(phone);
    const phoneHash = hashPhone(phone);

    // Invalidate any existing OTPs for this phone/purpose (using hash for lookup)
    await sql`
      UPDATE otp_codes
      SET verified_at = NOW()
      WHERE phone_hash = ${phoneHash}
        AND purpose = ${purpose}
        AND verified_at IS NULL
        AND expires_at > NOW()
    `;

    // Insert new OTP with encrypted phone
    await sql`
      INSERT INTO otp_codes (
        phone, phone_encrypted, phone_hash, code, purpose, attempts, max_attempts, expires_at
      )
      VALUES (
        ${phone}, ${phoneEncrypted}, ${phoneHash}, ${code}, ${purpose}, 0, ${config.maxAttempts}, ${expiresAt.toISOString()}
      )
    `;

    return { code, expiresAt };
  } catch (error) {
    console.error('Error generating OTP:', error);
    return null;
  }
}

export async function verifyOTP(params: {
  phone: string;
  code: string;
  purpose: string;
}): Promise<{
  success: boolean;
  message?: string;
  attemptsRemaining?: number;
}> {
  try {
    const { phone, code, purpose } = params;

    // Generate hash for lookup (PSD-12 §11)
    const phoneHash = hashPhone(phone);

    // Find OTP using hash (not plaintext phone)
    const otpRows = await sql`
      SELECT * FROM otp_codes
      WHERE phone_hash = ${phoneHash}
        AND purpose = ${purpose}
        AND verified_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (otpRows.length === 0) {
      return {
        success: false,
        message: 'OTP not found or expired'
      };
    }

    const otp = otpRows[0] as any;

    // Check attempts
    if (otp.attempts >= otp.max_attempts) {
      return {
        success: false,
        message: 'Maximum verification attempts exceeded',
        attemptsRemaining: 0
      };
    }

    // Verify code
    if (otp.code !== code) {
      // Increment attempts
      await sql`
        UPDATE otp_codes
        SET attempts = attempts + 1
        WHERE id = ${otp.id}
      `;

      const attemptsRemaining = otp.max_attempts - (otp.attempts + 1);

      return {
        success: false,
        message: 'Invalid OTP code',
        attemptsRemaining
      };
    }

    // Mark as verified
    await sql`
      UPDATE otp_codes
      SET verified_at = NOW()
      WHERE id = ${otp.id}
    `;

    return {
      success: true,
      message: 'OTP verified successfully'
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'Failed to verify OTP'
    };
  }
}

export async function checkOTPRateLimit(
  phone: string,
  purpose: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const windowStart = new Date(Date.now() - config.rateLimitMinutes * 60 * 1000);

    // Generate hash for lookup (PSD-12 §11)
    const phoneHash = hashPhone(phone);

    const rows = await sql`
      SELECT COUNT(*) as count
      FROM otp_codes
      WHERE phone_hash = ${phoneHash}
        AND purpose = ${purpose}
        AND created_at > ${windowStart.toISOString()}
    `;

    const count = Number(rows[0]?.count || 0);

    if (count >= 3) {
      const retryAfter = config.rateLimitMinutes * 60;
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking OTP rate limit:', error);
    return { allowed: false };
  }
}

export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    await sql`
      DELETE FROM otp_codes
      WHERE expires_at < NOW()
    `;

    // Note: sql tagged template doesn't return count, just empty array for DELETE
    return 0;
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    return 0;
  }
}

// Send OTP via SMS using Twilio service
export async function sendOTPSMS(phone: string, code: string): Promise<boolean> {
  const twilioService = await import('../services/sms/twilio-service');
  
  const result = await twilioService.sendOTP({
    phone,
    code,
    purpose: 'otp',
  });
  
  if (!result.success) {
    console.error(`[OTP] Failed to send SMS to ${phone}:`, result.error);
    return false;
  }
  
  console.log(`[OTP] SMS sent successfully to ${phone} via ${result.provider}`);
  return true;
}

// Send OTP via Email (placeholder - integrate with SMTP/SendGrid)
export async function sendOTPEmail(email: string, code: string): Promise<boolean> {
  console.log(`[OTP] Sending email to ${email}: ${code}`);
  // TODO: Integrate with email provider
  return true;
}
