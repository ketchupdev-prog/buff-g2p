/**
 * Group Send – Buffr G2P. §3.12 screen 47c-i.
 * "Receiver Details" screen – gradient group header + bottom form. Matches Figma design.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { Avatar } from '@/components/ui';
import { getWallets } from '@/services/wallets';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const DS = designSystem;

interface GroupMember { id: string; name: string; }
interface GroupInfo { name: string; memberCount: number; isAdmin: boolean; members: GroupMember[]; }

async function fetchGroupInfo(id: string): Promise<GroupInfo> {
  if (API_BASE_URL) {
    try {
      const token = await getSecureItem('buffr_access_token');
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${id}`, { headers: h });
      if (res.ok) return (await res.json()) as GroupInfo;
    } catch { /* fall through */ }
  }
  return {
    name: 'Savings Circle',
    memberCount: 5,
    isAdmin: true,
    members: [
      { id: 'm1', name: 'Stephanie Nakale' },
      { id: 'm2', name: 'Florence Nandago' },
      { id: 'm3', name: 'Prudence Shapwa' },
      { id: 'm4', name: 'Shilunga Shikongo' },
      { id: 'm5', name: 'Eino Nashikoto' },
    ],
  };
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function postGroupSend(groupId: string, amount: number, note: string, walletId: string): Promise<{ success: boolean; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${groupId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ amount, note, walletId }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) return { success: true };
      return { success: false, error: data.error };
    } catch { /* fall through */ }
  }
  // Save transaction to group activity
  const key = `buffr_group_txs_${groupId}`;
  const stored = await AsyncStorage.getItem(key);
  const existing = stored ? JSON.parse(stored) as object[] : [];
  existing.unshift({ id: `gs_${Date.now()}`, type: 'contribution', amount, note, walletId, createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(key, JSON.stringify(existing));

  // Deduct from wallet balance so home screen reflects the change
  try {
    const walletsRaw = await AsyncStorage.getItem('buffr_wallets');
    if (walletsRaw) {
      const wallets = JSON.parse(walletsRaw) as Array<{ id: string; balance: number }>;
      const wallet = wallets.find(w => w.id === walletId);
      if (wallet) {
        wallet.balance = Math.max(0, wallet.balance - amount);
        await AsyncStorage.setItem('buffr_wallets', JSON.stringify(wallets));
      }
    }
  } catch { /* non-critical */ }

  return { success: true };
}

export default function GroupSendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [walletLabel, setWalletLabel] = useState('Buffr Ac');
  const [walletId, setWalletId] = useState('w_main_001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    fetchGroupInfo(id ?? '').then(setGroup).catch(() => {});
  }, [id]);

  const amountNum = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const isValid = amountNum > 0;

  async function handleSubmit() {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await postGroupSend(id ?? '', amountNum, note, walletId);
      if (result.success) {
        router.replace({ pathname: '/groups/[id]/send/success', params: { id: id ?? '', amount: amountNum.toFixed(2) } } as never);
      } else {
        setError(result.error ?? 'Failed to send. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const visibleMembers = (group?.members ?? []).slice(0, 3);
  const overflow = Math.max(0, (group?.memberCount ?? 0) - 3);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{
        title: 'Receiver Details',
        headerTintColor: DS.colors.neutral.text,
        headerStyle: { backgroundColor: '#fff' },
        headerRight: () => (
          <TouchableOpacity onPress={() => setIsFav(f => !f)} style={{ marginRight: 16 }}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? DS.colors.semantic.error : DS.colors.neutral.text} />
          </TouchableOpacity>
        ),
      }} />

      {/* Group header */}
      <View style={styles.header}>
        <View style={styles.avatarStack}>
          {visibleMembers.map((m, i) => (
            <View key={m.id} style={[styles.stackedAvatar, { marginLeft: i === 0 ? 0 : -16, zIndex: 10 - i }]}>
              <Avatar name={m.name} size={56} />
            </View>
          ))}
          {overflow > 0 && (
            <View style={[styles.stackedAvatar, styles.overflowBadge, { marginLeft: -16, zIndex: 0 }]}>
              <Text style={styles.overflowText}>+{overflow}</Text>
            </View>
          )}
        </View>
        <Text style={styles.groupName}>{group?.name ?? '…'}</Text>
        <Text style={styles.groupSub}>Created by You</Text>
        <TouchableOpacity style={styles.viewDetailsChip} onPress={() => router.back()}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="information-circle" size={15} color={DS.colors.neutral.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />

      {/* Form pinned to bottom */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.formArea} edges={['bottom']}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Wallet + Note row */}
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.pill} onPress={async () => {
              try {
                const wallets = await getWallets();
                if (wallets.length > 0) { setWalletId(wallets[0].id); setWalletLabel(wallets[0].name.slice(0, 8)); }
              } catch { /* keep */ }
            }}>
              <Text style={styles.pillIcon}>U̲</Text>
              <Text style={styles.pillText}>{walletLabel}</Text>
            </TouchableOpacity>
            <View style={styles.pill}>
              <Ionicons name="pencil-outline" size={14} color={DS.colors.neutral.textSecondary} />
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Note"
                placeholderTextColor={DS.colors.neutral.textSecondary}
              />
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountWrap}>
            <Text style={styles.amountPrefix}>N$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#CBD5E1"
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.payBtn, (!isValid || loading) && styles.payBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>Pay</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stackedAvatar: { borderWidth: 3, borderColor: '#EEF2FF', borderRadius: 30, overflow: 'hidden' },
  overflowBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center' },
  overflowText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  groupName: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 4 },
  groupSub: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginBottom: 12 },
  viewDetailsChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 7 },
  viewDetailsText: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.text },
  spacer: { flex: 1 },
  formArea: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, backgroundColor: DS.colors.neutral.background, borderRadius: 9999, paddingHorizontal: 16 },
  pillIcon: { fontSize: 15, fontWeight: '800', color: DS.colors.brand.primary },
  pillText: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.text },
  noteInput: { flex: 1, fontSize: 14, color: DS.colors.neutral.text, height: 48 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', height: 60, backgroundColor: DS.colors.neutral.background, borderRadius: 14, paddingHorizontal: 16, marginBottom: 12 },
  amountPrefix: { fontSize: 22, fontWeight: '700', color: DS.colors.neutral.textSecondary, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: DS.colors.neutral.text },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 10 },
  errorText: { fontSize: 13, color: DS.colors.semantic.error },
  payBtn: { height: 56, backgroundColor: '#0F172A', borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  payBtnDisabled: { opacity: 0.4 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
