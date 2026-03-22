// =====================================================
// UPTIME MONITORING SERVICE
// PSD-12 §10 - 99.9% SLA Requirement
// =====================================================

import { query } from '../../lib/db';
import { pool } from '../../lib/db';
import axios from 'axios';

// =====================================================
// TYPES
// =====================================================

export interface HealthCheckResult {
  component: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  response_time_ms: number;
  http_status_code?: number;
  error_message?: string;
  metadata?: any;
}

interface DailySummary {
  summary_date: string;
  component: string;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  uptime_percentage: number;
  avg_response_time_ms: number;
  max_response_time_ms: number;
  min_response_time_ms: number;
  downtime_minutes: number;
}

// =====================================================
// UPTIME MONITORING SERVICE
// =====================================================

export class UptimeMonitoringService {
  private apiBaseUrl: string;
  private checkInterval: number; // in milliseconds
  
  constructor(apiBaseUrl?: string, checkInterval: number = 60000) {
    this.apiBaseUrl = apiBaseUrl || process.env.API_BASE_URL || 'http://localhost:4000';
    this.checkInterval = checkInterval;
  }
  
  /**
   * Perform comprehensive health check on all components
   */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    console.log('[Uptime] Performing health check...');
    
    const results: HealthCheckResult[] = [];
    
    try {
      // 1. Check Database
      results.push(await this.checkDatabase());
      
      // 2. Check API
      results.push(await this.checkAPI());
      
      // 3. Check Redis (if configured)
      if (process.env.REDIS_URL) {
        results.push(await this.checkRedis());
      }
      
      // 4. Check AI Service (if enabled)
      if (process.env.AI_SERVICE_ENABLED === 'true') {
        results.push(await this.checkAIService());
      }
      
      // 5. Calculate Overall Status
      results.push(this.calculateOverallStatus(results));
      
      // Save results to database
      await this.saveHealthCheckResults(results);
      
      // Check if we need to alert
      const downComponents = results.filter(r => r.status === 'DOWN');
      if (downComponents.length > 0) {
        await this.alertDownComponents(downComponents);
      }
      
      console.log(`[Uptime] Health check complete: ${results.length} components checked`);
      
      return results;
      
    } catch (error) {
      console.error('[Uptime] Error performing health check:', error);
      throw error;
    }
  }
  
  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await pool.query('SELECT NOW(), pg_database_size(current_database()) as size');
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'database',
        status: responseTime < 1000 ? 'UP' : 'DEGRADED',
        response_time_ms: responseTime,
        metadata: {
          database_size: result.rows[0].size,
          timestamp: result.rows[0].now
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'database',
        status: 'DOWN',
        response_time_ms: responseTime,
        error_message: (error as Error).message
      };
    }
  }
  
  /**
   * Check API responsiveness
   */
  private async checkAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.apiBaseUrl}/health`, {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'api',
        status: response.status === 200 ? 'UP' : 'DEGRADED',
        response_time_ms: responseTime,
        http_status_code: response.status,
        metadata: response.data
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'api',
        status: 'DOWN',
        response_time_ms: responseTime,
        http_status_code: error.response?.status,
        error_message: error.message
      };
    }
  }
  
  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Import Redis dynamically to avoid errors if not configured
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      
      await redis.ping();
      const responseTime = Date.now() - startTime;
      
      await redis.quit();
      
      return {
        component: 'redis',
        status: 'UP',
        response_time_ms: responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'redis',
        status: 'DOWN',
        response_time_ms: responseTime,
        error_message: (error as Error).message
      };
    }
  }
  
  /**
   * Check AI Service availability
   */
  private async checkAIService(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    try {
      const response = await axios.get(`${aiServiceUrl}/health`, {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'ai-service',
        status: response.status === 200 ? 'UP' : 'DEGRADED',
        response_time_ms: responseTime,
        http_status_code: response.status
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'ai-service',
        status: 'DOWN',
        response_time_ms: responseTime,
        http_status_code: error.response?.status,
        error_message: error.message
      };
    }
  }
  
  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(results: HealthCheckResult[]): HealthCheckResult {
    const downCount = results.filter(r => r.status === 'DOWN').length;
    const degradedCount = results.filter(r => r.status === 'DEGRADED').length;
    
    let status: 'UP' | 'DOWN' | 'DEGRADED';
    
    if (downCount > 0) {
      status = 'DOWN';
    } else if (degradedCount > 0) {
      status = 'DEGRADED';
    } else {
      status = 'UP';
    }
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length;
    
    return {
      component: 'overall',
      status,
      response_time_ms: avgResponseTime,
      metadata: {
        total_components: results.length,
        down_count: downCount,
        degraded_count: degradedCount,
        up_count: results.filter(r => r.status === 'UP').length
      }
    };
  }
  
  /**
   * Save health check results to database
   */
  private async saveHealthCheckResults(results: HealthCheckResult[]): Promise<void> {
    for (const result of results) {
      await query(
        `INSERT INTO system_uptime_metrics (
          component,
          status,
          response_time_ms,
          http_status_code,
          error_message,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          result.component,
          result.status,
          result.response_time_ms,
          result.http_status_code || null,
          result.error_message || null,
          JSON.stringify(result.metadata || {})
        ]
      );
    }
  }
  
  /**
   * Alert on down components
   */
  private async alertDownComponents(components: HealthCheckResult[]): Promise<void> {
    for (const component of components) {
      // Check if we've already alerted recently (avoid spam)
      const recentAlert = await query(
        `SELECT id FROM compliance_alerts
         WHERE alert_type = 'uptime'
         AND data->>'component' = $1
         AND resolved = false
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'
         LIMIT 1`,
        [component.component]
      );
      
      if (recentAlert.rows.length > 0) {
        console.log(`[Uptime] Recent alert exists for ${component.component}, skipping`);
        continue;
      }
      
      // Create alert
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
          'uptime',
          'CRITICAL',
          `System Component Down: ${component.component}`,
          `Component ${component.component} is DOWN. Error: ${component.error_message || 'Unknown'}`,
          'PSD-12 §10 - 99.9% Uptime SLA',
          ['Investigate component failure', 'Restore service', 'Check infrastructure'],
          ['ops@smartpay.na', 'cto@smartpay.na'],
          JSON.stringify(component)
        ]
      );
      
      console.warn(`[Uptime] ALERT: Component ${component.component} is DOWN`);
    }
  }
  
  /**
   * Generate daily uptime summary
   */
  async generateDailySummary(date?: string): Promise<void> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`[Uptime] Generating daily summary for ${targetDate}...`);
    
    const result = await query<{
      component: string;
      total_checks: string;
      successful_checks: string;
      avg_response_time: string;
      max_response_time: string;
      min_response_time: string;
    }>(
      `SELECT 
        component,
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE status = 'UP') as successful_checks,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        MIN(response_time_ms) as min_response_time
       FROM system_uptime_metrics
       WHERE DATE(check_timestamp) = $1
       GROUP BY component`,
      [targetDate]
    );
    
    for (const row of result.rows) {
      const totalChecks = parseInt(row.total_checks);
      const successfulChecks = parseInt(row.successful_checks);
      const failedChecks = totalChecks - successfulChecks;
      const uptimePercentage = (successfulChecks / totalChecks) * 100;
      
      // Estimate downtime (assuming 1-minute check interval)
      const downtimeMinutes = failedChecks * 1;
      
      await query(
        `INSERT INTO uptime_daily_summary (
          summary_date,
          component,
          total_checks,
          successful_checks,
          failed_checks,
          uptime_percentage,
          avg_response_time_ms,
          max_response_time_ms,
          min_response_time_ms,
          downtime_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (summary_date, component)
        DO UPDATE SET
          total_checks = EXCLUDED.total_checks,
          successful_checks = EXCLUDED.successful_checks,
          failed_checks = EXCLUDED.failed_checks,
          uptime_percentage = EXCLUDED.uptime_percentage,
          avg_response_time_ms = EXCLUDED.avg_response_time_ms,
          max_response_time_ms = EXCLUDED.max_response_time_ms,
          min_response_time_ms = EXCLUDED.min_response_time_ms,
          downtime_minutes = EXCLUDED.downtime_minutes,
          created_at = CURRENT_TIMESTAMP`,
        [
          targetDate,
          row.component,
          totalChecks,
          successfulChecks,
          failedChecks,
          uptimePercentage,
          parseFloat(row.avg_response_time),
          parseInt(row.max_response_time),
          parseInt(row.min_response_time),
          downtimeMinutes
        ]
      );
    }
    
    console.log(`[Uptime] Daily summary generated for ${targetDate}`);
  }
  
  /**
   * Check if SLA is being met (99.9% uptime)
   */
  async checkSLACompliance(days: number = 30): Promise<{
    is_compliant: boolean;
    actual_uptime: number;
    target_uptime: number;
    components: { component: string; uptime: number }[];
  }> {
    const result = await query<{
      component: string;
      avg_uptime: string;
    }>(
      `SELECT 
        component,
        AVG(uptime_percentage) as avg_uptime
       FROM uptime_daily_summary
       WHERE summary_date >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY component`,
      []
    );
    
    const components = result.rows.map(r => ({
      component: r.component,
      uptime: parseFloat(r.avg_uptime)
    }));
    
    const overallUptime = components.reduce((sum, c) => sum + c.uptime, 0) / components.length;
    const targetUptime = 99.9;
    
    return {
      is_compliant: overallUptime >= targetUptime,
      actual_uptime: overallUptime,
      target_uptime: targetUptime,
      components
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let uptimeMonitoringInstance: UptimeMonitoringService | null = null;

export const getUptimeMonitoringService = (): UptimeMonitoringService => {
  if (!uptimeMonitoringInstance) {
    uptimeMonitoringInstance = new UptimeMonitoringService();
  }
  return uptimeMonitoringInstance;
};
