/**
 * Voucher Detail – Buffr G2P.
 * Design: reference VoucherDetailScreen patterns (gradient card, grant info, method selection with check).
 * 2FA required before redemption. §3.2 screen 9 / Figma PRD §3.2.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { getVoucher, redeemToWallet, type Voucher } from '@/services/vouchers';
import { TwoFAModal } from '@/components/modals';

const REDEMPTION_METHODS = [
  { id: 'wallet', name: 'Buffr Wallet', desc: 'Instant credit to your wallet', iconName: 'wallet-outline' as const, colors: ['#3B82F6', '#06B6D4'] as [string, string] },
  { id: 'nampost', name: 'NamPost Cash Collection', desc: 'Collect cash at any NamPost branch', iconName: 'location-outline' as const, colors: ['#F97316', '#EF4444'] as [string, string] },
  { id: 'smartpay', name: 'SmartPay Mobile Units', desc: 'Collect cash at mobile unit', iconName: 'people-outline' as const, colors: ['#22C55E', '#10B981'] as [string, string] },
];

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useUser();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const [showPin, setShowPin] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const v = await getVoucher(id);
      setVoucher(v);
    } catch (e) { console.error('VoucherDetail:', e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function handleRedeemPress() {
    if (!selectedMethod) return;
    // PRD §18.5: NamPost → instruction (scan at branch) → confirm → 2FA
    if (selectedMethod === 'nampost' && id) {
      router.push({ pathname: '/utilities/vouchers/redeem/nampost/instruction' as never, params: { voucherId: id } });
      return;
    }
    setShowPin(true);
  }

  async function handleVerify(pinValue: string) {
    if (!selectedMethod || !id) return { success: false as const, error: 'Missing selection.' };
    if (selectedMethod === 'wallet') {
      const result = await redeemToWallet(id, pinValue);
      if (result.success) {
        setShowPin(false);
        router.replace({ pathname: '/utilities/vouchers/redeem/wallet/success' as never, params: { amount: voucher?.amount?.toString() ?? '0' } });
        return { success: true };
      }
      return { success: false, error: result.error };
    }
    return { success: true };
  }

  function handle2FASuccess() {
    if (selectedMethod === 'nampost') {
      router.push({ pathname: '/utilities/vouchers/redeem/nampost' as never, params: { voucherId: id! } });
    } else if (selectedMethod === 'smartpay') {
      router.push({ pathname: '/utilities/vouchers/redeem/smartpay' as never, params: { voucherId: id! } });
    }
  }

  const isAvailable = voucher?.status === 'available';
  const beneficiaryName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Beneficiary';

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Voucher Details',
            headerTitleStyle: { fontSize: 18, fontWeight: '700', color: '#111827' },
            headerBackButtonDisplayMode: 'minimal',
            headerTintColor: '#374151',
            headerStyle: { backgroundColor: 'rgba(255,255,255,0.9)' },
          }}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#0029D6" />
          </View>
        ) : !voucher ? (
          <View style={styles.center}>
            <Text style={styles.notFound}>Voucher not found.</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Go back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Voucher card */}
            <View style={styles.voucherCard}>
              <View style={styles.voucherCardTop}>
                <View>
                  <Text style={styles.voucherCardLabel}>{voucher.programme}</Text>
                  {voucher.reference ? <Text style={styles.voucherCardId}>#{voucher.reference}</Text> : null}
                </View>
                <View style={styles.voucherBadge}>
                  <Text style={styles.voucherBadgeText}>{voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}</Text>
                </View>
              </View>
              <Text style={styles.voucherAmount}>N${voucher.amount.toLocaleString()}</Text>
              <View style={styles.voucherDates}>
                <View>
                  <Text style={styles.voucherDateLabel}>Issued</Text>
                  <Text style={styles.voucherDateValue}>{formatDate(voucher.issuedAt)}</Text>
                </View>
                <View>
                  <Text style={styles.voucherDateLabel}>{voucher.status === 'redeemed' ? 'Redeemed' : 'Expires'}</Text>
                  <Text style={styles.voucherDateValue}>{formatDate(voucher.status === 'redeemed' && voucher.redeemedAt ? voucher.redeemedAt : voucher.expiresAt)}</Text>
                </View>
              </View>
            </View>

            {/* Grant Information */}
            <View style={styles.grantCard}>
              <Text style={styles.grantTitle}>Grant Information</Text>
              <View style={styles.grantRow}>
                <Text style={styles.grantLabel}>Beneficiary</Text>
                <Text style={styles.grantValue}>{beneficiaryName}</Text>
              </View>
              <View style={styles.grantRow}>
                <Text style={styles.grantLabel}>Programme</Text>
                <Text style={styles.grantValue}>{voucher.programme}</Text>
              </View>
              <View style={styles.grantRow}>
                <Text style={styles.grantLabel}>Issued By</Text>
                <Text style={styles.grantValue}>Ministry of Gender Equality, Poverty Eradication and Social Welfare</Text>
              </View>
            </View>

            {/* Redemption methods or redeemed state */}
            {isAvailable ? (
              <>
                <Text style={styles.sectionTitle}>Choose Redemption Method</Text>
                {REDEMPTION_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.methodBtn, selectedMethod === m.id && styles.methodBtnSelected]}
                    onPress={() => setSelectedMethod(m.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.methodIconWrap, { backgroundColor: m.colors[0] + '30' }]}>
                      <Ionicons name={m.iconName} size={24} color={m.colors[0]} />
                    </View>
                    <View style={styles.methodText}>
                      <Text style={styles.methodName}>{m.name}</Text>
                      <Text style={styles.methodDesc}>{m.desc}</Text>
                    </View>
                    {selectedMethod === m.id && (
                      <View style={styles.checkWrap}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.redeemBtn, !selectedMethod && styles.redeemBtnDisabled]}
                  onPress={handleRedeemPress}
                  disabled={!selectedMethod}
                  activeOpacity={0.8}
                >
                  <Text style={styles.redeemBtnText}>
                    {selectedMethod ? 'Redeem Voucher' : 'Select a method to continue'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.redeemedState}>
                <Ionicons
                  name={voucher.status === 'redeemed' ? 'checkmark-circle' : 'time-outline'}
                  size={48}
                  color={voucher.status === 'redeemed' ? '#22C55E' : '#94A3B8'}
                />
                <Text style={styles.redeemedTitle}>
                  {voucher.status === 'redeemed' ? 'Voucher Redeemed' : 'Voucher Expired'}
                </Text>
                {voucher.redeemedAt ? (
                  <Text style={styles.redeemedDate}>on {formatDate(voucher.redeemedAt)}</Text>
                ) : null}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      <TwoFAModal
        visible={showPin}
        onClose={() => setShowPin(false)}
        onVerify={handleVerify}
        onSuccess={selectedMethod === 'wallet' ? undefined : handle2FASuccess}
        title="Verify Identity"
        subtitle="Enter your 6-digit PIN to confirm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFound: { fontSize: 16, color: '#64748B', marginBottom: 12 },
  link: { fontSize: 16, color: '#2563EB' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  // Voucher card (solid brand blue, was gradient)
  voucherCard: { borderRadius: 24, padding: 24, marginBottom: 24, backgroundColor: '#0029D6' },
  voucherCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  voucherCardLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 4, fontWeight: '500' },
  voucherCardId: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  voucherBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999 },
  voucherBadgeText: { fontSize: 12, fontWeight: '500', color: '#fff' },
  voucherAmount: { fontSize: 48, fontWeight: '700', color: '#fff', marginBottom: 16 },
  voucherDates: { flexDirection: 'row', gap: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  voucherDateLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  voucherDateValue: { fontSize: 14, fontWeight: '500', color: '#fff' },
  // Grant info card
  grantCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  grantTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 16 },
  grantRow: { marginBottom: 12 },
  grantLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  grantValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  // Section title
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 14 },
  // Method selection
  methodBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#fff', marginBottom: 12 },
  methodBtnSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  methodIconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  methodText: { flex: 1 },
  methodName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  methodDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  checkWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
  // Redeem button
  redeemBtn: { height: 54, borderRadius: 9999, backgroundColor: '#0029D6', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  redeemBtnDisabled: { opacity: 0.5 },
  redeemBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  // Redeemed state
  redeemedState: { alignItems: 'center', paddingVertical: 40 },
  redeemedTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 12 },
  redeemedDate: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});
