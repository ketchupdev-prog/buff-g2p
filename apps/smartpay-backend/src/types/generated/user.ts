/**
 * Generated from user.schema.json
 * @generated DO NOT EDIT MANUALLY
 */

/**
 * User
 * SmartPay user account representation
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User phone number (Namibian format) */
  phone: string;
  /** User email address */
  email?: string;
  /** User's first name */
  first_name?: string;
  /** User's last name */
  last_name?: string;
  /** User's full name */
  full_name?: string;
  /** URL to user's profile photo */
  photo_url?: string;
  /** Hashed PIN for authentication */
  pin_hash?: string;
  /** Salt used for PIN hashing */
  pin_salt?: string;
  /** Last proof of life verification timestamp */
  last_proof_of_life?: string;
  /** Next proof of life due date */
  proof_of_life_due_date?: string;
  /** Current wallet status */
  wallet_status: "active" | "inactive" | "suspended" | "closed";
  /** Fineract integration client ID */
  fineract_client_id?: number;
  /** Account creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}
