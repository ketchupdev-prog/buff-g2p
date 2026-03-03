/**
 * Buffr G2P Backend – Fineract integration module.
 *
 * Purpose: Re-export Fineract API helpers and lib; single entry for backend services.
 * Location: backend/src/integrations/fineract/index.ts
 */

export { isFineractEnabled, fineractCall, fineractHealth, getFineractConfig } from "../../lib/fineract.js";
export type { FineractCallOptions } from "../../lib/fineract.js";

export { createClient, getClientByExternalId, ensureClient } from "./client.js";
export { createSavingsAccount, deposit, withdraw, getSavingsAccount } from "./savings.js";
export { createLoan, approveLoan, disburseLoan, repayLoan, getLoan } from "./loans.js";
export { postJournalEntry } from "./accounting.js";
export type { JournalEntryResponse } from "./accounting.js";

export type {
  FineractClientRequest,
  FineractClientResponse,
  FineractSavingsAccountRequest,
  FineractSavingsAccountResponse,
  FineractSavingsTransactionRequest,
  FineractSavingsTransactionResponse,
  FineractLoanRequest,
  FineractLoanResponse,
  FineractJournalEntryRequest,
  FineractErrorResponse,
} from "./types.js";
