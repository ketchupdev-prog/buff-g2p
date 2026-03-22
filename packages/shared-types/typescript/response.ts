/**
 * Generated from response.schema.json
 * @generated DO NOT EDIT MANUALLY
 */

/**
 * ApiResponse
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface ApiResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Human-readable message */
  message?: string;
  /** Response data payload */
  data?: any;
  /** Error message if failed */
  error?: string;
  /** Error code if failed */
  code?: string;
}

/**
 * TransactionResult
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface TransactionResult {
  /** Whether the transaction was successful */
  success: boolean;
  /** Transaction data */
  data?: any;
  /** Error message if failed */
  error?: string;
}

/**
 * PaginatedResponse
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface PaginatedResponse {
  /** Array of data items */
  data: any[];
  pagination: object;
}
