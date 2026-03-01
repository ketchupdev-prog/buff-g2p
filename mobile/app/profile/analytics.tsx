/**
 * Analytics – Buffr G2P.
 * Spending, vouchers, transactions overview. §3.6.
 */
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function ProfileAnalyticsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

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
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="wallet-outline" size={24} color={designSystem.colors.brand.primary} />
              <Text style={styles.cardLabel}>Total received (this month)</Text>
            </View>
            <Text style={styles.cardValue}>N$0.00</Text>
            <Text style={styles.cardHint}>Vouchers + P2P + other</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="gift-outline" size={24} color={designSystem.colors.semantic.success} />
              <Text style={styles.cardLabel}>Vouchers redeemed</Text>
            </View>
            <Text style={styles.cardValue}>0</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Ionicons name="arrow-up-outline" size={24} color={designSystem.colors.semantic.error} />
              <Text style={styles.cardLabel}>Sent (this month)</Text>
            </View>
            <Text style={styles.cardValue}>N$0.00</Text>
          </View>
          <Text style={styles.footnote}>Detailed charts and history coming soon.</Text>
          <View style={{ height: 32 }} />
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
  footnote: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textTertiary, marginTop: 8 },
});
