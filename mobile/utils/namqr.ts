/**
 * NAMQR Code Standards v5.0 - TypeScript Types and Interfaces
 * Bank of Namibia - April 2025
 * 
 * Comprehensive type definitions for all NAMQR payload data objects.
 * Reference: NAMQR Code Standards Version 5.0
 * 
 * Tags: 00-84, CRC (63)
 * Payment Streams: NRTC, EnCR, EnDO, IPP, POSD, POSC, ATM
 * Use Cases: P2P, P2M, P2G, ATM, Voucher, Mandate
 */

// =============================================================================
// NAMQR Constants
// =============================================================================

export const NAMQR_VERSION = '5.0';
export const NAMQR_OPERATOR_ID = 'na.com.namclear.namqr';
export const NAMQR_DEFAULT_COUNTRY = 'NA';
export const NAMQR_DEFAULT_CURRENCY = '516'; // NAD
export const NAMQR_MAX_PAYLOAD_LENGTH = 512;

// Point of Initiation Method (Tag 01)
export enum NAMQRPointOfInitiation {
  PAYEE_STATIC = '11',
  PAYEE_DYNAMIC = '12',
  PAYER_STATIC = '13',
  PAYER_DYNAMIC = '14',
}

// Purpose (Tag 02 in Unreserved Template 80)
export enum NAMQRPurpose {
  NAMFISA = '01',
  AMC = '02',
  TRAVEL = '03',
  HOSPITALITY = '04',
  HOSPITAL = '05',
  TELECOM = '06',
  INSURANCE = '07',
  EDUCATION = '08',
  GIFTING = '09',
  INTERNATIONAL = '11',
  METRO_ATM = '12',
  NON_METRO_ATM = '13',
  SI = '14',
  CORPORATE_DISBURSEMENT = '15',
  GOVERNMENT_VOUCHER = '18',
  PRIVATE_CORPORATE_VOUCHER = '19',
}

// Initiation Mode (Tag 01 in Unreserved Template 80)
export enum NAMQRInitiationMode {
  STATIC_OFFLINE = '01',
  STATIC_SECURE_OFFLINE = '02',
  STATIC_SECURE_MANDATE_OFFLINE = '03',
  DYNAMIC_QR_OFFLINE = '15',
  DYNAMIC_SECURE_QR_OFFLINE = '16',
  DYNAMIC_SECURE_QR_MANDATE_OFFLINE = '17',
  ATM_QR = '18',
  ONLINE_STATIC_QR = '19',
  ONLINE_STATIC_SECURE_QR = '20',
  ONLINE_STATIC_QR_MANDATE = '21',
  ONLINE_DYNAMIC_QR = '22',
  ONLINE_DYNAMIC_SECURE_QR = '23',
  ONLINE_DYNAMIC_SECURE_QR_MANDATE = '24',
}

// Merchant Category Codes (Tag 52)
export enum NAMQRMerchantCategory {
  GENERAL = '0000',
  GROCERY = '5411',
  RESTAURANT = '5812',
  PHARMACY = '5912',
  FUEL = '5541',
  UTILITIES = '4900',
  GOVERNMENT = '9400',
}

// Payment Stream Identifiers
export enum NAMQRPaymentStream {
  NRTC = 'na.com.namclear.nrtc',
  ENCR = 'na.com.namclear.encr',
  ENDO = 'na.com.namclear.endo',
  IPP = 'na.com.operator.ipp',
  POSD = 'na.com.namclear.posd',
  POSC = 'na.com.namclear.posc',
  ATM = 'na.com.namclear.atm',
}

// Tip/Convenience Indicator (Tag 55)
export enum NAMQRTipIndicator {
  PROMPT = '01',
  FIXED = '02',
  PERCENTAGE = '03',
}

// =============================================================================
// NAMQR Tag Definitions
// =============================================================================

/**
 * All NAMQR Tags as defined in v5.0 specification
 */
export const NAMQR_TAGS = {
  // Mandatory Tags
  PAYLOAD_FORMAT_INDICATOR: '00',
  POINT_OF_INITIATION: '01',
  MERCHANT_CATEGORY: '52',
  COUNTRY_CODE: '58',
  PAYEE_NAME: '59',
  PAYEE_CITY: '60',
  TOKEN_VAULT_UNIQUE_ID: '65',
  CRC: '63',
  
  // Payee Account Information (02-16)
  PAYEE_VISA_ACCOUNT: '02',
  PAYEE_VISA_INFO: '03',
  PAYEE_MASTERCARD_ACCOUNT: '04',
  PAYEE_MASTERCARD_INFO: '05',
  PAYEE_NAMIBIA_CARD: '06',
  PAYEE_NAMIBIA_CARD_INFO: '07',
  PAYEE_NAMQR_OPERATOR: '08',
  PAYEE_DISCOVER: '09',
  PAYEE_DISCOVER_INFO: '10',
  PAYEE_AMEX: '11',
  PAYEE_AMEX_INFO: '12',
  PAYEE_JCB: '13',
  PAYEE_JCB_INFO: '14',
  PAYEE_UNIONPAY: '15',
  PAYEE_UNIONPAY_INFO: '16',
  
  // Existing Namibia Payment System (17)
  NRTC_PAYEE_GLOBAL_ID: '17',
  NRTC_PAYEE_PSP_ID: '17',
  NRTC_PAYEE_IDENTIFIER: '17',
  
  // IPP Payee (26)
  IPP_PAYEE_GLOBAL_ID: '26',
  IPP_PAYEE_FULL_FORM_ALIAS: '26',
  
  // IPP Transaction Reference (27)
  IPP_TRANSACTION_REFERENCE: '27',
  
  // Existing Namibia Payment System Payer (28)
  NRTC_PAYER_GLOBAL_ID: '28',
  NRTC_PAYER_PSP_ID: '28',
  NRTC_PAYER_IDENTIFIER: '28',
  
  // IPP Payer (29)
  IPP_PAYER_GLOBAL_ID: '29',
  IPP_PAYER_FULL_FORM_ALIAS: '29',
  
  // Transaction Data
  TRANSACTION_CURRENCY: '53',
  TRANSACTION_AMOUNT: '54',
  TIP_INDICATOR: '55',
  TIP_AMOUNT_FIXED: '56',
  TIP_AMOUNT_PERCENTAGE: '57',
  
  // Additional Data Field (62)
  ADDITIONAL_DATA_FIELD: '62',
  BILL_NUMBER: '62_01',
  MOBILE_NUMBER: '62_02',
  STORE_LABEL: '62_03',
  LOYALTY_NUMBER: '62_04',
  REFERENCE_LABEL: '62_05',
  CUSTOMER_LABEL: '62_06',
  TERMINAL_LABEL: '62_07',
  SHORT_DESCRIPTION: '62_08',
  ADDITIONAL_PAYER_DATA_REQUEST: '62_09',
  MERCHANT_TAX_ID: '62_10',
  PAYEE_CHANNEL: '62_11',
  
  // Digital Signature (66)
  DIGITAL_SIGNATURE: '66',
  
  // Unreserved Templates (80-84)
  UNRESERVED_80: '80', // Initiation Mode, Purpose, Merchant Type, etc.
  UNRESERVED_81: '81', // Invoice Date, Invoice Name
  UNRESERVED_82: '82', // Expiry, Timestamp, Transaction ID, etc.
  UNRESERVED_83: '83', // Mandate
  UNRESERVED_84: '84', // Split payments
  
  // Template 80 Sub-tags
  UNRESERVED_80_GLOBAL_ID: '80_00',
  UNRESERVED_80_INITIATION_MODE: '80_01',
  UNRESERVED_80_PURPOSE: '80_02',
  UNRESERVED_80_MERCHANT_TYPE: '80_03',
  UNRESERVED_80_MERCHANT_GENRE: '80_04',
  UNRESERVED_80_MERCHANT_ONBOARDING: '80_05',
  UNRESERVED_80_MERCHANT_BRAND: '80_06',
  UNRESERVED_80_BASE_AMOUNT: '80_07',
  UNRESERVED_80_BASE_CURRENCY: '80_08',
  
  // Template 81 Sub-tags
  UNRESERVED_81_GLOBAL_ID: '81_00',
  UNRESERVED_81_INVOICE_DATE: '81_01',
  UNRESERVED_81_INVOICE_NAME: '81_02',
  
  // Template 82 Sub-tags
  UNRESERVED_82_GLOBAL_ID: '82_00',
  UNRESERVED_82_TRANSACTION_ID: '82_01',
  UNRESERVED_82_EXPIRY: '82_02',
  UNRESERVED_82_CREATION_TIMESTAMP: '82_03',
  UNRESERVED_82_TIER: '82_04',
  UNRESERVED_82_TRANSACTION_TYPE: '82_05',
  UNRESERVED_82_CONSENT: '82_06',
  
  // Template 83 Sub-tags (Mandate)
  UNRESERVED_83_GLOBAL_ID: '83_00',
  UNRESERVED_83_MANDATE_NAME: '83_01',
  UNRESERVED_83_MANDATE_TYPE: '83_02',
  UNRESERVED_83_VALIDITY_START: '83_03',
  UNRESERVED_83_VALIDITY_END: '83_04',
  UNRESERVED_83_AMOUNT_RULE: '83_05',
  UNRESERVED_83_RECURRENCE: '83_06',
  UNRESERVED_83_RECURRENCE_VALUE: '83_07',
  UNRESERVED_83_RECURRENCE_TYPE: '83_08',
  UNRESERVED_83_REVOCABLE: '83_09',
  UNRESERVED_83_SHARE_TO_PAYEE: '83_10',
  UNRESERVED_83_BLOCK: '83_11',
  UNRESERVED_83_UMN: '83_12',
  
  // Template 84 Sub-tags (Split)
  UNRESERVED_84_GLOBAL_ID: '84_00',
  UNRESERVED_84_SPLIT: '84_01',
  
  // Payee Information Language Template (64)
  PAYEE_INFO_LANGUAGE: '64',
  LANGUAGE_PREFERENCE: '64_00',
  PAYEE_NAME_ALT: '64_01',
  PAYEE_CITY_ALT: '64_02',
  
  // Postal Code (61)
  POSTAL_CODE: '61',
  
  // Payment Link (50)
  PAYMENT_LINK: '50',
} as const;

// =============================================================================
// TypeScript Interfaces
// =============================================================================

/**
 * NAMQR Payload Format Indicator
 * Tag 00 - Mandatory
 */
export interface NAMQRPayloadFormatIndicator {
  tag: '00';
  value: '01' | '99'; // '99' = EMVCo card chip data
}

/**
 * NAMQR Point of Initiation Method
 * Tag 01 - Mandatory
 */
export interface NAMQRPointOfInitiationMethod {
  tag: '01';
  value: NAMQRPointOfInitiation;
}

/**
 * Payee Account Information
 * Tags 02-16 - At least one required
 */
export interface NAMQRPayeeAccountInfo {
  tag: string; // 02-16, 17, 26
  value: string;
}

/**
 * Merchant Category Code
 * Tag 52 - Mandatory
 */
export interface NAMQRMerchantCategoryCode {
  tag: '52';
  value: string; // 4 digits
}

/**
 * Transaction Currency
 * Tag 53 - Conditional
 */
export interface NAMQRTransactionCurrency {
  tag: '53';
  value: string; // ISO 4217, 516 = NAD
}

/**
 * Transaction Amount
 * Tag 54 - Conditional
 */
export interface NAMQRTransactionAmount {
  tag: '54';
  value: string; // Decimal up to 2 places
}

/**
 * Tip/Convenience Fee
 * Tags 55-57 - Optional
 */
export interface NAMQRTipOrConvenience {
  tag: '55';
  value: NAMQRTipIndicator;
  fixedAmount?: string; // Tag 56
  percentage?: string; // Tag 57
}

/**
 * Country Code
 * Tag 58 - Mandatory
 */
export interface NAMQRCountryCode {
  tag: '58';
  value: string; // ISO 3166-1 alpha-2
}

/**
 * Payee Name
 * Tag 59 - Mandatory
 */
export interface NAMQRPayeeName {
  tag: '59';
  value: string; // Max 25 chars
}

/**
 * Payee City
 * Tag 60 - Mandatory
 */
export interface NAMQRPayeeCity {
  tag: '60';
  value: string; // Max 15 chars
}

/**
 * Postal Code
 * Tag 61 - Optional
 */
export interface NAMQRPostalCode {
  tag: '61';
  value: string; // Max 10 chars
}

/**
 * Additional Data Field Template
 * Tag 62 - Optional
 */
export interface NAMQRAdditionalDataField {
  tag: '62';
  billNumber?: string; // 01
  mobileNumber?: string; // 02
  storeLabel?: string; // 03
  loyaltyNumber?: string; // 04
  referenceLabel?: string; // 05
  customerLabel?: string; // 06
  terminalLabel?: string; // 07
  shortDescription?: string; // 08
  additionalPayerDataRequest?: string; // 09
  merchantTaxId?: string; // 10
  payeeChannel?: string; // 11
}

/**
 * Token Vault Unique Identifier
 * Tag 65 - Mandatory
 */
export interface NAMQRTokenVaultUniqueId {
  tag: '65';
  value: string; // xx digits from Token Vault
}

/**
 * Digital Signature
 * Tag 66 - Conditional (for signed QR)
 */
export interface NAMQRDigitalSignature {
  tag: '66';
  value: string;
}

/**
 * CRC - Cyclic Redundancy Check
 * Tag 63 - Mandatory (always last)
 */
export interface NAMQRCRC {
  tag: '63';
  value: string; // 4 hex characters
}

/**
 * Unreserved Template 80
 * Contains: Initiation Mode, Purpose, Merchant Type, etc.
 */
export interface NAMQRUnreserved80 {
  tag: '80';
  globalId: string;
  initiationMode?: NAMQRInitiationMode;
  purpose?: NAMQRPurpose;
  merchantType?: 'LARGE' | 'SMALL';
  merchantGenre?: 'ONLINE' | 'OFFLINE';
  merchantOnboardingType?: 'BANK' | 'AGGREGATOR' | 'NETWORK' | 'TPAP';
  merchantBrand?: string;
  baseAmount?: string;
  baseCurrency?: string;
}

/**
 * Unreserved Template 81
 * Contains: Invoice Date, Invoice Name
 */
export interface NAMQRUnreserved81 {
  tag: '81';
  globalId: string;
  invoiceDate?: string; // ISO DateTime
  invoiceName?: string;
}

/**
 * Unreserved Template 82
 * Contains: Transaction ID, Expiry, Timestamp, Tier, Transaction Type
 */
export interface NAMQRUnreserved82 {
  tag: '82';
  globalId: string;
  transactionId?: string;
  expiry?: string; // ISO DateTime
  creationTimestamp?: string; // ISO DateTime
  tier?: string;
  transactionType?: 'PAY' | 'COLLECT' | 'CREATE' | 'UPDATE' | 'REVOKE' | 'PAUSE' | 'UNPAUSE';
  consent?: string;
}

/**
 * Unreserved Template 83 (Mandate)
 * Contains: Mandate details
 */
export interface NAMQRUnreserved83 {
  tag: '83';
  globalId: string;
  mandateName?: string;
  mandateType?: string;
  validityStart?: string; // ddmmyyyy
  validityEnd?: string; // ddmmyyyy
  amountRule?: 'MAX' | 'EXACT';
  recurrence?: 'ONETIME' | 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY' | 'ASPRESENTED';
  recurrenceValue?: string;
  recurrenceType?: 'BEFORE' | 'ON' | 'AFTER';
  revocable?: 'Y' | 'N';
  shareToPayee?: 'Y' | 'N';
  block?: 'Y' | 'N';
  umn?: string; // Unique Mandate Number
}

/**
 * Unreserved Template 84 (Split Payments)
 * Contains: Split details
 */
export interface NAMQRUnreserved84 {
  tag: '84';
  globalId: string;
  split?: string; // DISCNT:10|DISPCT:10%|CSHBCK:10|CSHPCT:10%|FX:30|MKUP:5%
}

/**
 * Payee Information Language Template
 * Tag 64 - Optional
 */
export interface NAMQRPayeeInfoLanguage {
  tag: '64';
  languagePreference: string; // ISO 639
  payeeNameAlt?: string;
  payeeCityAlt?: string;
}

/**
 * Payment Link
 * Tag 50 - Optional
 */
export interface NAMQRPaymentLink {
  tag: '50';
  globalId: string;
  paymentLink: string;
}

// =============================================================================
// Main NAMQR Types
// =============================================================================

/**
 * Complete NAMQR Data Object
 */
export type NAMQRDataObject =
  | NAMQRPayloadFormatIndicator
  | NAMQRPointOfInitiationMethod
  | NAMQRPayeeAccountInfo
  | NAMQRMerchantCategoryCode
  | NAMQRTransactionCurrency
  | NAMQRTransactionAmount
  | NAMQRTipOrConvenience
  | NAMQRCountryCode
  | NAMQRPayeeName
  | NAMQRPayeeCity
  | NAMQRPostalCode
  | NAMQRAdditionalDataField
  | NAMQRTokenVaultUniqueId
  | NAMQRDigitalSignature
  | NAMQRCRC
  | NAMQRUnreserved80
  | NAMQRUnreserved81
  | NAMQRUnreserved82
  | NAMQRUnreserved83
  | NAMQRUnreserved84
  | NAMQRPayeeInfoLanguage
  | NAMQRPaymentLink;

/**
 * NAMQR Use Case Types
 */
export type NAMQRUseCase =
  | 'P2P_STATIC'
  | 'P2P_DYNAMIC'
  | 'P2M_STATIC'
  | 'P2M_DYNAMIC'
  | 'PAYER_PRESENTED_STATIC'
  | 'PAYER_PRESENTED_DYNAMIC'
  | 'ATM_WITHDRAWAL'
  | 'MERCHANT_PAYMENT'
  | 'VOUCHER'
  | 'MANDATE';

/**
 * NAMQR Payment Stream
 */
export type NAMQRPaymentStreamType =
  | 'NRTC'
  | 'ENCR'
  | 'ENDO'
  | 'IPP'
  | 'POSD'
  | 'POSC'
  | 'ATM';

/**
 * NAMQR Generation Options
 */
export interface NAMQRGenerationOptions {
  // Required
  payeeName: string;
  payeeCity: string;
  countryCode?: string;
  merchantCategoryCode?: string;
  
  // Payment Stream
  paymentStream: NAMQRPaymentStreamType;
  globallyUniqueId?: string;
  
  // Payee Identifier
  payeeIdentifier: string; // Mobile number, account, or IPP full form alias
  payeePspId?: string;
  
  // Transaction
  amount?: string;
  currency?: string;
  reference?: string;
  shortDescription?: string;
  
  // QR Type
  useCase: NAMQRUseCase;
  isDynamic: boolean;
  
  // Optional
  expiryMinutes?: number;
  tipAmount?: string;
  tipType?: NAMQRTipIndicator;
  storeLabel?: string;
  terminalLabel?: string;
  billNumber?: string;
  postalCode?: string;
  
  // Merchant Info (for merchant presented QR)
  merchantId?: string;
  merchantBrand?: string;
  merchantType?: 'LARGE' | 'SMALL';
  merchantGenre?: 'ONLINE' | 'OFFLINE';
  
  // Mandate (for recurring payments)
  mandate?: {
    name: string;
    type?: string;
    validityStart?: string;
    validityEnd?: string;
    amountRule?: 'MAX' | 'EXACT';
    recurrence?: string;
    revocable?: boolean;
  };
  
  // Purpose (for special use cases)
  purpose?: NAMQRPurpose;
  
  // Token Vault (for dynamic QR)
  tokenVaultUniqueId?: string;
  
  // Split Payments
  splitPayments?: Array<{
    type: 'DISCNT' | 'DISPCT' | 'CSHBCK' | 'CSHPCT' | 'FX' | 'MKUP';
    value: string;
  }>;
}

/**
 * NAMQR Parsed Result
 */
export interface NAMQRParsedResult {
  valid: boolean;
  payload?: string;
  formatIndicator?: string;
  pointOfInitiation?: string;
  paymentStream?: NAMQRPaymentStreamType;
  useCase?: NAMQRUseCase;
  payeeName?: string;
  payeeCity?: string;
  amount?: string;
  currency?: string;
  payeeIdentifier?: string;
  merchantCategoryCode?: string;
  countryCode?: string;
  tokenVaultUniqueId?: string;
  expiry?: string;
  reference?: string;
  shortDescription?: string;
  crcValid?: boolean;
  error?: string;
}

/**
 * NAMQR Validation Result
 */
export interface NAMQRValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsedData?: NAMQRParsedResult;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a tag is a payee account info tag (02-16, 17, 26)
 */
export function isPayeeAccountInfoTag(tag: string): boolean {
  const num = parseInt(tag, 10);
  return (num >= 2 && num <= 16) || tag === '17' || tag === '26';
}

/**
 * Check if a tag is a payer identifier tag (28, 29)
 */
export function isPayerIdentifierTag(tag: string): boolean {
  return tag === '28' || tag === '29';
}

/**
 * Get payment stream from globally unique identifier
 */
export function getPaymentStreamFromGlobalId(globalId: string): NAMQRPaymentStreamType | undefined {
  if (globalId.includes('nrtc')) return 'NRTC';
  if (globalId.includes('encr')) return 'ENCR';
  if (globalId.includes('endo')) return 'ENDO';
  if (globalId.includes('ipp')) return 'IPP';
  if (globalId.includes('posd')) return 'POSD';
  if (globalId.includes('posc')) return 'POSC';
  if (globalId.includes('atm')) return 'ATM';
  return undefined;
}

/**
 * Get default MCC for use case
 */
export function getDefaultMCC(useCase: NAMQRUseCase): string {
  switch (useCase) {
    case 'P2P_STATIC':
    case 'P2P_DYNAMIC':
    case 'PAYER_PRESENTED_STATIC':
    case 'PAYER_PRESENTED_DYNAMIC':
      return '0000';
    case 'ATM_WITHDRAWAL':
      return '6013';
    default:
      return '0000';
  }
}

/**
 * Validate amount format (max 2 decimal places)
 */
export function isValidAmount(amount: string): boolean {
  const regex = /^\d+(\.\d{1,2})?$/;
  return regex.test(amount) && parseFloat(amount) > 0;
}

/**
 * Validate date format (ddmmyyyy)
 */
export function isValidDate(dateStr: string): boolean {
  if (dateStr.length !== 8) return false;
  const day = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10);
  const year = parseInt(dateStr.substring(4, 8), 10);
  return day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2025;
}

/**
 * Get tag description for debugging
 */
export function getTagDescription(tag: string): string {
  const descriptions: Record<string, string> = {
    '00': 'Payload Format Indicator',
    '01': 'Point of Initiation Method',
    '02': 'Payee Visa Account',
    '03': 'Payee Visa Info',
    '04': 'Payee Mastercard Account',
    '05': 'Payee Mastercard Info',
    '06': 'Payee Namibia Card Account',
    '07': 'Payee Namibia Card Info',
    '08': 'Payee NAMQR Operator',
    '09': 'Payee Discover',
    '10': 'Payee Discover Info',
    '11': 'Payee American Express',
    '12': 'Payee American Express Info',
    '13': 'Payee JCB',
    '14': 'Payee JCB Info',
    '15': 'Payee UnionPay',
    '16': 'Payee UnionPay Info',
    '17': 'NRTC/EnCR Globally Unique Identifier',
    '26': 'IPP Payee Full Form Alias',
    '27': 'IPP Transaction Reference',
    '28': 'NRTC/EnCR Payer Globally Unique Identifier',
    '29': 'IPP Payer Full Form Alias',
    '52': 'Merchant Category Code',
    '53': 'Transaction Currency',
    '54': 'Transaction Amount',
    '55': 'Tip/Convenience Indicator',
    '56': 'Value of Convenience Fee Fixed',
    '57': 'Value of Convenience Fee Percentage',
    '58': 'Country Code',
    '59': 'Payee Name',
    '60': 'Payee City',
    '61': 'Postal Code',
    '62': 'Additional Data Field Template',
    '63': 'CRC',
    '64': 'Payee Information Language Template',
    '65': 'Token Vault Unique Identifier',
    '66': 'Digital Signature',
    '80': 'Unreserved Template (Initiation Mode)',
    '81': 'Unreserved Template (Invoice)',
    '82': 'Unreserved Template (Transaction)',
    '83': 'Unreserved Template (Mandate)',
    '84': 'Unreserved Template (Split)',
    '50': 'Payment Link',
  };
  return descriptions[tag] || `Unknown Tag ${tag}`;
}
