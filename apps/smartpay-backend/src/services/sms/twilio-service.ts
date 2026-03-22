/**
 * Twilio SMS Service for SmartPay
 * 
 * Purpose: Production SMS delivery via Twilio with comprehensive error handling
 * 
 * Features:
 * - OTP delivery with retry logic
 * - Rate limiting (5 SMS per phone per hour)
 * - Cost tracking per message
 * - Database logging for PSD-12 compliance
 * - Development fallback mode
 * - Exponential backoff retry (3 attempts)
 * 
 * Standards:
 * - PSD-12: Audit trail for all SMS deliveries
 * - NAMQR: Secure OTP delivery
 * - BoN: Financial services communication compliance
 */

import crypto from 'crypto';
import { query } from '../../lib/db';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  enabled: boolean;
  allowDevFallback: boolean;
}

interface SMSOptions {
  phone: string;
  code: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  provider: string;
}

interface RateLimitCheck {
  allowed: boolean;
  hourlyCount: number;
  retryAfter?: number;
}

const config: TwilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  /** @deprecated Read at runtime via allowDevFallback() so tests and env changes apply without stale module state */
  allowDevFallback: process.env.ALLOW_DEV_FALLBACK === 'true',
};

/** Whether mock SMS is allowed when Twilio credentials are missing (reads env each call). */
function allowDevFallback(): boolean {
  return process.env.ALLOW_DEV_FALLBACK === 'true';
}

// Rate limit constants
const RATE_LIMIT = {
  MAX_PER_HOUR: 5,
  WINDOW_MS: 60 * 60 * 1000, // 1 hour
};

// Retry configuration
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000, // 1 second
  MAX_DELAY_MS: 10000, // 10 seconds
};

/**
 * Hash phone number for privacy-compliant storage
 */
function hashPhone(phone: string): string {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

/**
 * Get last 4 digits of phone for support reference
 */
function getPhoneLast4(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.slice(-4);
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('264')) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith('0')) {
    return `+264${cleaned.substring(1)}`;
  }
  
  return `+264${cleaned}`;
}

/**
 * Check rate limit for phone number
 */
async function checkRateLimit(phone: string): Promise<RateLimitCheck> {
  const phoneHash = hashPhone(phone);
  const hourAgo = new Date(Date.now() - RATE_LIMIT.WINDOW_MS);
  
  try {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM sms_logs 
       WHERE phone_hash = $1 
         AND created_at > $2`,
      [phoneHash, hourAgo.toISOString()]
    );

    const hourlyCount = parseInt(result?.rows?.[0]?.count ?? '0', 10);
    
    if (hourlyCount >= RATE_LIMIT.MAX_PER_HOUR) {
      return {
        allowed: false,
        hourlyCount,
        retryAfter: RATE_LIMIT.WINDOW_MS / 1000, // seconds
      };
    }
    
    return { allowed: true, hourlyCount };
  } catch (error) {
    console.error('[Twilio] Rate limit check failed:', error);
    // Fail open - allow SMS if rate limit check fails
    return { allowed: true, hourlyCount: 0 };
  }
}

/**
 * Log SMS delivery attempt to database
 */
async function logSMSDelivery(
  phone: string,
  messageType: string,
  status: string,
  result: SMSResult,
  retryCount: number = 0
): Promise<void> {
  try {
    await query(
      `INSERT INTO sms_logs (
        phone_hash, 
        phone_last_4, 
        message_type, 
        status, 
        provider, 
        message_id, 
        cost_nad, 
        error_code,
        error_message, 
        retry_count,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        hashPhone(phone),
        getPhoneLast4(phone),
        messageType,
        status,
        result.provider,
        result.messageId || null,
        result.cost || 0,
        null, // error_code (could extract from Twilio error)
        result.error || null,
        retryCount,
        JSON.stringify({ purpose: messageType }),
      ]
    );
  } catch (error) {
    console.error('[Twilio] Failed to log SMS delivery:', error);
  }
}

/**
 * Send SMS via Twilio API with retry logic
 */
async function sendViaTwilio(
  phone: string,
  message: string,
  attemptNumber: number = 1
): Promise<SMSResult> {
  const { accountSid, authToken, phoneNumber } = config;
  
  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Twilio credentials not configured');
  }
  
  try {
    const normalized = normalizePhone(phone);
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          To: normalized,
          From: phoneNumber,
          Body: message,
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Twilio API error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }
    
    const data = await response.json();
    
    return {
      success: true,
      messageId: data.sid,
      cost: Math.abs(parseFloat(data.price || '0')), // Convert to positive
      provider: 'twilio',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Twilio] Attempt ${attemptNumber} failed:`, errorMessage);
    
    // Retry logic with exponential backoff
    if (attemptNumber < RETRY_CONFIG.MAX_ATTEMPTS) {
      const delay = Math.min(
        RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attemptNumber - 1),
        RETRY_CONFIG.MAX_DELAY_MS
      );
      
      console.log(`[Twilio] Retrying in ${delay}ms (attempt ${attemptNumber + 1}/${RETRY_CONFIG.MAX_ATTEMPTS})`);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendViaTwilio(phone, message, attemptNumber + 1);
    }
    
    return {
      success: false,
      provider: 'twilio',
      error: errorMessage,
    };
  }
}

/**
 * Send SMS via mock/test mode (development fallback)
 */
function sendViaMock(phone: string, message: string): SMSResult {
  console.log('[Twilio Mock] SMS not sent (development mode)');
  console.log(`[Twilio Mock] To: ${phone}`);
  console.log(`[Twilio Mock] Message: ${message}`);
  
  return {
    success: true,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    cost: 0,
    provider: 'test',
  };
}

/**
 * Main function: Send OTP via SMS
 * 
 * @param options - SMS options (phone, code, purpose)
 * @returns Result with success status and details
 */
export async function sendOTP(options: SMSOptions): Promise<SMSResult> {
  const { phone, code, purpose = 'otp', metadata = {} } = options;
  
  // Check rate limit
  const rateLimit = await checkRateLimit(phone);
  if (!rateLimit.allowed) {
    const result: SMSResult = {
      success: false,
      provider: 'twilio',
      error: `Rate limit exceeded (${rateLimit.hourlyCount}/${RATE_LIMIT.MAX_PER_HOUR} per hour)`,
    };
    
    await logSMSDelivery(phone, purpose, 'failed', result);
    return result;
  }
  
  // Format message
  const message = `Your SmartPay verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;
  
  let result: SMSResult;
  let retryCount = 0;
  
  // Determine which provider to use
  if (!config.enabled && allowDevFallback()) {
    console.log('[Twilio] Not configured, using mock mode (ALLOW_DEV_FALLBACK=true)');
    result = sendViaMock(phone, message);
  } else if (!config.enabled) {
    result = {
      success: false,
      provider: 'twilio',
      error: 'Twilio not configured and dev fallback disabled',
    };
  } else {
    // Send via Twilio with retry logic
    result = await sendViaTwilio(phone, message);
    retryCount = result.success ? 0 : RETRY_CONFIG.MAX_ATTEMPTS;
  }
  
  // Log delivery attempt
  const status = result.success ? 'sent' : 'failed';
  await logSMSDelivery(phone, purpose, status, result, retryCount);
  
  return result;
}

/**
 * Check if Twilio is properly configured
 */
export function isTwilioConfigured(): boolean {
  return config.enabled;
}

/**
 * Get current rate limit status for a phone number
 */
export async function getRateLimitStatus(phone: string): Promise<RateLimitCheck> {
  return checkRateLimit(phone);
}

/**
 * Send transaction notification SMS
 */
export async function sendTransactionNotification(
  phone: string,
  amount: number,
  type: string
): Promise<SMSResult> {
  const message = `SmartPay: Your ${type} transaction of NAD ${amount.toFixed(2)} was successful. Thank you for using SmartPay.`;
  
  // Check rate limit
  const rateLimit = await checkRateLimit(phone);
  if (!rateLimit.allowed) {
    return {
      success: false,
      provider: 'twilio',
      error: 'Rate limit exceeded',
    };
  }
  
  let result: SMSResult;
  
  if (!config.enabled && allowDevFallback()) {
    result = sendViaMock(phone, message);
  } else if (!config.enabled) {
    result = {
      success: false,
      provider: 'twilio',
      error: 'Twilio not configured',
    };
  } else {
    result = await sendViaTwilio(phone, message);
  }
  
  await logSMSDelivery(phone, 'transaction_notification', result.success ? 'sent' : 'failed', result);
  
  return result;
}
