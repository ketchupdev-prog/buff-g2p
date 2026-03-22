/**
 * Generated from wallet.schema.json
 * @generated DO NOT EDIT MANUALLY
 */

/**
 * Wallet
 * SmartPay wallet (main, savings, or grant)
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface Wallet {
  /** Unique wallet identifier */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Wallet display name */
  name: string;
  /** Wallet type */
  type: "main" | "savings" | "grant";
  /** Current wallet balance */
  balance: number;
  /** Currency code (always NAD) */
  currency: "NAD";
  /** Whether this is the primary wallet */
  is_primary?: boolean;
  /** Fineract integration account ID */
  fineract_savings_account_id?: number;
  /** Wallet creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}
