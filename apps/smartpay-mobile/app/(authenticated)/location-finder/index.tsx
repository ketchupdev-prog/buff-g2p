/**
 * Location Finder Screen
 * Agents (JWT + cache via useNearestAgents + MapView), ATMs, NamPost; permissions + filters.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ATMMapCard, LocationCard } from '@/components/copilot/cards';
import { LocationPermissionPrompt } from '@/components/location/LocationPermissionPrompt';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import { useNearestAgents, type NearestAgentServiceFilter } from '@/hooks/useNearestAgents';
import {
  findNearbyATMs,
  findNampostOffices,
  type AgentLocation,
  type ATMLocation,
  type NampostOffice,
} from '@/services/copilot/locationService';

let MapView: React.ComponentType<any> | null = null;
let Marker: React.ComponentType<any> | null = null;
let PROVIDER_GOOGLE: string | undefined;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} catch {
  MapView = null;
  Marker = null;
}

const WINDHOEK_FALLBACK = { latitude: -22.5609, longitude: 17.0658 };

type SortMode = 'nearest' | 'name' | 'rating';

const SERVICE_CHIPS: { key: NearestAgentServiceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'cashout', label: 'Cash-out' },
  { key: 'voucher', label: 'Voucher' },
  { key: 'ewallet', label: 'eWallet' },
  { key: 'namqr', label: 'NAMQR' },
];

function parseServiceParam(s: string | undefined): NearestAgentServiceFilter {
  if (
    s === 'cashout' ||
    s === 'voucher' ||
    s === 'ewallet' ||
    s === 'namqr' ||
    s === 'all'
  ) {
    return s;
  }
  return 'cashout';
}

function formatLastUpdated(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getAgentMarkerColor(agent: AgentLocation): string {
  if (agent.supports_namqr) return '#F59E0B';
  if (agent.supports_voucher_redeem) return '#22C55E';
  if (agent.supports_cashout) return '#3B82F6';
  return '#0029D6';
}

function sortAgents(list: AgentLocation[], mode: SortMode): AgentLocation[] {
  const copy = [...list];
  if (mode === 'name') copy.sort((a, b) => a.agent_name.localeCompare(b.agent_name));
  else if (mode === 'rating')
    copy.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  else copy.sort((a, b) => a.distance_km - b.distance_km);
  return copy;
}

function filterAgentsBySearch(list: AgentLocation[], q: string): AgentLocation[] {
  const t = q.trim().toLowerCase();
  if (!t) return list;
  return list.filter(
    (a) =>
      a.agent_name.toLowerCase().includes(t) ||
      (a.address?.toLowerCase().includes(t) ?? false) ||
      (a.region?.toLowerCase().includes(t) ?? false)
  );
}

export default function LocationFinderScreen() {
  const params = useLocalSearchParams<{ tab?: string; service?: string; query?: string }>();
  const { status, location, requestPermission, syncFromSystem } = useLocationPermission();
  const [manualMode, setManualMode] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nampostInput, setNampostInput] = useState(
    typeof params.query === 'string' && params.query.trim() ? params.query : 'Windhoek'
  );
  const [debouncedNampost, setDebouncedNampost] = useState(nampostInput);
  const [serviceFilter, setServiceFilter] = useState<NearestAgentServiceFilter>(() =>
    parseServiceParam(typeof params.service === 'string' ? params.service : undefined)
  );
  const [sortMode, setSortMode] = useState<SortMode>('nearest');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [atms, setATMs] = useState<ATMLocation[]>([]);
  const [nampostOffices, setNampostOffices] = useState<NampostOffice[]>([]);
  const [secondaryLoading, setSecondaryLoading] = useState(false);

  const initialTab =
    params.tab === 'atms' || params.tab === 'nampost' || params.tab === 'agents'
      ? params.tab
      : 'agents';
  const [activeTab, setActiveTab] = useState<'agents' | 'atms' | 'nampost'>(initialTab);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedNampost(nampostInput), 300);
    return () => clearTimeout(t);
  }, [nampostInput]);

  useFocusEffect(
    useCallback(() => {
      syncFromSystem();
    }, [syncFromSystem])
  );

  const showPrompt = status === 'undetermined' && !manualMode;

  const userCoords = useMemo(() => {
    if (status === 'granted' && location?.coords) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    }
    return WINDHOEK_FALLBACK;
  }, [status, location]);

  const hasPermission = status === 'granted';

  const {
    agents: rawAgents,
    isLoading: agentsLoading,
    refetch: refetchAgents,
    fromCache: agentsFromCache,
    lastUpdated: agentsLastUpdated,
  } = useNearestAgents({
    latitude: userCoords.latitude,
    longitude: userCoords.longitude,
    service: serviceFilter,
    enabled: !showPrompt,
  });

  const processedAgents = useMemo(() => {
    const searched = filterAgentsBySearch(rawAgents, debouncedSearch);
    return sortAgents(searched, sortMode);
  }, [rawAgents, debouncedSearch, sortMode]);

  const mapRegion = useMemo(
    () => ({
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    }),
    [userCoords.latitude, userCoords.longitude]
  );

  const loadSecondary = useCallback(async () => {
    setSecondaryLoading(true);
    try {
      const [atmsData, np] = await Promise.all([
        findNearbyATMs(userCoords.latitude, userCoords.longitude, 10),
        findNampostOffices(debouncedNampost, userCoords.latitude, userCoords.longitude),
      ]);
      setATMs(atmsData);
      setNampostOffices(np);
    } catch (e) {
      console.warn('loadSecondary location data', e);
    } finally {
      setSecondaryLoading(false);
    }
  }, [userCoords.latitude, userCoords.longitude, debouncedNampost]);

  useEffect(() => {
    if (showPrompt) return;
    loadSecondary();
  }, [showPrompt, loadSecondary]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchAgents(), loadSecondary()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAgentPress = (agent: AgentLocation) => {
    Alert.alert(
      agent.agent_name,
      `Type: ${agent.agent_type.replace('_', ' ')}\n` +
        `Distance: ${agent.distance_km.toFixed(1)} km\n` +
        `Address: ${agent.address ?? 'N/A'}\n\n` +
        `Services:\n` +
        `${agent.supports_cashout ? '✓' : '✗'} Cash Out\n` +
        `${agent.supports_voucher_redeem ? '✓' : '✗'} Voucher Redemption\n` +
        `${agent.supports_namqr ? '✓' : '✗'} NAMQR Payments`
    );
  };

  const handleATMPress = (atm: ATMLocation) => {
    Alert.alert(
      atm.bank_name,
      `Status: ${atm.status.toUpperCase()}\n` +
        `Distance: ${atm.distance_km.toFixed(1)} km\n` +
        `Address: ${atm.address ?? 'N/A'}\n\n` +
        `Features:\n` +
        `${atm.is_24_hour ? '✓' : '✗'} 24/7 Access\n` +
        `${atm.has_cash_out ? '✓' : '✗'} Cash Withdrawal\n` +
        `${atm.has_deposit ? '✓' : '✗'} Cash Deposit`
    );
  };

  const sortLabel =
    sortMode === 'nearest' ? 'Nearest' : sortMode === 'name' ? 'Name' : 'Rating';

  if (showPrompt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#020617" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Location Finder</Text>
          <View style={styles.headerSpacer} />
        </View>
        <LocationPermissionPrompt
          onAllowLocation={requestPermission}
          onSearchManually={() => setManualMode(true)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#020617" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Finder</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#0029D6" />
        </TouchableOpacity>
      </View>

      {!hasPermission && (
        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={18} color="#92400E" />
          <Text style={styles.bannerText}>
            Location off — showing results around Windhoek. You can enable location in Settings.
          </Text>
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'agents' && styles.tabActive]}
          onPress={() => setActiveTab('agents')}
        >
          <Text style={[styles.tabText, activeTab === 'agents' && styles.tabTextActive]}>
            Agents ({processedAgents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'atms' && styles.tabActive]}
          onPress={() => setActiveTab('atms')}
        >
          <Text style={[styles.tabText, activeTab === 'atms' && styles.tabTextActive]}>
            ATMs ({atms.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'nampost' && styles.tabActive]}
          onPress={() => setActiveTab('nampost')}
        >
          <Text style={[styles.tabText, activeTab === 'nampost' && styles.tabTextActive]}>
            NamPost ({nampostOffices.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'agents' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search</Text>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
                <TextInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Search agents by name or area"
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {SERVICE_CHIPS.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.chip, serviceFilter === c.key && styles.chipActive]}
                    onPress={() => setServiceFilter(c.key)}
                  >
                    <Text style={[styles.chipText, serviceFilter === c.key && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sortRow}>
                <Text style={styles.sectionTitle}>Map</Text>
                <TouchableOpacity style={styles.sortBtn} onPress={() => setSortSheetOpen(true)}>
                  <Text style={styles.sortBtnText}>Sort: {sortLabel}</Text>
                  <Ionicons name="chevron-down" size={18} color="#0029D6" />
                </TouchableOpacity>
              </View>
              {agentsFromCache && agentsLastUpdated != null && (
                <Text style={styles.cacheHint}>
                  Last updated: {formatLastUpdated(agentsLastUpdated)}
                </Text>
              )}
              {agentsLoading && rawAgents.length === 0 ? (
                <View style={[styles.mapLoading, { height: 280 }]}>
                  <ActivityIndicator size="large" color="#0029D6" />
                  <Text style={styles.muted}>Loading agents…</Text>
                </View>
              ) : MapView && Marker ? (
                <View style={styles.mapWrap}>
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={[styles.map, { height: 280 }]}
                    region={mapRegion}
                    showsUserLocation={hasPermission}
                    showsMyLocationButton={hasPermission}
                  >
                    {processedAgents.map((agent) => (
                      <Marker
                        key={agent.id}
                        coordinate={{ latitude: agent.latitude, longitude: agent.longitude }}
                        pinColor={getAgentMarkerColor(agent)}
                        onPress={() => handleAgentPress(agent)}
                      />
                    ))}
                  </MapView>
                </View>
              ) : (
                <View style={[styles.mapLoading, { height: 280 }]}>
                  <Ionicons name="map-outline" size={40} color="#94A3B8" />
                  <Text style={styles.muted}>Map unavailable in this build.</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>List</Text>
              {processedAgents.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="location-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No agents match your filters</Text>
                </View>
              ) : (
                processedAgents.map((agent) => (
                  <LocationCard
                    key={agent.id}
                    name={agent.agent_name}
                    type="agent"
                    distance={agent.distance_km}
                    address={agent.address}
                    status="active"
                    operatingHours={agent.operating_hours}
                    services={[
                      agent.supports_cashout && 'Cash Out',
                      agent.supports_voucher_redeem && 'Vouchers',
                      agent.supports_namqr && 'NAMQR',
                    ].filter(Boolean) as string[]}
                    onPress={() => handleAgentPress(agent)}
                  />
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'atms' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Map</Text>
              {secondaryLoading && atms.length === 0 ? (
                <View style={[styles.mapLoading, { height: 300 }]}>
                  <ActivityIndicator size="large" color="#0029D6" />
                </View>
              ) : (
                <ATMMapCard
                  atms={atms}
                  userLocation={userCoords}
                  loading={false}
                  onATMPress={handleATMPress}
                  height={300}
                  statusFilter="all"
                  showUserLocation={hasPermission}
                />
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>List</Text>
              {atms.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cash-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No ATMs found nearby</Text>
                </View>
              ) : (
                atms.map((atm) => (
                  <LocationCard
                    key={atm.id}
                    name={atm.bank_name}
                    type="atm"
                    distance={atm.distance_km}
                    address={atm.address}
                    status={atm.status}
                    services={[
                      atm.has_cash_out && 'Cash Withdrawal',
                      atm.has_deposit && 'Cash Deposit',
                      atm.is_24_hour && '24/7 Access',
                    ].filter(Boolean) as string[]}
                    onPress={() => handleATMPress(atm)}
                  />
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'nampost' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search offices</Text>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
                <TextInput
                  value={nampostInput}
                  onChangeText={setNampostInput}
                  placeholder="City, branch, or region"
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                />
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>NamPost offices</Text>
              {secondaryLoading && nampostOffices.length === 0 ? (
                <ActivityIndicator size="large" color="#0029D6" style={{ marginVertical: 24 }} />
              ) : nampostOffices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="mail-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No NamPost offices found</Text>
                </View>
              ) : (
                nampostOffices.map((office) => (
                  <LocationCard
                    key={office.id}
                    name={office.branch_name}
                    type="nampost"
                    distance={office.distance_km ?? 0}
                    address={office.address}
                    status="active"
                    operatingHours={office.operating_hours}
                    services={office.services}
                    phone={office.phone}
                    onPress={() =>
                      Alert.alert(
                        office.branch_name,
                        `Address: ${office.address}\nPhone: ${office.phone ?? 'N/A'}\nServices: ${office.services.join(', ')}`
                      )
                    }
                  />
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={sortSheetOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setSortSheetOpen(false)}>
          <Pressable style={styles.sortSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sortSheetTitle}>Sort by</Text>
            {(
              [
                ['nearest', 'Nearest'],
                ['name', 'Name'],
                ['rating', 'Rating'],
              ] as const
            ).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={styles.sortOption}
                onPress={() => {
                  setSortMode(key);
                  setSortSheetOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortMode === key && styles.sortOptionTextActive,
                  ]}
                >
                  {label}
                </Text>
                {sortMode === key && <Ionicons name="checkmark" size={20} color="#0029D6" />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerSpacer: { width: 32 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#020617' },
  refreshButton: { padding: 4 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerText: { flex: 1, fontSize: 13, color: '#92400E' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#0029D6' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  tabTextActive: { color: '#0029D6', fontWeight: '600' },
  scrollView: { flex: 1 },
  tabContent: { paddingBottom: 24 },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#020617', marginBottom: 10 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#020617' },
  chipsRow: { flexGrow: 0, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#0029D6',
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  chipTextActive: { color: '#0029D6' },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText: { fontSize: 14, fontWeight: '600', color: '#0029D6' },
  cacheHint: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  mapWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  map: { width: '100%' },
  mapLoading: {
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  muted: { fontSize: 14, color: '#64748B' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  sortSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#020617',
    marginBottom: 12,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sortOptionText: { fontSize: 16, color: '#334155' },
  sortOptionTextActive: { color: '#0029D6', fontWeight: '600' },
});
