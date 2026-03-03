/**
 * Email Service – Buffr G2P.
 * Handles sending OTP codes and notifications via email.
 * When EMAIL_PROVIDER=smtp (Namecheap Private Email), all mail (OTP, welcome, notifications)
 * is sent via SMTP. Templates: OTP and in-app templates in this file; extended templates
 * from emailTemplates.ts for transactions, vouchers, loans, groups, KYC, security.
 * Location: backend/src/lib/email.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import nodemailer from "nodemailer";
import {
  getMoneyReceivedHtml,
  getMoneySentHtml,
  getBillPaymentHtml,
  getTransactionFailedHtml,
  getRefundHtml,
  getVoucherCreatedHtml,
  getVoucherExpiringHtml,
  getVoucherExpiredHtml,
  getLoanApprovedHtml,
  getLoanRepaymentDueHtml,
  getLoanOverdueHtml,
  getLowBalanceHtml,
  getGroupPaymentReceivedHtml,
  getGroupRequestHtml,
  getPinChangedHtml,
  getDeviceAddedHtml,
  getGenericSuccessHtml,
  getGenericInfoHtml,
  getGenericAlertHtml,
} from "./emailTemplates.js";

// Load environment
config({ path: resolve(process.cwd(), "backend/.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "backend/.env.local") });

// ============================================================================
// Configuration
// ============================================================================

interface EmailConfig {
  provider: "sendgrid" | "resend" | "smtp";
  sendgrid: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  resend: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string;
  };
  // Default from addresses for different purposes
  aliases: {
    noreply: string;
    support: string;
    security: string;
    billing: string;
  };
}

function getEmailConfig(): EmailConfig {
  return {
    provider: (process.env.EMAIL_PROVIDER ?? "sendgrid") as EmailConfig["provider"],
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY ?? "",
      fromEmail: process.env.FROM_EMAIL ?? "noreply@buffr.ai",
      fromName: "Buffr",
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY ?? "",
      fromEmail: process.env.FROM_EMAIL ?? "noreply@buffr.ai",
      fromName: "Buffr",
    },
    smtp: {
      host: process.env.SMTP_HOST ?? "",
      port: parseInt(process.env.SMTP_PORT ?? "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
      fromEmail: process.env.SMTP_FROM_EMAIL ?? process.env.FROM_EMAIL ?? "noreply@buffr.ai",
      fromName: process.env.FROM_NAME ?? "Buffr",
    },
    aliases: {
      noreply: process.env.EMAIL_ALIAS_NOREPLY ?? "no-reply@buffr.ai",
      support: process.env.EMAIL_ALIAS_SUPPORT ?? "support@buffr.ai",
      security: process.env.EMAIL_ALIAS_SECURITY ?? "security@buffr.ai",
      billing: process.env.EMAIL_ALIAS_BILLING ?? "billing@buffr.ai",
    },
  };
}

const config_ = getEmailConfig();

// ============================================================================
// Email Types
// ============================================================================

export type EmailPurpose = 
  | "otp_login" 
  | "otp_register" 
  | "otp_change_pin" 
  | "otp_reset_pin" 
  | "otp_verify_phone"
  | "welcome"
  | "phone_verified"
  | "email_verified"
  | "transaction_alert"
  | "money_received"
  | "money_sent"
  | "bill_payment"
  | "voucher_created"
  | "voucher_expiring"
  | "voucher_expired"
  | "loan_approved"
  | "loan_repayment_due"
  | "loan_repayment_overdue"
  | "wallet_low_balance"
  | "kyc_document_uploaded"
  | "kyc_approved"
  | "kyc_rejected"
  | "account_suspended"
  | "account_reactivated"
  | "device_added"
  | "password_changed"
  | "pin_changed"
  | "transaction_failed"
  | "refund_processed"
  | "group_payment_received"
  | "group_request_received"
  | "security_alert"
  | "account_verified"
  | "login_alert";

export interface EmailData {
  to: string;
  purpose: EmailPurpose;
  data?: Record<string, string | number>;
}

// ============================================================================
// Email Templates
// ============================================================================

interface EmailTemplate {
  subject: string;
  from: string;
  fromName: string;
  html: string;
  text: string;
}

function getEmailTemplate(purpose: EmailPurpose, data?: Record<string, string | number>): EmailTemplate {
  const appName = "Buffr";
  const currentYear = new Date().getFullYear();
  
  const templates: Partial<Record<EmailPurpose, EmailTemplate>> = {
    // OTP Templates
    otp_login: {
      subject: `Your ${appName} Login Code`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getOtpEmailHtml(
        "Login Verification",
        `Your verification code for logging into ${appName} is:`,
        data?.code as string,
        data?.expiresIn as number
      ),
      text: getOtpEmailText(
        "Login Verification",
        `Your verification code for logging into ${appName} is: ${data?.code}`,
        data?.expiresIn as number
      ),
    },
    
    otp_register: {
      subject: `Welcome to ${appName} - Verify Your Account`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getOtpEmailHtml(
        "Account Verification",
        `Welcome to ${appName}! Your account verification code is:`,
        data?.code as string,
        data?.expiresIn as number
      ),
      text: getOtpEmailText(
        "Account Verification",
        `Welcome to ${appName}! Your account verification code is: ${data?.code}`,
        data?.expiresIn as number
      ),
    },
    
    otp_change_pin: {
      subject: `${appName} - PIN Change Verification`,
      from: config_.aliases.security,
      fromName: `${appName} Security`,
      html: getOtpEmailHtml(
        "PIN Change Request",
        `Your code to change your ${appName} PIN is:`,
        data?.code as string,
        data?.expiresIn as number
      ),
      text: getOtpEmailText(
        "PIN Change Request",
        `Your code to change your ${appName} PIN is: ${data?.code}`,
        data?.expiresIn as number
      ),
    },
    
    otp_reset_pin: {
      subject: `${appName} - Reset Your PIN`,
      from: config_.aliases.security,
      fromName: `${appName} Security`,
      html: getOtpEmailHtml(
        "PIN Reset Request",
        `Your code to reset your ${appName} PIN is:`,
        data?.code as string,
        data?.expiresIn as number
      ),
      text: getOtpEmailText(
        "PIN Reset Request",
        `Your code to reset your ${appName} PIN is: ${data?.code}`,
        data?.expiresIn as number
      ),
    },
    
    otp_verify_phone: {
      subject: `${appName} - Verify Your Phone Number`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getOtpEmailHtml(
        "Phone Verification",
        `Your code to verify your phone number is:`,
        data?.code as string,
        data?.expiresIn as number
      ),
      text: getOtpEmailText(
        "Phone Verification",
        `Your code to verify your phone number is: ${data?.code}`,
        data?.expiresIn as number
      ),
    },
    
    // Notification Templates
    welcome: {
      subject: `Welcome to ${appName} - Your Digital Wallet`,
      from: config_.aliases.support,
      fromName: appName,
      html: getWelcomeEmailHtml(data),
      text: `Welcome to ${appName}! Your account has been created successfully.`,
    },
    
    transaction_alert: {
      subject: `${appName} - Transaction Alert`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getTransactionAlertHtml(data),
      text: `Transaction Alert: ${data?.amount} ${data?.currency} - ${data?.type}`,
    },
    
    security_alert: {
      subject: `${appName} - Security Alert`,
      from: config_.aliases.security,
      fromName: `${appName} Security`,
      html: getSecurityAlertHtml(data),
      text: `Security Alert: ${data?.message}`,
    },
    
    account_verified: {
      subject: `${appName} - Account Verified`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getAccountVerifiedHtml(data),
      text: `Your ${appName} account has been verified successfully!`,
    },
    
    password_changed: {
      subject: `${appName} - Password Changed`,
      from: config_.aliases.security,
      fromName: `${appName} Security`,
      html: getPasswordChangedHtml(data),
      text: `Your ${appName} password has been changed.`,
    },
    
    login_alert: {
      subject: `${appName} - New Login Detected`,
      from: config_.aliases.security,
      fromName: `${appName} Security`,
      html: getLoginAlertHtml(data),
      text: `New login to your ${appName} account from ${data?.location}`,
    },

    money_received: {
      subject: `${appName} - Money Received`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getMoneyReceivedHtml(data),
      text: `You received ${data?.currency || "N$"} ${data?.amount || "0"} from ${data?.sender || "someone"}. Ref: ${data?.reference || "N/A"}`,
    },
    money_sent: {
      subject: `${appName} - Money Sent`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getMoneySentHtml(data),
      text: `You sent ${data?.currency || "N$"} ${data?.amount || "0"} to ${data?.recipient || "someone"}. Ref: ${data?.reference || "N/A"}`,
    },
    bill_payment: {
      subject: `${appName} - Bill Payment Confirmed`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getBillPaymentHtml(data),
      text: `Bill payment ${data?.currency || "N$"} ${data?.amount || "0"} to ${data?.biller || "biller"}. Ref: ${data?.reference || "N/A"}`,
    },
    transaction_failed: {
      subject: `${appName} - Transaction Failed`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getTransactionFailedHtml(data),
      text: `Transaction of ${data?.currency || "N$"} ${data?.amount || "0"} could not be completed. ${data?.reason || "Please try again or contact support."}`,
    },
    refund_processed: {
      subject: `${appName} - Refund Processed`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getRefundHtml(data),
      text: `Refund of ${data?.currency || "N$"} ${data?.amount || "0"} has been processed. Ref: ${data?.reference || "N/A"}`,
    },
    voucher_created: {
      subject: `${appName} - Voucher Created`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getVoucherCreatedHtml(data),
      text: `Your voucher ${data?.currency || "N$"} ${data?.amount || "0"} - Code: ${data?.voucherCode || "XXXXXX"}, Expires: ${data?.expiryDate || "30 days"}`,
    },
    voucher_expiring: {
      subject: `${appName} - Voucher Expiring Soon`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getVoucherExpiringHtml(data),
      text: `Your voucher ${data?.currency || "N$"} ${data?.amount || "0"} (${data?.voucherCode || "XXXXXX"}) expires ${data?.expiryDate || "soon"}.`,
    },
    voucher_expired: {
      subject: `${appName} - Voucher Expired`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getVoucherExpiredHtml(data),
      text: `Your voucher of ${data?.currency || "N$"} ${data?.amount || "0"} has expired.`,
    },
    loan_approved: {
      subject: `${appName} - Loan Approved`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getLoanApprovedHtml(data),
      text: `Your loan of ${data?.currency || "N$"} ${data?.amount || "0"} has been approved. Loan ID: ${data?.loanId || "N/A"}`,
    },
    loan_repayment_due: {
      subject: `${appName} - Repayment Due`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getLoanRepaymentDueHtml(data),
      text: `Loan repayment ${data?.currency || "N$"} ${data?.amount || "0"} is due ${data?.dueDate || "soon"}. Loan ID: ${data?.loanId || "N/A"}`,
    },
    loan_repayment_overdue: {
      subject: `${appName} - Repayment Overdue`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getLoanOverdueHtml(data),
      text: `Loan repayment ${data?.currency || "N$"} ${data?.amount || "0"} is ${data?.daysOverdue || "1"} day(s) overdue. Loan ID: ${data?.loanId || "N/A"}`,
    },
    wallet_low_balance: {
      subject: `${appName} - Low Balance Alert`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getLowBalanceHtml(data),
      text: `Your wallet balance is ${data?.currency || "N$"} ${data?.balance || "0"} (below ${data?.threshold || "100"}).`,
    },
    group_payment_received: {
      subject: `${appName} - Group Payment Received`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getGroupPaymentReceivedHtml(data),
      text: `You received ${data?.currency || "N$"} ${data?.amount || "0"} in ${data?.groupName || "a group"} from ${data?.payer || "someone"}.`,
    },
    group_request_received: {
      subject: `${appName} - Payment Request`,
      from: config_.aliases.billing,
      fromName: `${appName} Alerts`,
      html: getGroupRequestHtml(data),
      text: `${data?.requester || "Someone"} requested ${data?.currency || "N$"} ${data?.amount || "0"} in ${data?.groupName || "a group"}.`,
    },
    pin_changed: {
      subject: `${appName} - PIN Changed`,
      from: config_.aliases.security,
      fromName: `${appName} Security`,
      html: getPinChangedHtml(data),
      text: `Your Buffr PIN was changed. Time: ${data?.timestamp || new Date().toLocaleString()}. If this wasn't you, contact support.`,
    },
    device_added: {
      subject: `${appName} - New Device Added`,
      from: config_.aliases.security,
      fromName: `${appName} Security`,
      html: getDeviceAddedHtml(data),
      text: `New device added to your account: ${data?.device || "Unknown"}, ${data?.location || "Unknown"}. Time: ${data?.timestamp || new Date().toLocaleString()}.`,
    },
    phone_verified: {
      subject: `${appName} - Phone Verified`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getGenericSuccessHtml("Phone Verified", "Your phone number has been verified successfully.", data),
      text: "Your Buffr phone number has been verified successfully.",
    },
    email_verified: {
      subject: `${appName} - Email Verified`,
      from: config_.aliases.noreply,
      fromName: appName,
      html: getGenericSuccessHtml("Email Verified", "Your email has been verified successfully.", data),
      text: "Your Buffr email has been verified successfully.",
    },
    kyc_document_uploaded: {
      subject: `${appName} - KYC Document Received`,
      from: config_.aliases.support,
      fromName: appName,
      html: getGenericInfoHtml("Document Received", "We have received your KYC document.", "We will review it and notify you shortly.", data),
      text: "We have received your KYC document and will review it shortly.",
    },
    kyc_approved: {
      subject: `${appName} - KYC Approved`,
      from: config_.aliases.support,
      fromName: appName,
      html: getGenericSuccessHtml("KYC Approved", "Your identity has been verified. You now have full access to all Buffr features.", data),
      text: "Your KYC has been approved. You now have full access to all Buffr features!",
    },
    kyc_rejected: {
      subject: `${appName} - KYC Update`,
      from: config_.aliases.support,
      fromName: appName,
      html: getGenericAlertHtml("KYC Update", "We could not verify your documents.", data?.reason as string || "Please ensure your documents are clear and not expired.", data),
      text: `KYC update: ${data?.reason || "Please ensure your documents are clear and not expired."}`,
    },
    account_suspended: {
      subject: `${appName} - Account Suspended`,
      from: config_.aliases.security,
      fromName: `${appName} Security`,
      html: getGenericAlertHtml("Account Suspended", "Your account has been temporarily suspended.", data?.reason as string || "For your protection, we've temporarily restricted your account. Contact support.", data),
      text: `Your account has been suspended. ${data?.reason || "Contact support."}`,
    },
    account_reactivated: {
      subject: `${appName} - Account Reactivated`,
      from: config_.aliases.support,
      fromName: appName,
      html: getGenericSuccessHtml("Account Reactivated", "Your Buffr account has been reactivated. You can sign in again.", data),
      text: "Your Buffr account has been reactivated. You can sign in again.",
    },
  };
  
  const template = templates[purpose];
  if (!template) {
    // Fallback template for missing purposes
    return {
      subject: `Notification from Buffr`,
      from: config_.aliases.noreply,
      fromName: "Buffr",
      html: `<p>You have a new notification from Buffr.</p><p>${JSON.stringify(data || {})}</p>`,
      text: `You have a new notification from Buffr. Details: ${JSON.stringify(data || {})}`,
    };
  }
  return template;
}

// ============================================================================
// HTML Template Generators
// ============================================================================

function getOtpEmailHtml(title: string, message: string, code?: string, expiresIn?: number): string {
  const appName = "Buffr";
  const accentColor = "#7C3AED";
  const expiresText = expiresIn ? `${Math.floor((expiresIn || 300) / 60)} minutes` : "5 minutes";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${accentColor}, #5B21B6); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${appName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Digital Wallet</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px; font-weight: 600;">${title}</h2>
              <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px; line-height: 1.5;">${message}</p>
              <!-- OTP Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <span style="font-size: 32px; font-weight: 700; color: ${accentColor}; letter-spacing: 8px;">${code || "------"}</span>
                  </td>
                </tr>
              </table>
              <p style="color: #9ca3af; margin: 0; font-size: 13px;">This code expires in ${expiresText}.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 24px; text-align: center;">
              <p style="color: #9ca3af; margin: 0 0 8px; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function getOtpEmailText(title: string, message: string, expiresIn?: number): string {
  const expiresText = expiresIn ? `${Math.floor((expiresIn || 300) / 60)} minutes` : "5 minutes";
  return `
${title}
${message}

This code expires in ${expiresText}.

If you didn't request this code, please ignore this email.
© ${new Date().getFullYear()} Buffr. All rights reserved.
`.trim();
}

function getWelcomeEmailHtml(data?: Record<string, string | number>): string {
  const appName = "Buffr";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="color: #1f2937; margin: 0 0 16px;">Welcome to ${appName}!</h2>
              <p style="color: #6b7280; line-height: 1.5;">Your account has been created successfully. Start using your digital wallet to send and receive money, pay bills, and more.</p>
              <p style="color: #6b7280; line-height: 1.5;">Need help? Contact us at support@buffr.ai</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${appName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function getTransactionAlertHtml(data?: Record<string, string | number>): string {
  const amount = data?.amount || "0";
  const currency = data?.currency || "NAD";
  const type = data?.type || "payment";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #7C3AED; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">Transaction Alert</h1>
        </td></tr>
        <tr><td style="padding: 24px; text-align: center;">
          <p style="font-size: 14px; color: #666;">A ${type} of</p>
          <p style="font-size: 36px; font-weight: bold; margin: 8px 0;">${currency} ${amount}</p>
          <p style="font-size: 14px; color: #666;">has been processed</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

function getSecurityAlertHtml(data?: Record<string, string | number>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #DC2626; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">⚠️ Security Alert</h1>
        </td></tr>
        <tr><td style="padding: 24px;">
          <p style="color: #333;">${data?.message || "We noticed unusual activity on your account."}</p>
          <p style="color: #666; font-size: 14px;">If this wasn't you, please contact support immediately.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

function getAccountVerifiedHtml(data?: Record<string, string | number>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #10B981; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">✓ Account Verified</h1>
        </td></tr>
        <tr><td style="padding: 24px;">
          <p style="color: #333;">Your account has been verified successfully!</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

function getPasswordChangedHtml(data?: Record<string, string | number>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #7C3AED; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">Password Changed</h1>
        </td></tr>
        <tr><td style="padding: 24px;">
          <p style="color: #333;">Your password has been changed successfully.</p>
          <p style="color: #666; font-size: 14px;">If you didn't change your password, please contact support immediately.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

function getLoginAlertHtml(data?: Record<string, string | number>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f5f5; padding: 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width: 480px; background: #fff; border-radius: 12px;">
        <tr><td style="background: #F59E0B; padding: 24px; text-align: center; color: #fff; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0;">New Login Detected</h1>
        </td></tr>
        <tr><td style="padding: 24px;">
          <p style="color: #333;">A new login to your account from:</p>
          <p style="font-size: 18px; font-weight: bold; color: #7C3AED;">${data?.location || "Unknown location"}</p>
          <p style="color: #666; font-size: 14px;">Time: ${data?.time || "Just now"}</p>
          <p style="color: #666; font-size: 14px;">Device: ${data?.device || "Unknown device"}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim();
}

// ============================================================================
// Send Email Functions
// ============================================================================

/**
 * Send an email using the configured provider.
 */
export async function sendEmail(data: EmailData): Promise<boolean> {
  const template = getEmailTemplate(data.purpose, data.data);
  
  // Try SendGrid
  if (config_.provider === "sendgrid" && config_.sendgrid.apiKey) {
    return sendWithSendGrid(data.to, template);
  }
  
  // Try Resend
  if (config_.provider === "resend" && config_.resend.apiKey) {
    return sendWithResend(data.to, template);
  }
  
  // Try SMTP
  if (config_.provider === "smtp" && config_.smtp.host) {
    return sendWithSmtp(data.to, template);
  }
  
  // Log for development
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] Email to ${data.to}:`, {
      subject: template.subject,
      html: template.html.substring(0, 100) + "...",
    });
    return true;
  }
  
  console.error("No email provider configured");
  return false;
}

/**
 * Send email via SendGrid API.
 */
async function sendWithSendGrid(to: string, template: EmailTemplate): Promise<boolean> {
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config_.sendgrid.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: template.from, name: template.fromName },
        subject: template.subject,
        content: [
          { type: "text/plain", value: template.text },
          { type: "text/html", value: template.html },
        ],
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error("SendGrid error:", error);
    return false;
  }
}

/**
 * Send email via Resend API.
 */
async function sendWithResend(to: string, template: EmailTemplate): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config_.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        from: `${template.fromName} <${template.from}>`,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error("Resend error:", error);
    return false;
  }
}

/**
 * Send email via SMTP using nodemailer.
 */
async function sendWithSmtp(to: string, template: EmailTemplate): Promise<boolean> {
  try {
    const { host, port, secure, user, pass, fromEmail, fromName } = config_.smtp;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    return true;
  } catch (error) {
    console.error("SMTP send error:", error);
    return false;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Send OTP via email.
 */
export async function sendOtpEmail(
  to: string,
  purpose: EmailPurpose,
  code: string,
  expiresInSeconds: number = 300
): Promise<boolean> {
  return sendEmail({
    to,
    purpose,
    data: {
      code,
      expiresIn: expiresInSeconds,
    },
  });
}

/**
 * Send welcome email.
 */
export async function sendWelcomeEmail(to: string, name?: string): Promise<boolean> {
  return sendEmail({
    to,
    purpose: "welcome",
    data: { name: name || "User" },
  });
}

/**
 * Send transaction alert.
 */
export async function sendTransactionAlert(
  to: string,
  amount: string,
  currency: string,
  type: string
): Promise<boolean> {
  return sendEmail({
    to,
    purpose: "transaction_alert",
    data: { amount, currency, type },
  });
}

/**
 * Send security alert.
 */
export async function sendSecurityAlert(to: string, message: string): Promise<boolean> {
  return sendEmail({
    to,
    purpose: "security_alert",
    data: { message },
  });
}

export default {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendTransactionAlert,
  sendSecurityAlert,
};
