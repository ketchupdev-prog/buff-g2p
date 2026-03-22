export interface Wallet {
    id: string;
    user_id: string;
    name: string;
    type: "main" | "savings" | "grant";
    balance: number;
    currency: "NAD";
    is_primary?: boolean;
    fineract_savings_account_id?: number;
    created_at: string;
    updated_at: string;
}
//# sourceMappingURL=wallet.d.ts.map