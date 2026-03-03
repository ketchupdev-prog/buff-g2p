/**
 * Fineract TypeScript DTOs for Buffr G2P integration.
 * 
 * These types map to Fineract REST API request/response structures.
 * Reference: fineract-client generated models and FINERACT_BUFFR_INTEGRATION.md.
 * Location: backend/src/integrations/fineract/types.ts
 */

// ============================================================================
// Client Types
// ============================================================================

export interface FineractClient {
  officeId: number;
  externalId?: string;
  firstname: string;
  lastname: string;
  mobileNo?: string;
  email?: string;
  active?: boolean;
  activationDate?: string;
  staffId?: number;
  savingsProductId?: number;
  accountNo?: string;
}

export interface FineractClientResponse {
  resourceId?: number;  // Returned on create
  officeId: number;
  officeName: string;
  id: number;
  externalId?: string;
  firstname: string;
  lastname: string;
  displayName: string;
  mobileNo?: string;
  email?: string;
  active: boolean;
  activationDate?: string;
  staffId?: number;
  staffName?: string;
}

export interface CreateClientRequest {
  officeId: number;
  firstname: string;
  lastname: string;
  mobileNo?: string;
  email?: string;
  externalId?: string;
  active?: boolean;
  activationDate?: string;
  staffId?: number;
}

/** Request body for POST /clients (used by integrations/fineract/client.ts). */
export interface FineractClientRequest {
  firstname: string;
  lastname: string;
  externalId: string;
  mobileNo?: string;
  dateOfBirth?: string;
  officeId?: number;
}

// ============================================================================
// Savings Account Types
// ============================================================================

export interface FineractSavingsAccount {
  clientId: number;
  productId: number;
  fieldOfficerId?: number;
  accountNo?: string;
  externalId?: string;
  status?: {
    id: number;
    code: string;
    value: string;
  };
  savingsProductId: number;
  savingsProductName: string;
  accountType: string;
  accountBalance: number;
  currency: {
    code: string;
    name: string;
    decimalPlaces: number;
  };
}

export interface FineractSavingsAccountResponse {
  resourceId?: number;  // Returned on create
  clientId: number;
  savingsProductId: number;
  id: number;
  accountNo: string;
  externalId?: string;
  status: {
    id: number;
    code: string;
    value: string;
    submittedOnDate?: string;
    approvedOnDate?: string;
    activatedOnDate?: string;
  };
  savingsProductName: string;
  accountType: string;
  accountBalance: number;
  currency: {
    code: string;
    name: string;
    decimalPlaces: number;
  };
}

export interface CreateSavingsAccountRequest {
  clientId: number;
  productId: number;
  accountNo?: string;
  externalId?: string;
  fieldOfficerId?: number;
  submittedOnDate?: string;
}

/** Request body for POST /clients/{id}/savingsaccounts (productId, submittedOnDate, externalId). */
export interface FineractSavingsAccountRequest {
  productId: number;
  submittedOnDate?: string;
  externalId?: string;
}

// ============================================================================
// Savings Transaction Types
// ============================================================================

export interface SavingsTransactionRequest {
  transactionDate: string;
  transactionType: {
    id: number;  // 1 = deposit, 2 = withdrawal
  };
  amount: number;
  paymentTypeId?: number;
  accountNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  receiptNumber?: string;
  bankNumber?: string;
}

export interface SavingsDepositRequest {
  transactionDate: string;
  transactionTypeId: number;  // 1 = deposit
  amount: number;
  paymentTypeId?: number;
  note?: string;
}

export interface SavingsWithdrawalRequest {
  transactionDate: string;
  transactionTypeId: number;  // 2 = withdrawal
  amount: number;
  paymentTypeId?: number;
  note?: string;
}

/** Request body for POST savingsaccounts/{id}/transactions (Deposit/Withdrawal). */
export interface FineractSavingsTransactionRequest {
  transactionDate: string;
  transactionType: "Deposit" | "Withdrawal";
  amount: number;
  paymentTypeId?: number;
  note?: string;
}

export interface SavingsTransactionResponse {
  id: number;
  accountId: number;
  transactionType: {
    id: number;
    code: string;
    value: string;
  };
  amount: number;
  transactionDate: string;
  postedOnDate: string;
  status: {
    id: number;
    code: string;
    value: string;
  };
}

/** Response from POST savingsaccounts/{id}/transactions (resourceId). */
export interface FineractSavingsTransactionResponse {
  resourceId?: number;
}

// ============================================================================
// Loan Types
// ============================================================================

export interface FineractLoan {
  clientId: number;
  productId: number;
  loanType: {
    id: number;  // 1 = individual, 2 = group
    code: string;
    value: string;
  };
  principal: number;
  loanTermFrequency: number;
  loanTermFrequencyType: number;  // 1 = days, 2 = weeks, 3 = months
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: number;
  interestRatePerPeriod: number;
  interestRateFrequencyType: number;  // 1 = per period, 2 = monthly
  amortizationType: number;  // 1 = equal principal payments
  interestType: 1;  // 1 = flat, 2 = declining balance
  interestCalculationPeriodType: 1;  // 1 = daily, 30 = monthly
  allowPartialPeriodInterestCalculation?: boolean;
}

export interface FineractLoanResponse {
  clientId: number;
  loanProductId: number;
  id: number;
  resourceId?: number; // some Fineract endpoints return resourceId
  accountNo: string;
  externalId?: string;
  status: {
    id: number;
    code: string;
    value: string;
  };
  loanType: {
    id: number;
    code: string;
    value: string;
  };
  principal: number;
  termFrequency: number;
  termPeriodFrequency: string;
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: {
    id: number;
    code: string;
    value: string;
  };
  interestRatePerPeriod: number;
  loanProductName: string;
  currency: {
    code: string;
    name: string;
  };
}

export interface CreateLoanRequest {
  clientId: number;
  productId: number;
  loanType?: number;  // 1 = individual
  principal: number;
  loanTermFrequency: number;
  loanTermFrequencyType: number;  // 1 = days, 2 = weeks, 3 = months
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: number;
  interestRatePerPeriod: number;
  interestRateFrequencyType: number;
  amortizationType: number;
  interestType: number;
  interestCalculationPeriodType: number;
  transactionProcessingStrategyId: number;
  submittedOnDate?: string;
  expectedDisbursementDate?: string;
}

/** Request body for POST /loans (used by integrations/fineract/loans.ts). */
export interface FineractLoanRequest {
  clientId: number;
  productId: number;
  principal: number;
  loanTermFrequency: number;
  loanTermFrequencyType: number;
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: number;
  interestRatePerPeriod: number;
  amortizationType: number;
  interestType: number;
  interestCalculationPeriodType: number;
  submittedOnDate: string;
  expectedDisbursementDate?: string;
  externalId?: string;
}

export interface LoanRepaymentRequest {
  transactionDate: string;
  transactionTypeId: number;  // 1 = repayment
  amount: number;
  paymentTypeId?: number;
  note?: string;
}

// ============================================================================
// Journal Entry Types (Accounting)
// ============================================================================

export interface JournalEntryRequest {
  transactionDate: string;
  comments?: string;
  journalEntryEntries: {
    officeId: number;
    glAccountId: number;
    entryType: {
      id: number;  // 1 = debit, 2 = credit
    };
    amount: number;
    currencyCode: string;
  }[];
}

/** Request body for POST /journalentries (credits/debits format used by accounting.ts). */
export interface FineractJournalEntryRequest {
  officeId: number;
  transactionDate: string;
  currencyCode?: string;
  credits: Array<{ glAccountId: number; amount: number }>;
  debits: Array<{ glAccountId: number; amount: number }>;
  comments?: string;
}

export interface JournalEntryResponse {
  resourceId: number;
  transactions: {
    officeId: number;
    officeName: string;
    glAccountId: number;
    glAccountCode: string;
    glAccountName: string;
    entryType: {
      id: number;
      code: string;
      value: string;
    };
    amount: number;
    currency: {
      code: string;
    };
  }[];
}

// ============================================================================
// Product Types
// ============================================================================

export interface SavingsProduct {
  id: number;
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  currencyDigits: number;
  nominalAnnualInterestRate: number;
  interestCompoundingPeriodType: number;
  interestCalculationType: number;
  interestCalculationDaysInYearType: number;
  minRequiredOpeningBalance?: number;
  lockinPeriodFrequency?: number;
  lockinPeriodFrequencyType?: number;
}

export interface LoanProduct {
  id: number;
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  principal: number;
  minPrincipal: number;
  maxPrincipal: number;
  numberOfRepayments: number;
  repaymentEvery: number;
  interestRatePerPeriod: number;
  annualInterestRate: number;
}

// ============================================================================
// GL Account Types (Accounting)
// ============================================================================

export interface GLAccount {
  id: number;
  officeId: number;
  name: string;
  glCode: string;
  accountType: {
    id: number;
    code: string;
    value: string;
  };
  parentId?: number;
  accountUsage: {
    id: number;
    code: string;
    value: string;
  };
  manualJournalEntriesAllowed: boolean;
  asset?: boolean;
  liability?: boolean;
  income?: boolean;
  expense?: boolean;
}

/** Fineract API error response shape (errors array). */
export interface FineractErrorResponse {
  errors?: Array<{ developerMessage?: string; defaultUserMessage?: string }>;
}
