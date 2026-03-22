/**
 * Pay Merchant Confirmation Screen
 * Location: app/(authenticated)/pay-merchant/confirm.tsx
 * 
 * Confirms payment to merchant via QR code scan
 * Shows transaction summary, merchant details, and 2FA verification
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { designSystem as DS } from '@/constants/designSystem';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { TwoFAModal } from '@/components/modals/TwoFAModal';
import { useWallets } from '@/contexts/WalletsContext';
import { cashOutAtMerchant } from '@/services/cashOut';

const MERCHANT_FEE_PERCENTAGE = 0.01; // 1% fee for merchant payments

export default function PayMerchantConfirmScreen() {
  const params = useLocalSearchParams<{
    merchantId?: string;
    merchantName?: string;
    merchantCategory?: string;
    amount?: string;
    walletId?: string;
    walletName?: string;
    reference?: string;
  }>();

  const { wallets, primaryWallet, getWalletById, refresh } = useWallets();
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(params.reference || '');

  const rawAmount = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  const amountDollars = rawAmount ? parseFloat(rawAmount) : 0;
  const feeEstimate = amountDollars * MERCHANT_FEE_PERCENTAGE;
  const displayTotal = amountDollars + feeEstimate;

  const fallbackWalletId = primaryWallet?.id ?? wallets[0]?.id;
  const walletId = params.walletId ?? fallbackWalletId;
  const wallet = walletId ? getWalletById(walletId) : undefined;
  const walletBalanceDollars = wallet ? wallet.balance / 100 : 0;
  const newBalance = walletBalanceDollars - displayTotal;

  const handlePayMerchant = () => {
    if (!walletId) {
      Alert.alert('No Wallet Found', 'Connect or create a wallet before paying a merchant.');
      return;
    }
    if (!params.merchantId) {
      Alert.alert('Missing Merchant', 'Merchant details are missing from the QR code.');
      return;
    }
    if (!rawAmount || amountDollars <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid merchant payment amount.');
      return;
    }
    if (newBalance < 0) {
      Alert.alert('Insufficient Balance', 'You do not have enough funds in this wallet.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowTwoFA(true);
  };

  const handleVerify = async (pin: string) => {
    setLoading(true);

    try {
      const merchantId = params.merchantId;
      if (!merchantId) {
        throw new Error('Missing merchantId');
      }

      const result = await cashOutAtMerchant({
        merchantId,
        // Backend expects transaction amount (cents), not including any UI fee estimate.
        amount: amountDollars * 100,
        walletId,
      });

      if (result.success) {
        await refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setShowTwoFA(false);
        router.replace({
          pathname: '/(authenticated)/pay-merchant/success' as any,
          params: {
            merchantName: params.merchantName || 'Merchant',
            merchantId,
            amount: amountDollars.toFixed(2),
            fee: feeEstimate.toFixed(2),
            total: displayTotal.toFixed(2),
            reference: note,
            transactionId: result.transactionId || 'TXN-' + Date.now(),
            authCode: result.authCode || '',
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Payment Failed', result.error || 'Please try again');
        setShowTwoFA(false);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Network error. Please try again.');
      setShowTwoFA(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          showSearch={false}
          showBackButton
          onBackPress={() => router.back()}
          title="Pay Merchant"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Merchant Card */}
          <View style={styles.merchantCard}>
            <View style={styles.merchantIcon}>
              <Ionicons
                name="storefront-outline"
                size={32}
                color={DS.colors.brand.primary}
              />
            </View>
            <Text style={styles.merchantName}>
              {params.merchantName || 'Merchant'}
            </Text>
            {params.merchantCategory && (
              <Text style={styles.merchantCategory}>{params.merchantCategory}</Text>
            )}
            <Text style={styles.merchantId}>ID: {params.merchantId}</Text>
          </View>

          {/* Transaction Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>N$ {amountDollars.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Merchant Fee (1%)</Text>
              <Text style={styles.summaryValue}>N$ {feeEstimate.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>N$ {displayTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Reference/Note Input */}
          <View style={styles.referenceCard}>
            <Text style={styles.referenceLabel}>
              Reference / Invoice Number (Optional)
            </Text>
            <TextInput
              style={styles.referenceInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g., Order #12345"
              placeholderTextColor={DS.colors.textTertiary}
              maxLength={50}
            />
          </View>

          {/* Wallet Info */}
          <View style={styles.walletCard}>
            <View style={styles.walletRow}>
              <Text style={styles.walletLabel}>From</Text>
              <Text style={styles.walletValue}>{wallet?.name ?? params.walletName ?? 'Wallet'}</Text>
            </View>

            <View style={styles.walletRow}>
              <Text style={styles.walletLabel}>Current Balance</Text>
              <Text style={styles.walletValue}>N$ {walletBalanceDollars.toFixed(2)}</Text>
            </View>

            <View style={[styles.walletRow, { marginTop: DS.spacing.sm }]}>
              <Text style={[styles.walletLabel, styles.newBalanceLabel]}>New Balance</Text>
              <Text style={[styles.walletValue, styles.newBalanceValue]}>
                N$ {newBalance.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Payment Notice */}
          <View style={styles.noticeCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={DS.colors.success}
            />
            <Text style={styles.noticeText}>
              This payment is protected. You'll receive a confirmation code after the transaction.
            </Text>
          </View>
        </ScrollView>

        {/* Pay Merchant Button */}
        <View style={styles.bottomContainer}>
          <Button
            variant="primary"
            onPress={handlePayMerchant}
            isLoading={loading}
            disabled={loading || !walletId || amountDollars <= 0}
            accessibilityLabel="Pay merchant"
            accessibilityHint={`Pay ${displayTotal.toFixed(2)} dollars to ${params.merchantName}`}
          >
            Pay Merchant
          </Button>
        </View>
      </SafeAreaView>

      {/* Two-Factor Authentication Modal */}
      <TwoFAModal
        visible={showTwoFA}
        onClose={() => setShowTwoFA(false)}
        onVerify={handleVerify}
        transaction={{
          amount: amountDollars,
          recipient: `Merchant: ${params.merchantName || params.merchantId}`,
        }}
        allowBiometric={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  safe: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: DS.spacing.horizontalPadding,
    paddingTop: DS.spacing.lg,
    paddingBottom: 100,
  },
  merchantCard: {
    backgroundColor: DS.colors.surface,
    padding: DS.spacing.lg,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
    marginBottom: DS.spacing.lg,
    ...DS.shadows.sm,
  },
  merchantIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DS.colors.brand50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.spacing.md,
    borderWidth: 2,
    borderColor: DS.colors.brand.primary,
  },
  merchantName: {
    fontSize: DS.typography.fontSize.xl,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
    marginBottom: 4,
  },
  merchantCategory: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
    marginBottom: 4,
  },
  merchantId: {
    fontSize: DS.typography.fontSize.xs,
    color: DS.colors.textTertiary,
  },
  summaryCard: {
    backgroundColor: DS.colors.surface,
    padding: DS.spacing.lg,
    borderRadius: DS.radius.lg,
    marginBottom: DS.spacing.lg,
    ...DS.shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.spacing.md,
  },
  summaryLabel: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.textSecondary,
  },
  summaryValue: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: DS.colors.border,
    marginVertical: DS.spacing.sm,
  },
  totalLabel: {
    fontSize: DS.typography.fontSize.lg,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
  },
  totalValue: {
    fontSize: DS.typography.fontSize.xl,
    fontWeight: DS.typography.fontWeight.bold,
    color: DS.colors.text,
  },
  referenceCard: {
    backgroundColor: DS.colors.surface,
    padding: DS.spacing.lg,
    borderRadius: DS.radius.lg,
    marginBottom: DS.spacing.lg,
    ...DS.shadows.sm,
  },
  referenceLabel: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
    marginBottom: DS.spacing.sm,
  },
  referenceInput: {
    backgroundColor: DS.colors.background,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
    borderRadius: DS.radius.md,
    borderWidth: 1,
    borderColor: DS.colors.border,
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.text,
  },
  walletCard: {
    backgroundColor: DS.colors.surface,
    padding: DS.spacing.lg,
    borderRadius: DS.radius.lg,
    marginBottom: DS.spacing.lg,
    ...DS.shadows.sm,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.spacing.sm,
  },
  walletLabel: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
  },
  walletValue: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.medium,
    color: DS.colors.text,
  },
  newBalanceLabel: {
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
  },
  newBalanceValue: {
    fontSize: DS.typography.fontSize.lg,
    fontWeight: DS.typography.fontWeight.bold,
    color: DS.colors.brand.primary,
  },
  noticeCard: {
    backgroundColor: DS.colors.semantic.successLight,
    padding: DS.spacing.md,
    borderRadius: DS.radius.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS.spacing.sm,
    marginBottom: DS.spacing.lg,
  },
  noticeText: {
    flex: 1,
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.text,
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: DS.spacing.horizontalPadding,
    paddingVertical: DS.spacing.md,
    backgroundColor: DS.colors.background,
    borderTopWidth: 1,
    borderTopColor: DS.colors.borderLight,
  },
});
