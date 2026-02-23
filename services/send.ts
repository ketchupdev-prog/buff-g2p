/**
 * Send money service – Buffr G2P.
 * P2P transfers, recipient lookup, and contact management.
 * Contacts: API when configured; otherwise device contacts (expo-contacts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoContacts from 'expo-contacts';

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

/** Map device contact (expo-contacts) to app Contact. */
function mapDeviceContact(c: ExpoContacts.ExistingContact): Contact {
  const phone = c.phoneNumbers?.[0]?.number?.trim() ?? '';
  return {
    id: c.id,
    name: c.name?.trim() ?? 'Unknown',
    phone,
    avatarUri: c.image?.uri,
    isFavorite: c.isFavorite,
  };
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
        const apiContacts = data.contacts ?? data.data ?? [];
        if (apiContacts.length > 0) return apiContacts;
      }
    } catch (e) {
      console.error('getContacts API error:', e);
    }
  }

  // Device contacts (expo-contacts): user picks from their phone
  try {
    const available = await ExpoContacts.isAvailableAsync();
    if (!available) return [];

    const { status } = await ExpoContacts.requestPermissionsAsync();
    if (status !== 'granted' && status !== 'limited') return [];

    const { data } = await ExpoContacts.getContactsAsync({
      fields: [ExpoContacts.Fields.Name, ExpoContacts.Fields.PhoneNumbers, ExpoContacts.Fields.Image],
      sort: ExpoContacts.SortTypes.FirstName,
    });

    return data
      .map(mapDeviceContact)
      .filter((c) => c.phone.length > 0);
  } catch (e) {
    console.error('getContacts device error:', e);
    return [];
  }
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
