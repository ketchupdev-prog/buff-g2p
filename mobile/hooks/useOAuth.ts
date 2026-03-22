/**
 * useOAuth – Buffr G2P Open Banking.
 * OAuth flow: startAuth → open browser → capture code → exchange for tokens.
 * Location: hooks/useOAuth.ts
 */
import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  startOAuthFlow,
  exchangeCodeForTokens,
  makeRedirectUri,
  type OAuthConfig,
  type TokenResponse,
} from '@/services/oauth';

export function useOAuth(config: OAuthConfig) {
  const [loading, setLoading] = useState(false);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);

  const startAuth = useCallback(async () => {
    setLoading(true);
    try {
      const redirectUri = config.redirectUri || (await makeRedirectUri());
      const fullConfig = { ...config, redirectUri };
      const { url, codeVerifier } = await startOAuthFlow(fullConfig);
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

      if (result.type === 'success' && result.url) {
        const urlObj = new URL(result.url);
        const code = urlObj.searchParams.get('code');
        if (code) {
          const tokens = await exchangeCodeForTokens(fullConfig, code, codeVerifier);
          setTokenResponse(tokens);
          return tokens;
        }
      }
      throw new Error('OAuth cancelled or failed');
    } finally {
      setLoading(false);
    }
  }, [config]);

  return { startAuth, loading, tokenResponse };
}
