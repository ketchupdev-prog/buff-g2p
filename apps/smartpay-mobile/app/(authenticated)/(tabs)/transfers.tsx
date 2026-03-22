/**
 * Transactions tab – clean transaction history hub.
 * Location: fintech/smartpay/app/(authenticated)/(tabs)/transfers.tsx
 */
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designSystem } from '@/constants/designSystem';
import { getTransactions, type Transaction, formatTransactionType } from '@/services/transactions';
import { Ionicons } from '@expo/vector-icons';
import { useWallets } from '@/contexts/WalletsContext';
import Svg, { Circle, Line, Path } from 'react-native-svg';

const ds = designSystem;

type Segment = 'spending' | 'earnings';
type Range = '7d' | '30d' | '90d';
type SpendingCategory = 'Transfers' | 'Cash Out' | 'Bills' | 'Group' | 'Loans' | 'Voucher' | 'Other';

const outgoingTypes = new Set([
  'send',
  'cashout',
  'bill_payment',
  'airtime',
  'loan_payment',
  'loan_repayment',
  'p2p_transfer',
  'cashout_bank',
  'cashout_till',
  'cashout_agent',
  'cashout_merchant',
  'cashout_atm',
  'split_payment',
  'group_contribution',
  'debit',
]);

const incomingTypes = new Set([
  'receive',
  'cashin',
  'voucher_redeem',
  'voucher_redemption',
  'voucher_redemption_nampost',
  'voucher_redemption_smartpay',
  'loan_disbursement',
  'add_money',
  'group_withdrawal',
  'credit',
]);

function getTransactionDate(tx: Transaction): Date {
  return new Date(tx.timestamp ?? tx.createdAt ?? tx.created_at ?? Date.now());
}

function isIncoming(tx: Transaction): boolean {
  if (tx.direction === 'in') return true;
  if (tx.direction === 'out') return false;
  if (incomingTypes.has(tx.type)) return true;
  if (outgoingTypes.has(tx.type)) return false;
  return tx.amount > 0;
}

function signedAmount(tx: Transaction): number {
  const absAmount = Math.abs(tx.amount);
  return isIncoming(tx) ? absAmount : -absAmount;
}

function formatAmount(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}N$${Math.abs(value).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(tx: Transaction): string {
  return getTransactionDate(tx).toLocaleDateString('en-NA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function spendingCategory(tx: Transaction): SpendingCategory {
  if (['send', 'p2p_transfer'].includes(tx.type)) return 'Transfers';
  if (['cashout', 'cashout_bank', 'cashout_till', 'cashout_agent', 'cashout_merchant', 'cashout_atm'].includes(tx.type)) return 'Cash Out';
  if (['bill_payment', 'airtime'].includes(tx.type)) return 'Bills';
  if (['split_payment', 'group_contribution', 'group_withdrawal'].includes(tx.type)) return 'Group';
  if (['loan_payment', 'loan_repayment'].includes(tx.type)) return 'Loans';
  if (['voucher', 'voucher_redeem', 'voucher_redemption', 'voucher_redemption_nampost', 'voucher_redemption_smartpay'].includes(tx.type)) {
    return 'Voucher';
  }
  return 'Other';
}

function getBucketConfig(range: Range): { days: number; buckets: number } {
  if (range === '7d') return { days: 7, buckets: 7 };
  if (range === '30d') return { days: 30, buckets: 10 };
  return { days: 90, buckets: 12 };
}

function linePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  return points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export default function TransfersScreen() {
  const { totalBalance } = useWallets();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [segment, setSegment] = React.useState<Segment>('spending');
  const [range, setRange] = React.useState<Range>('30d');

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getTransactions({ limit: 100 })
        .then((items) => {
          if (!cancelled) {
            setTransactions(items);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            if (__DEV__) {
              console.log('[Transactions] load failed:', error instanceof Error ? error.message : 'Unknown error');
            }
            setTransactions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const filteredTransactions = React.useMemo(() => {
    const now = Date.now();
    const { days } = getBucketConfig(range);
    const minDate = now - days * 24 * 60 * 60 * 1000;

    return transactions.filter((tx) => {
      const txDate = getTransactionDate(tx).getTime();
      if (Number.isNaN(txDate) || txDate < minDate) return false;
      if (segment === 'spending') return signedAmount(tx) < 0;
      return signedAmount(tx) > 0;
    });
  }, [transactions, segment, range]);

  const periodTransactions = React.useMemo(() => {
    const now = Date.now();
    const { days } = getBucketConfig(range);
    const minDate = now - days * 24 * 60 * 60 * 1000;

    return transactions.filter((tx) => {
      const txDate = getTransactionDate(tx).getTime();
      if (Number.isNaN(txDate) || txDate < minDate) return false;
      return true;
    });
  }, [transactions, range]);

  const totals = React.useMemo(() => {
    let spending = 0;
    let earnings = 0;
    // Summary strip should reflect the selected period totals (range), not the active segment tab.
    for (const tx of periodTransactions) {
      const amount = signedAmount(tx);
      if (amount < 0) spending += Math.abs(amount);
      if (amount > 0) earnings += amount;
    }
    return {
      spending,
      earnings,
      net: earnings - spending,
    };
  }, [periodTransactions]);

  const chartData = React.useMemo(() => {
    const now = Date.now();
    const { days, buckets } = getBucketConfig(range);
    const periodMs = days * 24 * 60 * 60 * 1000;
    const bucketMs = periodMs / buckets;
    const currentStart = now - periodMs;
    const previousStart = currentStart - periodMs;

    const current = new Array<number>(buckets).fill(0);
    const previous = new Array<number>(buckets).fill(0);

    for (const tx of transactions) {
      const txTime = getTransactionDate(tx).getTime();
      if (Number.isNaN(txTime) || txTime < previousStart || txTime > now) continue;
      const amount = Math.abs(signedAmount(tx));
      const txIsIncoming = signedAmount(tx) > 0;
      if (segment === 'spending' && txIsIncoming) continue;
      if (segment === 'earnings' && !txIsIncoming) continue;

      if (txTime >= currentStart) {
        const idx = Math.min(buckets - 1, Math.max(0, Math.floor((txTime - currentStart) / bucketMs)));
        current[idx] += amount;
      } else {
        const idx = Math.min(buckets - 1, Math.max(0, Math.floor((txTime - previousStart) / bucketMs)));
        previous[idx] += amount;
      }
    }

    return { current, previous };
  }, [transactions, range, segment]);

  const chartSeries = React.useMemo(() => {
    const width = 320;
    const height = 180;
    const paddingX = 12;
    const paddingY = 12;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const maxValue = Math.max(1, ...chartData.current, ...chartData.previous);
    const count = chartData.current.length;
    const step = count > 1 ? innerWidth / (count - 1) : innerWidth;

    const toPoints = (values: number[]) =>
      values.map((value, idx) => {
        const ratio = value / maxValue;
        return {
          x: paddingX + idx * step,
          y: paddingY + innerHeight * (1 - ratio),
        };
      });

    const currentPoints = toPoints(chartData.current);
    const previousPoints = toPoints(chartData.previous);

    return {
      width,
      height,
      currentPoints,
      previousPoints,
      currentPath: linePath(currentPoints),
      previousPath: linePath(previousPoints),
      currentTotal: chartData.current.reduce((sum, value) => sum + value, 0),
      previousTotal: chartData.previous.reduce((sum, value) => sum + value, 0),
    };
  }, [chartData]);

  const spendingByCategory = React.useMemo(() => {
    const map = new Map<SpendingCategory, number>();
    for (const tx of filteredTransactions) {
      const amount = signedAmount(tx);
      if (amount >= 0) continue;
      const key = spendingCategory(tx);
      map.set(key, (map.get(key) ?? 0) + Math.abs(amount));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredTransactions]);

  const recentTransactions = React.useMemo(
    () =>
      [...filteredTransactions]
        .sort((a, b) => getTransactionDate(b).getTime() - getTransactionDate(a).getTime())
        .slice(0, 8),
    [filteredTransactions]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Compare periods, spot trends, and review history.</Text>

        <View style={styles.segmentRow}>
          {([
            ['spending', 'Spendings'],
            ['earnings', 'Earnings'],
          ] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.segmentButton, segment === key && styles.segmentButtonActive]}
              onPress={() => setSegment(key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, segment === key && styles.segmentTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={styles.summaryValue}>N${totalBalance.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Spendings</Text>
            <Text style={styles.summaryValue}>N${totals.spending.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Earnings</Text>
            <Text style={styles.summaryValue}>N${totals.earnings.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>
                {segment === 'spending' ? 'Spending trend' : 'Earnings trend'}
              </Text>
              <Text style={styles.chartSubtitle}>Current vs previous period</Text>
            </View>
            <View style={styles.chartRangeRow}>
              {([
                ['7d', '7D'],
                ['30d', '30D'],
                ['90d', '90D'],
              ] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chartChip, range === key && styles.chartChipActive]}
                  onPress={() => setRange(key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chartChipText, range === key && styles.chartChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Svg width={chartSeries.width} height={chartSeries.height}>
            <Line
              x1="12"
              y1={String(chartSeries.height - 12)}
              x2={String(chartSeries.width - 12)}
              y2={String(chartSeries.height - 12)}
              stroke={ds.colors.border}
              strokeWidth="1"
            />
            <Path d={chartSeries.previousPath} stroke={ds.colors.textSecondary} strokeWidth="2" fill="none" strokeDasharray="4 3" />
            <Path d={chartSeries.currentPath} stroke={ds.colors.brand.primary} strokeWidth="3" fill="none" />
            {chartSeries.currentPoints.length > 0 ? (
              <Circle
                cx={chartSeries.currentPoints[chartSeries.currentPoints.length - 1].x}
                cy={chartSeries.currentPoints[chartSeries.currentPoints.length - 1].y}
                r="4"
                fill={ds.colors.brand.primary}
              />
            ) : null}
          </Svg>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ds.colors.brand.primary }]} />
              <Text style={styles.legendText}>Current: N${chartSeries.currentTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ds.colors.textSecondary }]} />
              <Text style={styles.legendText}>Previous: N${chartSeries.previousTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {segment === 'spending' ? (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryTitle}>Categorized spending</Text>
            {spendingByCategory.length === 0 ? (
              <Text style={styles.emptyInlineText}>No spending categories in this period.</Text>
            ) : (
              <View style={styles.categoryWrap}>
                {spendingByCategory.map(([category, amount]) => (
                  <View key={category} style={styles.categoryPill}>
                    <Text style={styles.categoryPillLabel}>{category}</Text>
                    <Text style={styles.categoryPillAmount}>N${amount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Recent transactions</Text>
        <View style={styles.listCard}>
          {loading ? (
            <Text style={styles.emptyText}>Loading transactions...</Text>
          ) : recentTransactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions in this period.</Text>
          ) : (
            recentTransactions.map((tx, idx) => {
              const amount = signedAmount(tx);
              const incoming = amount > 0;
              return (
                <View key={tx.id} style={[styles.row, idx === recentTransactions.length - 1 && styles.rowLast]}>
                  <View style={[styles.rowIcon, incoming ? styles.rowIconIn : styles.rowIconOut]}>
                    <Ionicons
                      name={incoming ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={18}
                      color={incoming ? ds.colors.semantic.success : ds.colors.text}
                    />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {tx.description || formatTransactionType(tx.type)}
                    </Text>
                    <Text style={styles.rowMeta}>{formatDate(tx)}</Text>
                  </View>
                  <Text style={[styles.rowAmount, incoming ? styles.rowAmountIn : styles.rowAmountOut]}>
                    {formatAmount(amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.colors.background },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: ds.spacing.smartpay.horizontalPadding,
    paddingTop: ds.spacing.lg,
    paddingBottom: ds.spacing.xxl,
  },
  title: { ...ds.typography.textStyles.h1, color: ds.colors.text, marginBottom: ds.spacing.xs },
  subtitle: { ...ds.typography.textStyles.bodySm, color: ds.colors.textSecondary, marginBottom: ds.spacing.lg },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: ds.colors.surface,
    borderWidth: 1,
    borderColor: ds.colors.border,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.md,
    marginBottom: ds.spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    ...ds.typography.textStyles.bodySm,
    color: ds.colors.text,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: ds.spacing.sm,
    marginBottom: ds.spacing.md,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: ds.components.button.borderRadiusPill,
    borderWidth: 1,
    borderColor: ds.colors.border,
    backgroundColor: ds.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    borderColor: ds.colors.brand.primary,
    backgroundColor: ds.colors.brand.primary,
  },
  segmentText: {
    ...ds.typography.textStyles.bodySm,
    color: ds.colors.text,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  chartCard: {
    backgroundColor: ds.colors.surface,
    borderWidth: 1,
    borderColor: ds.colors.border,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.md,
    marginBottom: ds.spacing.md,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: ds.spacing.sm,
    gap: ds.spacing.sm,
  },
  chartHeader: {
    flex: 1,
  },
  chartTitle: {
    ...ds.typography.textStyles.bodySm,
    color: ds.colors.text,
    fontWeight: '700',
  },
  chartSubtitle: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.textSecondary,
    marginTop: 2,
  },
  chartRangeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chartChip: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: ds.components.button.borderRadiusPill,
    borderWidth: 1,
    borderColor: ds.colors.border,
    backgroundColor: ds.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartChipActive: {
    borderColor: ds.colors.brand.primary,
    backgroundColor: ds.colors.brand.primaryLight,
  },
  chartChipText: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  chartChipTextActive: {
    color: ds.colors.brand.primary,
  },
  legendRow: {
    marginTop: ds.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: ds.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: ds.radius.full,
    marginRight: 6,
  },
  legendText: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.textSecondary,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: ds.colors.surface,
    borderWidth: 1,
    borderColor: ds.colors.border,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.md,
  },
  sectionTitle: {
    ...ds.typography.textStyles.bodySm,
    color: ds.colors.text,
    fontWeight: '700',
    marginBottom: ds.spacing.sm,
  },
  categoryCard: {
    backgroundColor: ds.colors.surface,
    borderWidth: 1,
    borderColor: ds.colors.border,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.md,
    marginBottom: ds.spacing.md,
  },
  categoryTitle: {
    ...ds.typography.textStyles.bodySm,
    color: ds.colors.text,
    fontWeight: '700',
    marginBottom: ds.spacing.sm,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ds.spacing.sm,
  },
  categoryPill: {
    borderWidth: 1,
    borderColor: ds.colors.border,
    borderRadius: ds.components.button.borderRadiusPill,
    paddingVertical: 8,
    paddingHorizontal: ds.spacing.md,
    backgroundColor: ds.colors.surface,
  },
  categoryPillLabel: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.textSecondary,
    marginBottom: 2,
  },
  categoryPillAmount: {
    ...ds.typography.textStyles.bodySm,
    color: ds.colors.text,
    fontWeight: '700',
  },
  emptyInlineText: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.textSecondary,
  },
  emptyText: {
    ...ds.typography.textStyles.bodySm,
    color: ds.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: ds.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ds.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ds.colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: ds.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ds.spacing.sm,
  },
  rowIconIn: {
    backgroundColor: ds.colors.semantic.successLight,
  },
  rowIconOut: {
    backgroundColor: ds.colors.neutral.muted,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    ...ds.typography.textStyles.bodySm,
    color: ds.colors.text,
    fontWeight: '600',
  },
  rowMeta: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.textSecondary,
    marginTop: 2,
  },
  rowAmount: {
    ...ds.typography.textStyles.bodySm,
    fontWeight: '700',
  },
  rowAmountIn: {
    color: ds.colors.semantic.success,
  },
  rowAmountOut: {
    color: ds.colors.text,
  },
});
