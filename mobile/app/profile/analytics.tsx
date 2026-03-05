/**
 * Analytics – Buffr G2P.
 * Spending, vouchers, transactions overview with charts. §3.6.
 * Displays real transaction data with visual charts.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { fetchAnalyticsSummary, getCurrentMonthRange, type AnalyticsSummary } from '@/services/analyticsService';

const screenWidth = Dimensions.get('window').width;

export default function ProfileAnalyticsScreen() {
  const { profile } = useUser();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!profile?.id) return;
    const token = await import('@/services/secureStorage').then((m) => m.getSecureItem('buffr_access_token'));
    if (!token) return;
    try {
      const { startDate, endDate } = getCurrentMonthRange();
      const data = await fetchAnalyticsSummary(profile.id, token, startDate, endDate);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  }, [loadAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatCurrency = (amount: number) => `N$${amount.toFixed(2)}`;

  // Prepare chart data
  const spendingChartData = analytics?.spendingByCategory?.length ? analytics.spendingByCategory.map((cat, idx) => ({
    name: cat.category.length > 10 ? cat.category.substring(0, 10) + '...' : cat.category,
    amount: cat.amount,
    color: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][idx % 6],
    legendFontColor: designSystem.colors.neutral.textSecondary,
    legendFontSize: 12,
  })) : [];

  // Prepare line chart data (last 7 days)
  const dailyData = analytics?.dailyTransactions?.slice(0, 7).reverse() ?? [];
  const lineChartData = {
    labels: dailyData.map((d) => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        data: dailyData.map((d) => d.income),
        color: () => designSystem.colors.semantic.success,
        strokeWidth: 2,
      },
      {
        data: dailyData.map((d) => d.expense),
        color: () => designSystem.colors.semantic.error,
        strokeWidth: 2,
      },
    ],
    legend: ['Income', 'Expense'],
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designSystem.colors.brand.primary} />}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={designSystem.colors.brand.primary} />
            </View>
          ) : (
            <>
              {/* Monthly Summary Cards */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="wallet-outline" size={24} color={designSystem.colors.brand.primary} />
                  <Text style={styles.cardLabel}>Total received (this month)</Text>
                </View>
                <Text style={styles.cardValue}>{formatCurrency(analytics?.monthly.totalReceived ?? 0)}</Text>
                <Text style={styles.cardHint}>Vouchers + P2P + other</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="gift-outline" size={24} color={designSystem.colors.semantic.success} />
                  <Text style={styles.cardLabel}>Vouchers redeemed</Text>
                </View>
                <Text style={styles.cardValue}>{analytics?.monthly.vouchersRedeemed ?? 0}</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="arrow-up-outline" size={24} color={designSystem.colors.semantic.error} />
                  <Text style={styles.cardLabel}>Sent (this month)</Text>
                </View>
                <Text style={styles.cardValue}>{formatCurrency(analytics?.monthly.totalSent ?? 0)}</Text>
              </View>

              {/* Spending by Category Chart */}
              {spendingChartData.length > 0 && (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Spending by Category</Text>
                  <PieChart
                    data={spendingChartData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={{
                      color: () => designSystem.colors.brand.primary,
                      labelColor: () => designSystem.colors.neutral.textSecondary,
                    }}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                </View>
              )}

              {/* Daily Income vs Expense Chart */}
              {dailyData.length > 0 && (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Income vs Expense (Last 7 Days)</Text>
                  <LineChart
                    data={lineChartData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={{
                      backgroundColor: designSystem.colors.neutral.surface,
                      backgroundGradientFrom: designSystem.colors.neutral.surface,
                      backgroundGradientTo: designSystem.colors.neutral.surface,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      labelColor: () => designSystem.colors.neutral.textSecondary,
                      style: { borderRadius: 16 },
                      propsForDots: { r: '4', strokeWidth: '2', stroke: designSystem.colors.neutral.surface },
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                </View>
              )}

              {!spendingChartData.length && !dailyData.length && (
                <View style={styles.emptyState}>
                  <Ionicons name="bar-chart-outline" size={48} color={designSystem.colors.neutral.textTertiary} />
                  <Text style={styles.emptyText}>No transaction data yet</Text>
                  <Text style={styles.emptyHint}>Start using Buffr to see your analytics</Text>
                </View>
              )}

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
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 20 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  card: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 20,
    marginBottom: 16,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardLabel: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary },
  cardValue: { ...designSystem.typography.textStyles.titleLg, color: designSystem.colors.neutral.text },
  cardHint: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textTertiary, marginTop: 4 },
  chartCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 20,
    marginBottom: 16,
  },
  chartTitle: {
    ...designSystem.typography.textStyles.bodyLg,
    color: designSystem.colors.neutral.text,
    marginBottom: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...designSystem.typography.textStyles.bodyLg,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 12,
  },
  emptyHint: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textTertiary,
    marginTop: 6,
  },
});
