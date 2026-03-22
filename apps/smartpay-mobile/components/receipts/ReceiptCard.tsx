/**
 * ReceiptCard
 * Purpose: Shared card wrapper and row primitive for receipt details.
 * Location: fintech/apps/smartpay-mobile/components/receipts/ReceiptCard.tsx
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { designSystem as DS } from '@/constants/designSystem';

interface ReceiptCardProps {
  title: string;
  children: React.ReactNode;
}

interface ReceiptRowProps {
  label: string;
  value: string;
}

export function ReceiptCard({ title, children }: ReceiptCardProps) {
  return (
    <View style={styles.detailsCard}>
      <Text style={styles.detailsTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ReceiptRow({ label, value }: ReceiptRowProps) {
  return (
    <View style={styles.detailsRow}>
      <Text style={styles.detailsLabel}>{label}</Text>
      <Text style={styles.detailsValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailsCard: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.lg,
    padding: DS.spacing.lg,
    gap: DS.spacing.md,
    marginTop: DS.spacing.lg,
  },
  detailsTitle: {
    fontSize: DS.typography.fontSize.lg,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
    marginBottom: DS.spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailsLabel: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.textSecondary,
    flex: 1,
  },
  detailsValue: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.medium,
    color: DS.colors.text,
    flex: 1,
    textAlign: 'right',
  },
});
