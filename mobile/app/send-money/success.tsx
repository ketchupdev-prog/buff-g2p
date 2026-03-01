/**
 * Send Money – Success – Buffr G2P.
 * §3.4 screen 30 / Figma 87:410.
 * Animated success screen with Confetti + SuccessIcon + gamification event.
 * Uses UserContext for profile (personalized message).
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
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { useGamification } from '@/contexts/GamificationContext';
import { SuccessIcon } from '@/components/animations/SuccessIcon';
import { Confetti } from '@/components/animations/Confetti';

export default function SendSuccessScreen() {
  const { profile } = useUser();
  const { recipientName, amount, transactionId } = useLocalSearchParams<{
    recipientName: string;
    amount: string;
    transactionId?: string;
  }>();

  const { recordEvent } = useGamification();

  // Staggered content reveal
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);
  const actionsOpacity = useSharedValue(0);

  useEffect(() => {
    recordEvent('send');

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Confetti overlay */}
      <Confetti count={30} />

      <View style={styles.container}>
        {/* Animated checkmark */}
        <SuccessIcon size={88} bgColor={designSystem.colors.semantic.success} delay={60} />

        {/* Card */}
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.title}>Payment Successful</Text>
        <Text style={styles.receiptLabel}>Receipt</Text>
          <Text style={styles.subtitle}>
            You sent{' '}
            <Text style={styles.highlight}>N${displayAmount}</Text>
            {'\n'}to{' '}
            <Text style={styles.highlight}>{recipientName || 'Recipient'}</Text>
          </Text>

          {transactionId ? (
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Reference</Text>
              <Text style={styles.refValue}>{transactionId}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Actions */}
        <Animated.View style={[styles.actions, actionsStyle]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)' as never)}
            accessibilityLabel="Go to home"
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
          {transactionId ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(`/(tabs)/transactions/${transactionId}` as never)}
              accessibilityLabel="View transaction details"
            >
              <Text style={styles.secondaryButtonText}>View Details</Text>
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
    marginBottom: 4,
  },
  receiptLabel: {
    fontSize: 13,
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 10,
  },
  subtitle: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  highlight: {
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
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
