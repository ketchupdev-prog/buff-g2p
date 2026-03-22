export interface SendMoneyRequest {
    recipient_id: string;
    amount: number;
    note?: string;
    fromWalletId?: string;
}
export interface CashOutRequest {
    amount: number;
    method: "atm" | "agent" | "bank";
    walletId?: string;
}
export interface P2PTransaction {
    id: string;
    sender_id: string;
    recipient_id: string;
    wallet_id: string;
    amount: number;
    note?: string;
    status: "success" | "pending" | "failed" | "completed";
    created_at: string;
}
//# sourceMappingURL=payment.d.ts.map