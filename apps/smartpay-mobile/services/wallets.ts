/**
 * Wallet Service - SmartPay Mobile
 * Handles wallet CRUD operations
 * Location: mobile/services/wallets.ts
 */

import { api, NetworkError } from './api';
import { 
  Wallet, 
  CreateWalletRequest, 
  CreateWalletResponse, 
  UpdateWalletRequest,
  UpdateWalletResponse,
  DeleteWalletResponse 
} from '../types/api';

// Export types for external use
export { Wallet, CreateWalletRequest, UpdateWalletRequest };

/**
 * Get all wallets for authenticated user
 * GET /api/v1/wallets
 */
export async function getWallets(): Promise<Wallet[]> {
  try {
    const wallets = await api.get<Wallet[]>('/api/v1/wallets', { retry: true });
    
    // Normalize response (backend returns array directly)
    return Array.isArray(wallets) ? wallets : [];
  } catch (error) {
    console.error('getWallets error:', error);
    // No mock fallback: if the backend is unreachable, callers should handle
    // the failure by rendering empty/error state instead.
    throw error;
  }
}

/**
 * Get specific wallet by ID
 * GET /api/v1/wallets/:id
 */
export async function getWalletById(walletId: string): Promise<Wallet | null> {
  try {
    const response = await api.get<{ wallet: Wallet }>(`/api/v1/wallets/${walletId}`);
    return response.wallet;
  } catch (error) {
    console.error('getWalletById error:', error);
    return null;
  }
}

/**
 * Create a new wallet
 * POST /api/v1/wallets
 */
export async function createWallet(params: CreateWalletRequest): Promise<Wallet | null> {
  try {
    const response = await api.post<CreateWalletResponse>(
      '/api/v1/wallets',
      params
    );

    return response.wallet;
  } catch (error) {
    console.error('createWallet error:', error);
    throw error;
  }
}

/**
 * Update wallet details
 * PATCH /api/v1/wallets/:id
 */
export async function updateWallet(
  walletId: string,
  params: UpdateWalletRequest
): Promise<Wallet | null> {
  try {
    const response = await api.patch<UpdateWalletResponse>(
      `/api/v1/wallets/${walletId}`,
      params
    );

    return response.wallet;
  } catch (error) {
    console.error('updateWallet error:', error);
    throw error;
  }
}

/**
 * Delete (archive) a wallet
 * DELETE /api/v1/wallets/:id
 */
export async function deleteWallet(walletId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.delete<DeleteWalletResponse>(`/api/v1/wallets/${walletId}`);
    return { success: true };
  } catch (error) {
    console.error('deleteWallet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete wallet',
    };
  }
}

// ============================================================================
// NOTE: No mock wallet data. Backend unavailability should be handled by UI.
