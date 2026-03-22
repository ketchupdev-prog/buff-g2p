/**
 * Buffr G2P Backend – Fineract savings accounts (wallets) integration.
 *
 * Purpose: Create savings account for a client; deposit/withdraw (transactions).
 * Location: backend/src/integrations/fineract/savings.ts
 *
 * Fineract API: POST /clients/{id}/savingsaccounts, POST /savingsaccounts/{id}/transactions.
 */

import { fineractCall, isFineractEnabled } from "../../lib/fineract.js";
import type {
  FineractSavingsAccountRequest,
  FineractSavingsAccountResponse,
  FineractSavingsTransactionRequest,
  FineractSavingsTransactionResponse,
} from "./types.js";

/**
 * Create a savings account in Fineract for a client.
 * productId must exist in Fineract (savings product). Typically 1 for default.
 * Returns { success, savingsAccountId?, error? }.
 */
export async function createSavingsAccount(params: {
  clientId: number;
  productId: number;
  submittedOnDate?: string; // YYYY-MM-DD
  externalId?: string;
}): Promise<{ success: boolean; savingsAccountId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const body: FineractSavingsAccountRequest = {
    productId: params.productId,
    submittedOnDate: params.submittedOnDate ?? new Date().toISOString().slice(0, 10),
    externalId: params.externalId,
  };

  const result = await fineractCall<FineractSavingsAccountResponse>(
    `clients/${params.clientId}/savingsaccounts`,
    { method: "POST", body }
  );

  if (!result.success || result.data?.resourceId == null) {
    return { success: false, error: result.error ?? "Failed to create Fineract savings account" };
  }

  return { success: true, savingsAccountId: result.data.resourceId };
}

/**
 * Post a deposit to a Fineract savings account.
 * Returns { success, transactionId?, error? }.
 */
export async function deposit(params: {
  savingsAccountId: number;
  amount: number;
  transactionDate: string; // YYYY-MM-DD
  paymentTypeId?: number;
  note?: string;
}): Promise<{ success: boolean; transactionId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const body: FineractSavingsTransactionRequest = {
    transactionDate: params.transactionDate,
    transactionType: "Deposit",
    amount: params.amount,
    paymentTypeId: params.paymentTypeId ?? 1,
    note: params.note,
  };

  const result = await fineractCall<FineractSavingsTransactionResponse>(
    `savingsaccounts/${params.savingsAccountId}/transactions`,
    { method: "POST", body }
  );

  if (!result.success || result.data?.resourceId == null) {
    return { success: false, error: result.error ?? "Failed to post deposit" };
  }

  return { success: true, transactionId: result.data.resourceId };
}

/**
 * Post a withdrawal from a Fineract savings account.
 * Returns { success, transactionId?, error? }.
 */
export async function withdraw(params: {
  savingsAccountId: number;
  amount: number;
  transactionDate: string; // YYYY-MM-DD
  paymentTypeId?: number;
  note?: string;
}): Promise<{ success: boolean; transactionId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const body: FineractSavingsTransactionRequest = {
    transactionDate: params.transactionDate,
    transactionType: "Withdrawal",
    amount: params.amount,
    paymentTypeId: params.paymentTypeId ?? 1,
    note: params.note,
  };

  const result = await fineractCall<FineractSavingsTransactionResponse>(
    `savingsaccounts/${params.savingsAccountId}/transactions`,
    { method: "POST", body }
  );

  if (!result.success || result.data?.resourceId == null) {
    return { success: false, error: result.error ?? "Failed to post withdrawal" };
  }

  return { success: true, transactionId: result.data.resourceId };
}

/**
 * Get savings account details (e.g. balance) from Fineract.
 */
export async function getSavingsAccount(savingsAccountId: number): Promise<{
  success: boolean;
  account?: FineractSavingsAccountResponse;
  error?: string;
}> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const result = await fineractCall<FineractSavingsAccountResponse>(
    `savingsaccounts/${savingsAccountId}`,
    { method: "GET" }
  );

  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to get savings account" };
  }

  return { success: true, account: result.data };
}
