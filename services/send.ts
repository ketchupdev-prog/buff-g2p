/**
 * Send money service – Buffr G2P.
 * P2P transfers, recipient lookup, and contact management.
 * Contacts: API when configured; otherwise device contacts (expo-contacts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoContacts from 'expo-contacts';
import * as ExpoCrypto from 'expo-crypto';
import { getSecureItem } from '@/services/secureStorage';

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
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

// SEC-S2: PIN hashed with SHA-256 before transmission. Backend must verify hash.
async function hashPin(pin: string): Promise<string> {
  try {
    // expo-crypto is available (listed in package.json)
    const digest = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      'buffr-pin:' + pin,
    );
    return digest;
  } catch {
    // Fallback: return pin as-is (backend should handle both during migration)
    return pin;
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
      if (__DEV__) { console.error('getContacts API error:', e); } // SEC-S10
    }
  }

  // AsyncStorage demo contacts (seeded on first launch)
  try {
    const stored = await AsyncStorage.getItem('buffr_contacts');
    if (stored) {
      const demoContacts = JSON.parse(stored) as Array<{ id: string; name: string; phone: string; avatarUrl?: string }>;
      if (demoContacts.length > 0) {
        return demoContacts.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          avatarUri: c.avatarUrl,
        }));
      }
    }
  } catch { /* ignore */ }

  // Device contacts (expo-contacts): user picks from their phone
  try {
    const available = await ExpoContacts.isAvailableAsync();
    if (!available) return [];

    const { status } = await ExpoContacts.requestPermissionsAsync();
    if (status !== 'granted' && status !== 'limited') return [];

    const { data } = await ExpoContacts.getContactsAsync({
      fields: [ExpoContacts.Fields.Name, ExpoContacts.Fields.PhoneNumbers], // SEC-S14: removed Fields.Image (data minimisation)
      sort: ExpoContacts.SortTypes.FirstName,
    });

    return data
      .map(mapDeviceContact)
      .filter((c) => c.phone.length > 0);
  } catch (e) {
    if (__DEV__) { console.error('getContacts device error:', e); } // SEC-S10
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
    if (__DEV__) { console.error('lookupRecipient error:', e); } // SEC-S10
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
    // V11: Idempotency key prevents duplicate transactions on network retry.
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // SEC-S2: Hash PIN before transmission; keep raw pin for backward compat during migration.
    const { pin, ...rest } = params;
    const body: Record<string, unknown> = { ...rest };
    if (pin !== undefined) {
      body.pin = pin;
      body.pin_hash = await hashPin(pin);
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey, ...authHeader },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { transactionId?: string; error?: string };
    if (res.ok) return { success: true, transactionId: data.transactionId };
    return { success: false, error: data.error ?? 'Transfer failed' };
  } catch (e) {
    if (__DEV__) { console.error('sendMoney error:', e); } // SEC-S10
    return { success: false, error: 'Network error' };
  }
}
