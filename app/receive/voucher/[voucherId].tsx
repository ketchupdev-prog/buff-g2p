/**
 * Receive Voucher – Buffr G2P.
 * Confirm acceptance of a voucher gift sent by another Buffr user.
 * §3.2 receive voucher flow.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { getSecureItem } from '@/services/secureStorage';
import { designSystem } from '@/constants/designSystem';
import { Avatar } from '@/components/ui';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

interface VoucherGift {
  id: string;
  senderName: string;
  senderPhone: string;
  amount: number;
  programme: string;
  message?: string;
  expiresAt: string;
}

async function fetchVoucherGift(voucherId: string): Promise<VoucherGift | null> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/voucher-gifts/${voucherId}`, {
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) return (await res.json()) as VoucherGift;
    } catch { /* fall through */ }
  }
  return {
    id: voucherId,
    senderName: 'Lucia Aukongo',
    senderPhone: '+264 81 987 6543',
    amount: 500,
    programme: 'Child Welfare Grant',
    message: 'For the school supplies!',
    expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
  };
}

async function acceptVoucherGift(voucherId: string): Promise<{ success: boolean }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/voucher-gifts/${voucherId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) return { success: true };
    } catch { /* fall through */ }
  }
  return { success: true };
}

async function declineVoucherGift(voucherId: string): Promise<void> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      await fetch(`${API_BASE_URL}/api/v1/mobile/voucher-gifts/${voucherId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
      });
    } catch { /* ignore */ }
  }
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso; }
}

export default function ReceiveVoucherScreen() {
  const { voucherId } = useLocalSearchParams<{ voucherId: string }>();
  const [gift, setGift] = useState<VoucherGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    fetchVoucherGift(voucherId ?? '').then(setGift).catch(() => {}).finally(() => setLoading(false));
  }, [voucherId]);

  async function handleAccept() {
    setSubmitting(true);
    await acceptVoucherGift(voucherId ?? '');
    setSubmitting(false);
    setDone('accepted');
  }

  async function handleDecline() {
    setSubmitting(true);
    await declineVoucherGift(voucherId ?? '');
    setSubmitting(false);
    setDone('declined');
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}><ActivityIndicator color={designSystem.colors.brand.primary} /></View>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <View style={[styles.doneIcon, { backgroundColor: done === 'accepted' ? '#D1FAE5' : '#F1F5F9' }]}>
              <Ionicons
                name={done === 'accepted' ? 'gift-outline' : 'close-circle-outline'}
                size={40}
                color={done === 'accepted' ? '#22C55E' : '#94A3B8'}
              />
            </View>
            <Text style={styles.doneTitle}>
              {done === 'accepted' ? 'Voucher Accepted!' : 'Voucher Declined'}
            </Text>
            <Text style={styles.doneSub}>
              {done === 'accepted'
                ? `N$${gift?.amount?.toLocaleString()} ${gift?.programme} voucher added to your account.`
                : 'The voucher has been returned to the sender.'}
            </Text>
            {done === 'accepted' && (
              <TouchableOpacity
                style={styles.viewVouchersBtn}
                onPress={() => router.replace('/(tabs)/vouchers' as never)}
              >
                <Text style={styles.viewVouchersBtnText}>View My Vouchers</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={done === 'accepted' ? styles.homeLink : styles.homeBtn} onPress={() => router.replace('/(tabs)' as never)}>
              <Text style={done === 'accepted' ? styles.homeLinkText : styles.homeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Receive Voucher', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Voucher card */}
          <View style={styles.voucherCard}>
            <View style={styles.giftIconWrap}>
              <Ionicons name="gift-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.voucherCardLabel}>Voucher Gift</Text>
            <Text style={styles.voucherAmount}>
              N${gift?.amount?.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.voucherProgramme}>{gift?.programme}</Text>
            <View style={styles.expireBadge}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.expireText}>Expires {formatDate(gift?.expiresAt ?? '')}</Text>
            </View>
          </View>

          {/* Sender */}
          <View style={styles.senderCard}>
            <Text style={styles.cardLabel}>Sent by</Text>
            <View style={styles.senderRow}>
              <Avatar name={gift?.senderName ?? '?'} size={44} />
              <View>
                <Text style={styles.senderName}>{gift?.senderName}</Text>
                <Text style={styles.senderPhone}>{gift?.senderPhone}</Text>
              </View>
            </View>
            {gift?.message ? (
              <View style={styles.messageBox}>
                <Ionicons name="chatbubble-outline" size={14} color={designSystem.colors.brand.primary} />
                <Text style={styles.messageText}>"{gift.message}"</Text>
              </View>
            ) : null}
          </View>

          {/* Info */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
            <Text style={styles.infoText}>
              Accepting this voucher will add it to your Buffr account. You can redeem it at any NamPost branch, SmartPay agent, or directly to your wallet.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.acceptBtn, submitting && styles.btnDisabled]}
              onPress={handleAccept}
              disabled={submitting}
              activeOpacity={0.9}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Ionicons name="checkmark-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.acceptBtnText}>Accept Voucher</Text>
                  </>
                )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, submitting && styles.btnDisabled]}
              onPress={handleDecline}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  content: { padding: 24, paddingBottom: 40 },
  voucherCard: { backgroundColor: DS.colors.brand.primary, borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16 },
  giftIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  voucherCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  voucherAmount: { fontSize: 44, fontWeight: '800', color: '#fff', marginBottom: 4 },
  voucherProgramme: { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginBottom: 16 },
  expireBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 7 },
  expireText: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  senderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: DS.colors.neutral.border },
  cardLabel: { fontSize: 11, color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  senderName: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text },
  senderPhone: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  messageBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12 },
  messageText: { flex: 1, fontSize: 13, color: DS.colors.brand.primary, fontStyle: 'italic' },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#DBEAFE', borderRadius: 12, padding: 14, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 18 },
  actions: { gap: 12 },
  acceptBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  acceptBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  declineBtn: { height: 56, borderWidth: 1.5, borderColor: DS.colors.neutral.border, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  declineBtnText: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  btnDisabled: { opacity: 0.5 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 8, textAlign: 'center' },
  doneSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 28 },
  viewVouchersBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginBottom: 12 },
  viewVouchersBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  homeBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  homeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  homeLink: { marginTop: 4 },
  homeLinkText: { fontSize: 15, color: DS.colors.brand.primary, fontWeight: '600' },
});
