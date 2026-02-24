/**
 * Cash-Out Confirm – Buffr G2P.
 * Post-QR-scan confirmation: shows payee, amount and fee, then collects 2FA PIN.
 * Called by scan-qr.tsx after a valid NAMQR is scanned for cashout mode.
 * §3.3 (extended) – Audit fix F3.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { executeCashOut, CASH_OUT_METHODS, type CashOutMethod } from '@/services/cashout';
import { TwoFAModal } from '@/components/modals';

/** Parse lockout minutes from API error (e.g. "locked for 5 minutes" or "try again in 5 min"). PRD §7 / F18. */
function parseLockoutSeconds(error?: string): number | undefined {
  if (!error) return undefined;
  const lower = error.toLowerCase();
  if (!lower.includes('lock') && !lower.includes('retry') && !lower.includes('minute')) return undefined;
  const match = error.match(/(\d+)\s*(?:minute|min)/i);
  if (match) return Math.max(60, parseInt(match[1], 10) * 60);
  return 5 * 60; // default 5 minutes when lockout indicated
}

export default function CashOutConfirmScreen() {
  const { walletStatus } = useUser();
  const isFrozen = walletStatus === 'frozen';
  const params = useLocalSearchParams<{
    id?: string;
    payeeName?: string;
    amount?: string;
    method?: string;
    qrPayload?: string;
    tokenRef?: string;
  }>();
  const { id, payeeName, amount, method, qrPayload, tokenRef } = params;

  const [show2FA, setShow2FA] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    if (lockoutUntil <= 0) {
      setLockoutRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setLockoutRemaining(Math.max(0, left));
      if (left <= 0) setLockoutUntil(0);
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [lockoutUntil]);

  const methodInfo = CASH_OUT_METHODS.find((m) => m.id === method);
  const displayAmount = parseFloat(amount ?? '0').toFixed(2);
  const hasValidWallet = Boolean(id?.trim());
  const isLockedOut = lockoutRemaining > 0;
  const isDisabled = !hasValidWallet || isLockedOut || isFrozen;

  async function handleVerify(pin: string) {
    const result = await executeCashOut({
      walletId: id ?? '',
      method: (method as CashOutMethod) ?? 'till',
      amount: parseFloat(amount ?? '0'),
      qrPayload: qrPayload ?? undefined,
      tokenRef: tokenRef ?? undefined,
      pin,
    });
    if (result.success) {
      router.replace({
        pathname: `/wallets/${id}/cash-out/success` as never,
        params: {
          amount,
          method: method ?? 'till',
          reference: result.transactionId ?? '',
          walletId: id,
        },
      });
      return { success: true };
    }
    const retrySeconds = parseLockoutSeconds(result.error);
    if (retrySeconds != null) setLockoutUntil(Date.now() + retrySeconds * 1000);
    return { success: false, error: result.error, retryAfterSeconds: retrySeconds };
  }

  if (!hasValidWallet) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Confirm Cash Out', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: designSystem.colors.neutral.surface } }} />
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={24} color={designSystem.colors.semantic.error} />
            <Text style={styles.errorCardText}>Unable to identify wallet. Please go back and try again.</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Confirm Cash Out',
          headerTitleStyle: {
            ...designSystem.typography.textStyles.title,
            color: designSystem.colors.neutral.text,
          },
          headerBackTitleVisible: false,
          headerTintColor: designSystem.colors.neutral.text,
          headerStyle: { backgroundColor: designSystem.colors.neutral.surface },
        }}
      />

      <View style={styles.container}>
        {/* Payee card */}
        <View style={styles.payeeCard}>
          <View style={styles.payeeIconWrap}>
            <Ionicons
              name={(methodInfo?.icon as never) ?? 'storefront-outline'}
              size={28}
              color={designSystem.colors.brand.primary}
            />
          </View>
          <View style={styles.payeeInfo}>
            <Text style={styles.payeeName}>{payeeName || 'Cash-out point'}</Text>
            <Text style={styles.payeeMethod}>{methodInfo?.label ?? 'Cash Out'}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#15803D" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* Summary rows */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={[styles.summaryValue, styles.amountText]}>N${displayAmount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fee</Text>
            <Text style={styles.summaryValue}>{methodInfo?.fee ?? '—'}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>Processing time</Text>
            <Text style={styles.summaryValue}>{methodInfo?.time ?? 'Instant'}</Text>
          </View>
        </View>

        {isLockedOut && (
          <View style={styles.lockoutBanner}>
            <Ionicons name="lock-closed" size={18} color={designSystem.colors.semantic.error} />
            <Text style={styles.lockoutText}>
              PIN locked. Try again in {Math.ceil(lockoutRemaining / 60)} minute{lockoutRemaining > 60 ? 's' : ''}.
            </Text>
          </View>
        )}

        {isFrozen && (
          <View style={styles.frozenBanner}>
            <Ionicons name="lock-closed" size={18} color={designSystem.colors.semantic.error} />
            <Text style={styles.lockoutText}>
              Your wallet is frozen. Transactions are disabled.
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons
            name="lock-closed-outline"
            size={15}
            color={designSystem.colors.brand.primary}
          />
          <Text style={styles.infoText}>
            QR code verified by Token Vault. Enter your PIN to complete.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isDisabled && styles.confirmButtonDisabled]}
          onPress={() => !isDisabled && setShow2FA(true)}
          disabled={isDisabled}
          accessibilityLabel="Confirm cash out with PIN"
        >
          <Ionicons name="cash-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.confirmButtonText}>Cash Out {'N$'}{displayAmount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <TwoFAModal
        visible={show2FA}
        onClose={() => setShow2FA(false)}
        onVerify={handleVerify}
        title="Confirm cash out"
        subtitle="Enter your 6-digit PIN to complete"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  container: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: designSystem.spacing.g2p.sectionSpacing,
  },
  payeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.md,
    padding: 16,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
    ...designSystem.shadows.sm,
  },
  payeeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  payeeInfo: { flex: 1 },
  payeeName: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
  },
  payeeMethod: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  summaryCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.md,
    paddingHorizontal: 16,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
    ...designSystem.shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
  },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryLabel: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
  },
  summaryValue: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    fontWeight: '500',
  },
  amountText: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.brand.primary,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: designSystem.radius.sm,
    padding: 12,
  },
  infoText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.brand.primary,
    flex: 1,
    lineHeight: 18,
  },
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designSystem.colors.semantic.error + '15',
    borderRadius: designSystem.radius.sm,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.semantic.error + '40',
  },
  frozenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designSystem.colors.semantic.error + '15',
    borderRadius: designSystem.radius.sm,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.semantic.error + '40',
  },
  lockoutText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.semantic.error,
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingBottom: designSystem.spacing.g2p.sectionSpacing,
    gap: 10,
  },
  confirmButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    ...designSystem.typography.textStyles.body,
    color: '#fff',
    fontWeight: '700',
  },
  cancelButton: {
    height: designSystem.components.button.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    fontWeight: '500',
  },
  confirmButtonDisabled: { opacity: 0.5 },
  errorCard: {
    backgroundColor: designSystem.colors.feedback.red100,
    borderRadius: designSystem.radius.md,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  errorCardText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.semantic.error,
    textAlign: 'center',
  },
});
