/**
 * Consent flow orchestration for SmartPay banking integration.
 *
 * Location: src/features/banking/consent-flow.ts
 */

import { startBankConsent } from '../../integrations/buffr/client';
import type { NamibianBank } from '@/services/openBanking';

export async function startConsentFlow(bankId: NamibianBank) {
  return startBankConsent(bankId);
}
