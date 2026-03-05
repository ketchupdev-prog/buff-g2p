/**
 * Group Detail – Buffr G2P. §3.6 screen 47c.
 * Horizontal member card, request cards with status, group activity from API.
 * Design matches Figma: blue gradient bg, per-member pill, ✓/⏱ status icons.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getSecureItem } from '@/services/secureStorage';
import { designSystem } from '@/constants/designSystem';
import { Avatar, ErrorState, LoadingState } from '@/components/ui';
import { RequestStatusModal, type GroupRequestStatus } from '@/components/group/RequestStatusModal';
import { usePullToRefresh } from '@/hooks';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const DS = designSystem;

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

interface GroupMember {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
}

interface GroupActivity {
  id: string;
  memberName: string;
  amount: number;
  type: 'contribution' | 'request';
  note?: string;
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
  memberCount: number;
  members: GroupMember[];
  isAdmin: boolean;
  /** When set, show "Created by {creatorName}" instead of "Created by You" for non-creator */
  creatorName?: string;
}

async function fetchGroup(id: string): Promise<Group | null> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${id}`, {
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) return (await res.json()) as Group;
      if (res.status === 404) return null;
    } catch { /* fall through */ }
  }
  return null;
}

async function loadActivity(groupId: string): Promise<GroupActivity[]> {
  if (!API_BASE_URL) return [];
  try {
    const h = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${groupId}/activity`, { headers: h });
    if (!res.ok) return [];
    const data = (await res.json()) as { activity?: GroupActivity[] };
    const list = Array.isArray(data?.activity) ? data.activity : [];
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch { return []; }
}

/** Load group requests from API; returns empty array when no API or no endpoint. */
async function loadRequests(groupId: string): Promise<GroupRequestStatus[]> {
  if (!API_BASE_URL) return [];
  try {
    const h = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${groupId}/requests`, { headers: h });
    if (!res.ok) return [];
    const data = (await res.json()) as { requests?: GroupRequestStatus[] };
    return Array.isArray(data?.requests) ? data.requests : [];
  } catch { return []; }
}

function formatFullDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' • ' + d.toLocaleTimeString('en-NA', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return iso; }
}

function formatTimeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [requests, setRequests] = useState<GroupRequestStatus[]>([]);
  const [activity, setActivity] = useState<GroupActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<GroupRequestStatus | null>(null);

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const g = await fetchGroup(id);
      const [reqs, acts] = await Promise.all([loadRequests(id), loadActivity(id)]);
      setGroup(g);
      setRequests(reqs);
      setActivity(acts);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [id]);

  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: loadAll,
  });

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Refresh when screen comes back into focus (after send/request)
  useFocusEffect(useCallback(() => {
    if (!loading) void loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]));

  if (loading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LoadingState message="Loading group..." />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Group', headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
        <ErrorState
          variant="notFound"
          title="Group not found"
          message="This group may have been deleted or you no longer have access."
          action={{ label: 'Go Back', onPress: () => router.back() }}
          style={{ marginTop: 100 }}
        />
      </View>
    );
  }

  const visibleAvatars = group.members.slice(0, 3);
  const overflow = group.memberCount - 3;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{
        headerShown: true,
        headerTitle: 'Group',
        headerTintColor: DS.colors.neutral.text,
        headerStyle: { backgroundColor: '#fff' },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/groups/[id]/settings', params: { id: id ?? '' } } as never)}
            style={styles.headerIconBtn}
          >
            <Ionicons name="settings-outline" size={20} color={DS.colors.neutral.text} />
          </TouchableOpacity>
        ),
      }} />

      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView 
          contentContainerStyle={styles.scroll} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={DS.colors.brand.primary} 
            />
          }
        >

          {/* Horizontal member card */}
          <View style={styles.memberCard}>
            <View style={styles.memberAvatarStack}>
              {visibleAvatars.map((m, i) => (
                <View key={m.id} style={[styles.memberAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                  <Avatar name={m.name} size={40} />
                </View>
              ))}
              {overflow > 0 && (
                <View style={[styles.memberAvatar, styles.overflowBadge, { marginLeft: -10, zIndex: 0 }]}>
                  <Text style={styles.overflowText}>+{overflow}</Text>
                </View>
              )}
            </View>
            <View style={styles.memberCardInfo}>
              <Text style={styles.memberCardTitle}>Group of {group.memberCount}</Text>
              <Text style={styles.memberCardSub}>
              {group.isAdmin ? 'Created by You' : (group.creatorName ? `Created by ${group.creatorName}` : 'Member')}
            </Text>
            </View>
          </View>

          {/* Requests section */}
          {requests.length === 0 ? (
            <View style={styles.noteSection}>
              <Text style={styles.noteHeading}>Note!</Text>
              <Text style={styles.noteDesc}>Every transaction in the group will get split equally amongst everyone.</Text>
            </View>
          ) : (
            <View style={styles.cardsArea}>
              {requests.map((req) => {
                const isCollected = req.paidCount >= req.totalMembers;
                const paidMembers = req.contributions.filter(c => c.status === 'Paid');
                return (
                  <TouchableOpacity
                    key={req.id}
                    style={[styles.reqCard, isCollected ? styles.reqCardCollected : styles.reqCardPending]}
                    onPress={() => setSelectedRequest(req)}
                    activeOpacity={0.85}
                  >
                    {/* Amount + status icon */}
                    <View style={styles.reqCardTop}>
                      <Text style={styles.reqAmount}>N${req.amount.toLocaleString()}</Text>
                      <View style={[styles.reqStatusCircle, isCollected ? styles.reqStatusGreen : styles.reqStatusAmber]}>
                        <Ionicons
                          name={isCollected ? 'checkmark' : 'time-outline'}
                          size={14}
                          color={isCollected ? '#16A34A' : '#D97706'}
                        />
                      </View>
                    </View>

                    {req.note ? <Text style={styles.reqNote}>{req.note}</Text> : null}

                    {/* Per-member pill */}
                    <View style={styles.perMemberPill}>
                      <Ionicons name="people" size={13} color={DS.colors.brand.primary} />
                      <Text style={styles.perMemberText}>N${req.perMemberAmount} Each member</Text>
                    </View>

                    {/* Paid member mini-avatars + View status for pending */}
                    {!isCollected && (
                      <View style={styles.reqPaidRow}>
                        <View style={styles.miniAvatarStack}>
                          {paidMembers.slice(0, 3).map((c, i) => (
                            <View key={c.memberId} style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }]}>
                              <Avatar name={c.name} size={24} />
                            </View>
                          ))}
                        </View>
                        <TouchableOpacity onPress={() => setSelectedRequest(req)}>
                          <Text style={styles.viewStatusText}>View status →</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.reqDivider} />
                    <Text style={styles.reqDate}>{formatFullDate(req.date)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Recent Activity – from API */}
          {activity.length > 0 && (
            <View style={styles.activitySection}>
              <Text style={styles.sectionLabel}>Recent Activity</Text>
              {activity.map(item => (
                <View key={item.id} style={styles.activityRow}>
                  <View style={[styles.activityDot, { backgroundColor: item.type === 'request' ? '#DBEAFE' : '#DCFCE7' }]}>
                    <Ionicons
                      name={item.type === 'request' ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={14}
                      color={item.type === 'request' ? DS.colors.brand.primary : '#16A34A'}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>
                      {item.memberName} {item.type === 'contribution' ? 'contributed' : 'requested'} N${item.amount.toLocaleString()}
                    </Text>
                    {item.note ? <Text style={styles.activityNote}>{item.note}</Text> : null}
                    <Text style={styles.activityTime}>{formatTimeAgo(item.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        <RequestStatusModal
          visible={selectedRequest !== null}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
        />

        {/* Bottom: wave + Send + Request */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.waveBtn} activeOpacity={0.7}>
            <Text style={styles.waveEmoji}>👋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => router.push({ pathname: '/groups/[id]/send', params: { id: id ?? '' } } as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.requestBtn}
            onPress={() => router.push({ pathname: '/groups/[id]/request', params: { id: id ?? '' } } as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.requestBtnText}>Request</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.text, marginBottom: 20 },
  btn: { height: 48, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },

  scroll: { paddingBottom: 8 },

  // Member card – pill shape
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 9999, marginHorizontal: 16, marginTop: 16, marginBottom: 0,
    paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  memberAvatarStack: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: { borderWidth: 2, borderColor: '#fff', borderRadius: 22, overflow: 'hidden' },
  overflowBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center' },
  overflowText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  memberCardInfo: { flex: 1 },
  memberCardTitle: { fontSize: 16, fontWeight: '700', color: DS.colors.neutral.text },
  memberCardSub: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginTop: 2 },

  // Note / empty state
  noteSection: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  noteHeading: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 8 },
  noteDesc: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Cards area – blue gradient background
  cardsArea: { backgroundColor: '#EEF2FF', marginTop: 0, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8 },

  // Request card
  reqCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  reqCardCollected: { borderWidth: 1, borderColor: '#E2E8F0' },
  reqCardPending: { borderWidth: 1.5, borderColor: DS.colors.brand.primary + '40', borderStyle: 'dashed' },
  reqCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  reqAmount: { fontSize: 22, fontWeight: '700', color: DS.colors.brand.primary },
  reqStatusCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  reqStatusGreen: { backgroundColor: '#DCFCE7' },
  reqStatusAmber: { backgroundColor: '#FEF9C3' },
  reqNote: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginBottom: 10 },
  perMemberPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: DS.colors.brand.primary, borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  perMemberText: { fontSize: 13, fontWeight: '600', color: DS.colors.brand.primary },
  reqPaidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  miniAvatarStack: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: { borderWidth: 1.5, borderColor: '#EEF2FF', borderRadius: 13, overflow: 'hidden' },
  viewStatusText: { fontSize: 13, fontWeight: '600', color: DS.colors.brand.primary },
  reqDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 8 },
  reqDate: { fontSize: 12, color: DS.colors.neutral.textTertiary },

  // Activity section
  activitySection: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  activityDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.text },
  activityNote: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 1 },
  activityTime: { fontSize: 11, color: DS.colors.neutral.textTertiary, marginTop: 2 },

  // Bottom bar
  bottomBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: DS.colors.neutral.border, alignItems: 'center' },
  waveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center' },
  waveEmoji: { fontSize: 20 },
  sendBtn: { flex: 1, height: 52, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: DS.colors.neutral.border, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: DS.colors.neutral.text },
  requestBtn: { flex: 1, height: 52, borderRadius: 9999, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  requestBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
