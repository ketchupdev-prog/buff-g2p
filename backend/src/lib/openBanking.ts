/**
 * Open Banking Service – Buffr G2P.
 * Handles OAuth flow with Namibian banks via mTLS.
 * Per Namibian Open Banking Standards v1.0.
 * Location: backend/src/lib/openBanking.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { randomUUID } from "crypto";

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
  participantId: string; // TPP Participant ID (must match QWAC certificate)
}

interface BankConfig {
  id: string;
  name: string;
  logoUrl?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  parEndpoint?: string;
  jwksUri?: string;
  apiEndpoint?: string; // Base URL for banking APIs (e.g., https://api.bank.na)
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
      apiEndpoint: "https://api.bankwindhoek.com.na", // §9.1.1
    },
    {
      id: "standard-bank",
      name: "Standard Bank Namibia",
      logoUrl: "https://www.standardbank.com.na/logo.png",
      authorizationEndpoint: "https://openbanking.standardbank.com.na/oauth2/authorize",
      tokenEndpoint: "https://openbanking.standardbank.com.na/oauth2/token",
      parEndpoint: "https://openbanking.standardbank.com.na/oauth2/par",
      jwksUri: "https://openbanking.standardbank.com.na/.well-known/jwks.json",
      apiEndpoint: "https://api.standardbank.com.na", // §9.1.1
    },
    {
      id: "nedbank",
      name: "Nedbank Namibia",
      logoUrl: "https://www.nedbank.com.na/logo.png",
      authorizationEndpoint: "https://openbanking.nedbank.com.na/oauth2/authorize",
      tokenEndpoint: "https://openbanking.nedbank.com.na/oauth2/token",
      parEndpoint: "https://openbanking.nedbank.com.na/oauth2/par",
      jwksUri: "https://openbanking.nedbank.com.na/.well-known/jwks.json",
      apiEndpoint: "https://api.nedbank.com.na", // §9.1.1
    },
    {
      id: "fnb",
      name: "FNB Namibia",
      logoUrl: "https://www.fnbnamibia.com.na/logo.png",
      authorizationEndpoint: "https://openbanking.fnbnamibia.com.na/oauth2/authorize",
      tokenEndpoint: "https://openbanking.fnbnamibia.com.na/oauth2/token",
      parEndpoint: "https://openbanking.fnbnamibia.com.na/oauth2/par",
      jwksUri: "https://openbanking.fnbnamibia.com.na/.well-known/jwks.json",
      apiEndpoint: "https://api.fnbnamibia.com.na", // §9.1.1
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
    participantId: process.env.OPEN_BANKING_PARTICIPANT_ID ?? "API000001", // Must match QWAC certificate
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
  apiEndpoint?: string; // Base URL for banking APIs (e.g., https://api.bank.na)
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

export interface AccountBalance {
  accountId: string;
  currentBalance: number;
  availableBalance: number;
  currency: string;
  creditLimit?: number;
  amortisedLimit?: number;
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
    apiEndpoint: bank.apiEndpoint,
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
 * Per RFC 9126 and Namibian Open Banking Standards v1.0 §9.5.1.
 * Authorization details sent server-to-server via mTLS for enhanced security.
 */
async function createPARConsent(
  bank: BankConfig,
  request: ConsentRequest,
  scopes: string[]
): Promise<ConsentResponse> {
  const state = request.state || generateState();
  
  if (!bank.parEndpoint) {
    throw new Error(`Bank ${bank.name} does not support PAR`);
  }
  
  // Import mTLS client
  const { createMTLSAgent, openBankingHeaders } = await import('./mTLSClient.js');
  
  // Generate PKCE challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // PAR request body (RFC 9126)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config_.clientId,
    redirect_uri: request.redirectUri || config_.redirectUri,
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  try {
    const agent = createMTLSAgent(bank.id);
    
    // mTLS-secured POST to PAR endpoint
    const response = await fetch(bank.parEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'ParticipantId': openBankingHeaders('', 1).ParticipantId,
        'x-v': '1',
        'x-fapi-interaction-id': randomUUID(),
      },
      body: params.toString(),
      // @ts-ignore - Node.js fetch supports agent
      agent,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PAR] Bank ${bank.name} returned ${response.status}: ${errorText}`);
      throw new Error(`PAR request failed: ${response.statusText}`);
    }
    
    const parResponse = await response.json();
    
    // PAR response contains request_uri (RFC 9126 §3)
    const requestUri = parResponse.request_uri;
    const expiresIn = parResponse.expires_in || 600; // Default 10 minutes
    
    if (!requestUri) {
      throw new Error('PAR response missing request_uri');
    }
    
    console.log(`[PAR] Success for ${bank.name}, request_uri expires in ${expiresIn}s`);
    
    // Authorization URL using request_uri (§9.5.1)
    const authorizationUrl = `${bank.authorizationEndpoint}?` +
      `client_id=${encodeURIComponent(config_.clientId)}&` +
      `request_uri=${encodeURIComponent(requestUri)}`;
    
    return {
      authorizationUrl,
      requestUri,
      state,
    };
  } catch (error) {
    console.error(`[PAR] Error for ${bank.name}:`, error);
    
    // Fallback to direct authorization if PAR fails
    console.warn(`[PAR] Falling back to direct authorization URL for ${bank.name}`);
    return createDirectConsent(bank, request, scopes);
  }
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
 * Per OAuth 2.0 Authorization Code Flow (RFC 6749) with PKCE (RFC 7636).
 * Uses mTLS with QWAC certificates per Namibian Open Banking Standards v1.0 §9.4, §9.5.1.
 * 
 * Token endpoint requirements (§9.5.1):
 * 1. Validates authorization code
 * 2. Verifies PKCE code_verifier against stored code_challenge
 * 3. Returns access_token (required), refresh_token (optional for long-term consent)
 * 4. Includes expires_in (seconds), token_type (Bearer), scope
 * 
 * @param request - Token exchange parameters
 * @returns Access and refresh tokens with expiration
 */
export async function exchangeCodeForTokens(request: TokenExchangeRequest): Promise<BankTokens> {
  const bank = getBankById(request.bankId);
  
  if (!bank) {
    throw new Error(`Bank not found: ${request.bankId}`);
  }
  
  if (!bank.tokenEndpoint) {
    throw new Error(`Bank ${bank.name} missing tokenEndpoint configuration`);
  }

  // Import mTLS client
  const { createMTLSAgent } = await import('./mTLSClient.js');
  
  // Build token request (RFC 6749 §4.1.3)
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: request.code,
    redirect_uri: request.redirectUri || config_.redirectUri,
    client_id: config_.clientId,
  });
  
  // Include client_secret if configured (confidential client)
  if (config_.clientSecret) {
    params.append('client_secret', config_.clientSecret);
  }
  
  // Include PKCE code_verifier (RFC 7636 §4.5)
  if (request.codeVerifier) {
    params.append('code_verifier', request.codeVerifier);
  }

  try {
    const agent = createMTLSAgent(bank.id);
    
    console.log(`[Token Exchange] Requesting tokens from ${bank.name}`);
    console.log(`[Token Exchange] Endpoint: ${bank.tokenEndpoint}`);
    console.log(`[Token Exchange] mTLS: ${agent ? 'enabled' : 'disabled (fallback)'}`);
    
    const response = await fetch(bank.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'ParticipantId': config_.participantId || 'API000001',
        'x-v': '1',
        'x-fapi-interaction-id': randomUUID(),
      },
      body: params.toString(),
      // @ts-ignore - Node.js fetch supports agent
      agent,
    });
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`[Token Exchange] Failed: ${response.status}`, errorBody);
      
      // OAuth error response (RFC 6749 §5.2)
      if (errorBody.error) {
        throw new Error(
          `Token exchange failed: ${errorBody.error_description || errorBody.error}`
        );
      }
      
      throw new Error(`Token exchange failed: ${response.statusText} (${response.status})`);
    }
    
    const tokenResponse = await response.json();
    
    // Validate required fields (RFC 6749 §5.1)
    if (!tokenResponse.access_token) {
      throw new Error('Token response missing access_token');
    }
    
    // Calculate expiration timestamp
    const expiresIn = tokenResponse.expires_in || 3600; // Default 1 hour
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    console.log(`[Token Exchange] Success! Token expires in ${expiresIn}s`);
    console.log(`[Token Exchange] Scope: ${tokenResponse.scope || config_.scopes.join(' ')}`);
    console.log(`[Token Exchange] Refresh token: ${tokenResponse.refresh_token ? 'provided' : 'not provided'}`);
    
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      scope: tokenResponse.scope || config_.scopes.join(' '),
      tokenType: tokenResponse.token_type || 'Bearer',
    };
  } catch (error) {
    console.error(`[Token Exchange] Error for ${bank.name}:`, error);
    throw error;
  }
}

/**
 * Refresh access token using refresh_token grant.
 * Per RFC 6749 §6 and Namibian Open Banking Standards v1.0 §9.5.1.
 * Used for long-term consent (max 180 days per §9.5.3).
 * 
 * @param bankId - Bank identifier
 * @param refreshToken - Refresh token from initial authorization
 * @returns New access token with updated expiration
 */
export async function refreshToken(bankId: string, refreshToken: string): Promise<BankTokens> {
  const bank = getBankById(bankId);
  
  if (!bank) {
    throw new Error(`Bank not found: ${bankId}`);
  }
  
  if (!bank.tokenEndpoint) {
    throw new Error(`Bank ${bank.name} missing tokenEndpoint configuration`);
  }

  // Import mTLS client
  const { createMTLSAgent } = await import('./mTLSClient.js');
  
  // Build refresh token request (RFC 6749 §6)
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config_.clientId,
  });
  
  // Include client_secret if configured
  if (config_.clientSecret) {
    params.append('client_secret', config_.clientSecret);
  }

  try {
    const agent = createMTLSAgent(bank.id);
    
    console.log(`[Token Refresh] Refreshing token for ${bank.name}`);
    
    const response = await fetch(bank.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'ParticipantId': config_.participantId || 'API000001',
        'x-v': '1',
        'x-fapi-interaction-id': randomUUID(),
      },
      body: params.toString(),
      // @ts-ignore - Node.js fetch supports agent
      agent,
    });
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`[Token Refresh] Failed: ${response.status}`, errorBody);
      
      // Handle invalid_grant (token expired/revoked)
      if (errorBody.error === 'invalid_grant') {
        throw new Error('Refresh token expired or revoked. User must re-authenticate.');
      }
      
      throw new Error(`Token refresh failed: ${errorBody.error_description || response.statusText}`);
    }
    
    const tokenResponse = await response.json();
    
    if (!tokenResponse.access_token) {
      throw new Error('Token refresh response missing access_token');
    }
    
    const expiresIn = tokenResponse.expires_in || 3600;
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    console.log(`[Token Refresh] Success! New token expires in ${expiresIn}s`);
    
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || refreshToken, // Keep old if not provided
      expiresAt,
      scope: tokenResponse.scope || config_.scopes.join(' '),
      tokenType: tokenResponse.token_type || 'Bearer',
    };
  } catch (error) {
    console.error(`[Token Refresh] Error for ${bank.name}:`, error);
    throw error;
  }
}

// ============================================================================
// Account Access
// ============================================================================

/**
 * Get linked accounts for a user from Open Banking connections.
 */
export async function getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
  try {
    const { sql } = await import("../lib/db.js");
    
    const accounts = await sql`
      SELECT id, bank_id, account_id, account_name, account_type, 
             currency, account_number_masked, is_active, last_synced_at
      FROM open_banking_accounts
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY created_at DESC
    `;
    
    return accounts.map(a => ({
      id: a.id,
      bankId: a.bank_id,
      accountId: a.account_id,
      accountName: a.account_name || 'Account',
      accountType: a.account_type || 'unknown',
      currency: a.currency || 'NAD',
      balance: undefined // Would be fetched from bank API
    }));
  } catch (error) {
    console.error('Error fetching linked accounts:', error);
    return [];
  }
}

/**
 * Get account balance from Data Provider (bank) API.
 * Per Namibian Open Banking Standards v1.0 §9.2.3 (Account Balance).
 * 
 * API endpoint: GET /bon/v1/banking/accounts/{accountId}/balance
 * 
 * Response includes (§9.2.3):
 * - currentBalance: Balance including pending transactions
 * - availableBalance: Balance available for withdrawal
 * - creditLimit: Pre-approved credit amount (optional)
 * - amortisedLimit: Limit for amortised payments (optional)
 * - currency: ISO 4217 currency code (NAD)
 * 
 * @param userId - User identifier (to validate token ownership)
 * @param bankId - Bank identifier
 * @param accountId - Unique account identifier from bank
 * @returns Account balance details
 */
export async function getAccountBalance(
  userId: string,
  bankId: string,
  accountId: string
): Promise<{ available: string; current: string; currency: string }> {
  const bank = getBankById(bankId);
  
  if (!bank) {
    throw new Error(`Bank not found: ${bankId}`);
  }
  
  if (!bank.apiEndpoint) {
    throw new Error(`Bank ${bank.name} missing apiEndpoint configuration`);
  }

  // Verify we have valid tokens
  const tokens = await getValidTokens(userId, bankId);
  if (!tokens) {
    throw new Error("No valid tokens found. Please re-authenticate with the bank.");
  }

  // Import mTLS client
  const { makeSecureRequest } = await import('./mTLSClient.js');
  
  // Construct URL per §9.1.1: https://{provider}/bon/{version}/{industry}/{resource}
  const url = `${bank.apiEndpoint}/bon/v1/banking/accounts/${accountId}/balance`;
  
  try {
    console.log(`[Account Balance] Fetching for account ${accountId} from ${bank.name}`);
    
    // Make mTLS-secured GET request
    interface BalanceResponse {
      accountId: string;
      currentBalance: number;
      availableBalance: number;
      currency: string;
      creditLimit?: number;
      amortisedLimit?: number;
    }
    
    const response = await makeSecureRequest<BalanceResponse>(
      url,
      tokens.accessToken,
      bank.id,
      { method: 'GET' }
    );
    
    // Extract data from standard wrapper (§9.1.8)
    const balanceData = response.data;
    
    console.log(`[Account Balance] Success! Current: ${balanceData.currentBalance} ${balanceData.currency}`);
    
    return {
      available: balanceData.availableBalance.toString(),
      current: balanceData.currentBalance.toString(),
      currency: balanceData.currency,
    };
  } catch (error) {
    console.error(`[Account Balance] Error for ${bank.name}:`, error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        // Token expired - attempt refresh
        try {
          const refreshed = await refreshToken(bankId, tokens.refreshToken);
          // Update tokens in database
          await saveTokens(userId, bankId, refreshed);
          // Retry with new token
          return getAccountBalance(userId, bankId, accountId);
        } catch (refreshError) {
          throw new Error('Access token expired and refresh failed. Please re-authenticate.');
        }
      }
      if (error.message.includes('403')) {
        throw new Error('Insufficient permissions to access account balance.');
      }
      if (error.message.includes('404')) {
        throw new Error(`Account ${accountId} not found at ${bank.name}.`);
      }
    }
    
    throw error;
  }
}

/**
 * Get account transactions from Data Provider (bank) API.
 * Per Namibian Open Banking Standards v1.0 §9.2.4 (Transaction History).
 * 
 * API endpoint: GET /bon/v1/banking/accounts/{accountId}/transactions
 * 
 * Query parameters (§9.1.3):
 * - start: Start date (ISO 8601: YYYY-MM-DD)
 * - end: End date (ISO 8601: YYYY-MM-DD)
 * - page: Page number (1-indexed)
 * - page-size: Records per page (default 25, max 1000 per §9.1.3)
 * 
 * Response includes (§9.2.4):
 * - transactionId: Unique transaction ID
 * - accountId: Associated account
 * - amount: Transaction amount (negative for debits)
 * - currency: ISO 4217 currency code (NAD)
 * - description: Merchant/transaction description
 * - postingDateTime: When transaction posted (ISO 8601)
 * - valueDateTime: Value date (when funds available)
 * - transactionType: DEBIT or CREDIT
 * - reference: Bank reference number
 * 
 * @param userId - User identifier (to validate token ownership)
 * @param bankId - Bank identifier
 * @param accountId - Unique account identifier from bank
 * @param fromDate - Start date filter (ISO 8601)
 * @param toDate - End date filter (ISO 8601)
 * @param page - Page number (1-indexed)
 * @param pageSize - Records per page (default 25, max 1000)
 * @returns Paginated transaction list
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
  const bank = getBankById(bankId);
  
  if (!bank) {
    throw new Error(`Bank not found: ${bankId}`);
  }
  
  if (!bank.apiEndpoint) {
    throw new Error(`Bank ${bank.name} missing apiEndpoint configuration`);
  }

  // Verify we have valid tokens
  const tokens = await getValidTokens(userId, bankId);
  if (!tokens) {
    throw new Error("No valid tokens found. Please re-authenticate with the bank.");
  }

  // Import mTLS client
  const { makeSecureRequest } = await import('./mTLSClient.js');
  
  // Build query parameters (§9.1.3)
  const params = new URLSearchParams();
  if (fromDate) params.append('start', fromDate);
  if (toDate) params.append('end', toDate);
  if (page) params.append('page', page.toString());
  params.append('page-size', (pageSize || 25).toString());
  
  // Construct URL per §9.1.1
  const url = `${bank.apiEndpoint}/bon/v1/banking/accounts/${accountId}/transactions?${params.toString()}`;
  
  try {
    console.log(`[Transactions] Fetching for account ${accountId} from ${bank.name}`);
    console.log(`[Transactions] Filters: ${fromDate || 'no start'} → ${toDate || 'no end'}, page ${page || 1}`);
    
    // Make mTLS-secured GET request
    interface TransactionResponse {
      transactions: Array<{
        transactionId: string;
        accountId: string;
        amount: number;
        currency: string;
        description: string;
        postingDateTime: string;
        valueDateTime: string;
        transactionType: 'DEBIT' | 'CREDIT';
        reference: string;
      }>;
      pagination?: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        pageSize: number;
      };
    }
    
    const response = await makeSecureRequest<TransactionResponse>(
      url,
      tokens.accessToken,
      bank.id,
      { method: 'GET' }
    );
    
    // Extract data from standard wrapper (§9.1.8)
    const data = response.data;
    
    // Transform to expected format
    const transactions = data.transactions.map(tx => ({
      id: tx.transactionId,
      date: tx.postingDateTime,
      amount: tx.amount.toString(),
      currency: tx.currency,
      description: tx.description,
      type: tx.transactionType.toLowerCase(),
      reference: tx.reference,
    }));
    
    const total = data.pagination?.totalRecords || transactions.length;
    const currentPage = data.pagination?.currentPage || page || 1;
    const currentPageSize = data.pagination?.pageSize || pageSize || 25;
    
    console.log(`[Transactions] Success! Retrieved ${transactions.length} transactions (page ${currentPage})`);
    
    return {
      transactions,
      total,
      page: currentPage,
      pageSize: currentPageSize,
    };
  } catch (error) {
    console.error(`[Transactions] Error for ${bank.name}:`, error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        // Token expired - attempt refresh
        try {
          const refreshed = await refreshToken(bankId, tokens.refreshToken);
          // Update tokens in database
          await saveTokens(userId, bankId, refreshed);
          // Retry with new token
          return getAccountTransactions(userId, bankId, accountId, fromDate, toDate, page, pageSize);
        } catch (refreshError) {
          throw new Error('Access token expired and refresh failed. Please re-authenticate.');
        }
      }
      if (error.message.includes('403')) {
        throw new Error('Insufficient permissions to access transactions.');
      }
      if (error.message.includes('404')) {
        throw new Error(`Account ${accountId} not found at ${bank.name}.`);
      }
    }
    
    throw error;
  }
}

// ============================================================================
// Database Persistence Functions
// ============================================================================

/**
 * Save OAuth tokens to database
 */
export async function saveTokens(
  userId: string,
  bankId: string,
  tokens: BankTokens,
  consentId?: string,
  accountIds?: string[]
): Promise<void> {
  const { sql } = await import("../lib/db.js");
  
  const expiresAt = new Date(tokens.expiresAt).toISOString();
  
  await sql`
    INSERT INTO oauth_bank_tokens (
      user_id, bank_id, access_token, refresh_token, 
      token_type, scope, expires_at, consent_id, account_ids
    )
    VALUES (
      ${userId}, ${bankId}, ${tokens.accessToken}, ${tokens.refreshToken || null},
      ${tokens.tokenType}, ${tokens.scope}, ${expiresAt}, ${consentId || null},
      ${JSON.stringify(accountIds || [])}
    )
    ON CONFLICT (user_id, bank_id)
    DO UPDATE SET
      access_token = ${tokens.accessToken},
      refresh_token = ${tokens.refreshToken || null},
      expires_at = ${expiresAt},
      scope = ${tokens.scope},
      updated_at = NOW()
  `;
}

/**
 * Get stored tokens for user and bank
 */
export async function getStoredTokens(userId: string, bankId: string): Promise<BankTokens | null> {
  try {
    const { sql } = await import("../lib/db.js");
    
    const tokens = await sql`
      SELECT access_token, refresh_token, token_type, scope, expires_at
      FROM oauth_bank_tokens
      WHERE user_id = ${userId} AND bank_id = ${bankId}
      LIMIT 1
    `;
    
    if (tokens.length === 0) {
      return null;
    }
    
    const token = tokens[0];
    
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(token.expires_at).getTime(),
      scope: token.scope,
      tokenType: token.token_type || 'Bearer'
    };
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return null;
  }
}

/**
 * Check if tokens are expired
 */
export function isTokenExpired(tokens: BankTokens): boolean {
  return Date.now() >= tokens.expiresAt;
}

/**
 * Get valid tokens (auto-refresh if expired)
 */
export async function getValidTokens(userId: string, bankId: string): Promise<BankTokens | null> {
  const tokens = await getStoredTokens(userId, bankId);
  
  if (!tokens) {
    return null;
  }
  
  // If expired and we have refresh token, refresh
  if (isTokenExpired(tokens) && tokens.refreshToken) {
    try {
      const newTokens = await refreshToken(bankId, tokens.refreshToken);
      await saveTokens(userId, bankId, newTokens);
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }
  
  return tokens;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateState(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Generate PKCE code verifier
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate PKCE code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = Buffer.from(digest).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
