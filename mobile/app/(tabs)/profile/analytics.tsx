/**
 * Analytics – Buffr G2P.
 * Spending, vouchers, transactions overview. §3.6.
 * Reads from transactions AsyncStorage to compute real monthly totals.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getTransactions, type Transaction } from '@/services/transactions';

type Period = 'this_month' | 'last_month' | 'all_time';

const PERIOD_LABELS: Record<Period, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  all_time: 'All Time',
};

interface Analytics {
  totalReceived: number;
  totalSent: number;
  vouchersRedeemed: number;
  billsPaid: number;
  billsTotal: number;
  cashOuts: number;
  cashOutTotal: number;
  txCount: number;
}

function computeAnalytics(txs: Transaction[], period: Period): Analytics {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  let filtered = txs.filter(t => t.status === 'success');
  if (period === 'this_month') {
    filtered = filtered.filter(t => new Date(t.createdAt) >= thisMonthStart);
  } else if (period === 'last_month') {
    filtered = filtered.filter(t => {
      const d = new Date(t.createdAt);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });
  }

  const inbound: Transaction['type'][] = ['voucher_redeem', 'receive', 'loan_disbursement', 'add_money'];
  const outbound: Transaction['type'][] = ['send', 'bill_pay', 'airtime', 'cash_out', 'loan_repayment'];

  const totalReceived = filtered
    .filter(t => inbound.includes(t.type))
    .reduce((s, t) => s + t.amount, 0);

  const totalSent = filtered
    .filter(t => outbound.includes(t.type))
    .reduce((s, t) => s + t.amount, 0);

  const voucherTxs = filtered.filter(t => t.type === 'voucher_redeem');
  const billTxs = filtered.filter(t => t.type === 'bill_pay' || t.type === 'airtime');
  const cashTxs = filtered.filter(t => t.type === 'cash_out');

  return {
    totalReceived,
    totalSent,
    vouchersRedeemed: voucherTxs.length,
    billsPaid: billTxs.length,
    billsTotal: billTxs.reduce((s, t) => s + t.amount, 0),
    cashOuts: cashTxs.length,
    cashOutTotal: cashTxs.reduce((s, t) => s + t.amount, 0),
    txCount: filtered.length,
  };
}

const N$ = (v: number) => `N$${v.toFixed(2)}`; // PRD §5: no space between N$ and amount

export default function ProfileAnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('this_month');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const txs = await getTransactions({ limit: 500 });
      setAnalytics(computeAnalytics(txs, period));
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const stats = analytics;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>

        {/* Period tabs */}
        <View style={styles.periodRow}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designSystem.colors.brand.primary} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={designSystem.colors.brand.primary} style={{ marginTop: 48 }} />
          ) : (
            <>
              {/* Net summary */}
              <View style={styles.heroCard}>
                <Text style={styles.heroLabel}>Total Received</Text>
                <Text style={styles.heroValue}>{N$(stats?.totalReceived ?? 0)}</Text>
                <View style={styles.heroDivider} />
                <View style={styles.heroRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Sent / Paid</Text>
                    <Text style={[styles.heroStatValue, { color: designSystem.colors.semantic.error }]}>
                      {N$(stats?.totalSent ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Net</Text>
                    <Text style={[styles.heroStatValue, { color: designSystem.colors.semantic.success }]}>
                      {N$((stats?.totalReceived ?? 0) - (stats?.totalSent ?? 0))}
                    </Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Transactions</Text>
                    <Text style={styles.heroStatValue}>{stats?.txCount ?? 0}</Text>
                  </View>
                </View>
              </View>

              {/* Breakdown cards */}
              <Text style={styles.sectionLabel}>Breakdown</Text>

              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="gift-outline" size={20} color="#D97706" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardLabel}>Vouchers redeemed</Text>
                    <Text style={styles.cardSub}>Government grants collected</Text>
                  </View>
                  <Text style={styles.cardCount}>{stats?.vouchersRedeemed ?? 0}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: designSystem.colors.brand.primaryMuted }]}>
                    <Ionicons name="receipt-outline" size={20} color={designSystem.colors.brand.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardLabel}>Bills & Airtime</Text>
                    <Text style={styles.cardSub}>{stats?.billsPaid ?? 0} payment{(stats?.billsPaid ?? 0) !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.cardAmount}>{N$(stats?.billsTotal ?? 0)}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="cash-outline" size={20} color={designSystem.colors.semantic.success} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardLabel}>Cash outs</Text>
                    <Text style={styles.cardSub}>{stats?.cashOuts ?? 0} withdrawal{(stats?.cashOuts ?? 0) !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.cardAmount}>{N$(stats?.cashOutTotal ?? 0)}</Text>
                </View>
              </View>

              <Text style={styles.footnote}>
                Pull to refresh · Analytics are computed from your local transaction history.
              </Text>

              <View style={{ height: 32 }} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },

  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: designSystem.colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9999,
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.background,
  },
  periodTabActive: { backgroundColor: designSystem.colors.brand.primary },
  periodTabText: { fontSize: 12, fontWeight: '600', color: designSystem.colors.neutral.textSecondary },
  periodTabTextActive: { color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 20 },

  heroCard: {
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  heroLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 6, marginBottom: 16 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  heroStatValue: { fontSize: 15, fontWeight: '700', color: '#fff' },
  heroStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: designSystem.colors.neutral.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardLabel: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text },
  cardSub: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  cardCount: { fontSize: 22, fontWeight: '800', color: designSystem.colors.brand.primary },
  cardAmount: { fontSize: 16, fontWeight: '700', color: designSystem.colors.neutral.text },

  footnote: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
});
