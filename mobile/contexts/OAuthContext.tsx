/**
 * OAuthContext – Buffr G2P Open Banking.
 * Store OAuth tokens for external banks (key: oauth_${bankId} in SecureStore).
 * Location: contexts/OAuthContext.tsx
 */
import React, { createContext, useContext, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

interface OAuthContextType {
  getToken: (bankId: string) => Promise<OAuthToken | null>;
  setToken: (bankId: string, token: OAuthToken) => Promise<void>;
  clearToken: (bankId: string) => Promise<void>;
}

const OAuthContext = createContext<OAuthContextType | undefined>(undefined);

export function OAuthProvider({ children }: { children: React.ReactNode }) {
  const getToken = useCallback(async (bankId: string): Promise<OAuthToken | null> => {
    const key = `oauth_${bankId}`;
    try {
      const stored = await SecureStore.getItemAsync(key);
      if (!stored) return null;
      const token: OAuthToken = JSON.parse(stored);
      if (token.expiresAt > Date.now()) return token;
      await SecureStore.deleteItemAsync(key);
      return null;
    } catch {
      return null;
    }
  }, []);

  const setToken = useCallback(async (bankId: string, token: OAuthToken) => {
    const key = `oauth_${bankId}`;
    await SecureStore.setItemAsync(key, JSON.stringify(token));
  }, []);

  const clearToken = useCallback(async (bankId: string) => {
    const key = `oauth_${bankId}`;
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  }, []);

  return (
    <OAuthContext.Provider value={{ getToken, setToken, clearToken }}>
      {children}
    </OAuthContext.Provider>
  );
}

export function useOAuthTokens() {
  const ctx = useContext(OAuthContext);
  if (!ctx) throw new Error('useOAuthTokens must be used within OAuthProvider');
  return ctx;
}
