/**
 * Add card details – Buffr G2P. §3.4 screen 34d.
 * Stores linked card to the primary wallet's linkedCards in AsyncStorage.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { getSecureItem } from '@/services/secureStorage';
import { getWallets } from '@/services/wallets';

const DS = designSystem;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

function detectBrand(number: string): string {
  const n = number.replace(/\s/g, '');
  if (n.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  return 'Card';
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function saveCard(number: string, expiry: string, name: string): Promise<{ success: boolean; error?: string }> {
  const last4 = number.replace(/\s/g, '').slice(-4);
  const brand = detectBrand(number);

  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ number: number.replace(/\s/g, ''), expiry, nameOnCard: name, brand }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) return { success: true };
      return { success: false, error: data.error };
    } catch { /* fall through */ }
  }

  // AsyncStorage fallback: attach to the primary wallet's linkedCards
  const WALLETS_KEY = 'buffr_wallets';
  const stored = await AsyncStorage.getItem(WALLETS_KEY);
  let wallets = stored ? JSON.parse(stored) as Array<Record<string, unknown>> : [];

  if (wallets.length === 0) {
    // seed hasn't run yet – load from service and re-persist
    const live = await getWallets();
    wallets = live as unknown as Array<Record<string, unknown>>;
  }

  if (wallets.length > 0) {
    const primary = wallets.find(w => (w as { isPrimary?: boolean }).isPrimary) ?? wallets[0];
    if (!Array.isArray(primary.linkedCards)) primary.linkedCards = [];
    const linked = primary.linkedCards as Array<{ id: string; label: string; last4: string; brand: string }>;
    // avoid duplicates by last4
    if (!linked.find(c => c.last4 === last4)) {
      linked.push({ id: `lc_${Date.now()}`, label: `${brand} ${name}`, last4, brand });
    }
    await AsyncStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
  }

  return { success: true };
}

export default function AddCardDetailsScreen() {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = number.replace(/\s/g, '').length >= 15 && expiry.replace(/\D/g, '').length >= 4 && cvv.length >= 3 && name.trim().length > 0;
  const brand = detectBrand(number);

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const result = await saveCard(number, expiry, name);
    setSaving(false);
    if (result.success) {
      router.replace('/add-card/success' as never);
    } else {
      setError(result.error ?? 'Could not add card. Please try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Card details' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* Brand detector chip */}
            {number.length > 0 && (
              <View style={styles.brandChip}>
                <Text style={styles.brandText}>{brand}</Text>
              </View>
            )}

            <Text style={styles.label}>Card number</Text>
            <TextInput
              style={styles.input}
              value={number}
              onChangeText={t => setNumber(formatCardNumber(t))}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={19}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Expiry (MM/YY)</Text>
                <TextInput
                  style={styles.input}
                  value={expiry}
                  onChangeText={t => setExpiry(formatExpiry(t))}
                  placeholder="MM/YY"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="•••"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
            </View>

            <Text style={styles.label}>Name on card</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name as on card"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, !valid && styles.btnDisabled]}
              onPress={handleSave}
              disabled={!valid || saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Link card</Text>}
            </TouchableOpacity>

            <Text style={styles.secureNote}>Your card details are encrypted and stored securely.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  brandChip: { alignSelf: 'flex-start', backgroundColor: DS.colors.brand.primaryMuted, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  brandText: { fontSize: 12, fontWeight: '700', color: DS.colors.brand.primary },
  label: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginBottom: 8 },
  input: { height: 52, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: DS.colors.neutral.border, paddingHorizontal: 16, fontSize: 16, color: DS.colors.neutral.text, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: DS.colors.semantic.error },
  btn: { marginTop: 8, height: 52, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secureNote: { fontSize: 12, color: DS.colors.neutral.textTertiary, textAlign: 'center', marginTop: 16 },
});
