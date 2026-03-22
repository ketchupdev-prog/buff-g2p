// =====================================================
// COMPLIANCE API ROUTES
// Endpoints for compliance monitoring and reporting
// =====================================================

import express, { Request, Response } from 'express';
import { getKRICollectorService } from '../services/compliance/kriCollectorService';
import { TrustAccountReconciliationService } from '../services/compliance/trustAccountReconciliation';
import { query } from '../lib/db';

const router = express.Router();

// =====================================================
// KRI DASHBOARD
// =====================================================

/**
 * GET /api/v1/compliance/kri
 * Get KRI dashboard data
 */
router.get('/kri', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    
    const kriService = getKRICollectorService();
    const dashboard = await kriService.getKRIDashboard(date);
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('[Compliance API] Error fetching KRI dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KRI dashboard'
    });
  }
});

/**
 * POST /api/v1/compliance/kri/collect
 * Trigger manual KRI collection (admin only)
 */
router.post('/kri/collect', async (req: Request, res: Response) => {
  try {
    const kriService = getKRICollectorService();
    await kriService.collectDailyKRIs();
    
    res.json({
      success: true,
      message: 'KRI collection completed'
    });
  } catch (error) {
    console.error('[Compliance API] Error collecting KRIs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect KRIs'
    });
  }
});

/**
 * GET /api/v1/compliance/kri/export
 * Export KRI data for BoN quarterly report (XML)
 */
router.get('/kri/export', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const quarter = parseInt(req.query.quarter as string) || Math.ceil((new Date().getMonth() + 1) / 3);
    
    const kriService = getKRICollectorService();
    const xml = await kriService.generateBONQuarterlyReport(year, quarter);
    
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="KRI_Q${quarter}_${year}.xml"`);
    res.send(xml);
  } catch (error) {
    console.error('[Compliance API] Error exporting KRI report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export KRI report'
    });
  }
});

// =====================================================
// TRUST ACCOUNT RECONCILIATION
// =====================================================

/**
 * GET /api/v1/compliance/reconciliation/status
 * Get reconciliation status and last 30 days history
 */
router.get('/reconciliation/status', async (req: Request, res: Response) => {
  try {
    const result = await query<{
      reconciliation_date: Date;
      trust_account_balance: number;
      outstanding_liabilities: number;
      discrepancy: number;
      compliance_percentage: number;
      status: string;
      is_compliant: boolean;
      wallet_breakdown: any;
    }>(
      `SELECT 
        reconciliation_date,
        trust_account_balance,
        outstanding_liabilities,
        discrepancy,
        compliance_percentage,
        status,
        is_compliant,
        wallet_breakdown
       FROM reconciliation_log
       WHERE reconciliation_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY reconciliation_date DESC`
    );
    
    const history = result.rows;
    const latest = history[0] || null;
    
    // Calculate trend
    const trustBalances = history.map(r => parseFloat(r.trust_account_balance.toString()));
    const liabilities = history.map(r => parseFloat(r.outstanding_liabilities.toString()));
    
    res.json({
      success: true,
      data: {
        latest_reconciliation: latest,
        history: history,
        trends: {
          trust_account_balance: trustBalances,
          outstanding_liabilities: liabilities,
          dates: history.map(r => r.reconciliation_date)
        },
        summary: {
          total_days: history.length,
          compliant_days: history.filter(r => r.is_compliant).length,
          deficient_days: history.filter(r => !r.is_compliant).length,
          compliance_rate: history.length > 0
            ? (history.filter(r => r.is_compliant).length / history.length) * 100
            : 100
        }
      }
    });
  } catch (error) {
    console.error('[Compliance API] Error fetching reconciliation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reconciliation status'
    });
  }
});

/**
 * POST /api/v1/compliance/reconciliation/trigger
 * Trigger manual reconciliation (admin only)
 */
router.post('/reconciliation/trigger', async (req: Request, res: Response) => {
  try {
    const reconciliationService = new TrustAccountReconciliationService();
    const result = await reconciliationService.performDailyReconciliation();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Compliance API] Error triggering reconciliation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger reconciliation'
    });
  }
});

// =====================================================
// COMPLIANCE ALERTS
// =====================================================

/**
 * GET /api/v1/compliance/alerts
 * Get compliance alerts (unresolved by default)
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const includeResolved = req.query.include_resolved === 'true';
    const severity = req.query.severity as string | undefined;
    const alertType = req.query.alert_type as string | undefined;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;
    
    if (!includeResolved) {
      whereClause += ' AND resolved = false';
    }
    
    if (severity) {
      paramCount++;
      whereClause += ` AND severity = $${paramCount}`;
      params.push(severity);
    }
    
    if (alertType) {
      paramCount++;
      whereClause += ` AND alert_type = $${paramCount}`;
      params.push(alertType);
    }
    
    const result = await query(
      `SELECT 
        id,
        alert_type,
        severity,
        title,
        message,
        regulation_reference,
        actions_required,
        assigned_to,
        data,
        acknowledged,
        acknowledged_at,
        resolved,
        resolved_at,
        created_at
       FROM compliance_alerts
       ${whereClause}
       ORDER BY severity DESC, created_at DESC
       LIMIT 100`,
      params
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('[Compliance API] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

/**
 * POST /api/v1/compliance/alerts/:id/acknowledge
 * Acknowledge a compliance alert
 */
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);
    const acknowledgedBy = req.body.acknowledged_by || 'system';
    
    await query(
      `UPDATE compliance_alerts 
       SET acknowledged = true,
           acknowledged_at = CURRENT_TIMESTAMP,
           acknowledged_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [acknowledgedBy, alertId]
    );
    
    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error) {
    console.error('[Compliance API] Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

/**
 * POST /api/v1/compliance/alerts/:id/resolve
 * Resolve a compliance alert
 */
router.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);
    const resolvedBy = req.body.resolved_by || 'system';
    const resolutionNotes = req.body.resolution_notes || '';
    
    await query(
      `UPDATE compliance_alerts 
       SET resolved = true,
           resolved_at = CURRENT_TIMESTAMP,
           resolved_by = $1,
           resolution_notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [resolvedBy, resolutionNotes, alertId]
    );
    
    res.json({
      success: true,
      message: 'Alert resolved'
    });
  } catch (error) {
    console.error('[Compliance API] Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

// =====================================================
// SYSTEM UPTIME
// =====================================================

/**
 * GET /api/v1/compliance/uptime
 * Get system uptime metrics
 */
router.get('/uptime', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    
    // Get daily summary
    const result = await query(
      `SELECT 
        summary_date,
        component,
        uptime_percentage,
        avg_response_time_ms,
        total_checks,
        successful_checks,
        failed_checks,
        downtime_minutes
       FROM uptime_daily_summary
       WHERE summary_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY summary_date DESC, component`,
      []
    );
    
    // Calculate overall SLA
    const overallSummary = await query<{
      component: string;
      avg_uptime: number;
      total_downtime: number;
    }>(
      `SELECT 
        component,
        AVG(uptime_percentage) as avg_uptime,
        SUM(downtime_minutes) as total_downtime
       FROM uptime_daily_summary
       WHERE summary_date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY component`,
      []
    );
    
    res.json({
      success: true,
      data: {
        daily_metrics: result.rows,
        summary: overallSummary.rows,
        sla_target: 99.9,
        sla_status: overallSummary.rows.every(r => parseFloat(r.avg_uptime.toString()) >= 99.9)
          ? 'MEETING'
          : 'BELOW'
      }
    });
  } catch (error) {
    console.error('[Compliance API] Error fetching uptime:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch uptime metrics'
    });
  }
});

// =====================================================
// SECURITY INCIDENTS
// =====================================================

/**
 * GET /api/v1/compliance/incidents
 * Get security incidents
 */
router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const severity = req.query.severity as string | undefined;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    if (severity) {
      paramCount++;
      whereClause += ` AND severity = $${paramCount}`;
      params.push(severity);
    }
    
    const result = await query(
      `SELECT 
        id,
        incident_type,
        severity,
        title,
        description,
        status,
        detected_at,
        resolved_at,
        reported_to_bon,
        bon_reported_at,
        created_at
       FROM security_incidents
       ${whereClause}
       ORDER BY detected_at DESC
       LIMIT 100`,
      params
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('[Compliance API] Error fetching incidents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incidents'
    });
  }
});

export default router;
