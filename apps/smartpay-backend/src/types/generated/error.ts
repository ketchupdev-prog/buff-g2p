/**
 * Generated from error.schema.json
 * @generated DO NOT EDIT MANUALLY
 */

/**
 * ApiError
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface ApiError {
  /** Error code */
  code: "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "INSUFFICIENT_FUNDS" | "RATE_LIMIT_EXCEEDED" | "INTERNAL_ERROR" | "SERVICE_UNAVAILABLE" | "BAD_REQUEST" | "TIMEOUT" | "COMPLIANCE_VIOLATION";
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, any>;
  /** Field that caused the error (for validation errors) */
  field?: string;
  /** Error timestamp */
  timestamp?: string;
}

/**
 * ValidationError
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface ValidationError {
  /** Validation error code */
  code: "VALIDATION_ERROR";
  /** Validation error message */
  message: string;
  /** Field that failed validation */
  field: string;
  /** Validation constraint that was violated */
  constraint?: string;
}

/**
 * ErrorResponse
 * @generated Generated from JSON Schema - DO NOT EDIT MANUALLY
 */
export interface ErrorResponse {
  /** Always false for error responses */
  success: "False";
  error: any;
}
