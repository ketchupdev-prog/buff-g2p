/**
 * SuccessHero
 * Purpose: Shared success header block used by transaction success screens.
 * Location: fintech/apps/smartpay-mobile/components/receipts/SuccessHero.tsx
 */
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem as DS } from '@/constants/designSystem';

interface SuccessHeroProps {
  scaleAnim: Animated.Value;
  title: string;
  amount: string;
  subtitle: string;
}

export function SuccessHero({ scaleAnim, title, amount, subtitle }: SuccessHeroProps) {
  return (
    <View style={styles.successSection}>
      <Animated.View style={[styles.checkmarkCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="checkmark" size={48} color={DS.colors.background} />
      </Animated.View>

      <Text style={styles.successTitle}>{title}</Text>
      <Text style={styles.amount}>{amount}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  successSection: {
    alignItems: 'center',
    paddingVertical: DS.spacing.xl,
  },
  checkmarkCircle: {
    width: 96,
    height: 96,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.semantic.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.spacing.lg,
  },
  successTitle: {
    fontSize: DS.typography.fontSize['2xl'],
    fontWeight: DS.typography.fontWeight.bold,
    color: DS.colors.text,
    marginBottom: DS.spacing.sm,
  },
  amount: {
    fontSize: DS.typography.fontSize['4xl'],
    fontWeight: DS.typography.fontWeight.bold,
    color: DS.colors.brand.primary,
    marginBottom: DS.spacing.xs,
  },
  subtitle: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.textSecondary,
    textAlign: 'center',
  },
});
