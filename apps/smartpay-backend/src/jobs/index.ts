// =====================================================
// COMPLIANCE AUTOMATION JOB SCHEDULER
// Central initialization for all compliance cron jobs
// =====================================================

import { startTrustReconciliationJob } from './trust-reconciliation';
import { startKRICollectorJob } from './kri-collector';
import { startUptimeMonitoringJob, startDailySummaryJob, startSLAComplianceCheckJob } from './uptime-monitor';
import { startBONIncidentReporterJob, startRetryJob, startOverdueCheckJob } from './bon-incident-reporter';
import { startNotificationProcessingJob } from '../services/notifications/alertNotificationService';

// =====================================================
// INITIALIZE ALL COMPLIANCE JOBS
// =====================================================

/**
 * Start all compliance automation cron jobs
 * 
 * This function should be called when the application starts
 * to initialize all scheduled compliance monitoring jobs
 */
export const initializeComplianceJobs = () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('INITIALIZING COMPLIANCE AUTOMATION JOBS');
  console.log('='.repeat(60));
  console.log('');
  
  // 1. Trust Account Reconciliation (Daily at 00:30)
  console.log('[Jobs] Starting Trust Account Reconciliation Job...');
  startTrustReconciliationJob();
  
  // 2. KRI Collection (Daily at 01:00)
  console.log('[Jobs] Starting KRI Collector Job...');
  startKRICollectorJob();
  
  // 3. Uptime Monitoring (Every 1 minute)
  console.log('[Jobs] Starting Uptime Monitoring Job...');
  startUptimeMonitoringJob();
  
  // 4. Daily Uptime Summary (Daily at 23:55)
  console.log('[Jobs] Starting Daily Uptime Summary Job...');
  startDailySummaryJob();
  
  // 5. SLA Compliance Check (Weekly Monday at 08:00)
  console.log('[Jobs] Starting SLA Compliance Check Job...');
  startSLAComplianceCheckJob();
  
  // 6. BoN Incident Reporter (Hourly at :15)
  console.log('[Jobs] Starting BoN Incident Reporter Job...');
  startBONIncidentReporterJob();
  
  // 7. BoN Retry Job (Every 30 minutes)
  console.log('[Jobs] Starting BoN Retry Job...');
  startRetryJob();
  
  // 8. BoN Overdue Check (Every 4 hours)
  console.log('[Jobs] Starting BoN Overdue Check Job...');
  startOverdueCheckJob();
  
  // 9. Notification Processing (Every 1 minute)
  console.log('[Jobs] Starting Notification Processing Job...');
  startNotificationProcessingJob();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('ALL COMPLIANCE JOBS INITIALIZED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log('');
  console.log('Active Jobs:');
  console.log('  • Trust Account Reconciliation: Daily at 00:30');
  console.log('  • KRI Collection: Daily at 01:00');
  console.log('  • Uptime Monitoring: Every 1 minute');
  console.log('  • Daily Uptime Summary: Daily at 23:55');
  console.log('  • SLA Compliance Check: Weekly Monday at 08:00');
  console.log('  • BoN Incident Reporter: Hourly at :15');
  console.log('  • BoN Retry: Every 30 minutes');
  console.log('  • BoN Overdue Check: Every 4 hours');
  console.log('  • Notification Processing: Every 1 minute');
  console.log('');
  console.log('Timezone: Africa/Windhoek');
  console.log('='.repeat(60));
  console.log('');
};

// =====================================================
// EXPORT JOB SCHEDULE INFORMATION
// =====================================================

export const getJobSchedule = () => {
  return [
    {
      name: 'Trust Account Reconciliation',
      schedule: '30 0 * * *',
      description: 'Daily reconciliation of trust account vs outstanding liabilities',
      timezone: 'Africa/Windhoek',
      regulation: 'PSD-3 §18',
      file: 'trust-reconciliation.ts'
    },
    {
      name: 'KRI Collection',
      schedule: '0 1 * * *',
      description: 'Collect 12 Key Risk Indicators for compliance dashboard',
      timezone: 'Africa/Windhoek',
      regulation: 'PSD-12 Annex B',
      file: 'kri-collector.ts'
    },
    {
      name: 'Uptime Monitoring',
      schedule: '* * * * *',
      description: 'Health check all system components every minute',
      timezone: 'Africa/Windhoek',
      regulation: 'PSD-12 §10',
      file: 'uptime-monitor.ts'
    },
    {
      name: 'Daily Uptime Summary',
      schedule: '55 23 * * *',
      description: 'Generate daily uptime metrics summary',
      timezone: 'Africa/Windhoek',
      regulation: 'PSD-12 §10',
      file: 'uptime-monitor.ts'
    },
    {
      name: 'SLA Compliance Check',
      schedule: '0 8 * * 1',
      description: 'Weekly check of 99.9% uptime SLA compliance',
      timezone: 'Africa/Windhoek',
      regulation: 'PSD-12 §10',
      file: 'uptime-monitor.ts'
    },
    {
      name: 'BoN Incident Reporter',
      schedule: '15 * * * *',
      description: 'Process and report HIGH/CRITICAL incidents to BoN',
      timezone: 'Africa/Windhoek',
      regulation: 'PSD-12 §21',
      file: 'bon-incident-reporter.ts'
    },
    {
      name: 'BoN Retry',
      schedule: '*/30 * * * *',
      description: 'Retry failed BoN incident submissions',
      timezone: 'Africa/Windhoek',
      regulation: 'PSD-12 §21',
      file: 'bon-incident-reporter.ts'
    },
    {
      name: 'BoN Overdue Check',
      schedule: '0 */4 * * *',
      description: 'Check for overdue incident reports (>24 hours)',
      timezone: 'Africa/Windhoek',
      regulation: 'PSD-12 §21',
      file: 'bon-incident-reporter.ts'
    },
    {
      name: 'Notification Processing',
      schedule: '* * * * *',
      description: 'Process pending email/SMS alert notifications',
      timezone: 'Africa/Windhoek',
      regulation: 'Internal',
      file: 'alertNotificationService.ts'
    }
  ];
};

// =====================================================
// CLI TOOL - Display Job Schedule
// =====================================================

if (require.main === module) {
  const schedule = getJobSchedule();
  
  console.log('');
  console.log('='.repeat(80));
  console.log('COMPLIANCE AUTOMATION JOB SCHEDULE');
  console.log('='.repeat(80));
  console.log('');
  
  schedule.forEach((job, index) => {
    console.log(`${index + 1}. ${job.name}`);
    console.log(`   Schedule: ${job.schedule}`);
    console.log(`   Description: ${job.description}`);
    console.log(`   Regulation: ${job.regulation}`);
    console.log(`   File: ${job.file}`);
    console.log('');
  });
  
  console.log('='.repeat(80));
  console.log(`Total Jobs: ${schedule.length}`);
  console.log('Timezone: Africa/Windhoek (Namibia)');
  console.log('='.repeat(80));
  console.log('');
}
