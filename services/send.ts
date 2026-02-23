/**
 * Send money service – Buffr G2P.
 * P2P transfers, recipient lookup, and contact management.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatarUri?: string;
  buffrId?: string; // Buffr account ID
  isFavorite?: boolean;
}

export interface SendResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  try {
    const token = await AsyncStorage.getItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function getContacts(): Promise<Contact[]> {
  if (API_BASE_URL) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/contacts`, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (res.ok) {
        const data = (await res.json()) as { contacts?: Contact[]; data?: Contact[] };
        return data.contacts ?? data.data ?? [];
      }
    } catch (e) {
      console.error('getContacts error:', e);
    }
  }
  return [];
}

export async function lookupRecipient(
  query: string
): Promise<Contact | null> {
  if (!API_BASE_URL) return null;
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/mobile/contacts/lookup?q=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/json', ...authHeader } }
    );
    if (res.ok) {
      const data = (await res.json()) as { contact?: Contact };
      return data.contact ?? null;
    }
  } catch (e) {
    console.error('lookupRecipient error:', e);
  }
  return null;
}

export async function sendMoney(params: {
  recipientPhone: string;
  amount: number;
  note?: string;
  walletId?: string;
  pin?: string;
}): Promise<SendResult> {
  if (!API_BASE_URL) return { success: false, error: 'Backend not configured' };
  try {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as { transactionId?: string; error?: string };
    if (res.ok) return { success: true, transactionId: data.transactionId };
    return { success: false, error: data.error ?? 'Transfer failed' };
  } catch (e) {
    console.error('sendMoney error:', e);
    return { success: false, error: 'Network error' };
  }
}
