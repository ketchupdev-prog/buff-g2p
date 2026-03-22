/**
 * Buffr G2P Backend – Wallet orchestration service.
 *
 * Purpose: Create wallet in Neon and optionally sync to Fineract (ensure client,
 * create savings account, update wallet and user with Fineract IDs).
 * Location: backend/src/services/walletService.ts
 */

import { sql } from "../lib/db.js";
import { isFineractEnabled, fineractCall } from "../lib/fineract.js";
import { ensureClient } from "../integrations/fineract/client.js";
import { createSavingsAccount } from "../integrations/fineract/savings.js";

const FINERACT_OFFICE_ID = process.env.FINERACT_OFFICE_ID
  ? Number(process.env.FINERACT_OFFICE_ID)
  : undefined;
const FINERACT_SAVINGS_PRODUCT_ID = process.env.FINERACT_SAVINGS_PRODUCT_ID
  ? Number(process.env.FINERACT_SAVINGS_PRODUCT_ID)
  : 1;

async function getDefaultOfficeId(): Promise<number | undefined> {
  if (FINERACT_OFFICE_ID != null && Number.isInteger(FINERACT_OFFICE_ID)) {
    return FINERACT_OFFICE_ID;
  }
  const result = await fineractCall<{ id?: number }[]>("offices", { method: "GET" });
  if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
    return undefined;
  }
  const first = result.data[0] as { id?: number };
  return first?.id != null ? first.id : undefined;
}

function getDefaultSavingsProductId(): number {
  return Number.isFinite(FINERACT_SAVINGS_PRODUCT_ID) ? FINERACT_SAVINGS_PRODUCT_ID : 1;
}

export type WalletType = "main" | "savings" | "grant";

export interface CreateWalletInput {
  name?: string;
  type?: WalletType;
}

export interface CreateWalletResult {
  wallet: {
    id: string;
    name: string;
    type: WalletType;
    balance: number;
    currency: "NAD";
    isPrimary: boolean;
    createdAt?: string;
  };
  fineractSynced: boolean;
}

/**
 * Create a wallet for the user in Neon. When Fineract is enabled, ensures a
 * Fineract client exists for the user, creates a Fineract savings account,
 * and updates the wallet row (and user if needed) with Fineract IDs.
 */
export async function createWallet(
  userId: string,
  input: CreateWalletInput = {}
): Promise<CreateWalletResult> {
  const { name: inputName, type: inputType } = input;

  const countResult = await sql`
    SELECT COUNT(*) AS cnt FROM wallets WHERE user_id = ${userId}
  `;
  const walletCount = Number((countResult[0] as { cnt: string | number })?.cnt ?? 0);
  const isPrimary = walletCount === 0;
  const walletName =
    inputName && typeof inputName === "string" && inputName.trim().length > 0
      ? inputName.trim()
      : isPrimary
        ? "Main wallet"
        : `Wallet ${walletCount + 1}`;
  const walletType = (inputType as string) ?? "savings";

  const rows = await sql`
    INSERT INTO wallets (user_id, name, type, balance, currency)
    VALUES (${userId}, ${walletName}, ${walletType}, 0, 'NAD')
    RETURNING id, user_id, name, type, balance, currency, updated_at
  `;
  const row = rows[0] as {
    id: string;
    user_id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    updated_at: string | Date;
  };
  const walletId = row.id;

  let fineractSynced = false;
  if (isFineractEnabled()) {
    try {
      const userRows = await sql`
        SELECT id, phone, full_name, first_name, last_name
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `;
      const user = userRows[0] as
        | { id: string; phone?: string; full_name?: string; first_name?: string; last_name?: string }
        | undefined;
      const fullName = ((user?.full_name ?? [user?.first_name, user?.last_name].filter(Boolean).join(" ")) || "");
      const parts = fullName.trim().split(/\s+/);
      const firstname = parts[0] || "Buffr";
      const lastname = parts.slice(1).join(" ") || "User";
      const officeId = await getDefaultOfficeId();
      const clientResult = await ensureClient({
        externalId: userId,
        firstname,
        lastname,
        mobileNo: user?.phone,
        officeId: officeId ?? undefined,
      });
      if (clientResult.success && clientResult.clientId != null) {
        const productId = getDefaultSavingsProductId();
        const savingsResult = await createSavingsAccount({
          clientId: clientResult.clientId,
          productId,
          externalId: walletId,
        });
        if (savingsResult.success && savingsResult.savingsAccountId != null) {
          await sql`
            UPDATE wallets
            SET fineract_savings_account_id = ${savingsResult.savingsAccountId}
            WHERE id = ${walletId}
          `;
          const userHasClient = await sql`
            SELECT fineract_client_id FROM users WHERE id = ${userId} LIMIT 1
          `;
          const currentClientId = (userHasClient[0] as { fineract_client_id?: number | null })?.fineract_client_id;
          if (currentClientId == null) {
            await sql`
              UPDATE users
              SET fineract_client_id = ${clientResult.clientId}
              WHERE id = ${userId}
            `;
          }
          fineractSynced = true;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Fineract sync on wallet create failed:", err);
      // Wallet already created in Neon; do not fail the request
    }
  }

  const wallet = {
    id: row.id,
    name: row.name,
    type: (row.type as WalletType) ?? "savings",
    balance: Number(row.balance ?? 0),
    currency: (row.currency as "NAD") ?? "NAD",
    isPrimary,
    createdAt: row.updated_at?.toString?.() ?? (row.updated_at as string),
  };

  return { wallet, fineractSynced };
}
