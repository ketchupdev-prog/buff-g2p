/**
 * Cash-Out Hub – Buffr G2P.
 * 5 methods: Bank, Till, Agent, Merchant, ATM.
 * §3.3 screen 17 / Figma PRD §3.3.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getWallet } from '@/services/wallets';
import { CASH_OUT_METHODS } from '@/services/cashout';

export default function CashOutHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(async () => {
    if (!id) return;
    try {
      const w = await getWallet(id);
      setBalance(w?.balance ?? null);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  function handleMethod(methodId: string) {
    if (methodId === 'bank') {
      router.push(`/wallets/${id}/cash-out/bank` as never);
    } else {
      // Till, Agent, Merchant, ATM → scan QR or navigate to specific screen
      router.push(`/wallets/${id}/cash-out/${methodId}` as never);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Cash Out',
          headerTitleStyle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
          headerBackTitleVisible: false,
          headerTintColor: designSystem.colors.neutral.text,
          headerStyle: { backgroundColor: designSystem.colors.neutral.surface },
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Balance */}
        <View style={styles.balanceBadge}>
          {loading ? (
            <ActivityIndicator color={designSystem.colors.brand.primary} size="small" />
          ) : balance !== null ? (
            <Text style={styles.balanceText}>Available: {'N$'}{balance.toFixed(2)}</Text>
          ) : null}
        </View>

        <Text style={styles.chooseLabel}>Choose method</Text>

        {CASH_OUT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={styles.methodCard}
            onPress={() => handleMethod(method.id)}
            accessibilityLabel={`${method.label}, fee ${method.fee}, ${method.time}`}
          >
            <View style={styles.methodIcon}>
              <Ionicons name={method.icon as never} size={22} color={designSystem.colors.brand.primary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodLabel}>{method.label}</Text>
              <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
            </View>
            <View style={styles.methodRight}>
              <Text style={styles.methodFee}>{method.fee}</Text>
              <Text style={styles.methodTime}>{method.time}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={designSystem.colors.neutral.textTertiary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  content: { padding: designSystem.spacing.g2p.horizontalPadding, paddingBottom: 40 },
  balanceBadge: {
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: designSystem.radius.md,
    padding: designSystem.spacing.scale.md,
    alignItems: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
    marginTop: designSystem.spacing.scale.md,
  },
  balanceText: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.brand.primary,
    fontWeight: '700',
  },
  chooseLabel: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: designSystem.spacing.scale.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.md,
    padding: designSystem.spacing.scale.md,
    marginBottom: designSystem.spacing.scale.md,
    ...designSystem.shadows.sm,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: { flex: 1 },
  methodLabel: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
  },
  methodSubtitle: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 2,
  },
  methodRight: { alignItems: 'flex-end', marginRight: 8 },
  methodFee: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.brand.primary,
    fontWeight: '600',
  },
  methodTime: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textTertiary,
    marginTop: 2,
  },
});
