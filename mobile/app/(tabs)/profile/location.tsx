/**
 * Find Agents & ATMs – Buffr G2P.
 * §3.5 screen 38. Map: agents, NamPost, SmartPay units, ATMs; filters; list view.
 * Uses device location (expo-location) via services/device.ts. §11.3.2.
 * Fetches real data from backend APIs.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getCurrentLocation, type Coords } from '@/services/device';
import { ErrorState, LoadingState } from '@/components/ui';
import { usePullToRefresh } from '@/hooks';

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
  const [location, setLocation] = useState<Coords | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const refreshLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const coords = await getCurrentLocation();
      setLocation(coords);
      if (!coords) setLocationError('Location unavailable. Enable location in settings.');
    } catch {
      setLocationError('Could not get location.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      let allLocations: LocationItem[] = [];
      
      if (filter === 'all') {
        const [agents, nampost, smartpay, atms] = await Promise.all([
          fetchNearbyLocations('agents', location?.latitude, location?.longitude),
          fetchNearbyLocations('nampost', location?.latitude, location?.longitude),
          fetchNearbyLocations('smartpay', location?.latitude, location?.longitude),
          fetchNearbyLocations('atm', location?.latitude, location?.longitude),
        ]);
        allLocations = [...agents, ...nampost, ...smartpay, ...atms];
      } else {
        allLocations = await fetchNearbyLocations(filter, location?.latitude, location?.longitude);
      }
      
      // Sort by distance if available
      if (location) {
        allLocations.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      }
      
      setLocations(allLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLocationsLoading(false);
    }
  }, [filter, location]);

  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: async () => {
      await refreshLocation();
      await loadLocations();
    },
  });

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Agents & ATMs</Text>
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
          <TouchableOpacity
            style={styles.mapPlaceholder}
            onPress={refreshLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="large" color={designSystem.colors.brand.primary} />
            ) : (
              <Ionicons name="locate-outline" size={48} color={designSystem.colors.brand.primary} />
            )}
            <Text style={styles.mapPlaceholderText}>
              {location ? 'Your location' : 'Get my location'}
            </Text>
            <Text style={styles.mapPlaceholderSub}>
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : 'Tap to use device location for nearby agents and ATMs'}
            </Text>
            {locationError && (
              <ErrorState
                variant="network"
                message={locationError}
                onRetry={refreshLocation}
                style={{ marginTop: 12 }}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapPlaceholder, styles.mapButton]}
            onPress={() => router.push('/(tabs)/home/agents/nearby' as never)}
          >
            <Ionicons name="map-outline" size={48} color={designSystem.colors.neutral.textTertiary} />
            <Text style={styles.mapPlaceholderText}>Map view</Text>
            <Text style={styles.mapPlaceholderSub}>Tap to open map with nearby points</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Nearby Locations</Text>
          {locationsLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingState size="small" message="Loading nearby locations..." />
              <Text style={styles.loadingText}>Loading nearby locations...</Text>
            </View>
          ) : locations.length === 0 ? (
            <ErrorState
              variant="empty"
              title="No locations found"
              message="Try enabling location or changing filter"
              action={{ label: 'Refresh Location', onPress: refreshLocation }}
              style={{ marginTop: 24 }}
            />
          ) : (
            locations.map((loc) => (
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
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
  mapButton: { marginTop: 12 },
  locationError: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.semantic.error, marginTop: 8 },
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
