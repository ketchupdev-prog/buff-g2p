/**
 * Buffr session helper for SmartPay mobile.
 *
 * Purpose: Expose Supabase-backed session token in a stable shape for Buffr
 * integration calls when needed.
 *
 * Location: src/integrations/buffr/session.ts
 */

import { getAuthHeader } from '@/services/auth';

export async function getBearerToken(): Promise<string | null> {
  const headers = await getAuthHeader();
  const authorization = headers?.Authorization || headers?.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice(7);
}
