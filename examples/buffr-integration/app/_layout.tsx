import { Stack } from 'expo-router';
import { BuffrProvider } from '@buffr/sdk/react-native';
import { getBuffrBaseUrl, getDevAccessToken } from '@/lib/env';
import { getAccessToken } from '@/lib/tokenStore';
import { useEffect, useState } from 'react';

/**
 * BuffrProvider needs a stable config; we resolve the token per request via getAccessToken.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getAccessToken().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <BuffrProvider
      config={{
        baseUrl: getBuffrBaseUrl(),
        fetch,
        getAccessToken: async () => (await getAccessToken()) ?? getDevAccessToken() ?? null,
      }}
    >
      <Stack screenOptions={{ headerTitle: 'Buffr + Fintech' }} />
    </BuffrProvider>
  );
}
