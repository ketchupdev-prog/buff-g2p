/**
 * Incident Response Service
 * PSD-12 Compliance: Sections 11.7-11.15
 * 
 * Requirements:
 * - Section 11.13: Report to BoN within 24 hours (preliminary)
 * - Section 11.14: Impact assessment within 1 month
 * - Section 11.15: Report financial loss, data loss, availability loss
 * - Section 11.7-11.8: Investigate, contain, and commence recovery
 */

interface CreateIncidentParams {
  title: string;
  description: string;
  incidentType: 'CYBERATTACK' | 'DATA_BREACH' | 'FRAUD' | 'AVAILABILITY_LOSS' | 'UNAUTHORIZED_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedByUserId?: string;
  detectedBySystem?: string;
  affectedSystems?: string[];
  affectedUsers?: string[];
  attackVector?: string;
  attackSourceIp?: string;
}

interface IncidentResponse {
  incidentId: string;
  incidentNumber: string;
  status: string;
  bonNotification24HourDeadline: Date;
  impactAssessment1MonthDeadline: Date;
}

interface UpdateIncidentParams {
  incidentId: string;
  status?: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'ERADICATED' | 'RECOVERED' | 'CLOSED';
  containmentActions?: string[];
  eradicationActions?: string[];
  recoveryActions?: string[];
  rootCause?: string;
  lessonsLearned?: string;
}

interface ImpactAssessment {
  incidentId: string;
  financialLossNAD: number;
  dataLossDescription: string;
  dataLossRecordCount: number;
  dataLossIncludesPII: boolean;
  availabilityLossMinutes: number;
  completedByUserId: string;
  documentUrl?: string;
}

interface NotificationResult {
  success: boolean;
  notificationId?: string;
  sentAt: Date;
  message?: string;
  error?: string;
}

export class IncidentResponseService {
  /**
   * Create a new cybersecurity incident
   * Automatically triggers 24-hour BoN notification countdown
   */
  async createIncident(params: CreateIncidentParams): Promise<IncidentResponse> {
    try {
      // Generate incident number (e.g., INC-2026-001)
      const incidentNumber = await this.generateIncidentNumber();

      // Calculate deadlines
      const detectedAt = new Date();
      const bonNotification24HourDeadline = new Date(detectedAt.getTime() + 24 * 60 * 60 * 1000);
      const impactAssessment1MonthDeadline = new Date(detectedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Create incident in database
      const incidentId = await this.insertIncident({
        incidentNumber,
        title: params.title,
        description: params.description,
        incidentType: params.incidentType,
        severity: params.severity,
        detectedByUserId: params.detectedByUserId,
        detectedBySystem: params.detectedBySystem,
        affectedSystems: params.affectedSystems,
        affectedUsers: params.affectedUsers,
        attackVector: params.attackVector,
        attackSourceIp: params.attackSourceIp,
        bonNotificationRequired: this.requiresBonNotification(params.severity),
        status: 'DETECTED',
      });

      // Log incident creation to timeline
      await this.logToTimeline(incidentId, 'INCIDENT_CREATED', 'Incident created and detected', params.detectedByUserId);

      // Send internal alerts
      await this.sendInternalAlerts(incidentId, params);

      // Schedule BoN notification reminder (if required)
      if (this.requiresBonNotification(params.severity)) {
        await this.scheduleBonNotificationReminder(incidentId, bonNotification24HourDeadline);
      }

      console.log(`[INCIDENT CREATED] ${incidentNumber} - Severity: ${params.severity}`);
      console.log(`[BON NOTIFICATION DUE] ${bonNotification24HourDeadline.toISOString()}`);

      return {
        incidentId,
        incidentNumber,
        status: 'DETECTED',
        bonNotification24HourDeadline,
        impactAssessment1MonthDeadline,
      };
    } catch (error) {
      console.error('Error creating incident:', error);
      throw new Error('Failed to create incident');
    }
  }

  /**
   * Update incident status and actions
   * PSD-12 Section 11.7-11.8: Investigate, contain, recover
   */
  async updateIncident(params: UpdateIncidentParams): Promise<void> {
    try {
      const updates: any = {};

      if (params.status) {
        updates.status = params.status;
        await this.logToTimeline(
          params.incidentId,
          'STATUS_CHANGE',
          `Incident status changed to ${params.status}`,
          undefined
        );
      }

      if (params.containmentActions) {
        updates.containmentActions = params.containmentActions;
        await this.logToTimeline(
          params.incidentId,
          'CONTAINMENT_ACTION',
          `Containment actions taken: ${params.containmentActions.join(', ')}`,
          undefined
        );
      }

      if (params.eradicationActions) {
        updates.eradicationActions = params.eradicationActions;
        await this.logToTimeline(
          params.incidentId,
          'ERADICATION_ACTION',
          `Eradication actions taken: ${params.eradicationActions.join(', ')}`,
          undefined
        );
      }

      if (params.recoveryActions) {
        updates.recoveryActions = params.recoveryActions;
        await this.logToTimeline(
          params.incidentId,
          'RECOVERY_ACTION',
          `Recovery actions taken: ${params.recoveryActions.join(', ')}`,
          undefined
        );
      }

      if (params.rootCause) {
        updates.rootCause = params.rootCause;
        updates.rootCauseAnalysisCompletedAt = new Date();
      }

      if (params.lessonsLearned) {
        updates.lessonsLearned = params.lessonsLearned;
      }

      // Update incident in database
      await this.updateIncidentInDB(params.incidentId, updates);

      console.log(`[INCIDENT UPDATED] ${params.incidentId} - Status: ${params.status}`);
    } catch (error) {
      console.error('Error updating incident:', error);
      throw new Error('Failed to update incident');
    }
  }

  /**
   * Send preliminary notification to Bank of Namibia
   * PSD-12 Section 11.13: MUST be within 24 hours
   */
  async sendBonPreliminaryNotification(
    incidentId: string,
    sentByUserId: string
  ): Promise<NotificationResult> {
    try {
      // Get incident details
      const incident = await this.getIncident(incidentId);

      if (!incident) {
        return {
          success: false,
          sentAt: new Date(),
          error: 'Incident not found',
        };
      }

      // Check if already sent
      if (incident.bonPreliminaryNotificationSentAt) {
        return {
          success: false,
          sentAt: new Date(),
          error: 'BoN preliminary notification already sent',
        };
      }

      // Check if within 24 hour window
      const hoursElapsed = (Date.now() - incident.detectedAt.getTime()) / (1000 * 60 * 60);
      const isOverdue = hoursElapsed > 24;

      if (isOverdue) {
        console.warn(`[BoN NOTIFICATION OVERDUE] Incident ${incident.incidentNumber} - ${hoursElapsed.toFixed(2)} hours elapsed`);
      }

      // Generate notification content
      const notificationContent = this.generateBonPreliminaryNotification(incident);

      // Send notification (email/API to BoN)
      await this.sendNotificationToBoN(notificationContent, 'PRELIMINARY');

      // Update incident record
      await this.updateIncidentInDB(incidentId, {
        bonPreliminaryNotificationSentAt: new Date(),
        bonPreliminaryNotificationSentBy: sentByUserId,
      });

      // Log to incident timeline
      await this.logToTimeline(
        incidentId,
        'NOTIFICATION_SENT',
        `BoN preliminary notification sent${isOverdue ? ' (OVERDUE)' : ''}`,
        sentByUserId
      );

      // Log to incident_notifications table
      const notificationId = await this.logNotification({
        incidentId,
        notificationType: 'BON_PRELIMINARY',
        recipient: 'Bank of Namibia - National Payment System',
        recipientType: 'BON',
        subject: `Cybersecurity Incident Notification - ${incident.incidentNumber}`,
        body: notificationContent,
        sentByUserId,
      });

      console.log(`[BoN PRELIMINARY NOTIFICATION SENT] ${incident.incidentNumber} - ${hoursElapsed.toFixed(2)} hours after detection`);

      return {
        success: true,
        notificationId,
        sentAt: new Date(),
        message: 'BoN preliminary notification sent successfully',
      };
    } catch (error) {
      console.error('Error sending BoN preliminary notification:', error);
      return {
        success: false,
        sentAt: new Date(),
        error: 'Failed to send BoN preliminary notification',
      };
    }
  }

  /**
   * Complete impact assessment
   * PSD-12 Section 11.14: MUST be within 1 month
   * PSD-12 Section 11.15: MUST include financial loss, data loss, availability loss
   */
  async completeImpactAssessment(assessment: ImpactAssessment): Promise<void> {
    try {
      // Get incident details
      const incident = await this.getIncident(assessment.incidentId);

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Check if within 1 month window
      const daysElapsed = (Date.now() - incident.detectedAt.getTime()) / (1000 * 60 * 60 * 24);
      const isOverdue = daysElapsed > 30;

      if (isOverdue) {
        console.warn(`[IMPACT ASSESSMENT OVERDUE] Incident ${incident.incidentNumber} - ${daysElapsed.toFixed(1)} days elapsed`);
      }

      // Update incident with impact assessment
      await this.updateIncidentInDB(assessment.incidentId, {
        financialLossNAD: assessment.financialLossNAD,
        dataLossDescription: assessment.dataLossDescription,
        dataLossRecordCount: assessment.dataLossRecordCount,
        dataLossIncludesPII: assessment.dataLossIncludesPII,
        availabilityLossMinutes: assessment.availabilityLossMinutes,
        impactAssessmentStatus: 'COMPLETED',
        impactAssessmentCompletedAt: new Date(),
        impactAssessmentCompletedBy: assessment.completedByUserId,
        impactAssessmentDocumentUrl: assessment.documentUrl,
      });

      // Log to timeline
      await this.logToTimeline(
        assessment.incidentId,
        'IMPACT_ASSESSMENT_COMPLETED',
        `Impact assessment completed. Financial loss: NAD ${assessment.financialLossNAD}, Data loss: ${assessment.dataLossRecordCount} records, Downtime: ${assessment.availabilityLossMinutes} minutes`,
        assessment.completedByUserId
      );

      // Send final report to BoN
      await this.sendBonFinalReport(assessment.incidentId, assessment.completedByUserId);

      console.log(`[IMPACT ASSESSMENT COMPLETED] ${incident.incidentNumber} - ${daysElapsed.toFixed(1)} days after detection`);
    } catch (error) {
      console.error('Error completing impact assessment:', error);
      throw new Error('Failed to complete impact assessment');
    }
  }

  /**
   * Send final report to Bank of Namibia
   * Includes complete impact assessment
   */
  async sendBonFinalReport(incidentId: string, sentByUserId: string): Promise<NotificationResult> {
    try {
      const incident = await this.getIncident(incidentId);

      if (!incident) {
        return {
          success: false,
          sentAt: new Date(),
          error: 'Incident not found',
        };
      }

      // Check if impact assessment is complete
      if (incident.impactAssessmentStatus !== 'COMPLETED') {
        return {
          success: false,
          sentAt: new Date(),
          error: 'Impact assessment must be completed before sending final report',
        };
      }

      // Generate final report content
      const reportContent = this.generateBonFinalReport(incident);

      // Send report to BoN
      await this.sendNotificationToBoN(reportContent, 'FINAL');

      // Update incident record
      await this.updateIncidentInDB(incidentId, {
        bonFinalReportSentAt: new Date(),
        bonFinalReportSentBy: sentByUserId,
      });

      // Log to timeline
      await this.logToTimeline(
        incidentId,
        'NOTIFICATION_SENT',
        'BoN final report sent with complete impact assessment',
        sentByUserId
      );

      // Log to incident_notifications table
      const notificationId = await this.logNotification({
        incidentId,
        notificationType: 'BON_FINAL',
        recipient: 'Bank of Namibia - National Payment System',
        recipientType: 'BON',
        subject: `Final Incident Report - ${incident.incidentNumber}`,
        body: reportContent,
        sentByUserId,
      });

      console.log(`[BoN FINAL REPORT SENT] ${incident.incidentNumber}`);

      return {
        success: true,
        notificationId,
        sentAt: new Date(),
        message: 'BoN final report sent successfully',
      };
    } catch (error) {
      console.error('Error sending BoN final report:', error);
      return {
        success: false,
        sentAt: new Date(),
        error: 'Failed to send BoN final report',
      };
    }
  }

  /**
   * Get incidents requiring BoN notification (within 24 hour deadline)
   */
  async getIncidentsRequiringBonNotification(): Promise<any[]> {
    // Query: incidents_requiring_bon_notification view
    return [];
  }

  /**
   * Get incidents requiring impact assessment (within 1 month deadline)
   */
  async getIncidentsRequiringImpactAssessment(): Promise<any[]> {
    // Query: incidents_requiring_impact_assessment view
    return [];
  }

  /**
   * Close incident
   */
  async closeIncident(incidentId: string, resolutionSummary: string, resolvedByUserId: string): Promise<void> {
    await this.updateIncidentInDB(incidentId, {
      status: 'CLOSED',
      resolvedAt: new Date(),
      resolvedByUserId,
      resolutionSummary,
      closedAt: new Date(),
    });

    await this.logToTimeline(
      incidentId,
      'INCIDENT_CLOSED',
      `Incident closed. Resolution: ${resolutionSummary}`,
      resolvedByUserId
    );

    console.log(`[INCIDENT CLOSED] ${incidentId}`);
  }

  // ==================== Private Helper Methods ====================

  private requiresBonNotification(severity: string): boolean {
    // All CRITICAL and HIGH severity incidents require BoN notification
    return severity === 'CRITICAL' || severity === 'HIGH';
  }

  private generateIncidentNumber(): Promise<string> {
    // Generate format: INC-YYYY-NNN (e.g., INC-2026-001)
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return Promise.resolve(`INC-${year}-${sequence}`);
  }

  private generateBonPreliminaryNotification(incident: any): string {
    return `
PRELIMINARY CYBERSECURITY INCIDENT NOTIFICATION
Bank of Namibia - National Payment System Oversight

Incident Number: ${incident.incidentNumber}
Reported By: SmartPay Namibia
Date Detected: ${incident.detectedAt.toISOString()}

INCIDENT DETAILS:
- Type: ${incident.incidentType}
- Severity: ${incident.severity}
- Title: ${incident.title}
- Description: ${incident.description}

AFFECTED SYSTEMS:
${incident.affectedSystems?.join(', ') || 'To be determined'}

STATUS:
Current Status: ${incident.status}
Investigation ongoing. Full impact assessment to follow within 30 days.

IMMEDIATE ACTIONS TAKEN:
- Incident detected and logged
- Security team notified
- Containment measures initiated

This is a preliminary notification as required by PSD-12 Section 11.13.
A complete impact assessment will be provided within 30 days as per PSD-12 Section 11.14.

Contact: security@smartpay.na
Reference: ${incident.incidentNumber}
    `.trim();
  }

  private generateBonFinalReport(incident: any): string {
    return `
FINAL CYBERSECURITY INCIDENT REPORT
Bank of Namibia - National Payment System Oversight

Incident Number: ${incident.incidentNumber}
Date Detected: ${incident.detectedAt.toISOString()}
Date Resolved: ${incident.resolvedAt?.toISOString() || 'In Progress'}

INCIDENT SUMMARY:
- Type: ${incident.incidentType}
- Severity: ${incident.severity}
- Title: ${incident.title}
- Description: ${incident.description}

IMPACT ASSESSMENT (PSD-12 Section 11.15):
1. Financial Loss: NAD ${incident.financialLossNAD?.toLocaleString() || '0.00'}
2. Data Loss: ${incident.dataLossRecordCount || 0} records
   - Description: ${incident.dataLossDescription || 'None'}
   - PII Affected: ${incident.dataLossIncludesPII ? 'Yes' : 'No'}
3. Availability Loss: ${incident.availabilityLossMinutes || 0} minutes downtime

ROOT CAUSE:
${incident.rootCause || 'Under investigation'}

ACTIONS TAKEN:
- Containment: ${incident.containmentActions?.join(', ') || 'N/A'}
- Eradication: ${incident.eradicationActions?.join(', ') || 'N/A'}
- Recovery: ${incident.recoveryActions?.join(', ') || 'N/A'}

LESSONS LEARNED:
${incident.lessonsLearned || 'To be documented'}

STATUS: ${incident.status}

This report fulfills the requirements of PSD-12 Sections 11.14 and 11.15.

Contact: security@smartpay.na
Reference: ${incident.incidentNumber}
    `.trim();
  }

  // ==================== Database Integration Methods ====================

  private async insertIncident(data: any): Promise<string> {
    // TODO: INSERT INTO incidents table
    // Use the create_incident() function from incidents.sql
    console.log('[INSERT INCIDENT]', data);
    return 'incident_' + Date.now();
  }

  private async updateIncidentInDB(incidentId: string, updates: any): Promise<void> {
    // TODO: UPDATE incidents table
    console.log('[UPDATE INCIDENT]', incidentId, updates);
  }

  private async getIncident(incidentId: string): Promise<any> {
    // TODO: SELECT FROM incidents table
    return {
      incidentNumber: 'INC-2026-001',
      detectedAt: new Date(),
      incidentType: 'CYBERATTACK',
      severity: 'HIGH',
      status: 'INVESTIGATING',
    };
  }

  private async logToTimeline(
    incidentId: string,
    eventType: string,
    description: string,
    userId?: string
  ): Promise<void> {
    // TODO: INSERT INTO incident_timeline table
    console.log('[TIMELINE LOG]', { incidentId, eventType, description });
  }

  private async logNotification(data: any): Promise<string> {
    // TODO: INSERT INTO incident_notifications table
    console.log('[NOTIFICATION LOG]', data);
    return 'notif_' + Date.now();
  }

  private async sendInternalAlerts(incidentId: string, params: CreateIncidentParams): Promise<void> {
    // TODO: Send alerts to security team, management
    console.log('[INTERNAL ALERT]', { incidentId, severity: params.severity });
  }

  private async scheduleBonNotificationReminder(incidentId: string, deadline: Date): Promise<void> {
    // TODO: Schedule reminder notification (e.g., using cron or job queue)
    console.log('[SCHEDULE REMINDER]', { incidentId, deadline });
  }

  private async sendNotificationToBoN(content: string, type: 'PRELIMINARY' | 'FINAL'): Promise<void> {
    // TODO: Send email/API notification to Bank of Namibia
    console.log(`[SEND TO BON - ${type}]`, content);
  }
}

// Export singleton instance
export const incidentResponseService = new IncidentResponseService();

/**
 * Example Usage:
 * 
 * // Create incident
 * const incident = await incidentResponseService.createIncident({
 *   title: 'Suspected phishing attack detected',
 *   description: 'Multiple users reported suspicious emails',
 *   incidentType: 'CYBERATTACK',
 *   severity: 'HIGH',
 *   detectedBySystem: 'SIEM',
 * });
 * 
 * // Send BoN notification (within 24 hours)
 * await incidentResponseService.sendBonPreliminaryNotification(
 *   incident.incidentId,
 *   'user_123'
 * );
 * 
 * // Complete impact assessment (within 1 month)
 * await incidentResponseService.completeImpactAssessment({
 *   incidentId: incident.incidentId,
 *   financialLossNAD: 15000,
 *   dataLossDescription: 'Customer email addresses compromised',
 *   dataLossRecordCount: 150,
 *   dataLossIncludesPII: true,
 *   availabilityLossMinutes: 45,
 *   completedByUserId: 'user_123',
 * });
 */
