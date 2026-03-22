/**
 * TRANSACTION VALIDATION LOGIC
 * Implements all PSD-3 and Payment System Notice 2025 requirements
 */

import { Pool } from 'pg';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export enum KycTier {
  LITE = 'lite',
  FULL = 'full'
}

export enum UserType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business'
}

export enum TransactionType {
  LOAD = 'load',
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',
  PAYMENT = 'payment',
  REDEMPTION = 'redemption',
  REVERSAL = 'reversal',
  FEE = 'fee',
  REFUND = 'refund'
}

export interface KycLimits {
  dailyLimitCents: number;
  monthlyBalanceLimitCents: number;
}

export interface WalletInfo {
  id: string;
  userId: string;
  walletNumber: string;
  balanceCents: number;
  dailyLimitCents: number;
  monthlyBalanceLimitCents: number;
  status: string;
  kycTier: KycTier;
  userType: UserType;
  lastTransactionAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresKycUpgrade: boolean;
  suggestedTier?: KycTier;
}

export interface TransactionRequest {
  walletId: string;
  type: TransactionType;
  amountCents: number;
  feeCents?: number;
  counterpartyWalletId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface DailyTotals {
  totalOutgoingCents: number;
  transactionCount: number;
}

// ============================================================================
// KYC LIMITS CONFIGURATION (Per Payment System Notice 2025 Table 4)
// ============================================================================

export const KYC_LIMITS: Record<KycTier, Record<UserType, KycLimits>> = {
  [KycTier.LITE]: {
    [UserType.INDIVIDUAL]: {
      dailyLimitCents: 1_000_000, // N$10,000
      monthlyBalanceLimitCents: 1_000_000 // N$10,000
    },
    [UserType.BUSINESS]: {
      dailyLimitCents: 1_000_000, // N$10,000
      monthlyBalanceLimitCents: 1_000_000 // N$10,000
    }
  },
  [KycTier.FULL]: {
    [UserType.INDIVIDUAL]: {
      dailyLimitCents: 2_000_000, // N$20,000
      monthlyBalanceLimitCents: 5_000_000 // N$50,000
    },
    [UserType.BUSINESS]: {
      dailyLimitCents: 5_000_000, // N$50,000
      monthlyBalanceLimitCents: 10_000_000 // N$100,000
    }
  }
};

// ============================================================================
// TRANSACTION VALIDATOR CLASS
// ============================================================================

export class TransactionValidator {
  constructor(private db: Pool) {}

  /**
   * Main validation method - validates all aspects of a transaction
   * Per PSD-3 Section 13.3 (Real-time processing)
   */
  async validateTransaction(request: TransactionRequest): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresKycUpgrade: false
    };

    try {
      // 1. Get wallet information
      const wallet = await this.getWalletInfo(request.walletId);
      if (!wallet) {
        result.isValid = false;
        result.errors.push('Wallet not found');
        return result;
      }

      // 2. Check wallet status
      if (wallet.status !== 'active') {
        result.isValid = false;
        result.errors.push(`Wallet is ${wallet.status}. Only active wallets can transact.`);
        return result;
      }

      // 3. Validate amount
      if (request.amountCents <= 0) {
        result.isValid = false;
        result.errors.push('Transaction amount must be greater than zero');
        return result;
      }

      // 4. Check wallet balance (for outgoing transactions)
      if (this.isOutgoingTransaction(request.type)) {
        const totalCents = request.amountCents + (request.feeCents || 0);
        if (wallet.balanceCents < totalCents) {
          result.isValid = false;
          result.errors.push(
            `Insufficient balance. Available: N$${this.centsToDollars(wallet.balanceCents)}, ` +
            `Required: N$${this.centsToDollars(totalCents)}`
          );
          return result;
        }
      }

      // 5. Check daily transaction limits (for outgoing transactions)
      if (this.isOutgoingTransaction(request.type)) {
        const dailyCheck = await this.checkDailyLimit(wallet, request.amountCents);
        if (!dailyCheck.isValid) {
          result.isValid = false;
          result.errors.push(...dailyCheck.errors);
          result.requiresKycUpgrade = dailyCheck.requiresKycUpgrade;
          result.suggestedTier = dailyCheck.suggestedTier;
          return result;
        }
        if (dailyCheck.warnings.length > 0) {
          result.warnings.push(...dailyCheck.warnings);
        }
      }

      // 6. Check monthly balance limit (for incoming transactions)
      if (this.isIncomingTransaction(request.type)) {
        const balanceCheck = await this.checkMonthlyBalanceLimit(wallet, request.amountCents);
        if (!balanceCheck.isValid) {
          result.isValid = false;
          result.errors.push(...balanceCheck.errors);
          result.requiresKycUpgrade = balanceCheck.requiresKycUpgrade;
          result.suggestedTier = balanceCheck.suggestedTier;
          return result;
        }
        if (balanceCheck.warnings.length > 0) {
          result.warnings.push(...balanceCheck.warnings);
        }
      }

      // 7. AML/CFT checks
      const amlCheck = await this.performAmlCheck(wallet, request);
      if (!amlCheck.isValid) {
        result.isValid = false;
        result.errors.push(...amlCheck.errors);
        return result;
      }
      if (amlCheck.warnings.length > 0) {
        result.warnings.push(...amlCheck.warnings);
      }

      // 8. Validate counterparty (for P2P transfers)
      if (request.counterpartyWalletId) {
        const counterpartyCheck = await this.validateCounterparty(
          request.counterpartyWalletId,
          request.amountCents,
          request.type
        );
        if (!counterpartyCheck.isValid) {
          result.isValid = false;
          result.errors.push(...counterpartyCheck.errors);
          return result;
        }
      }

      return result;
    } catch (error) {
      console.error('Transaction validation error:', error);
      result.isValid = false;
      result.errors.push('System error during validation. Please try again.');
      return result;
    }
  }

  /**
   * Check daily transaction limit
   * Per Payment System Notice 2025 Table 4
   */
  private async checkDailyLimit(
    wallet: WalletInfo,
    transactionAmountCents: number
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresKycUpgrade: false
    };

    // Get today's transaction totals
    const dailyTotals = await this.getDailyTotals(wallet.id);
    const newTotalCents = dailyTotals.totalOutgoingCents + transactionAmountCents;

    // Check against limit
    if (newTotalCents > wallet.dailyLimitCents) {
      result.isValid = false;
      const remaining = wallet.dailyLimitCents - dailyTotals.totalOutgoingCents;
      
      result.errors.push(
        `Daily transaction limit exceeded. ` +
        `Limit: N$${this.centsToDollars(wallet.dailyLimitCents)}, ` +
        `Already used: N$${this.centsToDollars(dailyTotals.totalOutgoingCents)}, ` +
        `Remaining: N$${this.centsToDollars(remaining)}, ` +
        `Requested: N$${this.centsToDollars(transactionAmountCents)}`
      );

      // Suggest KYC upgrade if on Lite tier
      if (wallet.kycTier === KycTier.LITE) {
        result.requiresKycUpgrade = true;
        result.suggestedTier = KycTier.FULL;
        
        const fullLimits = KYC_LIMITS[KycTier.FULL][wallet.userType];
        result.errors.push(
          `Upgrade to Full KYC for higher limits: ` +
          `N$${this.centsToDollars(fullLimits.dailyLimitCents)} daily`
        );
      }
    }
    // Warning at 80% of limit
    else if (newTotalCents > wallet.dailyLimitCents * 0.8) {
      const remaining = wallet.dailyLimitCents - newTotalCents;
      result.warnings.push(
        `Approaching daily limit. Remaining: N$${this.centsToDollars(remaining)}`
      );
    }

    return result;
  }

  /**
   * Check monthly balance limit
   * Per Payment System Notice 2025 Table 4
   */
  private async checkMonthlyBalanceLimit(
    wallet: WalletInfo,
    incomingAmountCents: number
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresKycUpgrade: false
    };

    const newBalanceCents = wallet.balanceCents + incomingAmountCents;

    if (newBalanceCents > wallet.monthlyBalanceLimitCents) {
      result.isValid = false;
      const available = wallet.monthlyBalanceLimitCents - wallet.balanceCents;
      
      result.errors.push(
        `Monthly balance limit exceeded. ` +
        `Limit: N$${this.centsToDollars(wallet.monthlyBalanceLimitCents)}, ` +
        `Current balance: N$${this.centsToDollars(wallet.balanceCents)}, ` +
        `Available: N$${this.centsToDollars(available)}, ` +
        `Requested: N$${this.centsToDollars(incomingAmountCents)}`
      );

      // Suggest KYC upgrade if on Lite tier
      if (wallet.kycTier === KycTier.LITE) {
        result.requiresKycUpgrade = true;
        result.suggestedTier = KycTier.FULL;
        
        const fullLimits = KYC_LIMITS[KycTier.FULL][wallet.userType];
        result.errors.push(
          `Upgrade to Full KYC for higher limits: ` +
          `N$${this.centsToDollars(fullLimits.monthlyBalanceLimitCents)} monthly balance`
        );
      }
    }
    // Warning at 80% of limit
    else if (newBalanceCents > wallet.monthlyBalanceLimitCents * 0.8) {
      const remaining = wallet.monthlyBalanceLimitCents - newBalanceCents;
      result.warnings.push(
        `Approaching monthly balance limit. Remaining capacity: N$${this.centsToDollars(remaining)}`
      );
    }

    return result;
  }

  /**
   * Perform AML/CFT checks
   * Per PSD-3 Section 12 and Financial Intelligence Act, 2012
   */
  private async performAmlCheck(
    wallet: WalletInfo,
    request: TransactionRequest
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresKycUpgrade: false
    };

    // High value transaction threshold (N$100,000)
    const HIGH_VALUE_THRESHOLD = 10_000_000; // cents

    if (request.amountCents >= HIGH_VALUE_THRESHOLD) {
      // Create compliance alert for review
      await this.createComplianceAlert({
        alertType: 'high_value_transaction',
        severity: 'high',
        walletId: wallet.id,
        userId: wallet.userId,
        title: 'High Value Transaction',
        description: `Transaction of N$${this.centsToDollars(request.amountCents)} requires review`,
        metadata: {
          transactionAmount: request.amountCents,
          transactionType: request.type,
          kycTier: wallet.kycTier
        }
      });

      result.warnings.push('This transaction will be reviewed by compliance team.');
    }

    // Velocity check: Multiple transactions in short period
    const recentTransactionCount = await this.getRecentTransactionCount(wallet.id, 60); // Last hour
    if (recentTransactionCount > 10) {
      await this.createComplianceAlert({
        alertType: 'velocity_check',
        severity: 'medium',
        walletId: wallet.id,
        userId: wallet.userId,
        title: 'High Transaction Velocity',
        description: `${recentTransactionCount} transactions in last hour`,
        metadata: {
          transactionCount: recentTransactionCount,
          timeWindowMinutes: 60
        }
      });

      result.warnings.push('Unusual transaction pattern detected.');
    }

    // PEP check (Politically Exposed Person)
    const user = await this.getUserInfo(wallet.userId);
    if (user?.isPep) {
      result.warnings.push('Enhanced due diligence applies to this transaction.');
    }

    return result;
  }

  /**
   * Validate counterparty wallet for P2P transfers
   */
  private async validateCounterparty(
    counterpartyWalletId: string,
    amountCents: number,
    transactionType: TransactionType
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresKycUpgrade: false
    };

    const counterpartyWallet = await this.getWalletInfo(counterpartyWalletId);
    
    if (!counterpartyWallet) {
      result.isValid = false;
      result.errors.push('Recipient wallet not found');
      return result;
    }

    if (counterpartyWallet.status !== 'active') {
      result.isValid = false;
      result.errors.push(`Recipient wallet is ${counterpartyWallet.status}. Cannot receive funds.`);
      return result;
    }

    // Check if recipient can receive this amount (monthly balance limit)
    const newBalanceCents = counterpartyWallet.balanceCents + amountCents;
    if (newBalanceCents > counterpartyWallet.monthlyBalanceLimitCents) {
      result.isValid = false;
      result.errors.push(
        `Recipient cannot receive this amount. Would exceed their monthly balance limit. ` +
        `Recipient needs to upgrade KYC tier or reduce amount.`
      );
    }

    return result;
  }

  /**
   * Execute transaction (after validation passes)
   * Per PSD-3 Section 13.3 - Real-time processing
   */
  async executeTransaction(request: TransactionRequest): Promise<string> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get wallet with row lock (prevent concurrent transactions)
      const walletResult = await client.query(
        `SELECT * FROM wallets WHERE id = $1 FOR UPDATE`,
        [request.walletId]
      );
      const wallet = walletResult.rows[0];

      const totalCents = request.amountCents + (request.feeCents || 0);
      const transactionRef = this.generateTransactionRef();

      // Calculate new balance based on transaction type
      let newBalanceCents = wallet.balance_cents;
      if (this.isOutgoingTransaction(request.type)) {
        newBalanceCents -= totalCents;
      } else if (this.isIncomingTransaction(request.type)) {
        newBalanceCents += request.amountCents;
      }

      // Insert transaction record
      const txResult = await client.query(
        `INSERT INTO transactions (
          transaction_ref, wallet_id, counterparty_wallet_id, type,
          amount_cents, fee_cents, total_cents,
          balance_before_cents, balance_after_cents,
          status, description, metadata, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id`,
        [
          transactionRef,
          request.walletId,
          request.counterpartyWalletId || null,
          request.type,
          request.amountCents,
          request.feeCents || 0,
          totalCents,
          wallet.balance_cents,
          newBalanceCents,
          'completed',
          request.description || null,
          JSON.stringify(request.metadata || {})
        ]
      );
      const transactionId = txResult.rows[0].id;

      // Update wallet balance
      await client.query(
        `UPDATE wallets SET balance_cents = $1, last_transaction_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [newBalanceCents, request.walletId]
      );

      // Update daily transaction totals
      if (this.isOutgoingTransaction(request.type)) {
        await client.query(
          `INSERT INTO daily_transaction_totals (
            wallet_id, date, total_outgoing_cents, transaction_count
          ) VALUES ($1, CURRENT_DATE, $2, 1)
          ON CONFLICT (wallet_id, date)
          DO UPDATE SET
            total_outgoing_cents = daily_transaction_totals.total_outgoing_cents + $2,
            transaction_count = daily_transaction_totals.transaction_count + 1,
            updated_at = NOW()`,
          [request.walletId, request.amountCents]
        );
      }

      // If P2P transfer, credit counterparty
      if (request.counterpartyWalletId && request.type === TransactionType.TRANSFER_OUT) {
        await this.creditCounterparty(client, request.counterpartyWalletId, request.amountCents, transactionRef);
      }

      await client.query('COMMIT');
      return transactionId;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction execution error:', error);
      throw new Error('Failed to execute transaction');
    } finally {
      client.release();
    }
  }

  /**
   * Credit counterparty wallet in P2P transfer
   */
  private async creditCounterparty(
    client: any,
    walletId: string,
    amountCents: number,
    relatedTransactionRef: string
  ): Promise<void> {
    // Lock counterparty wallet
    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE id = $1 FOR UPDATE`,
      [walletId]
    );
    const wallet = walletResult.rows[0];

    const newBalanceCents = wallet.balance_cents + amountCents;

    // Insert credit transaction
    await client.query(
      `INSERT INTO transactions (
        transaction_ref, wallet_id, type,
        amount_cents, fee_cents, total_cents,
        balance_before_cents, balance_after_cents,
        status, description, created_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        `${relatedTransactionRef}-IN`,
        walletId,
        TransactionType.TRANSFER_IN,
        amountCents,
        0,
        amountCents,
        wallet.balance_cents,
        newBalanceCents,
        'completed',
        'Received transfer'
      ]
    );

    // Update wallet balance
    await client.query(
      `UPDATE wallets SET balance_cents = $1, last_transaction_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [newBalanceCents, walletId]
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getWalletInfo(walletId: string): Promise<WalletInfo | null> {
    const result = await this.db.query(
      `SELECT 
        w.id, w.user_id, w.wallet_number, w.balance_cents,
        w.daily_limit_cents, w.monthly_balance_limit_cents,
        w.status, w.last_transaction_at,
        u.kyc_tier, u.user_type
      FROM wallets w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = $1`,
      [walletId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      walletNumber: row.wallet_number,
      balanceCents: parseInt(row.balance_cents),
      dailyLimitCents: parseInt(row.daily_limit_cents),
      monthlyBalanceLimitCents: parseInt(row.monthly_balance_limit_cents),
      status: row.status,
      kycTier: row.kyc_tier,
      userType: row.user_type,
      lastTransactionAt: row.last_transaction_at
    };
  }

  private async getDailyTotals(walletId: string): Promise<DailyTotals> {
    const result = await this.db.query(
      `SELECT total_outgoing_cents, transaction_count
       FROM daily_transaction_totals
       WHERE wallet_id = $1 AND date = CURRENT_DATE`,
      [walletId]
    );

    if (result.rows.length === 0) {
      return { totalOutgoingCents: 0, transactionCount: 0 };
    }

    return {
      totalOutgoingCents: parseInt(result.rows[0].total_outgoing_cents),
      transactionCount: parseInt(result.rows[0].transaction_count)
    };
  }

  private async getUserInfo(userId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT is_pep, aml_risk_score FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  private async getRecentTransactionCount(walletId: string, minutes: number): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(*) as count
       FROM transactions
       WHERE wallet_id = $1 
       AND created_at > NOW() - INTERVAL '${minutes} minutes'`,
      [walletId]
    );
    return parseInt(result.rows[0].count);
  }

  private async createComplianceAlert(alert: any): Promise<void> {
    await this.db.query(
      `INSERT INTO compliance_alerts (
        alert_type, severity, user_id, wallet_id, transaction_id,
        title, description, metadata, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')`,
      [
        alert.alertType,
        alert.severity,
        alert.userId || null,
        alert.walletId || null,
        alert.transactionId || null,
        alert.title,
        alert.description,
        JSON.stringify(alert.metadata || {})
      ]
    );
  }

  private isOutgoingTransaction(type: TransactionType): boolean {
    return [
      TransactionType.TRANSFER_OUT,
      TransactionType.PAYMENT,
      TransactionType.REDEMPTION,
      TransactionType.FEE
    ].includes(type);
  }

  private isIncomingTransaction(type: TransactionType): boolean {
    return [
      TransactionType.LOAD,
      TransactionType.TRANSFER_IN,
      TransactionType.REFUND
    ].includes(type);
  }

  private centsToDollars(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  private generateTransactionRef(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `TXN${timestamp}${random}`;
  }

  /**
   * Get KYC tier comparison for upgrade prompts
   */
  getKycTierComparison(currentTier: KycTier, userType: UserType): any {
    const currentLimits = KYC_LIMITS[currentTier][userType];
    const upgradeTier = currentTier === KycTier.LITE ? KycTier.FULL : null;
    const upgradeLimits = upgradeTier ? KYC_LIMITS[upgradeTier][userType] : null;

    return {
      current: {
        tier: currentTier,
        dailyLimit: this.centsToDollars(currentLimits.dailyLimitCents),
        monthlyBalanceLimit: this.centsToDollars(currentLimits.monthlyBalanceLimitCents)
      },
      upgrade: upgradeLimits ? {
        tier: upgradeTier,
        dailyLimit: this.centsToDollars(upgradeLimits.dailyLimitCents),
        monthlyBalanceLimit: this.centsToDollars(upgradeLimits.monthlyBalanceLimitCents)
      } : null
    };
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
import { Pool } from 'pg';
import { TransactionValidator, TransactionType } from './transaction_validation';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const validator = new TransactionValidator(pool);

// Validate a transaction
const validationResult = await validator.validateTransaction({
  walletId: 'user-wallet-id',
  type: TransactionType.TRANSFER_OUT,
  amountCents: 50000, // N$500
  feeCents: 100, // N$1
  counterpartyWalletId: 'recipient-wallet-id',
  description: 'Payment for services'
});

if (validationResult.isValid) {
  const transactionId = await validator.executeTransaction({...});
  console.log('Transaction completed:', transactionId);
} else {
  console.log('Validation failed:', validationResult.errors);
  
  if (validationResult.requiresKycUpgrade) {
    // Show KYC upgrade prompt to user
    const comparison = validator.getKycTierComparison(KycTier.LITE, UserType.INDIVIDUAL);
    console.log('Upgrade to:', comparison.upgrade);
  }
}
*/
