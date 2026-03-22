/**
 * BuffrContext – Smartpay.
 * Provides Buffr Connect integration with Supabase authentication.
 * Wraps @buffr/react-native BuffrProvider with Supabase session tokens.
 * 
 * Location: fintech/apps/smartpay-mobile/contexts/BuffrContext.tsx
 */
import React, { createContext, useContext, useMemo } from 'react';
import { BuffrProvider, BuffrConnect } from '@buffr/react-native';
import { useSupabaseAuth } from './SupabaseAuthContext';
import { loadOidcAccessToken } from '@buffr/react-native';

const BUFFR_CONNECT_URL = process.env.EXPO_PUBLIC_BUFFR_CONNECT_URL || 'http://localhost:3000';

interface BuffrContextValue {
  client: BuffrConnect | null;
  isConfigured: boolean;
}

const BuffrContext = createContext<BuffrContextValue>({
  client: null,
  isConfigured: false,
});

export function BuffrProviderWrapper({ children }: { children: React.ReactNode }) {
  const { session } = useSupabaseAuth();

  const buffrConfig = useMemo(() => {
    if (!BUFFR_CONNECT_URL) return null;

    return {
      baseUrl: BUFFR_CONNECT_URL,
      getAccessToken: async () => {
        // Priority 1: Supabase session access token (most common)
        if (session?.access_token) {
          return session.access_token;
        }
        
        // Priority 2: Buffr OIDC token from secure storage (if user went through Buffr OAuth)
        const oidcToken = await loadOidcAccessToken();
        if (oidcToken) {
          return oidcToken;
        }
        
        return null;
      },
    };
  }, [session]);

  const client = useMemo(() => {
    if (!buffrConfig) return null;
    return new BuffrConnect(buffrConfig);
  }, [buffrConfig]);

  const contextValue: BuffrContextValue = {
    client,
    isConfigured: Boolean(BUFFR_CONNECT_URL),
  };

  if (!buffrConfig) {
    return (
      <BuffrContext.Provider value={contextValue}>
        {children}
      </BuffrContext.Provider>
    );
  }

  return (
    <BuffrProvider config={buffrConfig}>
      <BuffrContext.Provider value={contextValue}>
        {children}
      </BuffrContext.Provider>
    </BuffrProvider>
  );
}

export function useBuffr(): BuffrContextValue {
  const ctx = useContext(BuffrContext);
  if (!ctx) {
    throw new Error('useBuffr must be used within BuffrProviderWrapper');
  }
  return ctx;
}
