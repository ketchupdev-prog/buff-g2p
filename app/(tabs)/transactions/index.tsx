/**
 * Transactions tab – Buffr G2P.
 * Design: reference TransactionsScreen patterns.
 * §3.5 screen 39 / Figma 114:302.
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
import {
  getTransactions,
  formatTransactionType,
  formatTransactionAmount,
  type Transaction,
  type TransactionType,
} from '@/services/transactions';

type FilterKey = 'all' | 'sent' | 'received' | 'vouchers' | 'bills';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'bills', label: 'Bills' },
];

const SENT_TYPES: TransactionType[] = ['send', 'cash_out', 'bill_pay', 'loan_repayment'];
const RECEIVED_TYPES: TransactionType[] = ['receive', 'voucher_redeem', 'add_money', 'loan_disbursement'];

function isPositive(type: TransactionType): boolean {
  return RECEIVED_TYPES.includes(type);
}

function matchesFilter(tx: Transaction, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'sent') return SENT_TYPES.includes(tx.type);
  if (filter === 'received') return RECEIVED_TYPES.includes(tx.type);
  if (filter === 'vouchers') return tx.type === 'voucher_redeem';
  if (filter === 'bills') return tx.type === 'bill_pay' || tx.type === 'airtime';
  return true;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-NA', { month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function groupByDate(txs: Transaction[]): Array<{ date: string; items: Transaction[] }> {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const label = formatDate(tx.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(tx);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export default function TransactionsScreen() {
  const { profile } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getTransactions({ limit: 50 });
      setTransactions(data);
    } catch {
      setError('Could not load transactions. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter((tx) => {
    const matchFilter = matchesFilter(tx, filter);
    const matchSearch = !searchTerm.trim() ||
      formatTransactionType(tx.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.counterparty ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const grouped = groupByDate(filtered);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <LinearGradient colors={['#F3F4F6', '#fff', '#F9FAFB']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header: Search (left) + Notification + Avatar (right) – §6.4 */}
        <AppHeader
          searchPlaceholder="Search transactions..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showSearch
          onNotificationPress={() => router.push('/(tabs)/profile/notifications' as never)}
          onAvatarPress={() => router.push('/(tabs)/profile' as never)}
          avatarUri={profile?.photoUri ?? null}
          notificationBadge
        />

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
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

        {/* List */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
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
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptyDesc}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            grouped.map(({ date, items }) => (
              <View key={date}>
                <Text style={styles.dateLabel}>{date}</Text>
                {items.map((tx) => {
                  const pos = isPositive(tx.type);
                  return (
                    <TouchableOpacity
                      key={tx.id}
                      style={styles.txRow}
                      onPress={() => router.push(`/(tabs)/transactions/${tx.id}` as never)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.txIconWrap, pos ? styles.txIconReceived : styles.txIconSent]}>
                        <Ionicons name={pos ? 'arrow-down' : 'arrow-up'} size={18} color="#fff" />
                      </View>
                      <View style={styles.txBody}>
                        <Text style={styles.txLabel} numberOfLines={1}>
                          {tx.counterparty ?? formatTransactionType(tx.type)}
                        </Text>
                        <Text style={styles.txMeta}>
                          {formatTransactionType(tx.type)}
                        </Text>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={[styles.txAmount, pos ? styles.txAmountPos : styles.txAmountNeg]}>
                          {formatTransactionAmount(tx)}
                        </Text>
                        <Text style={[
                          styles.txStatus,
                          tx.status === 'success' && styles.txStatusSuccess,
                          tx.status === 'pending' && styles.txStatusPending,
                          tx.status === 'failed' && styles.txStatusFailed,
                        ]}>
                          {tx.status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#0029D6', borderColor: '#0029D6' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  txIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txIconSent: { backgroundColor: '#E11D48' },
  txIconReceived: { backgroundColor: '#22C55E' },
  txBody: { flex: 1, minWidth: 0 },
  txLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  txMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txAmountPos: { color: '#22C55E' },
  txAmountNeg: { color: '#111827' },
  txStatus: { fontSize: 11, marginTop: 2, color: '#9CA3AF' },
  txStatusSuccess: { color: '#22C55E' },
  txStatusPending: { color: '#F59E0B' },
  txStatusFailed: { color: '#E11D48' },
  errorBox: { padding: 14, backgroundColor: '#FEE2E2', borderRadius: 12, marginTop: 24, alignItems: 'center' },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
});
