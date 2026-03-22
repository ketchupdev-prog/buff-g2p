/**
 * Namibia Open Banking Standards (OBS) v1.0 - Complete Type Definitions
 * 
 * Implements:
 * - All resource objects (Accounts, Balances, Transactions, Payments, Consent)
 * - Complete API request/response schemas
 * - Error handling types
 * - OAuth 2.0 + OIDC types
 * - mTLS certificate types
 * 
 * Standards Reference: Namibia Open Banking Standards v1.0 (March 2025)
 */

// ═══════════════════════════════════════════════════════════
// PARTICIPANT MANAGEMENT (Chapter 8)
// ═══════════════════════════════════════════════════════════

export type ParticipantRole = 'DP' | 'TPP';
export type SectorCode = 'All' | 'Banking';
export type ServiceCode = 'Common' | 'PIS' | 'AIS';
export type OperationType = 'AIS.Read' | 'PIS.Write' | 'PIS.Read';

export interface ParticipantCredentials {
  /** x.509 V3 certificate (RFC5280) */
  certificate: string;
  /** QWAC (Qualified Website Authentication Certificate) */
  qwac: string;
  /** Participant ID in format: API + 6-digit numeric */
  participantId: string;
  /** Roles from TS 119 495 */
  roles: ParticipantRole[];
  /** Competent Authority (e.g., "Bank of Namibia") */
  ncaName: string;
  /** NCA ID (e.g., "NA-BON") */
  ncaId: string;
}

// ═══════════════════════════════════════════════════════════
// API ARCHITECTURE STANDARDS (Chapter 9.1)
// ═══════════════════════════════════════════════════════════

/** HTTP Request Headers (OBS 9.1.5) */
export interface OBSRequestHeaders {
  /** Participant ID of TPP (Mandatory) */
  ParticipantId: string;
  /** Content type - application/json (Conditional) */
  ContentType?: string;
  /** API version requested (Mandatory) */
  'x-v': string;
  /** Accept header (Optional) */
  Accept?: string;
  /** OAuth 2.0 Bearer token */
  Authorization?: string;
}

/** HTTP Response Headers (OBS 9.1.6) */
export interface OBSResponseHeaders {
  /** Participant ID of Data Provider (Mandatory) */
  ParticipantId: string;
  /** Retry after seconds for 429 errors (Optional) */
  RetryAfter?: number;
  /** API version responded with (Mandatory) */
  'x-v': string;
}

/** Root Request Object (OBS 9.1.7) */
export interface OBSRequest<T> {
  data: T;
  meta?: Record<string, any>;
}

/** Root Response Object (OBS 9.1.8) */
export interface OBSResponse<T> {
  data: T;
  links?: PaginationLinks;
  meta?: PaginationMeta;
}

/** Error Response Object */
export interface OBSErrorResponse {
  errors: OBSError[];
}

export interface OBSError {
  code: string;
  title: string;
  detail: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
}

/** Pagination Links (OBS 9.1.4) */
export interface PaginationLinks {
  first?: string;
  last?: string;
  prev?: string;
  next?: string;
}

/** Pagination Meta (OBS 9.1.4) */
export interface PaginationMeta {
  totalRecords: number;
  totalPages: number;
}

// ═══════════════════════════════════════════════════════════
// ACCOUNT INFORMATION SERVICE (AIS) (Chapter 9.2.4)
// ═══════════════════════════════════════════════════════════

/** Account Types (OBS 9.2.4.1) */
export type AccountType = 
  | 'e-Wallet'
  | 'Current Account'
  | 'Savings Account'
  | 'Credit Card'
  | 'Loan Account';

export type AccountStatus = 'open' | 'closed';
export type AccountHolderType = 'Consumer' | 'Small Business' | 'Enterprise';

/** Account Resource Object */
export interface Account {
  /** Unique account identifier */
  accountId: string;
  /** Account number (may be masked) */
  accountNumber: string;
  /** Account type */
  accountType: AccountType;
  /** Account holder name */
  accountName?: string;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Account status */
  status: AccountStatus;
  /** Account holder type */
  holderType?: AccountHolderType;
  /** Additional account details */
  details?: {
    openedDate?: string;
    maturityDate?: string;
    interestRate?: number;
    overdraftLimit?: number;
  };
}

/** Balance Types (OBS 9.2.4.2) - Data Provider defined */
export type BalanceType = 
  | 'Available'
  | 'Current'
  | 'Credit'
  | 'InterimAvailable'
  | 'InterimBooked'
  | 'OpeningAvailable'
  | 'OpeningBooked';

/** Balance Resource Object */
export interface Balance {
  /** Balance type */
  type: BalanceType;
  /** Balance amount */
  amount: number;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Date and time of balance (ISO 8601) */
  dateTime: string;
  /** Credit/debit indicator */
  creditDebitIndicator: 'Credit' | 'Debit';
}

/** Account Balance Response */
export interface AccountBalance {
  accountId: string;
  balances: Balance[];
}

/** Transaction Types - Data Provider defined (OBS 9.2.4.3) */
export type TransactionType = string; // e.g., 'CardPayment', 'EFT', 'BankCharge'

/** Transaction Status */
export type TransactionStatus = 
  | 'Pending'
  | 'Booked'
  | 'Information';

/** Transaction Resource Object */
export interface Transaction {
  /** Transaction identifier */
  transactionId: string;
  /** Account identifier */
  accountId: string;
  /** Booking date and time (ISO 8601) */
  bookingDateTime: string;
  /** Value date (ISO 8601) */
  valueDateTime?: string;
  /** Transaction information/description */
  transactionInformation?: string;
  /** Transaction amount */
  amount: {
    amount: number;
    currency: string;
  };
  /** Credit/debit indicator */
  creditDebitIndicator: 'Credit' | 'Debit';
  /** Transaction status */
  status: TransactionStatus;
  /** Transaction reference */
  transactionReference?: string;
  /** Balance after transaction */
  balanceAfterTransaction?: {
    amount: number;
    currency: string;
    type: BalanceType;
  };
  /** Proprietary bank transaction code */
  proprietaryBankTransactionCode?: {
    code: string;
    issuer?: string;
  };
  /** Merchant information */
  merchantDetails?: {
    merchantName?: string;
    merchantCategoryCode?: string;
  };
  /** Debtor/Creditor information */
  debtor?: PartyIdentification;
  creditor?: PartyIdentification;
}

export interface PartyIdentification {
  name?: string;
  accountNumber?: string;
  bankId?: string;
}

// ═══════════════════════════════════════════════════════════
// PAYMENT INITIATION SERVICE (PIS) (Chapter 9.2.4.4)
// ═══════════════════════════════════════════════════════════

/** Payment Types (OBS 9.2.4.4) */
export type PaymentType = 
  | 'OnUs'           // Same bank transfers
  | 'EnCR'           // Enhanced credit transfers (EFT)
  | 'NRTC'           // Near real-time credit transfers
  | 'RTGS'           // Real-time gross settlement
  | 'IPP';           // Instant Payment Programme

export type PaymentStatus = 
  | 'Initiated'       // Payment created, awaiting authorization
  | 'Pending'         // Payment authorized, awaiting processing
  | 'Accepted'        // Payment accepted by system
  | 'AcceptedSettlementInProcess'
  | 'AcceptedSettlementCompleted'
  | 'Rejected'        // Payment rejected
  | 'Cancelled';      // Payment cancelled

/** Payment Request */
export interface PaymentInitiationRequest {
  /** Payment type */
  paymentType: PaymentType;
  /** Debtor account */
  debtorAccount: {
    accountId: string;
    accountNumber?: string;
  };
  /** Creditor details */
  creditor: {
    name: string;
    accountNumber: string;
    bankId?: string;
  };
  /** Payment amount */
  instructedAmount: {
    amount: number;
    currency: string;
  };
  /** Payment reference */
  remittanceInformation?: string;
  /** End-to-end identification */
  endToEndIdentification?: string;
}

/** Payment Response */
export interface PaymentInitiationResponse {
  /** Payment ID for tracking */
  paymentId: string;
  /** Payment status */
  status: PaymentStatus;
  /** Creation date time */
  creationDateTime: string;
  /** Status update date time */
  statusUpdateDateTime?: string;
  /** Payment initiation request */
  initiation: PaymentInitiationRequest;
}

/** Beneficiary Resource Object */
export interface Beneficiary {
  /** Beneficiary ID */
  beneficiaryId: string;
  /** Beneficiary name */
  name: string;
  /** Beneficiary account number */
  accountNumber: string;
  /** Beneficiary bank */
  bankId?: string;
  /** Bank name */
  bankName?: string;
  /** Reference/nickname */
  reference?: string;
  /** Date added */
  addedDate?: string;
}

// ═══════════════════════════════════════════════════════════
// CONSENT MANAGEMENT (Chapter 9.5)
// ═══════════════════════════════════════════════════════════

/** Consent Scopes (OBS 9.5.2) */
export type ConsentScope = 
  | 'banking:accounts.basic.read'
  | 'banking:payments.write'
  | 'banking:payments.read'
  | 'consent:authorisationcode.write'
  | 'consent:authorisationtoken.write';

/** Consent Status */
export type ConsentStatus = 
  | 'AwaitingAuthorisation'
  | 'Authorised'
  | 'Rejected'
  | 'Revoked'
  | 'Expired';

/** Pushed Authorization Request (PAR) - RFC 9126 */
export interface PushedAuthorizationRequest {
  client_id: string;
  scope: string;
  response_type: 'code';
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  /** Optional permissions */
  permissions?: ConsentScope[];
  /** Optional transaction date range */
  transaction_from_date_time?: string;
  transaction_to_date_time?: string;
}

export interface PushedAuthorizationResponse {
  request_uri: string;
  expires_in: number;
}

/** Token Request (OBS 9.5.1) */
export interface TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  refresh_token?: string;
  redirect_uri?: string;
  client_id: string;
  code_verifier?: string;
}

/** Token Response */
export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/** Consent Resource Object */
export interface Consent {
  /** Consent ID */
  consentId: string;
  /** TPP Participant ID */
  tppParticipantId: string;
  /** Account holder ID */
  accountHolderId: string;
  /** Data Provider Participant ID */
  dpParticipantId: string;
  /** Consent status */
  status: ConsentStatus;
  /** Consent scopes */
  scopes: ConsentScope[];
  /** Maximum duration: 180 days (OBS 9.5.3) */
  expirationDateTime: string;
  /** Creation date time */
  creationDateTime: string;
  /** Status update date time */
  statusUpdateDateTime: string;
  /** Transaction date range (if applicable) */
  transactionFromDateTime?: string;
  transactionToDateTime?: string;
  /** Linked accounts */
  accounts?: string[];
}

// ═══════════════════════════════════════════════════════════
// API ENDPOINT DEFINITIONS (Chapter 9.2.5)
// ═══════════════════════════════════════════════════════════

/** List Accounts Request Query Parameters */
export interface ListAccountsQuery {
  /** Filter by status */
  status?: 'open' | 'closed';
  /** Pagination - page number (default: 1) */
  page?: number;
  /** Pagination - page size (default: 25, max: 1000) */
  'page-size'?: number;
}

/** List Transactions Query Parameters */
export interface ListTransactionsQuery {
  /** From date (ISO 8601) */
  fromDate?: string;
  /** To date (ISO 8601) */
  toDate?: string;
  /** Pagination */
  page?: number;
  'page-size'?: number;
}

// ═══════════════════════════════════════════════════════════
// ERROR CODES (Chapter 9.7 & Data Dictionary)
// ═══════════════════════════════════════════════════════════

export enum OBSErrorCode {
  // Client Errors (4xx)
  INVALID_REQUEST = 'invalid_request',
  INVALID_CLIENT = 'invalid_client',
  INVALID_GRANT = 'invalid_grant',
  UNAUTHORIZED_CLIENT = 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type',
  INVALID_SCOPE = 'invalid_scope',
  
  // Resource Errors
  RESOURCE_NOT_FOUND = 'resource_not_found',
  RESOURCE_INVALID = 'resource_invalid',
  
  // Consent Errors
  CONSENT_INVALID = 'consent_invalid',
  CONSENT_EXPIRED = 'consent_expired',
  CONSENT_REVOKED = 'consent_revoked',
  CONSENT_NOT_AUTHORISED = 'consent_not_authorised',
  
  // Payment Errors
  PAYMENT_INVALID = 'payment_invalid',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  PAYMENT_TIMEOUT = 'payment_timeout',
  PAYMENT_REJECTED = 'payment_rejected',
  
  // Rate Limiting
  TOO_MANY_REQUESTS = 'too_many_requests',
  
  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR = 'internal_server_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  GATEWAY_TIMEOUT = 'gateway_timeout',
}

// ═══════════════════════════════════════════════════════════
// SERVICE LEVEL STANDARDS (Chapter 9.7)
// ═══════════════════════════════════════════════════════════

/** Service Level Agreement */
export interface ServiceLevel {
  /** Availability: 99.9% excluding ADW */
  availability: number;
  /** Median response time: 300ms */
  medianResponseTime: number;
  /** Error rate threshold */
  errorRate: number;
  /** Maximum requests per day from same Account Holder: 4 */
  maxRequestsPerDay: number;
}

export const OBS_SERVICE_LEVELS: ServiceLevel = {
  availability: 99.9,
  medianResponseTime: 300,
  errorRate: 0.01, // 1%
  maxRequestsPerDay: 4,
};

// ═══════════════════════════════════════════════════════════
// REPORTING STANDARDS (Chapter 10.1)
// ═══════════════════════════════════════════════════════════

/** Transaction Report (Monthly) */
export interface TransactionReport {
  reportDate: string;
  participantId: string;
  endpoints: {
    endpointName: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    byTpp?: {
      tppId: string;
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      errorBreakdown?: {
        errorCode: string;
        count: number;
      }[];
    }[];
  }[];
}

/** Service Level Report (Monthly) */
export interface ServiceLevelReport {
  reportDate: string;
  participantId: string;
  serviceLevels: {
    metric: string;
    target: number;
    actual: number;
    met: boolean;
    notes?: string;
  }[];
}

/** Dispute Report (Monthly) */
export interface DisputeReport {
  reportDate: string;
  participantId: string;
  disputes: {
    type: string;
    priority: string;
    total: number;
    byCounterparty?: {
      participantId: string;
      count: number;
    }[];
  }[];
}
