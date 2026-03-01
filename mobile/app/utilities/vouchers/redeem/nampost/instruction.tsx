/**
 * Voucher Collection Instruction – Buffr G2P.
 * "Scan the QR at the branch" + manual code + Scan QR button. PRD §18.5.
 * Uses UserContext for profile (beneficiary context).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { getVoucher, type Voucher } from '@/services/vouchers';

const DS = designSystem;

export default function VoucherRedeemInstructionScreen() {
  const { profile } = useUser();
  const { voucherId } = useLocalSearchParams<{ voucherId: string }>();
  const [voucher, setVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    if (voucherId) getVoucher(voucherId).then(setVoucher);
  }, [voucherId]);

  function handleScanQR() {
    router.push({
      pathname: '/scan-qr' as never,
      params: { mode: 'voucher', voucherId: voucherId ?? '', amount: voucher?.amount?.toString() ?? '' },
    });
  }

  const manualCode = voucher?.reference ?? voucher?.id ?? '—';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Collect at branch', headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>Scan the QR at the branch</Text>
            <Text style={styles.body}>
              {profile?.firstName ? `${profile.firstName}, go to any` : 'Go to any'} NamPost or SmartPay branch. Show the QR from the next step, or give the cashier the code below to collect your cash.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manual code</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} selectable>{manualCode}</Text>
            </View>
            {voucher ? (
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.amountValue}>N${voucher.amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={handleScanQR} activeOpacity={0.8}>
            <Ionicons name="qr-code-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.scanBtnText}>Scan QR at branch</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  safe: { flex: 1 },
  content: { flex: 1, padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: DS.colors.neutral.border },
  title: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 10, textAlign: 'center' },
  body: { fontSize: 14, color: DS.colors.neutral.textSecondary, lineHeight: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text, marginBottom: 10 },
  codeBox: { backgroundColor: DS.colors.neutral.background, padding: 16, borderRadius: 12, marginBottom: 12 },
  codeText: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.text, letterSpacing: 1, textAlign: 'center' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  amountValue: { fontSize: 17, fontWeight: '700', color: DS.colors.brand.primary },
  scanBtn: { marginTop: 16, height: 52, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  scanBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
