/**
 * Cash Out Confirmation Screen
 * Location: app/(authenticated)/cash-out/confirm.tsx
 * 
 * Confirms cash-out at agents or tills
 * Shows transaction summary, agent/till details, and 2FA verification
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
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
import { cashOutAtAgent, cashOutAtTill } from '@/services/cashOut';

const CASH_OUT_FEE_PERCENTAGE = 0.02; // 2% fee for cash-out

export default function CashOutConfirmScreen() {
  const params = useLocalSearchParams<{
    agentId?: string;
    tillId?: string;
    merchantName?: string;
    amount?: string;
    // Legacy/alternate params (kept for backward compatibility with older navigation).
    agentName?: string;
    agentCode?: string;
    tillName?: string;
    tillCode?: string;
    walletId?: string;
    walletName?: string;
  }>();

  const { wallets, primaryWallet, getWalletById, refresh } = useWallets();
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [loading, setLoading] = useState(false);

  const rawAmount = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  const amountDollars = rawAmount ? parseFloat(rawAmount) : 0;
  const feeEstimate = amountDollars * CASH_OUT_FEE_PERCENTAGE;
  const displayTotal = amountDollars + feeEstimate;

  const agentId = params.agentId ?? params.agentCode;
  const tillId = params.tillId ?? params.tillCode;
  const isAgent = Boolean(agentId);

  const locationName =
    params.merchantName ??
    (isAgent ? params.agentName : params.tillName) ??
    (isAgent ? 'Agent' : 'Till');
  const locationCode = isAgent ? agentId : tillId;
  const locationType = isAgent ? 'Agent' : 'Till';

  const fallbackWalletId = primaryWallet?.id ?? wallets[0]?.id;
  const walletId = params.walletId ?? fallbackWalletId;
  const wallet = walletId ? getWalletById(walletId) : undefined;
  const walletBalanceDollars = wallet ? wallet.balance / 100 : 0;
  const newBalance = walletBalanceDollars - displayTotal;

  const handleCashOut = () => {
    if (!walletId) {
      Alert.alert('No Wallet Found', 'Connect or create a wallet before cashing out.');
      return;
    }
    if (!rawAmount || amountDollars <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid cash-out amount.');
      return;
    }
    if (!locationCode) {
      Alert.alert('Invalid Destination', 'Missing agent/till code from QR.');
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
      const cashOutParams = {
        // Backend expects `amount` in the same unit stored in transactions (cents).
        amount: amountDollars * 100,
        walletId,
        ...(isAgent ? { agentCode: locationCode } : { tillNumber: locationCode }),
      };

      const result = isAgent
        ? await cashOutAtAgent(cashOutParams)
        : await cashOutAtTill(cashOutParams);

      if (result.success) {
        await refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setShowTwoFA(false);
        router.replace({
          pathname: '/(authenticated)/cash-out/success',
          params: {
            amount: amountDollars.toFixed(2),
            method: `Cash Out - ${locationType}`,
            recipient: locationName || locationType,
            code: isAgent ? result.qrCode : result.offlineCode,
            reference: result.transactionId,
          },
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Cash-Out Failed', result.error || 'Please try again');
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
          title="Confirm Cash-Out"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Location Card */}
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons
                name={isAgent ? 'person-outline' : 'business-outline'}
                size={32}
                color={DS.colors.brand.primary}
              />
            </View>
            <Text style={styles.locationName}>{locationName || locationType}</Text>
            <Text style={styles.locationCode}>
              {locationType} Code: {locationCode || 'N/A'}
            </Text>
          </View>

          {/* Transaction Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>N$ {amountDollars.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cash-Out Fee (2%)</Text>
              <Text style={styles.summaryValue}>N$ {feeEstimate.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>N$ {displayTotal.toFixed(2)}</Text>
            </View>
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

          {/* Collection Notice */}
          <View style={styles.noticeCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={DS.colors.brand.primary}
            />
            <Text style={styles.noticeText}>
              Please collect N$ {amountDollars.toFixed(2)} cash from the {locationType.toLowerCase()}.
              Show this confirmation to complete the transaction.
            </Text>
          </View>
        </ScrollView>

        {/* Cash Out Button */}
        <View style={styles.bottomContainer}>
          <Button
            variant="primary"
            onPress={handleCashOut}
            isLoading={loading}
            disabled={loading || newBalance < 0}
            accessibilityLabel="Confirm cash-out"
            accessibilityHint={`Cash out ${displayTotal.toFixed(2)} dollars at ${locationName}`}
          >
            Confirm Cash-Out
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
          recipient: `${locationType}: ${locationName}`,
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
  locationCard: {
    backgroundColor: DS.colors.surface,
    padding: DS.spacing.lg,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
    marginBottom: DS.spacing.lg,
    ...DS.shadows.sm,
  },
  locationIcon: {
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
  locationName: {
    fontSize: DS.typography.fontSize.xl,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
    marginBottom: 4,
  },
  locationCode: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
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
    backgroundColor: DS.colors.brand50,
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
