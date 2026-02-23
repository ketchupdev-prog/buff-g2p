/**
 * Find Agents & ATMs – Buffr G2P.
 * §3.5 screen 38. Map: agents, NamPost, SmartPay units, ATMs; filters; list view.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'agents', label: 'Agents' },
  { key: 'nampost', label: 'NamPost' },
  { key: 'smartpay', label: 'SmartPay' },
  { key: 'atm', label: 'ATMs' },
];

const PLACEHOLDER_LOCATIONS = [
  { id: '1', name: 'Windhoek Agent 1', type: 'agent', address: 'Independence Ave', distance: '0.5 km' },
  { id: '2', name: 'NamPost Main', type: 'nampost', address: 'Post Street', distance: '1.2 km' },
  { id: '3', name: 'ATM – FNB', type: 'atm', address: 'Wernhill Mall', distance: '2.1 km' },
];

export default function LocationScreen() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find Agents & ATMs</Text>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={designSystem.colors.neutral.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search area or address..."
            placeholderTextColor={designSystem.colors.neutral.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.mapPlaceholder} onPress={() => router.push('/agents/nearby' as never)}>
            <Ionicons name="map-outline" size={48} color={designSystem.colors.neutral.textTertiary} />
            <Text style={styles.mapPlaceholderText}>Map view</Text>
            <Text style={styles.mapPlaceholderSub}>Tap to open map with nearby points</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Nearby</Text>
          {PLACEHOLDER_LOCATIONS.map((loc) => (
            <TouchableOpacity key={loc.id} style={styles.locationCard} activeOpacity={0.8}>
              <View style={styles.locIcon}>
                <Ionicons
                  name={loc.type === 'atm' ? 'cash-outline' : loc.type === 'nampost' ? 'mail-outline' : 'storefront-outline'}
                  size={20}
                  color={designSystem.colors.brand.primary}
                />
              </View>
              <View style={styles.locBody}>
                <Text style={styles.locName}>{loc.name}</Text>
                <Text style={styles.locAddress}>{loc.address}</Text>
              </View>
              <Text style={styles.locDistance}>{loc.distance}</Text>
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
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: designSystem.spacing.g2p.horizontalPadding,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: designSystem.colors.neutral.text },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: designSystem.spacing.g2p.horizontalPadding, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, backgroundColor: designSystem.colors.neutral.surface, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  filterChipActive: { backgroundColor: designSystem.colors.brand.primary, borderColor: designSystem.colors.brand.primary },
  filterText: { ...designSystem.typography.textStyles.bodySm, fontWeight: '500', color: designSystem.colors.neutral.textSecondary },
  filterTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingBottom: 24 },
  mapPlaceholder: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  mapPlaceholderText: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginTop: 12 },
  mapPlaceholderSub: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 4 },
  sectionTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginBottom: 12 },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  locIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  locBody: { flex: 1, minWidth: 0 },
  locName: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text },
  locAddress: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  locDistance: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textTertiary },
});
