/**
 * PSD-10: Fee transparency & calculation for transactions
 * Location: fintech/smartpay/backend/src/lib/feeCalculator.ts
 */
import { pool } from './db';

export interface FeeCalculationInput {
  paymentStream: string;
  transactionType: string;
  channel: string;
  amount: number;
}

export interface FeeCalculationResult {
  feeFlat: number;
  feePercentage: number;
  calculatedFee: number;
  feeCap: number | null;
  finalFee: number;
  vatInclusive: boolean;
  totalAmount: number;
  breakdown: {
    baseFee: number;
    cappedFee: number;
    vat?: number;
  };
}

/**
 * Calculate transaction fee based on PSD-10 fee schedule
 */
export async function calculateTransactionFee(
  input: FeeCalculationInput
): Promise<FeeCalculationResult> {
  const { paymentStream, transactionType, channel, amount } = input;
  
  // Query fee schedule for matching tier
  const result = await pool.query(
    `SELECT 
      fee_flat,
      fee_percentage,
      fee_cap,
      vat_inclusive
     FROM transaction_fee_schedule
     WHERE payment_stream = $1
       AND transaction_type = $2
       AND channel = $3
       AND tier_min <= $4
       AND (tier_max IS NULL OR tier_max >= $4)
       AND effective_from <= CURRENT_DATE
       AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
     ORDER BY effective_from DESC
     LIMIT 1`,
    [paymentStream, transactionType, channel, amount]
  );
  
  if (result.rowCount === 0) {
    // No fee schedule found - use default zero fee (transparent)
    return {
      feeFlat: 0,
      feePercentage: 0,
      calculatedFee: 0,
      feeCap: null,
      finalFee: 0,
      vatInclusive: false,
      totalAmount: amount,
      breakdown: {
        baseFee: 0,
        cappedFee: 0,
      }
    };
  }
  
  const schedule = result.rows[0] as {
    fee_flat: number;
    fee_percentage: number;
    fee_cap: number | null;
    vat_inclusive: boolean;
  };
  
  // Calculate base fee
  const feeFlat = Number(schedule.fee_flat);
  const feePercentage = Number(schedule.fee_percentage);
  const calculatedFee = feeFlat + (amount * feePercentage);
  
  // Apply cap if exists
  const feeCap = schedule.fee_cap ? Number(schedule.fee_cap) : null;
  let finalFee = calculatedFee;
  
  if (feeCap !== null && calculatedFee > feeCap) {
    finalFee = feeCap;
  }
  
  // Calculate VAT if applicable (15% in Namibia)
  let vat = 0;
  if (!schedule.vat_inclusive) {
    vat = finalFee * 0.15; // 15% VAT
    finalFee += vat;
  }
  
  return {
    feeFlat,
    feePercentage,
    calculatedFee,
    feeCap,
    finalFee: Math.round(finalFee * 100) / 100, // Round to 2 decimals
    vatInclusive: schedule.vat_inclusive,
    totalAmount: amount + finalFee,
    breakdown: {
      baseFee: calculatedFee,
      cappedFee: feeCap !== null ? Math.min(calculatedFee, feeCap) : calculatedFee,
      ...(vat > 0 && { vat })
    }
  };
}

/**
 * Format fee for display (PSD-10 transparency requirement)
 */
export function formatFeeDisplay(result: FeeCalculationResult): string {
  const parts = [];
  
  if (result.feeFlat > 0) {
    parts.push(`N$${result.feeFlat.toFixed(2)} flat`);
  }
  
  if (result.feePercentage > 0) {
    parts.push(`${(result.feePercentage * 100).toFixed(2)}% of transaction`);
  }
  
  if (result.feeCap !== null) {
    parts.push(`capped at N$${result.feeCap.toFixed(2)}`);
  }
  
  const feeDescription = parts.length > 0 ? parts.join(' + ') : 'No fee';
  const vatInfo = result.vatInclusive ? ' (VAT inclusive)' : ' + 15% VAT';
  
  return `${feeDescription}${parts.length > 0 ? vatInfo : ''}. Total fee: N$${result.finalFee.toFixed(2)}`;
}

/**
 * Record fee in audit log
 */
export async function recordFeeTransaction(
  userId: string,
  transactionId: string,
  feeResult: FeeCalculationResult
): Promise<void> {
  await pool.query(
    `INSERT INTO fee_audit_log 
      (user_id, transaction_id, fee_amount, fee_breakdown, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [
      userId,
      transactionId,
      feeResult.finalFee,
      JSON.stringify(feeResult.breakdown)
    ]
  );
}
