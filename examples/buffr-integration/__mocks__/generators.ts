/** Deterministic mock payloads for unit tests (no network). */

export function mockAccountList() {
  return {
    data: [
      {
        id: 'acc_001',
        account_name: 'Main current',
        account_number: '****1234',
        currency: 'NAD',
        balance: 12500.5,
      },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  };
}

export function mockTransactions() {
  return {
    data: [
      {
        id: 'tx_1',
        booking_date: '2026-03-01',
        description: 'Salary',
        amount: 18000,
        transaction_type: 'credit',
      },
    ],
    meta: {},
  };
}

export function mockAffordability() {
  return {
    data: {
      eligible: true,
      debt_to_income_ratio: 0.22,
      suggested_max_installment: 1200,
    },
    meta: {},
  };
}
