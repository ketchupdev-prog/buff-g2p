/**
 * OBS Consent Library - PAR/PKCE Implementation
 * Implements Namibian Open Banking Standards v1.0 consent flows
 * RFC 7636 (PKCE) + RFC 9126 (PAR) + FAPI 1.0 Advanced
 * Location: fintech/smartpay/backend/src/lib/obsConsent.ts
 */
import crypto from 'crypto';
import { pool } from './db';

const TPP_NAME = 'Smartpay';
const TPP_PARTICIPANT_ID = 'TPP-SMARTPAY-001';
const TPP_REDIRECT_URI = process.env.OBS_REDIRECT_URI ?? 'https://smartpay.app/obs/callback';

interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

interface DataProvider {
  id: string;
  providerCode: string;
  providerName: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  parEndpoint: string | null;
  revocationEndpoint: string | null;
  accountsEndpoint: string | null;
  balancesEndpoint: string | null;
  transactionsEndpoint: string | null;
  paymentsEndpoint: string | null;
  isActive: boolean;
}

interface ConsentInitiationResult {
  consentId: string;
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

interface ConsentRecord {
  id: string;
  userId: string;
  dataProviderId: string;
  scopes: string[];
  purpose: 'ais' | 'pis';
  status: 'pending' | 'active' | 'revoked' | 'expired';
  pkceVerifierHash: string;
  redirectUri: string;
  state: string;
  /** DP-issued access token (store encrypted at rest in production). */
  accessToken: string | null;
  tokenExpiresAt: string | null;
  grantedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

interface TokenExchangeResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope: string;
}

/**
 * Generate PKCE code verifier and code challenge per RFC 7636 §4.1 & §4.2
 * Code verifier: 43-128 characters [A-Z, a-z, 0-9, -, ., _, ~]
 * Code challenge: BASE64URL(SHA256(code_verifier))
 */
export function generatePKCEChallenge(): PKCEChallenge {
  const codeVerifier = crypto
    .randomBytes(32)
    .toString('base64url')
    .slice(0, 43);

  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Generate cryptographically secure state parameter
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash sensitive data before storing (code verifier, access token)
 */
function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Verify that a plaintext secret matches a stored hash
 */
function verifyHash(plaintext: string, hash: string): boolean {
  const computedHash = hashSecret(plaintext);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
}

/** Map DB row (snake_case) to DataProvider (camelCase) */
function mapRowToDataProvider(row: Record<string, unknown>): DataProvider {
  return {
    id: String(row.id),
    providerCode: String(row.provider_code),
    providerName: String(row.provider_name),
    authorizationEndpoint: String(row.authorization_endpoint),
    tokenEndpoint: String(row.token_endpoint),
    parEndpoint: row.par_endpoint != null ? String(row.par_endpoint) : null,
    revocationEndpoint: row.revocation_endpoint != null ? String(row.revocation_endpoint) : null,
    accountsEndpoint: row.accounts_endpoint != null ? String(row.accounts_endpoint) : null,
    balancesEndpoint: row.balances_endpoint != null ? String(row.balances_endpoint) : null,
    transactionsEndpoint: row.transactions_endpoint != null ? String(row.transactions_endpoint) : null,
    paymentsEndpoint: row.payments_endpoint != null ? String(row.payments_endpoint) : null,
    isActive: Boolean(row.is_active),
  };
}

/**
 * Retrieve Data Provider configuration
 */
export async function getDataProvider(dataProviderId: string): Promise<DataProvider> {
  const result = await pool.query(
    `SELECT * FROM data_providers WHERE id = $1 AND is_active = true`,
    [dataProviderId]
  );

  if (!result.rows[0]) {
    throw new Error(`Data Provider ${dataProviderId} not found or inactive`);
  }

  return mapRowToDataProvider(result.rows[0] as Record<string, unknown>);
}

/**
 * Initiate OBS consent flow with PAR/PKCE
 * Steps:
 * 1. Generate PKCE challenge + state
 * 2. Store consent record with hashed verifier
 * 3. Submit PAR request to Data Provider (if supported)
 * 4. Return authorization URL for redirect
 */
export async function initiateConsent(
  userId: string,
  dataProviderId: string,
  scopes: string[],
  purpose: 'ais' | 'pis',
  durationDays: number = 90
): Promise<ConsentInitiationResult> {
  const provider = await getDataProvider(dataProviderId);
  const { codeVerifier, codeChallenge, codeChallengeMethod } = generatePKCEChallenge();
  const state = generateState();
  const expiresAt = new Date(Date.now() + durationDays * 86400000);

  const consentResult = await pool.query<{ id: string }>(
    `INSERT INTO obs_consents (
      user_id, data_provider_id, scopes, purpose, status,
      pkce_verifier_hash, redirect_uri, state, expires_at
    ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
    RETURNING id`,
    [
      userId,
      dataProviderId,
      scopes,
      purpose,
      hashSecret(codeVerifier),
      TPP_REDIRECT_URI,
      state,
      expiresAt,
    ]
  );

  const consentRow = consentResult.rows[0];
  if (!consentRow) {
    throw new Error('Failed to create consent record');
  }
  const consentId = consentRow.id;

  // Store plaintext code_verifier for token exchange at callback (OAuth requires plaintext)
  await pool.query(
    `INSERT INTO obs_consent_pkce (state, code_verifier) VALUES ($1, $2)
     ON CONFLICT (state) DO UPDATE SET code_verifier = EXCLUDED.code_verifier, created_at = NOW()`,
    [state, codeVerifier]
  );

  await logConsentAudit({
    consentId,
    eventType: 'consent_initiated',
    userId,
    dataProviderId,
    scopes,
    details: { purpose, expiresAt: expiresAt.toISOString() },
  });

  let authorizationUrl: string;

  if (provider.parEndpoint) {
    const requestUri = await submitPAR(provider, {
      clientId: TPP_PARTICIPANT_ID,
      scopes,
      redirectUri: TPP_REDIRECT_URI,
      state,
      codeChallenge,
      codeChallengeMethod,
      consentId,
    });

    authorizationUrl = `${provider.authorizationEndpoint}?client_id=${encodeURIComponent(TPP_PARTICIPANT_ID)}&request_uri=${encodeURIComponent(requestUri)}`;
  } else {
    const params = new URLSearchParams({
      client_id: TPP_PARTICIPANT_ID,
      response_type: 'code',
      redirect_uri: TPP_REDIRECT_URI,
      state,
      scope: scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      consent_id: consentId,
    });

    authorizationUrl = `${provider.authorizationEndpoint}?${params.toString()}`;
  }

  return {
    consentId,
    authorizationUrl,
    state,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Submit Pushed Authorization Request (PAR) per RFC 9126
 * Returns request_uri for use in authorization redirect
 */
async function submitPAR(
  provider: DataProvider,
  params: {
    clientId: string;
    scopes: string[];
    redirectUri: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    consentId: string;
  }
): Promise<string> {
  if (!provider.parEndpoint) {
    throw new Error('PAR endpoint not configured for Data Provider');
  }

  const body = new URLSearchParams({
    client_id: params.clientId,
    response_type: 'code',
    redirect_uri: params.redirectUri,
    state: params.state,
    scope: params.scopes.join(' '),
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    consent_id: params.consentId,
  });

  const response = await fetch(provider.parEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-fapi-interaction-id': crypto.randomUUID(),
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PAR request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { request_uri?: string };

  if (!data.request_uri) {
    throw new Error('PAR response missing request_uri');
  }

  return data.request_uri;
}

/**
 * Handle OAuth callback and exchange authorization code for access token
 * Verifies state, retrieves stored code_verifier, and exchanges code
 */
export async function handleConsentCallback(
  code: string,
  state: string
): Promise<{ consentId: string; accessToken: string }> {
  const consentResult = await pool.query(
    `SELECT * FROM obs_consents WHERE state = $1 AND status = 'pending'`,
    [state]
  );

  if (!consentResult.rows[0]) {
    throw new Error('Invalid or expired consent state');
  }

  const consent = consentResult.rows[0] as Record<string, unknown>;
  const provider = await getDataProvider(String(consent.data_provider_id));

  // Token endpoint requires plaintext code_verifier (RFC 7636); retrieve from short-lived store
  const pkceResult = await pool.query<{ code_verifier: string }>(
    `SELECT code_verifier FROM obs_consent_pkce WHERE state = $1`,
    [state]
  );
  if (!pkceResult.rows[0]?.code_verifier) {
    throw new Error('Missing PKCE code verifier for this consent state');
  }
  const codeVerifierPlaintext = pkceResult.rows[0].code_verifier;

  const tokenResult = await exchangeCodeForToken(provider, {
    code,
    redirectUri: String(consent.redirect_uri),
    clientId: TPP_PARTICIPANT_ID,
    codeVerifier: codeVerifierPlaintext,
  });

  // Remove plaintext verifier immediately after use
  await pool.query(`DELETE FROM obs_consent_pkce WHERE state = $1`, [state]);

  await pool.query(
    `UPDATE obs_consents
     SET status = 'active',
         access_token = $1,
         token_expires_at = $2,
         granted_at = NOW()
     WHERE id = $3`,
    [tokenResult.accessToken, new Date(Date.now() + tokenResult.expiresIn * 1000), consent.id]
  );

  await logConsentAudit({
    consentId: String(consent.id),
    eventType: 'consent_granted',
    userId: String(consent.user_id),
    dataProviderId: String(consent.data_provider_id),
    scopes: (consent.scopes as string[]) ?? [],
    details: { tokenExpiresIn: tokenResult.expiresIn },
  });

  return {
    consentId: String(consent.id),
    accessToken: tokenResult.accessToken,
  };
}

/**
 * Exchange authorization code for access token per RFC 6749 §4.1.3
 * Includes PKCE code_verifier
 */
async function exchangeCodeForToken(
  provider: DataProvider,
  params: {
    code: string;
    redirectUri: string;
    clientId: string;
    codeVerifier: string;
  }
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(provider.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-fapi-interaction-id': crypto.randomUUID(),
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
    scope: data.scope ?? '',
  };
}

/**
 * Retrieve active consent for user
 */
function mapConsentRow(row: Record<string, unknown>): ConsentRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    dataProviderId: String(row.data_provider_id),
    scopes: (row.scopes as string[]) ?? [],
    purpose: row.purpose as ConsentRecord['purpose'],
    status: row.status as ConsentRecord['status'],
    pkceVerifierHash: String(row.pkce_verifier_hash ?? ''),
    redirectUri: String(row.redirect_uri),
    state: String(row.state),
    accessToken: row.access_token != null ? String(row.access_token) : null,
    tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at as string).toISOString() : null,
    grantedAt: row.granted_at ? new Date(row.granted_at as string).toISOString() : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at as string).toISOString() : null,
    expiresAt: new Date(row.expires_at as string).toISOString(),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function getActiveConsent(
  userId: string,
  consentId: string
): Promise<ConsentRecord> {
  const result = await pool.query(
    `SELECT * FROM obs_consents
     WHERE id = $1 AND user_id = $2 AND status = 'active'
     AND expires_at > NOW()`,
    [consentId, userId]
  );

  if (!result.rows[0]) {
    throw new Error('No active consent found');
  }

  return mapConsentRow(result.rows[0] as Record<string, unknown>);
}

/**
 * Revoke consent and notify Data Provider
 */
export async function revokeConsent(
  userId: string,
  consentId: string,
  revokedBy: 'user' | 'tpp' | 'system' = 'user'
): Promise<void> {
  const consent = await pool.query(
    `SELECT * FROM obs_consents WHERE id = $1 AND user_id = $2`,
    [consentId, userId]
  );

  if (!consent.rows[0]) {
    throw new Error('Consent not found');
  }

  const consentRecord = mapConsentRow(consent.rows[0] as Record<string, unknown>);

  if (consentRecord.status === 'revoked') {
    return;
  }

  const provider = await getDataProvider(consentRecord.dataProviderId);

  if (provider.revocationEndpoint && consentRecord.accessToken) {
    await fetch(provider.revocationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-fapi-interaction-id': crypto.randomUUID(),
      },
      body: new URLSearchParams({
        token: consentRecord.accessToken,
        token_type_hint: 'access_token',
      }).toString(),
    }).catch((err) => {
      console.error('Failed to notify Data Provider of revocation:', err);
    });
  }

  await pool.query(
    `UPDATE obs_consents
     SET status = 'revoked', revoked_at = NOW()
     WHERE id = $1`,
    [consentId]
  );

  await logConsentAudit({
    consentId,
    eventType: 'consent_revoked',
    userId: consentRecord.userId,
    dataProviderId: consentRecord.dataProviderId,
    scopes: consentRecord.scopes,
    revokedBy,
    details: { reason: `Revoked by ${revokedBy}` },
  });
}

/**
 * Log audit trail for all OBS operations (PSD-12, ETA 2019 compliance)
 */
export async function logConsentAudit(params: {
  consentId: string;
  eventType: 'consent_initiated' | 'consent_granted' | 'consent_revoked' | 'data_accessed' | 'payment_initiated';
  userId: string;
  dataProviderId: string;
  scopes: string[];
  revokedBy?: 'user' | 'tpp' | 'system';
  details?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO obs_consent_audit_log (
      consent_id, event_type, user_id, data_provider_id,
      scopes, revoked_by, details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.consentId,
      params.eventType,
      params.userId,
      params.dataProviderId,
      params.scopes,
      params.revokedBy ?? null,
      JSON.stringify(params.details ?? {}),
    ]
  );
}

/**
 * Make authenticated request to Data Provider API with consent token
 * Includes FAPI 1.0 Advanced security headers
 */
export async function makeDataProviderRequest<T = unknown>(
  provider: DataProvider,
  endpoint: string,
  accessToken: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const interactionId = crypto.randomUUID();

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'x-fapi-interaction-id': interactionId,
    'x-fapi-auth-date': new Date().toUTCString(),
    'x-fapi-customer-ip-address': '0.0.0.0',
  };

  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Data Provider request failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<T>;
}
