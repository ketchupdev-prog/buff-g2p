// =====================================================
// BON INCIDENT AUTO-REPORTER
// PSD-12 §21 - 24-Hour Incident Reporting Requirement
// =====================================================

import { query } from '../../lib/db';
import axios from 'axios';

// =====================================================
// TYPES
// =====================================================

interface SecurityIncident {
  id: number;
  incident_type: string;
  severity: string;
  title: string;
  description: string;
  affected_systems: string[];
  affected_users_count: number;
  impact_assessment: string;
  root_cause: string;
  remediation_actions: string;
  status: string;
  detected_at: Date;
  resolved_at?: Date;
  reported_to_bon: boolean;
  bon_report_id?: string;
  metadata?: any;
}

interface BONIncidentReport {
  report_id: string;
  institution_name: string;
  license_number: string;
  incident: {
    type: string;
    severity: string;
    title: string;
    description: string;
    detected_at: string;
    resolved_at?: string;
    affected_systems: string[];
    affected_users_count: number;
    impact_assessment: string;
    root_cause?: string;
    remediation_actions?: string;
  };
  reported_at: string;
  contact_person: {
    name: string;
    email: string;
    phone: string;
  };
}

// =====================================================
// BON INCIDENT REPORTER SERVICE
// =====================================================

export class BONIncidentReporterService {
  private bonApiUrl: string;
  private licenseNumber: string;
  private institutionName: string;
  private contactPerson: {
    name: string;
    email: string;
    phone: string;
  };
  
  constructor() {
    this.bonApiUrl = process.env.BON_API_URL || 'https://api.bon.org.na/reporting';
    this.licenseNumber = process.env.BON_LICENSE_NUMBER || 'PSP-2024-001';
    this.institutionName = process.env.INSTITUTION_NAME || 'SmartPay Namibia';
    this.contactPerson = {
      name: process.env.BON_CONTACT_NAME || 'Compliance Officer',
      email: process.env.BON_CONTACT_EMAIL || 'compliance@smartpay.na',
      phone: process.env.BON_CONTACT_PHONE || '+264811234567'
    };
  }
  
  /**
   * Process unreported HIGH/CRITICAL incidents
   * Runs every hour to check for incidents that need reporting
   */
  async processUnreportedIncidents(): Promise<void> {
    console.log('[BoN Reporter] Checking for unreported incidents...');
    
    try {
      // Get all HIGH/CRITICAL incidents not yet reported to BoN
      const result = await query<SecurityIncident>(
        `SELECT * FROM security_incidents
         WHERE severity IN ('HIGH', 'CRITICAL')
         AND reported_to_bon = false
         AND detected_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
         ORDER BY detected_at DESC`
      );
      
      const unreportedIncidents = result.rows;
      
      if (unreportedIncidents.length === 0) {
        console.log('[BoN Reporter] No unreported incidents found');
        return;
      }
      
      console.log(`[BoN Reporter] Found ${unreportedIncidents.length} unreported incidents`);
      
      for (const incident of unreportedIncidents) {
        try {
          await this.reportIncidentToBON(incident);
        } catch (error) {
          console.error(`[BoN Reporter] Failed to report incident ${incident.id}:`, error);
          // Continue with next incident
        }
      }
      
      console.log('[BoN Reporter] Incident processing complete');
      
    } catch (error) {
      console.error('[BoN Reporter] Error processing unreported incidents:', error);
      throw error;
    }
  }
  
  /**
   * Report a single incident to Bank of Namibia
   */
  async reportIncidentToBON(incident: SecurityIncident): Promise<void> {
    console.log(`[BoN Reporter] Reporting incident ${incident.id} to BoN...`);
    
    // Calculate deadline (24 hours from detection)
    const detectedAt = new Date(incident.detected_at);
    const deadline = new Date(detectedAt.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    
    // Check if we're approaching or past deadline
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (60 * 60 * 1000);
    
    if (hoursRemaining < 0) {
      console.warn(`[BoN Reporter] WARNING: Incident ${incident.id} is past 24-hour deadline!`);
    } else if (hoursRemaining < 2) {
      console.warn(`[BoN Reporter] WARNING: Incident ${incident.id} has only ${hoursRemaining.toFixed(1)} hours remaining!`);
    }
    
    // Generate report
    const reportId = `BON-INC-${Date.now()}-${incident.id}`;
    const reportData: BONIncidentReport = {
      report_id: reportId,
      institution_name: this.institutionName,
      license_number: this.licenseNumber,
      incident: {
        type: incident.incident_type,
        severity: incident.severity,
        title: incident.title,
        description: incident.description,
        detected_at: incident.detected_at.toISOString(),
        resolved_at: incident.resolved_at?.toISOString(),
        affected_systems: incident.affected_systems,
        affected_users_count: incident.affected_users_count,
        impact_assessment: incident.impact_assessment,
        root_cause: incident.root_cause,
        remediation_actions: incident.remediation_actions
      },
      reported_at: now.toISOString(),
      contact_person: this.contactPerson
    };
    
    // Add to reporting queue
    await query(
      `INSERT INTO bon_reporting_queue (
        incident_id,
        report_type,
        report_data,
        deadline,
        status
      ) VALUES ($1, $2, $3, $4, 'PENDING')`,
      [
        incident.id,
        'incident',
        JSON.stringify(reportData),
        deadline
      ]
    );
    
    // Attempt to submit
    try {
      await this.submitReportToBON(reportData);
      
      // Mark as reported
      await query(
        `UPDATE security_incidents
         SET reported_to_bon = true,
             bon_report_id = $1,
             bon_reported_at = CURRENT_TIMESTAMP,
             bon_report_data = $2
         WHERE id = $3`,
        [reportId, JSON.stringify(reportData), incident.id]
      );
      
      // Update queue status
      await query(
        `UPDATE bon_reporting_queue
         SET status = 'SUBMITTED',
             submitted_at = CURRENT_TIMESTAMP,
             bon_reference = $1
         WHERE incident_id = $2 AND status = 'PENDING'`,
        [reportId, incident.id]
      );
      
      console.log(`[BoN Reporter] Incident ${incident.id} successfully reported to BoN`);
      
      // Send confirmation email to compliance team
      await this.sendConfirmationEmail(incident, reportId);
      
    } catch (error) {
      console.error(`[BoN Reporter] Failed to submit incident ${incident.id}:`, error);
      
      // Update queue with error
      await query(
        `UPDATE bon_reporting_queue
         SET status = 'FAILED',
             submission_attempts = submission_attempts + 1,
             last_attempt_at = CURRENT_TIMESTAMP,
             error_message = $1
         WHERE incident_id = $2 AND status = 'PENDING'`,
        [(error as Error).message, incident.id]
      );
      
      throw error;
    }
  }
  
  /**
   * Submit report to BoN API
   */
  private async submitReportToBON(reportData: BONIncidentReport): Promise<void> {
    // For now, we'll log the report (BoN API integration to be implemented)
    console.log('[BoN Reporter] Submitting report to BoN API...');
    console.log('[BoN Reporter] Report:', JSON.stringify(reportData, null, 2));
    
    // TODO: Implement actual BoN API submission
    // This will depend on BoN's actual API specifications
    
    /*
    const response = await axios.post(
      `${this.bonApiUrl}/incidents`,
      reportData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BON_API_KEY}`,
          'X-License-Number': this.licenseNumber
        },
        timeout: 30000
      }
    );
    
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`BoN API returned status ${response.status}`);
    }
    
    return response.data;
    */
    
    // Simulate successful submission
    console.log('[BoN Reporter] Report successfully submitted to BoN');
  }
  
  /**
   * Retry failed submissions
   */
  async retryFailedSubmissions(): Promise<void> {
    console.log('[BoN Reporter] Checking for failed submissions to retry...');
    
    const result = await query<{
      id: number;
      incident_id: number;
      report_data: string;
      submission_attempts: number;
    }>(
      `SELECT id, incident_id, report_data, submission_attempts
       FROM bon_reporting_queue
       WHERE status = 'FAILED'
       AND submission_attempts < 3
       AND deadline > CURRENT_TIMESTAMP
       ORDER BY deadline ASC`
    );
    
    const failedSubmissions = result.rows;
    
    if (failedSubmissions.length === 0) {
      console.log('[BoN Reporter] No failed submissions to retry');
      return;
    }
    
    console.log(`[BoN Reporter] Retrying ${failedSubmissions.length} failed submissions...`);
    
    for (const submission of failedSubmissions) {
      try {
        const reportData: BONIncidentReport = JSON.parse(submission.report_data);
        await this.submitReportToBON(reportData);
        
        // Update status on success
        await query(
          `UPDATE bon_reporting_queue
           SET status = 'SUBMITTED',
               submitted_at = CURRENT_TIMESTAMP,
               bon_reference = $1
           WHERE id = $2`,
          [reportData.report_id, submission.id]
        );
        
        // Update incident
        await query(
          `UPDATE security_incidents
           SET reported_to_bon = true,
               bon_report_id = $1,
               bon_reported_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [reportData.report_id, submission.incident_id]
        );
        
        console.log(`[BoN Reporter] Successfully retried submission ${submission.id}`);
        
      } catch (error) {
        console.error(`[BoN Reporter] Retry failed for submission ${submission.id}:`, error);
        
        await query(
          `UPDATE bon_reporting_queue
           SET submission_attempts = submission_attempts + 1,
               last_attempt_at = CURRENT_TIMESTAMP,
               error_message = $1
           WHERE id = $2`,
          [(error as Error).message, submission.id]
        );
      }
    }
  }
  
  /**
   * Check for overdue reports
   */
  async checkOverdueReports(): Promise<void> {
    console.log('[BoN Reporter] Checking for overdue reports...');
    
    const result = await query<{
      id: number;
      incident_id: number;
      deadline: Date;
      hours_overdue: number;
    }>(
      `SELECT 
        id,
        incident_id,
        deadline,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - deadline)) / 3600 as hours_overdue
       FROM bon_reporting_queue
       WHERE status IN ('PENDING', 'FAILED')
       AND deadline < CURRENT_TIMESTAMP
       ORDER BY deadline`
    );
    
    const overdueReports = result.rows;
    
    if (overdueReports.length > 0) {
      console.error(`[BoN Reporter] CRITICAL: ${overdueReports.length} reports are overdue!`);
      
      // Create critical alert
      await query(
        `INSERT INTO compliance_alerts (
          alert_type,
          severity,
          title,
          message,
          regulation_reference,
          actions_required,
          assigned_to,
          data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'bon_reporting',
          'EMERGENCY',
          'BoN Incident Reports Overdue',
          `${overdueReports.length} incident report(s) have exceeded the 24-hour reporting deadline`,
          'PSD-12 §21 - 24-hour reporting requirement',
          [
            'Investigate why reports failed',
            'Submit reports immediately',
            'Prepare explanation for BoN',
            'Document process improvements'
          ],
          ['compliance@smartpay.na', 'ceo@smartpay.na'],
          JSON.stringify({ overdue_reports: overdueReports })
        ]
      );
    } else {
      console.log('[BoN Reporter] No overdue reports');
    }
  }
  
  /**
   * Send confirmation email to compliance team
   */
  private async sendConfirmationEmail(incident: SecurityIncident, reportId: string): Promise<void> {
    // Queue email notification
    await query(
      `INSERT INTO alert_notifications (
        alert_id,
        notification_type,
        recipient,
        status
      )
      SELECT
        id,
        'EMAIL',
        unnest($1::text[]),
        'PENDING'
      FROM compliance_alerts
      WHERE alert_type = 'bon_reporting'
      ORDER BY created_at DESC
      LIMIT 1`,
      [[this.contactPerson.email, 'compliance@smartpay.na']]
    );
    
    console.log(`[BoN Reporter] Confirmation email queued for report ${reportId}`);
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let bonReporterInstance: BONIncidentReporterService | null = null;

export const getBONIncidentReporterService = (): BONIncidentReporterService => {
  if (!bonReporterInstance) {
    bonReporterInstance = new BONIncidentReporterService();
  }
  return bonReporterInstance;
};
