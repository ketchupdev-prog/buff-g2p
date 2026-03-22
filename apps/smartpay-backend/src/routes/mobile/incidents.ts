/**
 * Incidents Reporting API Routes
 * Location: fintech/smartpay/backend/src/routes/mobile/incidents.ts
 * PSD-12 compliant incident reporting and tracking
 * ETA §32 audit logging for all incident operations
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth';
import { strictRateLimiter, lenientRateLimiter } from '../../middleware/rateLimiter';
import { transaction } from '../../lib/db';
import { logWithAttribution } from '../../lib/etaAttribution';
import { v4 as uuidv4 } from 'uuid';
import { validateIncidentCreation } from '../../middleware/zodValidation';

const router = Router();

interface CreateIncidentRequest {
  category:
    | 'security_breach'
    | 'fraud_suspicion'
    | 'system_error'
    | 'transaction_dispute'
    | 'service_outage'
    | 'data_privacy'
    | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  transactionId?: string;
  affectedServices?: string[];
  attachments?: string[];
}

/**
 * POST /api/v1/incidents
 * Create a new incident report (PSD-12 compliance)
 */
router.post(
  '/incidents',
  requireAuth,
  strictRateLimiter,
  validateIncidentCreation,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const {
      category,
      severity,
      title,
      description,
      transactionId,
      affectedServices,
      attachments
    } = req.body as CreateIncidentRequest;

    try {
      // Input validation
      if (!category) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CATEGORY', message: 'Incident category is required' }
        });
      }

      const validCategories = [
        'security_breach',
        'fraud_suspicion',
        'system_error',
        'transaction_dispute',
        'service_outage',
        'data_privacy',
        'other'
      ];

      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
          }
        });
      }

      if (!severity) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_SEVERITY', message: 'Incident severity is required' }
        });
      }

      const validSeverities = ['low', 'medium', 'high', 'critical'];

      if (!validSeverities.includes(severity)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SEVERITY',
            message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
          }
        });
      }

      if (!title || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_TITLE', message: 'Incident title is required' }
        });
      }

      if (!description || description.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_DESCRIPTION', message: 'Incident description is required' }
        });
      }

      if (title.length > 200) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TITLE_TOO_LONG',
            message: 'Incident title must be 200 characters or less'
          }
        });
      }

      if (description.length > 5000) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DESCRIPTION_TOO_LONG',
            message: 'Incident description must be 5000 characters or less'
          }
        });
      }

      const result = await transaction(async (client) => {
        // If transactionId is provided, verify it exists and belongs to user
        if (transactionId) {
          const transactionResult = await client.query(
            `SELECT id, type, status FROM transactions
             WHERE id = $1 
               AND (source_user_id = $2 OR destination_user_id = $2)`,
            [transactionId, userId]
          );

          if (transactionResult.rowCount === 0) {
            throw new Error('Transaction not found or does not belong to you');
          }
        }

        // Generate incident ID with prefix based on category
        const categoryPrefix: Record<string, string> = {
          security_breach: 'SEC',
          fraud_suspicion: 'FRD',
          system_error: 'SYS',
          transaction_dispute: 'TXN',
          service_outage: 'OUT',
          data_privacy: 'PRI',
          other: 'INC'
        };

        const prefix = categoryPrefix[category];
        const timestamp = Date.now().toString(36).toUpperCase();
        
        // SECURITY: Use crypto for random component instead of Math.random
        const crypto = require('crypto');
        const randomBytes = crypto.randomBytes(3);
        const random = randomBytes.toString('base64')
          .replace(/[+/=]/g, '') // Remove base64 special chars
          .substring(0, 4)
          .toUpperCase();
        
        const incidentCode = `${prefix}-${timestamp}-${random}`;

        // Determine initial status and priority
        let status: 'open' | 'investigating' | 'resolved' | 'closed' = 'open';
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

        // Auto-escalate based on category and severity
        if (
          category === 'security_breach' ||
          category === 'fraud_suspicion' ||
          severity === 'critical'
        ) {
          status = 'investigating';
          priority = 'urgent';
        } else if (severity === 'high') {
          priority = 'high';
        } else if (severity === 'low') {
          priority = 'low';
        }

        // Calculate SLA response time (in hours)
        const slaResponseHours: Record<string, number> = {
          urgent: 1,
          high: 4,
          medium: 24,
          low: 72
        };

        const slaHours = slaResponseHours[priority];
        const responseBy = new Date(
          Date.now() + (slaHours || 24) * 60 * 60 * 1000
        );

        // Create incident record
        const incidentId = uuidv4();
        await client.query(
          `INSERT INTO incidents
            (id, incident_code, user_id, category, severity, priority, status,
             title, description, transaction_id, affected_services,
             response_due_by, ip_address, user_agent, session_id,
             metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())`,
          [
            incidentId,
            incidentCode,
            userId,
            category,
            severity,
            priority,
            status,
            title,
            description,
            transactionId || null,
            affectedServices ? JSON.stringify(affectedServices) : null,
            responseBy,
            req.ipAddress,
            req.headers['user-agent'] || null,
            req.sessionId,
            JSON.stringify({
              attachments: attachments || [],
              deviceInfo: {
                userAgent: req.headers['user-agent'],
                ip: req.ipAddress
              }
            })
          ]
        );

        // For critical incidents, create security event
        if (severity === 'critical' || category === 'security_breach') {
          await client.query(
            `INSERT INTO copilot_security_events
              (user_id, session_id, event_type, severity, details, auto_blocked, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              userId,
              req.sessionId,
              `incident_${category}`,
              severity,
              JSON.stringify({
                incidentId,
                incidentCode,
                title,
                category
              }),
              false
            ]
          );
        }

        // Get user info for notification
        const userResult = await client.query(
          `SELECT first_name, last_name, email, phone FROM users WHERE id = $1`,
          [userId]
        );

        const user = userResult.rows[0] as {
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string;
        };

        return {
          incidentId,
          incidentCode,
          status,
          priority,
          category,
          severity,
          title,
          responseDueBy: responseBy.toISOString(),
          createdAt: new Date().toISOString(),
          message:
            priority === 'urgent'
              ? 'Your incident has been escalated and is being investigated immediately'
              : `Your incident has been recorded. We will respond within ${slaResponseHours[priority]} hours.`,
          contactInfo: {
            supportEmail: 'support@smartpay.na',
            supportPhone: '+264-61-SUPPORT',
            emergencyHotline: priority === 'urgent' ? '+264-61-EMERGENCY' : undefined
          }
        };
      });

      // Log with ETA §32 attribution
      await logWithAttribution({
        userId,
        toolName: 'report_incident',
        action: 'incident_creation',
        input: {
          category,
          severity,
          title,
          transactionId: transactionId || null
        },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Create Incident] Error:', error);

      // Log failure
      await logWithAttribution({
        userId,
        toolName: 'report_incident',
        action: 'incident_creation',
        input: {
          category,
          severity,
          title,
          transactionId: transactionId || null
        },
        result: 'failure',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      }).catch(console.error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'INCIDENT_CREATION_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * GET /api/v1/incidents
 * Get user's incident history
 */
router.get(
  '/incidents',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { status, category } = req.query;

    try {
      const result = await transaction(async (client) => {
        let query = `
          SELECT 
            id, incident_code, category, severity, priority, status,
            title, description, transaction_id, response_due_by,
            resolved_at, created_at, updated_at
          FROM incidents
          WHERE user_id = $1
        `;

        const params: unknown[] = [userId];
        let paramIndex = 2;

        if (status) {
          query += ` AND status = $${paramIndex}`;
          params.push(status);
          paramIndex++;
        }

        if (category) {
          query += ` AND category = $${paramIndex}`;
          params.push(category);
          paramIndex++;
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const incidentsResult = await client.query(query, params);

        return incidentsResult.rows.map((row) => ({
          incidentId: row.id,
          incidentCode: row.incident_code,
          category: row.category,
          severity: row.severity,
          priority: row.priority,
          status: row.status,
          title: row.title,
          description: row.description,
          transactionId: row.transaction_id,
          responseDueBy: row.response_due_by,
          resolvedAt: row.resolved_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      });

      return res.status(200).json({
        success: true,
        data: {
          incidents: result,
          count: result.length
        }
      });
    } catch (error) {
      console.error('[Get Incidents] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * GET /api/v1/incidents/:id
 * Get specific incident details
 */
router.get(
  '/incidents/:id',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    try {
      const result = await transaction(async (client) => {
        const incidentResult = await client.query(
          `SELECT 
            id, incident_code, category, severity, priority, status,
            title, description, transaction_id, affected_services,
            response_due_by, resolved_at, resolution_notes,
            created_at, updated_at, metadata
           FROM incidents
           WHERE id = $1 AND user_id = $2`,
          [id, userId]
        );

        if (incidentResult.rowCount === 0) {
          throw new Error('Incident not found');
        }

        const incident = incidentResult.rows[0];

        // Get incident updates/comments
        const updatesResult = await client.query(
          `SELECT 
            id, message, created_by, created_at
           FROM incident_updates
           WHERE incident_id = $1
           ORDER BY created_at ASC`,
          [id]
        );

        return {
          ...incident,
          affectedServices: incident.affected_services
            ? JSON.parse(incident.affected_services)
            : [],
          updates: updatesResult.rows
        };
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Get Incident] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: errorMessage }
      });
    }
  }
);

export default router;
