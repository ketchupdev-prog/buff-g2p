// =====================================================
// TRUST ACCOUNT RECONCILIATION CRON JOB
// Runs daily at 00:30 (after midnight transactions settle)
// PSD-3 §18 Compliance
// =====================================================

import cron from 'node-cron';
import { TrustAccountReconciliationService } from '../services/compliance/trustAccountReconciliation';

// Initialize service
const reconciliationService = new TrustAccountReconciliationService();

// =====================================================
// CRON JOB CONFIGURATION
// =====================================================

/**
 * Daily Trust Account Reconciliation
 * 
 * Schedule: Every day at 00:30 (12:30 AM)
 * Cron Expression: "30 0 * * *"
 * 
 * Timing rationale:
 * - Runs after midnight to ensure all transactions from previous day have settled
 * - Gives 30-minute buffer after midnight for any pending transactions
 * - Early morning run ensures compliance team has results by start of business day
 */
export const startTrustReconciliationJob = () => {
  console.log('[Reconciliation Job] Scheduling daily trust account reconciliation at 00:30');
  
  // Schedule: Run daily at 00:30
  cron.schedule('30 0 * * *', async () => {
    const startTime = Date.now();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('AUTOMATED DAILY TRUST ACCOUNT RECONCILIATION');
    console.log('Started:', new Date().toISOString());
    console.log('='.repeat(60));
    
    try {
      // Perform reconciliation
      const result = await reconciliationService.performDailyReconciliation();
      
      const duration = Date.now() - startTime;
      
      console.log('');
      console.log('='.repeat(60));
      console.log('RECONCILIATION SUMMARY');
      console.log('='.repeat(60));
      console.log(`Status: ${result.status}`);
      console.log(`Compliant: ${result.is_compliant ? 'YES ✓' : 'NO ✗'}`);
      console.log(`Trust Balance: N$${(result.trust_account_balance / 100).toFixed(2)}`);
      console.log(`Liabilities: N$${(result.outstanding_emoney_liabilities / 100).toFixed(2)}`);
      console.log(`Difference: N$${(result.difference / 100).toFixed(2)}`);
      console.log(`Compliance: ${result.compliance_percentage.toFixed(2)}%`);
      console.log(`Duration: ${duration}ms`);
      console.log('='.repeat(60));
      
      if (!result.is_compliant) {
        console.error('');
        console.error('⚠️  CRITICAL ALERT: TRUST ACCOUNT DEFICIENCY DETECTED!');
        console.error(`   Deficiency: N$${(Math.abs(result.difference) / 100).toFixed(2)}`);
        console.error('   Immediate action required - notifications sent to compliance team');
        console.error('');
      }
      
      console.log('[Reconciliation Job] Completed successfully\n');
      
    } catch (error) {
      console.error('');
      console.error('='.repeat(60));
      console.error('RECONCILIATION FAILED');
      console.error('='.repeat(60));
      console.error('Error:', error);
      console.error('Time:', new Date().toISOString());
      console.error('='.repeat(60));
      console.error('[Reconciliation Job] Failed - alerting system administrators\n');
      
      // Re-throw to ensure error is logged
      throw error;
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Windhoek' // Namibia timezone
  });
  
  console.log('[Reconciliation Job] Trust account reconciliation job scheduled');
  console.log('[Reconciliation Job] Next run: Daily at 00:30 Windhoek time');
};

// =====================================================
// MANUAL TRIGGER (for testing or emergency use)
// =====================================================

/**
 * Trigger manual reconciliation
 * Can be called from API endpoint or CLI
 */
export const triggerManualReconciliation = async () => {
  console.log('='.repeat(60));
  console.log('MANUAL TRUST ACCOUNT RECONCILIATION');
  console.log('Triggered:', new Date().toISOString());
  console.log('='.repeat(60));
  
  try {
    const result = await reconciliationService.performDailyReconciliation();
    
    console.log('\n' + '='.repeat(60));
    console.log('RECONCILIATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Date: ${result.reconciliation_date.toISOString().split('T')[0]}`);
    console.log(`Status: ${result.status}`);
    console.log(`Compliant: ${result.is_compliant ? 'YES ✓' : 'NO ✗'}`);
    console.log(`\nTrust Account Balance: N$${(result.trust_account_balance / 100).toFixed(2)}`);
    console.log(`Outstanding Liabilities: N$${(result.outstanding_emoney_liabilities / 100).toFixed(2)}`);
    console.log(`Difference: N$${(result.difference / 100).toFixed(2)}`);
    console.log(`Compliance: ${result.compliance_percentage.toFixed(2)}%`);
    
    if (result.deficiency) {
      console.log('\n⚠️  DEFICIENCY DETAILS:');
      console.log(`   Amount: N$${(result.deficiency.amount / 100).toFixed(2)}`);
      console.log(`   Percentage: ${result.deficiency.percentage.toFixed(2)}%`);
      console.log(`   Resolution Time: ${result.deficiency.estimated_resolution_time}`);
    }
    
    console.log('\nWallet Breakdown:');
    console.log(`   Active Wallets: ${result.wallet_breakdown.active_wallets}`);
    console.log(`   Dormant Wallets: ${result.wallet_breakdown.dormant_wallets}`);
    console.log(`   Individual Balance: N$${(result.wallet_breakdown.individual_balance / 100).toFixed(2)}`);
    console.log(`   Business Balance: N$${(result.wallet_breakdown.business_balance / 100).toFixed(2)}`);
    console.log(`   Agent Float: N$${(result.wallet_breakdown.agent_wallet_balance / 100).toFixed(2)}`);
    
    console.log('='.repeat(60));
    
    return result;
    
  } catch (error) {
    console.error('\nReconciliation failed:', error);
    throw error;
  }
};

// =====================================================
// CLI EXECUTION
// =====================================================

// Allow running directly from command line
if (require.main === module) {
  triggerManualReconciliation()
    .then(() => {
      console.log('\n✓ Manual reconciliation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Manual reconciliation failed:', error);
      process.exit(1);
    });
}
