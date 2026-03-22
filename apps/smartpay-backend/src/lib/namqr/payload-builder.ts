/**
 * NAMQR Payload Builder
 * Implements complete NAMQR specifications as per Bank of Namibia standards
 * Supports all tag definitions (Tag 00 through Tag 99) with proper TLV encoding
 */

import { NAMQRCrc16 } from './crc16';

/**
 * Point of Initiation Method values
 */
export enum PointOfInitiation {
  PAYEE_STATIC = '11',      // Static QR code shown for multiple transactions
  PAYEE_DYNAMIC = '12',     // New QR code for each transaction
  PAYER_STATIC = '13',      // Payer presented static QR
  PAYER_DYNAMIC = '14'      // Payer presented dynamic QR
}

/**
 * Initiation Mode values (Tag 80-01)
 */
export enum InitiationMode {
  STATIC_QR_OFFLINE = '01',
  STATIC_SECURE_QR_OFFLINE = '02',
  STATIC_SECURE_QR_MANDATE_OFFLINE = '03',
  DYNAMIC_QR_OFFLINE = '15',
  DYNAMIC_SECURE_QR_OFFLINE = '16',
  DYNAMIC_SECURE_QR_MANDATE_OFFLINE = '17',
  ATM_QR_DYNAMIC = '18',
  ONLINE_STATIC_QR = '19',
  ONLINE_STATIC_SECURE_QR = '20',
  ONLINE_STATIC_QR_MANDATE = '21',
  ONLINE_DYNAMIC_QR = '22',
  ONLINE_DYNAMIC_SECURE_QR = '23',
  ONLINE_DYNAMIC_SECURE_QR_MANDATE = '24'
}

/**
 * Purpose codes (Tag 80-02)
 */
export enum PurposeCode {
  DEFAULT = '00',
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
  METRO_ATM_NAMQR = '12',
  NON_METRO_ATM_NAMQR = '13',
  SI = '14',
  CORPORATE_DISBURSEMENT = '15',
  GOVERNMENT_VOUCHER = '18',
  PRIVATE_CORPORATE_VOUCHER = '19'
}

/**
 * Additional Data Field sub-tags (Tag 62)
 */
export interface AdditionalDataField {
  billNumber?: string;           // Tag 01
  mobileNumber?: string;          // Tag 02
  storeLabel?: string;            // Tag 03
  loyaltyNumber?: string;         // Tag 04
  referenceLabel?: string;        // Tag 05
  customerLabel?: string;         // Tag 06
  terminalLabel?: string;         // Tag 07
  shortDescription?: string;      // Tag 08
  additionalPayerDataRequest?: string; // Tag 09 (A=Address, M=Mobile, E=Email)
  merchantTaxId?: string;         // Tag 10
  payeeChannel?: string;          // Tag 11 (3 chars: Media, Location, Presence)
}

/**
 * IPP Payee Full Form Alias (Tag 26)
 */
export interface IPPPayeeAlias {
  globallyUniqueId: string;       // Tag 00 (reverse domain or UUID)
  payeeIPPFullFormAlias: string;  // Tag 01 (e.g., user@provider)
  orgId?: string;                 // Tag 02
  merchantId?: string;            // Tag 03
  minimumAmount?: string;         // Tag 04
}

/**
 * Transaction Reference Template (Tag 27)
 */
export interface TransactionReference {
  globallyUniqueId: string;       // Tag 00
  transactionReference?: string;  // Tag 01
  referenceURL?: string;          // Tag 02
  category?: string;              // Tag 03 (01=Advertisement, 02=Invoice)
}

/**
 * Unreserved Template (Tag 80)
 */
export interface UnreservedTemplate {
  globallyUniqueId: string;       // Tag 00
  initiationMode: InitiationMode; // Tag 01
  purpose?: PurposeCode;          // Tag 02
  merchantType?: 'LARGE' | 'SMALL'; // Tag 03
  merchantGenre?: 'ONLINE' | 'OFFLINE'; // Tag 04
  merchantOnboardingType?: 'BANK' | 'AGGREGATOR' | 'NETWORK' | 'TPAP'; // Tag 05
  merchantBrand?: string;         // Tag 06
  baseAmount?: string;            // Tag 07
  baseCurrency?: string;          // Tag 08 (3-letter ISO code)
}

/**
 * Invoice Template (Tag 81)
 */
export interface InvoiceTemplate {
  globallyUniqueId: string;       // Tag 00
  invoiceDate?: string;           // Tag 01 (ISO DateTime)
  invoiceName?: string;           // Tag 02
}

/**
 * Transaction Info Template (Tag 82)
 */
export interface TransactionInfoTemplate {
  globallyUniqueId: string;       // Tag 00
  transactionId?: string;         // Tag 01
  namqrExpiryDateTime?: string;   // Tag 02 (ISO DateTime, 27 chars)
  namqrCreationTimestamp?: string; // Tag 03 (ISO DateTime)
  tier?: 'TIER1' | 'TIER2' | 'TIER3' | 'TIER4' | 'TIER5' | 'TIER6'; // Tag 04
  transactionType?: 'PAY' | 'COLLECT' | 'CREATE' | 'UPDATE' | 'REVOKE' | 'PAUSE' | 'UNPAUSE'; // Tag 05
  consent?: string;               // Tag 06
}

/**
 * Mandate Template (Tag 83)
 */
export interface MandateTemplate {
  globallyUniqueId: string;       // Tag 00
  mandateName?: string;           // Tag 01
  mandateType?: string;           // Tag 02 (Future use)
  validityStart?: string;         // Tag 03 (ddmmyyyy)
  validityEnd?: string;           // Tag 04 (ddmmyyyy)
  amountRule?: 'MAX' | 'EXACT';   // Tag 05
  recurrence?: 'ONETIME' | 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'HALFYEARLY' | 'YEARLY' | 'ASPRESENTED'; // Tag 06
  recurrenceRuleValue?: string;   // Tag 07
  recurrenceRuleType?: 'BEFORE' | 'ON' | 'AFTER'; // Tag 08
  revocable?: 'Y' | 'N';          // Tag 09
  shareToPayee?: 'Y' | 'N';       // Tag 10
  block?: 'Y' | 'N';              // Tag 11
  umn?: string;                   // Tag 12 (Unique Mandate Number)
  skip?: string;                  // Tag 13
}

/**
 * Split Template (Tag 84)
 */
export interface SplitTemplate {
  globallyUniqueId: string;       // Tag 00
  split?: string;                 // Tag 01 (Format: DISCNT:10|DISPCT:10%|CSHBCK:10|CSHPCT:10%|FX:30|MKUP:5%)
}

/**
 * Language Preference Template (Tag 64)
 */
export interface LanguageTemplate {
  languagePreference: string;     // Tag 00 (2-char ISO 639 code)
  payeeNameAlternate: string;     // Tag 01
  payeeCityAlternate?: string;    // Tag 02
}

/**
 * Main NAMQR Payload configuration
 */
export interface NAMQRPayloadConfig {
  // Mandatory fields
  payloadFormatIndicator?: string; // Tag 00 (default "01", "99" for EMVCo card chip data)
  pointOfInitiation: PointOfInitiation; // Tag 01
  merchantCategoryCode: string;    // Tag 52 (4 digits, "0000" for P2P/Payer)
  countryCode: string;             // Tag 58 (2-char ISO 3166-1 alpha-2, "NA" for Namibia)
  payeeName: string;               // Tag 59 (max 25 chars)
  payeeCity: string;               // Tag 60 (max 15 chars)
  tokenVaultUniqueId: string;      // Tag 65 (NREF for NamClear)
  
  // Conditional/Optional fields
  transactionCurrency?: string;    // Tag 53 (3-digit ISO 4217, "516" for NAD)
  transactionAmount?: string;      // Tag 54 (format: "99.12", up to 13 chars)
  tipOrConvenienceIndicator?: '01' | '02' | '03'; // Tag 55
  valueOfConvenienceFeeFixed?: string; // Tag 56
  valueOfConvenienceFeePercentage?: string; // Tag 57
  postalCode?: string;             // Tag 61
  
  // Template fields
  ippPayeeAlias?: IPPPayeeAlias;   // Tag 26
  transactionReference?: TransactionReference; // Tag 27
  additionalDataField?: AdditionalDataField; // Tag 62
  languageTemplate?: LanguageTemplate; // Tag 64
  digitalSignature?: string;       // Tag 66
  unreservedTemplate: UnreservedTemplate; // Tag 80 (Mandatory)
  invoiceTemplate?: InvoiceTemplate; // Tag 81
  transactionInfoTemplate?: TransactionInfoTemplate; // Tag 82
  mandateTemplate?: MandateTemplate; // Tag 83
  splitTemplate?: SplitTemplate;   // Tag 84

  // Legacy payment system templates (Tags 17, 28 for non-IPP systems)
  legacyPayeeTemplate?: {
    globallyUniqueId: string;
    payeePSPId: string;
    payeeIdentifier: string;
  };
  legacyPayerTemplate?: {
    globallyUniqueId: string;
    payerPSPId: string;
    payerIdentifier: string;
  };
}

/**
 * NAMQR Payload Builder Class
 */
export class NAMQRPayloadBuilder {
  private config: NAMQRPayloadConfig;
  private payload: string = '';

  constructor(config: NAMQRPayloadConfig) {
    this.config = config;
    this.validate();
  }

  /**
   * Validate configuration before building
   */
  private validate(): void {
    // Validate mandatory fields
    if (!this.config.pointOfInitiation) {
      throw new Error('Point of Initiation is mandatory');
    }
    if (!this.config.merchantCategoryCode || this.config.merchantCategoryCode.length !== 4) {
      throw new Error('Merchant Category Code must be 4 digits');
    }
    if (!this.config.countryCode || this.config.countryCode.length !== 2) {
      throw new Error('Country Code must be 2 characters (ISO 3166-1 alpha-2)');
    }
    if (!this.config.payeeName || this.config.payeeName.length > 25) {
      throw new Error('Payee Name is mandatory and max 25 characters');
    }
    if (!this.config.payeeCity || this.config.payeeCity.length > 15) {
      throw new Error('Payee City is mandatory and max 15 characters');
    }
    if (!this.config.tokenVaultUniqueId) {
      throw new Error('Token Vault Unique Identifier is mandatory');
    }
    if (!this.config.unreservedTemplate) {
      throw new Error('Unreserved Template (Tag 80) is mandatory');
    }

    // Validate transaction amount format if present
    if (this.config.transactionAmount) {
      if (!/^\d+(\.\d{1,2})?$/.test(this.config.transactionAmount)) {
        throw new Error('Transaction amount must be numeric with max 2 decimal places');
      }
    }

    // Validate currency code if present
    if (this.config.transactionCurrency && this.config.transactionCurrency.length !== 3) {
      throw new Error('Transaction currency must be 3-digit ISO 4217 code');
    }

    // Validate MCC for payer presented QR
    if ([PointOfInitiation.PAYER_STATIC, PointOfInitiation.PAYER_DYNAMIC].includes(this.config.pointOfInitiation)) {
      if (this.config.merchantCategoryCode !== '0000') {
        throw new Error('Payer presented QR must have MCC = 0000');
      }
    }

    // Validate MCC for payee presented P2P
    const isP2P = this.config.merchantCategoryCode === '0000' && 
                  [PointOfInitiation.PAYEE_STATIC, PointOfInitiation.PAYEE_DYNAMIC].includes(this.config.pointOfInitiation);
    
    // Dynamic QR must have certain fields
    if ([PointOfInitiation.PAYEE_DYNAMIC, PointOfInitiation.PAYER_DYNAMIC].includes(this.config.pointOfInitiation)) {
      if (!this.config.transactionInfoTemplate?.namqrExpiryDateTime) {
        console.warn('Dynamic QR should include expiry date & time');
      }
    }
  }

  /**
   * Encode Tag-Length-Value
   */
  private encodeTLV(tag: string, value: string): string {
    if (!value) return '';
    const length = value.length.toString().padStart(2, '0');
    if (length.length > 2) {
      throw new Error(`Value for tag ${tag} exceeds maximum length of 99 characters`);
    }
    return `${tag}${length}${value}`;
  }

  /**
   * Build template (nested TLV structure)
   */
  private buildTemplate(tag: string, content: string): string {
    return this.encodeTLV(tag, content);
  }

  /**
   * Build IPP Payee Alias template (Tag 26)
   */
  private buildIPPPayeeAlias(data: IPPPayeeAlias): string {
    let content = '';
    content += this.encodeTLV('00', data.globallyUniqueId);
    content += this.encodeTLV('01', data.payeeIPPFullFormAlias);
    if (data.orgId) content += this.encodeTLV('02', data.orgId);
    if (data.merchantId) content += this.encodeTLV('03', data.merchantId);
    if (data.minimumAmount) content += this.encodeTLV('04', data.minimumAmount);
    return this.buildTemplate('26', content);
  }

  /**
   * Build Transaction Reference template (Tag 27)
   */
  private buildTransactionReference(data: TransactionReference): string {
    let content = '';
    content += this.encodeTLV('00', data.globallyUniqueId);
    if (data.transactionReference) content += this.encodeTLV('01', data.transactionReference);
    if (data.referenceURL) content += this.encodeTLV('02', data.referenceURL);
    if (data.category) content += this.encodeTLV('03', data.category);
    return this.buildTemplate('27', content);
  }

  /**
   * Build Additional Data Field template (Tag 62)
   */
  private buildAdditionalDataField(data: AdditionalDataField): string {
    let content = '';
    if (data.billNumber) content += this.encodeTLV('01', data.billNumber);
    if (data.mobileNumber) content += this.encodeTLV('02', data.mobileNumber);
    if (data.storeLabel) content += this.encodeTLV('03', data.storeLabel);
    if (data.loyaltyNumber) content += this.encodeTLV('04', data.loyaltyNumber);
    if (data.referenceLabel) content += this.encodeTLV('05', data.referenceLabel);
    if (data.customerLabel) content += this.encodeTLV('06', data.customerLabel);
    if (data.terminalLabel) content += this.encodeTLV('07', data.terminalLabel);
    if (data.shortDescription) content += this.encodeTLV('08', data.shortDescription);
    if (data.additionalPayerDataRequest) content += this.encodeTLV('09', data.additionalPayerDataRequest);
    if (data.merchantTaxId) content += this.encodeTLV('10', data.merchantTaxId);
    if (data.payeeChannel) content += this.encodeTLV('11', data.payeeChannel);
    
    if (content) {
      return this.buildTemplate('62', content);
    }
    return '';
  }

  /**
   * Build Language Template (Tag 64)
   */
  private buildLanguageTemplate(data: LanguageTemplate): string {
    let content = '';
    content += this.encodeTLV('00', data.languagePreference);
    content += this.encodeTLV('01', data.payeeNameAlternate);
    if (data.payeeCityAlternate) content += this.encodeTLV('02', data.payeeCityAlternate);
    return this.buildTemplate('64', content);
  }

  /**
   * Build Unreserved Template (Tag 80) - MANDATORY
   */
  private buildUnreservedTemplate(data: UnreservedTemplate): string {
    let content = '';
    content += this.encodeTLV('00', data.globallyUniqueId);
    content += this.encodeTLV('01', data.initiationMode);
    if (data.purpose) content += this.encodeTLV('02', data.purpose);
    if (data.merchantType) content += this.encodeTLV('03', data.merchantType);
    if (data.merchantGenre) content += this.encodeTLV('04', data.merchantGenre);
    if (data.merchantOnboardingType) content += this.encodeTLV('05', data.merchantOnboardingType);
    if (data.merchantBrand) content += this.encodeTLV('06', data.merchantBrand);
    if (data.baseAmount) content += this.encodeTLV('07', data.baseAmount);
    if (data.baseCurrency) content += this.encodeTLV('08', data.baseCurrency);
    return this.buildTemplate('80', content);
  }

  /**
   * Build Invoice Template (Tag 81)
   */
  private buildInvoiceTemplate(data: InvoiceTemplate): string {
    let content = '';
    content += this.encodeTLV('00', data.globallyUniqueId);
    if (data.invoiceDate) content += this.encodeTLV('01', data.invoiceDate);
    if (data.invoiceName) content += this.encodeTLV('02', data.invoiceName);
    return this.buildTemplate('81', content);
  }

  /**
   * Build Transaction Info Template (Tag 82)
   */
  private buildTransactionInfoTemplate(data: TransactionInfoTemplate): string {
    let content = '';
    content += this.encodeTLV('00', data.globallyUniqueId);
    if (data.transactionId) content += this.encodeTLV('01', data.transactionId);
    if (data.namqrExpiryDateTime) content += this.encodeTLV('02', data.namqrExpiryDateTime);
    if (data.namqrCreationTimestamp) content += this.encodeTLV('03', data.namqrCreationTimestamp);
    if (data.tier) content += this.encodeTLV('04', data.tier);
    if (data.transactionType) content += this.encodeTLV('05', data.transactionType);
    if (data.consent) content += this.encodeTLV('06', data.consent);
    return this.buildTemplate('82', content);
  }

  /**
   * Build Mandate Template (Tag 83)
   */
  private buildMandateTemplate(data: MandateTemplate): string {
    let content = '';
    content += this.encodeTLV('00', data.globallyUniqueId);
    if (data.mandateName) content += this.encodeTLV('01', data.mandateName);
    if (data.mandateType) content += this.encodeTLV('02', data.mandateType);
    if (data.validityStart) content += this.encodeTLV('03', data.validityStart);
    if (data.validityEnd) content += this.encodeTLV('04', data.validityEnd);
    if (data.amountRule) content += this.encodeTLV('05', data.amountRule);
    if (data.recurrence) content += this.encodeTLV('06', data.recurrence);
    if (data.recurrenceRuleValue) content += this.encodeTLV('07', data.recurrenceRuleValue);
    if (data.recurrenceRuleType) content += this.encodeTLV('08', data.recurrenceRuleType);
    if (data.revocable) content += this.encodeTLV('09', data.revocable);
    if (data.shareToPayee) content += this.encodeTLV('10', data.shareToPayee);
    if (data.block) content += this.encodeTLV('11', data.block);
    if (data.umn) content += this.encodeTLV('12', data.umn);
    if (data.skip) content += this.encodeTLV('13', data.skip);
    return this.buildTemplate('83', content);
  }

  /**
   * Build Split Template (Tag 84)
   */
  private buildSplitTemplate(data: SplitTemplate): string {
    let content = '';
    content += this.encodeTLV('00', data.globallyUniqueId);
    if (data.split) content += this.encodeTLV('01', data.split);
    return this.buildTemplate('84', content);
  }

  /**
   * Build complete NAMQR payload
   */
  public build(): string {
    this.payload = '';

    // Tag 00: Payload Format Indicator (default "01")
    this.payload += this.encodeTLV('00', this.config.payloadFormatIndicator || '01');

    // Tag 01: Point of Initiation Method
    this.payload += this.encodeTLV('01', this.config.pointOfInitiation);

    // Tags 02-16: Payee Account Information (reserved for card networks and payment systems)
    // Tag 26: IPP Payee Alias (if applicable)
    if (this.config.ippPayeeAlias) {
      this.payload += this.buildIPPPayeeAlias(this.config.ippPayeeAlias);
    }

    // Tag 27: Transaction Reference (if applicable)
    if (this.config.transactionReference) {
      this.payload += this.buildTransactionReference(this.config.transactionReference);
    }

    // Tag 52: Merchant Category Code
    this.payload += this.encodeTLV('52', this.config.merchantCategoryCode);

    // Tag 53: Transaction Currency (conditional)
    if (this.config.transactionCurrency) {
      this.payload += this.encodeTLV('53', this.config.transactionCurrency);
    }

    // Tag 54: Transaction Amount (optional/conditional)
    if (this.config.transactionAmount) {
      this.payload += this.encodeTLV('54', this.config.transactionAmount);
    }

    // Tag 55-57: Tip/Convenience Indicator and Values
    if (this.config.tipOrConvenienceIndicator) {
      this.payload += this.encodeTLV('55', this.config.tipOrConvenienceIndicator);
      if (this.config.tipOrConvenienceIndicator === '02' && this.config.valueOfConvenienceFeeFixed) {
        this.payload += this.encodeTLV('56', this.config.valueOfConvenienceFeeFixed);
      }
      if (this.config.tipOrConvenienceIndicator === '03' && this.config.valueOfConvenienceFeePercentage) {
        this.payload += this.encodeTLV('57', this.config.valueOfConvenienceFeePercentage);
      }
    }

    // Tag 58: Country Code
    this.payload += this.encodeTLV('58', this.config.countryCode);

    // Tag 59: Payee Name
    this.payload += this.encodeTLV('59', this.config.payeeName);

    // Tag 60: Payee City
    this.payload += this.encodeTLV('60', this.config.payeeCity);

    // Tag 61: Postal Code (optional)
    if (this.config.postalCode) {
      this.payload += this.encodeTLV('61', this.config.postalCode);
    }

    // Tag 62: Additional Data Field (optional)
    if (this.config.additionalDataField) {
      const adf = this.buildAdditionalDataField(this.config.additionalDataField);
      if (adf) this.payload += adf;
    }

    // Tag 64: Language Template (optional)
    if (this.config.languageTemplate) {
      this.payload += this.buildLanguageTemplate(this.config.languageTemplate);
    }

    // Tag 65: Token Vault Unique Identifier (mandatory)
    this.payload += this.encodeTLV('65', this.config.tokenVaultUniqueId);

    // Tag 66: Digital Signature (conditional)
    if (this.config.digitalSignature) {
      this.payload += this.encodeTLV('66', this.config.digitalSignature);
    }

    // Tag 80: Unreserved Template (mandatory)
    this.payload += this.buildUnreservedTemplate(this.config.unreservedTemplate);

    // Tag 81: Invoice Template (optional)
    if (this.config.invoiceTemplate) {
      this.payload += this.buildInvoiceTemplate(this.config.invoiceTemplate);
    }

    // Tag 82: Transaction Info Template (optional)
    if (this.config.transactionInfoTemplate) {
      this.payload += this.buildTransactionInfoTemplate(this.config.transactionInfoTemplate);
    }

    // Tag 83: Mandate Template (optional)
    if (this.config.mandateTemplate) {
      this.payload += this.buildMandateTemplate(this.config.mandateTemplate);
    }

    // Tag 84: Split Template (optional)
    if (this.config.splitTemplate) {
      this.payload += this.buildSplitTemplate(this.config.splitTemplate);
    }

    // Tag 63: CRC (must be last)
    this.payload = NAMQRCrc16.appendCrc(this.payload);

    return this.payload;
  }

  /**
   * Get the built payload
   */
  public getPayload(): string {
    if (!this.payload) {
      return this.build();
    }
    return this.payload;
  }

  /**
   * Validate the built payload
   */
  public validatePayload(): boolean {
    if (!this.payload) {
      this.build();
    }
    return NAMQRCrc16.validate(this.payload);
  }
}

/**
 * Factory functions for common use cases
 */
export class NAMQRFactory {
  /**
   * Create a static merchant QR code (payee presented)
   */
  public static createStaticMerchantQR(params: {
    merchantId: string;
    merchantName: string;
    merchantCity: string;
    mcc: string;
    tokenVaultId: string;
    ippAlias: string;
  }): string {
    const config: NAMQRPayloadConfig = {
      pointOfInitiation: PointOfInitiation.PAYEE_STATIC,
      merchantCategoryCode: params.mcc,
      countryCode: 'NA',
      payeeName: params.merchantName,
      payeeCity: params.merchantCity,
      tokenVaultUniqueId: params.tokenVaultId,
      ippPayeeAlias: {
        globallyUniqueId: 'na.com.operator.ipp',
        payeeIPPFullFormAlias: params.ippAlias,
        merchantId: params.merchantId
      },
      unreservedTemplate: {
        globallyUniqueId: 'na.com.operator.namqr',
        initiationMode: InitiationMode.STATIC_QR_OFFLINE
      }
    };

    const builder = new NAMQRPayloadBuilder(config);
    return builder.build();
  }

  /**
   * Create a dynamic merchant QR code with amount
   */
  public static createDynamicMerchantQR(params: {
    merchantId: string;
    merchantName: string;
    merchantCity: string;
    mcc: string;
    tokenVaultId: string;
    ippAlias: string;
    amount: string;
    transactionId: string;
    expiryDateTime: string;
    shortDescription?: string;
  }): string {
    const config: NAMQRPayloadConfig = {
      pointOfInitiation: PointOfInitiation.PAYEE_DYNAMIC,
      merchantCategoryCode: params.mcc,
      countryCode: 'NA',
      transactionCurrency: '516', // NAD
      transactionAmount: params.amount,
      payeeName: params.merchantName,
      payeeCity: params.merchantCity,
      tokenVaultUniqueId: params.tokenVaultId,
      ippPayeeAlias: {
        globallyUniqueId: 'na.com.operator.ipp',
        payeeIPPFullFormAlias: params.ippAlias,
        merchantId: params.merchantId
      },
      additionalDataField: params.shortDescription ? {
        shortDescription: params.shortDescription
      } : undefined,
      unreservedTemplate: {
        globallyUniqueId: 'na.com.operator.namqr',
        initiationMode: InitiationMode.DYNAMIC_QR_OFFLINE
      },
      transactionInfoTemplate: {
        globallyUniqueId: 'na.com.operator.namqr',
        transactionId: params.transactionId,
        namqrExpiryDateTime: params.expiryDateTime,
        namqrCreationTimestamp: new Date().toISOString()
      }
    };

    const builder = new NAMQRPayloadBuilder(config);
    return builder.build();
  }

  /**
   * Create a P2P QR code (payee presented, MCC = 0000)
   */
  public static createP2PQR(params: {
    payeeName: string;
    payeeCity: string;
    tokenVaultId: string;
    ippAlias: string;
    amount?: string;
  }): string {
    const config: NAMQRPayloadConfig = {
      pointOfInitiation: params.amount ? PointOfInitiation.PAYEE_DYNAMIC : PointOfInitiation.PAYEE_STATIC,
      merchantCategoryCode: '0000', // P2P
      countryCode: 'NA',
      transactionCurrency: params.amount ? '516' : undefined,
      transactionAmount: params.amount,
      payeeName: params.payeeName,
      payeeCity: params.payeeCity,
      tokenVaultUniqueId: params.tokenVaultId,
      ippPayeeAlias: {
        globallyUniqueId: 'na.com.operator.ipp',
        payeeIPPFullFormAlias: params.ippAlias
      },
      unreservedTemplate: {
        globallyUniqueId: 'na.com.operator.namqr',
        initiationMode: params.amount ? InitiationMode.DYNAMIC_QR_OFFLINE : InitiationMode.STATIC_QR_OFFLINE
      }
    };

    const builder = new NAMQRPayloadBuilder(config);
    return builder.build();
  }

  /**
   * Create an ATM cash withdrawal QR code
   */
  public static createATMQR(params: {
    atmName: string;
    atmCity: string;
    tokenVaultId: string;
    ippAlias: string;
    amount: string;
    transactionId: string;
    expiryDateTime: string;
  }): string {
    const config: NAMQRPayloadConfig = {
      pointOfInitiation: PointOfInitiation.PAYEE_DYNAMIC,
      merchantCategoryCode: '6011', // ATM MCC
      countryCode: 'NA',
      transactionCurrency: '516',
      transactionAmount: params.amount,
      payeeName: params.atmName,
      payeeCity: params.atmCity,
      tokenVaultUniqueId: params.tokenVaultId,
      ippPayeeAlias: {
        globallyUniqueId: 'na.com.operator.ipp',
        payeeIPPFullFormAlias: params.ippAlias
      },
      unreservedTemplate: {
        globallyUniqueId: 'na.com.operator.namqr',
        initiationMode: InitiationMode.ATM_QR_DYNAMIC,
        purpose: PurposeCode.METRO_ATM_NAMQR
      },
      transactionInfoTemplate: {
        globallyUniqueId: 'na.com.operator.namqr',
        transactionId: params.transactionId,
        namqrExpiryDateTime: params.expiryDateTime,
        namqrCreationTimestamp: new Date().toISOString()
      }
    };

    const builder = new NAMQRPayloadBuilder(config);
    return builder.build();
  }
}
