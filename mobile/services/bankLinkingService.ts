/**
 * Bank Account Linking Service
 * 
 * Purpose: Link external bank accounts to user profile for withdrawals/deposits
 * Location: mobile/services/bankLinkingService.ts
 * 
 * Features:
 * - Fetch linked accounts
 * - Link new bank account
 * - Verify account with code
 * - Remove linked account
 * - Set primary account
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface LinkedBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName?: string;
  accountType?: string;
  branchCode?: string;
  currency: string;
  isVerified: boolean;
  isPrimary: boolean;
  linkedAt: string;
  verifiedAt?: string;
}

export interface BankLinkRequest {
  bankName: string;
  accountNumber: string;
  accountHolderName?: string;
  accountType?: 'savings' | 'checking' | 'current';
  branchCode?: string;
}

/**
 * Fetch all linked bank accounts for user
 */
export async function getLinkedBankAccounts(userId: string): Promise<LinkedBankAccount[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/bank-accounts/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status}`);
    }
    
    const data = await response.json();
    return data.accounts || [];
  } catch (error) {
    console.error('Error fetching linked accounts:', error);
    return [];
  }
}

/**
 * Link a new bank account
 */
export async function linkBankAccount(
  userId: string,
  accountData: BankLinkRequest
): Promise<{ success: boolean; account?: LinkedBankAccount; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/bank-accounts/${userId}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to link account'
      };
    }
    
    return {
      success: true,
      account: data.account
    };
  } catch (error) {
    console.error('Error linking bank account:', error);
    return {
      success: false,
      error: 'Network error linking account'
    };
  }
}

/**
 * Verify bank account with verification code
 */
export async function verifyBankAccount(
  accountId: string,
  verificationCode: string
): Promise<{ success: boolean; verified: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/bank-accounts/${accountId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode,
        method: 'manual_code'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: data.error || 'Verification failed'
      };
    }
    
    return {
      success: data.success,
      verified: data.verified
    };
  } catch (error) {
    console.error('Error verifying bank account:', error);
    return {
      success: false,
      verified: false,
      error: 'Network error during verification'
    };
  }
}

/**
 * Remove a linked bank account
 */
export async function removeBankAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/bank-accounts/${accountId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to remove account'
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error removing bank account:', error);
    return {
      success: false,
      error: 'Network error removing account'
    };
  }
}

/**
 * Set account as primary for withdrawals
 */
export async function setPrimaryAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/bank-accounts/${accountId}/set-primary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to set primary'
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error setting primary account:', error);
    return {
      success: false,
      error: 'Network error'
    };
  }
}

/**
 * Get supported banks list (can be expanded)
 */
export function getSupportedBanks(): Array<{ name: string; code: string; logo?: string }> {
  return [
    { name: 'Bank Windhoek', code: 'BWK' },
    { name: 'FNB Namibia', code: 'FNB' },
    { name: 'Standard Bank', code: 'STD' },
    { name: 'Nedbank', code: 'NED' },
    { name: 'Bank BIC', code: 'BIC' },
    { name: 'Letshego', code: 'LET' },
    { name: 'Namib Desert Diamonds', code: 'NDD' }
  ];
}
