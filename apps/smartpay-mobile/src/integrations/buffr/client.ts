/**
 * Buffr integration client wrapper for SmartPay mobile.
 *
 * Purpose: Provide one place for Buffr/Open Banking interaction so screens do
 * not call low-level services directly.
 *
 * Location: src/integrations/buffr/client.ts
 */

import { getAvailableBanks, initiateConsent, type NamibianBank } from '@/services/openBanking';

export function listSupportedBanks() {
  return getAvailableBanks();
}

export async function startBankConsent(bankId: NamibianBank) {
  return initiateConsent(bankId, '/banking/linked-accounts');
}
