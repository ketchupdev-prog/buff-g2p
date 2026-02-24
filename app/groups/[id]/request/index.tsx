/**
 * Group Request – Buffr G2P. §3.6 screen 47c-iii.
 * "Request Details" screen – gradient group header + bottom form. Matches Figma design.
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
import { TwoFAModal } from '@/components/modals';

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

async function postGroupRequest(groupId: string, amount: number, note: string, pin?: string): Promise<{ success: boolean; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${groupId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ amount, note, ...(pin != null && { pin }) }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) return { success: true };
      return { success: false, error: data.error };
    } catch { /* fall through */ }
  }
  const key = `buffr_group_requests_${groupId}`;
  const stored = await AsyncStorage.getItem(key);
  const existing = stored ? JSON.parse(stored) as object[] : [];
  existing.unshift({ id: `gr_${Date.now()}`, amount, note, status: 'pending', paidCount: 0, createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(key, JSON.stringify(existing));
  return { success: true };
}

export default function GroupRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [show2FA, setShow2FA] = useState(false);

  useEffect(() => {
    fetchGroupInfo(id ?? '').then(setGroup).catch(() => {});
  }, [id]);

  const amountNum = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const isValid = amountNum > 0;

  async function handleSubmitWithPin(pin: string) {
    const result = await postGroupRequest(id ?? '', amountNum, note, pin);
    if (result.success) {
      setShow2FA(false);
      router.replace({ pathname: '/groups/[id]/request/success', params: { id: id ?? '', amount: amountNum.toFixed(2) } } as never);
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  function handleRequestPress() {
    if (!isValid || loading) return;
    setError(null);
    setShow2FA(true);
  }

  const visibleMembers = (group?.members ?? []).slice(0, 3);
  const overflow = Math.max(0, (group?.memberCount ?? 0) - 3);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{
        title: 'Request Details',
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

          {/* Note */}
          <View style={[styles.pill, styles.notePill]}>
            <Ionicons name="pencil-outline" size={14} color={DS.colors.neutral.textSecondary} />
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Note"
              placeholderTextColor={DS.colors.neutral.textSecondary}
              editable={!loading}
            />
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
            style={[styles.requestBtn, (!isValid || loading) && styles.requestBtnDisabled]}
            onPress={handleRequestPress}
            disabled={!isValid || loading}
          >
            <Text style={styles.requestBtnText}>Request</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <TwoFAModal
        visible={show2FA}
        onClose={() => setShow2FA(false)}
        onVerify={handleSubmitWithPin}
        title="Verify group request"
        subtitle="Enter your 6-digit PIN to confirm"
      />
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
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, backgroundColor: DS.colors.neutral.background, borderRadius: 9999, paddingHorizontal: 16 },
  notePill: { marginBottom: 10 },
  noteInput: { flex: 1, fontSize: 14, color: DS.colors.neutral.text, height: 48 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', height: 60, backgroundColor: DS.colors.neutral.background, borderRadius: 14, paddingHorizontal: 16, marginBottom: 12 },
  amountPrefix: { fontSize: 22, fontWeight: '700', color: DS.colors.neutral.textSecondary, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: DS.colors.neutral.text },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 10 },
  errorText: { fontSize: 13, color: DS.colors.semantic.error },
  requestBtn: { height: 56, backgroundColor: '#0F172A', borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  requestBtnDisabled: { opacity: 0.4 },
  requestBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
