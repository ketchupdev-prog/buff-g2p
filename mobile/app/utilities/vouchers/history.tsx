/**
 * Voucher History – Buffr G2P.
 * List of redeemed and expired vouchers.
 * §3.2 voucher history.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getVouchers, type Voucher } from '@/services/vouchers';

const FILTERS = ['all', 'redeemed', 'expired'] as const;
type Filter = typeof FILTERS[number];

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

const METHOD_LABELS: Record<string, string> = {
  wallet: 'Buffr Wallet',
  nampost: 'NamPost Branch',
  smartpay: 'SmartPay Agent',
};

export default function VoucherHistoryScreen() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    getVouchers().then(all => {
      // Only show non-available (historical) vouchers
      setVouchers(all.filter(v => v.status !== 'available'));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const displayed = filter === 'all' ? vouchers : vouchers.filter(v => v.status === filter);

  function renderItem({ item }: { item: Voucher }) {
    const isRedeemed = item.status === 'redeemed';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/utilities/vouchers/[id]' as never, params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIcon, { backgroundColor: isRedeemed ? '#D1FAE5' : '#F1F5F9' }]}>
          <Ionicons
            name={isRedeemed ? 'checkmark-circle-outline' : 'time-outline'}
            size={22}
            color={isRedeemed ? '#22C55E' : '#94A3B8'}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardProgramme}>{item.programme}</Text>
          <Text style={styles.cardDate}>
            {isRedeemed ? `Redeemed ${formatDate(item.redeemedAt ?? item.issuedAt)}` : `Expired ${formatDate(item.expiresAt)}`}
          </Text>
          {isRedeemed && item.redeemedMethod && (
            <Text style={styles.cardMethod}>via {METHOD_LABELS[item.redeemedMethod] ?? item.redeemedMethod}</Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: isRedeemed ? '#22C55E' : '#94A3B8' }]}>
            N${item.amount.toLocaleString()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: isRedeemed ? '#D1FAE5' : '#F1F5F9' }]}>
            <Text style={[styles.statusBadgeText, { color: isRedeemed ? '#15803D' : '#94A3B8' }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Voucher History', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {/* Filter tabs */}
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={designSystem.colors.brand.primary} /></View>
        ) : displayed.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No vouchers</Text>
            <Text style={styles.emptySub}>
              {filter === 'all' ? 'Your past vouchers will appear here.' : `No ${filter} vouchers yet.`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
  filters: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: DS.colors.neutral.border },
  filterChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  filterChipTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: DS.colors.neutral.border },
  cardIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardProgramme: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 2 },
  cardDate: { fontSize: 12, color: DS.colors.neutral.textSecondary },
  cardMethod: { fontSize: 11, color: DS.colors.neutral.textTertiary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 16, fontWeight: '800' },
  statusBadge: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
});
