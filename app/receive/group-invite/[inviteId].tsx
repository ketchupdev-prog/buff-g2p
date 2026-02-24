/**
 * Group Invite – Buffr G2P.
 * Accept or decline a group membership invitation received via deep link.
 * §6.3 group invite flow.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { Avatar } from '@/components/ui';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await AsyncStorage.getItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

interface GroupInvite {
  groupId: string;
  groupName: string;
  inviterName: string;
  inviterPhone: string;
  purpose?: string;
  memberCount: number;
  createdAt: string;
}

async function fetchInvite(inviteId: string): Promise<GroupInvite | null> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/invites/${inviteId}`, { headers: { 'Content-Type': 'application/json', ...h } });
      if (res.ok) return (await res.json()) as GroupInvite;
    } catch { /* fall through */ }
  }
  // Seed invite for demo
  return {
    groupId: 'grp_' + inviteId,
    groupName: 'Savings Circle',
    inviterName: 'Maria Ndapewa',
    inviterPhone: '+264 81 234 5678',
    purpose: 'Monthly savings and emergency fund',
    memberCount: 6,
    createdAt: new Date().toISOString(),
  };
}

async function respondToInvite(inviteId: string, accept: boolean): Promise<{ success: boolean }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/invites/${inviteId}/${accept ? 'accept' : 'decline'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) return { success: true };
    } catch { /* fall through */ }
  }
  return { success: true };
}

export default function GroupInviteScreen() {
  const { inviteId } = useLocalSearchParams<{ inviteId: string }>();
  const [invite, setInvite] = useState<GroupInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    fetchInvite(inviteId ?? '').then(setInvite).finally(() => setLoading(false));
  }, [inviteId]);

  async function respond(accept: boolean) {
    setSubmitting(true);
    await respondToInvite(inviteId ?? '', accept);
    setSubmitting(false);
    setDone(accept ? 'accepted' : 'declined');
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={designSystem.colors.brand.primary} /></View>;

  if (done) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <View style={[styles.doneIcon, { backgroundColor: done === 'accepted' ? '#D1FAE5' : '#FEE2E2' }]}>
              <Ionicons name={done === 'accepted' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={40} color={done === 'accepted' ? '#22C55E' : '#E11D48'} />
            </View>
            <Text style={styles.doneTitle}>{done === 'accepted' ? 'Welcome to the group!' : 'Invitation declined'}</Text>
            <Text style={styles.doneSub}>{done === 'accepted' ? `You've joined ${invite?.groupName}.` : 'You can always join later if invited again.'}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(tabs)' as never)}>
              <Text style={styles.btnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Group Invitation', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Invite hero */}
          <View style={styles.heroCard}>
            <View style={styles.groupIcon}>
              <Ionicons name="people-outline" size={32} color={designSystem.colors.brand.primary} />
            </View>
            <Text style={styles.groupName}>{invite?.groupName}</Text>
            {invite?.purpose ? <Text style={styles.groupPurpose}>{invite.purpose}</Text> : null}
            <View style={styles.memberBadge}>
              <Ionicons name="person-outline" size={14} color={designSystem.colors.neutral.textSecondary} />
              <Text style={styles.memberBadgeText}>{invite?.memberCount} member{(invite?.memberCount ?? 0) !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Inviter */}
          <View style={styles.inviterCard}>
            <Text style={styles.inviterLabel}>Invited by</Text>
            <View style={styles.inviterRow}>
              <Avatar name={invite?.inviterName ?? '?'} size={44} />
              <View>
                <Text style={styles.inviterName}>{invite?.inviterName}</Text>
                <Text style={styles.inviterPhone}>{invite?.inviterPhone}</Text>
              </View>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
            <Text style={styles.infoText}>Joining a group allows members to send money, track shared expenses, and participate in savings pools.</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.acceptBtn, submitting && styles.btnDisabled]} onPress={() => respond(true)} disabled={submitting} activeOpacity={0.9}>
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="checkmark-outline" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.acceptBtnText}>Accept Invitation</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.declineBtn, submitting && styles.btnDisabled]} onPress={() => respond(false)} disabled={submitting} activeOpacity={0.9}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  content: { padding: 24, paddingBottom: 40 },
  heroCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: DS.colors.neutral.border },
  groupIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  groupName: { fontSize: 22, fontWeight: '800', color: DS.colors.neutral.text, marginBottom: 8 },
  groupPurpose: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 12 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: DS.colors.neutral.background, borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 6 },
  memberBadgeText: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  inviterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: DS.colors.neutral.border },
  inviterLabel: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  inviterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviterName: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text },
  inviterPhone: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#DBEAFE', borderRadius: 12, padding: 14, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 18 },
  actions: { gap: 12 },
  acceptBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  acceptBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  declineBtn: { height: 56, borderWidth: 1.5, borderColor: DS.colors.neutral.border, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  declineBtnText: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  btnDisabled: { opacity: 0.5 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 8, textAlign: 'center' },
  doneSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 28 },
  btn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
