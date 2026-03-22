/**
 * SendGrid Email Service for SmartPay
 * 
 * Purpose: Production email delivery for compliance alerts, receipts, and notifications
 * 
 * Features:
 * - HTML + text email templates
 * - Compliance alerts (immediate delivery)
 * - Trust reconciliation notifications
 * - Transaction receipts
 * - Queue for failed emails with retry
 * - Audit logging (7-year retention per PSD-12)
 * 
 * Standards:
 * - PSD-12: Audit trail for compliance communications
 * - BoN: Regulatory reporting notifications
 * - ISO 27001: Secure email delivery
 */

import crypto from 'crypto';
import { query } from '../../lib/db';

interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
  allowDevFallback: boolean;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: 'compliance_alert' | 'trust_reconciliation' | 'receipt' | 'notification';
  priority?: number; // 1-10 (1=highest)
  metadata?: Record<string, unknown>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

const config: SendGridConfig = {
  apiKey: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@smartpay.na',
  fromName: process.env.SMTP_FROM_NAME || 'SmartPay',
  enabled: !!process.env.SENDGRID_API_KEY,
  allowDevFallback: process.env.ALLOW_DEV_FALLBACK === 'true',
};

/**
 * Hash email for privacy-compliant storage
 */
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

/**
 * Extract domain from email
 */
function getEmailDomain(email: string): string {
  const parts = email.split('@');
  return parts[1] || '';
}

/**
 * Get priority for email type
 */
function getPriority(type: string): number {
  const priorities: Record<string, number> = {
    compliance_alert: 1, // Highest priority
    trust_reconciliation: 3,
    receipt: 5,
    notification: 7,
  };
  return priorities[type] || 5;
}

/**
 * Log email delivery to database
 */
async function logEmailDelivery(
  email: string,
  subject: string,
  type: string,
  status: string,
  result: EmailResult,
  retryCount: number = 0
): Promise<void> {
  try {
    await query(
      `INSERT INTO email_logs (
        recipient_email_hash,
        recipient_domain,
        subject,
        email_type,
        status,
        provider,
        message_id,
        error_code,
        error_message,
        retry_count,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        hashEmail(email),
        getEmailDomain(email),
        subject,
        type,
        status,
        result.provider,
        result.messageId || null,
        null, // error_code (could extract from SendGrid)
        result.error || null,
        retryCount,
        JSON.stringify({ type }),
      ]
    );
  } catch (error) {
    console.error('[SendGrid] Failed to log email delivery:', error);
  }
}

/**
 * Queue email for retry
 */
async function queueEmailForRetry(options: EmailOptions): Promise<void> {
  try {
    const priority = options.priority || getPriority(options.type);
    const nextRetry = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
    
    await query(
      `INSERT INTO email_queue (
        recipient_email,
        subject,
        body_html,
        body_text,
        email_type,
        priority,
        next_retry_at,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        options.to,
        options.subject,
        options.html,
        options.text || '',
        options.type,
        priority,
        nextRetry.toISOString(),
        JSON.stringify(options.metadata || {}),
      ]
    );
    
    console.log(`[SendGrid] Email queued for retry: ${options.subject}`);
  } catch (error) {
    console.error('[SendGrid] Failed to queue email:', error);
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  const { apiKey, fromEmail, fromName } = config;
  
  if (!apiKey) {
    throw new Error('SendGrid API key not configured');
  }
  
  try {
    const payload = {
      personalizations: [
        {
          to: [{ email: options.to }],
          subject: options.subject,
        },
      ],
      from: {
        email: fromEmail,
        name: fromName,
      },
      content: [
        {
          type: 'text/html',
          value: options.html,
        },
      ],
    };
    
    // Add plain text version if provided
    if (options.text) {
      payload.content.unshift({
        type: 'text/plain',
        value: options.text,
      });
    }
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }
    
    // SendGrid returns 202 Accepted with X-Message-Id header
    const messageId = response.headers.get('x-message-id') || undefined;
    
    return {
      success: true,
      messageId,
      provider: 'sendgrid',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SendGrid] Send failed:', errorMessage);
    
    return {
      success: false,
      provider: 'sendgrid',
      error: errorMessage,
    };
  }
}

/**
 * Send email via mock/test mode
 */
function sendViaMock(options: EmailOptions): EmailResult {
  console.log('[SendGrid Mock] Email not sent (development mode)');
  console.log(`[SendGrid Mock] To: ${options.to}`);
  console.log(`[SendGrid Mock] Subject: ${options.subject}`);
  console.log(`[SendGrid Mock] Type: ${options.type}`);
  
  return {
    success: true,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    provider: 'test',
  };
}

/**
 * Send email (main function)
 */
async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  let result: EmailResult;
  
  if (!config.enabled && config.allowDevFallback) {
    console.log('[SendGrid] Not configured, using mock mode (ALLOW_DEV_FALLBACK=true)');
    result = sendViaMock(options);
  } else if (!config.enabled) {
    result = {
      success: false,
      provider: 'sendgrid',
      error: 'SendGrid not configured and dev fallback disabled',
    };
  } else {
    result = await sendViaSendGrid(options);
  }
  
  // Log delivery
  const status = result.success ? 'sent' : 'failed';
  await logEmailDelivery(options.to, options.subject, options.type, status, result);
  
  // Queue for retry if failed
  if (!result.success && config.enabled) {
    await queueEmailForRetry(options);
  }
  
  return result;
}

/**
 * Send compliance alert email
 */
export async function sendComplianceAlert(
  to: string,
  subject: string,
  body: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Compliance Alert</h1>
        </div>
        <div class="content">
          <div class="alert">
            <strong>IMMEDIATE ACTION REQUIRED</strong>
          </div>
          <p>${body.replace(/\n/g, '<br>')}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <div class="footer">
          <p>SmartPay Compliance System | Automated Alert</p>
          <p>This is a system-generated email. Do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
⚠️ COMPLIANCE ALERT - IMMEDIATE ACTION REQUIRED

${subject}

${body}

Timestamp: ${new Date().toISOString()}

---
SmartPay Compliance System
This is a system-generated email.
  `.trim();
  
  return sendEmail({
    to,
    subject: `⚠️ COMPLIANCE ALERT: ${subject}`,
    html,
    text,
    type: 'compliance_alert',
    priority: 1,
  });
}

/**
 * Send trust reconciliation alert
 */
export async function sendTrustReconciliationAlert(
  to: string,
  discrepancy: number,
  details: Record<string, unknown>
): Promise<EmailResult> {
  const subject = `Trust Account Discrepancy: NAD ${Math.abs(discrepancy).toFixed(2)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f3f4f6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Trust Account Reconciliation</h1>
        </div>
        <div class="content">
          <div class="warning">
            <strong>Discrepancy Detected: NAD ${Math.abs(discrepancy).toFixed(2)}</strong>
          </div>
          <table>
            <tr>
              <th>Detail</th>
              <th>Value</th>
            </tr>
            ${Object.entries(details)
              .map(
                ([key, value]) =>
                  `<tr><td>${key}</td><td>${typeof value === 'number' ? `NAD ${value.toFixed(2)}` : value}</td></tr>`
              )
              .join('')}
          </table>
          <p><strong>Action Required:</strong> Review and reconcile immediately per PSD-12 requirements.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <div class="footer">
          <p>SmartPay Trust Account System | Automated Alert</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
⚠️ TRUST ACCOUNT RECONCILIATION ALERT

Discrepancy Detected: NAD ${Math.abs(discrepancy).toFixed(2)}

Details:
${Object.entries(details)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

Action Required: Review and reconcile immediately per PSD-12 requirements.

Timestamp: ${new Date().toISOString()}

---
SmartPay Trust Account System
  `.trim();
  
  return sendEmail({
    to,
    subject,
    html,
    text,
    type: 'trust_reconciliation',
    priority: 3,
  });
}

/**
 * Send transaction receipt
 */
export async function sendTransactionReceipt(
  to: string,
  transaction: {
    id: string;
    type: string;
    amount: number;
    currency: string;
    timestamp: string;
    recipient?: string;
  }
): Promise<EmailResult> {
  const subject = `SmartPay Receipt - ${transaction.type} Transaction`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .receipt { background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 15px 0; }
        .amount { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; margin: 20px 0; }
        table { width: 100%; }
        td { padding: 10px 0; }
        .label { color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Transaction Successful</h1>
        </div>
        <div class="content">
          <div class="receipt">
            <div class="amount">${transaction.currency} ${transaction.amount.toFixed(2)}</div>
            <table>
              <tr>
                <td class="label">Transaction Type:</td>
                <td><strong>${transaction.type}</strong></td>
              </tr>
              <tr>
                <td class="label">Transaction ID:</td>
                <td>${transaction.id}</td>
              </tr>
              ${transaction.recipient ? `<tr><td class="label">Recipient:</td><td>${transaction.recipient}</td></tr>` : ''}
              <tr>
                <td class="label">Date & Time:</td>
                <td>${new Date(transaction.timestamp).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <p style="text-align: center; color: #6b7280;">
            Thank you for using SmartPay!
          </p>
        </div>
        <div class="footer">
          <p>SmartPay - Digital Wallet for Namibia</p>
          <p>Keep this receipt for your records.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
✓ TRANSACTION SUCCESSFUL

Amount: ${transaction.currency} ${transaction.amount.toFixed(2)}
Type: ${transaction.type}
Transaction ID: ${transaction.id}
${transaction.recipient ? `Recipient: ${transaction.recipient}\n` : ''}Date & Time: ${new Date(transaction.timestamp).toLocaleString()}

Thank you for using SmartPay!

---
SmartPay - Digital Wallet for Namibia
Keep this receipt for your records.
  `.trim();
  
  return sendEmail({
    to,
    subject,
    html,
    text,
    type: 'receipt',
    priority: 5,
  });
}

/**
 * Process email retry queue (called by cron job)
 */
export async function processEmailQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  try {
    // Get pending emails from retry queue
    const result = await query<{
      id: string;
      recipient_email: string;
      subject: string;
      body_html: string;
      body_text: string;
      email_type: string;
      attempt_count: number;
      max_attempts: number;
    }>(
      `SELECT * FROM email_retry_queue LIMIT 50`
    );
    
    for (const email of result.rows) {
      processed++;
      
      // Mark as processing
      await query(
        `UPDATE email_queue SET status = 'processing', updated_at = NOW() WHERE id = $1`,
        [email.id]
      );
      
      // Attempt to send
      const sendResult = await sendViaSendGrid({
        to: email.recipient_email,
        subject: email.subject,
        html: email.body_html,
        text: email.body_text,
        type: email.email_type as any,
      });
      
      if (sendResult.success) {
        succeeded++;
        await query(
          `UPDATE email_queue SET status = 'sent', updated_at = NOW() WHERE id = $1`,
          [email.id]
        );
      } else {
        failed++;
        const newAttemptCount = email.attempt_count + 1;
        
        if (newAttemptCount >= email.max_attempts) {
          // Move to dead letter queue
          await query(
            `UPDATE email_queue 
             SET status = 'dead_letter', 
                 attempt_count = $2,
                 error_message = $3,
                 updated_at = NOW() 
             WHERE id = $1`,
            [email.id, newAttemptCount, sendResult.error]
          );
        } else {
          // Schedule next retry with exponential backoff
          const backoffMinutes = Math.pow(2, newAttemptCount) * 5; // 5, 10, 20, 40 minutes
          const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);
          
          await query(
            `UPDATE email_queue 
             SET status = 'pending',
                 attempt_count = $2,
                 next_retry_at = $3,
                 error_message = $4,
                 updated_at = NOW()
             WHERE id = $1`,
            [email.id, newAttemptCount, nextRetry.toISOString(), sendResult.error]
          );
        }
      }
    }
  } catch (error) {
    console.error('[SendGrid] Queue processing error:', error);
  }
  
  return { processed, succeeded, failed };
}

/**
 * Check if SendGrid is configured
 */
export function isSendGridConfigured(): boolean {
  return config.enabled;
}
