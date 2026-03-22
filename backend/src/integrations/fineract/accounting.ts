/**
 * Buffr G2P Backend – Fineract accounting (journal entries) integration.
 *
 * Purpose: Post journal entries for fees, settlement, audit.
 * Location: backend/src/integrations/fineract/accounting.ts
 *
 * Fineract API: POST /journalentries
 */

import { fineractCall, isFineractEnabled } from "../../lib/fineract.js";
import type { FineractJournalEntryRequest } from "./types.js";

export interface JournalEntryResponse {
  resourceId?: number;
  officeId?: number;
  transactionId?: string;
}

/**
 * Post a journal entry in Fineract (double-entry: credits and debits must balance).
 * Returns { success, journalEntryId?, error? }.
 */
export async function postJournalEntry(params: {
  officeId: number;
  transactionDate: string; // YYYY-MM-DD
  currencyCode?: string;
  credits: Array<{ glAccountId: number; amount: number }>;
  debits: Array<{ glAccountId: number; amount: number }>;
  comments?: string;
}): Promise<{ success: boolean; journalEntryId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const body: FineractJournalEntryRequest = {
    officeId: params.officeId,
    transactionDate: params.transactionDate,
    currencyCode: params.currencyCode ?? "NAD",
    credits: params.credits,
    debits: params.debits,
    comments: params.comments,
  };

  const result = await fineractCall<JournalEntryResponse>("journalentries", {
    method: "POST",
    body,
  });

  if (!result.success || result.data?.resourceId == null) {
    return { success: false, error: result.error ?? "Failed to post journal entry" };
  }

  return { success: true, journalEntryId: result.data.resourceId };
}
