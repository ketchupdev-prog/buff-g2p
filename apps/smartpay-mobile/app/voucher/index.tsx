import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '@/constants/designSystem';
import { TextInput } from '@/components/ui';
import { redeemVoucherCodeToWallet } from '@/services/vouchers';
import { useWallets } from '@/contexts/WalletsContext';
import { OperationResultModal, type OperationResultType, type OperationReceiptDetails } from '@/components/feedback/OperationResultModal';

export default function VoucherScreen() {
  const [voucherCode, setVoucherCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [resultType, setResultType] = useState<OperationResultType>('success');
  const [resultTitle, setResultTitle] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [resultDetails, setResultDetails] = useState<OperationReceiptDetails | undefined>(undefined);
  const { refresh } = useWallets();

  const normalizedCode = useMemo(() => voucherCode.replace(/\D/g, '').slice(0, 12), [voucherCode]);
  const isValidVoucherCode = /^\d{12}$/.test(normalizedCode);
  const showInlineError = touched && normalizedCode.length > 0 && !isValidVoucherCode;

  const handleChangeVoucherCode = (value: string) => {
    setVoucherCode(value.replace(/\D/g, '').slice(0, 12));
  };

  const openResultModal = (
    type: OperationResultType,
    title: string,
    message: string,
    details?: OperationReceiptDetails
  ) => {
    setResultType(type);
    setResultTitle(title);
    setResultMessage(message);
    setResultDetails(details);
    setResultVisible(true);
  };

  const handleRedeemVoucher = async () => {
    setTouched(true);
    if (!isValidVoucherCode) {
      openResultModal('error', 'Invalid Voucher Code', 'Please enter exactly 12 digits.');
      return;
    }

    try {
      setIsRedeeming(true);
      const result = await redeemVoucherCodeToWallet(normalizedCode);
      if (!result.success) {
        openResultModal(
          'error',
          'Redemption failed',
          result.error || 'Could not redeem voucher. Please try again.'
        );
        return;
      }

      await refresh();
      setVoucherCode('');
      setTouched(false);
      openResultModal(
        'success',
        'Voucher Redeemed!',
        'Funds have been added to your main wallet.',
        {
          amount: String((result.data?.amount ?? 0).toFixed(2)),
          currency: result.data?.currency ?? 'NAD',
          transactionId: result.data?.transactionId ?? '',
          timestamp: result.data?.redeemedAt ?? new Date().toISOString(),
        }
      );
    } catch (error) {
      openResultModal(
        'error',
        'Redemption failed',
        error instanceof Error ? error.message : 'Could not redeem voucher. Please try again.'
      );
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={designSystem.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Redeem Voucher</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.description}>
              Enter your government voucher code to add funds to your SmartPay wallet.
            </Text>

            <TouchableOpacity
              style={styles.locationFinderCard}
              onPress={() => router.push('/location-finder?tab=agents&service=voucher')}
              activeOpacity={0.7}
              accessibilityLabel="Find agents to purchase vouchers"
              accessibilityRole="button"
            >
              <View style={styles.locationFinderLeft}>
                <View style={styles.locationFinderIcon}>
                  <Ionicons name="location" size={24} color="#fff" />
                </View>
                <View style={styles.locationFinderInfo}>
                  <Text style={styles.locationFinderTitle}>Find Voucher Agents</Text>
                  <Text style={styles.locationFinderDescription}>
                    Locate agents near you to purchase vouchers
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={designSystem.colors.brand.primary} />
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR ENTER CODE</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              label="Voucher Code"
              placeholder="Enter 12-digit code"
              value={voucherCode}
              onChangeText={handleChangeVoucherCode}
              keyboardType="number-pad"
              maxLength={12}
              clearable
            />
            {showInlineError ? (
              <Text style={styles.inlineError}>Voucher code must be exactly 12 digits.</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, (!isValidVoucherCode || isRedeeming) && styles.buttonDisabled]}
              onPress={handleRedeemVoucher}
              disabled={!isValidVoucherCode || isRedeeming}
              activeOpacity={0.8}
              accessibilityLabel="Redeem voucher"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{isRedeeming ? 'Redeeming...' : 'Redeem Voucher'}</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={24} color={designSystem.colors.info} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>How it works</Text>
                <Text style={styles.infoDescription}>
                  Government vouchers can be redeemed instantly. Funds will be added to your main wallet.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <OperationResultModal
        visible={resultVisible}
        type={resultType}
        title={resultTitle}
        message={resultMessage}
        details={resultType === 'success' ? resultDetails : undefined}
        onClose={() => setResultVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designSystem.spacing.smartpay.horizontalPadding,
    paddingVertical: designSystem.spacing.md,
    backgroundColor: designSystem.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.text,
  },
  scrollView: { flex: 1 },
  section: {
    paddingHorizontal: designSystem.spacing.smartpay.horizontalPadding,
    paddingVertical: designSystem.spacing.lg,
  },
  description: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.textSecondary,
    marginBottom: designSystem.spacing.lg,
  },
  locationFinderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: designSystem.spacing.md,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: designSystem.radius.lg,
    borderWidth: 1,
    borderColor: designSystem.colors.brand.primaryLight,
    marginBottom: designSystem.spacing.lg,
  },
  locationFinderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: designSystem.spacing.md,
  },
  locationFinderIcon: {
    width: 44,
    height: 44,
    borderRadius: designSystem.radius.full,
    backgroundColor: designSystem.colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationFinderInfo: {
    flex: 1,
    gap: 2,
  },
  locationFinderTitle: {
    fontSize: designSystem.typography.fontSize.base,
    fontWeight: designSystem.typography.fontWeight.semibold,
    color: designSystem.colors.brand.primary,
  },
  locationFinderDescription: {
    fontSize: designSystem.typography.fontSize.sm,
    color: designSystem.colors.brand.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing.lg,
    gap: designSystem.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: designSystem.colors.border,
  },
  dividerText: {
    fontSize: designSystem.typography.fontSize.xs,
    fontWeight: designSystem.typography.fontWeight.semibold,
    color: designSystem.colors.textTertiary,
    letterSpacing: 1,
  },
  button: {
    height: designSystem.components.button.height.lg,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadiusPill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: designSystem.spacing.md,
    ...designSystem.shadows.md,
  },
  buttonText: {
    ...designSystem.typography.textStyles.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  inlineError: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.semantic.error,
    marginTop: designSystem.spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: designSystem.colors.semantic.infoLight,
    padding: designSystem.spacing.md,
    borderRadius: designSystem.radius.md,
    marginTop: designSystem.spacing.xl,
    gap: 12,
  },
  infoText: { flex: 1 },
  infoTitle: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.info,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.textSecondary,
  },
});
