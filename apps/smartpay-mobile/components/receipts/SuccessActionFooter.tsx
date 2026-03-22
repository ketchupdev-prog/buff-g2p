/**
 * SuccessActionFooter
 * Purpose: Standardized bottom action footer for success screens.
 * Location: fintech/apps/smartpay-mobile/components/receipts/SuccessActionFooter.tsx
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { designSystem as DS } from '@/constants/designSystem';
import { ReceiptShareButton } from './ReceiptShareButton';

interface SuccessActionFooterProps {
  onShare: () => void;
  onDone: () => void;
  doneLabel?: string;
}

export function SuccessActionFooter({
  onShare,
  onDone,
  doneLabel = 'Done',
}: SuccessActionFooterProps) {
  return (
    <View style={styles.footer}>
      <ReceiptShareButton onPress={onShare} />
      <Button title={doneLabel} onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.spacing.horizontalPadding,
    paddingVertical: DS.spacing.md,
    backgroundColor: DS.colors.background,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
    gap: DS.spacing.md,
  },
});
