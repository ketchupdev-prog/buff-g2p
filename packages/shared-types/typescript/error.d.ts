export interface ApiError {
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "INSUFFICIENT_FUNDS" | "RATE_LIMIT_EXCEEDED" | "INTERNAL_ERROR" | "SERVICE_UNAVAILABLE" | "BAD_REQUEST" | "TIMEOUT" | "COMPLIANCE_VIOLATION";
    message: string;
    details?: Record<string, any>;
    field?: string;
    timestamp?: string;
}
export interface ValidationError {
    code: "VALIDATION_ERROR";
    message: string;
    field: string;
    constraint?: string;
}
export interface ErrorResponse {
    success: "False";
    error: any;
}
//# sourceMappingURL=error.d.ts.map