/**
 * Voucher Redeem Confirm – Buffr G2P.
 * Confirm branch/unit and amount before 2FA for NamPost/SmartPay. PRD §18.5.
 * Uses UserContext for walletStatus (frozen guard) and profile.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { getVoucher, redeemAtBranch, type Voucher } from '@/services/vouchers';
import { TwoFAModal } from '@/components/modals';

const DS = designSystem;

export default function VoucherRedeemConfirmScreen() {
  const { profile, walletStatus, isLoaded } = useUser();
  const { voucherId, amount, branchName, qrPayload } = useLocalSearchParams<{
    voucherId?: string;
    amount?: string;
    branchName?: string;
    qrPayload?: string;
  }>();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (voucherId) getVoucher(voucherId).then(setVoucher).finally(() => setLoading(false));
  }, [voucherId]);

  const isFrozen = walletStatus === 'frozen';
  const canConfirm = voucher?.status === 'available' && !isFrozen;

  function handleConfirm() {
    if (!voucher || voucher.status !== 'available' || isFrozen) return;
    setShowPin(true);
  }

  async function handleVerify(pin: string) {
    if (!voucherId || !voucher) return { success: false as const, error: 'Missing voucher' };
    const res = await redeemAtBranch(voucherId, pin, { branchName: branchName ?? undefined, qrPayload: qrPayload ?? undefined });
    if (res.success) {
      setShowPin(false);
      router.replace({
        pathname: '/utilities/vouchers/redeem/nampost/success' as never,
        params: { voucherId, amount: amount ?? voucher.amount.toString(), method: 'nampost' },
      });
      return { success: true as const };
    }
    return { success: false as const, error: res.error };
  }

  if (!isLoaded || loading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Confirm redemption', headerTintColor: DS.colors.neutral.text }} />
        <View style={styles.centered}>
          <ActivityIndicator color={DS.colors.brand.primary} />
        </View>
      </View>
    );
  }

  if (!voucher) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Confirm redemption', headerTintColor: DS.colors.neutral.text }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Voucher not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayBranch = branchName ?? 'NamPost / SmartPay branch';
  const amountDisplay = amount ?? voucher.amount.toString();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Confirm redemption', headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.content}>
          {isFrozen && (
            <View style={styles.frozenBanner}>
              <Ionicons name="lock-closed-outline" size={20} color={DS.colors.semantic.error} />
              <Text style={styles.frozenText}>Your wallet is frozen. Complete proof-of-life to redeem vouchers.</Text>
            </View>
          )}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Branch / unit</Text>
              <Text style={styles.value}>{displayBranch}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Amount</Text>
              <Text style={styles.value}>N${parseFloat(amountDisplay).toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>Confirm redemption</Text>
          </TouchableOpacity>
        </View>
        <TwoFAModal
          visible={showPin}
          onClose={() => setShowPin(false)}
          onVerify={handleVerify}
          title="Verify identity"
          subtitle="Enter your 6-digit PIN to confirm"
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: DS.colors.semantic.error, marginBottom: 12 },
  link: { fontSize: 16, fontWeight: '600', color: DS.colors.brand.primary },
  content: { padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: DS.colors.neutral.border },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 14, color: DS.colors.neutral.textSecondary },
  value: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text },
  confirmBtn: { height: 52, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  frozenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DS.colors.feedback.red100,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  frozenText: { flex: 1, fontSize: 13, color: DS.colors.semantic.error, lineHeight: 18 },
});
