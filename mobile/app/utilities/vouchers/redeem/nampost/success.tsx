/**
 * NamPost Redemption Success – Buffr G2P.
 * §3.4 Voucher redeemed → NamPost cash collection.
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

export default function NamPostSuccessScreen() {
  const { amount, bookingRef, branchName } = useLocalSearchParams<{
    amount?: string;
    bookingRef?: string;
    branchName?: string;
  }>();

  const { recordEvent } = useGamification();

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);
  const actionsOpacity = useSharedValue(0);

  useEffect(() => {
    recordEvent('voucher_redeem');

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

  const displayAmount = amount
    ? `N$${parseFloat(amount).toFixed(2)}`
    : 'your voucher amount';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <SuccessIcon size={88} bgColor={designSystem.colors.brand.primary} delay={60} />

        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>
            Collect{' '}
            <Text style={styles.highlight}>{displayAmount}</Text>
            {'\n'}at any NamPost branch
          </Text>

          {/* Instructions */}
          <View style={styles.instructionBox}>
            <View style={styles.instructionRow}>
              <Ionicons name="id-card-outline" size={18} color={designSystem.colors.brand.primary} />
              <Text style={styles.instructionText}>Bring a valid government-issued ID</Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="time-outline" size={18} color={designSystem.colors.brand.primary} />
              <Text style={styles.instructionText}>Booking valid for 14 days</Text>
            </View>
            {branchName ? (
              <View style={styles.instructionRow}>
                <Ionicons name="location-outline" size={18} color={designSystem.colors.brand.primary} />
                <Text style={styles.instructionText}>{branchName}</Text>
              </View>
            ) : null}
          </View>

          {bookingRef ? (
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Booking Reference</Text>
              <Text style={styles.refValue}>{bookingRef}</Text>
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
    marginBottom: 20,
  },
  highlight: {
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
  },
  instructionBox: {
    width: '100%',
    backgroundColor: designSystem.colors.neutral.background,
    borderRadius: designSystem.radius.sm,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instructionText: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
    flex: 1,
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
  },
  primaryButtonText: {
    ...designSystem.typography.textStyles.body,
    color: '#fff',
    fontWeight: '700',
  },
});
