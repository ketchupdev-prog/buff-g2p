/**
 * Generated from payment.schema.json
 * @generated DO NOT EDIT MANUALLY
 */

/**
 * SendMoneyRequest
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface SendMoneyRequest {
  /** Recipient user ID */
  recipient_id: string;
  /** Payment amount */
  amount: number;
  /** Optional payment note */
  note?: string;
  /** Source wallet ID */
  fromWalletId?: string;
}

/**
 * CashOutRequest
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface CashOutRequest {
  /** Cash out amount */
  amount: number;
  /** Cash out method */
  method: "atm" | "agent" | "bank";
  /** Source wallet ID */
  walletId?: string;
}

/**
 * P2PTransaction
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface P2PTransaction {
  /** Transaction ID */
  id: string;
  /** Sender user ID */
  sender_id: string;
  /** Recipient user ID */
  recipient_id: string;
  /** Wallet ID */
  wallet_id: string;
  /** Transaction amount */
  amount: number;
  /** Transaction note */
  note?: string;
  /** Transaction status */
  status: "success" | "pending" | "failed" | "completed";
  /** Transaction timestamp */
  created_at: string;
}
