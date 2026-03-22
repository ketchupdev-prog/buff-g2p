/**
 * Buffr G2P Backend – Loan Service
 * 
 * Orchestrates loan operations with Fineract integration.
 * Per PRD §2.6: Fineract failures are logged but do not fail the user response.
 * 
 * Location: backend/src/services/loanService.ts
 */

import { sql } from "../lib/db.js";
import { createLoan, disburseLoan as fineractDisburseLoan } from "../integrations/fineract/loans.js";
import { isFineractEnabled } from "../lib/fineract.js";

/**
 * Legacy wrapper for loan disbursement - maintains compatibility with existing server.ts
 * @deprecated Use disburseLoan() directly instead
 */
export async function disburseLoanInBuffr(params: {
  userId: string;
  loanId: string;
  idempotencyKey?: string;
}): Promise<{ success: boolean; balance?: number; error?: string }> {
  // Get loan details
  const loanRows = await sql`
    SELECT id, wallet_id, amount FROM loans WHERE id = ${params.loanId} AND user_id = ${params.userId} LIMIT 1
  `;
  
  if (loanRows.length === 0) {
    return { success: false, error: "Loan not found" };
  }
  
  const loan = loanRows[0] as { id: string; wallet_id: string; amount: number };
  
  // Use the main disburseLoan function
  const result = await disburseLoan({
    userId: params.userId,
    loanId: loan.id,
    amount: loan.amount,
    walletId: loan.wallet_id,
  });
  
  // Get updated wallet balance
  if (result.success) {
    const walletRows = await sql`
      SELECT balance FROM wallets WHERE id = ${loan.wallet_id} LIMIT 1
    `;
    const balance = walletRows[0]?.balance ? Number(walletRows[0].balance) : 0;
    return { success: true, balance };
  }
  
  return { success: false, error: result.error };
}

export interface DisburseLoanParams {
  userId: string;
  loanId: string;
  amount: number;
  walletId: string;
  idempotencyKey?: string;
}

export interface DisburseLoanResult {
  success: boolean;
  fineractLoanId?: string;
  error?: string;
}

/**
 * Disburse a loan to a wallet with optional Fineract sync.
 * 
 * @param params - Loan disbursement parameters
 * @returns DisburseLoanResult with success status and Fineract loan ID
 */
export async function disburseLoan(
  params: DisburseLoanParams
): Promise<DisburseLoanResult> {
  const { userId, loanId, amount, walletId } = params;

  // 1. Get wallet (for Fineract client mapping) – V5 row lock
  const walletRows = await sql`
    SELECT id, balance, fineract_savings_account_id, fineract_client_id, currency
    FROM wallets
    WHERE id = ${walletId} AND user_id = ${userId}
    FOR UPDATE
    LIMIT 1
  `;

  if (walletRows.length === 0) {
    return { success: false, error: "Wallet not found" };
  }

  const wallet = walletRows[0] as {
    id: string;
    balance: number;
    fineract_savings_account_id: string | null;
    fineract_client_id: string | null;
    currency: string;
  };

  // 2. Disburse loan in Neon (update status, credit wallet)
  await sql`
    UPDATE loans 
    SET status = 'disbursed', disbursed_at = NOW() 
    WHERE id = ${loanId} AND user_id = ${userId}
  `;

  const newBalance = Number(wallet.balance ?? 0) + amount;
  await sql`
    UPDATE wallets
    SET balance = ${newBalance}, updated_at = now()
    WHERE id = ${walletId}
  `;

  await sql`
    INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
    VALUES (${walletId}, ${"loan_disbursement"}, ${amount}, ${"Loan disbursement " + loanId})
  `;

  // 3. If Fineract enabled, create and disburse a loan there
  let fineractLoanId: string | undefined;
  if (isFineractEnabled() && wallet.fineract_client_id) {
    const fineractClientId = Number(wallet.fineract_client_id);
    if (!isNaN(fineractClientId)) {
      try {
        // Get product ID from env or use default
        const productId = Number(process.env.FINERACT_LOAN_PRODUCT_ID) || 1;
        
        const loanResult = await createLoan({
          clientId: fineractClientId,
          productId: productId,
          principal: amount,
          numberOfRepayments: 1,
          repaymentEvery: 30,
          repaymentFrequencyType: 2, // months
          interestRatePerPeriod: 0,
        });

        if (loanResult.success && loanResult.loanId) {
          fineractLoanId = String(loanResult.loanId);

          // Disburse the loan
          const disburseResult = await fineractDisburseLoan(
            loanResult.loanId,
            new Date().toISOString().slice(0, 10)
          );

          if (!disburseResult.success) {
            console.error("Fineract loan disbursement failed:", disburseResult.error);
          } else {
            // Store the Fineract loan ID in our database
            await sql`
              UPDATE loans SET fineract_loan_id = ${fineractLoanId} WHERE id = ${loanId}
            `;
          }
        } else {
          console.error("Fineract loan creation failed:", loanResult.error);
        }
      } catch (err) {
        console.error("Fineract loan creation failed:", err);
      }
    }
  }

  return {
    success: true,
    fineractLoanId,
  };
}

/**
 * Record a loan repayment with optional Fineract sync.
 * 
 * @param userId - The user's ID
 * @param loanId - The loan ID
 * @param amount - Repayment amount
 * @param walletId - The wallet to debit
 * @returns Promise<void>
 */
export async function recordLoanRepayment(
  userId: string,
  loanId: string,
  amount: number,
  walletId: string
): Promise<void> {
  // Get wallet
  const walletRows = await sql`
    SELECT id, balance, fineract_savings_account_id, fineract_client_id
    FROM wallets
    WHERE id = ${walletId} AND user_id = ${userId}
    LIMIT 1
  `;

  if (walletRows.length === 0) {
    throw new Error("Wallet not found");
  }

  const wallet = walletRows[0] as {
    id: string;
    balance: number;
    fineract_savings_account_id: string | null;
    fineract_client_id: string | null;
  };

  const currentBalance = Number(wallet.balance ?? 0);
  if (currentBalance < amount) {
    throw new Error("Insufficient funds");
  }

  // Debit wallet
  const newBalance = currentBalance - amount;
  await sql`
    UPDATE wallets
    SET balance = ${newBalance}, updated_at = now()
    WHERE id = ${walletId}
  `;

  await sql`
    INSERT INTO wallet_transactions (wallet_id, type, amount, reference)
    VALUES (${walletId}, ${"loan_repayment"}, ${amount}, ${"Loan repayment " + loanId})
  `;

  // Record repayment in loans table
  await sql`
    INSERT INTO loan_repayments (loan_id, user_id, amount, repaid_at)
    VALUES (${loanId}, ${userId}, ${amount}, NOW())
  `;

  // Note: Fineract loan repayment would require additional implementation
  // This would call the Fineract repayment API when needed
  if (isFineractEnabled() && wallet.fineract_client_id) {
    console.log("Fineract loan repayment sync not yet implemented");
  }
}
