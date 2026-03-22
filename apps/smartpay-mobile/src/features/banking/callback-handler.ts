/**
 * OAuth callback handler for bank linking.
 *
 * Location: src/features/banking/callback-handler.ts
 */

import { handleOAuthCallback } from '@/services/openBanking';

export async function processBankOAuthCallback(callbackUrl: string) {
  return handleOAuthCallback(callbackUrl);
}
