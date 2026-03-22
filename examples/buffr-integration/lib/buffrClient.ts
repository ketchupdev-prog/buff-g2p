import { BuffrConnect } from '@buffr/sdk';
import { getBuffrBaseUrl, getDevAccessToken } from './env';
import { getAccessToken } from './tokenStore';

/**
 * Shared SDK client: prefers SecureStore token, then dev-only env override.
 */
export async function createUserBuffrClient(): Promise<BuffrConnect> {
  const baseUrl = getBuffrBaseUrl();
  const dev = getDevAccessToken();
  return new BuffrConnect({
    baseUrl,
    fetch,
    getAccessToken: async () => (await getAccessToken()) ?? dev ?? null,
  });
}
