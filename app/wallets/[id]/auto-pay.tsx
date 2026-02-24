/**
 * Auto Pay – Buffr G2P. §3.12 screen 40b.
 * Configure a recurring scheduled transfer FROM this wallet.
 * Per Buffr design: amount, frequency (weekly/monthly), day, repayments, pay-from.
 * API-first; stores locally when no backend.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { getSecureItem } from '@/services/secureStorage';
import { getWallets, getWallet, type Wallet } from '@/services/wallets';

const DS = designSystem;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const KEY = (walletId: string) => `buffr_autopay_${walletId}`;

type Frequency = 'weekly' | 'monthly';

const DAYS_OF_MONTH = ['1st', '5th', '10th', '15th', '20th', '25th', 'Last'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const REPAYMENT_OPTIONS = ['3', '6', '12', 'Ongoing'];

interface AutoPayConfig {
  enabled: boolean;
  amount: string;
  frequency: Frequency;
  day: string;
  repayments: string;
  targetWalletId: string;
  targetWalletName: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function loadConfig(walletId: string): Promise<AutoPayConfig | null> {
  try {
    const stored = await AsyncStorage.getItem(KEY(walletId));
    return stored ? (JSON.parse(stored) as AutoPayConfig) : null;
  } catch { return null; }
}

async function saveConfig(walletId: string, config: AutoPayConfig): Promise<{ success: boolean }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets/${walletId}/auto-pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        await AsyncStorage.setItem(KEY(walletId), JSON.stringify(config));
        return { success: true };
      }
    } catch { /* fall through */ }
  }
  await AsyncStorage.setItem(KEY(walletId), JSON.stringify(config));
  return { success: true };
}

export default function AutoPayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [otherWallets, setOtherWallets] = useState<Wallet[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [day, setDay] = useState('1st');
  const [repayments, setRepayments] = useState('Ongoing');
  const [targetWalletId, setTargetWalletId] = useState('');
  const [targetWalletName, setTargetWalletName] = useState('');

  useEffect(() => {
    async function init() {
      if (!id) return;
      const [w, allWallets, saved] = await Promise.all([
        getWallet(id),
        getWallets(),
        loadConfig(id),
      ]);
      setWallet(w);
      const others = allWallets.filter(wl => wl.id !== id);
      setOtherWallets(others);

      if (saved) {
        setEnabled(saved.enabled);
        setAmount(saved.amount);
        setFrequency(saved.frequency);
        setDay(saved.day);
        setRepayments(saved.repayments);
        setTargetWalletId(saved.targetWalletId);
        setTargetWalletName(saved.targetWalletName);
      } else if (others.length > 0) {
        setTargetWalletId(others[0].id);
        setTargetWalletName(others[0].name);
      }
    }
    void init();
  }, [id]);

  const amountNum = parseFloat(amount);
  const isValid = !Number.isNaN(amountNum) && amountNum > 0 && targetWalletId.length > 0;
  const days = frequency === 'monthly' ? DAYS_OF_MONTH : DAYS_OF_WEEK;

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await saveConfig(id ?? '', { enabled, amount, frequency, day, repayments, targetWalletId, targetWalletName });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Auto Pay', headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Enable toggle */}
          <View style={styles.enableRow}>
            <View>
              <Text style={styles.enableTitle}>Auto Pay</Text>
              <Text style={styles.enableSub}>Automatic recurring transfers</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, enabled && styles.toggleOn]}
              onPress={() => setEnabled(!enabled)}
              accessibilityLabel={enabled ? 'Disable Auto Pay' : 'Enable Auto Pay'}
            >
              <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          {enabled && (
            <>
              {/* From wallet (readonly) */}
              <Text style={styles.label}>From wallet</Text>
              <View style={styles.readonlyRow}>
                <Ionicons name="wallet-outline" size={18} color={DS.colors.brand.primary} />
                <Text style={styles.readonlyText}>{wallet?.name ?? 'Loading…'}</Text>
              </View>

              {/* To wallet */}
              <Text style={styles.label}>To wallet</Text>
              <View style={styles.walletPicker}>
                {otherWallets.length === 0 ? (
                  <Text style={styles.noWalletsText}>Add another wallet to set up Auto Pay</Text>
                ) : (
                  otherWallets.map(w => (
                    <TouchableOpacity
                      key={w.id}
                      style={[styles.walletOption, targetWalletId === w.id && styles.walletOptionActive]}
                      onPress={() => { setTargetWalletId(w.id); setTargetWalletName(w.name); }}
                    >
                      <Text style={styles.walletOptionEmoji}>{w.icon?.trim() || '💼'}</Text>
                      <View style={styles.walletOptionInfo}>
                        <Text style={[styles.walletOptionName, targetWalletId === w.id && { color: DS.colors.brand.primary }]}>{w.name}</Text>
                        <Text style={styles.walletOptionBal}>N$ {w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}</Text>
                      </View>
                      {targetWalletId === w.id && <Ionicons name="checkmark-circle" size={20} color={DS.colors.brand.primary} />}
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Amount */}
              <Text style={styles.label}>Transfer amount (N$)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />

              {/* Frequency */}
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.chipRow}>
                {(['weekly', 'monthly'] as Frequency[]).map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, frequency === f && styles.chipActive]}
                    onPress={() => { setFrequency(f); setDay(f === 'monthly' ? '1st' : 'Mon'); }}
                  >
                    <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day */}
              <Text style={styles.label}>{frequency === 'monthly' ? 'Day of month' : 'Day of week'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
                {days.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChip, day === d && styles.dayChipActive]}
                    onPress={() => setDay(d)}
                  >
                    <Text style={[styles.dayChipText, day === d && styles.dayChipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Repayments */}
              <Text style={styles.label}>Number of transfers</Text>
              <View style={styles.chipRow}>
                {REPAYMENT_OPTIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, repayments === r && styles.chipActive]}
                    onPress={() => setRepayments(r)}
                  >
                    <Text style={[styles.chipText, repayments === r && styles.chipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Summary */}
              {isValid && (
                <View style={styles.summaryCard}>
                  <Ionicons name="information-circle-outline" size={16} color={DS.colors.brand.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.summaryText}>
                    N$ {amount} will transfer {frequency} on the {day} from {wallet?.name ?? '…'} to {targetWalletName}.
                    {repayments !== 'Ongoing' ? ` Stops after ${repayments} transfers.` : ' Ongoing until cancelled.'}
                  </Text>
                </View>
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, (!isValid && enabled) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={(enabled && !isValid) || saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{enabled ? 'Save Auto Pay' : 'Turn off Auto Pay'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  enableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: DS.colors.neutral.border },
  enableTitle: { fontSize: 16, fontWeight: '700', color: DS.colors.neutral.text },
  enableSub: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  toggle: { width: 52, height: 30, borderRadius: 15, backgroundColor: DS.colors.neutral.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: DS.colors.brand.primary },
  toggleThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleThumbOn: { alignSelf: 'flex-end' },
  label: { fontSize: 12, fontWeight: '700', color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  readonlyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: DS.colors.neutral.border, paddingHorizontal: 16, marginBottom: 20 },
  readonlyText: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  walletPicker: { gap: 10, marginBottom: 20 },
  noWalletsText: { fontSize: 14, color: DS.colors.neutral.textSecondary, fontStyle: 'italic' },
  walletOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: DS.colors.neutral.border },
  walletOptionActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  walletOptionEmoji: { fontSize: 22 },
  walletOptionInfo: { flex: 1 },
  walletOptionName: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  walletOptionBal: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  input: { height: 56, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 18, fontSize: 20, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 20 },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, backgroundColor: '#fff' },
  chipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  chipTextActive: { color: '#fff' },
  dayRow: { gap: 8, paddingBottom: 4, marginBottom: 20 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, backgroundColor: '#fff' },
  dayChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  dayChipTextActive: { color: '#fff' },
  summaryCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: DS.colors.brand.primaryMuted, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: DS.colors.brand.primary + '30' },
  summaryText: { flex: 1, fontSize: 13, color: DS.colors.brand.primary, lineHeight: 18 },
  saveBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
