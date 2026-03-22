/**
 * NAMQR Parser and Validator - v5.0
 * Bank of Namibia - April 2025
 * 
 * Parses and validates NAMQR compliant QR code payloads.
 * Reference: NAMQR Code Standards Version 5.0
 */

import {
  NAMQRParsedResult,
  NAMQRValidationResult,
  NAMQRPaymentStreamType,
  NAMQRUseCase,
  NAMQRPointOfInitiation,
  NAMQRPaymentStream,
  NAMQRTipIndicator,
} from './namqr';

// Import CRC validation from existing crc.ts
import { validateNAMQRCRC } from './crc';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_COUNTRY = 'NA';
const DEFAULT_CURRENCY = '516';

// =============================================================================
// TLV Parsing
// =============================================================================

/**
 * Parse a TLV string into tag, length, and value
 */
interface TLVResult {
  tag: string;
  length: number;
  value: string;
  raw: string;
}

function parseTLV(input: string, startIndex: number): TLVResult | null {
  if (startIndex + 4 > input.length) {
    return null;
  }

  const tag = input.substring(startIndex, startIndex + 2);
  const lengthStr = input.substring(startIndex + 2, startIndex + 4);
  const length = parseInt(lengthStr, 10);

  if (isNaN(length) || length < 0 || startIndex + 4 + length > input.length) {
    return null;
  }

  const value = input.substring(startIndex + 4, startIndex + 4 + length);
  const raw = input.substring(startIndex, startIndex + 4 + length);

  return { tag, length, value, raw };
}

/**
 * Parse all TLV objects from a NAMQR payload
 */
function parseAllTLV(input: string): TLVResult[] {
  const results: TLVResult[] = [];
  let index = 0;

  while (index < input.length) {
    const result = parseTLV(input, index);
    if (!result) {
      break;
    }
    results.push(result);
    index += result.raw.length;
  }

  return results;
}

/**
 * Parse additional data field template (tag 62)
 */
function parseAdditionalDataField(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  const subObjects = parseAllTLV(value);
  
  for (const obj of subObjects) {
    switch (obj.tag) {
      case '01': result.billNumber = obj.value; break;
      case '02': result.mobileNumber = obj.value; break;
      case '03': result.storeLabel = obj.value; break;
      case '04': result.loyaltyNumber = obj.value; break;
      case '05': result.referenceLabel = obj.value; break;
      case '06': result.customerLabel = obj.value; break;
      case '07': result.terminalLabel = obj.value; break;
      case '08': result.shortDescription = obj.value; break;
      case '09': result.additionalPayerDataRequest = obj.value; break;
      case '10': result.merchantTaxId = obj.value; break;
      case '11': result.payeeChannel = obj.value; break;
    }
  }
  
  return result;
}

/**
 * Parse Unreserved Template 80
 */
function parseUnreserved80(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  const subObjects = parseAllTLV(value);
  
  for (const obj of subObjects) {
    switch (obj.tag) {
      case '00': result.globalId = obj.value; break;
      case '01': result.initiationMode = obj.value; break;
      case '02': result.purpose = obj.value; break;
      case '03': result.merchantType = obj.value; break;
      case '04': result.merchantGenre = obj.value; break;
      case '05': result.merchantOnboardingType = obj.value; break;
      case '06': result.merchantBrand = obj.value; break;
      case '07': result.baseAmount = obj.value; break;
      case '08': result.baseCurrency = obj.value; break;
    }
  }
  
  return result;
}

/**
 * Parse Unreserved Template 82
 */
function parseUnreserved82(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  const subObjects = parseAllTLV(value);
  
  for (const obj of subObjects) {
    switch (obj.tag) {
      case '00': result.globalId = obj.value; break;
      case '01': result.transactionId = obj.value; break;
      case '02': result.expiry = obj.value; break;
      case '03': result.creationTimestamp = obj.value; break;
      case '04': result.tier = obj.value; break;
      case '05': result.transactionType = obj.value; break;
    }
  }
  
  return result;
}

/**
 * Parse Payee Information Language Template (tag 64)
 */
function parsePayeeInfoLanguage(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  const subObjects = parseAllTLV(value);
  
  for (const obj of subObjects) {
    switch (obj.tag) {
      case '00': result.languagePreference = obj.value; break;
      case '01': result.payeeNameAlt = obj.value; break;
      case '02': result.payeeCityAlt = obj.value; break;
    }
  }
  
  return result;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine payment stream from global ID
 */
function getPaymentStreamFromGlobalId(globalId: string): NAMQRPaymentStreamType | undefined {
  if (!globalId) return undefined;
  
  if (globalId.includes('nrtc')) return 'NRTC';
  if (globalId.includes('encr')) return 'ENCR';
  if (globalId.includes('endo')) return 'ENDO';
  if (globalId.includes('.ipp.') || globalId === 'na.com.operator.ipp') return 'IPP';
  if (globalId.includes('posd')) return 'POSD';
  if (globalId.includes('posc')) return 'POSC';
  if (globalId.includes('atm')) return 'ATM';
  
  return undefined;
}

/**
 * Determine use case from point of initiation
 */
function getUseCaseFromPointOfInitiation(
  pointOfInit: string,
  amount?: string
): NAMQRUseCase {
  switch (pointOfInit) {
    case NAMQRPointOfInitiation.PAYEE_STATIC:
      return amount ? 'P2M_STATIC' : 'P2P_STATIC';
    case NAMQRPointOfInitiation.PAYEE_DYNAMIC:
      return amount ? 'P2M_DYNAMIC' : 'P2P_DYNAMIC';
    case NAMQRPointOfInitiation.PAYER_STATIC:
      return 'PAYER_PRESENTED_STATIC';
    case NAMQRPointOfInitiation.PAYER_DYNAMIC:
      return 'PAYER_PRESENTED_DYNAMIC';
    default:
      return 'P2M_DYNAMIC';
  }
}

// =============================================================================
// Main Parser Function
// =============================================================================

/**
 * Parse a NAMQR payload string into structured data
 */
export function parseNAMQR(payload: string): NAMQRParsedResult {
  // Validate CRC first
  const crcValid = validateNAMQRCRC(payload);
  
  if (!crcValid) {
    return {
      valid: false,
      payload,
      error: 'CRC validation failed',
    };
  }

  try {
    const tlvObjects = parseAllTLV(payload);
    
    // Initialize result
    const result: NAMQRParsedResult = {
      valid: true,
      payload,
      crcValid: true,
    };

    // Process each TLV object
    for (const obj of tlvObjects) {
      switch (obj.tag) {
        case '00': // Payload Format Indicator
          result.formatIndicator = obj.value;
          break;

        case '01': // Point of Initiation Method
          result.pointOfInitiation = obj.value;
          break;

        case '02': // Payee Account (Visa, etc.)
        case '03':
        case '04':
        case '05':
        case '06':
        case '07':
        case '08':
        case '09':
        case '10':
        case '11':
        case '12':
        case '13':
        case '14':
        case '15':
        case '16':
          // Store payee identifier from first account tag found
          if (!result.payeeIdentifier) {
            result.payeeIdentifier = obj.value;
          }
          break;

        case '17': // NRTC/EnCR Globally Unique Identifier
          result.paymentStream = getPaymentStreamFromGlobalId(obj.value);
          if (!result.payeeIdentifier) {
            // Try to get from subsequent tags
          }
          break;

        case '26': // IPP Payee Full Form Alias
          result.payeeIdentifier = obj.value;
          result.paymentStream = 'IPP';
          break;

        case '52': // Merchant Category Code
          result.merchantCategoryCode = obj.value;
          break;

        case '53': // Transaction Currency
          result.currency = obj.value;
          break;

        case '54': // Transaction Amount
          result.amount = obj.value;
          break;

        case '58': // Country Code
          result.countryCode = obj.value;
          break;

        case '59': // Payee Name
          result.payeeName = obj.value;
          break;

        case '60': // Payee City
          result.payeeCity = obj.value;
          break;

        case '65': // Token Vault Unique ID
          result.tokenVaultUniqueId = obj.value;
          break;

        case '62': // Additional Data Field
          const additionalData = parseAdditionalDataField(obj.value);
          if (additionalData.referenceLabel && !result.reference) {
            result.reference = additionalData.referenceLabel;
          }
          if (additionalData.shortDescription && !result.shortDescription) {
            result.shortDescription = additionalData.shortDescription;
          }
          break;

        case '80': // Unreserved Template 80
          const data80 = parseUnreserved80(obj.value);
          if (data80.globalId) {
            result.paymentStream = getPaymentStreamFromGlobalId(data80.globalId) || result.paymentStream;
          }
          break;

        case '82': // Unreserved Template 82
          const data82 = parseUnreserved82(obj.value);
          if (data82.expiry) {
            result.expiry = data82.expiry;
          }
          if (data82.transactionId && !result.reference) {
            result.reference = data82.transactionId;
          }
          break;
      }
    }

    // Determine use case
    if (result.pointOfInitiation) {
      result.useCase = getUseCaseFromPointOfInitiation(
        result.pointOfInitiation,
        result.amount
      );
    }

    // Set defaults if not present
    if (!result.countryCode) {
      result.countryCode = DEFAULT_COUNTRY;
    }
    if (!result.currency) {
      result.currency = DEFAULT_CURRENCY;
    }

    return result;
  } catch (error) {
    return {
      valid: false,
      payload,
      error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate a NAMQR payload
 */
export function validateNAMQR(payload: string): NAMQRValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check payload exists and is string
  if (!payload || typeof payload !== 'string') {
    errors.push('NAMQR payload is required');
    return { valid: false, errors, warnings };
  }

  // Check minimum length
  if (payload.length < 10) {
    errors.push('NAMQR payload is too short');
    return { valid: false, errors, warnings };
  }

  // Check maximum length (512 chars per spec)
  if (payload.length > 512) {
    errors.push('NAMQR payload exceeds maximum length of 512 characters');
    return { valid: false, errors, warnings };
  }

  // Parse the payload
  const parsed = parseNAMQR(payload);

  if (!parsed.valid) {
    errors.push(parsed.error || 'Failed to parse NAMQR payload');
    return { valid: false, errors, warnings, parsedData: parsed };
  }

  // Validate required fields
  if (!parsed.formatIndicator) {
    errors.push('Missing Payload Format Indicator (tag 00)');
  }

  if (!parsed.pointOfInitiation) {
    errors.push('Missing Point of Initiation Method (tag 01)');
  }

  if (!parsed.merchantCategoryCode) {
    errors.push('Missing Merchant Category Code (tag 52)');
  }

  if (!parsed.countryCode) {
    errors.push('Missing Country Code (tag 58)');
  }

  if (!parsed.payeeName) {
    errors.push('Missing Payee Name (tag 59)');
  }

  if (!parsed.payeeCity) {
    errors.push('Missing Payee City (tag 60)');
  }

  if (!parsed.tokenVaultUniqueId) {
    warnings.push('Missing Token Vault Unique Identifier (tag 65) - required for dynamic QR');
  }

  // Validate CRC
  if (!parsed.crcValid) {
    errors.push('CRC validation failed');
  }

  // Validate amount format if present
  if (parsed.amount) {
    const amountRegex = /^\d+(\.\d{1,2})?$/;
    if (!amountRegex.test(parsed.amount)) {
      errors.push('Invalid transaction amount format');
    }
  }

  // Validate currency if present
  if (parsed.currency && parsed.currency !== '516') {
    warnings.push(`Non-NAD currency (${parsed.currency}) - ensure proper handling`);
  }

  // Validate country code
  if (parsed.countryCode && parsed.countryCode !== 'NA') {
    warnings.push(`Non-Namibian country code (${parsed.countryCode})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsedData: parsed,
  };
}

/**
 * Extract key payment information from NAMQR
 */
export function extractPaymentInfo(payload: string): {
  valid: boolean;
  amount?: string;
  payeeName?: string;
  reference?: string;
  payeeIdentifier?: string;
  paymentStream?: NAMQRPaymentStreamType;
  error?: string;
} {
  const parsed = parseNAMQR(payload);
  
  if (!parsed.valid) {
    return {
      valid: false,
      error: parsed.error,
    };
  }

  return {
    valid: true,
    amount: parsed.amount,
    payeeName: parsed.payeeName,
    reference: parsed.reference,
    payeeIdentifier: parsed.payeeIdentifier,
    paymentStream: parsed.paymentStream,
  };
}

/**
 * Check if NAMQR is dynamic (has amount)
 */
export function isDynamicNAMQR(payload: string): boolean {
  const parsed = parseNAMQR(payload);
  return !!parsed.amount;
}

/**
 * Check if NAMQR has expired
 */
export function isNAMQRExpired(payload: string): boolean {
  const parsed = parseNAMQR(payload);
  
  if (!parsed.expiry) {
    return false; // Static QR doesn't expire
  }

  try {
    // Parse expiry format: YYYYMMDDHHmmss
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

export default {
  parseNAMQR,
  validateNAMQR,
  extractPaymentInfo,
  isDynamicNAMQR,
  isNAMQRExpired,
};
