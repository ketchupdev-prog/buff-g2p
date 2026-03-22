export interface Transaction {
    id: string;
    wallet_id: string;
    type: "voucher_redeem" | "send" | "receive" | "cash_out" | "bill_pay" | "airtime" | "loan_disbursement" | "loan_repayment" | "add_money" | "group_contribution" | "group_withdrawal" | "transfer_out" | "transfer_in" | "payment" | "redemption" | "fee" | "load" | "refund";
    amount: number;
    balance_after?: number;
    reference_type?: string;
    reference_id?: string;
    reference?: string;
    description?: string;
    status?: "success" | "pending" | "failed" | "completed";
    created_at: string;
}
//# sourceMappingURL=transaction.d.ts.map