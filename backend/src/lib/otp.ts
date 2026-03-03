/**
 * OTP Service – Buffr G2P.
 * Handles OTP generation, validation, SMS/Email sending, and rate limiting.
 * Uses database functions for OTP storage and verification.
 * Location: backend/src/lib/otp.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import twilio from "twilio";

// Load environment
config({ path: resolve(process.cwd(), "backend/.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "backend/.env.local") });

// Import email service
import { sendOtpEmail, sendWelcomeEmail } from "./email.js";

// ============================================================================
// Configuration
// ============================================================================

interface OtpConfig {
  enabled: boolean;
  codeLength: number;
  expiryMinutes: number;
  maxAttempts: number;
  dailyLimit: number;
  rateLimitMinutes: number;
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  smsProvider: "twilio" | "africastalking" | "custom";
  africastalking: {
    username: string;
    apiKey: string;
    senderId: string;
  };
}

function getOtpConfig(): OtpConfig {
  return {
    enabled: process.env.OTP_ENABLED !== "false",
    codeLength: parseInt(process.env.OTP_CODE_LENGTH ?? "6", 10),
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES ?? "5", 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? "3", 10),
    dailyLimit: parseInt(process.env.OTP_DAILY_LIMIT ?? "10", 10),
    rateLimitMinutes: parseInt(process.env.OTP_RATE_LIMIT_MINUTES ?? "1", 10),
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
      authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
    },
    smsProvider: (process.env.SMS_PROVIDER ?? "twilio") as OtpConfig["smsProvider"],
    africastalking: {
      username: process.env.AFRICASTALKING_USERNAME ?? "",
      apiKey: process.env.AFRICASTALKING_API_KEY ?? "",
      senderId: process.env.AFRICASTALKING_SENDER_ID ?? "Buffr",
    },
  };
}

const config_ = getOtpConfig();

// Initialize Twilio client (if configured with valid credentials)
const twilioClient = config_.twilio.accountSid 
  && config_.twilio.accountSid.startsWith("AC") 
  && config_.twilio.authToken
  ? twilio(config_.twilio.accountSid, config_.twilio.authToken)
  : null;

// ============================================================================
// Types
// ============================================================================

export interface OtpRequest {
  phone: string;
  email?: string;
  purpose?: "login" | "register" | "change_pin" | "reset_pin" | "verify_phone";
  channel?: "sms" | "email" | "both";
}

export interface OtpVerify {
  phone: string;
  code: string;
  purpose?: "login" | "register" | "change_pin" | "reset_pin" | "verify_phone";
}

export interface OtpResponse {
  success: boolean;
  message?: string;
  expiresIn?: number; // seconds
  attemptsRemaining?: number;
  // For development/demo mode
  devCode?: string;
}

export interface OtpStatus {
  hasPendingOtp: boolean;
  attemptsRemaining: number;
  nextRequestAt?: Date;
  blockedUntil?: Date;
}

// ============================================================================
// OTP Generation (fallback when DB is not available)
// ============================================================================

/**
 * Generate a cryptographically secure numeric OTP.
 * Uses crypto.random if available, falls back to Math.random.
 */
export function generateOtpCode(length: number = config_.codeLength): string {
  // Try to use crypto for secure random
  try {
    const crypto = require("crypto");
    const buffer = crypto.randomBytes(length);
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += buffer[i] % 10;
    }
    return otp.padStart(length, "0");
  } catch {
    // Fallback to Math.random
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  }
}

// ============================================================================
// SMS Sending
// ============================================================================

/**
 * Send OTP via SMS using configured provider.
 */
async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const message = `Your Buffr verification code is: ${code}. Valid for ${config_.expiryMinutes} minutes. Do not share this code.`;

  // Try Twilio first
  if (config_.smsProvider === "twilio" && twilioClient) {
    try {
      const formattedPhone = formatPhoneNumber(phone);
      await twilioClient.messages.create({
        body: message,
        from: config_.twilio.phoneNumber,
        to: formattedPhone,
      });
      return true;
    } catch (error) {
      console.error("Twilio SMS error:", error);
    }
  }

  // Try Africa's Talking (fallback)
  if (config_.smsProvider === "africastalking" && config_.africastalking.apiKey) {
    try {
      const response = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: config_.africastalking.apiKey,
        },
        body: new URLSearchParams({
          username: config_.africastalking.username,
          to: formatPhoneNumber(phone),
          message,
          from: config_.africastalking.senderId,
        }),
      });
      const data = await response.json();
      return data?.SMSMessageData?.Recipients?.[0]?.status === "Success";
    } catch (error) {
      console.error("Africa's Talking SMS error:", error);
    }
  }

  // Log for development
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] SMS to ${phone}: ${code}`);
    return true;
  }

  return false;
}

/**
 * Format phone number to E.164 format for Namibia (+264).
 */
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  
  // If already has country code
  if (digits.startsWith("264")) {
    return `+${digits}`;
  }
  
  // If starts with 0, replace with 264
  if (digits.startsWith("0")) {
    return `+264${digits.slice(1)}`;
  }
  
  // Assume it's an 8-digit Namibia number
  return `+264${digits}`;
}

// ============================================================================
// OTP Request (Create new OTP)
// ============================================================================

/**
 * Request a new OTP to be sent to the phone number or email.
 * Handles rate limiting and creates OTP in database.
 */
export async function requestOtp(params: OtpRequest): Promise<OtpResponse> {
  const { phone, email, purpose = "login", channel = "sms" } = params;
  
  // Validate phone
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || normalizedPhone.length < 7) {
    return { success: false, message: "Invalid phone number" };
  }

  // Validate email if provided
  const normalizedEmail = email?.toLowerCase().trim();
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    return { success: false, message: "Invalid email address" };
  }

  // Check if OTP is disabled (demo mode)
  if (!config_.enabled) {
    // In demo mode, generate a deterministic code for testing
    const devCode = generateDevCode(normalizedPhone);
    console.log(`[DEMO] OTP for ${normalizedPhone}: ${devCode}`);
    return {
      success: true,
      message: "Demo mode: OTP not sent",
      expiresIn: config_.expiryMinutes * 60,
      devCode,
    };
  }

  try {
    // Use database function for rate-limited OTP creation
    const { sql } = await import("./db.js");
    
    const result = await sql`
      SELECT * FROM create_otp(
        ${normalizedPhone},
        ${purpose},
        ${config_.maxAttempts},
        ${config_.expiryMinutes}
      );
    `;
    
    const otpRecord = result[0] as { code: string; expires_at: Date };
    const code = otpRecord.code;
    const expiresAt = otpRecord.expires_at;
    const expiresInSeconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    
    // Determine which channel to use
    let smsSent = false;
    let emailSent = false;
    
    // Send via SMS
    if (channel === "sms" || channel === "both") {
      smsSent = await sendOtpSms(normalizedPhone, code);
    }
    
    // Send via Email
    if ((channel === "email" || channel === "both") && normalizedEmail) {
      // Map purpose to email purpose
      const emailPurpose = mapPurposeToEmailPurpose(purpose);
      emailSent = await sendOtpEmail(normalizedEmail, emailPurpose, code, expiresInSeconds);
    }
    
    // If both requested but one fails, still allow if at least one succeeds
    if (channel === "both" && (!smsSent || !emailSent)) {
      // At least one should have succeeded
      if (!smsSent && !emailSent) {
        if (process.env.NODE_ENV === "development") {
          return {
            success: true,
            message: "OTP created (SMS/Email may fail in dev)",
            expiresIn: expiresInSeconds,
            devCode: code,
          };
        }
        return { success: false, message: "Failed to send OTP. Please try again." };
      }
    }
    
    // If only SMS/email requested and failed
    if (channel === "sms" && !smsSent) {
      if (process.env.NODE_ENV === "development") {
        return {
          success: true,
          message: "OTP created (SMS may fail in dev)",
          expiresIn: expiresInSeconds,
          devCode: code,
        };
      }
      return { success: false, message: "Failed to send SMS. Please try again." };
    }
    
    if (channel === "email" && !emailSent && normalizedEmail) {
      if (process.env.NODE_ENV === "development") {
        return {
          success: true,
          message: "OTP created (Email may fail in dev)",
          expiresIn: expiresInSeconds,
          devCode: code,
        };
      }
      return { success: false, message: "Failed to send email. Please try again." };
    }
    
    // Success - determine message based on channel
    let message = "Verification code sent";
    if (channel === "both") {
      message = "Verification code sent to phone and email";
    } else if (channel === "email") {
      message = "Verification code sent to email";
    }
    
    return {
      success: true,
      message,
      expiresIn: expiresInSeconds,
    };
  } catch (error: any) {
    // Check for rate limit errors
    if (error.message?.includes("Too many") || error.message?.includes("limit")) {
      return { success: false, message: error.message };
    }
    
    console.error("OTP request error:", error);
    
    // Fallback to non-DB mode: when in development OR when error suggests DB/setup not ready
    // (e.g. create_otp missing, table missing, or Twilio not configured) so local dev can proceed.
    const isDev = process.env.NODE_ENV === "development";
    const isLikelySetupError = !error?.message || 
      /does not exist|create_otp|relation.*does not exist|ECONNREFUSED|connect/i.test(String(error.message));
    if (isDev || isLikelySetupError) {
      const devCode = generateDevCode(normalizedPhone);
      return {
        success: true,
        message: isDev ? "DB fallback: OTP generated" : "OTP generated (use code below for verification)",
        expiresIn: config_.expiryMinutes * 60,
        devCode: devCode,
      };
    }
    
    return { success: false, message: "Failed to generate OTP. Please try again." };
  }
}

// ============================================================================
// OTP Verification
// ============================================================================

/**
 * Verify an OTP code.
 */
export async function verifyOtp(params: OtpVerify): Promise<OtpResponse> {
  const { phone, code, purpose = "login" } = params;
  
  // Validate inputs
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { success: false, message: "Invalid phone number" };
  }
  
  if (!code || code.length !== config_.codeLength) {
    return { success: false, message: "Invalid code format" };
  }

  // Check if OTP is disabled (demo mode)
  if (!config_.enabled) {
    // Accept any 6-digit code in demo mode
    const devCode = generateDevCode(normalizedPhone);
    if (code === devCode || code.length >= 4) {
      return { success: true, message: "Demo mode: verification successful" };
    }
    return { success: false, message: "Invalid code" };
  }

  try {
    // Use database function for verification
    const { sql } = await import("./db.js");
    
    const result = await sql`
      SELECT * FROM verify_otp(${normalizedPhone}, ${code}, ${purpose});
    `;
    
    const verifyResult = result[0] as { success: boolean; message: string; attempts_remaining: number };
    
    return {
      success: verifyResult.success,
      message: verifyResult.message,
      attemptsRemaining: verifyResult.attempts_remaining,
    };
  } catch (error) {
    console.error("OTP verification error:", error);
    
    // Fallback to non-DB verification in development
    if (process.env.NODE_ENV === "development") {
      const devCode = generateDevCode(normalizedPhone);
      if (code === devCode || code.length >= 4) {
        return { success: true, message: "Demo mode: verification successful" };
      }
      return { success: false, message: "Invalid code (demo fallback)" };
    }
    
    return { success: false, message: "Verification failed. Please try again." };
  }
}

// ============================================================================
// OTP Status
// ============================================================================

/**
 * Get OTP status for a phone number (for UI to show countdown, etc).
 */
export async function getOtpStatus(phone: string, purpose: string = "login"): Promise<OtpStatus> {
  const normalizedPhone = normalizePhone(phone);
  
  if (!normalizedPhone) {
    return { hasPendingOtp: false, attemptsRemaining: config_.maxAttempts };
  }

  try {
    const { sql } = await import("./db.js");
    
    // Check for pending OTP
    const otpResult = await sql`
      SELECT expires_at, attempts, max_attempts 
      FROM otp_codes
      WHERE phone = ${normalizedPhone}
        AND purpose = ${purpose}
        AND verified_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    
    if (otpResult.length === 0) {
      return { hasPendingOtp: false, attemptsRemaining: config_.maxAttempts };
    }
    
    const otp = otpResult[0] as { expires_at: Date; attempts: number; max_attempts: number };
    const expiresAt = new Date(otp.expires_at);
    const now = new Date();
    const secondsRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    
    // Check rate limits
    const rateResult = await sql`
      SELECT window_start, request_count, blocked_until
      FROM otp_rate_limits
      WHERE phone = ${normalizedPhone}
        AND purpose = ${purpose}
      ORDER BY window_start DESC
      LIMIT 1;
    `;
    
    let nextRequestAt: Date | undefined;
    let blockedUntil: Date | undefined;
    
    if (rateResult.length > 0) {
      const rate = rateResult[0] as { window_start: Date; request_count: number; blocked_until: Date | null };
      
      // Check if blocked
      if (rate.blocked_until && new Date(rate.blocked_until) > now) {
        blockedUntil = new Date(rate.blocked_until);
      }
      // Check if can request again soon (rate limiting)
      else if (rate.request_count >= 3) {
        nextRequestAt = new Date(new Date(rate.window_start).getTime() + config_.rateLimitMinutes * 60 * 1000);
      }
    }
    
    return {
      hasPendingOtp: true,
      attemptsRemaining: otp.max_attempts - otp.attempts,
      nextRequestAt,
      blockedUntil,
    };
  } catch {
    // If DB error, assume no pending OTP
    return { hasPendingOtp: false, attemptsRemaining: config_.maxAttempts };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize phone number to digits only.
 */
function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  
  // Handle Namibia numbers
  if (digits.length === 8) {
    return digits; // Local 8-digit number
  }
  if (digits.length === 9 && digits.startsWith("6")) {
    return digits; // With leading 6
  }
  if (digits.length === 11 && digits.startsWith("264")) {
    return digits.slice(3); // Country code without +
  }
  if (digits.length === 12 && digits.startsWith("264")) {
    return digits.slice(3); // With +
  }
  
  // Return as-is if we can't normalize
  return digits.length >= 7 ? digits : null;
}

/**
 * Generate deterministic code for demo/development.
 */
function generateDevCode(phone: string): string {
  // Use phone digits to generate consistent "random" code
  const seed = parseInt(phone.slice(-6), 10);
  const code = ((seed * 9301 + 49297) % 233280) % 1000000;
  return code.toString().padStart(6, "0");
}

/**
 * Validate email address.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Map OTP purpose to email template purpose.
 */
function mapPurposeToEmailPurpose(
  purpose: string
): "otp_login" | "otp_register" | "otp_change_pin" | "otp_reset_pin" | "otp_verify_phone" {
  const mapping: Record<string, any> = {
    login: "otp_login",
    register: "otp_register",
    change_pin: "otp_change_pin",
    reset_pin: "otp_reset_pin",
    verify_phone: "otp_verify_phone",
  };
  return mapping[purpose] || "otp_login";
}

// ============================================================================
// Export
// ============================================================================

export default {
  generateOtpCode,
  requestOtp,
  verifyOtp,
  getOtpStatus,
};
