/**
 * Merchants – Buffr G2P. §3.4.
 * List of merchants that accept Buffr QR payments.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { AppHeader } from '@/components/layout';
import { useUser } from '@/contexts/UserContext';
import * as Location from 'expo-location';
import { ErrorState, LoadingState } from '@/components/ui';
import { usePullToRefresh } from '@/hooks';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type MerchantCategory = 'grocery' | 'pharmacy' | 'transport' | 'food' | 'hardware' | 'fuel';

interface Merchant {
  id: string;
  name: string;
  category: MerchantCategory;
  address: string;
  open: boolean;
  minTx: number;
  verified: boolean;
  distance?: number;
  services?: string[];
}

const CAT_CONFIG: Record<MerchantCategory, { label: string; icon: string; color: string; bg: string }> = {
  grocery:   { label: 'Grocery',    icon: 'basket-outline',       color: '#16A34A', bg: '#F0FDF4' },
  pharmacy:  { label: 'Pharmacy',   icon: 'medkit-outline',        color: '#0891B2', bg: '#ECFEFF' },
  transport: { label: 'Transport',  icon: 'bus-outline',           color: '#7C3AED', bg: '#F5F3FF' },
  food:      { label: 'Food',       icon: 'fast-food-outline',     color: '#D97706', bg: '#FFFBEB' },
  hardware:  { label: 'Hardware',   icon: 'hammer-outline',        color: '#64748B', bg: '#F8FAFC' },
  fuel:      { label: 'Fuel',       icon: 'car-outline',           color: '#E11D48', bg: '#FFF1F2' },
};

const CAT_FILTERS: Array<{ key: MerchantCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'grocery', label: 'Grocery' },
  { key: 'food', label: 'Food' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'transport', label: 'Transport' },
  { key: 'fuel', label: 'Fuel' },
];

async function fetchMerchants(category?: string, latitude?: number, longitude?: number): Promise<Merchant[]> {
  if (!API_BASE_URL) return [];
  
  try {
    let url = `${API_BASE_URL}/api/v1/mobile/merchants/nearby`;
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (latitude && longitude) {
      params.append('lat', latitude.toString());
      params.append('lng', longitude.toString());
      params.append('radius', '20000');
    }
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.merchants || [];
    }
  } catch (e) {
    console.error('fetchMerchants error:', e);
  }
  return [];
}

export default function MerchantsScreen() {
  const { profile } = useUser();
  const [catFilter, setCatFilter] = useState<MerchantCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadMerchants = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        const data = await fetchMerchants(catFilter !== 'all' ? catFilter : undefined, loc.coords.latitude, loc.coords.longitude);
        setMerchants(data);
      } else {
        const data = await fetchMerchants(catFilter !== 'all' ? catFilter : undefined);
        setMerchants(data);
      }
    } catch (e) {
      console.error('loadMerchants error:', e);
    } finally {
      setLoading(false);
    }
  }, [catFilter]);

  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: loadMerchants,
  });

  useEffect(() => { loadMerchants(); }, [loadMerchants]);

  const filtered = search.trim()
    ? merchants.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.address.toLowerCase().includes(search.toLowerCase())
      )
    : merchants;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader
          searchPlaceholder="Search merchants..."
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

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {CAT_FILTERS.map((f) => {
            const active = catFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setCatFilter(f.key as MerchantCategory | 'all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designSystem.colors.brand.primary} />}
        >
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="qr-code-outline" size={20} color={designSystem.colors.brand.primary} />
            <Text style={styles.infoText}>Scan the merchant's QR code at checkout to pay with Buffr.</Text>
          </View>

          {loading ? (
            <LoadingState message="Loading merchants..." />
          ) : filtered.length === 0 ? (
            <ErrorState
              variant="empty"
              title="No merchants found"
              message={search.trim() ? 'Try a different search term' : 'Try a different category'}
              style={{ marginTop: 40 }}
            />
          ) : (
            filtered.map((m) => {
              const cfg = CAT_CONFIG[m.category];
              return (
                <TouchableOpacity
                  key={m.id}
                  style={styles.card}
                  onPress={() => router.push(`/merchants/${m.id}/pay` as never)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.catIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as never} size={22} color={cfg.color} />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.merchantName} numberOfLines={1}>{m.name}</Text>
                      {m.verified && (
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.address} numberOfLines={1}>{m.address}</Text>
                    <View style={styles.bottomRow}>
                      <View style={[styles.catPill, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.catPillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <Text style={styles.minTx}>Min {'N$'}{m.minTx}</Text>
                      <View style={[styles.statusDot, { backgroundColor: m.open ? '#22C55E' : '#9CA3AF' }]} />
                      <Text style={styles.statusText}>{m.open ? 'Open' : 'Closed'}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },

  filterScroll: { flexGrow: 0 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#0029D6', borderColor: '#0029D6' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  filterTextActive: { color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },

  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', padding: 14, borderRadius: 14, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 18 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  catIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  merchantName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verifiedText: { fontSize: 11, color: '#22C55E', fontWeight: '600' },
  address: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  catPillText: { fontSize: 11, fontWeight: '600' },
  minTx: { fontSize: 11, color: '#9CA3AF' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: '#6B7280' },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
});
