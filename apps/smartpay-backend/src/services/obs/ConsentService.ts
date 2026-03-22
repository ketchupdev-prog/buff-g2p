/**
 * OBS Consent Management Service
 *
 * Persistence: PostgreSQL via `pool` (Neon-compatible). OAuth consent rows live in
 * `obs_oauth_consents` / `obs_oauth_access_tokens` (distinct from mobile `obs_consents`).
 */

import { pool } from '../../lib/db';
import crypto from 'crypto';
import { addDays, isBefore, isAfter } from 'date-fns';
import {
  PushedAuthorizationRequest,
  PushedAuthorizationResponse,
  TokenRequest,
  TokenResponse,
  Consent,
  ConsentStatus,
  ConsentScope,
  OBSErrorCode,
  OBSError,
} from '../../types/obs';

const MAX_CONSENT_DURATION_DAYS = 180;
const AUTH_CODE_EXPIRY_MINUTES = 10;
const ACCESS_TOKEN_EXPIRY_MINUTES = 60;
const REFRESH_TOKEN_EXPIRY_DAYS = 180;

const VALID_SCOPES: ConsentScope[] = [
  'banking:accounts.basic.read',
  'banking:payments.write',
  'banking:payments.read',
  'consent:authorisationcode.write',
  'consent:authorisationtoken.write',
];

type OAuthConsentRow = {
  id: string;
  consent_id: string;
  account_holder_id: string;
  tpp_participant_id: string;
  dp_participant_id: string;
  status: string;
  status_reason: string | null;
  scopes: string[];
  permissions: unknown;
  creation_date_time: string;
  expiration_date_time: string;
  status_update_date_time: string | null;
  transaction_from_date_time: string | null;
  transaction_to_date_time: string | null;
  account_ids: string[];
  authorization_code: string | null;
  auth_code_expires_at: Date | null;
  auth_code_used: boolean;
  code_challenge: string | null;
  code_challenge_method: string | null;
  redirect_uri: string | null;
  state: string | null;
};

export async function createPushedAuthorizationRequest(
  request: PushedAuthorizationRequest,
  tppParticipantId: string,
  dpParticipantId: string
): Promise<{ data: PushedAuthorizationResponse }> {
  const tpp = await pool.query(
    `SELECT participant_id, status FROM obs_participants WHERE participant_id = $1`,
    [tppParticipantId]
  );
  if (!tpp.rows[0] || tpp.rows[0].status !== 'active') {
    throw createOBSError(
      OBSErrorCode.UNAUTHORIZED_CLIENT,
      'TPP not authorized',
      'TPP participant is not active or not found'
    );
  }

  const dp = await pool.query(
    `SELECT participant_id, status FROM obs_participants WHERE participant_id = $1`,
    [dpParticipantId]
  );
  if (!dp.rows[0] || dp.rows[0].status !== 'active') {
    throw createOBSError(
      OBSErrorCode.INVALID_REQUEST,
      'Invalid Data Provider',
      'Data Provider participant is not active or not found'
    );
  }

  if (request.client_id !== tppParticipantId) {
    throw createOBSError(
      OBSErrorCode.INVALID_CLIENT,
      'Client ID mismatch',
      'client_id does not match authenticated TPP'
    );
  }

  const requestedScopes = request.scope.split(' ') as ConsentScope[];
  const invalidScopes = requestedScopes.filter((s) => !VALID_SCOPES.includes(s));
  if (invalidScopes.length > 0) {
    throw createOBSError(
      OBSErrorCode.INVALID_SCOPE,
      'Invalid scope',
      `Invalid scopes: ${invalidScopes.join(', ')}`
    );
  }

  if (request.code_challenge_method !== 'S256') {
    throw createOBSError(
      OBSErrorCode.INVALID_REQUEST,
      'Invalid code challenge method',
      'Only S256 is supported for code_challenge_method'
    );
  }

  if (!request.code_challenge || request.code_challenge.length < 43) {
    throw createOBSError(
      OBSErrorCode.INVALID_REQUEST,
      'Invalid code challenge',
      'code_challenge must be at least 43 characters'
    );
  }

  if (!isValidRedirectUri(request.redirect_uri)) {
    throw createOBSError(
      OBSErrorCode.INVALID_REQUEST,
      'Invalid redirect URI',
      'redirect_uri is not valid'
    );
  }

  const consentId = crypto.randomUUID();
  const authCode = generateSecureToken(32);
  const authCodeExpiresAt = new Date(Date.now() + AUTH_CODE_EXPIRY_MINUTES * 60 * 1000);
  const expirationDateTime = addDays(new Date(), MAX_CONSENT_DURATION_DAYS).toISOString();
  const nowIso = new Date().toISOString();

  await pool.query(
    `INSERT INTO obs_oauth_consents (
      consent_id, account_holder_id, tpp_participant_id, dp_participant_id,
      status, scopes, permissions, creation_date_time, expiration_date_time, status_update_date_time,
      transaction_from_date_time, transaction_to_date_time, account_ids,
      authorization_code, auth_code_expires_at, auth_code_used,
      code_challenge, code_challenge_method, redirect_uri, state
    ) VALUES (
      $1, 'PENDING', $2, $3,
      'AwaitingAuthorisation', $4, $5::jsonb, $6, $7, $8,
      $9, $10, '{}',
      $11, $12, false,
      $13, $14, $15, $16
    )`,
    [
      consentId,
      tppParticipantId,
      dpParticipantId,
      requestedScopes,
      JSON.stringify(request.permissions ?? {}),
      nowIso,
      expirationDateTime,
      nowIso,
      request.transaction_from_date_time ?? null,
      request.transaction_to_date_time ?? null,
      authCode,
      authCodeExpiresAt,
      request.code_challenge,
      request.code_challenge_method,
      request.redirect_uri,
      request.state ?? null,
    ]
  );

  const requestUri = `urn:ietf:params:oauth:request_uri:${consentId}`;
  return {
    data: {
      request_uri: requestUri,
      expires_in: 90,
    },
  };
}

export async function authorizeConsent(
  consentId: string,
  accountHolderId: string,
  authorizedAccountIds: string[]
): Promise<{ authorizationCode: string; redirectUri: string; state: string }> {
  const r = await pool.query<OAuthConsentRow>(
    `SELECT * FROM obs_oauth_consents WHERE consent_id = $1`,
    [consentId]
  );
  const consent = r.rows[0];
  if (!consent) {
    throw createOBSError(OBSErrorCode.CONSENT_INVALID, 'Consent not found', 'Consent does not exist');
  }

  if (consent.status !== 'AwaitingAuthorisation') {
    throw createOBSError(
      OBSErrorCode.CONSENT_INVALID,
      'Consent not awaiting authorization',
      `Consent status is ${consent.status}`
    );
  }

  if (consent.auth_code_expires_at && isBefore(new Date(consent.auth_code_expires_at), new Date())) {
    await pool.query(
      `UPDATE obs_oauth_consents SET status = 'Expired', status_update_date_time = $2 WHERE id = $1`,
      [consent.id, new Date().toISOString()]
    );
    throw createOBSError(
      OBSErrorCode.CONSENT_EXPIRED,
      'Authorization code expired',
      'The authorization code has expired'
    );
  }

  await pool.query(
    `UPDATE obs_oauth_consents SET
      account_holder_id = $2,
      account_ids = $3::text[],
      status = 'Authorised',
      status_update_date_time = $4
     WHERE id = $1`,
    [consent.id, accountHolderId, authorizedAccountIds, new Date().toISOString()]
  );

  return {
    authorizationCode: consent.authorization_code!,
    redirectUri: consent.redirect_uri!,
    state: consent.state!,
  };
}

export async function rejectConsent(consentId: string, reason?: string): Promise<void> {
  await pool.query(
    `UPDATE obs_oauth_consents SET
      status = 'Rejected',
      status_reason = $2,
      status_update_date_time = $3
     WHERE consent_id = $1`,
    [consentId, reason ?? null, new Date().toISOString()]
  );
}

export async function exchangeAuthorizationCode(
  request: TokenRequest,
  tppParticipantId: string
): Promise<{ data: TokenResponse }> {
  if (request.grant_type !== 'authorization_code') {
    throw createOBSError(
      OBSErrorCode.UNSUPPORTED_GRANT_TYPE,
      'Unsupported grant type',
      'Only authorization_code is supported'
    );
  }

  if (!request.code || !request.code_verifier) {
    throw createOBSError(
      OBSErrorCode.INVALID_REQUEST,
      'Missing parameters',
      'code and code_verifier are required'
    );
  }

  const r = await pool.query<OAuthConsentRow>(
    `SELECT * FROM obs_oauth_consents WHERE authorization_code = $1`,
    [request.code]
  );
  const consent = r.rows[0];
  if (!consent) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'Invalid authorization code',
      'Authorization code not found'
    );
  }

  if (consent.tpp_participant_id !== tppParticipantId) {
    throw createOBSError(
      OBSErrorCode.INVALID_CLIENT,
      'Client mismatch',
      'Authorization code does not belong to this TPP'
    );
  }

  if (consent.auth_code_used) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'Authorization code already used',
      'Authorization code can only be used once'
    );
  }

  if (consent.auth_code_expires_at && isBefore(new Date(consent.auth_code_expires_at), new Date())) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'Authorization code expired',
      'Authorization code has expired'
    );
  }

  const ok = await verifyCodeChallenge(request.code_verifier, consent.code_challenge!);
  if (!ok) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'Invalid code verifier',
      'code_verifier does not match code_challenge'
    );
  }

  if (request.redirect_uri !== consent.redirect_uri) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'redirect_uri mismatch',
      'redirect_uri does not match original request'
    );
  }

  await pool.query(`UPDATE obs_oauth_consents SET auth_code_used = true WHERE id = $1`, [consent.id]);

  const accessToken = generateSecureToken(48);
  const refreshToken = generateSecureToken(48);
  const expiresIn = ACCESS_TOKEN_EXPIRY_MINUTES * 60;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const refreshExpiresAt = addDays(new Date(), REFRESH_TOKEN_EXPIRY_DAYS);
  const scopeStr = consent.scopes.join(' ');

  await pool.query(
    `INSERT INTO obs_oauth_access_tokens (
      access_token, refresh_token, token_type, scope, expires_at, refresh_expires_at, consent_internal_id
    ) VALUES ($1, $2, 'Bearer', $3, $4, $5, $6)`,
    [accessToken, refreshToken, scopeStr, expiresAt, refreshExpiresAt, consent.id]
  );

  return {
    data: {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: scopeStr,
    },
  };
}

export async function refreshAccessToken(
  request: TokenRequest,
  tppParticipantId: string
): Promise<{ data: TokenResponse }> {
  if (request.grant_type !== 'refresh_token') {
    throw createOBSError(
      OBSErrorCode.UNSUPPORTED_GRANT_TYPE,
      'Unsupported grant type',
      'Only refresh_token is supported'
    );
  }

  if (!request.refresh_token) {
    throw createOBSError(
      OBSErrorCode.INVALID_REQUEST,
      'Missing refresh_token',
      'refresh_token is required'
    );
  }

  const r = await pool.query<{
    id: string;
    refresh_token: string | null;
    scope: string;
    revoked: boolean;
    refresh_expires_at: Date | null;
    consent_internal_id: string;
    tpp_participant_id: string;
    consent_status: string;
    expiration_date_time: string;
  }>(
    `SELECT t.id, t.refresh_token, t.scope, t.revoked, t.refresh_expires_at, t.consent_internal_id,
            c.tpp_participant_id, c.status AS consent_status, c.expiration_date_time
     FROM obs_oauth_access_tokens t
     JOIN obs_oauth_consents c ON c.id = t.consent_internal_id
     WHERE t.refresh_token = $1`,
    [request.refresh_token]
  );
  const row = r.rows[0];
  if (!row) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'Invalid refresh token',
      'Refresh token not found'
    );
  }

  if (row.tpp_participant_id !== tppParticipantId) {
    throw createOBSError(
      OBSErrorCode.INVALID_CLIENT,
      'Client mismatch',
      'Refresh token does not belong to this TPP'
    );
  }

  if (row.revoked) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'Token revoked',
      'Refresh token has been revoked'
    );
  }

  if (row.refresh_expires_at && isBefore(new Date(row.refresh_expires_at), new Date())) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'Refresh token expired',
      'Refresh token has expired'
    );
  }

  if (row.consent_status !== 'Authorised') {
    throw createOBSError(
      OBSErrorCode.CONSENT_INVALID,
      'Consent not valid',
      `Consent status is ${row.consent_status}`
    );
  }

  if (isAfter(new Date(), new Date(row.expiration_date_time))) {
    await pool.query(
      `UPDATE obs_oauth_consents SET status = 'Expired', status_update_date_time = $2 WHERE id = $1`,
      [row.consent_internal_id, new Date().toISOString()]
    );
    throw createOBSError(OBSErrorCode.CONSENT_EXPIRED, 'Consent expired', 'Consent has expired');
  }

  const newAccessToken = generateSecureToken(48);
  const expiresIn = ACCESS_TOKEN_EXPIRY_MINUTES * 60;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await pool.query(
    `UPDATE obs_oauth_access_tokens SET access_token = $2, expires_at = $3 WHERE id = $1`,
    [row.id, newAccessToken, expiresAt]
  );

  return {
    data: {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: row.refresh_token!,
      scope: row.scope,
    },
  };
}

export async function validateAccessToken(
  accessToken: string
): Promise<Consent & { accountHolderId: string }> {
  const r = await pool.query<{
    token_id: string;
    revoked: boolean;
    expires_at: Date;
    consent_id: string;
    account_holder_id: string;
    tpp_participant_id: string;
    dp_participant_id: string;
    consent_status: string;
    scopes: string[];
    expiration_date_time: string;
    creation_date_time: string;
    status_update_date_time: string | null;
    transaction_from_date_time: string | null;
    transaction_to_date_time: string | null;
    account_ids: string[];
    consent_internal_id: string;
  }>(
    `SELECT t.id AS token_id, t.revoked, t.expires_at, t.consent_internal_id,
            c.consent_id, c.account_holder_id, c.tpp_participant_id, c.dp_participant_id,
            c.status AS consent_status, c.scopes, c.expiration_date_time, c.creation_date_time,
            c.status_update_date_time, c.transaction_from_date_time, c.transaction_to_date_time,
            c.account_ids
     FROM obs_oauth_access_tokens t
     JOIN obs_oauth_consents c ON c.id = t.consent_internal_id
     WHERE t.access_token = $1`,
    [accessToken]
  );
  const row = r.rows[0];
  if (!row) {
    throw createOBSError(
      OBSErrorCode.INVALID_GRANT,
      'Invalid access token',
      'Access token not found'
    );
  }

  if (row.revoked) {
    throw createOBSError(OBSErrorCode.INVALID_GRANT, 'Token revoked', 'Access token has been revoked');
  }

  if (isBefore(new Date(row.expires_at), new Date())) {
    throw createOBSError(OBSErrorCode.INVALID_GRANT, 'Token expired', 'Access token has expired');
  }

  if (row.consent_status !== 'Authorised') {
    throw createOBSError(
      OBSErrorCode.CONSENT_INVALID,
      'Consent not authorized',
      `Consent status is ${row.consent_status}`
    );
  }

  if (isAfter(new Date(), new Date(row.expiration_date_time))) {
    await pool.query(
      `UPDATE obs_oauth_consents SET status = 'Expired', status_update_date_time = $2 WHERE id = $1`,
      [row.consent_internal_id, new Date().toISOString()]
    );
    throw createOBSError(OBSErrorCode.CONSENT_EXPIRED, 'Consent expired', 'Consent has expired');
  }

  await pool.query(
    `UPDATE obs_oauth_access_tokens SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = $1`,
    [row.token_id]
  );

  return {
    consentId: row.consent_id,
    tppParticipantId: row.tpp_participant_id,
    accountHolderId: row.account_holder_id,
    dpParticipantId: row.dp_participant_id,
    status: row.consent_status as ConsentStatus,
    scopes: row.scopes as ConsentScope[],
    expirationDateTime: row.expiration_date_time,
    creationDateTime: row.creation_date_time,
    statusUpdateDateTime: row.status_update_date_time ?? row.creation_date_time,
    transactionFromDateTime: row.transaction_from_date_time ?? undefined,
    transactionToDateTime: row.transaction_to_date_time ?? undefined,
    accounts: row.account_ids ?? [],
  };
}

export async function revokeConsentByTPP(
  consentId: string,
  tppParticipantId: string,
  reason?: string
): Promise<void> {
  const r = await pool.query<{ id: string; tpp_participant_id: string }>(
    `SELECT id, tpp_participant_id FROM obs_oauth_consents WHERE consent_id = $1`,
    [consentId]
  );
  const consent = r.rows[0];
  if (!consent) {
    throw createOBSError(OBSErrorCode.CONSENT_INVALID, 'Consent not found', 'Consent does not exist');
  }
  if (consent.tpp_participant_id !== tppParticipantId) {
    throw createOBSError(
      OBSErrorCode.UNAUTHORIZED_CLIENT,
      'Unauthorized',
      'Consent does not belong to this TPP'
    );
  }
  await revokeConsentInternal(consent.id, 'tpp', reason);
}

export async function revokeConsentByAccountHolder(
  consentId: string,
  accountHolderId: string,
  reason?: string
): Promise<void> {
  const r = await pool.query<{ id: string; account_holder_id: string }>(
    `SELECT id, account_holder_id FROM obs_oauth_consents WHERE consent_id = $1`,
    [consentId]
  );
  const consent = r.rows[0];
  if (!consent) {
    throw createOBSError(OBSErrorCode.CONSENT_INVALID, 'Consent not found', 'Consent does not exist');
  }
  if (consent.account_holder_id !== accountHolderId) {
    throw createOBSError(
      OBSErrorCode.UNAUTHORIZED_CLIENT,
      'Unauthorized',
      'Consent does not belong to this account holder'
    );
  }
  await revokeConsentInternal(consent.id, 'user', reason);
}

async function revokeConsentInternal(
  consentInternalId: string,
  revokedBy: 'user' | 'tpp' | 'dp',
  reason?: string
): Promise<void> {
  const now = new Date();
  await pool.query(
    `UPDATE obs_oauth_access_tokens SET revoked = true, revoked_at = $2, revoked_reason = $3
     WHERE consent_internal_id = $1 AND revoked = false`,
    [consentInternalId, now, reason ?? null]
  );
  await pool.query(
    `UPDATE obs_oauth_consents SET
      status = 'Revoked',
      status_update_date_time = $2,
      revoked_at = $3,
      revoked_by = $4,
      revoked_reason = $5
     WHERE id = $1`,
    [consentInternalId, now.toISOString(), now, revokedBy, reason ?? null]
  );
}

export async function revokeAccessToken(accessToken: string, reason?: string): Promise<void> {
  await pool.query(
    `UPDATE obs_oauth_access_tokens SET revoked = true, revoked_at = NOW(), revoked_reason = $2
     WHERE access_token = $1`,
    [accessToken, reason ?? null]
  );
}

export async function getConsent(consentId: string): Promise<Consent> {
  const r = await pool.query<OAuthConsentRow>(
    `SELECT * FROM obs_oauth_consents WHERE consent_id = $1`,
    [consentId]
  );
  const consent = r.rows[0];
  if (!consent) {
    throw createOBSError(OBSErrorCode.CONSENT_INVALID, 'Consent not found', 'Consent does not exist');
  }
  return mapConsentRow(consent);
}

export async function listConsentsForAccountHolder(
  accountHolderId: string,
  status?: ConsentStatus
): Promise<Consent[]> {
  const r = await pool.query<OAuthConsentRow>(
    status
      ? `SELECT * FROM obs_oauth_consents WHERE account_holder_id = $1 AND status = $2 ORDER BY created_at DESC`
      : `SELECT * FROM obs_oauth_consents WHERE account_holder_id = $1 ORDER BY created_at DESC`,
    status ? [accountHolderId, status] : [accountHolderId]
  );
  return r.rows.map(mapConsentRow);
}

function mapConsentRow(consent: OAuthConsentRow): Consent {
  return {
    consentId: consent.consent_id,
    tppParticipantId: consent.tpp_participant_id,
    accountHolderId: consent.account_holder_id,
    dpParticipantId: consent.dp_participant_id,
    status: consent.status as ConsentStatus,
    scopes: consent.scopes as ConsentScope[],
    expirationDateTime: consent.expiration_date_time,
    creationDateTime: consent.creation_date_time,
    statusUpdateDateTime: consent.status_update_date_time ?? consent.creation_date_time,
    transactionFromDateTime: consent.transaction_from_date_time ?? undefined,
    transactionToDateTime: consent.transaction_to_date_time ?? undefined,
    accounts: consent.account_ids ?? [],
  };
}

function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

async function verifyCodeChallenge(verifier: string, challenge: string): Promise<boolean> {
  const hash = crypto.createHash('sha256').update(verifier).digest('base64url');
  return hash === challenge;
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && url.hostname === 'localhost') ||
      url.protocol === 'smartpay:'
    );
  } catch {
    return false;
  }
}

function createOBSError(code: OBSErrorCode, title: string, detail: string): Error & { obsError: OBSError } {
  const error = new Error(detail) as Error & { obsError: OBSError };
  error.obsError = { code, title, detail };
  return error;
}
