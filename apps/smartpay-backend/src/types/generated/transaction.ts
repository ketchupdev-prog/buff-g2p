/**
 * Generated from transaction.schema.json
 * @generated DO NOT EDIT MANUALLY
 */

/**
 * Transaction
 * SmartPay transaction record
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface Transaction {
  /** Unique transaction identifier */
  id: string;
  /** Wallet involved in transaction */
  wallet_id: string;
  /** Transaction type */
  type: "voucher_redeem" | "send" | "receive" | "cash_out" | "bill_pay" | "airtime" | "loan_disbursement" | "loan_repayment" | "add_money" | "group_contribution" | "group_withdrawal" | "transfer_out" | "transfer_in" | "payment" | "redemption" | "fee" | "load" | "refund";
  /** Transaction amount */
  amount: number;
  /** Account balance after transaction */
  balance_after?: number;
  /** Type of reference (e.g., invoice, order) */
  reference_type?: string;
  /** External reference identifier */
  reference_id?: string;
  /** Human-readable reference */
  reference?: string;
  /** Transaction description */
  description?: string;
  /** Transaction status */
  status?: "success" | "pending" | "failed" | "completed";
  /** Transaction timestamp */
  created_at: string;
}
