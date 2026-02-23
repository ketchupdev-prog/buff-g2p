/**
 * Nearby Agents – Buffr G2P. §3.4.
 * List of agents, NamPost branches, and ATMs near the user.
 * Opens external Maps app for navigation (no native maps SDK required).
 */
import React, { useState } from 'react';
import {
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

type AgentType = 'agent' | 'nampost' | 'atm';

interface AgentLocation {
  id: string;
  type: AgentType;
  name: string;
  address: string;
  region: string;
  distanceKm: number;
  open: boolean;
  phone?: string;
  hours: string;
  lat: number;
  lng: number;
  services: string[];
}

const AGENTS: AgentLocation[] = [
  {
    id: 'a1',
    type: 'nampost',
    name: 'NamPost Windhoek Main',
    address: 'Independence Ave, Windhoek',
    region: 'Khomas',
    distanceKm: 0.8,
    open: true,
    phone: '+264 61 201 3000',
    hours: 'Mon–Fri 08:00–16:30, Sat 08:00–12:00',
    lat: -22.5597,
    lng: 17.0832,
    services: ['Cash Out', 'Voucher Redeem', 'Grant Collection'],
  },
  {
    id: 'a2',
    type: 'agent',
    name: 'Katutura Pay Point',
    address: 'Hosea Kutako Dr, Katutura',
    region: 'Khomas',
    distanceKm: 3.2,
    open: true,
    phone: '+264 81 234 5678',
    hours: 'Mon–Sat 07:30–18:00',
    lat: -22.5464,
    lng: 17.0456,
    services: ['Cash Out', 'Airtime', 'Bill Pay'],
  },
  {
    id: 'a3',
    type: 'atm',
    name: 'First National Bank ATM – Maerua Mall',
    address: 'Maerua Mall, Jan Jonker Rd',
    region: 'Khomas',
    distanceKm: 4.1,
    open: true,
    phone: undefined,
    hours: '24 hours',
    lat: -22.5694,
    lng: 17.0726,
    services: ['Cardless Withdrawal', 'QR Cash Out'],
  },
  {
    id: 'a4',
    type: 'nampost',
    name: 'NamPost Katutura',
    address: 'Mandume Ndemufayo Ave, Katutura',
    region: 'Khomas',
    distanceKm: 3.5,
    open: false,
    phone: '+264 61 201 3100',
    hours: 'Mon–Fri 08:00–16:30',
    lat: -22.5433,
    lng: 17.0369,
    services: ['Cash Out', 'Voucher Redeem', 'Grant Collection'],
  },
  {
    id: 'a5',
    type: 'agent',
    name: 'Okuryangava Community Agent',
    address: 'Okuryangava, Windhoek North',
    region: 'Khomas',
    distanceKm: 5.7,
    open: true,
    phone: '+264 81 987 6543',
    hours: 'Mon–Fri 08:00–17:00, Sat 08:00–13:00',
    lat: -22.5201,
    lng: 17.0601,
    services: ['Cash Out', 'Airtime'],
  },
  {
    id: 'a6',
    type: 'atm',
    name: 'Standard Bank ATM – Wernhil Park',
    address: 'Wernhil Park, Independence Ave',
    region: 'Khomas',
    distanceKm: 1.4,
    open: true,
    phone: undefined,
    hours: '24 hours',
    lat: -22.5613,
    lng: 17.0844,
    services: ['Cardless Withdrawal'],
  },
];

const TYPE_CONFIG: Record<AgentType, { label: string; icon: string; color: string; bg: string }> = {
  agent:   { label: 'Buffr Agent',  icon: 'person-circle-outline',   color: '#0029D6', bg: '#EFF6FF' },
  nampost: { label: 'NamPost',      icon: 'business-outline',         color: '#D97706', bg: '#FFFBEB' },
  atm:     { label: 'ATM',          icon: 'card-outline',             color: '#7C3AED', bg: '#F5F3FF' },
};

const TYPE_FILTERS: Array<{ key: AgentType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'agent', label: 'Agents' },
  { key: 'nampost', label: 'NamPost' },
  { key: 'atm', label: 'ATMs' },
];

function openInMaps(agent: AgentLocation) {
  const label = encodeURIComponent(agent.name);
  const { lat, lng } = agent;
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://maps.apple.com/?q=${label}&ll=${lat},${lng}`);
  } else {
    Linking.openURL(`geo:${lat},${lng}?q=${label}`);
  }
}

function openPhone(phone: string) {
  Linking.openURL(`tel:${phone}`);
}

export default function AgentsNearbyScreen() {
  const [typeFilter, setTypeFilter] = useState<AgentType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = AGENTS.filter(
    (a) => typeFilter === 'all' || a.type === typeFilter,
  ).sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: true, title: 'Nearby', headerBackTitle: '' }} />

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setTypeFilter(f.key as AgentType | 'all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Map banner */}
        <TouchableOpacity
          style={styles.mapBanner}
          onPress={() => {
            const url = Platform.OS === 'ios'
              ? 'maps://maps.apple.com/?q=Buffr+Agent+Namibia'
              : 'geo:0,0?q=Buffr+Agent+Namibia';
            Linking.openURL(url);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.mapBannerLeft}>
            <Ionicons name="map-outline" size={32} color="#0029D6" />
            <View style={styles.mapBannerText}>
              <Text style={styles.mapBannerTitle}>Open in Maps</Text>
              <Text style={styles.mapBannerDesc}>View all agents on {Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps'}</Text>
            </View>
          </View>
          <Ionicons name="open-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor="#0029D6" />}
        >
          <Text style={styles.resultCount}>{filtered.length} location{filtered.length !== 1 ? 's' : ''} near you</Text>

          {filtered.map((agent) => {
            const cfg = TYPE_CONFIG[agent.type];
            return (
              <View key={agent.id} style={styles.card}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as never} size={22} color={cfg.color} />
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardName} numberOfLines={1}>{agent.name}</Text>
                    <View style={styles.cardSubRow}>
                      <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: agent.open ? '#22C55E' : '#9CA3AF' }]} />
                      <Text style={styles.statusText}>{agent.open ? 'Open' : 'Closed'}</Text>
                    </View>
                  </View>
                  <Text style={styles.distance}>{agent.distanceKm.toFixed(1)} km</Text>
                </View>

                {/* Address + hours */}
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.infoText} numberOfLines={1}>{agent.address}, {agent.region}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.infoText}>{agent.hours}</Text>
                </View>

                {/* Services */}
                <View style={styles.servicesRow}>
                  {agent.services.map((s) => (
                    <View key={s} style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{s}</Text>
                    </View>
                  ))}
                </View>

                {/* Action buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openInMaps(agent)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate-outline" size={16} color="#0029D6" />
                    <Text style={styles.actionBtnText}>Directions</Text>
                  </TouchableOpacity>
                  {agent.phone && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openPhone(agent.phone!)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call-outline" size={16} color="#0029D6" />
                      <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },

  filterScroll: { flexGrow: 0 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#0029D6', borderColor: '#0029D6' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  filterTextActive: { color: '#fff' },

  mapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  mapBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mapBannerText: { gap: 2 },
  mapBannerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  mapBannerDesc: { fontSize: 12, color: '#6B7280' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },

  resultCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  typeIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardMeta: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  typePillText: { fontSize: 11, fontWeight: '600' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, color: '#6B7280' },
  distance: { fontSize: 14, fontWeight: '700', color: '#0029D6', flexShrink: 0 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 12, color: '#6B7280', flex: 1 },

  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 10 },
  serviceChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  serviceChipText: { fontSize: 11, color: '#374151', fontWeight: '500' },

  actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingVertical: 9, borderRadius: 9999 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#0029D6' },
});
