/**
 * WalletsContext – Smartpay Mobile Wallets Provider.
 * Manages user wallets, balances, and linked bank accounts.
 * Location: fintech/smartpay/mobile/contexts/WalletsContext.tsx
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from './UserContext';

import { getWallets as getWalletsService } from '@/services/wallets';
import { useWalletStore, type CachedWallet } from '@/store/walletStore';
import { Wallet, WalletType, WalletTier } from '@/types/api';

/**
 * Re-export wallet types from api types for backwards compatibility.
 * All wallet types now centralized in types/api.ts
 */
export type { Wallet, WalletType, WalletTier };

/**
 * Linked bank account interface for PISP integrations.
 */
export interface LinkedBankAccount {
  /** Unique account identifier */
  id: string;
  /** Bank name */
  bankName: string;
  /** Masked account number (e.g., "****1234") */
  accountNumber: string;
  /** Account holder name */
  accountHolder: string;
  /** Whether this is the default linked account */
  isDefault: boolean;
  /** Linked date */
  linkedAt: string;
}

/**
 * Wallets context state interface.
 */
interface WalletsState {
  /** Array of user wallets */
  wallets: Wallet[];
  /** Total balance across all wallets */
  totalBalance: number;
  /** Primary wallet (if any) */
  primaryWallet: Wallet | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message (if any) */
  error: string | null;
  /** Array of linked bank accounts */
  linkedAccounts: LinkedBankAccount[];
  /** Whether user has any linked accounts */
  hasLinkedAccounts: boolean;
}

/**
 * Wallets context value interface with state and actions.
 */
interface WalletsContextValue extends WalletsState {
  /** Refresh wallets from API */
  refresh: () => Promise<void>;
  /** Get wallet by ID */
  getWalletById: (id: string) => Wallet | undefined;
}

const WalletsContext = createContext<WalletsContextValue | undefined>(undefined);

/**
 * WalletsProvider component that fetches and manages wallet state.
 * @param children - Child components
 */
export function WalletsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useUser();
  const cachedWallets = useWalletStore((s) => s.wallets);
  const updateCachedWallets = useWalletStore((s) => s.updateWallets);
  
  const [state, setState] = useState<WalletsState>({
    wallets: cachedWallets.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      balance: w.balance,
      currency: 'NAD',
      isPrimary: w.isPrimary,
      tier: w.tier,
      kycRequired: w.kycRequired,
      color: w.color,
      icon: w.icon,
      createdAt: w.lastUpdated,
      updatedAt: w.lastUpdated,
    })),
    totalBalance: cachedWallets.reduce((sum, w) => sum + w.balance, 0),
    primaryWallet: (() => {
      const primary = cachedWallets.find((w) => w.isPrimary);
      if (!primary) return null;
      return {
        id: primary.id,
        name: primary.name,
        type: primary.type,
        balance: primary.balance,
        currency: 'NAD',
        isPrimary: primary.isPrimary,
        tier: primary.tier,
        kycRequired: primary.kycRequired,
        color: primary.color,
        icon: primary.icon,
        createdAt: primary.lastUpdated,
        updatedAt: primary.lastUpdated,
      };
    })(),
    isLoading: cachedWallets.length === 0,
    error: null,
    linkedAccounts: [],
    hasLinkedAccounts: false,
  });

  function mapCachedWalletToContextWallet(w: CachedWallet): Wallet {
    return {
      id: w.id,
      name: w.name,
      type: w.type,
      balance: w.balance,
      currency: 'NAD',
      isPrimary: w.isPrimary,
      tier: w.tier,
      kycRequired: w.kycRequired,
      color: w.color,
      icon: w.icon,
      createdAt: w.lastUpdated,
      updatedAt: w.lastUpdated,
    };
  }

  function mapContextWalletToCachedWallet(w: Wallet): CachedWallet {
    return {
      id: w.id,
      name: w.name,
      type: w.type,
      balance: w.balance,
      currency: 'NAD',
      isPrimary: w.isPrimary,
      tier: w.tier,
      kycRequired: w.kycRequired,
      color: w.color,
      icon: w.icon,
      lastUpdated: w.updatedAt instanceof Date ? w.updatedAt.toISOString() : w.updatedAt,
    };
  }

  function mapApiWalletToContextWallet(apiWallet: any): Wallet {
    const backendType: string | undefined = apiWallet?.type;
    const mappedType: WalletType | undefined = 
      backendType as WalletType || undefined;

    const createdAtRaw = apiWallet?.createdAt ?? apiWallet?.created_at;
    const updatedAtRaw = apiWallet?.updatedAt ?? apiWallet?.updated_at;

    const createdAt =
      createdAtRaw instanceof Date ? createdAtRaw.toISOString() : createdAtRaw != null ? String(createdAtRaw) : new Date().toISOString();

    const updatedAt =
      updatedAtRaw instanceof Date ? updatedAtRaw.toISOString() : updatedAtRaw != null ? String(updatedAtRaw) : new Date().toISOString();

    return {
      id: String(apiWallet?.id ?? ''),
      name: String(apiWallet?.name ?? 'Wallet'),
      type: mappedType,
      balance: Number(apiWallet?.balance ?? 0),
      currency: 'NAD',
      status: apiWallet?.status as 'active' | 'frozen' | 'archived' | undefined,
      isPrimary: apiWallet?.isPrimary,
      tier: 'standard',
      kycRequired: false,
      color: apiWallet?.color ? String(apiWallet.color) : undefined,
      icon: apiWallet?.icon ? String(apiWallet.icon) : undefined,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Fetches wallets from the API endpoint.
   */
  const loadWallets = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: prev.wallets.length === 0, error: null }));

      // Use the shared HTTP client so Authorization headers + retry logic apply.
      // Backend currently returns wallets as an array.
      const apiWallets: any[] = await getWalletsService();
      const wallets = apiWallets.map(mapApiWalletToContextWallet).filter((w) => w.id.length > 0);
      const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
      const primaryWallet = wallets.find(w => w.isPrimary) || null;

      // Wallets endpoint doesn't return linked accounts in this codebase.
      // Keep these non-blocking so UI can still render.
      const linkedAccounts: LinkedBankAccount[] = [];

      setState({
        wallets,
        totalBalance,
        primaryWallet,
        isLoading: false,
        error: null,
        linkedAccounts,
        hasLinkedAccounts: linkedAccounts.length > 0,
      });

      // Cache for offline support (no mock fallback).
      updateCachedWallets(wallets.map(mapContextWalletToCachedWallet));
    } catch (error) {
      if (__DEV__) {
        console.log('[Wallets] load failed:', error instanceof Error ? error.name : 'UnknownError');
      }
      
      // Determine error message based on error type
      let errorMessage = 'Failed to load wallets';
      if (error && typeof error === 'object' && 'name' in error) {
        const errorName = (error as any).name;
        if (errorName === 'NetworkError') {
          errorMessage = cachedWallets.length > 0 
            ? 'Using cached wallets (offline)' 
            : 'No internet connection. Please check your network.';
        } else if (errorName === 'UnauthorizedError') {
          errorMessage = 'Session expired. Please sign in again.';
        } else if (errorName === 'RateLimitError') {
          errorMessage = 'Too many requests. Please try again in a moment.';
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        // Keep cached wallets if we have them - important for offline resilience
        wallets: prev.wallets.length > 0 ? prev.wallets : [],
        totalBalance: prev.wallets.length > 0 ? prev.totalBalance : 0,
        primaryWallet: prev.wallets.length > 0 ? prev.primaryWallet : null,
        linkedAccounts: prev.linkedAccounts,
        hasLinkedAccounts: prev.hasLinkedAccounts,
      }));
    }
  }, [isAuthenticated, updateCachedWallets]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  /**
   * Refreshes wallet data from API.
   */
  const refresh = useCallback(async () => {
    await loadWallets();
  }, [loadWallets]);

  /**
   * Gets a wallet by its ID.
   * @param id - Wallet ID
   * @returns Wallet object or undefined
   */
  const getWalletById = useCallback((id: string) => {
    return state.wallets.find(w => w.id === id);
  }, [state.wallets]);

  const value: WalletsContextValue = {
    ...state,
    refresh,
    getWalletById,
  };

  return <WalletsContext.Provider value={value}>{children}</WalletsContext.Provider>;
}

/**
 * Hook to access wallets context.
 * @throws Error if used outside WalletsProvider
 */
export function useWallets(): WalletsContextValue {
  const context = useContext(WalletsContext);
  if (context === undefined) {
    throw new Error('useWallets must be used within a WalletsProvider');
  }
  return context;
}
