/**
 * Adapter for canonical demo seed (demo.json).
 * Resolves relative date keys (createdAtDaysAgo, expiresAtDaysFromNow, etc.) to ISO strings.
 * Single source of truth: mobile/seed-data/demo.json. Backend uses same JSON in seed-db.mjs.
 */
import demo from './demo.json';

const now = new Date();

function daysAgo(d: number): string {
  const dt = new Date(now);
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
}

function daysFromNow(d: number): string {
  const dt = new Date(now);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString();
}

// Wallets: add createdAt, optional linkedCards for main
export const SEED_WALLETS = demo.wallets.map((w: Record<string, unknown>) => ({
  id: w.id,
  name: w.name,
  type: w.type,
  balance: w.balance,
  currency: w.currency,
  cardDesignFrameId: w.cardDesignFrameId,
  targetAmount: w.targetAmount,
  isPrimary: w.isPrimary ?? w.type === 'main',
  createdAt: (w.createdAtDaysAgo != null) ? daysAgo(w.createdAtDaysAgo as number) : now.toISOString(),
  ...(w.type === 'main' && {
    linkedCards: [
      { id: 'lc_ned_001', label: 'Nedbank Cheque', last4: '2293', brand: 'Visa' },
      { id: 'lc_bwh_001', label: 'Bank Windhoek', last4: '4184', brand: 'Mastercard' },
    ],
  }),
}));

// Transactions
export const SEED_TRANSACTIONS = demo.transactions.map((t: Record<string, unknown>) => ({
  id: t.id,
  type: t.type,
  amount: t.amount,
  currency: t.currency,
  description: t.description,
  status: t.status,
  createdAt: daysAgo((t.createdAtDaysAgo as number) ?? 0),
  counterparty: t.counterparty,
  walletId: t.walletId,
  reference: t.reference,
  fee: t.fee,
}));

// Vouchers
export const SEED_VOUCHERS = demo.vouchers.map((v: Record<string, unknown>) => {
  const issuedAt = (v.issuedAtDaysAgo != null) ? daysAgo(v.issuedAtDaysAgo as number) : now.toISOString();
  const expiresAt = (v.expiresAtDaysFromNow != null)
    ? daysFromNow(v.expiresAtDaysFromNow as number)
    : (v.expiresAtDaysAgo != null) ? daysAgo(v.expiresAtDaysAgo as number) : daysFromNow(60);
  return {
    id: v.id,
    amount: v.amount,
    currency: v.currency,
    status: v.status,
    programme: v.programme,
    issuedAt,
    expiresAt,
    reference: v.reference,
    ...(v.redeemedAtDaysAgo != null && { redeemedAt: daysAgo(v.redeemedAtDaysAgo as number) }),
    ...(v.redeemedMethod != null && { redeemedMethod: v.redeemedMethod }),
  };
});

// Contacts
export const SEED_CONTACTS = demo.contacts.map((c: Record<string, unknown>) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
}));

// Loan offer & active loans
export const SEED_LOAN_OFFER = {
  ...demo.loanOffer,
};

export const SEED_ACTIVE_LOANS = demo.activeLoans.map((l: Record<string, unknown>) => ({
  id: l.id,
  amount: l.amount,
  interestAmount: l.interestAmount,
  totalRepayable: l.totalRepayable,
  disbursedAt: daysAgo((l.disbursedAtDaysAgo as number) ?? 0),
  status: l.status,
  repaymentDue: (l.repaymentDueDaysFromNow != null)
    ? daysFromNow(l.repaymentDueDaysFromNow as number)
    : daysFromNow(30),
}));

// Groups (for list fallback when no API)
const groupBalances = [4750, 1200, 800];
export const SEED_GROUPS = (demo.groups ?? []).map((g: Record<string, unknown>, i: number) => {
  const memberIds = (g.memberContactIds as string[]) ?? [];
  const memberCount = memberIds.length + 1;
  return {
    id: g.id,
    name: g.name,
    purpose: g.description,
    balance: groupBalances[i % groupBalances.length] ?? 1000,
    memberCount,
    maxMembers: Math.max(memberCount + 4, 20),
  };
});

// Raw demo (for backend or other consumers)
export { demo };
