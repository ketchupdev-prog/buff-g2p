/**
 * Merchant Browser – Buffr G2P.
 * Browse and search Buffr-registered merchants by category.
 * §5.1 merchant flow.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { getSecureItem } from '@/services/secureStorage';
import { designSystem } from '@/constants/designSystem';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

interface Merchant {
  id: string;
  name: string;
  category: string;
  address: string;
  distanceKm?: number;
  isOpen?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'food', label: 'Food', icon: 'fast-food-outline' },
  { id: 'fuel', label: 'Fuel', icon: 'car-outline' },
  { id: 'pharmacy', label: 'Pharmacy', icon: 'medical-outline' },
  { id: 'clothing', label: 'Clothing', icon: 'shirt-outline' },
  { id: 'grocery', label: 'Grocery', icon: 'basket-outline' },
  { id: 'transport', label: 'Transport', icon: 'bus-outline' },
];

const SEED_MERCHANTS: Merchant[] = [
  { id: 'm1', name: 'Pick n Pay Maerua', category: 'grocery', address: 'Maerua Mall, Windhoek', distanceKm: 1.2, isOpen: true },
  { id: 'm2', name: 'Checkers Independence', category: 'grocery', address: 'Independence Ave, Windhoek', distanceKm: 2.5, isOpen: true },
  { id: 'm3', name: 'NamOil Service Station', category: 'fuel', address: 'Robert Mugabe Ave, Windhoek', distanceKm: 0.8, isOpen: true },
  { id: 'm4', name: 'Clicks Pharmacy', category: 'pharmacy', address: 'Grove Mall, Windhoek', distanceKm: 3.1, isOpen: true },
  { id: 'm5', name: 'KFC Wernhil', category: 'food', address: 'Wernhil Park, Windhoek', distanceKm: 1.8, isOpen: true },
  { id: 'm6', name: 'Edgars Fashion', category: 'clothing', address: 'Maerua Mall, Windhoek', distanceKm: 1.2, isOpen: false },
  { id: 'm7', name: 'Namib Mills Shop', category: 'grocery', address: 'Northern Industrial, Windhoek', distanceKm: 4.0, isOpen: true },
  { id: 'm8', name: 'City Hopper Taxi', category: 'transport', address: 'Windhoek CBD', distanceKm: 0.5, isOpen: true },
];

async function fetchMerchants(category?: string, search?: string): Promise<Merchant[]> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const params = new URLSearchParams();
      if (category && category !== 'all') params.set('category', category);
      if (search) params.set('q', search);
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/merchants?${params}`, {
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) {
        const data = (await res.json()) as { merchants?: Merchant[] };
        return data.merchants ?? [];
      }
    } catch { /* fall through */ }
  }
  let list = SEED_MERCHANTS;
  if (category && category !== 'all') list = list.filter(m => m.category === category);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(m => m.name.toLowerCase().includes(q) || m.address.toLowerCase().includes(q));
  }
  return list;
}

export default function MerchantsIndexScreen() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchMerchants(category, search).then(setMerchants).finally(() => setLoading(false));
  }, [category, search]);

  function handlePay(merchant: Merchant) {
    router.push({ pathname: '/merchants/[id]/pay' as never, params: { id: merchant.id, name: merchant.name } });
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Merchants', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={designSystem.colors.neutral.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants..."
            placeholderTextColor={designSystem.colors.neutral.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, category === cat.id && styles.categoryChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as never}
                size={14}
                color={category === cat.id ? '#fff' : designSystem.colors.neutral.textSecondary}
              />
              <Text style={[styles.categoryChipText, category === cat.id && styles.categoryChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={designSystem.colors.brand.primary} /></View>
        ) : merchants.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="storefront-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No merchants found</Text>
            <Text style={styles.emptySub}>Try a different category or search term.</Text>
          </View>
        ) : (
          <FlatList
            data={merchants}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.merchantCard}
                onPress={() => handlePay(item)}
                activeOpacity={0.8}
              >
                <View style={styles.merchantIconWrap}>
                  <Ionicons
                    name={(CATEGORIES.find(c => c.id === item.category)?.icon ?? 'storefront-outline') as never}
                    size={22}
                    color={designSystem.colors.brand.primary}
                  />
                </View>
                <View style={styles.merchantInfo}>
                  <Text style={styles.merchantName}>{item.name}</Text>
                  <Text style={styles.merchantAddress}>{item.address}</Text>
                  <View style={styles.merchantMeta}>
                    {item.distanceKm != null && (
                      <Text style={styles.metaText}>{item.distanceKm.toFixed(1)} km</Text>
                    )}
                    <View style={[styles.openBadge, { backgroundColor: item.isOpen ? '#D1FAE5' : '#F1F5F9' }]}>
                      <Text style={[styles.openBadgeText, { color: item.isOpen ? '#15803D' : '#94A3B8' }]}>
                        {item.isOpen ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.payBtn}>
                  <Ionicons name="card-outline" size={16} color={designSystem.colors.brand.primary} />
                  <Text style={styles.payBtnText}>Pay</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.text, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 14 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: DS.colors.neutral.text },
  categoryRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: DS.colors.neutral.border },
  categoryChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  categoryChipTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  merchantCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: DS.colors.neutral.border },
  merchantIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  merchantInfo: { flex: 1, gap: 2 },
  merchantName: { fontSize: 15, fontWeight: '700', color: DS.colors.neutral.text },
  merchantAddress: { fontSize: 12, color: DS.colors.neutral.textSecondary },
  merchantMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaText: { fontSize: 11, color: DS.colors.neutral.textTertiary },
  openBadge: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  openBadgeText: { fontSize: 11, fontWeight: '600' },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: DS.colors.brand.primaryMuted, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 8 },
  payBtnText: { fontSize: 13, fontWeight: '700', color: DS.colors.brand.primary },
});
