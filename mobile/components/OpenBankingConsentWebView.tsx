/**
 * Open Banking consent flow – Buffr G2P.
 * Starts bank consent via backend, opens system browser (expo-web-browser), handles redirect to buffr://oauth-callback.
 * For Cash-Out Bank Transfer and optional bank linking. SCA is performed at the bank.
 * Location: components/OpenBankingConsentWebView.tsx
 */
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createConsentRequest, exchangeCodeForBankTokens } from '@/services/openBankingApi';

const REDIRECT_SCHEME = 'buffr';
const REDIRECT_PATH = 'oauth-callback';

export interface OpenBankingConsentWebViewProps {
  bankId: string;
  scopes: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function OpenBankingConsentWebView({
  bankId,
  scopes,
  onSuccess,
  onCancel,
}: OpenBankingConsentWebViewProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'exchanging' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const redirectUri = Linking.createURL(REDIRECT_PATH, { scheme: REDIRECT_SCHEME });
  const state = `st_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  async function startConsent() {
    setError(null);
    setStatus('loading');
    try {
      const result = await createConsentRequest({
        bankId,
        scopes,
        redirectUri,
        state,
      });
      const url = result.requestUri
        ? `${result.authorizationUrl ?? ''}?request_uri=${encodeURIComponent(result.requestUri)}`
        : result.authorizationUrl;
      if (!url) {
        setError('No authorization URL returned');
        setStatus('error');
        return;
      }
      const browserResult = await WebBrowser.openAuthSessionAsync(url, redirectUri);
      if (browserResult.type === 'cancel') {
        onCancel();
        setStatus('idle');
        return;
      }
      if (browserResult.type === 'success' && browserResult.url) {
        const parsed = Linking.parse(browserResult.url);
        const code = parsed.queryParams?.code as string | undefined;
        const returnedState = parsed.queryParams?.state as string | undefined;
        if (code && returnedState === state) {
          setStatus('exchanging');
          await exchangeCodeForBankTokens({
            bankId,
            code,
            redirectUri,
          });
          onSuccess();
        } else {
          setError('Invalid response from bank');
          setStatus('error');
        }
      } else {
        setError('Consent was not completed');
        setStatus('error');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('error');
    }
  }

  if (status === 'loading' || status === 'exchanging') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>
          {status === 'exchanging' ? 'Linking account…' : 'Opening bank…'}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => { setStatus('idle'); setError(null); }}>
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.promptText}>You will be redirected to your bank to authorize access.</Text>
      <TouchableOpacity style={styles.btn} onPress={startConsent}>
        <Text style={styles.btnText}>Continue to bank</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  promptText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  btn: {
    backgroundColor: '#0029D6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 16,
  },
  cancelText: {
    fontSize: 15,
    color: '#666',
  },
});
