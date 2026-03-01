/**
 * Redeem at NamPost – Buffr G2P.
 * Select a NamPost branch to collect cash for a voucher redemption.
 * §3.2.2 NamPost redemption flow.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getNamPostBranches, type NamPostBranch } from '@/services/vouchers';

const SEED_BRANCHES: NamPostBranch[] = [
  { id: 'np_wdh_main', name: 'Windhoek Main Post Office', address: 'Independence Ave, Windhoek', distanceKm: 1.2 },
  { id: 'np_wdh_katutura', name: 'Katutura Post Office', address: 'Eveline Street, Katutura', distanceKm: 3.8 },
  { id: 'np_wdh_khomasdal', name: 'Khomasdal Post Office', address: 'Theo-Ben Gurirab St, Khomasdal', distanceKm: 2.9 },
  { id: 'np_omaruru', name: 'Omaruru Post Office', address: 'Omaruru Town Centre', distanceKm: 72.0 },
  { id: 'np_gobabis', name: 'Gobabis Post Office', address: 'Gobabis Main Road', distanceKm: 198.0 },
  { id: 'np_rehoboth', name: 'Rehoboth Post Office', address: 'Rehoboth Central', distanceKm: 87.0 },
];

export default function NamPostRedeemScreen() {
  const { voucherId } = useLocalSearchParams<{ voucherId: string }>();
  const [branches, setBranches] = useState<NamPostBranch[]>([]);
  const [filtered, setFiltered] = useState<NamPostBranch[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getNamPostBranches(voucherId ?? '').then(result => {
      const list = result.length > 0 ? result : SEED_BRANCHES;
      setBranches(list);
      setFiltered(list);
    }).catch(() => {
      setBranches(SEED_BRANCHES);
      setFiltered(SEED_BRANCHES);
    }).finally(() => setLoading(false));
  }, [voucherId]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(branches); return; }
    const q = search.toLowerCase();
    setFiltered(branches.filter(b => b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q)));
  }, [search, branches]);

  function handleBook() {
    if (!selected) return;
    router.push({
      pathname: '/utilities/vouchers/redeem/nampost/booking' as never,
      params: { voucherId, branchId: selected, branchName: branches.find(b => b.id === selected)?.name ?? 'NamPost Branch' },
    });
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Redeem at NamPost', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={designSystem.colors.neutral.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search branches..."
            placeholderTextColor={designSystem.colors.neutral.textTertiary}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={14} color="#1D4ED8" />
          <Text style={styles.infoText}>Select your nearest NamPost branch. You'll receive a booking confirmation to collect your cash.</Text>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={designSystem.colors.brand.primary} /></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.branchCard, selected === item.id && styles.branchCardActive]}
                onPress={() => setSelected(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.branchIconWrap}>
                  <Ionicons name="business-outline" size={20} color={selected === item.id ? '#fff' : designSystem.colors.brand.primary} />
                </View>
                <View style={styles.branchInfo}>
                  <Text style={[styles.branchName, selected === item.id && { color: designSystem.colors.brand.primary }]}>{item.name}</Text>
                  <Text style={styles.branchAddress}>{item.address}</Text>
                  {item.distanceKm != null && (
                    <Text style={styles.branchDist}>{item.distanceKm < 10 ? item.distanceKm.toFixed(1) : Math.round(item.distanceKm)} km away</Text>
                  )}
                </View>
                {selected === item.id && (
                  <Ionicons name="checkmark-circle" size={22} color={designSystem.colors.brand.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No branches found for "{search}"</Text>
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.bookBtn, !selected && styles.btnDisabled]}
            onPress={handleBook}
            disabled={!selected}
          >
            <Ionicons name="calendar-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.bookBtnText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 14, height: 46 },
  searchInput: { flex: 1, fontSize: 15, color: DS.colors.neutral.text },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#DBEAFE', borderRadius: 12, margin: 16, marginTop: 8, marginBottom: 12, padding: 12 },
  infoText: { flex: 1, fontSize: 12, color: '#1D4ED8', lineHeight: 17 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  branchCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: DS.colors.neutral.border },
  branchCardActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  branchIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  branchInfo: { flex: 1 },
  branchName: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 2 },
  branchAddress: { fontSize: 12, color: DS.colors.neutral.textSecondary },
  branchDist: { fontSize: 11, color: DS.colors.neutral.textTertiary, marginTop: 2 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: DS.colors.neutral.textSecondary },
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: DS.colors.neutral.border },
  bookBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
});
