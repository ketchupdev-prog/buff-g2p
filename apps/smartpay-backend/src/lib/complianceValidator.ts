/**
 * Compliance Validation Library for Smartpay
 * Enforces PSD, ETA, OBS regulatory requirements
 * Location: backend/src/lib/complianceValidator.ts
 */
import { pool } from './db';

export interface ComplianceCheckResult {
  compliant: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Check if participant is authorized to perform operation (PSD-6)
 */
export async function checkParticipantAuthorization(
  participantId: string,
  requiredService: string
): Promise<ComplianceCheckResult> {
  const result = await pool.query(
    `SELECT authorization_status, authorized_services
     FROM nps_participant_status
     WHERE participant_id = $1`,
    [participantId]
  );
  
  if (result.rowCount === 0) {
    return {
      compliant: false,
      violations: ['Participant not registered in NPS'],
      warnings: []
    };
  }
  
  const participant = result.rows[0] as {
    authorization_status: string;
    authorized_services: string[];
  };
  
  const violations: string[] = [];
  const warnings: string[] = [];
  
  if (participant.authorization_status !== 'authorized') {
    violations.push(`Participant status is ${participant.authorization_status}, not authorized`);
  }
  
  if (!participant.authorized_services.includes(requiredService)) {
    violations.push(`Participant not authorized for service: ${requiredService}`);
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    warnings
  };
}

/**
 * Validate OBS consent status (OBS 2025 §5.3)
 */
export async function validateObsConsent(
  userId: string,
  dataProviderId: string,
  requiredScopes: string[]
): Promise<ComplianceCheckResult> {
  const result = await pool.query(
    `SELECT status, scopes, expires_at, granted_at
     FROM obs_consents
     WHERE user_id = $1 AND data_provider_id = $2 AND status = 'active'
     ORDER BY granted_at DESC
     LIMIT 1`,
    [userId, dataProviderId]
  );
  
  const violations: string[] = [];
  const warnings: string[] = [];
  
  if (result.rowCount === 0) {
    violations.push('No active consent found for data provider');
    return { compliant: false, violations, warnings };
  }
  
  const consent = result.rows[0] as {
    status: string;
    scopes: string[];
    expires_at: Date;
    granted_at: Date;
  };
  
  // Check expiration
  if (new Date(consent.expires_at) < new Date()) {
    violations.push('Consent has expired');
  }
  
  // Check scopes
  const missingScopes = requiredScopes.filter(
    scope => !consent.scopes.includes(scope)
  );
  
  if (missingScopes.length > 0) {
    violations.push(`Missing required scopes: ${missingScopes.join(', ')}`);
  }
  
  // Warning for consent older than 90 days (OBS best practice)
  const consentAge = Date.now() - new Date(consent.granted_at).getTime();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  
  if (consentAge > ninetyDays) {
    warnings.push('Consent is older than 90 days, consider requesting renewal');
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    warnings
  };
}

/**
 * Validate BOP code for cross-border transactions (PSD-9)
 */
export async function validateBopCode(
  bopCode: string,
  amount: number,
  hasDocumentation: boolean
): Promise<ComplianceCheckResult> {
  const result = await pool.query(
    `SELECT requires_documentation, max_amount_no_docs, description
     FROM bop_codes
     WHERE code = $1`,
    [bopCode]
  );
  
  const violations: string[] = [];
  const warnings: string[] = [];
  
  if (result.rowCount === 0) {
    violations.push(`Invalid BOP code: ${bopCode}`);
    return { compliant: false, violations, warnings };
  }
  
  const bopInfo = result.rows[0] as {
    requires_documentation: boolean;
    max_amount_no_docs: number | null;
    description: string;
  };
  
  // Check documentation requirements
  if (bopInfo.requires_documentation && !hasDocumentation) {
    violations.push(
      `BOP code ${bopCode} (${bopInfo.description}) requires supporting documentation`
    );
  }
  
  // Check amount limits
  if (
    !hasDocumentation &&
    bopInfo.max_amount_no_docs !== null &&
    amount > bopInfo.max_amount_no_docs
  ) {
    violations.push(
      `Amount N$${amount} exceeds limit of N$${bopInfo.max_amount_no_docs} without documentation for BOP code ${bopCode}`
    );
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    warnings
  };
}

/**
 * Check for compliance violations and trigger alerts (PSD-8)
 */
export async function recordComplianceViolation(
  violationType: string,
  psdReference: string,
  description: string,
  severity: 'minor' | 'moderate' | 'serious' | 'critical',
  remediationAction?: string
): Promise<string> {
  const reportingDeadline = calculateReportingDeadline(severity);
  
  const result = await pool.query(
    `INSERT INTO compliance_violations
      (violation_type, psd_reference, description, severity, reporting_deadline, remediation_action, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id`,
    [violationType, psdReference, description, severity, reportingDeadline, remediationAction]
  );
  
  const violationId = result.rows[0].id as string;
  
  // Trigger alert for critical violations
  if (severity === 'critical') {
    console.error('CRITICAL COMPLIANCE VIOLATION:', {
      id: violationId,
      type: violationType,
      description
    });
    // TODO: Send alert to compliance team
  }
  
  return violationId;
}

/**
 * Calculate reporting deadline based on severity (PSD-8 requirements)
 */
function calculateReportingDeadline(severity: string): Date {
  const now = new Date();
  
  switch (severity) {
    case 'critical':
      // Report immediately (within 4 hours)
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case 'serious':
      // Report within 24 hours
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'moderate':
      // Report within 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'minor':
      // Report within 30 days
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}
