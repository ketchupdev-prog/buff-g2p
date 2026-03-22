// =====================================================
// BON INCIDENT AUTO-REPORTER CRON JOB
// Runs every hour to process unreported incidents
// PSD-12 §21 - 24-Hour Reporting Requirement
// =====================================================

import cron from 'node-cron';
import { getBONIncidentReporterService } from '../services/bon/incidentReporter';

// =====================================================
// CRON JOB CONFIGURATION
// =====================================================

/**
 * Hourly Incident Processing
 * 
 * Schedule: Every hour at minute 15
 * Cron Expression: "15 * * * *"
 * 
 * Checks for new HIGH/CRITICAL incidents and submits them to BoN
 * Runs hourly to ensure timely reporting within 24-hour deadline
 */
export const startBONIncidentReporterJob = () => {
  console.log('[BoN Reporter Job] Scheduling incident reporter every hour at :15');
  
  const bonReporter = getBONIncidentReporterService();
  
  // Schedule: Run every hour at minute 15
  cron.schedule('15 * * * *', async () => {
    console.log('[BoN Reporter Job] Processing unreported incidents...');
    
    try {
      await bonReporter.processUnreportedIncidents();
      console.log('[BoN Reporter Job] Processing complete');
    } catch (error) {
      console.error('[BoN Reporter Job] Processing failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Windhoek'
  });
  
  console.log('[BoN Reporter Job] BoN incident reporter job scheduled');
};

/**
 * Failed Submission Retry
 *
 * Schedule: Every 30 minutes
 *
 * Retries failed incident submissions (up to 3 attempts)
 */
// Cron (every 30 min): */30 * * * *  — not in block comment: `*/` would close JSDoc
export const startRetryJob = () => {
  console.log('[BoN Reporter Job] Scheduling retry job every 30 minutes');
  
  const bonReporter = getBONIncidentReporterService();
  
  cron.schedule('*/30 * * * *', async () => {
    try {
      await bonReporter.retryFailedSubmissions();
    } catch (error) {
      console.error('[BoN Reporter Job] Retry failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Windhoek'
  });
  
  console.log('[BoN Reporter Job] Retry job scheduled');
};

/**
 * Overdue Report Check
 *
 * Schedule: Every 4 hours
 *
 * Checks for reports that have exceeded the 24-hour deadline
 */
// Cron (every 4h): 0 */4 * * *  — expression kept out of block comment (see startRetryJob)
export const startOverdueCheckJob = () => {
  console.log('[BoN Reporter Job] Scheduling overdue check every 4 hours');
  
  const bonReporter = getBONIncidentReporterService();
  
  cron.schedule('0 */4 * * *', async () => {
    console.log('[BoN Reporter Job] Checking for overdue reports...');
    
    try {
      await bonReporter.checkOverdueReports();
    } catch (error) {
      console.error('[BoN Reporter Job] Overdue check failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Windhoek'
  });
  
  console.log('[BoN Reporter Job] Overdue check job scheduled');
};

/**
 * Trigger manual incident processing
 */
export const triggerManualIncidentProcessing = async () => {
  console.log('='.repeat(60));
  console.log('MANUAL BON INCIDENT PROCESSING');
  console.log('Triggered:', new Date().toISOString());
  console.log('='.repeat(60));
  
  const bonReporter = getBONIncidentReporterService();
  
  try {
    await bonReporter.processUnreportedIncidents();
    await bonReporter.retryFailedSubmissions();
    await bonReporter.checkOverdueReports();
    
    console.log('='.repeat(60));
    console.log('BON INCIDENT PROCESSING COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\nBoN incident processing failed:', error);
    throw error;
  }
};

// CLI execution
if (require.main === module) {
  triggerManualIncidentProcessing()
    .then(() => {
      console.log('\n✓ Manual BoN incident processing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Manual BoN incident processing failed:', error);
      process.exit(1);
    });
}
