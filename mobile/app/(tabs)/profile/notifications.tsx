/**
 * Notifications – Buffr G2P.
 * §3.5 / §3.6 Notification Center. Preference toggles (persisted) + inbox from API only.
 * Location: app/(tabs)/profile/notifications.tsx
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { getSecureItem } from '@/services/secureStorage';
import { ErrorState } from '@/components/ui';
import { usePullToRefresh } from '@/hooks';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PREFERENCES_KEY = 'buffr_notification_preferences';

export type NotifPrefKey = 'voucher' | 'payment' | 'security' | 'system' | 'reminder';

export interface NotificationPreferences {
  voucher: boolean;
  payment: boolean;
  security: boolean;
  system: boolean;
  reminder: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  voucher: true,
  payment: true,
  security: true,
  system: true,
  reminder: true,
};

async function loadPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS };
}

async function savePreferences(prefs: NotificationPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('savePreferences failed', e);
  }
}

type NotifType = NotifPrefKey;

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

async function loadNotificationsFromAPI(): Promise<NotifItem[]> {
  if (!API_BASE_URL) return [];
  try {
    const token = await getSecureItem('buffr_access_token');
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/notifications`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { notifications?: Array<{ id: string; type?: string; title?: string; message?: string; body?: string; read?: boolean; created_at?: string; date?: string }> };
    const list = data.notifications ?? [];
    return list.map((n) => ({
      id: n.id,
      type: (n.type as NotifType) ?? 'system',
      title: n.title ?? '',
      body: n.message ?? n.body ?? '',
      time: n.created_at ?? n.date ?? new Date().toISOString(),
      read: n.read ?? false,
    }));
  } catch {
    return [];
  }
}

async function markReadAPI(id: string | 'all'): Promise<void> {
  if (!API_BASE_URL) return;
  try {
    const token = await getSecureItem('buffr_access_token');
    if (id === 'all') {
      await fetch(`${API_BASE_URL}/api/v1/mobile/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } else {
      await fetch(`${API_BASE_URL}/api/v1/mobile/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    }
  } catch { /* ignore */ }
}

async function loadNotifications(): Promise<NotifItem[]> {
  return loadNotificationsFromAPI();
}

async function markRead(id: string | 'all', notifs: NotifItem[]): Promise<NotifItem[]> {
  const updated = notifs.map(n => id === 'all' || n.id === id ? { ...n, read: true } : n);
  await markReadAPI(id);
  return updated;
}

export default function NotificationsScreen() {
  useUser();
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [data, prefsData] = await Promise.all([loadNotifications(), loadPreferences()]);
    setNotifs(data);
    setPrefs(prefsData);
    setLoading(false);
  }, []);

  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: load,
  });

  useEffect(() => { load(); }, [load]);

  const handlePrefToggle = useCallback((key: NotifPrefKey, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePreferences(next);
  }, [prefs]);

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
          {/* Notification preferences – persisted to AsyncStorage */}
          <View style={styles.prefsSection}>
            <Text style={styles.prefsTitle}>Notification preferences</Text>
            <Text style={styles.prefsSubtitle}>Choose which types you want to receive.</Text>
            {(['voucher', 'payment', 'security', 'system', 'reminder'] as NotifPrefKey[]).map((key, index) => {
              const cfg = TYPE_CONFIG[key];
              const label = key === 'voucher' ? 'Vouchers' : key === 'payment' ? 'Payments' : key === 'security' ? 'Security' : key === 'system' ? 'System' : 'Reminders';
              return (
                <View key={key} style={[styles.prefRow, index === 0 && styles.prefRowFirst]}>
                  <View style={[styles.prefIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as never} size={18} color={cfg.color} />
                  </View>
                  <Text style={styles.prefLabel}>{label}</Text>
                  <Switch
                    value={prefs[key]}
                    onValueChange={(v) => handlePrefToggle(key, v)}
                    trackColor={{ false: designSystem.colors.neutral.border, true: designSystem.colors.brand.primaryMuted }}
                    thumbColor={prefs[key] ? designSystem.colors.brand.primary : designSystem.colors.neutral.surface}
                  />
                </View>
              );
            })}
          </View>

          <Text style={styles.recentTitle}>Recent</Text>
          {!loading && notifs.length === 0 && (
            <ErrorState
              variant="empty"
              title="No notifications yet"
              message="When you get vouchers, reminders, or updates, they'll show here."
              style={{ marginTop: 40 }}
            />
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

  prefsSection: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 20,
  },
  prefsTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, fontWeight: '600', marginBottom: 4 },
  prefsSubtitle: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginBottom: 12 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: designSystem.colors.neutral.border,
  },
  prefRowFirst: { borderTopWidth: 0 },
  prefIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prefLabel: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, flex: 1 },
  recentTitle: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' },

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
