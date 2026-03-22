/**
 * SmartPay Backend - TypeScript Type Definitions
 * Aligned with Buffr G2P patterns
 * 
 * NOTE: Core types (User, Wallet, Transaction, etc.) are now in the shared monorepo package
 * See: packages/shared-types/typescript/
 */

// Re-export core types from shared package
export * from "@smartpay/shared-types";

// Generic wrapper for TransactionResult (TypeScript-specific enhancement)
// JSON Schema doesn't support generics, so we provide a TypeScript-specific generic wrapper
export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Additional type aliases for backward compatibility
export type TransactionStatus = "success" | "pending" | "failed" | "completed";
export type VoucherStatus = "available" | "redeemed" | "expired" | "pending";
export type LoanStatus = "pending" | "active" | "repaid" | "defaulted";

// Application-specific types (not in shared schema)

export interface Voucher {
  id: string;
  user_id: string;
  amount: number;
  currency: "NAD";
  status: VoucherStatus;
  type?: string;
  programme?: string;
  expires_at: string;
  external_id?: string;
  created_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  wallet_id?: string;
  amount: number;
  interest_rate: number;
  total_repayment: number;
  status: LoanStatus;
  previous_voucher_value?: number;
  disbursed_at?: string;
  repaid_at?: string;
  repayment_voucher_redemption_id?: string;
  created_at: string;
  updated_at: string;
}

// Authentication types

export interface OTPCode {
  id: string;
  phone: string;
  code: string;
  purpose: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at?: string;
  created_at: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  revoked: boolean;
  revoked_at?: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  last_active_at?: string;
  created_at: string;
}

export interface CashOutCode {
  id: string;
  user_id: string;
  code: string;
  amount: number;
  method: string;
  status: string;
  expires_at: string;
  redeemed_at?: string;
  created_at: string;
}

export interface GroupWallet {
  id: string;
  group_id: string;
  name: string;
  balance: number;
  currency: "NAD";
  created_at: string;
  updated_at: string;
}

export interface TokenPayload {
  userId: string;
  type: "access" | "refresh";
  iat: number;
  exp: number;
  jti: string;
}

export interface VerifyResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

// API request types

export interface CreateWalletRequest {
  name: string;
  type: "main" | "savings" | "grant";
}

export interface RedeemVoucherRequest {
  method: "wallet" | "nampost" | "smartpay";
  walletId?: string;
}

export interface ApplyLoanRequest {
  amount: number;
  walletId: string;
  purpose?: string;
}

export interface OTPRequest {
  phone: string;
  email?: string;
  channel: "sms" | "email" | "both";
  purpose: "login" | "register" | "verify_phone";
}

export interface VerifyOTPRequest {
  phone: string;
  code: string;
  purpose: string;
}
