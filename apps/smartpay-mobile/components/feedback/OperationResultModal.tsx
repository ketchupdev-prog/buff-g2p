/**
 * OperationResultModal
 * Purpose: Reusable success/error modal with optional receipt details and share action.
 * Location: fintech/apps/smartpay-mobile/components/feedback/OperationResultModal.tsx
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem as DS } from '@/constants/designSystem';
import { Button } from '@/components/ui/Button';

export type OperationResultType = 'success' | 'error';

export interface OperationReceiptDetails {
  amount?: string;
  currency?: string;
  transactionId?: string;
  timestamp?: string;
}

interface OperationResultModalProps {
  visible: boolean;
  type: OperationResultType;
  title: string;
  message: string;
  details?: OperationReceiptDetails;
  onClose: () => void;
  doneLabel?: string;
}

export function OperationResultModal({
  visible,
  type,
  title,
  message,
  details,
  onClose,
  doneLabel = 'Done',
}: OperationResultModalProps) {
  const isSuccess = type === 'success';

  const formattedDate = details?.timestamp
    ? new Date(details.timestamp).toLocaleString('en-NA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : undefined;

  const handleShare = async () => {
    if (!details) return;
    try {
      await Share.share({
        title: 'Transaction Receipt',
        message: `${title}\n\n${message}\n\nAmount: ${details.currency ?? 'NAD'} ${details.amount ?? '0.00'}\nTransaction ID: ${details.transactionId ?? 'N/A'}${formattedDate ? `\nDate: ${formattedDate}` : ''}`,
      });
    } catch (error) {
      if (__DEV__) {
        console.log('[OperationResultModal] share failed:', error);
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => null}>
          <View style={[styles.iconWrap, isSuccess ? styles.iconSuccess : styles.iconError]}>
            <Ionicons
              name={isSuccess ? 'checkmark' : 'close'}
              size={28}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {details ? (
            <View style={styles.receiptCard}>
              <Text style={styles.receiptTitle}>Receipt</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.value}>
                  {details.currency ?? 'NAD'} {details.amount ?? '0.00'}
                </Text>
              </View>
              {details.transactionId ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Transaction ID</Text>
                  <Text style={styles.value}>{details.transactionId}</Text>
                </View>
              ) : null}
              {formattedDate ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Date & Time</Text>
                  <Text style={styles.value}>{formattedDate}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            {details ? (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Share receipt"
              >
                <Ionicons name="share-social-outline" size={18} color={DS.colors.brand.primary} />
                <Text style={styles.shareText}>Share</Text>
              </TouchableOpacity>
            ) : null}
            <Button
              title={doneLabel}
              onPress={onClose}
              variant="primary"
              style={{ backgroundColor: DS.colors.brand.primary, borderRadius: DS.components.button.borderRadiusPill }}
              size="lg"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: DS.spacing.lg,
  },
  card: {
    backgroundColor: DS.colors.background,
    borderRadius: DS.radius['2xl'],
    padding: DS.spacing.lg,
    gap: DS.spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: DS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  iconSuccess: {
    backgroundColor: DS.colors.semantic.success,
  },
  iconError: {
    backgroundColor: DS.colors.semantic.error,
  },
  title: {
    ...DS.typography.textStyles.h2,
    color: DS.colors.text,
    textAlign: 'center',
  },
  message: {
    ...DS.typography.textStyles.body,
    color: DS.colors.textSecondary,
    textAlign: 'center',
  },
  receiptCard: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.lg,
    padding: DS.spacing.md,
    gap: DS.spacing.sm,
  },
  receiptTitle: {
    ...DS.typography.textStyles.titleSm,
    color: DS.colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: DS.spacing.sm,
  },
  label: {
    ...DS.typography.textStyles.bodySm,
    color: DS.colors.textSecondary,
    flex: 1,
  },
  value: {
    ...DS.typography.textStyles.body,
    color: DS.colors.text,
    fontWeight: DS.typography.fontWeight.semibold,
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    gap: DS.spacing.sm,
  },
  shareButton: {
    minHeight: DS.components.button.height.lg,
    borderRadius: DS.components.button.borderRadiusPill,
    borderWidth: 1.5,
    borderColor: DS.colors.brand.primary,
    backgroundColor: DS.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: DS.spacing.xs,
  },
  shareText: {
    ...DS.typography.textStyles.body,
    color: DS.colors.brand.primary,
    fontWeight: DS.typography.fontWeight.semibold,
  },
});
