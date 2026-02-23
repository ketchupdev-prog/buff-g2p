/**
 * Agent Network – Buffr G2P.
 * §3.4. List of agents; link to map (nearby). Cash-out at agent uses NAMQR scan.
 */
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

const PLACEHOLDER_AGENTS = [
  { id: '1', name: 'Windhoek Agent 1', address: 'Independence Ave', open: true },
  { id: '2', name: 'Katutura Pay Point', address: 'Hosea Kutako Dr', open: true },
  { id: '3', name: 'Okuryangava Agent', address: 'Okuryangava', open: false },
];

export default function AgentsIndexScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <LinearGradient colors={['#F3F4F6', '#fff', '#F9FAFB']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Agent Network</Text>
          <TouchableOpacity style={styles.mapBtn} onPress={() => router.push('/(tabs)/home/agents/nearby' as never)} accessibilityLabel="View map">
            <Ionicons name="map-outline" size={22} color={designSystem.colors.brand.primary} />
            <Text style={styles.mapBtnText}>Map</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={designSystem.colors.neutral.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search area or agent..."
            placeholderTextColor={designSystem.colors.neutral.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designSystem.colors.brand.primary} />}
        >
          <Text style={styles.sectionTitle}>Nearby agents</Text>
          <Text style={styles.hint}>Visit an agent to cash out. Show your app and scan their QR to pay.</Text>
          {PLACEHOLDER_AGENTS.map((agent) => (
            <TouchableOpacity key={agent.id} style={styles.card} activeOpacity={0.8}>
              <View style={styles.iconWrap}>
                <Ionicons name="storefront-outline" size={24} color={designSystem.colors.brand.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{agent.name}</Text>
                <Text style={styles.cardAddress}>{agent.address}</Text>
                <View style={styles.badgeWrap}>
                  <View style={[styles.badge, agent.open ? styles.badgeOpen : styles.badgeClosed]} />
                  <Text style={styles.badgeText}>{agent.open ? 'Open' : 'Closed'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={designSystem.colors.neutral.textTertiary} />
            </TouchableOpacity>
          ))}
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
    justifyContent: 'space-between',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapBtnText: { ...designSystem.typography.textStyles.bodySm, fontWeight: '600', color: designSystem.colors.brand.primary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: designSystem.spacing.g2p.horizontalPadding,
    marginVertical: 12,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: designSystem.colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 8 },
  sectionTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginBottom: 4 },
  hint: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text },
  cardAddress: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  badgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  badge: { width: 8, height: 8, borderRadius: 4 },
  badgeOpen: { backgroundColor: designSystem.colors.semantic.success },
  badgeClosed: { backgroundColor: designSystem.colors.neutral.textTertiary },
  badgeText: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary },
});
