/**
 * Cards service – Buffr G2P.
 * Backend and database only. Add/remove linked bank cards via backend API.
 */
import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Remove a linked card. API: DELETE /api/v1/mobile/cards/:id.
 * After success, caller should refresh wallets/cards list.
 */
export async function deleteCard(cardId: string): Promise<{ success: boolean; error?: string }> {
  if (!API_BASE_URL) {
    return { success: false, error: 'Backend not configured' };
  }
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/cards/${cardId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeader },
    });
    if (res.ok) return { success: true };
    const data = (await res.json()) as { error?: string };
    return { success: false, error: data.error ?? 'Failed to remove card' };
  } catch (e) {
    if (__DEV__) console.error('deleteCard API error:', e);
    return { success: false, error: 'Network error' };
  }
}
