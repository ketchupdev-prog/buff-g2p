// =====================================================
// TRUST ACCOUNT DAILY RECONCILIATION SCRIPT
// Compliant with Bank of Namibia PSD-3 Section 11.2.4
// =====================================================

/**
 * PSD-3 Section 11.2.4 Requirements:
 * - At all times, aggregate value of pooled funds must equal at least 100% 
 *   of the value of all outstanding e-money liabilities
 * - Funds must be reconciled on a DAILY basis
 * - Any deficiencies addressed within ONE (1) business day
 */

import { Decimal } from 'decimal.js';
import { pool, query, transaction } from '../../lib/db';
import { PoolClient } from 'pg';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface TrustAccount {
  id: number;
  bank_name: string;
  account_number: string;
  current_balance: number; // in cents
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  is_primary: boolean;
}

interface WalletBalance {
  wallet_id: number;
  wallet_number: string;
  balance: number; // in cents
  wallet_type: 'INDIVIDUAL' | 'BUSINESS' | 'AGENT';
  status: 'ACTIVE' | 'DORMANT' | 'SUSPENDED' | 'CLOSED';
}

interface AgentFloat {
  agent_id: number;
  agent_code: string;
  float_balance: number; // in cents
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
}

interface ReconciliationResult {
  reconciliation_date: Date;
  
  // E-money side
  total_wallet_balances: number;
  total_agent_floats: number;
  outstanding_emoney_liabilities: number;
  
  // Trust account side
  trust_account_balance: number;
  
  // Comparison
  difference: number; // trust_account - liabilities
  is_compliant: boolean;
  compliance_percentage: number;
  
  // Status
  status: 'COMPLIANT' | 'DEFICIENT' | 'WARNING';
  
  // Details
  wallet_breakdown: {
    active_wallets: number;
    dormant_wallets: number;
    total_wallets: number;
    individual_balance: number;
    business_balance: number;
    agent_wallet_balance: number;
  };
  
  // Deficiency details (if applicable)
  deficiency?: {
    amount: number;
    percentage: number;
    requires_immediate_action: boolean;
    estimated_resolution_time: string;
  };
}

interface ReconciliationAlert {
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  title: string;
  message: string;
  data: any;
  actions_required: string[];
  recipients: string[]; // Email/phone numbers for alerts
}

// =====================================================
// TRUST ACCOUNT RECONCILIATION SERVICE
// =====================================================

class TrustAccountReconciliationService {
  
  /**
   * Main reconciliation function - to be run daily
   * Recommended: Run at midnight (00:00) via cron job
   */
  async performDailyReconciliation(): Promise<ReconciliationResult> {
    console.log('[Reconciliation] Starting daily trust account reconciliation...');
    
    const reconciliationDate = new Date();
    reconciliationDate.setHours(0, 0, 0, 0); // Start of day
    
    try {
      // Step 1: Get trust account balance
      const trustAccount = await this.getPrimaryTrustAccount();
      console.log(`[Reconciliation] Trust account balance: N$${this.formatAmount(trustAccount.current_balance)}`);
      
      // Step 2: Calculate total wallet balances
      const walletBalances = await this.getAllWalletBalances();
      const totalWalletBalances = this.sumBalances(walletBalances);
      console.log(`[Reconciliation] Total wallet balances: N$${this.formatAmount(totalWalletBalances)}`);
      
      // Step 3: Calculate total agent floats
      const agentFloats = await this.getAllAgentFloats();
      const totalAgentFloats = this.sumAgentFloats(agentFloats);
      console.log(`[Reconciliation] Total agent floats: N$${this.formatAmount(totalAgentFloats)}`);
      
      // Step 4: Calculate outstanding e-money liabilities
      const outstandingLiabilities = totalWalletBalances + totalAgentFloats;
      console.log(`[Reconciliation] Outstanding e-money liabilities: N$${this.formatAmount(outstandingLiabilities)}`);
      
      // Step 5: Calculate difference and compliance
      const difference = trustAccount.current_balance - outstandingLiabilities;
      const isCompliant = trustAccount.current_balance >= outstandingLiabilities;
      const compliancePercentage = (trustAccount.current_balance / outstandingLiabilities) * 100;
      
      console.log(`[Reconciliation] Difference: N$${this.formatAmount(difference)}`);
      console.log(`[Reconciliation] Compliance: ${compliancePercentage.toFixed(2)}%`);
      console.log(`[Reconciliation] Status: ${isCompliant ? 'COMPLIANT ✓' : 'DEFICIENT ✗'}`);
      
      // Step 6: Build wallet breakdown
      const walletBreakdown = this.buildWalletBreakdown(walletBalances);
      
      // Step 7: Determine status and build result
      let status: 'COMPLIANT' | 'DEFICIENT' | 'WARNING' = 'COMPLIANT';
      let deficiency: ReconciliationResult['deficiency'] | undefined;
      
      if (!isCompliant) {
        status = 'DEFICIENT';
        const deficiencyAmount = Math.abs(difference);
        const deficiencyPercentage = (deficiencyAmount / outstandingLiabilities) * 100;
        
        deficiency = {
          amount: deficiencyAmount,
          percentage: deficiencyPercentage,
          requires_immediate_action: true,
          estimated_resolution_time: '1 business day' // PSD-3 requirement
        };
        
        // Critical alert
        await this.sendAlert({
          severity: 'EMERGENCY',
          title: 'TRUST ACCOUNT DEFICIENCY DETECTED',
          message: `Trust account is N$${this.formatAmount(deficiencyAmount)} SHORT of required balance. Immediate action required!`,
          data: {
            trust_account_balance: trustAccount.current_balance,
            outstanding_liabilities: outstandingLiabilities,
            deficiency: deficiencyAmount,
            compliance_percentage: compliancePercentage
          },
          actions_required: [
            'Transfer funds to trust account immediately',
            'Suspend new e-money issuance until resolved',
            'Notify Bank of Namibia if deficiency > 0.5%',
            'Document root cause and remediation actions'
          ],
          recipients: [
            'cfo@yourcompany.com',
            'compliance@yourcompany.com',
            'ceo@yourcompany.com',
            '+264811234567' // SMS to key personnel
          ]
        });
        
      } else if (compliancePercentage < 105) {
        // Warning: Too close to minimum threshold
        status = 'WARNING';
        
        await this.sendAlert({
          severity: 'WARNING',
          title: 'Trust Account Balance Low',
          message: `Trust account is only ${compliancePercentage.toFixed(2)}% of required liabilities. Consider increasing buffer.`,
          data: {
            trust_account_balance: trustAccount.current_balance,
            outstanding_liabilities: outstandingLiabilities,
            surplus: difference
          },
          actions_required: [
            'Monitor closely',
            'Consider increasing trust account buffer',
            'Review projected e-money growth'
          ],
          recipients: [
            'finance@yourcompany.com',
            'compliance@yourcompany.com'
          ]
        });
      }
      
      // Step 8: Build result
      const result: ReconciliationResult = {
        reconciliation_date: reconciliationDate,
        total_wallet_balances: totalWalletBalances,
        total_agent_floats: totalAgentFloats,
        outstanding_emoney_liabilities: outstandingLiabilities,
        trust_account_balance: trustAccount.current_balance,
        difference,
        is_compliant: isCompliant,
        compliance_percentage: compliancePercentage,
        status,
        wallet_breakdown: walletBreakdown,
        deficiency
      };
      
      // Step 9: Save reconciliation record to database
      await this.saveReconciliationRecord(result);
      
      console.log('[Reconciliation] Daily reconciliation completed successfully');
      
      return result;
      
    } catch (error) {
      console.error('[Reconciliation] Error during reconciliation:', error);
      
      // Alert on reconciliation failure
      await this.sendAlert({
        severity: 'CRITICAL',
        title: 'Reconciliation Process Failed',
        message: `Daily reconciliation failed to complete. Manual intervention required.`,
        data: { error: (error as Error).message },
        actions_required: [
          'Investigate reconciliation failure',
          'Run manual reconciliation',
          'Check database connectivity',
          'Review system logs'
        ],
        recipients: [
          'tech@yourcompany.com',
          'compliance@yourcompany.com'
        ]
      });
      
      throw error;
    }
  }
  
  /**
   * Resolve trust account deficiency
   */
  async resolveDeficiency(
    deficiencyAmount: number,
    fundingSource: string,
    reference: string
  ): Promise<void> {
    console.log(`[Reconciliation] Resolving deficiency of N$${this.formatAmount(deficiencyAmount)}`);
    
    // Record the resolution
    const trustAccount = await this.getPrimaryTrustAccount();
    
    // Update trust account balance
    const newBalance = trustAccount.current_balance + deficiencyAmount;
    
    await this.updateTrustAccountBalance(trustAccount.id, newBalance);
    
    // Record trust account movement
    await this.recordTrustAccountMovement({
      trust_account_id: trustAccount.id,
      type: 'ADJUSTMENT',
      amount: deficiencyAmount,
      description: `Deficiency resolution - ${fundingSource}`,
      bank_reference: reference,
      reconciled: true
    });
    
    // Update reconciliation record
    await this.markDeficiencyResolved(new Date(), {
      resolution_method: fundingSource,
      resolution_reference: reference,
      resolution_amount: deficiencyAmount,
      resolved_at: new Date()
    });
    
    // Send confirmation alert
    await this.sendAlert({
      severity: 'INFO',
      title: 'Trust Account Deficiency Resolved',
      message: `Deficiency of N$${this.formatAmount(deficiencyAmount)} has been successfully resolved.`,
      data: {
        previous_balance: trustAccount.current_balance,
        added_amount: deficiencyAmount,
        new_balance: newBalance,
        funding_source: fundingSource,
        reference
      },
      actions_required: [
        'Verify new balance with bank statement',
        'Resume normal e-money operations',
        'Update Bank of Namibia if previously notified'
      ],
      recipients: [
        'cfo@yourcompany.com',
        'compliance@yourcompany.com'
      ]
    });
    
    console.log('[Reconciliation] Deficiency resolved successfully');
  }
  
  /**
   * Generate monthly reconciliation report for Bank of Namibia
   * Reference: PSD-3 Section 11.2.6 & Section 16
   */
  async generateMonthlyReport(year: number, month: number): Promise<any> {
    console.log(`[Reconciliation] Generating monthly report for ${year}-${month.toString().padStart(2, '0')}`);
    
    // Get all daily reconciliations for the month
    const dailyReconciliations = await this.getDailyReconciliationsForMonth(year, month);
    
    // Calculate monthly statistics
    const report = {
      report_period: `${year}-${month.toString().padStart(2, '0')}`,
      
      // Daily compliance
      total_days: dailyReconciliations.length,
      compliant_days: dailyReconciliations.filter(r => r.is_compliant).length,
      deficient_days: dailyReconciliations.filter(r => !r.is_compliant).length,
      compliance_rate: (dailyReconciliations.filter(r => r.is_compliant).length / dailyReconciliations.length) * 100,
      
      // Average balances
      avg_trust_account_balance: this.calculateAverage(dailyReconciliations.map(r => r.trust_account_balance)),
      avg_outstanding_liabilities: this.calculateAverage(dailyReconciliations.map(r => r.outstanding_emoney_liabilities)),
      
      // Month-end snapshot
      end_of_month_trust_balance: dailyReconciliations[dailyReconciliations.length - 1]?.trust_account_balance || 0,
      end_of_month_liabilities: dailyReconciliations[dailyReconciliations.length - 1]?.outstanding_emoney_liabilities || 0,
      
      // Interest accrued (to be calculated from trust account statements)
      interest_accrued: await this.calculateMonthlyInterest(year, month),
      
      // Attestation
      attestation: dailyReconciliations[dailyReconciliations.length - 1]?.is_compliant || false,
      attestation_statement: 'The trust account balance equals at least 100% of all outstanding e-money liabilities as of the end of the reporting period.',
      
      // Deficiency details (if any)
      deficiencies: dailyReconciliations
        .filter(r => !r.is_compliant)
        .map(r => ({
          date: r.reconciliation_date,
          deficiency_amount: Math.abs(r.difference),
          resolved: r.deficiency_resolved,
          resolved_at: r.deficiency_resolved_at
        })),
      
      // Generated by
      generated_by: 'Automated Reconciliation System',
      generated_at: new Date(),
      
      // Approval
      approved_by: null, // To be filled by CFO
      approved_at: null
    };
    
    // Save report
    await this.saveMonthlyReport(report);
    
    console.log('[Reconciliation] Monthly report generated successfully');
    
    return report;
  }
  
  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  
  /**
   * Sum wallet balances
   */
  private sumBalances(wallets: WalletBalance[]): number {
    return wallets.reduce((sum, wallet) => {
      // Only count ACTIVE and DORMANT wallets (PSD-3 Section 3.12)
      if (['ACTIVE', 'DORMANT'].includes(wallet.status)) {
        return sum + wallet.balance;
      }
      return sum;
    }, 0);
  }
  
  /**
   * Sum agent floats
   */
  private sumAgentFloats(agents: AgentFloat[]): number {
    return agents.reduce((sum, agent) => {
      if (agent.status === 'ACTIVE') {
        return sum + agent.float_balance;
      }
      return sum;
    }, 0);
  }
  
  /**
   * Build detailed wallet breakdown
   */
  private buildWalletBreakdown(wallets: WalletBalance[]): ReconciliationResult['wallet_breakdown'] {
    const activeWallets = wallets.filter(w => w.status === 'ACTIVE');
    const dormantWallets = wallets.filter(w => w.status === 'DORMANT');
    
    const individualBalance = wallets
      .filter(w => w.wallet_type === 'INDIVIDUAL' && ['ACTIVE', 'DORMANT'].includes(w.status))
      .reduce((sum, w) => sum + w.balance, 0);
    
    const businessBalance = wallets
      .filter(w => w.wallet_type === 'BUSINESS' && ['ACTIVE', 'DORMANT'].includes(w.status))
      .reduce((sum, w) => sum + w.balance, 0);
    
    const agentWalletBalance = wallets
      .filter(w => w.wallet_type === 'AGENT' && ['ACTIVE', 'DORMANT'].includes(w.status))
      .reduce((sum, w) => sum + w.balance, 0);
    
    return {
      active_wallets: activeWallets.length,
      dormant_wallets: dormantWallets.length,
      total_wallets: activeWallets.length + dormantWallets.length,
      individual_balance: individualBalance,
      business_balance: businessBalance,
      agent_wallet_balance: agentWalletBalance
    };
  }
  
  /**
   * Format amount for display
   */
  private formatAmount(cents: number): string {
    const nad = cents / 100;
    return nad.toFixed(2);
  }
  
  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  // =====================================================
  // DATABASE OPERATIONS
  // =====================================================
  
  private async getPrimaryTrustAccount(): Promise<TrustAccount> {
    const result = await query<TrustAccount>(
      `SELECT id, bank_name, account_number, current_balance, status, is_primary 
       FROM trust_accounts 
       WHERE is_primary = TRUE AND status = 'ACTIVE' 
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      throw new Error('No primary trust account found. Please configure a trust account.');
    }
    
    return result.rows[0];
  }
  
  private async getAllWalletBalances(): Promise<WalletBalance[]> {
    const result = await query<WalletBalance>(
      `SELECT 
        id as wallet_id, 
        wallet_number, 
        balance, 
        wallet_type, 
        status 
       FROM wallets 
       WHERE status IN ('ACTIVE', 'DORMANT')
       ORDER BY balance DESC`
    );
    
    return result.rows;
  }
  
  private async getAllAgentFloats(): Promise<AgentFloat[]> {
    // Check if agents table exists with float_balance column
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'agents'
      )`
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('[Reconciliation] Agents table not found, returning empty array');
      return [];
    }
    
    // Check if float_balance column exists
    const columnCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'float_balance'
      )`
    );
    
    if (!columnCheck.rows[0].exists) {
      console.log('[Reconciliation] float_balance column not found, returning empty array');
      return [];
    }
    
    const result = await query<AgentFloat>(
      `SELECT 
        id as agent_id, 
        agent_code, 
        float_balance, 
        status 
       FROM agents 
       WHERE status = 'ACTIVE'
       ORDER BY float_balance DESC`
    );
    
    return result.rows;
  }
  
  private async saveReconciliationRecord(result: ReconciliationResult): Promise<void> {
    await query(
      `INSERT INTO reconciliation_log (
        reconciliation_date,
        wallets_sum,
        agent_floats_sum,
        trust_account_balance,
        outstanding_liabilities,
        discrepancy,
        compliance_percentage,
        status,
        is_compliant,
        wallet_breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (reconciliation_date) 
      DO UPDATE SET
        wallets_sum = EXCLUDED.wallets_sum,
        agent_floats_sum = EXCLUDED.agent_floats_sum,
        trust_account_balance = EXCLUDED.trust_account_balance,
        outstanding_liabilities = EXCLUDED.outstanding_liabilities,
        discrepancy = EXCLUDED.discrepancy,
        compliance_percentage = EXCLUDED.compliance_percentage,
        status = EXCLUDED.status,
        is_compliant = EXCLUDED.is_compliant,
        wallet_breakdown = EXCLUDED.wallet_breakdown,
        updated_at = CURRENT_TIMESTAMP`,
      [
        result.reconciliation_date,
        result.total_wallet_balances / 100, // Convert cents to NAD
        result.total_agent_floats / 100,
        result.trust_account_balance / 100,
        result.outstanding_emoney_liabilities / 100,
        result.difference / 100,
        result.compliance_percentage,
        result.status,
        result.is_compliant,
        JSON.stringify(result.wallet_breakdown)
      ]
    );
    
    console.log('[Database] Reconciliation record saved successfully');
  }
  
  private async updateTrustAccountBalance(accountId: number, newBalance: number): Promise<void> {
    await query(
      `UPDATE trust_accounts 
       SET current_balance = $1, 
           last_reconciled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newBalance, accountId]
    );
    
    console.log(`[Database] Trust account balance updated to N$${this.formatAmount(newBalance)}`);
  }
  
  private async recordTrustAccountMovement(movement: any): Promise<void> {
    await query(
      `INSERT INTO trust_account_movements (
        trust_account_id,
        type,
        amount,
        description,
        bank_reference,
        reconciled,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        movement.trust_account_id,
        movement.type,
        movement.amount,
        movement.description,
        movement.bank_reference,
        movement.reconciled,
        'system'
      ]
    );
    
    console.log('[Database] Trust account movement recorded');
  }
  
  private async markDeficiencyResolved(date: Date, resolution: any): Promise<void> {
    await query(
      `UPDATE reconciliation_log 
       SET resolution_notes = $1,
           resolved_at = $2,
           resolved_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE reconciliation_date = $4`,
      [
        JSON.stringify(resolution),
        resolution.resolved_at,
        'system',
        date.toISOString().split('T')[0]
      ]
    );
    
    console.log('[Database] Deficiency marked as resolved');
  }
  
  private async getDailyReconciliationsForMonth(year: number, month: number): Promise<any[]> {
    const result = await query(
      `SELECT * FROM reconciliation_log 
       WHERE EXTRACT(YEAR FROM reconciliation_date) = $1 
       AND EXTRACT(MONTH FROM reconciliation_date) = $2
       ORDER BY reconciliation_date`,
      [year, month]
    );
    
    return result.rows;
  }
  
  private async calculateMonthlyInterest(year: number, month: number): Promise<number> {
    const result = await query<{ total: string | null }>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM trust_account_movements 
       WHERE type = 'INTEREST' 
       AND EXTRACT(YEAR FROM created_at) = $1 
       AND EXTRACT(MONTH FROM created_at) = $2`,
      [year, month]
    );
    
    return result.rows[0]?.total ? parseFloat(result.rows[0].total) : 0;
  }
  
  private async saveMonthlyReport(report: any): Promise<void> {
    await query(
      `INSERT INTO bon_monthly_reports (
        report_year,
        report_month,
        report_data,
        status
      ) VALUES ($1, $2, $3, 'DRAFT')
      ON CONFLICT (report_year, report_month)
      DO UPDATE SET
        report_data = EXCLUDED.report_data,
        updated_at = CURRENT_TIMESTAMP`,
      [
        parseInt(report.report_period.split('-')[0]),
        parseInt(report.report_period.split('-')[1]),
        JSON.stringify(report)
      ]
    );
    
    console.log('[Database] Monthly report saved');
  }
  
  private async sendAlert(alert: ReconciliationAlert): Promise<void> {
    // Save alert to database
    const alertResult = await query<{ id: number }>(
      `INSERT INTO compliance_alerts (
        alert_type,
        severity,
        title,
        message,
        regulation_reference,
        actions_required,
        assigned_to,
        data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        'trust_account',
        alert.severity,
        alert.title,
        alert.message,
        'PSD-3 Section 18',
        alert.actions_required,
        alert.recipients,
        JSON.stringify(alert.data)
      ]
    );
    
    const alertId = alertResult.rows[0].id;
    
    console.log(`[Alert] ${alert.severity}: ${alert.title}`);
    console.log(`[Alert] Message: ${alert.message}`);
    console.log(`[Alert] Recipients:`, alert.recipients);
    console.log(`[Alert] Actions Required:`, alert.actions_required);
    console.log(`[Alert] Alert ID: ${alertId}`);
    
    // Queue notifications (email/SMS will be sent by notification service)
    for (const recipient of alert.recipients) {
      const notificationType = recipient.startsWith('+') ? 'SMS' : 'EMAIL';
      
      await query(
        `INSERT INTO alert_notifications (
          alert_id,
          notification_type,
          recipient,
          status
        ) VALUES ($1, $2, $3, 'PENDING')`,
        [alertId, notificationType, recipient]
      );
    }
    
    console.log(`[Alert] ${alert.recipients.length} notifications queued`);
  }
}

// =====================================================
// CRON JOB SETUP
// =====================================================

/**
 * Daily reconciliation cron job
 * 
 * Schedule: Every day at 00:00 (midnight)
 * 
 * Cron expression: 0 0 * * *
 * 
 * Example using node-cron:
 * 
 * ```typescript
 * import cron from 'node-cron';
 * 
 * const reconciliationService = new TrustAccountReconciliationService();
 * 
 * // Run at midnight every day
 * cron.schedule('0 0 * * *', async () => {
 *   try {
 *     console.log('Starting scheduled daily reconciliation...');
 *     const result = await reconciliationService.performDailyReconciliation();
 *     
 *     if (!result.is_compliant) {
 *       console.error('ALERT: Trust account deficiency detected!');
 *       // Automated actions can be taken here
 *     }
 *   } catch (error) {
 *     console.error('Reconciliation failed:', error);
 *   }
 * });
 * ```
 * 
 * Alternative: Use a job queue (Bull, BullMQ, Agenda) for better reliability
 */

// =====================================================
// MANUAL RECONCILIATION TRIGGER (for testing/debugging)
// =====================================================

/**
 * Trigger manual reconciliation (for testing or emergency use)
 */
async function triggerManualReconciliation(): Promise<void> {
  console.log('='.repeat(60));
  console.log('MANUAL TRUST ACCOUNT RECONCILIATION');
  console.log('='.repeat(60));
  
  const service = new TrustAccountReconciliationService();
  
  try {
    const result = await service.performDailyReconciliation();
    
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
    
  } catch (error) {
    console.error('Reconciliation failed:', error);
    throw error;
  }
}

// =====================================================
// EXPORTS
// =====================================================

export { TrustAccountReconciliationService, triggerManualReconciliation };
export type { ReconciliationResult, ReconciliationAlert };

// =====================================================
// CLI USAGE
// =====================================================

// If running directly from command line
if (require.main === module) {
  triggerManualReconciliation()
    .then(() => {
      console.log('\nReconciliation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nReconciliation failed:', error);
      process.exit(1);
    });
}
