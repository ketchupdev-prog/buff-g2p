export interface User {
    id: string;
    phone: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    photo_url?: string;
    pin_hash?: string;
    pin_salt?: string;
    last_proof_of_life?: string;
    proof_of_life_due_date?: string;
    wallet_status: "active" | "inactive" | "suspended" | "closed";
    fineract_client_id?: number;
    created_at: string;
    updated_at: string;
}
//# sourceMappingURL=user.d.ts.map