import Constants from 'expo-constants';

/**
 * Expo exposes public env vars via `expo-constants` extra or EXPO_PUBLIC_* at bundle time.
 * For local dev, use `.env` + `expo start` (Expo loads EXPO_PUBLIC_* from env).
 */
export function getBuffrBaseUrl(): string {
  const u =
    process.env.EXPO_PUBLIC_BUFFR_BASE_URL ??
    (Constants.expoConfig?.extra?.buffrBaseUrl as string | undefined);
  if (!u) {
    throw new Error('Set EXPO_PUBLIC_BUFFR_BASE_URL in .env');
  }
  return u.replace(/\/$/, '');
}

export function getClientId(): string {
  const id = process.env.EXPO_PUBLIC_BUFFR_CLIENT_ID;
  if (!id) throw new Error('Set EXPO_PUBLIC_BUFFR_CLIENT_ID');
  return id;
}

export function getRedirectUri(): string {
  return (
    process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI ??
    'buffrfintech://oauth'
  );
}

export function getTokenBridgeUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_TOKEN_BRIDGE_URL;
}

export function getDevAccessToken(): string | undefined {
  return process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN;
}
