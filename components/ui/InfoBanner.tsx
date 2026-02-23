/**
 * InfoBanner – contextual alert strip (warning / info / error / success).
 * Used across: loans, vouchers, bills, proof-of-life, onboarding.
 */
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type BannerVariant = 'warning' | 'info' | 'error' | 'success';

const BANNER_STYLES: Record<BannerVariant, { bg: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  warning: { bg: '#FEF3C7', text: '#92400E', icon: 'warning-outline' },
  info:    { bg: '#EFF6FF', text: '#1D4ED8', icon: 'information-circle-outline' },
  error:   { bg: '#FEE2E2', text: '#B91C1C', icon: 'alert-circle-outline' },
  success: { bg: '#DCFCE7', text: '#15803D', icon: 'checkmark-circle-outline' },
};

interface InfoBannerProps {
  message: string;
  variant?: BannerVariant;
  style?: ViewStyle;
}

export function InfoBanner({ message, variant = 'info', style }: InfoBannerProps) {
  const s = BANNER_STYLES[variant];
  return (
    <View style={[styles.banner, { backgroundColor: s.bg }, style]}>
      <Ionicons name={s.icon} size={18} color={s.text} />
      <Text style={[styles.text, { color: s.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  text: { flex: 1, fontSize: 13, lineHeight: 18 },
});
