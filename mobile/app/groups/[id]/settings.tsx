/**
 * Group Settings – Buffr G2P. §3.12 screen 47c-v.
 * POV: Admin (edit name, add/remove members, deactivate self) vs Member (read-only, deactivate self only).
 * Deactivating members, adding members, pill + avatars per Figma.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { getSecureItem } from '@/services/secureStorage';
import { Avatar } from '@/components/ui';

const DS = designSystem;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const STORAGE_KEY_GROUP_MEMBERS = 'buffr_group_settings_members_';

interface GroupMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
  isCurrentUser?: boolean;
  phone?: string;
}

interface GroupSettingsData {
  name: string;
  members: GroupMember[];
  memberCount: number;
  isAdmin: boolean;
}

const DEFAULT_MEMBERS: GroupMember[] = [
  { id: 'm1', name: 'Stephanie Nakale', role: 'member' },
  { id: 'm2', name: 'Florence Nandago', role: 'member' },
  { id: 'm3', name: 'Prudence Shapwa', role: 'member' },
  { id: 'm4', name: 'Shilunga Shikongo', role: 'member' },
  { id: 'm5', name: 'Eino Nashikoto', role: 'admin', isCurrentUser: true },
];

async function fetchGroupSettings(id: string): Promise<GroupSettingsData> {
  if (API_BASE_URL) {
    try {
      const token = await getSecureItem('buffr_access_token');
      const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${id}`, { headers: h });
      if (res.ok) {
        const data = (await res.json()) as { name?: string; members?: GroupMember[]; memberCount?: number; isAdmin?: boolean };
        return {
          name: data.name ?? 'Group',
          members: (data.members ?? []).map(m => ({ ...m, isCurrentUser: m.role === 'admin' })),
          memberCount: data.memberCount ?? 0,
          isAdmin: data.isAdmin ?? true,
        };
      }
    } catch { /* fall through */ }
  }
  // Offline: use persisted list if any, else defaults and seed storage
  let members: GroupMember[];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_GROUP_MEMBERS + id);
    if (raw) {
      members = JSON.parse(raw) as GroupMember[];
      if (!members.some(m => m.isCurrentUser)) members.forEach((m, i) => { if (m.role === 'admin') (members as GroupMember[])[i] = { ...m, isCurrentUser: true }; });
    } else {
      members = [...DEFAULT_MEMBERS];
      await AsyncStorage.setItem(STORAGE_KEY_GROUP_MEMBERS + id, JSON.stringify(members));
    }
  } catch {
    members = [...DEFAULT_MEMBERS];
  }
  return {
    name: 'Group of 5',
    memberCount: members.length,
    members,
    isAdmin: members.some(m => m.isCurrentUser && m.role === 'admin'),
  };
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetchGroupSettings(id ?? '').then(s => {
      setName(s.name);
      setMembers(s.members);
      setIsAdmin(s.isAdmin);
    }).catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { if (id) load(); }, [id, load]));

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (API_BASE_URL) {
        const h = await getAuthHeader();
        await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...h },
          body: JSON.stringify({ name }),
        });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function persistMembers(next: GroupMember[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_GROUP_MEMBERS + id, JSON.stringify(next));
    } catch { /* ignore */ }
  }

  function handleRemoveMember(memberId: string) {
    const member = members.find(m => m.id === memberId);
    if (!member || member.isCurrentUser) return;
    Alert.alert('Deactivate User?', 'After deactivating this user will no longer be a member.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          const next = members.filter(m => m.id !== memberId);
          setMembers(next);
          persistMembers(next);
        },
      },
    ]);
  }

  function handleDeactivate() {
    Alert.alert('Deactivate User?', 'After deactivating you will no longer be a member of this group.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => router.replace('/(tabs)' as never) },
    ]);
  }

  const visibleAvatars = members.slice(0, 5);
  const canEdit = isAdmin;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{
        title: 'Group Settings',
        headerTintColor: DS.colors.neutral.text,
        headerStyle: { backgroundColor: '#fff' },
        headerRight: canEdit ? () => (
          <TouchableOpacity onPress={handleSave} style={{ marginRight: 16 }} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={DS.colors.brand.primary} />
              : <Ionicons name="checkmark" size={24} color={DS.colors.brand.primary} />}
          </TouchableOpacity>
        ) : undefined,
      }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Pill with contact avatars/initials – Figma Group Settings */}
          <View style={styles.avatarSection}>
            <View style={styles.pillWrap}>
              <View style={styles.avatarStack}>
                {visibleAvatars.map((m, i) => (
                  <View key={m.id} style={[styles.stackedAvatar, { marginLeft: i === 0 ? 0 : -14, zIndex: 10 - i }]}>
                    <Avatar name={m.name} size={48} />
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Group name – editable for admin, read-only for member */}
          <Text style={styles.fieldLabel}>Group Name</Text>
          {canEdit ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              placeholderTextColor="#94A3B8"
            />
          ) : (
            <View style={styles.nameReadOnly}>
              <Text style={styles.nameReadOnlyText}>{name || 'Group'}</Text>
            </View>
          )}

          {/* Members – each row as pill; admin can deactivate others */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Members ({members.length})</Text>
            {canEdit && (
              <TouchableOpacity
                style={styles.addMembersBtn}
                onPress={() => router.push({ pathname: '/groups/[id]/add-members', params: { id: id ?? '' } } as never)}
              >
                <Ionicons name="person-add-outline" size={18} color={DS.colors.brand.primary} />
                <Text style={styles.addMembersText}>Add members</Text>
              </TouchableOpacity>
            )}
          </View>
          {members.map((m) => (
            <View key={m.id} style={styles.memberPill}>
              <Avatar name={m.name} size={44} />
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  {m.isCurrentUser && <Text style={styles.youLabel}> (You)</Text>}
                </View>
                {m.isCurrentUser && m.role === 'admin' && (
                  <Text style={styles.ownerLabel}>Owner</Text>
                )}
                {!m.isCurrentUser && m.role === 'admin' && (
                  <Text style={styles.ownerLabel}>Admin</Text>
                )}
              </View>
              {canEdit && !m.isCurrentUser && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveMember(m.id)}>
                  <View style={styles.removeBtnCircle}>
                    <Ionicons name="remove" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Deactivate yourself – all members */}
          <TouchableOpacity style={styles.deactivateBtn} onPress={handleDeactivate}>
            <Text style={styles.deactivateBtnText}>Deactivate Yourself</Text>
            <Ionicons name="remove-circle" size={18} color={DS.colors.semantic.error} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  pillWrap: {
    backgroundColor: '#fff',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackedAvatar: { borderWidth: 2, borderColor: '#fff', borderRadius: 26, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: DS.colors.neutral.border, marginBottom: 24, marginHorizontal: 20 },
  fieldLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginBottom: 8, paddingHorizontal: 20 },
  nameInput: {
    height: 52, backgroundColor: '#fff', borderRadius: 9999,
    paddingHorizontal: 20, fontSize: 16, color: DS.colors.neutral.text,
    marginBottom: 28, marginHorizontal: 20,
    borderWidth: 1, borderColor: DS.colors.neutral.border,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  addMembersBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 },
  addMembersText: { fontSize: 13, fontWeight: '600', color: DS.colors.brand.primary },
  nameReadOnly: { height: 52, marginBottom: 28, marginHorizontal: 20, justifyContent: 'center', paddingHorizontal: 20 },
  nameReadOnlyText: { fontSize: 16, color: DS.colors.neutral.text },
  memberPill: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 9999, marginHorizontal: 20, marginBottom: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  youLabel: { fontSize: 15, color: DS.colors.neutral.textSecondary },
  ownerLabel: { fontSize: 13, color: DS.colors.brand.primary, fontWeight: '600', marginTop: 2 },
  removeBtn: { padding: 4 },
  removeBtnCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  deactivateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 32, height: 52,
    borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.semantic.error,
    backgroundColor: '#FFF5F5',
  },
  deactivateBtnText: { fontSize: 15, fontWeight: '600', color: DS.colors.semantic.error },
});
