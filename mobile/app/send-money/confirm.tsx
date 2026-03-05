/**
 * Send Money – Confirm – Buffr G2P.
 * 2FA (PIN) via shared TwoFAModal before sending. §3.4 screen 29.
 * Uses UserContext for profile and walletStatus (frozen guard).
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { sendMoney } from '@/services/send';
import { TwoFAModal } from '@/components/modals';
import { LEGAL_TERMS } from '@/constants/legalTerms';
import { ProgressIndicator, LoadingState } from '@/components/ui';
import { useNetworkStatus } from '@/hooks';
import { OfflineBanner } from '@/components/common';
import { recordTransaction, updateTransactionStatus } from '@/services/transactionRecorder';

export default function ConfirmSendScreen() {
  const { walletStatus } = useUser();
  const { isOnline: isOnlineState } = useNetwork();
  const { isConnected } = useNetworkStatus();
  const isFrozen = walletStatus === 'frozen';
  const isOffline = !isOnlineState || !isConnected;
  const disableSend = isFrozen || isOffline;
  const { recipientPhone, recipientName, amount, note, walletId } = useLocalSearchParams<{
    recipientPhone: string;
    recipientName: string;
    amount: string;
    note?: string;
    walletId?: string;
  }>();

  const [show2FA, setShow2FA] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleVerify(pin: string) {
    setProcessing(true);

    // Record transaction locally
    const txRecord = await recordTransaction({
      type: 'send',
      amount: parseFloat(amount ?? '0'),
      currency: 'NAD',
      fromWalletId: walletId || 'default',
      counterparty: recipientName ?? recipientPhone ?? 'Unknown',
      reference: note,
      status: 'pending',
    });

    try {
      const result = await sendMoney({
        recipientPhone: recipientPhone ?? '',
        amount: parseFloat(amount ?? '0'),
        note: note ?? undefined,
        walletId: walletId ?? undefined,
        pin,
      });

      if (result.success) {
        // Update transaction to completed
        await updateTransactionStatus(txRecord.id, 'success', {
          backendId: result.transactionId,
          completedAt: new Date().toISOString(),
        });

        router.replace({
          pathname: '/send-money/success',
          params: {
            recipientName,
            amount,
            transactionId: result.transactionId ?? '',
          },
        } as never);
        return { success: true };
      }

      // Update transaction to failed
      await updateTransactionStatus(txRecord.id, 'failed', {
        error: result.error || 'Send money failed',
      });

      return { success: false, error: result.error };
    } catch (error: any) {
      // Update transaction to failed
      await updateTransactionStatus(txRecord.id, 'failed', {
        error: error.message || 'Unknown error',
      });

      return { success: false, error: error.message };
    } finally {
      setProcessing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Transfer',
          headerTitleStyle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <ProgressIndicator
        currentStep={3}
        totalSteps={4}
        stepLabels={['Recipient', 'Amount', 'Review', 'Confirm']}
      />
      
      {!isConnected && <OfflineBanner />}

      {processing && <LoadingState variant="overlay" message="Sending money..." />}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>To</Text>
              <Text style={styles.summaryValue}>{recipientName || recipientPhone}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={[styles.summaryValue, styles.amount]}>N${parseFloat(amount ?? '0').toFixed(2)}</Text>
            </View>
            {note ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Note</Text>
                <Text style={styles.summaryValue}>{note}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.pinLabel}>Confirm the transfer with your PIN</Text>
          <Text style={styles.consentLine}>{LEGAL_TERMS.consentPayment}</Text>
        </View>

        <View style={styles.footer}>
          {isFrozen && (
            <View style={styles.frozenBanner}>
              <Ionicons name="lock-closed" size={18} color={designSystem.colors.semantic.error} />
              <Text style={styles.frozenBannerText}>
                Your wallet is frozen. Transactions are disabled.
              </Text>
            </View>
          )}
          {isOffline && (
            <View style={styles.frozenBanner}>
              <Ionicons name="cloud-offline" size={18} color={designSystem.colors.semantic.warning} />
              <Text style={styles.frozenBannerText}>
                You are offline. Financial actions are disabled.
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.sendButton, disableSend && styles.sendButtonDisabled]}
            onPress={() => !disableSend && setShow2FA(true)}
            disabled={disableSend}
            accessibilityLabel="Confirm with PIN"
          >
            <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.sendButtonText}>Send N${parseFloat(amount ?? '0').toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <TwoFAModal
        visible={show2FA}
        onClose={() => setShow2FA(false)}
        onVerify={handleVerify}
        title="Verify transfer"
        subtitle="Enter your 6-digit PIN to confirm"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: designSystem.spacing.g2p.sectionSpacing,
  },
  summaryCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.md,
    padding: designSystem.spacing.scale.md,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
    ...designSystem.shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
  },
  summaryLabel: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary },
  summaryValue: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.text, fontWeight: '500' },
  amount: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.brand.primary, fontWeight: '700' },
  pinLabel: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    textAlign: 'center',
    marginTop: 8,
  },
  consentLine: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  footer: { padding: designSystem.spacing.g2p.horizontalPadding, paddingBottom: designSystem.spacing.g2p.sectionSpacing },
  sendButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { ...designSystem.typography.textStyles.body, color: '#fff', fontWeight: '700' },
  frozenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designSystem.colors.semantic.error + '15',
    borderRadius: designSystem.radius.sm,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: designSystem.colors.semantic.error + '40',
  },
  frozenBannerText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.semantic.error,
    fontWeight: '600',
    flex: 1,
  },
});
