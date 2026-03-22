export interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
    code?: string;
}
export interface TransactionResult {
    success: boolean;
    data?: any;
    error?: string;
}
export interface PaginatedResponse {
    data: any[];
    pagination: object;
}
//# sourceMappingURL=response.d.ts.map