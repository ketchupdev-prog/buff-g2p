/**
 * ReceiptShareButton
 * Purpose: Shared secondary CTA for receipt sharing.
 * Location: fintech/apps/smartpay-mobile/components/receipts/ReceiptShareButton.tsx
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem as DS } from '@/constants/designSystem';

interface ReceiptShareButtonProps {
  onPress: () => void;
}

export function ReceiptShareButton({ onPress }: ReceiptShareButtonProps) {
  return (
    <TouchableOpacity
      style={styles.shareButton}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel="Share receipt"
      accessibilityRole="button"
    >
      <Ionicons name="share-social-outline" size={20} color={DS.colors.brand.primary} />
      <Text style={styles.shareButtonText}>Share Receipt</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.spacing.sm,
    padding: DS.spacing.md,
    borderRadius: DS.components.button.borderRadiusPill,
    borderWidth: 2,
    borderColor: DS.colors.brand.primary,
  },
  shareButtonText: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.brand.primary,
  },
});
