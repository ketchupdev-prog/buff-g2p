import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'buffr_access_token';
const KEY_VERIFIER = 'buffr_pkce_verifier';
const KEY_STATE = 'buffr_oauth_state';

export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, token);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS);
}

export async function clearAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ACCESS);
}

export async function savePkceState(state: string, codeVerifier: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_STATE, state);
  await SecureStore.setItemAsync(KEY_VERIFIER, codeVerifier);
}

export async function consumePkceVerifier(expectedState: string): Promise<string | null> {
  const state = await SecureStore.getItemAsync(KEY_STATE);
  const verifier = await SecureStore.getItemAsync(KEY_VERIFIER);
  await SecureStore.deleteItemAsync(KEY_STATE);
  await SecureStore.deleteItemAsync(KEY_VERIFIER);
  if (!state || state !== expectedState || !verifier) return null;
  return verifier;
}
