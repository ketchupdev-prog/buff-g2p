/**
 * Buffr Cash-Out Service
 * 
 * Purpose: Handle cash-out operations for Smartpay agents via Buffr Connect
 * Location: backend/src/services/buffr/cashOut.ts
 * 
 * Features:
 * - Process cash-out requests
 * - Validate vouchers before redemption
 * - Track transaction status
 * - Handle errors and retries
 * - Log all operations for audit
 */

import { getBuffrClient } from './client';
import type { BuffrTransaction, BuffrVoucher, BuffrApiResponse } from './client';

// ================================
// Types
// ================================

export interface BuffrCashOutRequest {
  agentId: string;
  customerPhone: string;
  amount: number;
  voucherCode?: string;
  metadata?: Record<string, unknown>;
}

export interface CashOutResult {
  success: boolean;
  transaction?: BuffrTransaction;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface VoucherValidationResult {
  valid: boolean;
  voucher?: BuffrVoucher;
  error?: string;
}

// ================================
// Cash-Out Service
// ================================

export class BuffrCashOutService {
  private client = getBuffrClient();

  /**
   * Process a cash-out transaction
   * 
   * Workflow:
   * 1. Validate input parameters
   * 2. If voucher provided, validate it first
   * 3. Process cash-out via Buffr API
   * 4. Log transaction for audit
   * 5. Return result
   */
  async processCashOut(request: BuffrCashOutRequest): Promise<CashOutResult> {
    try {
      console.log(`[CashOut] Processing cash-out for agent ${request.agentId}, amount: NAD ${request.amount}`);

      // Step 1: Validate input
      const validation = this.validateCashOutRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: validation.error || 'Invalid cash-out request',
          },
        };
      }

      // Step 2: If voucher provided, validate it
      if (request.voucherCode) {
        const voucherValidation = await this.validateVoucher(request.voucherCode);
        if (!voucherValidation.valid) {
          return {
            success: false,
            error: {
              code: 'INVALID_VOUCHER',
              message: voucherValidation.error || 'Voucher validation failed',
            },
          };
        }

        console.log(`[CashOut] Voucher ${request.voucherCode} validated successfully`);
      }

      // Step 3: Process cash-out via Buffr API
      const response = await this.client.processCashOut({
        agent_id: request.agentId,
        customer_phone: request.customerPhone,
        amount: request.amount,
        voucher_id: request.voucherCode,
      });

      // Step 4: Check response
      if (!response.success || !response.data) {
        console.error(`[CashOut] Failed:`, response.error);
        return {
          success: false,
          error: {
            code: response.error?.code || 'TRANSACTION_FAILED',
            message: response.error?.message || 'Cash-out transaction failed',
            details: response.error?.details,
          },
        };
      }

      // Step 5: Success - log and return
      console.log(`[CashOut] Success: Transaction ${response.data.id} completed`);
      await this.logTransaction(response.data);

      return {
        success: true,
        transaction: response.data,
      };
    } catch (error) {
      console.error(`[CashOut] Unexpected error:`, error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      };
    }
  }

  /**
   * Validate cash-out request parameters
   */
  private validateCashOutRequest(request: BuffrCashOutRequest): { valid: boolean; error?: string } {
    // Validate agent ID
    if (!request.agentId || request.agentId.trim() === '') {
      return { valid: false, error: 'Agent ID is required' };
    }

    // Validate customer phone
    if (!request.customerPhone || !this.isValidPhone(request.customerPhone)) {
      return { valid: false, error: 'Valid customer phone number is required' };
    }

    // Validate amount
    if (!request.amount || request.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    // Check minimum/maximum limits
    const MIN_AMOUNT = 10; // NAD 10 minimum
    const MAX_AMOUNT = 10000; // NAD 10,000 maximum
    if (request.amount < MIN_AMOUNT) {
      return { valid: false, error: `Minimum cash-out amount is NAD ${MIN_AMOUNT}` };
    }
    if (request.amount > MAX_AMOUNT) {
      return { valid: false, error: `Maximum cash-out amount is NAD ${MAX_AMOUNT}` };
    }

    return { valid: true };
  }

  /**
   * Validate phone number (Namibian format)
   */
  private isValidPhone(phone: string): boolean {
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Namibian numbers: +264 81 XXX XXXX (10 digits total, or 12 with country code)
    return cleaned.length === 10 || cleaned.length === 12;
  }

  /**
   * Validate voucher before redemption
   */
  async validateVoucher(voucherCode: string): Promise<VoucherValidationResult> {
    try {
      console.log(`[CashOut] Validating voucher: ${voucherCode}`);

      const response = await this.client.validateVoucher(voucherCode);

      if (!response.success || !response.data) {
        return {
          valid: false,
          error: response.error?.message || 'Voucher validation failed',
        };
      }

      const voucher = response.data;

      // Check voucher status
      if (voucher.status !== 'active') {
        return {
          valid: false,
          error: `Voucher is ${voucher.status}. Only active vouchers can be redeemed.`,
        };
      }

      // Check expiry date
      if (new Date(voucher.expiry_date) < new Date()) {
        return {
          valid: false,
          error: 'Voucher has expired',
        };
      }

      return {
        valid: true,
        voucher,
      };
    } catch (error) {
      console.error(`[CashOut] Voucher validation error:`, error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Voucher validation failed',
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<BuffrApiResponse<BuffrTransaction>> {
    console.log(`[CashOut] Fetching transaction status: ${transactionId}`);
    return this.client.getTransaction(transactionId);
  }

  /**
   * Get agent transaction history
   */
  async getAgentTransactions(
    agentId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      from_date?: string;
      to_date?: string;
    }
  ) {
    console.log(`[CashOut] Fetching transactions for agent: ${agentId}`);
    return this.client.getAgentTransactions(agentId, options);
  }

  /**
   * Log transaction for audit trail
   * In production, this would write to a database
   */
  private async logTransaction(transaction: BuffrTransaction): Promise<void> {
    try {
      // TODO: Write to database (buffr_transactions table)
      console.log(`[Audit] Transaction logged:`, {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        agent_id: transaction.agent_id,
        timestamp: transaction.timestamp,
      });
    } catch (error) {
      console.error(`[Audit] Failed to log transaction:`, error);
      // Don't throw - logging failure shouldn't fail the transaction
    }
  }
}

// Export singleton instance
let cashOutServiceInstance: BuffrCashOutService | null = null;

export function getBuffrCashOutService(): BuffrCashOutService {
  if (!cashOutServiceInstance) {
    cashOutServiceInstance = new BuffrCashOutService();
  }
  return cashOutServiceInstance;
}

export default getBuffrCashOutService;
