/**
 * KycHeader
 *
 * Purpose: Shared header bar for the KYC screens (back button + title),
 * matching the existing Smartpay mobile design system spacing and typography.
 *
 * Location within project: fintech/apps/smartpay-mobile/components/kyc/KycHeader.tsx
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '@/constants/designSystem';

const ds = designSystem;

export function KycHeader({ title, onBackPress }: { title: string; onBackPress: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backBtn} accessibilityRole="button">
        <Ionicons name="arrow-back" size={24} color={ds.colors.neutral.text} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ds.spacing.md,
    paddingVertical: ds.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ds.colors.neutral.border,
    backgroundColor: ds.colors.neutral.surface,
  },
  backBtn: { padding: ds.spacing.xs, marginRight: ds.spacing.sm },
  title: { ...ds.typography.textStyles.h2, color: ds.colors.neutral.text },
});

