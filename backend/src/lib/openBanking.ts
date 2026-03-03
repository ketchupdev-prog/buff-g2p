/**
 * Open Banking Service – Buffr G2P.
 * Handles OAuth flow with Namibian banks via mTLS.
 * Per Namibian Open Banking Standards v1.0.
 * Location: backend/src/lib/openBanking.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment
config({ path: resolve(process.cwd(), "backend/.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "backend/.env.local") });

// ============================================================================
// Configuration
// ============================================================================

interface OpenBankingConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  banks: BankConfig[];
}

interface BankConfig {
  id: string;
  name: string;
  logoUrl?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  parEndpoint?: string;
  jwksUri?: string;
}

function getOpenBankingConfig(): OpenBankingConfig {
  // Default Namibian banks
  const defaultBanks: BankConfig[] = [
    {
      id: "bank-windhoek",
      name: "Bank Windhoek",
      logoUrl: "https://www.bankwindhoek.com.na/logo.png",
      authorizationEndpoint: "https://obank.bankwindhoek.com.na/oauth2/authorize",
      tokenEndpoint: "https://obank.bankwindhoek.com.na/oauth2/token",
      parEndpoint: "https://obank.bankwindhoek.com.na/oauth2/par",
      jwksUri: "https://obank.bankwindhoek.com.na/.well-known/jwks.json",
    },
    {
      id: "standard-bank",
      name: "Standard Bank Namibia",
      logoUrl: "https://www.standardbank.com.na/logo.png",
      authorizationEndpoint: "https://openbanking.standardbank.com.na/oauth2/authorize",
      tokenEndpoint: "https://openbanking.standardbank.com.na/oauth2/token",
      parEndpoint: "https://openbanking.standardbank.com.na/oauth2/par",
      jwksUri: "https://openbanking.standardbank.com.na/.well-known/jwks.json",
    },
    {
      id: "nedbank",
      name: "Nedbank Namibia",
      logoUrl: "https://www.nedbank.com.na/logo.png",
      authorizationEndpoint: "https://openbanking.nedbank.com.na/oauth2/authorize",
      tokenEndpoint: "https://openbanking.nedbank.com.na/oauth2/token",
      parEndpoint: "https://openbanking.nedbank.com.na/oauth2/par",
      jwksUri: "https://openbanking.nedbank.com.na/.well-known/jwks.json",
    },
    {
      id: "fnb",
      name: "FNB Namibia",
      logoUrl: "https://www.fnbnamibia.com.na/logo.png",
      authorizationEndpoint: "https://openbanking.fnbnamibia.com.na/oauth2/authorize",
      tokenEndpoint: "https://openbanking.fnbnamibia.com.na/oauth2/token",
      parEndpoint: "https://openbanking.fnbnamibia.com.na/oauth2/par",
      jwksUri: "https://openbanking.fnbnamibia.com.na/.well-known/jwks.json",
    },
  ];

  // Allow custom bank list via env
  const envBanks = process.env.OPEN_BANKING_BANKS;
  let banks = defaultBanks;
  
  if (envBanks) {
    try {
      banks = JSON.parse(envBanks);
    } catch {
      console.warn("Invalid OPEN_BANKING_BANKS JSON, using defaults");
    }
  }

  return {
    enabled: process.env.OPEN_BANKING_ENABLED !== "false",
    clientId: process.env.OPEN_BANKING_CLIENT_ID ?? "buffr-g2p-client",
    clientSecret: process.env.OPEN_BANKING_CLIENT_SECRET ?? "",
    redirectUri: process.env.OPEN_BANKING_REDIRECT_URI ?? "buffr://oauth/callback",
    scopes: (process.env.OPEN_BANKING_SCOPES ?? "accounts:read balances:read transactions:read").split(" "),
    banks,
  };
}

const config_ = getOpenBankingConfig();

// ============================================================================
// Types
// ============================================================================

export interface Bank {
  id: string;
  name: string;
  logoUrl?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  parEndpoint?: string;
}

export interface ConsentRequest {
  bankId: string;
  scopes: string[];
  redirectUri: string;
  state: string;
}

export interface ConsentResponse {
  authorizationUrl?: string;
  requestUri?: string;
  state: string;
}

export interface TokenExchangeRequest {
  bankId: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

export interface BankTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
}

export interface LinkedAccount {
  id: string;
  bankId: string;
  accountId: string;
  accountName: string;
  accountType: string;
  currency: string;
  balance?: string;
}

// ============================================================================
// Bank Endpoints
// ============================================================================

/**
 * Get list of supported banks.
 */
export function getSupportedBanks(): Bank[] {
  if (!config_.enabled) {
    return [];
  }
  
  return config_.banks.map(bank => ({
    id: bank.id,
    name: bank.name,
    logoUrl: bank.logoUrl,
    authorizationEndpoint: bank.authorizationEndpoint,
    tokenEndpoint: bank.tokenEndpoint,
    parEndpoint: bank.parEndpoint,
  }));
}

/**
 * Get bank configuration by ID.
 */
export function getBankById(bankId: string): BankConfig | undefined {
  return config_.banks.find(b => b.id === bankId);
}

// ============================================================================
// Consent Creation
// ============================================================================

/**
 * Create OAuth consent request.
 * Returns either direct authorization URL or PAR request_uri.
 */
export async function createConsent(request: ConsentRequest): Promise<ConsentResponse> {
  const bank = getBankById(request.bankId);
  
  if (!bank) {
    throw new Error("Bank not found");
  }

  const scopes = request.scopes.length > 0 ? request.scopes : config_.scopes;
  
  // Use PAR if available, otherwise direct authorization URL
  if (bank.parEndpoint) {
    return createPARConsent(bank, request, scopes);
  }
  
  return createDirectConsent(bank, request, scopes);
}

/**
 * Create consent using Pushed Authorization Request (PAR).
 * More secure - authorization details are sent server-to-server.
 */
async function createPARConsent(
  bank: BankConfig,
  request: ConsentRequest,
  scopes: string[]
): Promise<ConsentResponse> {
  const state = request.state || generateState();
  
  // In production, this would call the bank's PAR endpoint
  // For now, return a mock response
  const requestUri = `urn:buffr:par:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  
  const authorizationUrl = `${bank.authorizationEndpoint}?request_uri=${encodeURIComponent(requestUri)}`;
  
  return {
    authorizationUrl,
    requestUri,
    state,
  };
}

/**
 * Create direct OAuth authorization URL.
 */
function createDirectConsent(
  bank: BankConfig,
  request: ConsentRequest,
  scopes: string[]
): ConsentResponse {
  const state = request.state || generateState();
  
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config_.clientId,
    redirect_uri: request.redirectUri || config_.redirectUri,
    scope: scopes.join(" "),
    state,
  });
  
  const authorizationUrl = `${bank.authorizationEndpoint}?${params.toString()}`;
  
  return {
    authorizationUrl,
    state,
  };
}

// ============================================================================
// Token Exchange
// ============================================================================

/**
 * Exchange authorization code for access tokens.
 * Uses mTLS if configured.
 */
export async function exchangeCodeForTokens(request: TokenExchangeRequest): Promise<BankTokens> {
  const bank = getBankById(request.bankId);
  
  if (!bank) {
    throw new Error("Bank not found");
  }

  // In production, this would use mTLS client
  // const mtlsClient = await getMtlsClient(bank.id);
  
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: request.code,
    redirect_uri: request.redirectUri || config_.redirectUri,
    client_id: config_.clientId,
    client_secret: config_.clientSecret,
  });
  
  if (request.codeVerifier) {
    params.append("code_verifier", request.codeVerifier);
  }

  // In production, call the bank's token endpoint with mTLS
  // const response = await mtlsClient.post(bank.tokenEndpoint, params.toString());
  
  // For development, return mock tokens
  return {
    accessToken: `mock_access_${Date.now()}`,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresAt: Date.now() + 3600000, // 1 hour
    scope: config_.scopes.join(" "),
    tokenType: "Bearer",
  };
}

/**
 * Refresh access token.
 */
export async function refreshToken(bankId: string, refreshToken: string): Promise<BankTokens> {
  const bank = getBankById(bankId);
  
  if (!bank) {
    throw new Error("Bank not found");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config_.clientId,
    client_secret: config_.clientSecret,
  });

  // In production, call the bank's token endpoint
  // For development, return mock tokens
  return {
    accessToken: `mock_access_${Date.now()}`,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresAt: Date.now() + 3600000,
    scope: config_.scopes.join(" "),
    tokenType: "Bearer",
  };
}

// ============================================================================
// Account Access
// ============================================================================

/**
 * Get linked accounts for a user.
 */
export async function getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
  // In production, query database for user's linked accounts
  // Return mock data for development
  return [];
}

/**
 * Get account balance.
 */
export async function getAccountBalance(
  userId: string,
  bankId: string,
  accountId: string
): Promise<{ available: string; current: string; currency: string }> {
  // In production, call bank's API with stored tokens
  // Return mock data for development
  return {
    available: "10000.00",
    current: "10000.00",
    currency: "NAD",
  };
}

/**
 * Get account transactions.
 */
export async function getAccountTransactions(
  userId: string,
  bankId: string,
  accountId: string,
  fromDate?: string,
  toDate?: string,
  page?: number,
  pageSize?: number
): Promise<{
  transactions: Array<{
    id: string;
    date: string;
    amount: string;
    currency: string;
    description: string;
    type: string;
    reference: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}> {
  // In production, call bank's API with stored tokens
  return {
    transactions: [],
    total: 0,
    page: page || 1,
    pageSize: pageSize || 20,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateState(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ============================================================================
// Export
// ============================================================================

export default {
  getSupportedBanks,
  getBankById,
  createConsent,
  exchangeCodeForTokens,
  refreshToken,
  getLinkedAccounts,
  getAccountBalance,
  getAccountTransactions,
};
