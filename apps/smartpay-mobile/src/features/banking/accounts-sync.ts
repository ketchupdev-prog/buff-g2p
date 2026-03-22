/**
 * Linked accounts synchronization helper.
 *
 * Location: src/features/banking/accounts-sync.ts
 */

import { getLinkedAccounts, getAccountBalances } from '@/services/openBanking';

export async function loadLinkedAccountsWithBalances() {
  const accounts = await getLinkedAccounts();
  const balances = await Promise.all(
    accounts.map(async (account) => ({
      accountId: account.id,
      balance: await getAccountBalances(account.id),
    }))
  );

  return { accounts, balances };
}
