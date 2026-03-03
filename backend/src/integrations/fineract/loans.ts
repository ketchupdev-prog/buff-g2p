/**
 * Buffr G2P Backend – Fineract loan integration.
 *
 * Purpose: Create loan application, approve, disburse; repayment.
 * Location: backend/src/integrations/fineract/loans.ts
 *
 * Fineract API: POST /loans, POST /loans/{id}?command=approve|disburse, POST /loans/{id}/transactions (repayment).
 */

import { fineractCall, isFineractEnabled } from "../../lib/fineract.js";
import type { FineractLoanRequest, FineractLoanResponse } from "./types.js";

/**
 * Create a loan application in Fineract.
 * productId must be an existing loan product in Fineract.
 * Returns { success, loanId?, error? }.
 */
export async function createLoan(params: {
  clientId: number;
  productId: number;
  principal: number;
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: number; // 2=months typical
  interestRatePerPeriod: number;
  submittedOnDate?: string;
  expectedDisbursementDate?: string;
  externalId?: string;
}): Promise<{ success: boolean; loanId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const body: FineractLoanRequest = {
    clientId: params.clientId,
    productId: params.productId,
    principal: params.principal,
    loanTermFrequency: params.numberOfRepayments * params.repaymentEvery,
    loanTermFrequencyType: 2, // months
    numberOfRepayments: params.numberOfRepayments,
    repaymentEvery: params.repaymentEvery,
    repaymentFrequencyType: params.repaymentFrequencyType,
    interestRatePerPeriod: params.interestRatePerPeriod,
    amortizationType: 1, // equal installments
    interestType: 0, // declining balance
    interestCalculationPeriodType: 1, // same as repayment period
    submittedOnDate: params.submittedOnDate ?? new Date().toISOString().slice(0, 10),
    expectedDisbursementDate: params.expectedDisbursementDate ?? new Date().toISOString().slice(0, 10),
    externalId: params.externalId,
  };

  const result = await fineractCall<FineractLoanResponse>("loans", {
    method: "POST",
    body,
  });

  if (!result.success || result.data?.resourceId == null) {
    return { success: false, error: result.error ?? "Failed to create Fineract loan" };
  }

  return { success: true, loanId: result.data.resourceId };
}

/**
 * Approve a loan application in Fineract (command=approve).
 */
export async function approveLoan(loanId: number): Promise<{ success: boolean; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const approveResult = await fineractCall<FineractLoanResponse>(`loans/${loanId}?command=approve`, {
    method: "POST",
    body: {},
  });

  if (!approveResult.success) {
    return { success: false, error: approveResult.error ?? "Failed to approve loan" };
  }
  return { success: true };
}

/**
 * Disburse a loan in Fineract (command=disburse).
 */
export async function disburseLoan(loanId: number, disbursementDate?: string): Promise<{ success: boolean; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const date = disbursementDate ?? new Date().toISOString().slice(0, 10);
  const result = await fineractCall<FineractLoanResponse>(`loans/${loanId}?command=disburse`, {
    method: "POST",
    body: { actualDisbursementDate: date },
  });

  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to disburse loan" };
  }
  return { success: true };
}

/**
 * Post a repayment to a Fineract loan.
 */
export async function repayLoan(params: {
  loanId: number;
  amount: number;
  transactionDate: string;
  paymentTypeId?: number;
  note?: string;
}): Promise<{ success: boolean; transactionId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const body = {
    transactionDate: params.transactionDate,
    transactionAmount: params.amount,
    paymentTypeId: params.paymentTypeId ?? 1,
    note: params.note,
  };

  const result = await fineractCall<{ resourceId?: number }>(
    `loans/${params.loanId}/transactions?command=repayment`,
    { method: "POST", body }
  );

  if (!result.success || result.data?.resourceId == null) {
    return { success: false, error: result.error ?? "Failed to post repayment" };
  }
  return { success: true, transactionId: result.data.resourceId };
}

/**
 * Get loan details from Fineract.
 */
export async function getLoan(loanId: number): Promise<{
  success: boolean;
  loan?: FineractLoanResponse;
  error?: string;
}> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const result = await fineractCall<FineractLoanResponse>(`loans/${loanId}`, { method: "GET" });
  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to get loan" };
  }
  return { success: true, loan: result.data };
}
