/**
 * Notifications – Buffr G2P.
 * §3.5 / §3.6 Notification Center. Loads from AsyncStorage with seeded data.
 * Uses UserContext for state consistency.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

const STORAGE_KEY = 'buffr_notifications';

type NotifType = 'voucher' | 'payment' | 'security' | 'system' | 'reminder';

interface NotifItem {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string; // ISO string
  read: boolean;
}

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; bg: string }> = {
  voucher:  { icon: 'gift-outline',              color: '#D97706', bg: '#FFFBEB' },
  payment:  { icon: 'arrow-down-circle-outline', color: designSystem.colors.semantic.success, bg: '#F0FDF4' },
  security: { icon: 'shield-checkmark-outline',  color: '#7C3AED', bg: '#F5F3FF' },
  system:   { icon: 'information-circle-outline',color: designSystem.colors.brand.primary,    bg: designSystem.colors.brand.primaryMuted },
  reminder: { icon: 'time-outline',              color: '#64748B', bg: '#F1F5F9' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' });
}

// Seed notifications relative to now
function buildSeedNotifications(): NotifItem[] {
  const now = Date.now();
  const h = (n: number) => new Date(now - n * 3600000).toISOString();
  return [
    {
      id: 'n1',
      type: 'voucher',
      title: 'Child Support Voucher ready',
      body: 'Your N$750.00 Child Support Grant voucher is available. Redeem at any NamPost branch or SmartPay agent.',
      time: h(2),
      read: false,
    },
    {
      id: 'n2',
      type: 'payment',
      title: 'Payment received',
      body: 'Lucia Aukongo sent you N$200.00. Your wallet balance has been updated.',
      time: h(6),
      read: false,
    },
    {
      id: 'n3',
      type: 'security',
      title: 'New login detected',
      body: 'A login was detected on your account. If this wasn\'t you, contact support immediately.',
      time: h(24),
      read: true,
    },
    {
      id: 'n4',
      type: 'reminder',
      title: 'Proof of life due soon',
      body: 'Your quarterly identity verification is due in 14 days. Keep your account active by verifying.',
      time: h(48),
      read: true,
    },
    {
      id: 'n5',
      type: 'payment',
      title: 'Bill payment confirmed',
      body: 'Your NamPower prepaid electricity payment of N$150.00 was successful. Token: 1234 5678 9012 3456 7890.',
      time: h(72),
      read: true,
    },
    {
      id: 'n6',
      type: 'system',
      title: 'Welcome to Buffr',
      body: 'Your account is set up and ready. You can now receive government vouchers, send money, and pay bills.',
      time: h(168),
      read: true,
    },
  ];
}

async function loadNotifications(): Promise<NotifItem[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as NotifItem[];
    // First launch — seed
    const seed = buildSeedNotifications();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  } catch { return buildSeedNotifications(); }
}

async function markRead(id: string | 'all', notifs: NotifItem[]): Promise<NotifItem[]> {
  const updated = notifs.map(n => id === 'all' || n.id === id ? { ...n, read: true } : n);
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}

export default function NotificationsScreen() {
  useUser();
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await loadNotifications();
    setNotifs(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const handleTap = useCallback(async (id: string) => {
    const updated = await markRead(id, notifs);
    setNotifs(updated);
  }, [notifs]);

  const handleMarkAll = useCallback(async () => {
    const updated = await markRead('all', notifs);
    setNotifs(updated);
  }, [notifs]);

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designSystem.colors.brand.primary} />}
        >
          {!loading && notifs.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={56} color={designSystem.colors.neutral.textTertiary} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyDesc}>
                When you get vouchers, reminders, or updates, they'll show here.
              </Text>
            </View>
          )}

          {notifs.map((n) => {
            const cfg = TYPE_CONFIG[n.type];
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                activeOpacity={0.8}
                onPress={() => handleTap(n.id)}
              >
                <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as never} size={20} color={cfg.color} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.cardBody} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.cardTime}>{relativeTime(n.time)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text, flex: 1 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: designSystem.colors.brand.primaryMuted, borderRadius: 9999 },
  markAllText: { fontSize: 12, fontWeight: '700', color: designSystem.colors.brand.primary },

  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16 },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginTop: 16 },
  emptyDesc: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: designSystem.colors.brand.primary,
    backgroundColor: '#F8FAFF',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardTitle: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: designSystem.colors.brand.primary, flexShrink: 0 },
  cardBody: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, lineHeight: 18 },
  cardTime: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textTertiary, marginTop: 6 },
});
