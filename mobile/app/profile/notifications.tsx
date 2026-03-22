/**
 * Notifications – Buffr G2P.
 * §3.5 / §3.6 Notification Center. List + empty state "No notifications yet."
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type NotificationItem = { id: string; title: string; body: string; time: string; read: boolean };

async function fetchNotifications(): Promise<NotificationItem[]> {
  if (!API_BASE_URL) return [];
  
  try {
    const token = await getSecureItem('buffr_access_token');
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/notifications`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.notifications ?? [];
    }
  } catch (e) {
    console.error('Failed to fetch notifications:', e);
  }
  return [];
}

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = useCallback(async () => {
    const data = await fetchNotifications();
    setNotifications(data);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designSystem.colors.brand.primary} />}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={56} color={designSystem.colors.neutral.textTertiary} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyDesc}>When you get vouchers, reminders, or updates, they’ll show here.</Text>
            </View>
          ) : (
            notifications.map((n) => (
              <TouchableOpacity key={n.id} style={[styles.card, !n.read && styles.cardUnread]} activeOpacity={0.8}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{n.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.cardTime}>{n.time}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginTop: 16 },
  emptyDesc: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: designSystem.colors.brand.primary },
  cardContent: {},
  cardTitle: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text },
  cardBody: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 4 },
  cardTime: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textTertiary, marginTop: 8 },
});
