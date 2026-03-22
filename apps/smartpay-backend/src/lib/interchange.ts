/**
 * Interchange Calculation Engine
 * Based on Bank of Namibia PSD-11 Determination (Effective 1 August 2025)
 * 
 * Implements complete interchange rate calculations for:
 * - Card transactions (retail, fuel, cashback)
 * - Instant payment transactions (P2M, P2B, cash-in/out)
 * - ATM financial and non-financial transactions
 * - Reverse interchange for ATM withdrawals
 * 
 * All rates exclude VAT (15%) which is added during settlement
 */

export enum CardType {
  DEBIT = 'debit',
  HYBRID = 'hybrid',
  CREDIT = 'credit'
}

export enum TransactionType {
  // Card transactions
  CARD_RETAIL = 'card_retail',
  CARD_FUEL = 'card_fuel',
  CARD_PURE_CASHBACK = 'card_pure_cashback',
  CARD_CASHBACK_WITH_PURCHASE = 'card_cashback_with_purchase',
  
  // Instant Payment transactions
  IP_P2M = 'ip_p2m',
  IP_P2B = 'ip_p2b',
  IP_CASH_IN = 'ip_cash_in',
  IP_CASH_OUT = 'ip_cash_out',
  
  // ATM transactions
  ATM_WITHDRAWAL_SUCCESS = 'atm_withdrawal_success',
  ATM_WITHDRAWAL_FAIL = 'atm_withdrawal_fail',
  ATM_BALANCE_ENQUIRY = 'atm_balance_enquiry',
  ATM_NON_FINANCIAL = 'atm_non_financial',
  
  // Exempt transactions (no interchange)
  IP_P2P = 'ip_p2p',
  IP_B2P = 'ip_b2p',
  IP_B2B = 'ip_b2b',
  IP_B2G = 'ip_b2g',
  IP_G2P = 'ip_g2p',
  IP_REQUEST_TO_PAY = 'ip_request_to_pay'
}

export interface InterchangeCalculationInput {
  transactionType: TransactionType;
  cardType?: CardType;
  amount: number;
  currency?: string;
}

export interface InterchangeResult {
  interchangeAmount: number;
  interchangeRate?: number;
  fixedFee?: number;
  variableFee?: number;
  vatAmount: number;
  totalInterchange: number;
  direction: 'acquirer_to_issuer' | 'issuer_to_acquirer' | 'none';
  description: string;
}

const VAT_RATE = 0.15;

/**
 * Card Interchange Rates (Section 10.1)
 * Direction: Acquirer → Issuer
 */
const CARD_RETAIL_RATES: Record<CardType, number> = {
  [CardType.DEBIT]: 0.0050,    // 0.50%
  [CardType.HYBRID]: 0.0075,   // 0.75%
  [CardType.CREDIT]: 0.0155    // 1.55%
};

const CARD_FUEL_RATES: Record<CardType, number> = {
  [CardType.DEBIT]: 0.0050,    // 0.50%
  [CardType.HYBRID]: 0.0075,   // 0.75%
  [CardType.CREDIT]: 0.0080    // 0.80%
};

/**
 * Cashback Interchange (Section 10.2)
 * Pure cashback: Reverse interchange (Issuer → Acquirer)
 * POS purchase portion: Normal interchange (Acquirer → Issuer)
 */
const PURE_CASHBACK_FEE = 1.25; // N$1.25 flat fee (all card types)

/**
 * ATM Reverse Interchange (Section 10.3)
 * Direction: Issuer → Acquirer (reverse)
 */
const ATM_WITHDRAWAL_BASE_FEE = 4.00;      // N$4.00
const ATM_WITHDRAWAL_VARIABLE_RATE = 0.008; // N$0.80 per N$100
const ATM_WITHDRAWAL_FAIL_FEE = 4.80;      // N$4.80
const ATM_NON_FINANCIAL_FEE = 0.60;        // N$0.60

/**
 * Instant Payment Interchange Rates (Section 11)
 */
const IP_P2M_RATE = 0.0040;  // 0.40% for P2M/P2B retail
const IP_P2B_RATE = 0.0040;  // 0.40% for P2M/P2B fuel
const IP_CASH_IN_FEE = 1.25;  // N$1.25 (reverse)
const IP_CASH_OUT_FEE = 1.25; // N$1.25 (reverse)

/**
 * Calculate interchange for card transactions
 */
function calculateCardInterchange(
  transactionType: TransactionType,
  cardType: CardType,
  amount: number
): InterchangeResult {
  let rate = 0;
  let description = '';

  switch (transactionType) {
    case TransactionType.CARD_RETAIL:
      rate = CARD_RETAIL_RATES[cardType];
      description = `Card ${cardType} retail purchase interchange`;
      break;
    
    case TransactionType.CARD_FUEL:
      rate = CARD_FUEL_RATES[cardType];
      description = `Card ${cardType} fuel purchase interchange`;
      break;
    
    case TransactionType.CARD_PURE_CASHBACK:
      return {
        interchangeAmount: PURE_CASHBACK_FEE,
        fixedFee: PURE_CASHBACK_FEE,
        vatAmount: PURE_CASHBACK_FEE * VAT_RATE,
        totalInterchange: PURE_CASHBACK_FEE * (1 + VAT_RATE),
        direction: 'issuer_to_acquirer',
        description: `Pure cashback reverse interchange (${cardType})`
      };
    
    case TransactionType.CARD_CASHBACK_WITH_PURCHASE:
      const purchaseRate = CARD_RETAIL_RATES[cardType];
      return {
        interchangeAmount: amount * purchaseRate,
        interchangeRate: purchaseRate,
        vatAmount: amount * purchaseRate * VAT_RATE,
        totalInterchange: amount * purchaseRate * (1 + VAT_RATE),
        direction: 'acquirer_to_issuer',
        description: `Cashback with purchase - POS portion (${cardType})`
      };
    
    default:
      throw new Error(`Invalid card transaction type: ${transactionType}`);
  }

  const interchangeAmount = amount * rate;
  const vatAmount = interchangeAmount * VAT_RATE;

  return {
    interchangeAmount,
    interchangeRate: rate,
    vatAmount,
    totalInterchange: interchangeAmount + vatAmount,
    direction: 'acquirer_to_issuer',
    description
  };
}

/**
 * Calculate ATM interchange (Section 10.3, 10.4)
 * Direction: Issuer → Acquirer (reverse)
 */
function calculateATMInterchange(
  transactionType: TransactionType,
  amount: number
): InterchangeResult {
  let interchangeAmount = 0;
  let description = '';

  switch (transactionType) {
    case TransactionType.ATM_WITHDRAWAL_SUCCESS:
      const variableFee = Math.floor(amount / 100) * 0.80;
      interchangeAmount = ATM_WITHDRAWAL_BASE_FEE + variableFee;
      description = `ATM withdrawal reverse interchange (N$${ATM_WITHDRAWAL_BASE_FEE} + N$0.80 per N$100)`;
      return {
        interchangeAmount,
        fixedFee: ATM_WITHDRAWAL_BASE_FEE,
        variableFee,
        vatAmount: interchangeAmount * VAT_RATE,
        totalInterchange: interchangeAmount * (1 + VAT_RATE),
        direction: 'issuer_to_acquirer',
        description
      };
    
    case TransactionType.ATM_WITHDRAWAL_FAIL:
      interchangeAmount = ATM_WITHDRAWAL_FAIL_FEE;
      description = 'ATM unsuccessful withdrawal reverse interchange';
      break;
    
    case TransactionType.ATM_BALANCE_ENQUIRY:
    case TransactionType.ATM_NON_FINANCIAL:
      interchangeAmount = ATM_NON_FINANCIAL_FEE;
      description = 'ATM non-financial transaction reverse interchange';
      break;
    
    default:
      throw new Error(`Invalid ATM transaction type: ${transactionType}`);
  }

  const vatAmount = interchangeAmount * VAT_RATE;

  return {
    interchangeAmount,
    fixedFee: interchangeAmount,
    vatAmount,
    totalInterchange: interchangeAmount + vatAmount,
    direction: 'issuer_to_acquirer',
    description
  };
}

/**
 * Calculate instant payment interchange (Section 11)
 */
function calculateInstantPaymentInterchange(
  transactionType: TransactionType,
  amount: number
): InterchangeResult {
  switch (transactionType) {
    case TransactionType.IP_P2M:
    case TransactionType.IP_P2B:
      const rate = IP_P2M_RATE;
      const interchangeAmount = amount * rate;
      const vatAmount = interchangeAmount * VAT_RATE;
      
      return {
        interchangeAmount,
        interchangeRate: rate,
        vatAmount,
        totalInterchange: interchangeAmount + vatAmount,
        direction: 'acquirer_to_issuer',
        description: `Instant payment ${transactionType} interchange (0.40%)`
      };
    
    case TransactionType.IP_CASH_IN:
      return {
        interchangeAmount: IP_CASH_IN_FEE,
        fixedFee: IP_CASH_IN_FEE,
        vatAmount: IP_CASH_IN_FEE * VAT_RATE,
        totalInterchange: IP_CASH_IN_FEE * (1 + VAT_RATE),
        direction: 'issuer_to_acquirer',
        description: 'Cash-in at merchant/agent reverse interchange'
      };
    
    case TransactionType.IP_CASH_OUT:
      return {
        interchangeAmount: IP_CASH_OUT_FEE,
        fixedFee: IP_CASH_OUT_FEE,
        vatAmount: IP_CASH_OUT_FEE * VAT_RATE,
        totalInterchange: IP_CASH_OUT_FEE * (1 + VAT_RATE),
        direction: 'issuer_to_acquirer',
        description: 'Cash-out at merchant/agent reverse interchange'
      };
    
    case TransactionType.IP_P2P:
    case TransactionType.IP_B2P:
    case TransactionType.IP_B2B:
    case TransactionType.IP_B2G:
    case TransactionType.IP_G2P:
    case TransactionType.IP_REQUEST_TO_PAY:
      return {
        interchangeAmount: 0,
        vatAmount: 0,
        totalInterchange: 0,
        direction: 'none',
        description: `${transactionType} - No interchange applicable (Section 11.5)`
      };
    
    default:
      throw new Error(`Invalid instant payment transaction type: ${transactionType}`);
  }
}

/**
 * Main interchange calculation function
 * Implements sections 10 and 11 of PSD-11
 */
export function calculateInterchange(
  input: InterchangeCalculationInput
): InterchangeResult {
  const { transactionType, cardType, amount } = input;

  // Validate amount
  if (amount < 0) {
    throw new Error('Transaction amount cannot be negative');
  }

  // Card transactions require card type
  if (transactionType.startsWith('card_') && !cardType) {
    throw new Error('Card type is required for card transactions');
  }

  // Route to appropriate calculator
  if (transactionType.startsWith('card_')) {
    return calculateCardInterchange(transactionType, cardType!, amount);
  } else if (transactionType.startsWith('atm_')) {
    return calculateATMInterchange(transactionType, amount);
  } else if (transactionType.startsWith('ip_')) {
    return calculateInstantPaymentInterchange(transactionType, amount);
  }

  throw new Error(`Unknown transaction type: ${transactionType}`);
}

/**
 * Calculate total interchange for complex transactions
 * Example: Cashback with purchase has both POS and cashback components
 */
export interface ComplexInterchangeInput {
  purchaseAmount: number;
  cashbackAmount: number;
  cardType: CardType;
  isFuel?: boolean;
}

export interface ComplexInterchangeResult {
  purchaseInterchange: InterchangeResult;
  cashbackInterchange: InterchangeResult;
  netInterchange: number;
  netVAT: number;
  netTotal: number;
}

export function calculateCashbackWithPurchaseInterchange(
  input: ComplexInterchangeInput
): ComplexInterchangeResult {
  const { purchaseAmount, cashbackAmount, cardType, isFuel = false } = input;

  // Calculate purchase portion (Acquirer → Issuer)
  const purchaseInterchange = calculateInterchange({
    transactionType: isFuel ? TransactionType.CARD_FUEL : TransactionType.CARD_RETAIL,
    cardType,
    amount: purchaseAmount
  });

  // Calculate cashback portion (Issuer → Acquirer)
  const cashbackInterchange = calculateInterchange({
    transactionType: TransactionType.CARD_PURE_CASHBACK,
    cardType,
    amount: cashbackAmount
  });

  // Net interchange (purchase received - cashback paid out by acquirer)
  const netInterchange = purchaseInterchange.interchangeAmount - cashbackInterchange.interchangeAmount;
  const netVAT = purchaseInterchange.vatAmount - cashbackInterchange.vatAmount;

  return {
    purchaseInterchange,
    cashbackInterchange,
    netInterchange,
    netVAT,
    netTotal: netInterchange + netVAT
  };
}

/**
 * Batch interchange calculation for daily settlement
 */
export interface BatchTransaction {
  id: string;
  transactionType: TransactionType;
  cardType?: CardType;
  amount: number;
  timestamp: Date;
}

export interface BatchInterchangeResult {
  transactions: Array<{
    id: string;
    interchange: InterchangeResult;
  }>;
  summary: {
    totalTransactions: number;
    totalInterchangeAmount: number;
    totalVAT: number;
    totalWithVAT: number;
    byType: Record<string, {
      count: number;
      totalAmount: number;
      totalInterchange: number;
    }>;
  };
}

export function calculateBatchInterchange(
  transactions: BatchTransaction[]
): BatchInterchangeResult {
  const results = transactions.map(tx => ({
    id: tx.id,
    interchange: calculateInterchange({
      transactionType: tx.transactionType,
      cardType: tx.cardType,
      amount: tx.amount
    })
  }));

  const summary = results.reduce((acc, result) => {
    const { interchange } = result;
    
    acc.totalInterchangeAmount += interchange.interchangeAmount;
    acc.totalVAT += interchange.vatAmount;
    acc.totalWithVAT += interchange.totalInterchange;

    const typeKey = interchange.description;
    if (!acc.byType[typeKey]) {
      acc.byType[typeKey] = {
        count: 0,
        totalAmount: 0,
        totalInterchange: 0
      };
    }
    
    acc.byType[typeKey].count++;
    acc.byType[typeKey].totalInterchange += interchange.interchangeAmount;

    return acc;
  }, {
    totalTransactions: transactions.length,
    totalInterchangeAmount: 0,
    totalVAT: 0,
    totalWithVAT: 0,
    byType: {} as Record<string, {
      count: number;
      totalAmount: number;
      totalInterchange: number;
    }>
  });

  return { transactions: results, summary };
}

/**
 * Get interchange rate for display/disclosure purposes
 */
export function getInterchangeRateInfo(
  transactionType: TransactionType,
  cardType?: CardType
): {
  rate?: string;
  formula?: string;
  description: string;
} {
  switch (transactionType) {
    case TransactionType.CARD_RETAIL:
      return {
        rate: `${(CARD_RETAIL_RATES[cardType!] * 100).toFixed(2)}%`,
        description: `Card retail interchange for ${cardType} card`
      };
    
    case TransactionType.CARD_FUEL:
      return {
        rate: `${(CARD_FUEL_RATES[cardType!] * 100).toFixed(2)}%`,
        description: `Card fuel interchange for ${cardType} card`
      };
    
    case TransactionType.CARD_PURE_CASHBACK:
      return {
        rate: 'N$1.25',
        description: 'Pure cashback reverse interchange (fixed)'
      };
    
    case TransactionType.ATM_WITHDRAWAL_SUCCESS:
      return {
        formula: 'N$4.00 + N$0.80 per N$100',
        description: 'ATM withdrawal reverse interchange'
      };
    
    case TransactionType.ATM_WITHDRAWAL_FAIL:
      return {
        rate: 'N$4.80',
        description: 'ATM unsuccessful withdrawal reverse interchange'
      };
    
    case TransactionType.ATM_NON_FINANCIAL:
      return {
        rate: 'N$0.60',
        description: 'ATM non-financial transaction reverse interchange'
      };
    
    case TransactionType.IP_P2M:
    case TransactionType.IP_P2B:
      return {
        rate: '0.40%',
        description: 'Instant payment P2M/P2B interchange'
      };
    
    case TransactionType.IP_CASH_IN:
      return {
        rate: 'N$1.25',
        description: 'Cash-in reverse interchange'
      };
    
    case TransactionType.IP_CASH_OUT:
      return {
        rate: 'N$1.25',
        description: 'Cash-out reverse interchange'
      };
    
    case TransactionType.IP_P2P:
    case TransactionType.IP_B2P:
    case TransactionType.IP_B2B:
    case TransactionType.IP_B2G:
    case TransactionType.IP_G2P:
    case TransactionType.IP_REQUEST_TO_PAY:
      return {
        rate: 'N$0.00',
        description: 'No interchange applicable (Section 11.5 PSD-11)'
      };
    
    default:
      return {
        description: 'Unknown transaction type'
      };
  }
}

/**
 * Validate transaction qualifies for interchange
 * Section 13.5: Only specified transaction types qualify
 */
export function isInterchangeApplicable(
  transactionType: TransactionType
): boolean {
  const exemptTypes = [
    TransactionType.IP_P2P,
    TransactionType.IP_B2P,
    TransactionType.IP_B2B,
    TransactionType.IP_B2G,
    TransactionType.IP_G2P,
    TransactionType.IP_REQUEST_TO_PAY
  ];

  return !exemptTypes.includes(transactionType);
}
