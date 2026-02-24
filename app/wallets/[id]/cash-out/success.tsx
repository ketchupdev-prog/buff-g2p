/**
 * Cash-Out Success – Buffr G2P.
 * §3.4 Wallet cash-out confirmation screen.
 * Animated with SuccessIcon + gamification event.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '@/constants/designSystem';
import { useGamification } from '@/contexts/GamificationContext';
import { SuccessIcon } from '@/components/animations/SuccessIcon';

const METHOD_LABELS: Record<string, string> = {
  bank: 'Bank Transfer',
  till: 'Till / Blue Wallet',
  agent: 'Agent Cash-Out',
  merchant: 'Merchant Pay-Out',
  atm: 'ATM Withdrawal',
};

export default function CashOutSuccessScreen() {
  const { amount, method, reference, walletId } = useLocalSearchParams<{
    amount: string;
    method: string;
    reference?: string;
    walletId?: string;
  }>();

  const { recordEvent } = useGamification();

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);
  const actionsOpacity = useSharedValue(0);

  useEffect(() => {
    recordEvent('cashout');

    cardOpacity.value = withDelay(300, withTiming(1, { duration: 320 }));
    cardTranslateY.value = withDelay(300, withSpring(0, { damping: 18, stiffness: 120 }));
    actionsOpacity.value = withDelay(600, withTiming(1, { duration: 280 }));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
  }));

  const displayAmount = parseFloat(amount ?? '0').toFixed(2);
  const methodLabel = METHOD_LABELS[method ?? ''] ?? 'Cash-Out';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <SuccessIcon size={88} bgColor={designSystem.colors.brand.primary} delay={60} />

        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.title}>Cash-Out Initiated</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.highlight}>{'N$'}{displayAmount}</Text>
            {'\n'}via{' '}
            <Text style={styles.highlight}>{methodLabel}</Text>
          </Text>

          {/* Method detail row */}
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={16} color={designSystem.colors.neutral.textSecondary} />
            <Text style={styles.detailText}>
              {method === 'bank'
                ? 'Funds will arrive within 1–2 business days'
                : method === 'atm'
                ? 'Use your reference code at the ATM'
                : 'Cash available for collection immediately'}
            </Text>
          </View>

          {reference ? (
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Reference</Text>
              <Text style={styles.refValue}>{reference}</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={[styles.actions, actionsStyle]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)' as never)}
            accessibilityLabel="Go to home"
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
          {walletId ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace(`/wallets/${walletId}` as never)}
              accessibilityLabel="View wallet"
            >
              <Text style={styles.secondaryButtonText}>View Wallet</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
  },
  card: {
    width: '100%',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.lg,
    padding: 24,
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 32,
    ...designSystem.shadows.md,
  },
  title: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  highlight: {
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: designSystem.colors.neutral.background,
    borderRadius: designSystem.radius.sm,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  detailText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  refBox: {
    backgroundColor: designSystem.colors.neutral.background,
    borderRadius: designSystem.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
  },
  refLabel: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
  },
  refValue: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
    marginTop: 2,
  },
  actions: { width: '100%' },
  primaryButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    ...designSystem.typography.textStyles.body,
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    height: designSystem.components.button.height,
    borderWidth: 1.5,
    borderColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.brand.primary,
    fontWeight: '600',
  },
});
