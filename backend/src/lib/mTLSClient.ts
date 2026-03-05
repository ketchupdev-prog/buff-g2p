/**
 * mTLS client – Buffr G2P Backend.
 * Implements secure communication with Data Providers (banks) per Namibian Open Banking Standards v1.0.
 * All API requests use mTLS with QWAC certificates (§9.4).
 * Request headers follow §9.1.5: Authorization, x-v, ParticipantId, x-fapi-interaction-id.
 * Response structure follows §9.1.8: { data, links, meta }.
 * Mobile app does not perform mTLS; it calls Buffr backend over HTTPS.
 * Location: backend/src/lib/mTLSClient.ts
 */

import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { resolve } from 'path';

// ============================================================================
// Configuration
// ============================================================================

interface MTLSConfig {
  certPath: string;
  keyPath: string;
  caPath?: string;
  participantId: string;
  enabled: boolean;
}

/**
 * Get mTLS configuration from environment.
 * Certificates should be stored securely and loaded from file system.
 */
function getMTLSConfig(): MTLSConfig {
  const certPath = process.env.OPEN_BANKING_CERT_PATH || resolve(process.cwd(), 'certs/qwac-cert.pem');
  const keyPath = process.env.OPEN_BANKING_KEY_PATH || resolve(process.cwd(), 'certs/qwac-key.pem');
  const caPath = process.env.OPEN_BANKING_CA_PATH;
  const participantId = process.env.OPEN_BANKING_PARTICIPANT_ID || 'API000001';
  const enabled = process.env.OPEN_BANKING_MTLS_ENABLED !== 'false';
  
  return {
    certPath,
    keyPath,
    caPath,
    participantId,
    enabled,
  };
}

const config = getMTLSConfig();

// ============================================================================
// mTLS Agent Creation
// ============================================================================

/**
 * Create HTTPS agent with mTLS client certificates.
 * Uses QWAC (Qualified Website Authentication Certificate) per TS 119 495.
 * 
 * Production requirements:
 * - QWAC certificate with Participant ID in organizationIdentifier field
 * - Certificate includes roles (DP/TPP), NCA ID (NA-BON)
 * - Certificates issued by approved Certificate Authority
 * 
 * Development mode:
 * - If certificates not found, returns undefined (falls back to regular HTTPS)
 * - Logs warning about missing mTLS
 */
export function createMTLSAgent(bankId?: string): https.Agent | undefined {
  if (!config.enabled) {
    console.log('[mTLS] mTLS disabled via OPEN_BANKING_MTLS_ENABLED=false');
    return undefined;
  }
  
  // Check if certificates exist
  if (!existsSync(config.certPath) || !existsSync(config.keyPath)) {
    console.warn('[mTLS] QWAC certificates not found. mTLS disabled.');
    console.warn(`[mTLS] Expected cert: ${config.certPath}`);
    console.warn(`[mTLS] Expected key: ${config.keyPath}`);
    console.warn('[mTLS] To enable mTLS:');
    console.warn('[mTLS]   1. Obtain QWAC certificates from approved CA');
    console.warn('[mTLS]   2. Place cert.pem and key.pem in certs/ directory');
    console.warn('[mTLS]   3. Set OPEN_BANKING_CERT_PATH and OPEN_BANKING_KEY_PATH');
    return undefined;
  }
  
  try {
    const options: https.AgentOptions = {
      cert: readFileSync(config.certPath),
      key: readFileSync(config.keyPath),
      rejectUnauthorized: true, // Verify bank's certificate
    };
    
    // Load CA bundle if provided
    if (config.caPath && existsSync(config.caPath)) {
      options.ca = readFileSync(config.caPath);
    }
    
    console.log(`[mTLS] Created secure agent with QWAC for bank: ${bankId || 'default'}`);
    console.log(`[mTLS] Participant ID: ${config.participantId}`);
    
    return new https.Agent(options);
  } catch (error) {
    console.error('[mTLS] Failed to create mTLS agent:', error);
    throw new Error('Failed to initialize mTLS client. Check certificate configuration.');
  }
}

// ============================================================================
// Request Headers (Namibian Open Banking Standards §9.1.5)
// ============================================================================

/**
 * Generate Open Banking request headers per Namibian Standards v1.0 §9.1.5.
 * Required for every TPP → Data Provider request.
 * 
 * @param accessToken - OAuth 2.0 access token (Bearer)
 * @param endpointVersion - API endpoint version (default: 1)
 * @returns HTTP request headers
 */
export function openBankingHeaders(
  accessToken: string, 
  endpointVersion: number = 1
): Record<string, string> {
  return {
    // §9.1.5: Authorization header with Bearer token
    'Authorization': `Bearer ${accessToken}`,
    
    // §9.1.5: Content-Type for PUT/POST requests
    'Content-Type': 'application/json',
    
    // §9.1.5: API endpoint version (mandatory)
    'x-v': String(endpointVersion),
    
    // §9.1.5: TPP Participant ID (must match QWAC certificate)
    'ParticipantId': config.participantId,
    
    // §9.1.5: Unique interaction ID for tracing (recommended)
    'x-fapi-interaction-id': randomUUID(),
    
    // Standard headers
    'Accept': 'application/json',
    'User-Agent': 'Buffr-G2P/2.0 (Namibian-Open-Banking/1.0)',
  };
}

// ============================================================================
// HTTP Client with mTLS
// ============================================================================

/**
 * Make authenticated request to Data Provider API with mTLS.
 * Follows Namibian Open Banking Standards v1.0.
 * 
 * @param url - Full API endpoint URL (https://api.bank.na/bon/v1/banking/accounts)
 * @param accessToken - OAuth 2.0 access token
 * @param bankId - Bank identifier (for logging)
 * @param options - Additional fetch options
 * @returns Response data in standard format { data, links, meta }
 */
export async function makeSecureRequest<T>(
  url: string,
  accessToken: string,
  bankId: string,
  options: RequestInit = {}
): Promise<{ data: T; links?: Record<string, string>; meta?: Record<string, unknown> }> {
  const agent = createMTLSAgent(bankId);
  const headers = openBankingHeaders(accessToken);
  
  // Merge custom headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  const startTime = Date.now();
  
  try {
    console.log(`[Open Banking] → ${options.method || 'GET'} ${url}`);
    console.log(`[Open Banking] Participant ID: ${config.participantId}`);
    console.log(`[Open Banking] mTLS: ${agent ? 'enabled' : 'disabled (dev mode)'}`);
    
    const response = await fetch(url, {
      ...options,
      headers,
      // @ts-ignore - Node.js fetch supports agent
      agent,
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Open Banking] ← ${response.status} ${response.statusText} (${duration}ms)`);
    
    // Check response headers (§9.1.6)
    const responseParticipantId = response.headers.get('ParticipantId');
    const responseVersion = response.headers.get('x-v');
    
    if (responseParticipantId) {
      console.log(`[Open Banking] Data Provider Participant ID: ${responseParticipantId}`);
    }
    if (responseVersion) {
      console.log(`[Open Banking] Response API version: ${responseVersion}`);
    }
    
    // Handle errors (§9.1.8)
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      
      // Standards-compliant error format
      if (errorBody.errors && Array.isArray(errorBody.errors)) {
        const firstError = errorBody.errors[0];
        throw new Error(
          `Bank API error: ${firstError.title || firstError.code || response.statusText} (${response.status})`
        );
      }
      
      throw new Error(`Bank API error: ${response.statusText} (${response.status})`);
    }
    
    // Parse response (§9.1.8: must have { data, links?, meta? })
    const body = await response.json();
    
    // Validate response structure
    if (!body.data) {
      console.warn('[Open Banking] Response missing "data" field. Non-compliant with §9.1.8');
    }
    
    return body;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Open Banking] Request failed after ${duration}ms:`, error);
    throw error;
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  createMTLSAgent,
  openBankingHeaders,
  makeSecureRequest,
  getParticipantId: () => config.participantId,
  isMTLSEnabled: () => config.enabled && existsSync(config.certPath) && existsSync(config.keyPath),
};
