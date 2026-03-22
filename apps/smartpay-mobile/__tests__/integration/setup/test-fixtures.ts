/**
 * Test Fixtures and Mock Data
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/test-fixtures.ts
 * 
 * Purpose:
 * - Provide realistic test data
 * - Maintain consistency across tests
 * - Easy-to-use test data generators
 */

export const testPhones = {
  sender: '+264811111111',
  recipient: '+264822222222',
  agent: '+264833333333',
  merchant: '+264844444444',
  government: '+264855555555',
};

export const testUsers = {
  alice: {
    firstName: 'Alice',
    lastName: 'Sender',
    phone: testPhones.sender,
    email: 'alice@test.na',
  },
  bob: {
    firstName: 'Bob',
    lastName: 'Recipient',
    phone: testPhones.recipient,
    email: 'bob@test.na',
  },
  charlie: {
    firstName: 'Charlie',
    lastName: 'Agent',
    phone: testPhones.agent,
    email: 'charlie@test.na',
  },
};

export const testWallets = {
  main: {
    name: 'Main Wallet',
    balance: 10000,
    currency: 'NAD',
  },
  savings: {
    name: 'Savings',
    balance: 50000,
    currency: 'NAD',
  },
  usd: {
    name: 'USD Wallet',
    balance: 500,
    currency: 'USD',
  },
};

export const testVouchers = {
  smallGrant: {
    amount: 500,
    currency: 'NAD',
    voucherType: 'social_grant',
    issuer: 'gov-social-services',
  },
  mediumGrant: {
    amount: 1500,
    currency: 'NAD',
    voucherType: 'child_support',
    issuer: 'gov-social-services',
  },
  largeGrant: {
    amount: 5000,
    currency: 'NAD',
    voucherType: 'emergency_relief',
    issuer: 'gov-emergency',
  },
};

export const testBanks = {
  fnb: {
    code: 'FNB_NA',
    name: 'First National Bank',
    accountNumber: '6212345678',
  },
  standard: {
    code: 'STANDARD_NA',
    name: 'Standard Bank',
    accountNumber: '0123456789',
  },
  nedbank: {
    code: 'NEDBANK_NA',
    name: 'Nedbank',
    accountNumber: '1234567890',
  },
};

export const testMerchants = {
  supermarket: {
    id: 'MERCH-SPAR-001',
    name: 'SPAR Windhoek',
    category: 'groceries',
  },
  restaurant: {
    id: 'MERCH-REST-001',
    name: 'The Restaurant',
    category: 'dining',
  },
  pharmacy: {
    id: 'MERCH-PHARM-001',
    name: 'City Pharmacy',
    category: 'healthcare',
  },
};

export const testAgents = {
  nampost: {
    code: 'AG-NAMPOST-WDH-001',
    name: 'NamPost Windhoek Central',
    location: 'Windhoek',
  },
  smartpay: {
    code: 'AG-SMARTPAY-001',
    name: 'SmartPay Agent Station',
    location: 'Katutura',
  },
};

export function generateUniquePhone(prefix: string = '+26481'): string {
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}${timestamp}`;
}

export function generateVoucherCode(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

export function generateTestEmail(name: string = 'test'): string {
  const timestamp = Date.now();
  return `${name}-${timestamp}@test.smartpay.na`;
}

export function generateGroupName(): string {
  const adjectives = ['Happy', 'Busy', 'Smart', 'Quick', 'Cool'];
  const nouns = ['Squad', 'Crew', 'Team', 'Group', 'Circle'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj} ${noun} ${Date.now().toString().slice(-4)}`;
}

export const webhookEvents = {
  voucherIssued: (voucherId: string, userId: string, amount: number) => ({
    id: voucherId,
    type: 'voucher_issuance',
    data: {
      voucher_id: voucherId,
      voucher_code: generateVoucherCode(),
      user_id: userId,
      amount,
      currency: 'NAD',
      issuer: 'ketchup-portals',
      voucher_type: 'government_grant',
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    timestamp: new Date().toISOString(),
  }),

  transactionCompleted: (transactionId: string, agentId: string, amount: number) => ({
    type: 'transaction.completed',
    data: {
      id: transactionId,
      type: 'cash-out',
      amount,
      status: 'completed',
      agent_id: agentId,
    },
    timestamp: new Date().toISOString(),
  }),

  transactionFailed: (transactionId: string, errorMessage: string) => ({
    type: 'transaction.failed',
    data: {
      id: transactionId,
      status: 'failed',
      error: {
        code: 'PROCESSING_ERROR',
        message: errorMessage,
      },
    },
    timestamp: new Date().toISOString(),
  }),

  agentBalanceUpdated: (agentId: string, change: number, previousBalance: number) => ({
    type: 'agent.balance_updated',
    data: {
      agent_id: agentId,
      previous_balance: previousBalance,
      new_balance: previousBalance + change,
      change,
      reason: 'cash_out_settlement',
    },
    timestamp: new Date().toISOString(),
  }),
};

export const kycDocuments = {
  validId: {
    id_document_front: Buffer.from('mock-id-front').toString('base64'),
    id_document_back: Buffer.from('mock-id-back').toString('base64'),
    proof_of_residence: Buffer.from('mock-proof-of-residence').toString('base64'),
    selfie_video: Buffer.from('mock-selfie-video').toString('base64'),
  },
  
  businessKyc: {
    id_document_front: Buffer.from('mock-id-front').toString('base64'),
    id_document_back: Buffer.from('mock-id-back').toString('base64'),
    proof_of_residence: Buffer.from('mock-proof-of-residence').toString('base64'),
    business_certificate: Buffer.from('mock-business-cert').toString('base64'),
    selfie_video: Buffer.from('mock-selfie-video').toString('base64'),
  },
};

export const transactionFees = {
  p2pTransfer: 0.015,
  cashOut: 0.02,
  merchant: 0.01,
  agentFixed: 5,
  atmFixed: 10,
};

export function calculateTransactionFee(
  type: 'p2p' | 'cashout' | 'merchant',
  amount: number
): number {
  switch (type) {
    case 'p2p':
      return Math.round(amount * transactionFees.p2pTransfer * 100) / 100;
    case 'cashout':
      return Math.round(amount * transactionFees.cashOut * 100) / 100;
    case 'merchant':
      return Math.round(amount * transactionFees.merchant * 100) / 100;
    default:
      return 0;
  }
}

export function calculateTotal(amount: number, fee: number): number {
  return Math.round((amount + fee) * 100) / 100;
}

export const errorMessages = {
  insufficientBalance: 'Insufficient balance',
  invalidAmount: 'Invalid amount',
  invalidRecipient: 'Recipient not found',
  invalidVoucher: 'Voucher not found',
  expiredVoucher: 'Voucher has expired',
  alreadyRedeemed: 'Voucher has already been redeemed',
  unauthorized: 'Authentication required',
  rateLimited: 'Too many requests',
  invalidSignature: 'Invalid webhook signature',
};

export const httpStatus = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  gone: 410,
  unprocessableEntity: 422,
  tooManyRequests: 429,
  serverError: 500,
};
