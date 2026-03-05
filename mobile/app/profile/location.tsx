/**
 * Find Agents & ATMs – Buffr G2P.
 * §3.5 screen 38. Map: agents, NamPost, SmartPay units, ATMs; filters; list view.
 * Fetches real data from backend APIs.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getCurrentLocation, type Coords } from '@/services/device';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'agents', label: 'Agents' },
  { key: 'nampost', label: 'NamPost' },
  { key: 'smartpay', label: 'SmartPay' },
  { key: 'atm', label: 'ATMs' },
];

interface LocationItem {
  id: string;
  name: string;
  type: string;
  address: string;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

async function fetchNearbyLocations(type: string, latitude?: number, longitude?: number): Promise<LocationItem[]> {
  if (!API_BASE_URL) return [];
  
  try {
    const endpoints: Record<string, string> = {
      agents: '/api/v1/mobile/agents/nearby',
      nampost: '/api/v1/mobile/nampost/nearby',
      smartpay: '/api/v1/mobile/smartpay/nearby',
      atm: '/api/v1/mobile/atms/nearby',
    };
    
    const endpoint = endpoints[type];
    if (!endpoint) return [];
    
    let url = `${API_BASE_URL}${endpoint}`;
    if (latitude && longitude) {
      url += `?lat=${latitude}&lng=${longitude}&radius=10000`;
    }
    
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const key = type === 'agents' ? 'agents' : type === 'nampost' ? 'branches' : type === 'smartpay' ? 'units' : 'atms';
      return (data[key] || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        type,
        address: item.address,
        distance: item.distance,
        latitude: item.latitude,
        longitude: item.longitude,
      }));
    }
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
  }
  
  return [];
}

export default function LocationScreen() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<Coords | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const coords = await getCurrentLocation();
      setLocation(coords);
      
      let allLocations: LocationItem[] = [];
      
      if (filter === 'all') {
        const [agents, nampost, smartpay, atms] = await Promise.all([
          fetchNearbyLocations('agents', coords?.latitude, coords?.longitude),
          fetchNearbyLocations('nampost', coords?.latitude, coords?.longitude),
          fetchNearbyLocations('smartpay', coords?.latitude, coords?.longitude),
          fetchNearbyLocations('atm', coords?.latitude, coords?.longitude),
        ]);
        allLocations = [...agents, ...nampost, ...smartpay, ...atms];
      } else {
        allLocations = await fetchNearbyLocations(filter, coords?.latitude, coords?.longitude);
      }
      
      // Sort by distance if available
      if (coords) {
        allLocations.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      }
      
      setLocations(allLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Filter by search query
  const filteredLocations = search
    ? locations.filter((loc) =>
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.address.toLowerCase().includes(search.toLowerCase())
      )
    : locations;

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
          <Text style={styles.sectionTitle}>Nearby Locations</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={designSystem.colors.brand.primary} />
              <Text style={styles.loadingText}>Loading locations...</Text>
            </View>
          ) : filteredLocations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color={designSystem.colors.neutral.textTertiary} />
              <Text style={styles.emptyText}>No locations found</Text>
              <Text style={styles.emptyHint}>
                {search ? 'Try a different search term' : 'Try changing filter or enabling location'}
              </Text>
            </View>
          ) : (
            filteredLocations.map((loc) => (
              <TouchableOpacity key={loc.id} style={styles.locationCard} activeOpacity={0.8}>
                <View style={styles.locIcon}>
                  <Ionicons
                    name={loc.type === 'atm' ? 'cash-outline' : loc.type === 'nampost' ? 'mail-outline' : loc.type === 'smartpay' ? 'card-outline' : 'storefront-outline'}
                    size={20}
                    color={designSystem.colors.brand.primary}
                  />
                </View>
                <View style={styles.locBody}>
                  <Text style={styles.locName}>{loc.name}</Text>
                  <Text style={styles.locAddress}>{loc.address}</Text>
                </View>
                {loc.distance !== undefined && (
                  <Text style={styles.locDistance}>
                    {loc.distance < 1000 ? `${Math.round(loc.distance)}m` : `${(loc.distance / 1000).toFixed(1)}km`}
                  </Text>
                )}
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...designSystem.typography.textStyles.bodyLg,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 12,
  },
  emptyHint: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textTertiary,
    marginTop: 6,
  },
});
