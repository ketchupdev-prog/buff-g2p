/**
 * Open Banking API client – Buffr G2P.
 * Calls Buffr backend proxy; backend uses mTLS (QWAC) and OAuth with Data Provider.
 * Namibian Open Banking Standards v1.0: responses use root structure { data, links, meta }.
 * Location: services/openBankingApi.ts
 */
import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/** Open Banking standard response wrapper (Namibian Standards §9.1) */
export interface OpenBankingResponse<T> {
  data: T;
  links?: { self?: string; [k: string]: string | undefined };
  meta?: { totalRecords?: number; [k: string]: unknown };
}

/** Open Banking error object */
export interface OpenBankingError {
  code: string;
  title: string;
  detail?: string;
}

export interface OpenBankingErrorResponse {
  errors: OpenBankingError[];
}

export interface BankItem {
  id: string;
  name: string;
  logoUrl?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  parEndpoint?: string;
}

export interface ConsentRequestParams {
  bankId: string;
  scopes: string[];
  redirectUri: string;
  state: string;
}

export interface CreateConsentResponse {
  authorizationUrl?: string;
  requestUri?: string;
  state: string;
}

export interface ExchangeCodeParams {
  bankId: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getSecureItem('buffr_access_token');
  if (!token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** GET list of supported banks (from Buffr backend) */
export async function getBanks(): Promise<BankItem[]> {
  if (!API_BASE_URL) return [];
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/mobile/open-banking/banks`, { headers });
  if (!res.ok) throw new Error('Failed to load banks');
  const json = await res.json();
  const ob = json as OpenBankingResponse<BankItem[]>;
  return ob.data ?? json;
}

/** POST create consent request; returns authorizationUrl (or requestUri for PAR) */
export async function createConsentRequest(
  params: ConsentRequestParams
): Promise<CreateConsentResponse> {
  if (!API_BASE_URL) throw new Error('API not configured');
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/mobile/open-banking/consent`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err: OpenBankingErrorResponse = await res.json().catch(() => ({
      errors: [{ code: 'UNKNOWN', title: res.statusText }],
    }));
    throw new Error(
      err.errors?.[0]?.detail ?? err.errors?.[0]?.title ?? 'Consent request failed'
    );
  }
  return res.json();
}

/** POST send authorization code to backend; backend exchanges with bank (mTLS) and stores tokens */
export async function exchangeCodeForBankTokens(
  params: ExchangeCodeParams
): Promise<{ linked: boolean }> {
  if (!API_BASE_URL) throw new Error('API not configured');
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/mobile/open-banking/token-exchange`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}
