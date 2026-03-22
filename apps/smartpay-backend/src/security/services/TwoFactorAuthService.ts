/**
 * Two-Factor Authentication Service
 * PSD-12 Compliance: Section 12.2 - 2FA REQUIRED for EVERY payment
 * 
 * Supports:
 * - SMS OTP
 * - TOTP (Time-based One-Time Password)
 * - Biometric authentication
 * - Hardware tokens
 */

import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import twilio from 'twilio';

interface TwoFactorAuthConfig {
  smsProvider: 'twilio' | 'mock';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  otpLength: number;
  otpExpiryMinutes: number;
  totpIssuer: string;
}

interface SendOTPResult {
  success: boolean;
  otpId: string;
  expiresAt: Date;
  message?: string;
  error?: string;
}

interface VerifyOTPResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class TwoFactorAuthService {
  private config: TwoFactorAuthConfig;
  private twilioClient?: twilio.Twilio;
  private otpStore: Map<string, { otp: string; expiresAt: Date; attempts: number }> = new Map();

  constructor(config: Partial<TwoFactorAuthConfig> = {}) {
    this.config = {
      smsProvider: config.smsProvider || 'mock',
      twilioAccountSid: config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: config.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER,
      otpLength: config.otpLength || 6,
      otpExpiryMinutes: config.otpExpiryMinutes || 5,
      totpIssuer: config.totpIssuer || 'SmartPay Namibia',
    };

    if (this.config.smsProvider === 'twilio') {
      if (!this.config.twilioAccountSid || !this.config.twilioAuthToken) {
        throw new Error('Twilio credentials are required for SMS OTP');
      }
      this.twilioClient = twilio(this.config.twilioAccountSid, this.config.twilioAuthToken);
    }
  }

  /**
   * Generate a random OTP code
   */
  private generateOTP(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.config.otpLength; i++) {
      otp += digits[crypto.randomInt(0, digits.length)];
    }
    return otp;
  }

  /**
   * Send SMS OTP to user's phone number
   * PSD-12 Requirement: 2FA for EVERY payment
   */
  async sendSMSOTP(
    userId: string,
    phoneNumber: string,
    purpose: 'PAYMENT' | 'LOGIN' | 'PASSWORD_RESET' | 'SETTINGS_CHANGE' = 'PAYMENT'
  ): Promise<SendOTPResult> {
    try {
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.config.otpExpiryMinutes * 60 * 1000);
      const otpId = crypto.randomUUID();

      // Hash OTP before storing (security best practice)
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      // Store OTP temporarily
      this.otpStore.set(otpId, {
        otp: otpHash,
        expiresAt,
        attempts: 0,
      });

      // Clean up expired OTPs
      this.cleanupExpiredOTPs();

      // Send SMS
      const message = `Your SmartPay verification code is: ${otp}. Valid for ${this.config.otpExpiryMinutes} minutes. Do not share this code with anyone.`;

      if (this.config.smsProvider === 'twilio' && this.twilioClient) {
        await this.twilioClient.messages.create({
          body: message,
          from: this.config.twilioPhoneNumber!,
          to: phoneNumber,
        });
      } else {
        // Mock mode for development/testing
        console.log(`[MOCK SMS] To: ${phoneNumber}, OTP: ${otp}`);
      }

      // Log to database (audit trail)
      await this.logAuthAttempt({
        userId,
        authMethod: 'SMS_OTP',
        authPurpose: purpose,
        authSuccess: false, // Not verified yet
        otpSentTo: this.maskPhoneNumber(phoneNumber),
        otpExpiresAt: expiresAt,
      });

      return {
        success: true,
        otpId,
        expiresAt,
        message: `OTP sent to ${this.maskPhoneNumber(phoneNumber)}`,
      };
    } catch (error) {
      console.error('Error sending SMS OTP:', error);
      return {
        success: false,
        otpId: '',
        expiresAt: new Date(),
        error: 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Verify SMS OTP
   * PSD-12 Requirement: 2FA for EVERY payment
   */
  async verifySMSOTP(
    userId: string,
    otpId: string,
    otpCode: string,
    purpose: 'PAYMENT' | 'LOGIN' | 'PASSWORD_RESET' | 'SETTINGS_CHANGE' = 'PAYMENT'
  ): Promise<VerifyOTPResult> {
    try {
      const storedOTP = this.otpStore.get(otpId);

      if (!storedOTP) {
        await this.logAuthAttempt({
          userId,
          authMethod: 'SMS_OTP',
          authPurpose: purpose,
          authSuccess: false,
          failureReason: 'Invalid OTP ID',
        });
        return {
          success: false,
          error: 'Invalid or expired OTP. Please request a new code.',
        };
      }

      // Check if OTP is expired
      if (new Date() > storedOTP.expiresAt) {
        this.otpStore.delete(otpId);
        await this.logAuthAttempt({
          userId,
          authMethod: 'SMS_OTP',
          authPurpose: purpose,
          authSuccess: false,
          failureReason: 'OTP expired',
        });
        return {
          success: false,
          error: 'OTP has expired. Please request a new code.',
        };
      }

      // Check attempt count (max 3 attempts)
      if (storedOTP.attempts >= 3) {
        this.otpStore.delete(otpId);
        await this.logAuthAttempt({
          userId,
          authMethod: 'SMS_OTP',
          authPurpose: purpose,
          authSuccess: false,
          failureReason: 'Too many attempts',
        });
        return {
          success: false,
          error: 'Too many failed attempts. Please request a new code.',
        };
      }

      // Verify OTP
      const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

      if (otpHash !== storedOTP.otp) {
        storedOTP.attempts++;
        this.otpStore.set(otpId, storedOTP);

        await this.logAuthAttempt({
          userId,
          authMethod: 'SMS_OTP',
          authPurpose: purpose,
          authSuccess: false,
          authAttempts: storedOTP.attempts,
          failureReason: 'Incorrect OTP',
        });

        return {
          success: false,
          error: `Incorrect OTP. ${3 - storedOTP.attempts} attempts remaining.`,
        };
      }

      // OTP verified successfully
      this.otpStore.delete(otpId);

      await this.logAuthAttempt({
        userId,
        authMethod: 'SMS_OTP',
        authPurpose: purpose,
        authSuccess: true,
        authAttempts: storedOTP.attempts + 1,
      });

      return {
        success: true,
        message: 'OTP verified successfully',
      };
    } catch (error) {
      console.error('Error verifying SMS OTP:', error);
      return {
        success: false,
        error: 'Failed to verify OTP. Please try again.',
      };
    }
  }

  /**
   * Setup TOTP (Authenticator App)
   * More secure than SMS OTP, recommended for high-value transactions
   */
  async setupTOTP(userId: string, userEmail: string): Promise<TOTPSetupResult> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.config.totpIssuer} (${userEmail})`,
      issuer: this.config.totpIssuer,
    });

    // Generate QR code for easy scanning
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Store secret in database (encrypted)
    await this.storeTOTPSecret(userId, secret.base32, backupCodes);

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code from authenticator app
   */
  async verifyTOTP(
    userId: string,
    totpCode: string,
    purpose: 'PAYMENT' | 'LOGIN' | 'PASSWORD_RESET' | 'SETTINGS_CHANGE' = 'PAYMENT'
  ): Promise<VerifyOTPResult> {
    try {
      // Retrieve user's TOTP secret from database
      const totpSecret = await this.getTOTPSecret(userId);

      if (!totpSecret) {
        return {
          success: false,
          error: 'TOTP not set up for this user',
        };
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: totpSecret,
        encoding: 'base32',
        token: totpCode,
        window: 2, // Allow 2 time steps (±60 seconds) for clock drift
      });

      await this.logAuthAttempt({
        userId,
        authMethod: 'TOTP',
        authPurpose: purpose,
        authSuccess: verified,
        failureReason: verified ? undefined : 'Invalid TOTP code',
      });

      if (verified) {
        return {
          success: true,
          message: 'TOTP verified successfully',
        };
      } else {
        return {
          success: false,
          error: 'Invalid authenticator code',
        };
      }
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return {
        success: false,
        error: 'Failed to verify authenticator code',
      };
    }
  }

  /**
   * Verify backup code (for TOTP recovery)
   */
  async verifyBackupCode(userId: string, backupCode: string): Promise<VerifyOTPResult> {
    try {
      const backupCodes = await this.getBackupCodes(userId);

      if (!backupCodes || backupCodes.length === 0) {
        return {
          success: false,
          error: 'No backup codes available',
        };
      }

      const backupCodeHash = crypto.createHash('sha256').update(backupCode.trim()).digest('hex');

      const codeIndex = backupCodes.findIndex((code) => code === backupCodeHash);

      if (codeIndex === -1) {
        await this.logAuthAttempt({
          userId,
          authMethod: 'BACKUP_CODE',
          authPurpose: 'LOGIN',
          authSuccess: false,
          failureReason: 'Invalid backup code',
        });

        return {
          success: false,
          error: 'Invalid backup code',
        };
      }

      // Remove used backup code
      await this.removeBackupCode(userId, backupCodeHash);

      await this.logAuthAttempt({
        userId,
        authMethod: 'BACKUP_CODE',
        authPurpose: 'LOGIN',
        authSuccess: true,
      });

      return {
        success: true,
        message: 'Backup code verified successfully. This code can no longer be used.',
      };
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return {
        success: false,
        error: 'Failed to verify backup code',
      };
    }
  }

  /**
   * Biometric Authentication (WebAuthn/FIDO2)
   * Most secure option, uses device biometrics
   */
  async verifyBiometric(
    userId: string,
    biometricToken: string,
    purpose: 'PAYMENT' | 'LOGIN' | 'PASSWORD_RESET' | 'SETTINGS_CHANGE' = 'PAYMENT'
  ): Promise<VerifyOTPResult> {
    try {
      // Verify biometric token (implementation depends on your biometric provider)
      // This is a placeholder - integrate with your biometric authentication system
      const verified = await this.verifyBiometricToken(userId, biometricToken);

      await this.logAuthAttempt({
        userId,
        authMethod: 'BIOMETRIC',
        authPurpose: purpose,
        authSuccess: verified,
        failureReason: verified ? undefined : 'Biometric verification failed',
      });

      if (verified) {
        return {
          success: true,
          message: 'Biometric verification successful',
        };
      } else {
        return {
          success: false,
          error: 'Biometric verification failed',
        };
      }
    } catch (error) {
      console.error('Error verifying biometric:', error);
      return {
        success: false,
        error: 'Failed to verify biometric',
      };
    }
  }

  /**
   * Check if user has 2FA enabled
   * PSD-12 Requirement: 2FA MUST be enabled for payments
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    // Check if user has any 2FA method enabled
    const hasSMSOTP = await this.hasSMSOTPEnabled(userId);
    const hasTOTP = await this.getTOTPSecret(userId) !== null;
    const hasBiometric = await this.hasBiometricEnabled(userId);

    return hasSMSOTP || hasTOTP || hasBiometric;
  }

  /**
   * Get user's preferred 2FA method
   */
  async getPreferred2FAMethod(userId: string): Promise<string | null> {
    // Query database for user's preferred method
    // This is a placeholder - implement database query
    return 'SMS_OTP'; // Default to SMS OTP
  }

  // ==================== Private Helper Methods ====================

  private cleanupExpiredOTPs(): void {
    const now = new Date();
    for (const [otpId, data] of this.otpStore.entries()) {
      if (now > data.expiresAt) {
        this.otpStore.delete(otpId);
      }
    }
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '****';
    return phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4);
  }

  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // ==================== Database Integration Methods ====================
  // These methods should integrate with your actual database

  private async logAuthAttempt(data: any): Promise<void> {
    // TODO: Integrate with audit_logs database
    // INSERT INTO two_factor_auth_logs (...)
    console.log('[2FA LOG]', data);
  }

  private async storeTOTPSecret(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    // TODO: Store encrypted TOTP secret and hashed backup codes in database
    console.log(`[STORE TOTP] User: ${userId}`);
  }

  private async getTOTPSecret(userId: string): Promise<string | null> {
    // TODO: Retrieve TOTP secret from database
    return null;
  }

  private async getBackupCodes(userId: string): Promise<string[] | null> {
    // TODO: Retrieve backup codes from database
    return null;
  }

  private async removeBackupCode(userId: string, codeHash: string): Promise<void> {
    // TODO: Remove used backup code from database
  }

  private async verifyBiometricToken(userId: string, token: string): Promise<boolean> {
    // TODO: Integrate with biometric authentication system (WebAuthn/FIDO2)
    return false;
  }

  private async hasSMSOTPEnabled(userId: string): Promise<boolean> {
    // TODO: Check if user has phone number verified
    return true;
  }

  private async hasBiometricEnabled(userId: string): Promise<boolean> {
    // TODO: Check if user has biometric enabled
    return false;
  }
}

// Export singleton instance
export const twoFactorAuthService = new TwoFactorAuthService();
