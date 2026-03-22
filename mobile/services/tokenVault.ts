/**
 * Token Vault Service - NAMQR v5.0
 * Bank of Namibia - April 2025
 * 
 * Handles communication with Token Vault for NAMQR validation.
 * Reference: NAMQR Code Standards Version 5.0
 */

// Get env values with fallbacks
const getEnv = (key: string, fallback: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || fallback;
  }
  if (typeof window !== 'undefined' && (window as any).env) {
    return (window as any).env[key] || fallback;
  }
  return fallback;
};

const getEnvBool = (key: string, fallback: boolean): boolean => {
  const val = getEnv(key, '');
  if (!val) return fallback;
  return val.toLowerCase() === 'true';
};

const TOKEN_VAULT_URL = getEnv('EXPO_PUBLIC_TOKEN_VAULT_URL', 'https://tokenvault.na.namclear.na');
const TOKEN_VAULT_ENABLED = getEnvBool('EXPO_PUBLIC_TOKEN_VAULT_ENABLED', false);
const TIMEOUT_MS = parseInt(getEnv('EXPO_PUBLIC_TOKEN_VAULT_TIMEOUT', '5000'), 10);

// =============================================================================
// Types
// =============================================================================

/**
 * Token Vault API Request
 */
export interface TokenVaultValidateRequest {
  tokenVaultUniqueId: string;
  merchantId?: string;
  amount?: string;
  currency?: string;
  payeeIdentifier?: string;
  payerIdentifier?: string;
  transactionRef?: string;
}

/**
 * Token Vault API Response
 */
export interface TokenVaultValidateResponse {
  success: boolean;
  valid: boolean;
  message?: string;
  payeeName?: string;
  payeeAccount?: string;
  merchantId?: string;
  amount?: string;
  currency?: string;
  expiry?: string;
  transactionRef?: string;
  errorCode?: string;
}

/**
 * Token Vault Generate Request
 */
export interface TokenVaultGenerateRequest {
  paymentStream: string;
  payeeIdentifier: string;
  payeePspId?: string;
  amount?: string;
  currency?: string;
  expiryMinutes?: number;
  additionalData?: Record<string, string>;
}

/**
 * Token Vault Generate Response
 */
export interface TokenVaultGenerateResponse {
  success: boolean;
  tokenVaultUniqueId?: string;
  expiry?: string;
  message?: string;
  errorCode?: string;
}

/**
 * Token Vault Error
 */
export class TokenVaultError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'UNKNOWN', statusCode: number = 500) {
    super(message);
    this.name = 'TokenVaultError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Validate a NAMQR with the Token Vault
 * 
 * The Token Vault validates that:
 * - The Token Vault Unique ID exists
 * - The parameters match what was stored
 * - The QR code has not expired
 * 
 * @param request - Validation request parameters
 * @returns Validation result from Token Vault
 */
export async function validateNAMQRWithTokenVault(
  request: TokenVaultValidateRequest
): Promise<TokenVaultValidateResponse> {
  if (!TOKEN_VAULT_ENABLED) {
    // Token Vault is required for production - throw error if not configured
    console.error('[TokenVault] TOKEN_VAULT_ENABLED is false - Token Vault is required');
    throw new Error('Token Vault is not configured. Please set TOKEN_VAULT_ENABLED=true in production.');
  }

  const url = `${TOKEN_VAULT_URL}/api/v1/namqr/validate`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenVaultError(
        errorData.message || `Token Vault validation failed: ${response.status}`,
        errorData.code || 'VALIDATION_FAILED',
        response.status
      );
    }

    const data = await response.json();
    return {
      success: true,
      valid: data.valid ?? true,
      message: data.message,
      payeeName: data.payeeName,
      payeeAccount: data.payeeAccount,
      merchantId: data.merchantId,
      amount: data.amount,
      currency: data.currency,
      expiry: data.expiry,
      transactionRef: data.transactionRef,
      errorCode: data.errorCode,
    };
  } catch (error) {
    if (error instanceof TokenVaultError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TokenVaultError(
        'Token Vault validation timed out',
        'TIMEOUT',
        408
      );
    }
    throw new TokenVaultError(
      error instanceof Error ? error.message : 'Unknown Token Vault error',
      'NETWORK_ERROR',
      500
    );
  }
}

/**
 * Generate a Token Vault Unique ID for a NAMQR
 * 
 * This is called when generating a dynamic NAMQR to store
 * the payment parameters in the Token Vault.
 * 
 * @param request - Generation request parameters
 * @returns Token Vault Unique ID and expiry
 */
export async function generateTokenVaultId(
  request: TokenVaultGenerateRequest
): Promise<TokenVaultGenerateResponse> {
  if (!TOKEN_VAULT_ENABLED) {
    // Token Vault is required for production - throw error if not configured
    console.error('[TokenVault] TOKEN_VAULT_ENABLED is false - Token Vault is required');
    throw new Error('Token Vault is not configured. Please set TOKEN_VAULT_ENABLED=true in production.');
  }

  const url = `${TOKEN_VAULT_URL}/api/v1/namqr/generate`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenVaultError(
        errorData.message || `Token Vault generation failed: ${response.status}`,
        errorData.code || 'GENERATION_FAILED',
        response.status
      );
    }

    const data = await response.json();
    return {
      success: true,
      tokenVaultUniqueId: data.tokenVaultUniqueId,
      expiry: data.expiry,
      message: data.message,
      errorCode: data.errorCode,
    };
  } catch (error) {
    if (error instanceof TokenVaultError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TokenVaultError(
        'Token Vault generation timed out',
        'TIMEOUT',
        408
      );
    }
    throw new TokenVaultError(
      error instanceof Error ? error.message : 'Unknown Token Vault error',
      'NETWORK_ERROR',
      500
    );
  }
}

/**
 * Invalidate a Token Vault Unique ID (after successful payment)
 * 
 * Called after a successful transaction to invalidate the
 * Token Vault entry (prevents replay attacks).
 * 
 * @param tokenVaultUniqueId - The ID to invalidate
 * @returns Result of invalidation
 */
export async function invalidateTokenVaultId(
  tokenVaultUniqueId: string
): Promise<{ success: boolean; message?: string }> {
  if (!TOKEN_VAULT_ENABLED) {
    // Token Vault is required for production - throw error if not configured
    console.error('[TokenVault] TOKEN_VAULT_ENABLED is false - Token Vault is required');
    throw new Error('Token Vault is not configured. Please set TOKEN_VAULT_ENABLED=true in production.');
  }

  const url = `${TOKEN_VAULT_URL}/api/v1/namqr/invalidate/${tokenVaultUniqueId}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TokenVaultError(
        errorData.message || `Token Vault invalidation failed: ${response.status}`,
        errorData.code || 'INVALIDATION_FAILED',
        response.status
      );
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    if (error instanceof TokenVaultError) {
      throw error;
    }
    // Log but don't throw for invalidation failures
    console.error('[TokenVault] Invalidation error:', error);
    return { success: false, message: 'Failed to invalidate token' };
  }
}

/**
 * Check if Token Vault is available/healthy
 * 
 * @returns Health status
 */
export async function checkTokenVaultHealth(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  if (!TOKEN_VAULT_ENABLED) {
    return { available: true };
  }

  const url = `${TOKEN_VAULT_URL}/health`;
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    return {
      available: response.ok,
      latency,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Token Vault configuration status
 */
export function getTokenVaultConfig() {
  return {
    enabled: TOKEN_VAULT_ENABLED,
    url: TOKEN_VAULT_URL,
    timeout: TIMEOUT_MS,
  };
}

export default {
  validateNAMQRWithTokenVault,
  generateTokenVaultId,
  invalidateTokenVaultId,
  checkTokenVaultHealth,
  getTokenVaultConfig,
  TokenVaultError,
};
