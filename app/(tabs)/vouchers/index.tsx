/**
 * Vouchers tab – Buffr G2P.
 * Design: reference VouchersScreen + VoucherCardG2P patterns.
 * §3.2 screen 8.
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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { designSystem } from '@/constants/designSystem';
import { AppHeader } from '@/components/layout';
import { getVouchers, type Voucher, type VoucherStatus } from '@/services/vouchers';

// Voucher type metadata matching reference VoucherCardG2P
type VoucherType = 'child' | 'basic-income' | 'old-age-disability' | string;

const VOUCHER_TYPE_INFO: Record<string, { label: string; emoji: string; bgColor: string; textColor: string }> = {
  'child': { label: 'Child Cash Grant', emoji: '👶', bgColor: '#DBEAFE', textColor: '#2563EB' },
  'basic-income': { label: 'Basic Income Grant', emoji: '💰', bgColor: '#D1FAE5', textColor: '#22C55E' },
  'old-age-disability': { label: 'Old Age & Disability', emoji: '🛡️', bgColor: '#F3E8FF', textColor: '#7C3AED' },
};

const STATUS_INFO: Record<VoucherStatus, { label: string; bgColor: string; iconName: string }> = {
  available: { label: 'Available', bgColor: '#D1FAE5', iconName: 'checkmark-circle' },
  redeemed: { label: 'Redeemed', bgColor: '#F3F4F6', iconName: 'checkmark-circle' },
  expired: { label: 'Expired', bgColor: '#FEE2E2', iconName: 'close-circle' },
  pending: { label: 'Pending', bgColor: '#FEF3C7', iconName: 'time' },
};

const STATUS_TEXT_COLOR: Record<VoucherStatus, string> = {
  available: '#16A34A',
  redeemed: '#4B5563',
  expired: '#DC2626',
  pending: '#D97706',
};

const TYPE_FILTERS = [
  { key: 'all', label: 'All Types' },
  { key: 'child', label: 'Child Grant' },
  { key: 'basic-income', label: 'Basic Income' },
  { key: 'old-age-disability', label: 'Old Age & Disability' },
];
const STATUS_FILTERS: Array<{ key: VoucherStatus | 'all'; label: string; activeBg: string }> = [
  { key: 'all', label: 'All', activeBg: '#0029D6' },
  { key: 'available', label: 'Available', activeBg: '#16A34A' },
  { key: 'redeemed', label: 'Redeemed', activeBg: '#4B5563' },
  { key: 'expired', label: 'Expired', activeBg: '#DC2626' },
];

function guessType(programme: string): string {
  const p = programme.toLowerCase();
  if (p.includes('child')) return 'child';
  if (p.includes('basic') || p.includes('income')) return 'basic-income';
  if (p.includes('old') || p.includes('disability')) return 'old-age-disability';
  return 'basic-income';
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

export default function VouchersScreen() {
  const { profile } = useUser();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getVouchers();
      setVouchers(data);
    } catch {
      setError('Could not load vouchers. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = vouchers.filter((v) => {
    const vType = guessType(v.programme);
    const matchType = typeFilter === 'all' || vType === typeFilter;
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchSearch = !searchQuery.trim() ||
      v.programme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.reference ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <LinearGradient colors={['#EFF6FF', '#ECFEFF', '#fff']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header: Search (left) + Notification + Avatar (right) – §6.4 */}
        <AppHeader
          searchPlaceholder="Search vouchers..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch
          onNotificationPress={() => router.push('/(tabs)/profile/notifications' as never)}
          onAvatarPress={() => router.push('/(tabs)/profile' as never)}
          avatarUri={profile?.photoUri ?? null}
          notificationBadge
        />

        {/* Type filter chips (scrollable) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScrollWrap} contentContainerStyle={styles.typeScroll}>
          {TYPE_FILTERS.map((f) => {
            const isActive = typeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.typeChip, isActive && styles.typeChipActive]}
                onPress={() => setTypeFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Status filter chips */}
        <View style={styles.statusRow}>
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.statusChip, isActive && { backgroundColor: f.activeBg, borderColor: f.activeBg }]}
                onPress={() => setStatusFilter(f.key as VoucherStatus | 'all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#0029D6"
            />
          }
        >
          {loading ? (
            <ActivityIndicator color="#0029D6" style={{ marginTop: 48 }} />
          ) : error ? (
            <TouchableOpacity onPress={load} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="filter-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No vouchers found</Text>
              <Text style={styles.emptyDesc}>Try adjusting your filters</Text>
            </View>
          ) : (
            filtered.map((v) => {
              const vType = guessType(v.programme);
              const typeInfo = VOUCHER_TYPE_INFO[vType] ?? VOUCHER_TYPE_INFO['basic-income'];
              const statusConfig = STATUS_INFO[v.status] ?? STATUS_INFO['available'];
              const statusTextColor = STATUS_TEXT_COLOR[v.status] ?? '#6B7280';
              const isAvailable = v.status === 'available';

              return (
                <TouchableOpacity
                  key={v.id}
                  style={styles.voucherCard}
                  onPress={() => router.push(`/utilities/vouchers/${v.id}` as never)}
                  activeOpacity={0.9}
                >
                  {/* Top row: type icon + status badge */}
                  <View style={styles.cardTop}>
                    <View style={styles.typeRow}>
                      <View style={[styles.typeIcon, { backgroundColor: typeInfo.bgColor }]}>
                        <Text style={styles.typeEmoji}>{typeInfo.emoji}</Text>
                      </View>
                      <View>
                        <Text style={styles.typeLabelText}>{typeInfo.label}</Text>
                        {v.reference ? <Text style={styles.voucherRef}>#{v.reference}</Text> : null}
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                      <Ionicons name={statusConfig.iconName as never} size={13} color={statusTextColor} />
                      <Text style={[styles.statusText, { color: statusTextColor }]}>{statusConfig.label}</Text>
                    </View>
                  </View>

                  {/* Amount row */}
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amountValue}>N$ {v.amount.toLocaleString()}</Text>
                  </View>

                  {/* Dates */}
                  <View style={styles.datesRow}>
                    <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.dateText}>Issued: {formatDate(v.issuedAt)}</Text>
                    <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.dateText}>
                      {isAvailable ? `Expires: ${formatDate(v.expiresAt)}` : v.redeemedAt ? `Redeemed: ${formatDate(v.redeemedAt)}` : `Expired: ${formatDate(v.expiresAt)}`}
                    </Text>
                  </View>

                  {/* Progress bar for available */}
                  {isAvailable && <View style={[styles.progressBar, { backgroundColor: typeInfo.textColor }]} />}
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  typeScroll: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingBottom: 12 },
  typeScrollWrap: { flexGrow: 0, flexShrink: 0 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  typeChipActive: { backgroundColor: '#0029D6', borderColor: '#0029D6' },
  typeChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  typeChipTextActive: { color: '#fff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, marginBottom: 16 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  statusChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  statusChipTextActive: { color: '#fff' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 4 },
  errorBox: { padding: 14, backgroundColor: '#FEE2E2', borderRadius: 12, marginTop: 24, alignItems: 'center' },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  // VoucherCard
  voucherCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  typeEmoji: { fontSize: 24 },
  typeLabelText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  voucherRef: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
  statusText: { fontSize: 12, fontWeight: '500' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  amountLabel: { fontSize: 14, color: '#6B7280' },
  amountValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  progressBar: { height: 6, borderRadius: 9999, marginTop: 12, width: '100%' },
});
