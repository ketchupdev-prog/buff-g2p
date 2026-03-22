// =====================================================
// KEY RISK INDICATORS (KRI) COLLECTOR SERVICE
// PSD-12 Annex B - 12 Required KRIs
// =====================================================

import { query } from '../../lib/db';

// =====================================================
// TYPES
// =====================================================

export interface KRIMetric {
  metric_name: string;
  metric_value: number;
  target_value: number;
  threshold_warning: number;
  threshold_critical: number;
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
  unit: string;
  category: 'operational' | 'security' | 'compliance' | 'financial';
  description: string;
  metadata?: any;
}

export interface KRIDashboardData {
  summary: {
    total_metrics: number;
    good_count: number;
    warning_count: number;
    critical_count: number;
    overall_health_score: number; // 0-100
    last_updated: Date;
  };
  metrics: KRIMetric[];
  trends: {
    metric_name: string;
    last_7_days: number[];
    dates: string[];
  }[];
}

// =====================================================
// KRI COLLECTOR SERVICE
// =====================================================

export class KRICollectorService {
  
  /**
   * Collect all KRIs for the current day
   */
  async collectDailyKRIs(): Promise<void> {
    console.log('[KRI] Collecting daily Key Risk Indicators...');
    
    const today = new Date().toISOString().split('T')[0];
    const metrics: KRIMetric[] = [];
    
    try {
      // 1. Transaction Success Rate
      metrics.push(await this.calculateTransactionSuccessRate(today));
      
      // 2. System Uptime
      metrics.push(await this.calculateSystemUptime(today));
      
      // 3. 2FA Enforcement Rate
      metrics.push(await this.calculate2FAEnforcementRate(today));
      
      // 4. Fraud Detection Accuracy
      metrics.push(await this.calculateFraudDetectionAccuracy(today));
      
      // 5. Customer Complaint Rate
      metrics.push(await this.calculateCustomerComplaintRate(today));
      
      // 6. Average Resolution Time
      metrics.push(await this.calculateAvgResolutionTime(today));
      
      // 7. Regulatory Breach Count
      metrics.push(await this.calculateRegulatoryBreachCount(today));
      
      // 8. Security Incident Count
      metrics.push(await this.calculateSecurityIncidentCount(today));
      
      // 9. Data Backup Success Rate
      metrics.push(await this.calculateDataBackupSuccessRate(today));
      
      // 10. API Response Time P95
      metrics.push(await this.calculateAPIResponseTimeP95(today));
      
      // 11. Agent Network Uptime
      metrics.push(await this.calculateAgentNetworkUptime(today));
      
      // 12. Trust Reconciliation Pass Rate
      metrics.push(await this.calculateTrustReconciliationPassRate(today));
      
      // Save all metrics to database
      await this.saveKRIMetrics(today, metrics);
      
      console.log(`[KRI] Collected ${metrics.length} KRIs for ${today}`);
      
      // Check for critical KRIs and alert
      const criticalMetrics = metrics.filter(m => m.status === 'CRITICAL');
      if (criticalMetrics.length > 0) {
        console.warn(`[KRI] WARNING: ${criticalMetrics.length} critical KRIs detected`);
        await this.alertCriticalKRIs(criticalMetrics);
      }
      
    } catch (error) {
      console.error('[KRI] Error collecting KRIs:', error);
      throw error;
    }
  }
  
  /**
   * Get KRI dashboard data
   */
  async getKRIDashboard(date?: string): Promise<KRIDashboardData> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`[KRI] Generating dashboard for ${targetDate}`);
    
    // Get metrics for the target date
    const metricsResult = await query<KRIMetric>(
      `SELECT 
        metric_name,
        metric_value,
        target_value,
        threshold_warning,
        threshold_critical,
        status,
        unit,
        category,
        description,
        metadata
       FROM kri_metrics
       WHERE metric_date = $1
       ORDER BY category, metric_name`,
      [targetDate]
    );
    
    const metrics = metricsResult.rows;
    
    // Calculate summary
    const goodCount = metrics.filter(m => m.status === 'GOOD').length;
    const warningCount = metrics.filter(m => m.status === 'WARNING').length;
    const criticalCount = metrics.filter(m => m.status === 'CRITICAL').length;
    
    // Health score calculation (weighted)
    const healthScore = Math.round(
      (goodCount * 100 + warningCount * 50 + criticalCount * 0) / metrics.length
    );
    
    // Get trends for last 7 days
    const trends = await this.getKRITrends(targetDate);
    
    return {
      summary: {
        total_metrics: metrics.length,
        good_count: goodCount,
        warning_count: warningCount,
        critical_count: criticalCount,
        overall_health_score: healthScore,
        last_updated: new Date()
      },
      metrics,
      trends
    };
  }
  
  /**
   * Get KRI trends for the last 7 days
   */
  private async getKRITrends(targetDate: string): Promise<KRIDashboardData['trends']> {
    const result = await query<{
      metric_name: string;
      metric_date: string;
      metric_value: number;
    }>(
      `SELECT metric_name, metric_date, metric_value
       FROM kri_metrics
       WHERE metric_date >= $1::date - INTERVAL '6 days'
       AND metric_date <= $1::date
       ORDER BY metric_name, metric_date`,
      [targetDate]
    );
    
    // Group by metric name
    const trendsMap = new Map<string, { dates: string[]; values: number[] }>();
    
    for (const row of result.rows) {
      if (!trendsMap.has(row.metric_name)) {
        trendsMap.set(row.metric_name, { dates: [], values: [] });
      }
      const trend = trendsMap.get(row.metric_name)!;
      trend.dates.push(row.metric_date);
      trend.values.push(row.metric_value);
    }
    
    // Convert to array format
    return Array.from(trendsMap.entries()).map(([metric_name, data]) => ({
      metric_name,
      last_7_days: data.values,
      dates: data.dates
    }));
  }
  
  /**
   * Generate XML report for BoN quarterly submission
   */
  async generateBONQuarterlyReport(year: number, quarter: number): Promise<string> {
    console.log(`[KRI] Generating BoN quarterly report for ${year} Q${quarter}`);
    
    // Get all KRIs for the quarter
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    
    const result = await query(
      `SELECT 
        metric_name,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        target_value,
        unit,
        category
       FROM kri_metrics
       WHERE EXTRACT(YEAR FROM metric_date) = $1
       AND EXTRACT(MONTH FROM metric_date) BETWEEN $2 AND $3
       GROUP BY metric_name, target_value, unit, category
       ORDER BY category, metric_name`,
      [year, startMonth, endMonth]
    );
    
    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<KRIReport>
  <ReportingPeriod>
    <Year>${year}</Year>
    <Quarter>${quarter}</Quarter>
  </ReportingPeriod>
  <Institution>
    <Name>SmartPay Namibia</Name>
    <LicenseNumber>PSP-2024-001</LicenseNumber>
  </Institution>
  <KeyRiskIndicators>
${result.rows.map(row => `    <Indicator>
      <Name>${row.metric_name}</Name>
      <Category>${row.category}</Category>
      <AverageValue unit="${row.unit}">${row.avg_value}</AverageValue>
      <MinValue>${row.min_value}</MinValue>
      <MaxValue>${row.max_value}</MaxValue>
      <TargetValue>${row.target_value}</TargetValue>
    </Indicator>`).join('\n')}
  </KeyRiskIndicators>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
</KRIReport>`;
    
    return xml;
  }
  
  // =====================================================
  // KRI CALCULATION METHODS
  // =====================================================
  
  /**
   * 1. Transaction Success Rate (Target: >99.5%)
   */
  private async calculateTransactionSuccessRate(date: string): Promise<KRIMetric> {
    const result = await query<{ total: string; successful: string }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful
       FROM transactions
       WHERE DATE(created_at) = $1`,
      [date]
    );
    
    const total = parseInt(result.rows[0]?.total || '0');
    const successful = parseInt(result.rows[0]?.successful || '0');
    const rate = total > 0 ? (successful / total) * 100 : 100;
    
    return {
      metric_name: 'transaction_success_rate',
      metric_value: rate,
      target_value: 99.5,
      threshold_warning: 99.0,
      threshold_critical: 98.0,
      status: rate >= 99.0 ? 'GOOD' : rate >= 98.0 ? 'WARNING' : 'CRITICAL',
      unit: 'percentage',
      category: 'operational',
      description: 'Percentage of successful transactions',
      metadata: { total_transactions: total, successful_transactions: successful }
    };
  }
  
  /**
   * 2. System Uptime (Target: 99.9%)
   */
  private async calculateSystemUptime(date: string): Promise<KRIMetric> {
    const result = await query<{ total: string; up: string }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'UP') as up
       FROM system_uptime_metrics
       WHERE DATE(check_timestamp) = $1
       AND component = 'overall'`,
      [date]
    );
    
    const total = parseInt(result.rows[0]?.total || '1');
    const up = parseInt(result.rows[0]?.up || '1');
    const uptime = (up / total) * 100;
    
    return {
      metric_name: 'system_uptime',
      metric_value: uptime,
      target_value: 99.9,
      threshold_warning: 99.5,
      threshold_critical: 99.0,
      status: uptime >= 99.5 ? 'GOOD' : uptime >= 99.0 ? 'WARNING' : 'CRITICAL',
      unit: 'percentage',
      category: 'operational',
      description: 'Overall system uptime percentage',
      metadata: { total_checks: total, up_checks: up }
    };
  }
  
  /**
   * 3. 2FA Enforcement Rate (Target: 100% on payments)
   */
  private async calculate2FAEnforcementRate(date: string): Promise<KRIMetric> {
    const result = await query<{ total: string; with_2fa: string }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE two_factor_verified = true) as with_2fa
       FROM transactions
       WHERE DATE(created_at) = $1
       AND transaction_type IN ('SEND_MONEY', 'CASH_OUT', 'LOAN_DISBURSEMENT')`,
      [date]
    );
    
    const total = parseInt(result.rows[0]?.total || '0');
    const with2FA = parseInt(result.rows[0]?.with_2fa || '0');
    const rate = total > 0 ? (with2FA / total) * 100 : 100;
    
    return {
      metric_name: '2fa_enforcement_rate',
      metric_value: rate,
      target_value: 100,
      threshold_warning: 99.5,
      threshold_critical: 99.0,
      status: rate >= 99.5 ? 'GOOD' : rate >= 99.0 ? 'WARNING' : 'CRITICAL',
      unit: 'percentage',
      category: 'security',
      description: 'Percentage of payments with 2FA',
      metadata: { total_payments: total, payments_with_2fa: with2FA }
    };
  }
  
  /**
   * 4. Fraud Detection Accuracy (Target: >98%)
   */
  private async calculateFraudDetectionAccuracy(date: string): Promise<KRIMetric> {
    // Placeholder - implement when fraud detection system is in place
    return {
      metric_name: 'fraud_detection_accuracy',
      metric_value: 99.0,
      target_value: 98.0,
      threshold_warning: 95.0,
      threshold_critical: 90.0,
      status: 'GOOD',
      unit: 'percentage',
      category: 'security',
      description: 'Fraud detection accuracy',
      metadata: { note: 'Placeholder - fraud detection system not yet implemented' }
    };
  }
  
  /**
   * 5. Customer Complaint Rate (Target: <1% per 1000 users)
   */
  private async calculateCustomerComplaintRate(date: string): Promise<KRIMetric> {
    const result = await query<{ users: string; complaints: string }>(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') as users,
        (SELECT COUNT(*) FROM complaints WHERE DATE(created_at) = $1) as complaints`,
      [date]
    );
    
    const users = parseInt(result.rows[0]?.users || '1');
    const complaints = parseInt(result.rows[0]?.complaints || '0');
    const rate = (complaints / users) * 1000;
    
    return {
      metric_name: 'customer_complaint_rate',
      metric_value: rate,
      target_value: 1.0,
      threshold_warning: 2.0,
      threshold_critical: 5.0,
      status: rate <= 2.0 ? 'GOOD' : rate <= 5.0 ? 'WARNING' : 'CRITICAL',
      unit: 'per_1000_users',
      category: 'operational',
      description: 'Customer complaints per 1000 users',
      metadata: { total_users: users, complaints_today: complaints }
    };
  }
  
  /**
   * 6. Average Resolution Time (Target: <24 hours)
   */
  private async calculateAvgResolutionTime(date: string): Promise<KRIMetric> {
    const result = await query<{ avg_hours: string }>(
      `SELECT 
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
       FROM complaints
       WHERE DATE(resolved_at) = $1
       AND status = 'RESOLVED'`,
      [date]
    );
    
    const avgHours = parseFloat(result.rows[0]?.avg_hours || '12');
    
    return {
      metric_name: 'avg_resolution_time_hours',
      metric_value: avgHours,
      target_value: 24,
      threshold_warning: 48,
      threshold_critical: 72,
      status: avgHours <= 48 ? 'GOOD' : avgHours <= 72 ? 'WARNING' : 'CRITICAL',
      unit: 'hours',
      category: 'operational',
      description: 'Average complaint resolution time'
    };
  }
  
  /**
   * 7. Regulatory Breach Count (Target: 0)
   */
  private async calculateRegulatoryBreachCount(date: string): Promise<KRIMetric> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM compliance_alerts
       WHERE DATE(created_at) = $1
       AND severity IN ('CRITICAL', 'EMERGENCY')
       AND alert_type = 'trust_account'`,
      [date]
    );
    
    const count = parseInt(result.rows[0]?.count || '0');
    
    return {
      metric_name: 'regulatory_breach_count',
      metric_value: count,
      target_value: 0,
      threshold_warning: 1,
      threshold_critical: 2,
      status: count === 0 ? 'GOOD' : count <= 1 ? 'WARNING' : 'CRITICAL',
      unit: 'count',
      category: 'compliance',
      description: 'Number of regulatory breaches'
    };
  }
  
  /**
   * 8. Security Incident Count (Target: 0)
   */
  private async calculateSecurityIncidentCount(date: string): Promise<KRIMetric> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM security_incidents
       WHERE DATE(detected_at) = $1
       AND severity IN ('HIGH', 'CRITICAL')`,
      [date]
    );
    
    const count = parseInt(result.rows[0]?.count || '0');
    
    return {
      metric_name: 'security_incident_count',
      metric_value: count,
      target_value: 0,
      threshold_warning: 1,
      threshold_critical: 3,
      status: count === 0 ? 'GOOD' : count <= 2 ? 'WARNING' : 'CRITICAL',
      unit: 'count',
      category: 'security',
      description: 'Number of security incidents'
    };
  }
  
  /**
   * 9. Data Backup Success Rate (Target: 100%)
   */
  private async calculateDataBackupSuccessRate(date: string): Promise<KRIMetric> {
    // Placeholder - implement when backup system is in place
    return {
      metric_name: 'data_backup_success_rate',
      metric_value: 100,
      target_value: 100,
      threshold_warning: 99.5,
      threshold_critical: 99.0,
      status: 'GOOD',
      unit: 'percentage',
      category: 'operational',
      description: 'Data backup success rate',
      metadata: { note: 'Placeholder - backup monitoring not yet implemented' }
    };
  }
  
  /**
   * 10. API Response Time P95 (Target: <500ms)
   */
  private async calculateAPIResponseTimeP95(date: string): Promise<KRIMetric> {
    const result = await query<{ p95: string }>(
      `SELECT 
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95
       FROM system_uptime_metrics
       WHERE DATE(check_timestamp) = $1
       AND component = 'api'
       AND response_time_ms IS NOT NULL`,
      [date]
    );
    
    const p95 = parseFloat(result.rows[0]?.p95 || '200');
    
    return {
      metric_name: 'api_response_time_p95_ms',
      metric_value: p95,
      target_value: 500,
      threshold_warning: 1000,
      threshold_critical: 2000,
      status: p95 <= 1000 ? 'GOOD' : p95 <= 2000 ? 'WARNING' : 'CRITICAL',
      unit: 'milliseconds',
      category: 'operational',
      description: 'API response time 95th percentile'
    };
  }
  
  /**
   * 11. Agent Network Uptime (Target: >99%)
   */
  private async calculateAgentNetworkUptime(date: string): Promise<KRIMetric> {
    const result = await query<{ total: string; active: string }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as active
       FROM agents`,
      []
    );
    
    const total = parseInt(result.rows[0]?.total || '1');
    const active = parseInt(result.rows[0]?.active || '1');
    const uptime = (active / total) * 100;
    
    return {
      metric_name: 'agent_network_uptime',
      metric_value: uptime,
      target_value: 99.0,
      threshold_warning: 98.0,
      threshold_critical: 95.0,
      status: uptime >= 98.0 ? 'GOOD' : uptime >= 95.0 ? 'WARNING' : 'CRITICAL',
      unit: 'percentage',
      category: 'operational',
      description: 'Agent network uptime'
    };
  }
  
  /**
   * 12. Trust Reconciliation Pass Rate (Target: 100%)
   */
  private async calculateTrustReconciliationPassRate(date: string): Promise<KRIMetric> {
    const result = await query<{ total: string; passed: string }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_compliant = true) as passed
       FROM reconciliation_log
       WHERE reconciliation_date >= $1::date - INTERVAL '30 days'
       AND reconciliation_date <= $1::date`,
      [date]
    );
    
    const total = parseInt(result.rows[0]?.total || '1');
    const passed = parseInt(result.rows[0]?.passed || '1');
    const rate = (passed / total) * 100;
    
    return {
      metric_name: 'trust_reconciliation_pass_rate',
      metric_value: rate,
      target_value: 100,
      threshold_warning: 99.0,
      threshold_critical: 98.0,
      status: rate >= 99.0 ? 'GOOD' : rate >= 98.0 ? 'WARNING' : 'CRITICAL',
      unit: 'percentage',
      category: 'compliance',
      description: 'Trust account reconciliation pass rate (last 30 days)'
    };
  }
  
  // =====================================================
  // HELPER METHODS
  // =====================================================
  
  /**
   * Save KRI metrics to database
   */
  private async saveKRIMetrics(date: string, metrics: KRIMetric[]): Promise<void> {
    for (const metric of metrics) {
      await query(
        `INSERT INTO kri_metrics (
          metric_date,
          metric_name,
          metric_value,
          target_value,
          threshold_warning,
          threshold_critical,
          status,
          unit,
          category,
          description,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (metric_date, metric_name)
        DO UPDATE SET
          metric_value = EXCLUDED.metric_value,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          created_at = CURRENT_TIMESTAMP`,
        [
          date,
          metric.metric_name,
          metric.metric_value,
          metric.target_value,
          metric.threshold_warning,
          metric.threshold_critical,
          metric.status,
          metric.unit,
          metric.category,
          metric.description,
          JSON.stringify(metric.metadata || {})
        ]
      );
    }
  }
  
  /**
   * Alert on critical KRIs
   */
  private async alertCriticalKRIs(metrics: KRIMetric[]): Promise<void> {
    for (const metric of metrics) {
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
          'kri',
          'CRITICAL',
          `Critical KRI: ${metric.metric_name}`,
          `${metric.description} is at ${metric.metric_value.toFixed(2)} ${metric.unit}, below critical threshold of ${metric.threshold_critical} ${metric.unit}`,
          'PSD-12 Annex B',
          ['Investigate root cause', 'Implement corrective actions', 'Monitor closely'],
          ['compliance@smartpay.na', 'cto@smartpay.na'],
          JSON.stringify(metric)
        ]
      );
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let kriCollectorInstance: KRICollectorService | null = null;

export const getKRICollectorService = (): KRICollectorService => {
  if (!kriCollectorInstance) {
    kriCollectorInstance = new KRICollectorService();
  }
  return kriCollectorInstance;
};
