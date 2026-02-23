/**
 * Pay Bills – Buffr G2P. §3.4. Bill categories.
 * Canonical: all billing, utilities, airtime, recharge.
 * Accepts optional ?category= param to pre-select a category.
 */
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { designSystem } from '@/constants/designSystem';
import { AppHeader } from '@/components/layout';
import { useGamification } from '@/contexts/GamificationContext';

const BILL_CATEGORIES = [
  { id: 'electricity', label: 'Electricity', icon: 'flash-outline', desc: 'NamPower, local suppliers' },
  { id: 'water',       label: 'Water',       icon: 'water-outline', desc: 'NamWater, municipalities' },
  { id: 'airtime',     label: 'Airtime / Data', icon: 'phone-portrait-outline', desc: 'MTC, Telecom, TN Mobile' },
  { id: 'insurance',   label: 'Insurance',   icon: 'shield-outline', desc: 'Motor, health, life' },
  { id: 'tv',          label: 'TV & Streaming', icon: 'tv-outline', desc: 'DStv, Showmax, Netflix' },
  { id: 'internet',    label: 'Internet',    icon: 'wifi-outline', desc: 'Broadband, fibre, LTE' },
  { id: 'tickets',     label: 'Tickets',     icon: 'ticket-outline', desc: 'Events, transport' },
  { id: 'other',       label: 'Other Bills', icon: 'document-text-outline', desc: 'Municipal rates, levies' },
];

// Map service IDs from home screen to bill categories
export const SERVICE_TO_CATEGORY: Record<string, string> = {
  mobile:        'airtime',
  recharge:      'airtime',
  tickets:       'tickets',
  subscriptions: 'tv',
  sponsored:     'other',
  insurance:     'insurance',
  internet:      'internet',
};

export default function BillsIndexScreen() {
  const { profile } = useUser();
  const { category: initialCategory } = useLocalSearchParams<{ category?: string }>();
  const { recordEvent } = useGamification();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const filtered = BILL_CATEGORIES.filter((cat) => {
    if (!search.trim()) return true;
    return (
      cat.label.toLowerCase().includes(search.toLowerCase()) ||
      cat.desc.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleCategoryPress = (catId: string) => {
    recordEvent('bill_paid');
    // TODO: navigate to specific biller within category
    // router.push(`/utilities/bills/${catId}` as never);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader
          searchPlaceholder="Search billers..."
          searchValue={search}
          onSearchChange={setSearch}
          showSearch
          showBackButton
          onBackPress={() => router.back()}
          onNotificationPress={() => router.push('/(tabs)/profile/notifications' as never)}
          onAvatarPress={() => router.push('/(tabs)/profile' as never)}
          avatarUri={profile?.photoUri ?? null}
          notificationBadge
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={designSystem.colors.brand.primary}
            />
          }
        >
          <Text style={styles.sectionTitle}>Select a Category</Text>

          {filtered.map((cat) => {
            const isHighlighted = initialCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.card, isHighlighted && styles.cardHighlighted]}
                activeOpacity={0.8}
                onPress={() => handleCategoryPress(cat.id)}
                accessibilityLabel={cat.label}
              >
                <View style={[styles.iconWrap, isHighlighted && styles.iconWrapHighlighted]}>
                  <Ionicons
                    name={cat.icon as never}
                    size={24}
                    color={isHighlighted ? '#fff' : designSystem.colors.brand.primary}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardLabel, isHighlighted && styles.cardLabelHighlighted]}>
                    {cat.label}
                  </Text>
                  <Text style={styles.cardDesc}>{cat.desc}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isHighlighted ? designSystem.colors.brand.primary : designSystem.colors.neutral.textTertiary}
                />
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No billers found</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: designSystem.colors.neutral.background,
  },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: 8,
  },
  sectionTitle: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 10,
  },
  cardHighlighted: {
    borderColor: designSystem.colors.brand.primary,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconWrapHighlighted: {
    backgroundColor: designSystem.colors.brand.primary,
  },
  cardBody: { flex: 1 },
  cardLabel: {
    ...designSystem.typography.textStyles.body,
    fontWeight: '600',
    color: designSystem.colors.neutral.text,
    marginBottom: 2,
  },
  cardLabelHighlighted: {
    color: designSystem.colors.brand.primary,
  },
  cardDesc: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 12,
  },
});
