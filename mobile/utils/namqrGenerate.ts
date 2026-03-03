/**
 * NAMQR Code Generator - v5.0
 * Bank of Namibia - April 2025
 * 
 * Generates NAMQR compliant QR code payloads using TLV format.
 * Reference: NAMQR Code Standards Version 5.0
 */

import { crc16ccitt } from './crc';
import {
  NAMQRGenerationOptions,
  NAMQRPaymentStreamType,
  NAMQRUseCase,
  NAMQRTipIndicator,
  NAMQRPointOfInitiation,
  NAMQRInitiationMode,
  NAMQRPurpose,
  NAMQRPaymentStream,
} from './namqr';

// Get env values with fallbacks
const getEnv = (key: string, fallback: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || fallback;
  }
  // For React Native/Expo
  if (typeof window !== 'undefined' && (window as any).env) {
    return (window as any).env[key] || fallback;
  }
  return fallback;
};

const OPERATOR_ID = getEnv('EXPO_PUBLIC_NAMQR_OPERATOR_ID', 'na.com.namclear.namqr');
const DEFAULT_COUNTRY = getEnv('EXPO_PUBLIC_NAMQR_DEFAULT_COUNTRY_CODE', 'NA');
const DEFAULT_CURRENCY = getEnv('EXPO_PUBLIC_NAMQR_DEFAULT_CURRENCY', '516');
const DEFAULT_MCC = getEnv('EXPO_PUBLIC_NAMQR_DEFAULT_MCC', '0000');
const DEFAULT_EXPIRY_MINUTES = parseInt(getEnv('EXPO_PUBLIC_NAMQR_EXPIRY_MINUTES', '15'), 10);

// =============================================================================
// TLV Formatting
// =============================================================================

/**
 * Format a tag-length-value object as NAMQR string
 * Tag: 2 digits, Length: 2 digits (decimal), Value: variable
 */
function formatTLV(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

/**
 * Format additional data field (tag 62) sub-elements
 */
function formatAdditionalDataField(data: {
  billNumber?: string;
  mobileNumber?: string;
  storeLabel?: string;
  loyaltyNumber?: string;
  referenceLabel?: string;
  customerLabel?: string;
  terminalLabel?: string;
  shortDescription?: string;
  additionalPayerDataRequest?: string;
  merchantTaxId?: string;
  payeeChannel?: string;
}): string {
  const elements: string[] = [];
  
  if (data.billNumber) elements.push(formatTLV('01', data.billNumber));
  if (data.mobileNumber) elements.push(formatTLV('02', data.mobileNumber));
  if (data.storeLabel) elements.push(formatTLV('03', data.storeLabel));
  if (data.loyaltyNumber) elements.push(formatTLV('04', data.loyaltyNumber));
  if (data.referenceLabel) elements.push(formatTLV('05', data.referenceLabel));
  if (data.customerLabel) elements.push(formatTLV('06', data.customerLabel));
  if (data.terminalLabel) elements.push(formatTLV('07', data.terminalLabel));
  if (data.shortDescription) elements.push(formatTLV('08', data.shortDescription));
  if (data.additionalPayerDataRequest) elements.push(formatTLV('09', data.additionalPayerDataRequest));
  if (data.merchantTaxId) elements.push(formatTLV('10', data.merchantTaxId));
  if (data.payeeChannel) elements.push(formatTLV('11', data.payeeChannel));
  
  return elements.join('');
}

/**
 * Format Unreserved Template 80 (Initiation Mode, Purpose)
 */
function formatUnreserved80(options: {
  paymentStream: NAMQRPaymentStreamType;
  useCase: NAMQRUseCase;
  isDynamic: boolean;
  purpose?: NAMQRPurpose;
  merchantType?: 'LARGE' | 'SMALL';
  merchantGenre?: 'ONLINE' | 'OFFLINE';
  merchantOnboardingType?: string;
  merchantBrand?: string;
  baseAmount?: string;
  baseCurrency?: string;
}): string {
  const elements: string[] = [];
  
  // Global ID
  const globalId = getPaymentStreamGlobalId(options.paymentStream);
  elements.push(formatTLV('00', globalId));
  
  // Initiation Mode
  const initiationMode = getInitiationMode(options.useCase, options.isDynamic);
  elements.push(formatTLV('01', initiationMode));
  
  // Purpose
  if (options.purpose) {
    elements.push(formatTLV('02', options.purpose));
  }
  
  // Merchant Type
  if (options.merchantType) {
    elements.push(formatTLV('03', options.merchantType));
  }
  
  // Merchant Genre
  if (options.merchantGenre) {
    elements.push(formatTLV('04', options.merchantGenre));
  }
  
  // Merchant Onboarding Type
  if (options.merchantOnboardingType) {
    elements.push(formatTLV('05', options.merchantOnboardingType));
  }
  
  // Merchant Brand
  if (options.merchantBrand) {
    elements.push(formatTLV('06', options.merchantBrand));
  }
  
  // Base Amount
  if (options.baseAmount) {
    elements.push(formatTLV('07', options.baseAmount));
  }
  
  // Base Currency
  if (options.baseCurrency) {
    elements.push(formatTLV('08', options.baseCurrency));
  }
  
  return formatTLV('80', elements.join(''));
}

/**
 * Format Unreserved Template 82 (Transaction Details)
 */
function formatUnreserved82(options: {
  expiryMinutes?: number;
  transactionId?: string;
}): string {
  const elements: string[] = [];
  
  // Global ID
  elements.push(formatTLV('00', OPERATOR_ID));
  
  // Transaction ID
  if (options.transactionId) {
    elements.push(formatTLV('01', options.transactionId));
  }
  
  // Expiry
  if (options.expiryMinutes) {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + options.expiryMinutes);
    const expiryStr = expiryDate.toISOString().replace(/[-:TZ]/g, '').substring(0, 14);
    elements.push(formatTLV('02', expiryStr));
  }
  
  return formatTLV('82', elements.join(''));
}

/**
 * Format Unreserved Template 84 (Split Payments)
 */
function formatUnreserved84(splitPayments?: Array<{ type: string; value: string }>): string {
  if (!splitPayments || splitPayments.length === 0) {
    return '';
  }
  
  const splitValues = splitPayments.map(sp => `${sp.type}:${sp.value}`).join('|');
  
  return formatTLV('84', formatTLV('00', OPERATOR_ID) + formatTLV('01', splitValues));
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get payment stream global ID
 */
function getPaymentStreamGlobalId(stream: NAMQRPaymentStreamType): string {
  switch (stream) {
    case 'NRTC': return NAMQRPaymentStream.NRTC;
    case 'ENCR': return NAMQRPaymentStream.ENCR;
    case 'ENDO': return NAMQRPaymentStream.ENDO;
    case 'IPP': return NAMQRPaymentStream.IPP;
    case 'POSD': return NAMQRPaymentStream.POSD;
    case 'POSC': return NAMQRPaymentStream.POSC;
    case 'ATM': return NAMQRPaymentStream.ATM;
    default: return NAMQRPaymentStream.IPP;
  }
}

/**
 * Get point of initiation method
 */
function getPointOfInitiation(useCase: NAMQRUseCase, isDynamic: boolean): NAMQRPointOfInitiation {
  switch (useCase) {
    case 'P2P_STATIC':
    case 'P2M_STATIC':
    case 'MERCHANT_PAYMENT':
      return isDynamic ? NAMQRPointOfInitiation.PAYEE_DYNAMIC : NAMQRPointOfInitiation.PAYEE_STATIC;
    case 'PAYER_PRESENTED_STATIC':
    case 'PAYER_PRESENTED_DYNAMIC':
      return isDynamic ? NAMQRPointOfInitiation.PAYER_DYNAMIC : NAMQRPointOfInitiation.PAYER_STATIC;
    default:
      return isDynamic ? NAMQRPointOfInitiation.PAYEE_DYNAMIC : NAMQRPointOfInitiation.PAYEE_STATIC;
  }
}

/**
 * Get initiation mode for template 80
 */
function getInitiationMode(useCase: NAMQRUseCase, isDynamic: boolean): NAMQRInitiationMode {
  switch (useCase) {
    case 'ATM_WITHDRAWAL':
      return NAMQRInitiationMode.ATM_QR;
    case 'MANDATE':
      return isDynamic ? NAMQRInitiationMode.DYNAMIC_SECURE_QR_MANDATE_OFFLINE : NAMQRInitiationMode.STATIC_SECURE_MANDATE_OFFLINE;
    case 'VOUCHER':
      return isDynamic ? NAMQRInitiationMode.ONLINE_DYNAMIC_QR : NAMQRInitiationMode.ONLINE_STATIC_QR;
    default:
      return isDynamic ? NAMQRInitiationMode.DYNAMIC_QR_OFFLINE : NAMQRInitiationMode.STATIC_OFFLINE;
  }
}

/**
 * Generate unique token vault ID (for demo/development)
 * In production, this should come from Token Vault API
 */
function generateTokenVaultId(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${timestamp}${random}`.slice(-14);
}

/**
 * Generate transaction reference
 */
function generateTransactionRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
}

// =============================================================================
// Main NAMQR Generation Function
// =============================================================================

/**
 * Generate a NAMQR code string from options
 * Returns complete NAMQR payload string ready for QR encoding
 */
export function generateNAMQR(options: NAMQRGenerationOptions): string {
  const {
    payeeName,
    payeeCity,
    countryCode = DEFAULT_COUNTRY,
    merchantCategoryCode = DEFAULT_MCC,
    paymentStream,
    globallyUniqueId,
    payeeIdentifier,
    payeePspId,
    amount,
    currency = DEFAULT_CURRENCY,
    reference,
    shortDescription,
    useCase,
    isDynamic,
    expiryMinutes = DEFAULT_EXPIRY_MINUTES,
    tipAmount,
    tipType,
    storeLabel,
    terminalLabel,
    billNumber,
    postalCode,
    merchantBrand,
    merchantType,
    merchantGenre,
    purpose,
    tokenVaultUniqueId,
    splitPayments,
  } = options;

  const dataObjects: string[] = [];

  // 00 - Payload Format Indicator (always first)
  dataObjects.push(formatTLV('00', '01'));

  // 01 - Point of Initiation Method
  const pointOfInit = getPointOfInitiation(useCase, isDynamic);
  dataObjects.push(formatTLV('01', pointOfInit));

  // Payee Account Information (02-16, 17, or 26)
  // Based on payment stream
  if (paymentStream === 'IPP') {
    // IPP uses tag 26 for full form alias
    const fullFormAlias = payeeIdentifier.includes('@') 
      ? payeeIdentifier 
      : `${payeeIdentifier}@${OPERATOR_ID}`;
    dataObjects.push(formatTLV('26', fullFormAlias));
  } else {
    // Other payment streams use tag 17
    const guId = globallyUniqueId || getPaymentStreamGlobalId(paymentStream);
    dataObjects.push(formatTLV('17', guId));
    if (payeePspId) {
      dataObjects.push(formatTLV('01', payeePspId)); // Payee PSP ID
    }
    dataObjects.push(formatTLV('02', payeeIdentifier)); // Payee Identifier
  }

  // 52 - Merchant Category Code
  dataObjects.push(formatTLV('52', merchantCategoryCode));

  // 53 - Transaction Currency (conditional - required for dynamic)
  if (isDynamic || amount) {
    dataObjects.push(formatTLV('53', currency));
  }

  // 54 - Transaction Amount (conditional - required for dynamic)
  if (isDynamic && amount) {
    dataObjects.push(formatTLV('54', amount));
  }

  // 55-57 - Tip/Convenience Fee (optional)
  if (tipAmount && tipType) {
    dataObjects.push(formatTLV('55', tipType));
    if (tipType === NAMQRTipIndicator.FIXED && tipAmount) {
      dataObjects.push(formatTLV('56', tipAmount));
    } else if (tipType === NAMQRTipIndicator.PERCENTAGE && tipAmount) {
      dataObjects.push(formatTLV('57', tipAmount));
    }
  }

  // 58 - Country Code
  dataObjects.push(formatTLV('58', countryCode));

  // 59 - Payee Name
  dataObjects.push(formatTLV('59', payeeName.substring(0, 25)));

  // 60 - Payee City
  dataObjects.push(formatTLV('60', payeeCity.substring(0, 15)));

  // 61 - Postal Code (optional)
  if (postalCode) {
    dataObjects.push(formatTLV('61', postalCode.substring(0, 10)));
  }

  // 62 - Additional Data Field Template (optional)
  const additionalData = {
    billNumber,
    storeLabel,
    terminalLabel,
    referenceLabel: reference,
    shortDescription,
  };
  const additionalDataStr = formatAdditionalDataField(additionalData);
  if (additionalDataStr) {
    dataObjects.push(formatTLV('62', additionalDataStr));
  }

  // 65 - Token Vault Unique Identifier
  const tvId = tokenVaultUniqueId || generateTokenVaultId();
  dataObjects.push(formatTLV('65', tvId));

  // 80 - Unreserved Template (Initiation Mode, Purpose)
  const unreserved80 = formatUnreserved80({
    paymentStream,
    useCase,
    isDynamic,
    purpose,
    merchantType,
    merchantGenre,
    merchantBrand,
    baseAmount: amount,
    baseCurrency: currency,
  });
  dataObjects.push(unreserved80);

  // 82 - Unreserved Template (Transaction Details)
  if (isDynamic) {
    const unreserved82 = formatUnreserved82({
      expiryMinutes,
      transactionId: reference || generateTransactionRef(),
    });
    dataObjects.push(unreserved82);
  }

  // 84 - Split Payments (optional)
  const unreserved84 = formatUnreserved84(splitPayments);
  if (unreserved84) {
    dataObjects.push(unreserved84);
  }

  // Join all data objects
  const payload = dataObjects.join('');

  // Calculate CRC
  const crcData = payload + formatTLV('63', '0000'); // Include tag 63 with placeholder
  const bytes = new TextEncoder().encode(crcData);
  const crcValue = crc16ccitt(bytes);
  const crcHex = crcValue.toString(16).toUpperCase().padStart(4, '0');

  // Add CRC as last element
  const finalPayload = payload + formatTLV('63', crcHex);

  return finalPayload;
}

/**
 * Generate a simple NAMQR for a given amount and payee
 * Simplified API for common use cases
 */
export function generateSimpleNAMQR(params: {
  payeeName: string;
  payeeIdentifier: string;
  amount?: string;
  description?: string;
  isDynamic?: boolean;
}): string {
  const {
    payeeName,
    payeeIdentifier,
    amount,
    description,
    isDynamic = !!amount,
  } = params;

  return generateNAMQR({
    payeeName,
    payeeCity: 'Windhoek', // Default city
    payeeIdentifier,
    amount,
    shortDescription: description,
    useCase: amount ? 'P2M_DYNAMIC' : 'P2M_STATIC',
    paymentStream: 'IPP',
    isDynamic,
    reference: description ? `REF${Date.now()}` : undefined,
  });
}

/**
 * Generate a merchant-presented NAMQR
 */
export function generateMerchantNAMQR(params: {
  merchantName: string;
  merchantId: string;
  amount?: string;
  description?: string;
  mcc?: string;
  isDynamic?: boolean;
}): string {
  const {
    merchantName,
    merchantId,
    amount,
    description,
    mcc = '0000',
    isDynamic = !!amount,
  } = params;

  return generateNAMQR({
    payeeName: merchantName,
    payeeCity: 'Windhoek',
    payeeIdentifier: merchantId,
    merchantCategoryCode: mcc,
    amount,
    shortDescription: description,
    useCase: 'MERCHANT_PAYMENT',
    paymentStream: 'IPP',
    isDynamic,
    reference: description ? `MER${Date.now()}` : undefined,
  });
}

/**
 * Generate an ATM withdrawal NAMQR
 */
export function generateATMNAMQR(params: {
  atmId: string;
  amount: string;
  accountId: string;
}): string {
  const { atmId, amount, accountId } = params;

  return generateNAMQR({
    payeeName: 'ATM Withdrawal',
    payeeCity: 'Windhoek',
    payeeIdentifier: accountId,
    amount,
    useCase: 'ATM_WITHDRAWAL',
    paymentStream: 'ATM',
    isDynamic: true,
    merchantCategoryCode: '6013',
    reference: `ATM${atmId}${Date.now()}`,
    shortDescription: 'ATM Cash Withdrawal',
  });
}

/**
 * Generate a voucher NAMQR
 */
export function generateVoucherNAMQR(params: {
  voucherCode: string;
  amount?: string;
  recipientName: string;
}): string {
  const { voucherCode, amount, recipientName } = params;

  return generateNAMQR({
    payeeName: recipientName,
    payeeCity: 'Windhoek',
    payeeIdentifier: voucherCode,
    amount,
    useCase: 'VOUCHER',
    paymentStream: 'IPP',
    isDynamic: !!amount,
    purpose: NAMQRPurpose.GIFTING,
    reference: `VOU${voucherCode}`,
    shortDescription: 'Digital Voucher',
  });
}

export default {
  generateNAMQR,
  generateSimpleNAMQR,
  generateMerchantNAMQR,
  generateATMNAMQR,
  generateVoucherNAMQR,
};
