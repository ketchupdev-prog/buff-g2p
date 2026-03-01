/**
 * Transactions tab – Buffr G2P.
 * Enhanced analytics: Balance / Earnings / Spendings tabs, bar chart,
 * G2P category breakdown, grouped transaction list with avatar initials.
 * §21 screen.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { designSystem } from '@/constants/designSystem';
import { AppHeader } from '@/components/layout';
import { Avatar, getAvatarColor, StatusBadge, statusToVariant, SegmentedControl } from '@/components/ui';
import {
  getTransactions,
  formatTransactionType,
  transactionIcon,
  type Transaction,
  type TransactionType,
} from '@/services/transactions';

// ── Types ─────────────────────────────────────────────────────────────────────
type TabKey = 'balance' | 'earnings' | 'spendings';
type PeriodKey = 'weekly' | 'monthly' | 'alltime';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'balance', label: 'Balance' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'spendings', label: 'Spendings' },
];

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'alltime', label: 'All Time' },
];

// ── G2P Categories ────────────────────────────────────────────────────────────
interface Category {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  types: TransactionType[];
  isIncome: boolean;
}

const CATEGORIES: Category[] = [
  {
    key: 'vouchers',
    label: 'Vouchers & Grants',
    icon: 'ticket-outline',
    color: '#D97706',
    bg: '#FFFBEB',
    types: ['voucher_redeem', 'add_money'],
    isIncome: true,
  },
  {
    key: 'transfers',
    label: 'Transfers',
    icon: 'swap-horizontal-outline',
    color: '#0029D6',
    bg: '#EFF6FF',
    types: ['send', 'receive'],
    isIncome: false,
  },
  {
    key: 'bills',
    label: 'Bills & Utilities',
    icon: 'document-text-outline',
    color: '#E11D48',
    bg: '#FFF1F2',
    types: ['bill_pay'],
    isIncome: false,
  },
  {
    key: 'airtime',
    label: 'Airtime & Data',
    icon: 'phone-portrait-outline',
    color: '#0891B2',
    bg: '#ECFEFF',
    types: ['airtime'],
    isIncome: false,
  },
  {
    key: 'cashout',
    label: 'Cash Out',
    icon: 'cash-outline',
    color: '#7C3AED',
    bg: '#F5F3FF',
    types: ['cash_out'],
    isIncome: false,
  },
  {
    key: 'loans',
    label: 'Loans',
    icon: 'business-outline',
    color: '#6366F1',
    bg: '#EEF2FF',
    types: ['loan_disbursement', 'loan_repayment'],
    isIncome: false,
  },
];

const INCOME_TYPES: TransactionType[] = ['receive', 'voucher_redeem', 'add_money', 'loan_disbursement'];
const EXPENSE_TYPES: TransactionType[] = ['send', 'cash_out', 'bill_pay', 'airtime', 'loan_repayment'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isIncome(type: TransactionType): boolean {
  return INCOME_TYPES.includes(type);
}

function filterByPeriod(txs: Transaction[], period: PeriodKey): Transaction[] {
  if (period === 'alltime') return txs;
  const now = Date.now();
  const ms = period === 'weekly' ? 7 * 86400000 : 30 * 86400000;
  return txs.filter((t) => now - new Date(t.createdAt).getTime() <= ms);
}

/** Build bar chart buckets: weekly = 7 daily, monthly = 4 weekly */
function buildBuckets(
  txs: Transaction[],
  period: PeriodKey,
  tab: TabKey,
): Array<{ label: string; value: number }> {
  const now = new Date();
  if (period === 'weekly') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const label = d.toLocaleDateString('en-NA', { weekday: 'short' }).slice(0, 3);
      const dayStr = d.toISOString().slice(0, 10);
      const value = txs
        .filter((t) => {
          if (t.createdAt.slice(0, 10) !== dayStr) return false;
          if (tab === 'earnings') return isIncome(t.type);
          if (tab === 'spendings') return EXPENSE_TYPES.includes(t.type);
          return true; // balance: all
        })
        .reduce((sum, t) => {
          if (tab === 'balance') return sum + (isIncome(t.type) ? t.amount : -t.amount);
          return sum + t.amount;
        }, 0);
      return { label, value: Math.max(0, value) };
    });
  }
  // monthly: 4 weekly buckets
  return Array.from({ length: 4 }, (_, i) => {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    const label = `W${4 - i}`;
    const value = txs
      .filter((t) => {
        const d = new Date(t.createdAt);
        if (d < weekStart || d > weekEnd) return false;
        if (tab === 'earnings') return isIncome(t.type);
        if (tab === 'spendings') return EXPENSE_TYPES.includes(t.type);
        return true;
      })
      .reduce((sum, t) => {
        if (tab === 'balance') return sum + (isIncome(t.type) ? t.amount : -t.amount);
        return sum + t.amount;
      }, 0);
    return { label, value: Math.max(0, value) };
  }).reverse();
}

function formatAmount(n: number): string {
  if (n >= 1000) return `N$${(n / 1000).toFixed(1)}k`;
  return `N$${n.toFixed(0)}`;
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

// ── Bar Chart ─────────────────────────────────────────────────────────────────
const BAR_HEIGHT = 80;
const BAR_MIN_HEIGHT = 4;

function BarChart({ buckets, color }: { buckets: Array<{ label: string; value: number }>; color: string }) {
  const max = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <View style={chartStyles.wrap}>
      {buckets.map((b, i) => {
        const pct = b.value / max;
        const barH = Math.max(BAR_MIN_HEIGHT, Math.round(pct * BAR_HEIGHT));
        const isLast = i === buckets.length - 1;
        return (
          <View key={b.label} style={chartStyles.col}>
            <View style={chartStyles.barTrack}>
              <View style={[chartStyles.bar, { height: barH, backgroundColor: isLast ? color : color + '55' }]} />
            </View>
            <Text style={chartStyles.barLabel}>{b.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: BAR_HEIGHT + 24, paddingTop: 4 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: '60%', height: BAR_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const { profile } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<TabKey>('earnings');
  const [period, setPeriod] = useState<PeriodKey>('monthly');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getTransactions({ limit: 100 });
      setTransactions(data);
    } catch {
      setError('Could not load transactions. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Transactions filtered by period
  const periodTxs = useMemo(() => filterByPeriod(transactions, period), [transactions, period]);

  // Tab-specific totals
  const totalEarnings = useMemo(
    () => periodTxs.filter((t) => isIncome(t.type)).reduce((s, t) => s + t.amount, 0),
    [periodTxs],
  );
  const totalSpendings = useMemo(
    () => periodTxs.filter((t) => EXPENSE_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0),
    [periodTxs],
  );
  const netBalance = totalEarnings - totalSpendings;

  const tabTotal = tab === 'earnings' ? totalEarnings : tab === 'spendings' ? totalSpendings : netBalance;
  const tabColor = tab === 'spendings' ? '#E11D48' : '#22C55E';

  // Chart buckets (only shown for weekly/monthly)
  const buckets = useMemo(
    () => period !== 'alltime' ? buildBuckets(periodTxs, period, tab) : [],
    [periodTxs, period, tab],
  );

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const source = tab === 'earnings'
      ? periodTxs.filter((t) => isIncome(t.type))
      : tab === 'spendings'
      ? periodTxs.filter((t) => EXPENSE_TYPES.includes(t.type))
      : periodTxs;

    const total = source.reduce((s, t) => s + t.amount, 0) || 1;
    return CATEGORIES.map((cat) => {
      const amount = source
        .filter((t) => cat.types.includes(t.type))
        .reduce((s, t) => s + t.amount, 0);
      return { ...cat, amount, pct: amount / total };
    }).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [periodTxs, tab]);

  // Search-filtered transactions for list
  const listTxs = useMemo(() => {
    const base = period === 'alltime' ? transactions : periodTxs;
    if (!searchTerm.trim()) return base;
    const q = searchTerm.toLowerCase();
    return base.filter(
      (t) =>
        formatTransactionType(t.type).toLowerCase().includes(q) ||
        (t.counterparty ?? '').toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  }, [transactions, periodTxs, period, searchTerm]);

  const grouped = useMemo(() => groupByDate(listTxs), [listTxs]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
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

        {/* Segmented tabs */}
        <SegmentedControl
          options={TABS.map(t => t.key) as TabKey[]}
          selected={tab}
          onSelect={setTab}
          labels={{ balance: 'Balance', earnings: 'Earnings', spendings: 'Spendings' }}
          style={styles.tabRow}
        />

        <ScrollView
          style={styles.scroll}
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
          ) : (
            <>
              {/* Analytics card */}
              <View style={styles.analyticsCard}>
                {/* Period selector */}
                <View style={styles.periodRow}>
                  {PERIODS.map((p) => (
                    <TouchableOpacity
                      key={p.key}
                      style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
                      onPress={() => setPeriod(p.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Total amount */}
                <View style={styles.totalRow}>
                  <View>
                    <Text style={styles.totalLabel}>
                      {tab === 'balance' ? 'Net Balance' : tab === 'earnings' ? 'Total Earned' : 'Total Spent'}
                    </Text>
                    <Text style={[styles.totalAmount, { color: tab === 'spendings' ? '#E11D48' : '#111827' }]}>
                      {'N$'}{Math.abs(tabTotal).toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  {tab === 'balance' && (
                    <View style={[styles.changeBadge, { backgroundColor: netBalance >= 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Ionicons
                        name={netBalance >= 0 ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={netBalance >= 0 ? '#16A34A' : '#DC2626'}
                      />
                      <Text style={[styles.changeText, { color: netBalance >= 0 ? '#16A34A' : '#DC2626' }]}>
                        {netBalance >= 0 ? '+' : '-'}{'N$'}{Math.abs(netBalance).toFixed(0)}
                      </Text>
                    </View>
                  )}
                  {tab === 'earnings' && totalSpendings > 0 && (
                    <View style={styles.subStat}>
                      <Text style={styles.subStatLabel}>Spent</Text>
                      <Text style={styles.subStatValue}>{'N$'}{totalSpendings.toFixed(0)}</Text>
                    </View>
                  )}
                  {tab === 'spendings' && totalEarnings > 0 && (
                    <View style={styles.subStat}>
                      <Text style={styles.subStatLabel}>Earned</Text>
                      <Text style={[styles.subStatValue, { color: '#22C55E' }]}>{'N$'}{totalEarnings.toFixed(0)}</Text>
                    </View>
                  )}
                </View>

                {/* Bar chart */}
                {period !== 'alltime' && buckets.length > 0 && (
                  <BarChart buckets={buckets} color={tabColor} />
                )}
                {period === 'alltime' && (
                  <View style={styles.allTimeRow}>
                    <View style={styles.allTimeStat}>
                      <View style={[styles.allTimeDot, { backgroundColor: '#22C55E' }]} />
                      <Text style={styles.allTimeLabel}>Earned</Text>
                      <Text style={styles.allTimeVal}>{formatAmount(totalEarnings)}</Text>
                    </View>
                    <View style={styles.allTimeDivider} />
                    <View style={styles.allTimeStat}>
                      <View style={[styles.allTimeDot, { backgroundColor: '#E11D48' }]} />
                      <Text style={styles.allTimeLabel}>Spent</Text>
                      <Text style={styles.allTimeVal}>{formatAmount(totalSpendings)}</Text>
                    </View>
                    <View style={styles.allTimeDivider} />
                    <View style={styles.allTimeStat}>
                      <View style={[styles.allTimeDot, { backgroundColor: '#0029D6' }]} />
                      <Text style={styles.allTimeLabel}>Net</Text>
                      <Text style={[styles.allTimeVal, { color: netBalance >= 0 ? '#16A34A' : '#E11D48' }]}>
                        {netBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(netBalance))}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Category breakdown */}
              {categoryTotals.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Breakdown</Text>
                  {categoryTotals.map((cat) => (
                    <View key={cat.key} style={styles.catRow}>
                      <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                        <Ionicons name={cat.icon as never} size={18} color={cat.color} />
                      </View>
                      <View style={styles.catBody}>
                        <View style={styles.catTopRow}>
                          <Text style={styles.catLabel}>{cat.label}</Text>
                          <Text style={styles.catAmount}>{'N$'}{cat.amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <View style={styles.catBarTrack}>
                          <View style={[styles.catBarFill, { width: `${Math.round(cat.pct * 100)}%`, backgroundColor: cat.color }]} />
                        </View>
                        <Text style={styles.catPct}>{Math.round(cat.pct * 100)}% of total</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Recent transactions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transactions</Text>
                {grouped.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={44} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No transactions found</Text>
                    <Text style={styles.emptyDesc}>
                      {searchTerm ? 'Try a different search' : 'Nothing yet for this period'}
                    </Text>
                  </View>
                ) : (
                  grouped.map(({ date, items }) => (
                    <View key={date}>
                      <Text style={styles.dateLabel}>{date}</Text>
                      {items.map((tx) => {
                        const pos = isIncome(tx.type);
                        const hasCounterparty = !!tx.counterparty;
                        const displayName = tx.counterparty ?? formatTransactionType(tx.type);
                        const icon = transactionIcon(tx.type);
                        return (
                          <TouchableOpacity
                            key={tx.id}
                            style={styles.txRow}
                            onPress={() => router.push(`/(tabs)/transactions/${tx.id}` as never)}
                            activeOpacity={0.8}
                          >
                            {/* Avatar: initials for person, icon circle for system */}
                            {hasCounterparty ? (
                              <Avatar name={tx.counterparty ?? '?'} size={44} />
                            ) : (
                              <View style={[styles.avatar, { backgroundColor: pos ? '#D1FAE5' : '#FEE2E2' }]}>
                                <Ionicons name={icon as never} size={18} color={pos ? '#16A34A' : '#DC2626'} />
                              </View>
                            )}

                            <View style={styles.txBody}>
                              <Text style={styles.txLabel} numberOfLines={1}>{displayName}</Text>
                              <Text style={styles.txMeta}>{formatTransactionType(tx.type)}</Text>
                            </View>

                            <View style={styles.txRight}>
                              <Text style={[styles.txAmount, pos ? styles.txAmountPos : styles.txAmountNeg]}>
                                {pos ? '+' : '-'}{'N$'}{tx.amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                              </Text>
                              {tx.status !== 'success' && (
                                <StatusBadge
                                  label={tx.status}
                                  variant={statusToVariant(tx.status)}
                                  style={{ marginTop: 4 }}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))
                )}
              </View>

              <View style={{ height: 100 }} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },

  // Segmented tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#111827', fontWeight: '600' },

  scroll: { flex: 1 },

  // Analytics card
  analyticsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodBtnActive: { backgroundColor: '#0029D6', borderColor: '#0029D6' },
  periodText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  periodTextActive: { color: '#fff' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4, fontWeight: '500' },
  totalAmount: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  changeText: { fontSize: 12, fontWeight: '600' },
  subStat: { alignItems: 'flex-end' },
  subStatLabel: { fontSize: 11, color: '#9CA3AF' },
  subStatValue: { fontSize: 14, fontWeight: '700', color: '#111827' },

  // All-time stats row
  allTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  allTimeStat: { flex: 1, alignItems: 'center', gap: 4 },
  allTimeDot: { width: 8, height: 8, borderRadius: 4 },
  allTimeLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  allTimeVal: { fontSize: 13, fontWeight: '700', color: '#111827' },
  allTimeDivider: { width: 1, height: 36, backgroundColor: '#F3F4F6' },

  // Section
  section: { marginHorizontal: 24, marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  // Category breakdown
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catBody: { flex: 1 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  catAmount: { fontSize: 13, fontWeight: '700', color: '#111827' },
  catBarTrack: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 9999, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 9999 },
  catPct: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  // Date group label
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Transaction row
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  txBody: { flex: 1, minWidth: 0 },
  txLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txAmountPos: { color: '#22C55E' },
  txAmountNeg: { color: '#111827' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusFailed: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 10, fontWeight: '600' },
  statusPendingText: { color: '#D97706' },
  statusFailedText: { color: '#DC2626' },

  // Empty / Error
  errorBox: { padding: 14, backgroundColor: '#FEE2E2', borderRadius: 12, marginHorizontal: 24, marginTop: 24, alignItems: 'center' },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
});
