/**
 * Groups list – Buffr G2P.
 * Entry point for groups: list user's groups + CTA to Create Group.
 * §3.6 screen 47b/c; design ref: Buffr App Design (Group View, Create Group).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { getSecureItem } from '@/services/secureStorage';
import { Avatar } from '@/components/ui';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

interface GroupSummary {
  id: string;
  name: string;
  purpose?: string;
  balance: number;
  memberCount: number;
  maxMembers: number;
}

async function fetchGroups(): Promise<GroupSummary[]> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups`, {
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) {
        const data = (await res.json()) as { groups?: GroupSummary[] };
        return data.groups ?? [];
      }
    } catch { /* fall through */ }
  }
  return [
    { id: '1', name: 'Savings Circle', purpose: 'Monthly savings', balance: 4750, memberCount: 6, maxMembers: 20 },
    { id: '2', name: 'Family Fund', purpose: 'Household expenses', balance: 1200, memberCount: 4, maxMembers: 10 },
  ];
}

export default function GroupsListScreen() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchGroups();
      setGroups(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.createCard}
          onPress={() => router.push('/groups/create')}
          activeOpacity={0.8}
          accessibilityLabel="Create Group"
        >
          <View style={styles.createIconWrap}>
            <Ionicons name="add" size={28} color={designSystem.colors.brand.primary} />
          </View>
          <Text style={styles.createTitle}>Create Group</Text>
          <Text style={styles.createSubtitle}>Name your group and invite members</Text>
        </TouchableOpacity>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Your Groups</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={designSystem.colors.brand.primary} style={{ marginTop: 24 }} />
        ) : groups.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyDesc}>Create a group to send or request money together.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/groups/create')}>
              <Text style={styles.emptyBtnText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.groupRow}
              onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } } as never)}
              activeOpacity={0.7}
            >
              <View style={styles.groupIcon}>
                <Ionicons name="people-outline" size={24} color={designSystem.colors.brand.primary} />
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.groupMeta}>
                  {g.memberCount} members · N$ {g.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  content: { padding: 20, paddingBottom: 40 },
  createCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    borderStyle: 'dashed',
  },
  createIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DS.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  createTitle: { fontSize: 17, fontWeight: '700', color: DS.colors.neutral.text },
  createSubtitle: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginTop: 4 },
  sectionRow: { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text },
  groupMeta: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: DS.colors.neutral.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: { marginTop: 24, height: 48, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, paddingHorizontal: 24, justifyContent: 'center' },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
