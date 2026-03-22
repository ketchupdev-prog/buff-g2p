import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { BuffrConnect } from '@buffr/sdk';
import { getBuffrBaseUrl, getClientId, getRedirectUri, getTokenBridgeUrl } from './env';
import { consumePkceVerifier, saveAccessToken, savePkceState } from './tokenStore';

WebBrowser.maybeCompleteAuthSession();

/**
 * Full OAuth (PKCE) authorization-code flow for a mobile fintech app.
 *
 * Important: Buffr Connect's `POST /api/oidc/token` is often protected so that only an
 * already-authenticated context can exchange a code. Production apps should POST the
 * `code` + `code_verifier` to **your backend**, which holds the user session and calls Buffr.
 *
 * @see ../server-examples/token-bridge.route.example.ts
 */
export async function startAuthorizationCodeFlow(): Promise<void> {
  const baseUrl = getBuffrBaseUrl();
  const client = new BuffrConnect({
    baseUrl,
    fetch: fetch,
  });

  const discovery = await client.auth.getOpenIdConfiguration();
  const pkce = await client.auth.createPkceChallenge();
  const state = crypto.randomUUID();

  await savePkceState(state, pkce.codeVerifier);

  const authorizeUrl = client.auth.buildAuthorizeUrl({
    config: discovery,
    clientId: getClientId(),
    redirectUri: getRedirectUri(),
    scope: ['openid', 'accounts:read', 'transactions:read'],
    state,
    codeChallenge: pkce.codeChallenge,
  });

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, getRedirectUri());

  if (result.type !== 'success' || !result.url) {
    throw new Error(result.type === 'cancel' ? 'User cancelled OAuth' : 'OAuth failed');
  }

  const parsed = Linking.parse(result.url);
  const code = parsed.queryParams?.code as string | undefined;
  const returnedState = parsed.queryParams?.state as string | undefined;

  if (!code || !returnedState) {
    throw new Error('Missing code or state in redirect URL');
  }

  const codeVerifier = await consumePkceVerifier(returnedState);
  if (!codeVerifier) {
    throw new Error('PKCE state mismatch — restart the flow');
  }

  const bridge = getTokenBridgeUrl();
  if (bridge) {
    const res = await fetch(bridge, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        client_id: getClientId(),
        redirect_uri: getRedirectUri(),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token bridge failed: ${res.status} ${text}`);
    }
    const json = (await res.json()) as { access_token: string };
    if (!json.access_token) throw new Error('Token bridge returned no access_token');
    await saveAccessToken(json.access_token);
    return;
  }

  // Fallback: direct exchange (works only if your Buffr deployment allows it for this client).
  const tokens = await client.auth.exchangeToken({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
  });
  await saveAccessToken(tokens.access_token);
}
