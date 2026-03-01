/**
 * Redeem via SmartPay – Buffr G2P.
 * Select a nearby SmartPay mobile agent to collect cash.
 * §3.2.3 SmartPay redemption flow.
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
import { getSmartPayUnits, type SmartPayUnit } from '@/services/vouchers';

const SEED_UNITS: SmartPayUnit[] = [
  { id: 'sp_wdh_1', name: 'SmartPay Agent – Katutura Market', location: 'Katutura Open Market, Windhoek', distanceKm: 3.5 },
  { id: 'sp_wdh_2', name: 'SmartPay Agent – Wernhil Park', location: 'Wernhil Park Shopping Centre', distanceKm: 1.8 },
  { id: 'sp_wdh_3', name: 'SmartPay Agent – Moses //Garoëb', location: 'Moses //Garoëb Community Centre', distanceKm: 4.2 },
  { id: 'sp_wdh_4', name: 'SmartPay Agent – Havana', location: 'Havana Informal Settlement, Windhoek', distanceKm: 5.1 },
  { id: 'sp_wdh_5', name: 'SmartPay Agent – Rocky Crest', location: 'Rocky Crest Pharmacy Area', distanceKm: 6.3 },
];

export default function SmartPayRedeemScreen() {
  const { voucherId } = useLocalSearchParams<{ voucherId: string }>();
  const [units, setUnits] = useState<SmartPayUnit[]>([]);
  const [filtered, setFiltered] = useState<SmartPayUnit[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getSmartPayUnits(voucherId ?? '').then(result => {
      const list = result.length > 0 ? result : SEED_UNITS;
      setUnits(list);
      setFiltered(list);
    }).catch(() => {
      setUnits(SEED_UNITS);
      setFiltered(SEED_UNITS);
    }).finally(() => setLoading(false));
  }, [voucherId]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(units); return; }
    const q = search.toLowerCase();
    setFiltered(units.filter(u => u.name.toLowerCase().includes(q) || u.location.toLowerCase().includes(q)));
  }, [search, units]);

  function handleGetCode() {
    if (!selected) return;
    router.push({
      pathname: '/utilities/vouchers/redeem/smartpay/code' as never,
      params: {
        voucherId,
        unitId: selected,
        unitName: units.find(u => u.id === selected)?.name ?? 'SmartPay Agent',
      },
    });
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'SmartPay Agents', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={designSystem.colors.neutral.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search agents by name or area..."
            placeholderTextColor={designSystem.colors.neutral.textTertiary}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={14} color="#1D4ED8" />
          <Text style={styles.infoText}>Select a SmartPay mobile agent near you. A redemption code will be generated for you to show the agent.</Text>
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
                style={[styles.unitCard, selected === item.id && styles.unitCardActive]}
                onPress={() => setSelected(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.unitIcon, selected === item.id && { backgroundColor: DS.colors.brand.primaryMuted }]}>
                  <Ionicons name="person-circle-outline" size={22} color={selected === item.id ? DS.colors.brand.primary : DS.colors.neutral.textSecondary} />
                </View>
                <View style={styles.unitInfo}>
                  <Text style={[styles.unitName, selected === item.id && { color: DS.colors.brand.primary }]}>{item.name}</Text>
                  <View style={styles.unitLocation}>
                    <Ionicons name="location-outline" size={12} color={DS.colors.neutral.textTertiary} />
                    <Text style={styles.unitLocationText}>{item.location}</Text>
                  </View>
                  {item.distanceKm != null && (
                    <Text style={styles.unitDist}>{item.distanceKm < 10 ? item.distanceKm.toFixed(1) : Math.round(item.distanceKm)} km away</Text>
                  )}
                </View>
                <View style={styles.unitMeta}>
                  <View style={styles.availableBadge}>
                    <Text style={styles.availableText}>Available</Text>
                  </View>
                  {selected === item.id && (
                    <Ionicons name="checkmark-circle" size={22} color={DS.colors.brand.primary} style={{ marginTop: 6 }} />
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No agents found for "{search}"</Text>
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.codeBtn, !selected && styles.btnDisabled]}
            onPress={handleGetCode}
            disabled={!selected}
          >
            <Ionicons name="qr-code-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.codeBtnText}>Get Redemption Code</Text>
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
  unitCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1.5, borderColor: DS.colors.neutral.border },
  unitCardActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  unitIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: DS.colors.neutral.background, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  unitInfo: { flex: 1, gap: 3 },
  unitName: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text },
  unitLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unitLocationText: { fontSize: 12, color: DS.colors.neutral.textSecondary, flex: 1 },
  unitDist: { fontSize: 11, color: DS.colors.neutral.textTertiary },
  unitMeta: { alignItems: 'center', gap: 4 },
  availableBadge: { backgroundColor: '#D1FAE5', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3 },
  availableText: { fontSize: 10, fontWeight: '700', color: '#15803D' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: DS.colors.neutral.textSecondary },
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: DS.colors.neutral.border },
  codeBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  codeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
});
