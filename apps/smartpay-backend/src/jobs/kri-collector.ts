// =====================================================
// KRI COLLECTOR CRON JOB
// Runs daily at 01:00 (after reconciliation)
// PSD-12 Annex B Compliance
// =====================================================

import cron from 'node-cron';
import { getKRICollectorService } from '../services/compliance/kriCollectorService';

// =====================================================
// CRON JOB CONFIGURATION
// =====================================================

/**
 * Daily KRI Collection
 * 
 * Schedule: Every day at 01:00 (1:00 AM)
 * Cron Expression: "0 1 * * *"
 * 
 * Timing rationale:
 * - Runs after trust account reconciliation (00:30)
 * - Ensures all daily data is available for calculation
 * - Results ready for morning compliance review
 */
export const startKRICollectorJob = () => {
  console.log('[KRI Job] Scheduling daily KRI collection at 01:00');
  
  const kriService = getKRICollectorService();
  
  // Schedule: Run daily at 01:00
  cron.schedule('0 1 * * *', async () => {
    const startTime = Date.now();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('AUTOMATED DAILY KRI COLLECTION');
    console.log('Started:', new Date().toISOString());
    console.log('='.repeat(60));
    
    try {
      // Collect all KRIs
      await kriService.collectDailyKRIs();
      
      const duration = Date.now() - startTime;
      
      console.log('');
      console.log('='.repeat(60));
      console.log('KRI COLLECTION COMPLETE');
      console.log('='.repeat(60));
      console.log(`Duration: ${duration}ms`);
      console.log('='.repeat(60));
      console.log('[KRI Job] Completed successfully\n');
      
    } catch (error) {
      console.error('');
      console.error('='.repeat(60));
      console.error('KRI COLLECTION FAILED');
      console.error('='.repeat(60));
      console.error('Error:', error);
      console.error('Time:', new Date().toISOString());
      console.error('='.repeat(60));
      console.error('[KRI Job] Failed - alerting system administrators\n');
      
      throw error;
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Windhoek'
  });
  
  console.log('[KRI Job] KRI collector job scheduled');
  console.log('[KRI Job] Next run: Daily at 01:00 Windhoek time');
};

/**
 * Trigger manual KRI collection
 */
export const triggerManualKRICollection = async () => {
  console.log('='.repeat(60));
  console.log('MANUAL KRI COLLECTION');
  console.log('Triggered:', new Date().toISOString());
  console.log('='.repeat(60));
  
  const kriService = getKRICollectorService();
  
  try {
    await kriService.collectDailyKRIs();
    
    // Get dashboard data
    const dashboard = await kriService.getKRIDashboard();
    
    console.log('\n' + '='.repeat(60));
    console.log('KRI SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Metrics: ${dashboard.summary.total_metrics}`);
    console.log(`Good: ${dashboard.summary.good_count}`);
    console.log(`Warning: ${dashboard.summary.warning_count}`);
    console.log(`Critical: ${dashboard.summary.critical_count}`);
    console.log(`Health Score: ${dashboard.summary.overall_health_score}/100`);
    console.log('='.repeat(60));
    
    return dashboard;
    
  } catch (error) {
    console.error('\nKRI collection failed:', error);
    throw error;
  }
};

// CLI execution
if (require.main === module) {
  triggerManualKRICollection()
    .then(() => {
      console.log('\n✓ Manual KRI collection completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Manual KRI collection failed:', error);
      process.exit(1);
    });
}
