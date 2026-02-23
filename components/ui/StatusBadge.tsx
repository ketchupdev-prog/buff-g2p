/**
 * StatusBadge – coloured pill label.
 * Used across: vouchers, loans, transactions, merchants, agents.
 */
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

export type BadgeVariant =
  | 'active'    // blue
  | 'success'   // green
  | 'warning'   // amber
  | 'error'     // red
  | 'neutral'   // grey
  | 'info';     // light blue

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  active:  { bg: '#DBEAFE', text: '#1D4ED8' },
  success: { bg: '#DCFCE7', text: '#15803D' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error:   { bg: '#FEE2E2', text: '#B91C1C' },
  neutral: { bg: '#F3F4F6', text: '#6B7280' },
  info:    { bg: '#EFF6FF', text: '#0029D6' },
};

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** Override the background hex (e.g. from statusColor() + '18') */
  bg?: string;
  /** Override the text hex */
  color?: string;
  style?: ViewStyle;
}

export function StatusBadge({ label, variant = 'neutral', bg, color, style }: StatusBadgeProps) {
  const cv = VARIANT_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? cv.bg }, style]}>
      <Text style={[styles.label, { color: color ?? cv.text }]}>{label}</Text>
    </View>
  );
}

/** Map a loan/voucher status string to a BadgeVariant */
export function statusToVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active': case 'available': case 'open': return 'active';
    case 'repaid': case 'redeemed': case 'paid': case 'success': return 'success';
    case 'overdue': case 'failed': case 'expired': return 'error';
    case 'pending': case 'processing': return 'warning';
    default: return 'neutral';
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontWeight: '600' },
});
