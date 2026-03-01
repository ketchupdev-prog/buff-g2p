/**
 * Pay Bills – Buffr G2P. §3.4. Bill categories and billers.
 * Canonical: all billing, utilities, airtime, recharge.
 * Accepts optional ?category= param to pre-select a category.
 * Two-level UI: Category → Biller list within category.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { designSystem } from '@/constants/designSystem';
import { AppHeader } from '@/components/layout';

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

const BILLERS: Record<string, Array<{ id: string; name: string; desc: string; acctLabel: string }>> = {
  electricity: [
    { id: 'nampower', name: 'NamPower', desc: 'National electricity utility', acctLabel: 'Meter Number' },
    { id: 'windhoek_elec', name: 'City of Windhoek – Electricity', desc: 'Municipal electricity', acctLabel: 'Account Number' },
    { id: 'erongo_red', name: 'Erongo RED', desc: 'Erongo region electricity', acctLabel: 'Account Number' },
  ],
  water: [
    { id: 'namwater', name: 'NamWater', desc: 'National water utility', acctLabel: 'Account Number' },
    { id: 'windhoek_water', name: 'City of Windhoek – Water', desc: 'Municipal water', acctLabel: 'Account Number' },
  ],
  airtime: [
    { id: 'mtc', name: 'MTC', desc: 'Mobile Telecommunications Limited', acctLabel: 'Mobile Number' },
    { id: 'telecom', name: 'Telecom Namibia', desc: 'Landline and mobile', acctLabel: 'Account Number' },
    { id: 'tn_mobile', name: 'TN Mobile', desc: 'Budget mobile network', acctLabel: 'Mobile Number' },
  ],
  insurance: [
    { id: 'old_mutual', name: 'Old Mutual Namibia', desc: 'Life and health insurance', acctLabel: 'Policy Number' },
    { id: 'sanlam', name: 'Sanlam Namibia', desc: 'Life, motor, and home insurance', acctLabel: 'Policy Number' },
    { id: 'namflex', name: 'NamFlex', desc: 'Flexible insurance products', acctLabel: 'Policy Number' },
  ],
  tv: [
    { id: 'dstv', name: 'DStv', desc: 'Satellite TV subscription', acctLabel: 'Smart Card Number' },
    { id: 'showmax', name: 'Showmax', desc: 'African streaming service', acctLabel: 'Email Address' },
    { id: 'gotv', name: 'GOtv', desc: 'Affordable cable TV', acctLabel: 'IUC Number' },
  ],
  internet: [
    { id: 'telecom_broadband', name: 'Telecom Namibia Broadband', desc: 'ADSL and fibre internet', acctLabel: 'Account Number' },
    { id: 'paratus', name: 'Paratus Telecom', desc: 'Business and home internet', acctLabel: 'Account Number' },
    { id: 'mtc_data', name: 'MTC Data Bundle', desc: 'Mobile data bundles', acctLabel: 'Mobile Number' },
  ],
  tickets: [
    { id: 'tic', name: 'TIC Namibia', desc: 'Event and concert tickets', acctLabel: 'Booking Reference' },
    { id: 'transnamib', name: 'TransNamib Rail', desc: 'Train tickets and passes', acctLabel: 'ID Number' },
    { id: 'intercape', name: 'Intercape Bus', desc: 'Intercity bus service', acctLabel: 'Booking Reference' },
  ],
  other: [
    { id: 'wdh_rates', name: 'Windhoek Rates & Levies', desc: 'Municipal property rates', acctLabel: 'Account Number' },
    { id: 'nsfaf', name: 'NSFAF Student Loan', desc: 'Student loan repayment', acctLabel: 'Student Number' },
    { id: 'gov_fees', name: 'Government Services', desc: 'Passport, ID, license fees', acctLabel: 'Reference Number' },
  ],
};

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
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // If a category param was passed, open it immediately
  useEffect(() => {
    if (initialCategory && BILLERS[initialCategory]) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  function handleBillerPress(billerId: string, billerName: string, acctLabel: string) {
    router.push({
      pathname: '/bills/pay' as never,
      params: { billerId, billerName, category: selectedCategory ?? 'other', acctLabel },
    });
  }

  // When a category is selected, show its billers
  if (selectedCategory) {
    const cat = BILL_CATEGORIES.find(c => c.id === selectedCategory);
    const billers = BILLERS[selectedCategory] ?? [];
    const filteredBillers = search.trim()
      ? billers.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.desc.toLowerCase().includes(search.toLowerCase()))
      : billers;

    return (
      <View style={styles.screen}>
        <View style={styles.backgroundFallback} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Stack.Screen options={{ headerShown: false }} />
          <AppHeader
            searchPlaceholder={`Search ${cat?.label ?? ''} billers...`}
            searchValue={search}
            onSearchChange={setSearch}
            showSearch
            showBackButton
            onBackPress={() => { setSelectedCategory(null); setSearch(''); }}
            onNotificationPress={() => router.push('/(tabs)/profile/notifications' as never)}
            onAvatarPress={() => router.push('/(tabs)/profile' as never)}
            avatarUri={profile?.photoUri ?? null}
            notificationBadge
          />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Category header with change button */}
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryIconSmall, { backgroundColor: designSystem.colors.brand.primaryMuted }]}>
                <Ionicons name={(cat?.icon ?? 'document-text-outline') as never} size={16} color={designSystem.colors.brand.primary} />
              </View>
              <Text style={styles.categoryHeaderLabel}>{cat?.label}</Text>
              <TouchableOpacity style={styles.changeCatBtn} onPress={() => { setSelectedCategory(null); setSearch(''); }}>
                <Text style={styles.changeCatText}>Change</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Select a Biller</Text>

            {filteredBillers.map((biller) => (
              <TouchableOpacity
                key={biller.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleBillerPress(biller.id, biller.name, biller.acctLabel)}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={(cat?.icon ?? 'document-text-outline') as never}
                    size={22}
                    color={designSystem.colors.brand.primary}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>{biller.name}</Text>
                  <Text style={styles.cardDesc}>{biller.desc}</Text>
                  <Text style={styles.acctLabel}>{biller.acctLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={designSystem.colors.neutral.textTertiary} />
              </TouchableOpacity>
            ))}

            {filteredBillers.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>No billers found</Text>
              </View>
            )}

            {/* Other categories at the bottom */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Other Categories</Text>
            {BILL_CATEGORIES.filter(c => c.id !== selectedCategory).map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.card, styles.cardSmall]}
                onPress={() => { setSelectedCategory(cat.id); setSearch(''); }}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrap, styles.iconWrapSmall]}>
                  <Ionicons name={cat.icon as never} size={18} color={designSystem.colors.brand.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>{cat.label}</Text>
                  <Text style={styles.cardDesc}>{cat.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={designSystem.colors.neutral.textTertiary} />
              </TouchableOpacity>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Level 1: Category list
  const filtered = BILL_CATEGORIES.filter((cat) => {
    if (!search.trim()) return true;
    return (
      cat.label.toLowerCase().includes(search.toLowerCase()) ||
      cat.desc.toLowerCase().includes(search.toLowerCase())
    );
  });

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

          {filtered.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => { setSelectedCategory(cat.id); setSearch(''); }}
              accessibilityLabel={cat.label}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={cat.icon as never}
                  size={24}
                  color={designSystem.colors.brand.primary}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardLabel}>{cat.label}</Text>
                <Text style={styles.cardDesc}>{cat.desc}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={designSystem.colors.neutral.textTertiary}
              />
            </TouchableOpacity>
          ))}

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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  categoryIconSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  categoryHeaderLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: designSystem.colors.brand.primary },
  changeCatBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 9999 },
  changeCatText: { fontSize: 12, fontWeight: '700', color: designSystem.colors.brand.primary },
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
  cardSmall: { padding: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconWrapSmall: { width: 38, height: 38, borderRadius: 10 },
  cardBody: { flex: 1 },
  cardLabel: {
    ...designSystem.typography.textStyles.body,
    fontWeight: '600',
    color: designSystem.colors.neutral.text,
    marginBottom: 2,
  },
  cardDesc: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
  },
  acctLabel: {
    fontSize: 11,
    color: designSystem.colors.brand.primary,
    fontWeight: '600',
    marginTop: 3,
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
