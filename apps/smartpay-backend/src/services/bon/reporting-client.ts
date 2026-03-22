/**
 * Bank of Namibia (BoN) Reporting API Client
 * 
 * Purpose: Submit regulatory reports to Bank of Namibia
 * 
 * Features:
 * - KRI (Key Risk Indicators) reporting
 * - Security incident reporting
 * - Trust account reconciliation reporting
 * - Transaction volume reporting
 * - Retry queue with exponential backoff
 * - Mock mode for development/testing
 * - Mutual TLS support (if required)
 * 
 * Standards:
 * - BoN Payment Systems Act 2003
 * - BoN Payment System Management Body Determination 2019
 * - ISO 20022 XML messaging (if applicable)
 * - PSD-12: Regulatory compliance reporting
 */

import fs from 'fs';
import https from 'https';
import { query } from '../../lib/db';

interface BoNConfig {
  baseUrl: string;
  apiKey: string;
  certificatePath?: string;
  privateKeyPath?: string;
  enabled: boolean;
  allowMockMode: boolean;
}

interface KRIMetrics {
  reporting_period: string; // YYYY-MM format
  total_transactions: number;
  total_volume_nad: number;
  failed_transactions: number;
  average_transaction_time_ms: number;
  peak_tps: number; // Transactions per second
  system_uptime_percent: number;
  security_incidents: number;
  customer_complaints: number;
  fraud_cases: number;
  metadata?: Record<string, unknown>;
}

interface SecurityIncident {
  incident_id: string;
  incident_type: 'data_breach' | 'unauthorized_access' | 'fraud' | 'system_compromise' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  incident_date: string; // ISO 8601
  description: string;
  affected_customers: number;
  financial_impact_nad: number;
  resolution_status: 'investigating' | 'contained' | 'resolved';
  remediation_actions: string;
  metadata?: Record<string, unknown>;
}

interface TrustAccountReconciliation {
  reconciliation_date: string; // YYYY-MM-DD
  ledger_balance_nad: number;
  bank_balance_nad: number;
  discrepancy_nad: number;
  reconciled: boolean;
  reconciliation_notes: string;
  metadata?: Record<string, unknown>;
}

interface TransactionVolumeReport {
  reporting_period: string; // YYYY-MM format
  total_transactions: number;
  total_volume_nad: number;
  transaction_types: Record<string, { count: number; volume_nad: number }>;
  metadata?: Record<string, unknown>;
}

interface ReportSubmissionResult {
  success: boolean;
  reportId?: string;
  submissionId?: string;
  error?: string;
  statusUrl?: string;
}

const config: BoNConfig = {
  baseUrl: process.env.BON_API_BASE_URL || 'https://nps.bon.org.na/api',
  apiKey: process.env.BON_API_KEY || '',
  certificatePath: process.env.BON_CERTIFICATE_PATH,
  privateKeyPath: process.env.BON_PRIVATE_KEY_PATH,
  enabled: process.env.BON_REPORTING_ENABLED === 'true',
  allowMockMode: process.env.ALLOW_DEV_FALLBACK === 'true',
};

/**
 * Generate XML for BoN report (ISO 20022 style if applicable)
 */
function generateReportXML(reportType: string, data: unknown): string {
  const timestamp = new Date().toISOString();
  
  // Simple XML generation (replace with proper ISO 20022 if BoN requires it)
  const xmlData = objectToXML(data, '  ');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<BoNReport xmlns="urn:bon:na:reporting:v1">
  <Header>
    <ReportType>${reportType}</ReportType>
    <Timestamp>${timestamp}</Timestamp>
    <Submitter>SmartPay</Submitter>
    <Version>1.0</Version>
  </Header>
  <Body>
${xmlData}
  </Body>
</BoNReport>`;
}

/**
 * Convert object to XML (helper function)
 */
function objectToXML(obj: unknown, indent: string = ''): string {
  if (typeof obj !== 'object' || obj === null) {
    return `${indent}${String(obj)}`;
  }
  
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const tagName = key.replace(/_/g, '');
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`${indent}<${tagName}>`);
      lines.push(objectToXML(value, indent + '  '));
      lines.push(`${indent}</${tagName}>`);
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        lines.push(`${indent}<${tagName}>${item}</${tagName}>`);
      });
    } else {
      lines.push(`${indent}<${tagName}>${value}</${tagName}>`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Get HTTPS agent with mutual TLS (if configured)
 */
function getHttpsAgent(): https.Agent | undefined {
  if (!config.certificatePath || !config.privateKeyPath) {
    return undefined;
  }
  
  try {
    const cert = fs.readFileSync(config.certificatePath, 'utf8');
    const key = fs.readFileSync(config.privateKeyPath, 'utf8');
    
    return new https.Agent({
      cert,
      key,
      rejectUnauthorized: true,
    });
  } catch (error) {
    console.error('[BoN] Failed to load TLS certificates:', error);
    return undefined;
  }
}

/**
 * Submit report to BoN API
 */
async function submitToBoN(
  reportType: string,
  xmlData: string
): Promise<ReportSubmissionResult> {
  if (!config.enabled) {
    throw new Error('BoN reporting not enabled');
  }
  
  if (!config.apiKey) {
    throw new Error('BoN API key not configured');
  }
  
  try {
    const agent = getHttpsAgent();
    
    const response = await fetch(`${config.baseUrl}/reports/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'X-API-Key': config.apiKey,
        'X-Report-Type': reportType,
      },
      body: xmlData,
      // @ts-ignore - agent is valid for Node.js fetch
      agent,
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`BoN API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      reportId: result.report_id || result.reportId,
      submissionId: result.submission_id || result.submissionId,
      statusUrl: result.status_url || result.statusUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BoN] Submit failed:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Submit report via mock mode
 */
function submitViaMock(reportType: string, data: unknown): ReportSubmissionResult {
  console.log('[BoN Mock] Report not submitted (development mode)');
  console.log(`[BoN Mock] Report Type: ${reportType}`);
  console.log('[BoN Mock] Data:', JSON.stringify(data, null, 2));
  
  return {
    success: true,
    reportId: `mock_report_${Date.now()}`,
    submissionId: `mock_sub_${Date.now()}`,
    statusUrl: `${config.baseUrl}/reports/status/mock_${Date.now()}`,
  };
}

/**
 * Queue report for submission
 */
async function queueReport(
  reportType: string,
  reportData: unknown
): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO bon_reporting_queue (report_type, report_data)
     VALUES ($1, $2::jsonb)
     RETURNING id`,
    [reportType, JSON.stringify(reportData)]
  );
  
  return result.rows[0].id;
}

/**
 * Submit KRI (Key Risk Indicators) Report
 */
export async function submitKRIReport(metrics: KRIMetrics): Promise<ReportSubmissionResult> {
  console.log('[BoN] Submitting KRI report for period:', metrics.reporting_period);
  
  // Queue report first
  const queueId = await queueReport('kri', metrics);
  
  // Attempt immediate submission
  let result: ReportSubmissionResult;
  
  if (!config.enabled && config.allowMockMode) {
    result = submitViaMock('kri', metrics);
  } else if (!config.enabled) {
    result = {
      success: false,
      error: 'BoN reporting not enabled',
    };
  } else {
    const xmlData = generateReportXML('KRI', metrics);
    result = await submitToBoN('kri', xmlData);
  }
  
  // Update queue status
  if (result.success) {
    await query(
      `UPDATE bon_reporting_queue 
       SET status = 'submitted', 
           submission_id = $2,
           submitted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [queueId, result.submissionId]
    );
  } else {
    await query(
      `UPDATE bon_reporting_queue 
       SET status = 'failed',
           error_message = $2,
           attempt_count = attempt_count + 1,
           next_retry_at = NOW() + INTERVAL '1 hour',
           updated_at = NOW()
       WHERE id = $1`,
      [queueId, result.error]
    );
  }
  
  return { ...result, reportId: queueId };
}

/**
 * Submit Security Incident Report
 */
export async function submitIncidentReport(
  incident: SecurityIncident
): Promise<ReportSubmissionResult> {
  console.log('[BoN] Submitting security incident report:', incident.incident_id);
  
  const queueId = await queueReport('incident', incident);
  
  let result: ReportSubmissionResult;
  
  if (!config.enabled && config.allowMockMode) {
    result = submitViaMock('incident', incident);
  } else if (!config.enabled) {
    result = {
      success: false,
      error: 'BoN reporting not enabled',
    };
  } else {
    const xmlData = generateReportXML('SecurityIncident', incident);
    result = await submitToBoN('incident', xmlData);
  }
  
  // Update queue
  if (result.success) {
    await query(
      `UPDATE bon_reporting_queue 
       SET status = 'submitted', 
           submission_id = $2,
           submitted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [queueId, result.submissionId]
    );
  } else {
    await query(
      `UPDATE bon_reporting_queue 
       SET status = 'failed',
           error_message = $2,
           attempt_count = attempt_count + 1,
           next_retry_at = NOW() + INTERVAL '30 minutes',
           updated_at = NOW()
       WHERE id = $1`,
      [queueId, result.error]
    );
  }
  
  return { ...result, reportId: queueId };
}

/**
 * Submit Trust Account Reconciliation Report
 */
export async function submitTrustAccountReport(
  reconciliation: TrustAccountReconciliation
): Promise<ReportSubmissionResult> {
  console.log('[BoN] Submitting trust account reconciliation:', reconciliation.reconciliation_date);
  
  const queueId = await queueReport('trust_account', reconciliation);
  
  let result: ReportSubmissionResult;
  
  if (!config.enabled && config.allowMockMode) {
    result = submitViaMock('trust_account', reconciliation);
  } else if (!config.enabled) {
    result = {
      success: false,
      error: 'BoN reporting not enabled',
    };
  } else {
    const xmlData = generateReportXML('TrustAccountReconciliation', reconciliation);
    result = await submitToBoN('trust_account', xmlData);
  }
  
  // Update queue
  if (result.success) {
    await query(
      `UPDATE bon_reporting_queue 
       SET status = 'submitted', 
           submission_id = $2,
           submitted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [queueId, result.submissionId]
    );
  } else {
    await query(
      `UPDATE bon_reporting_queue 
       SET status = 'failed',
           error_message = $2,
           attempt_count = attempt_count + 1,
           next_retry_at = NOW() + INTERVAL '1 hour',
           updated_at = NOW()
       WHERE id = $1`,
      [queueId, result.error]
    );
  }
  
  return { ...result, reportId: queueId };
}

/**
 * Submit Transaction Volume Report
 */
export async function submitTransactionVolumeReport(
  report: TransactionVolumeReport
): Promise<ReportSubmissionResult> {
  console.log('[BoN] Submitting transaction volume report:', report.reporting_period);
  
  const queueId = await queueReport('transaction_volume', report);
  
  let result: ReportSubmissionResult;
  
  if (!config.enabled && config.allowMockMode) {
    result = submitViaMock('transaction_volume', report);
  } else if (!config.enabled) {
    result = {
      success: false,
      error: 'BoN reporting not enabled',
    };
  } else {
    const xmlData = generateReportXML('TransactionVolume', report);
    result = await submitToBoN('transaction_volume', xmlData);
  }
  
  // Update queue
  if (result.success) {
    await query(
      `UPDATE bon_reporting_queue 
       SET status = 'submitted', 
           submission_id = $2,
           submitted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [queueId, result.submissionId]
    );
  } else {
    await query(
      `UPDATE bon_reporting_queue 
       SET status = 'failed',
           error_message = $2,
           attempt_count = attempt_count + 1,
           next_retry_at = NOW() + INTERVAL '1 hour',
           updated_at = NOW()
       WHERE id = $1`,
      [queueId, result.error]
    );
  }
  
  return { ...result, reportId: queueId };
}

/**
 * Check submission status
 */
export async function checkSubmissionStatus(submissionId: string): Promise<{
  status: 'pending' | 'processing' | 'accepted' | 'rejected';
  message?: string;
}> {
  if (!config.enabled && config.allowMockMode) {
    return { status: 'accepted', message: 'Mock submission accepted' };
  }
  
  if (!config.enabled) {
    return { status: 'pending', message: 'BoN reporting not enabled' };
  }
  
  try {
    const agent = getHttpsAgent();
    
    const response = await fetch(`${config.baseUrl}/reports/status/${submissionId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
      // @ts-ignore
      agent,
    });
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      status: data.status,
      message: data.message,
    };
  } catch (error) {
    console.error('[BoN] Status check failed:', error);
    return { status: 'pending', message: 'Status check failed' };
  }
}

/**
 * Process BoN reporting queue (called by cron job)
 */
export async function processBoNQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  try {
    const result = await query<{
      id: string;
      report_type: string;
      report_data: unknown;
      attempt_count: number;
      max_attempts: number;
    }>(`SELECT * FROM bon_pending_reports LIMIT 20`);
    
    for (const report of result.rows) {
      processed++;
      
      // Mark as processing
      await query(
        `UPDATE bon_reporting_queue SET status = 'processing', updated_at = NOW() WHERE id = $1`,
        [report.id]
      );
      
      // Generate and submit report
      const xmlData = generateReportXML(report.report_type, report.report_data);
      const submitResult = await submitToBoN(report.report_type, xmlData);
      
      if (submitResult.success) {
        succeeded++;
        await query(
          `UPDATE bon_reporting_queue 
           SET status = 'submitted',
               submission_id = $2,
               submitted_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [report.id, submitResult.submissionId]
        );
      } else {
        failed++;
        const newAttemptCount = report.attempt_count + 1;
        
        if (newAttemptCount >= report.max_attempts) {
          await query(
            `UPDATE bon_reporting_queue 
             SET status = 'dead_letter',
                 attempt_count = $2,
                 error_message = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [report.id, newAttemptCount, submitResult.error]
          );
        } else {
          // Exponential backoff: 1h, 2h, 4h
          const backoffHours = Math.pow(2, newAttemptCount - 1);
          const nextRetry = new Date(Date.now() + backoffHours * 60 * 60 * 1000);
          
          await query(
            `UPDATE bon_reporting_queue 
             SET status = 'pending',
                 attempt_count = $2,
                 next_retry_at = $3,
                 error_message = $4,
                 updated_at = NOW()
             WHERE id = $1`,
            [report.id, newAttemptCount, nextRetry.toISOString(), submitResult.error]
          );
        }
      }
    }
  } catch (error) {
    console.error('[BoN] Queue processing error:', error);
  }
  
  return { processed, succeeded, failed };
}

/**
 * Check if BoN reporting is configured
 */
export function isBoNConfigured(): boolean {
  return config.enabled || config.allowMockMode;
}
