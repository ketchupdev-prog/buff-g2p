/**
 * NAMQR Service - Unified API for mobile app
 * Bank of Namibia - April 2025
 * 
 * Provides a unified interface for NAMQR generation, parsing, and validation.
 * Supports offline mode with local generation when API is unavailable.
 */

import * as Crypto from 'expo-crypto';
import { validateNAMQRCRC } from '../utils/crc';
import { parseNAMQR, validateNAMQR, extractPaymentInfo } from '../utils/namqrParse';
import {
  generateNAMQR,
  generateSimpleNAMQR,
  generateMerchantNAMQR,
  generateATMNAMQR,
  generateVoucherNAMQR,
} from '../utils/namqrGenerate';
import {
  validateNAMQRWithTokenVault,
  generateTokenVaultId,
  invalidateTokenVaultId,
  checkTokenVaultHealth,
  getTokenVaultConfig,
} from '../services/tokenVault';
import {
  NAMQRGenerationOptions,
  NAMQRPaymentStreamType,
  NAMQRUseCase,
  NAMQRParsedResult,
  NAMQRValidationResult,
} from '../utils/namqr';

// Get API configuration
const getApiBaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  }
  // For React Native
  return 'http://localhost:3001'; // Default fallback
};

const API_BASE = getApiBaseUrl();

// =============================================================================
// Types
// =============================================================================

/**
 * Payment request from scanned NAMQR
 */
export interface PaymentRequest {
  amount?: string;
  payeeName: string;
  payeeIdentifier: string;
  reference?: string;
  description?: string;
  paymentStream?: NAMQRPaymentStreamType;
  currency?: string;
  tokenVaultId?: string;
}

/**
 * Generate QR options
 */
export interface GenerateQRCodeOptions {
  payeeName: string;
  payeeIdentifier: string;
  amount?: string;
  description?: string;
  isDynamic?: boolean;
  paymentStream?: NAMQRPaymentStreamType;
  useCase?: NAMQRUseCase;
}

/**
 * Merchant QR options
 */
export interface MerchantQRCodeOptions {
  amount?: string;
  description?: string;
  isDynamic?: boolean;
  mcc?: string;
}

// =============================================================================
// Main Service Functions
// =============================================================================

/**
 * Scan and parse a NAMQR code
 * 
 * Steps:
 * 1. Parse the raw payload
 * 2. Validate CRC
 * 3. Extract payment information
 * 4. Optionally validate with Token Vault (if enabled)
 * 
 * @param payload - Raw NAMQR string from QR scan
 * @param validateWithVault - Whether to validate with Token Vault
 * @returns Parsed payment request
 */
export async function scanNAMQR(
  payload: string,
  validateWithVault: boolean = false
): Promise<{
  success: boolean;
  paymentRequest?: PaymentRequest;
  validation?: NAMQRValidationResult;
  error?: string;
}> {
  try {
    // First, do local validation
    const validation = validateNAMQR(payload);
    
    if (!validation.valid) {
      return {
        success: false,
        validation,
        error: validation.errors.join(', '),
      };
    }

    // Extract payment info
    const parsed = validation.parsedData;
    if (!parsed) {
      return {
        success: false,
        validation,
        error: 'Failed to parse NAMQR',
      };
    }

    // Build payment request
    const paymentRequest: PaymentRequest = {
      amount: parsed.amount,
      payeeName: parsed.payeeName || 'Unknown',
      payeeIdentifier: parsed.payeeIdentifier || '',
      reference: parsed.reference,
      description: parsed.shortDescription,
      paymentStream: parsed.paymentStream,
      currency: parsed.currency,
      tokenVaultId: parsed.tokenVaultUniqueId,
    };

    // Optionally validate with Token Vault
    if (validateWithVault && paymentRequest.tokenVaultId) {
      try {
        const vaultResult = await validateNAMQRWithTokenVault({
          tokenVaultUniqueId: paymentRequest.tokenVaultId,
          amount: paymentRequest.amount,
          payeeIdentifier: paymentRequest.payeeIdentifier,
        });

        if (!vaultResult.valid) {
          return {
            success: false,
            paymentRequest,
            validation,
            error: vaultResult.message || 'Token Vault validation failed',
          };
        }
      } catch (vaultError) {
        // Log but continue - local validation already passed
        console.warn('[NAMQR] Token Vault validation error:', vaultError);
      }
    }

    return {
      success: true,
      paymentRequest,
      validation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error parsing NAMQR',
    };
  }
}

/**
 * Generate a NAMQR for payment
 * 
 * Uses API if available, otherwise generates locally
 * 
 * @param options - Payment details
 * @returns Generated NAMQR string
 */
export async function generatePaymentNAMQR(
  options: GenerateQRCodeOptions
): Promise<{
  success: boolean;
  namqr?: string;
  tokenVaultId?: string;
  error?: string;
}> {
  const {
    payeeName,
    payeeIdentifier,
    amount,
    description,
    isDynamic = !!amount,
    paymentStream = 'IPP',
    useCase = amount ? 'P2M_DYNAMIC' : 'P2M_STATIC',
  } = options;

  // Try API first if available
  try {
    const response = await fetch(`${API_BASE}/api/v1/mobile/namqr/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payeeName,
        payeeIdentifier,
        amount,
        description,
        paymentStream,
        isDynamic,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        namqr: data.namqr,
        tokenVaultId: data.tokenVaultId,
      };
    }
  } catch (error) {
    // Fall through to local generation
    console.warn('[NAMQR] API unavailable, using local generation');
  }

  // Fallback to local generation
  try {
    const namqr = generateSimpleNAMQR({
      payeeName,
      payeeIdentifier,
      amount,
      description,
      isDynamic,
    });

    return {
      success: true,
      namqr,
      tokenVaultId: undefined, // Generated locally without Token Vault
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate NAMQR',
    };
  }
}

/**
 * Generate a merchant-presented NAMQR
 * 
 * For merchants to display for customer scanning
 * 
 * @param options - Merchant QR options
 * @returns Generated NAMQR string
 */
export async function generateMerchantQR(
  options: MerchantQRCodeOptions
): Promise<{
  success: boolean;
  namqr?: string;
  merchantName?: string;
  error?: string;
}> {
  const { amount, description, isDynamic = !!amount, mcc } = options;

  // Try API first
  try {
    const response = await fetch(`${API_BASE}/api/v1/mobile/namqr/merchant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        description,
        isDynamic,
        mcc,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        namqr: data.namqr,
        merchantName: data.merchantName,
      };
    }
  } catch (error) {
    console.warn('[NAMQR] API unavailable, using local generation');
  }

  // Fallback to local generation
  try {
    const merchantId = `merchant_${Date.now()}`; // In production, use actual merchant ID
    const namqr = generateMerchantNAMQR({
      merchantName: 'BUFFR FINANCIAL SERVICES CC',
      merchantId,
      amount,
      description,
      mcc,
      isDynamic,
    });

    return {
      success: true,
      namqr,
      merchantName: 'BUFFR FINANCIAL SERVICES CC',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate merchant QR',
    };
  }
}

/**
 * Validate an existing NAMQR without making payment
 * 
 * @param payload - NAMQR string
 * @returns Validation result
 */
export function validatePaymentNAMQR(payload: string): NAMQRValidationResult {
  return validateNAMQR(payload);
}

/**
 * Extract payment information from NAMQR without full validation
 * 
 * @param payload - NAMQR string
 * @returns Extracted payment info
 */
export function extractNAMQRInfo(payload: string) {
  return extractPaymentInfo(payload);
}

/**
 * Check if NAMQR has expired
 * 
 * @param payload - NAMQR string
 * @returns True if expired
 */
export function isNAMQRExpired(payload: string): boolean {
  const parsed = parseNAMQR(payload);
  if (!parsed.expiry) return false;
  
  try {
    const expiryStr = parsed.expiry;
    const expiryDate = new Date(
      parseInt(expiryStr.substring(0, 4), 10),
      parseInt(expiryStr.substring(4, 6), 10) - 1,
      parseInt(expiryStr.substring(6, 8), 10),
      parseInt(expiryStr.substring(8, 10), 10),
      parseInt(expiryStr.substring(10, 12), 10),
      parseInt(expiryStr.substring(12, 14), 10)
    );
    return expiryDate < new Date();
  } catch {
    return false;
  }
}

/**
 * Check if NAMQR is dynamic (has amount)
 * 
 * @param payload - NAMQR string
 * @returns True if dynamic
 */
export function isDynamicQR(payload: string): boolean {
  const parsed = parseNAMQR(payload);
  return !!parsed.amount;
}

/**
 * Get Token Vault status
 */
export async function getTokenVaultStatus() {
  const config = getTokenVaultConfig();
  
  if (!config.enabled) {
    // Token Vault must be enabled in production
    return {
      available: false,
      mode: 'disabled',
      message: 'Token Vault is not configured. Please set TOKEN_VAULT_ENABLED=true in production.',
    };
  }

  const health = await checkTokenVaultHealth();
  
  return {
    available: health.available,
    latency: health.latency,
    mode: 'enabled',
    url: config.url,
  };
}

/**
 * Invalidate Token Vault after successful payment
 * 
 * @param tokenVaultId - Token Vault ID to invalidate
 */
export async function completePayment(tokenVaultId?: string) {
  if (!tokenVaultId) {
    return { success: true, message: 'No Token Vault ID to invalidate' };
  }

  try {
    return await invalidateTokenVaultId(tokenVaultId);
  } catch (error) {
    // Log but don't fail the payment
    console.warn('[NAMQR] Failed to invalidate token:', error);
    return { success: false, message: 'Failed to invalidate token' };
  }
}

export default {
  scanNAMQR,
  generatePaymentNAMQR,
  generateMerchantQR,
  validatePaymentNAMQR,
  extractNAMQRInfo,
  isNAMQRExpired,
  isDynamicQR,
  getTokenVaultStatus,
  completePayment,
};
