// =====================================================
// ALERT NOTIFICATION SERVICE
// Handles Email, SMS, and Slack notifications for compliance alerts
// =====================================================

import { query } from '../../lib/db';
import twilio from 'twilio';

// =====================================================
// TYPES
// =====================================================

interface NotificationConfig {
  sendgridApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  slackWebhookUrl?: string;
  fromEmail?: string;
  fromName?: string;
}

interface EmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface SMSParams {
  to: string;
  message: string;
}

// =====================================================
// ALERT NOTIFICATION SERVICE
// =====================================================

export class AlertNotificationService {
  private config: NotificationConfig;
  private twilioClient?: ReturnType<typeof twilio>;
  
  constructor(config?: NotificationConfig) {
    this.config = config || this.loadConfigFromEnv();
    
    // Initialize Twilio if credentials available
    if (this.config.twilioAccountSid && this.config.twilioAuthToken) {
      this.twilioClient = twilio(
        this.config.twilioAccountSid,
        this.config.twilioAuthToken
      );
    }
  }
  
  private loadConfigFromEnv(): NotificationConfig {
    return {
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      fromEmail: process.env.SMTP_FROM_EMAIL || 'compliance@smartpay.na',
      fromName: process.env.SMTP_FROM_NAME || 'SmartPay Compliance'
    };
  }
  
  /**
   * Process pending notifications from alert_notifications table
   */
  async processPendingNotifications(): Promise<void> {
    console.log('[Notifications] Processing pending alert notifications...');
    
    try {
      // Get pending notifications
      const result = await query<{
        id: number;
        alert_id: number;
        notification_type: 'EMAIL' | 'SMS' | 'SLACK' | 'PUSH' | 'WEBHOOK';
        recipient: string;
        alert_severity: string;
        alert_title: string;
        alert_message: string;
        alert_actions: string[];
        alert_data: any;
      }>(
        `SELECT 
          an.id,
          an.alert_id,
          an.notification_type,
          an.recipient,
          ca.severity as alert_severity,
          ca.title as alert_title,
          ca.message as alert_message,
          ca.actions_required as alert_actions,
          ca.data as alert_data
         FROM alert_notifications an
         JOIN compliance_alerts ca ON ca.id = an.alert_id
         WHERE an.status = 'PENDING'
         ORDER BY ca.severity DESC, an.created_at
         LIMIT 100`
      );
      
      const notifications = result.rows;
      
      if (notifications.length === 0) {
        console.log('[Notifications] No pending notifications');
        return;
      }
      
      console.log(`[Notifications] Processing ${notifications.length} notifications...`);
      
      // Process each notification
      for (const notification of notifications) {
        try {
          // Mark as in progress
          await this.updateNotificationStatus(notification.id, 'SENT');
          
          // Send based on type
          switch (notification.notification_type) {
            case 'EMAIL':
              await this.sendEmail({
                to: notification.recipient,
                subject: `[${notification.alert_severity}] ${notification.alert_title}`,
                body: this.formatAlertEmail(
                  notification.alert_title,
                  notification.alert_message,
                  notification.alert_severity,
                  notification.alert_actions,
                  notification.alert_data
                )
              });
              break;
              
            case 'SMS':
              await this.sendSMS({
                to: notification.recipient,
                message: `[${notification.alert_severity}] ${notification.alert_title}. Check email for details.`
              });
              break;
              
            case 'SLACK':
              await this.sendSlackNotification({
                severity: notification.alert_severity,
                title: notification.alert_title,
                message: notification.alert_message,
                actions: notification.alert_actions
              });
              break;
          }
          
          // Mark as delivered
          await this.updateNotificationStatus(notification.id, 'DELIVERED');
          console.log(`[Notifications] Sent ${notification.notification_type} to ${notification.recipient}`);
          
        } catch (error) {
          console.error(`[Notifications] Failed to send notification ${notification.id}:`, error);
          await this.updateNotificationStatus(
            notification.id,
            'FAILED',
            (error as Error).message
          );
        }
      }
      
      console.log('[Notifications] Batch processing complete');
      
    } catch (error) {
      console.error('[Notifications] Error processing notifications:', error);
      throw error;
    }
  }
  
  /**
   * Send email notification
   */
  async sendEmail(params: EmailParams): Promise<void> {
    const { to, subject, body, html } = params;
    
    // If SendGrid API key is available, use SendGrid
    if (this.config.sendgridApiKey) {
      await this.sendEmailViaSendGrid(params);
      return;
    }
    
    // Otherwise, use SMTP (if configured)
    await this.sendEmailViaSMTP(params);
  }
  
  /**
   * Send email via SendGrid
   */
  private async sendEmailViaSendGrid(params: EmailParams): Promise<void> {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.config.sendgridApiKey);
    
    const msg = {
      to: params.to,
      from: {
        email: this.config.fromEmail!,
        name: this.config.fromName!
      },
      subject: params.subject,
      text: params.body,
      html: params.html || this.textToHtml(params.body)
    };
    
    try {
      await sgMail.send(msg);
      console.log(`[Email] Sent via SendGrid to ${params.to}`);
    } catch (error) {
      console.error('[Email] SendGrid error:', error);
      throw error;
    }
  }
  
  /**
   * Send email via SMTP
   */
  private async sendEmailViaSMTP(params: EmailParams): Promise<void> {
    // For now, just log. In production, implement nodemailer
    console.log(`[Email] Would send via SMTP to ${params.to}`);
    console.log(`[Email] Subject: ${params.subject}`);
    console.log(`[Email] Body: ${params.body.substring(0, 100)}...`);
    
    // TODO: Implement nodemailer
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    await transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: params.html || this.textToHtml(params.body)
    });
    */
  }
  
  /**
   * Send SMS via Twilio
   */
  async sendSMS(params: SMSParams): Promise<void> {
    const { to, message } = params;
    
    if (!this.twilioClient) {
      console.log(`[SMS] Twilio not configured, would send to ${to}: ${message}`);
      return;
    }
    
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.config.twilioPhoneNumber,
        to: to
      });
      
      console.log(`[SMS] Sent to ${to}, SID: ${result.sid}`);
    } catch (error) {
      console.error('[SMS] Twilio error:', error);
      throw error;
    }
  }
  
  /**
   * Send Slack notification
   */
  async sendSlackNotification(alert: {
    severity: string;
    title: string;
    message: string;
    actions: string[];
  }): Promise<void> {
    if (!this.config.slackWebhookUrl) {
      console.log(`[Slack] Webhook not configured, would send: ${alert.title}`);
      return;
    }
    
    const color = this.getSeverityColor(alert.severity);
    
    const payload = {
      text: `🚨 *${alert.severity}*: ${alert.title}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Actions Required',
              value: alert.actions.map((a, i) => `${i + 1}. ${a}`).join('\n'),
              short: false
            }
          ],
          footer: 'SmartPay Compliance System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };
    
    try {
      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`);
      }
      
      console.log('[Slack] Notification sent');
    } catch (error) {
      console.error('[Slack] Error:', error);
      throw error;
    }
  }
  
  /**
   * Update notification status in database
   */
  private async updateNotificationStatus(
    notificationId: number,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const timestamp = status === 'DELIVERED' ? 'delivered_at' : 'sent_at';
    
    await query(
      `UPDATE alert_notifications 
       SET status = $1, 
           ${timestamp} = CURRENT_TIMESTAMP,
           error_message = $2
       WHERE id = $3`,
      [status, errorMessage || null, notificationId]
    );
  }
  
  /**
   * Format alert email body
   */
  private formatAlertEmail(
    title: string,
    message: string,
    severity: string,
    actions: string[],
    data: any
  ): string {
    return `
SMARTPAY COMPLIANCE ALERT
${'-'.repeat(60)}

SEVERITY: ${severity}
TITLE: ${title}

MESSAGE:
${message}

ACTIONS REQUIRED:
${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

ALERT DATA:
${JSON.stringify(data, null, 2)}

${'-'.repeat(60)}
This is an automated alert from SmartPay Compliance System.
Please take immediate action as required.

Time: ${new Date().toISOString()}
System: SmartPay Backend
    `.trim();
  }
  
  /**
   * Convert plain text to basic HTML
   */
  private textToHtml(text: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .alert { padding: 20px; border-left: 4px solid #ff0000; background: #fff3f3; }
    pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="alert">
    <pre>${text}</pre>
  </div>
</body>
</html>
    `.trim();
  }
  
  /**
   * Get Slack color based on severity
   */
  private getSeverityColor(severity: string): string {
    switch (severity.toUpperCase()) {
      case 'EMERGENCY':
      case 'CRITICAL':
        return '#ff0000';
      case 'WARNING':
        return '#ffaa00';
      case 'INFO':
        return '#0066ff';
      default:
        return '#666666';
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let notificationServiceInstance: AlertNotificationService | null = null;

export const getNotificationService = (): AlertNotificationService => {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new AlertNotificationService();
  }
  return notificationServiceInstance;
};

// =====================================================
// CRON JOB FOR PROCESSING NOTIFICATIONS
// =====================================================

/**
 * Process pending notifications every 1 minute
 */
export const startNotificationProcessingJob = () => {
  const cron = require('node-cron');
  
  console.log('[Notifications] Scheduling notification processing job every 1 minute');
  
  cron.schedule('* * * * *', async () => {
    try {
      const service = getNotificationService();
      await service.processPendingNotifications();
    } catch (error) {
      console.error('[Notifications] Job error:', error);
    }
  });
};
