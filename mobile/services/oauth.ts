/**
 * OAuth 2.0 service – Buffr G2P Open Banking.
 * PKCE, token exchange, and PAR (Pushed Authorization Request) per Namibian Open Banking Standards v1.0.
 * Location: services/oauth.ts
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

export interface OAuthConfig {
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  redirectUri: string;
  scopes: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function makeRedirectUri(): Promise<string> {
  return await AuthSession.makeRedirectUri({ scheme: 'buffr' });
}

async function generateCodeVerifier(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return base64URLEncode(arr);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const buf = new TextEncoder().encode(verifier);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', buf);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(bytes: Uint8Array): string {
  let b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startOAuthFlow(
  config: OAuthConfig
): Promise<{ url: string; codeVerifier: string }> {
  const redirectUri = config.redirectUri || (await makeRedirectUri());
  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: config.scopes.join(' '),
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  const url = `${config.authorizationEndpoint}?${params.toString()}`;
  return { url, codeVerifier };
}

export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const redirectUri = config.redirectUri || (await makeRedirectUri());
  const res = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}

export async function refreshAccessToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  return res.json();
}

// --- PAR (Pushed Authorization Request) – Open Banking ---

export interface PARConfig extends OAuthConfig {
  parEndpoint: string;
}

export interface PARResponse {
  request_uri: string;
  expires_in: number;
}

export async function pushAuthorizationRequest(
  config: PARConfig,
  redirectUri: string,
  codeVerifier: string,
  state: string,
  scopes: string[]
): Promise<{ request_uri: string; codeVerifier: string }> {
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const body = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: scopes.join(' '),
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  const res = await fetch(config.parEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PAR failed: ${err}`);
  }
  const data: PARResponse = await res.json();
  return { request_uri: data.request_uri, codeVerifier };
}

export function buildAuthorizationUrlWithPAR(
  authorizationEndpoint: string,
  requestUri: string
): string {
  const params = new URLSearchParams({ request_uri: requestUri });
  return `${authorizationEndpoint}?${params.toString()}`;
}
