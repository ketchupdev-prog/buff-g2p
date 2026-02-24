/**
 * Money Request – Buffr G2P.
 * Accept (pay) or decline a money request received via deep link or notification.
 * §3.5 receive / request flow.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { Avatar } from '@/components/ui';
import { getWallets, type Wallet } from '@/services/wallets';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PIN_LENGTH = 6;

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await AsyncStorage.getItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

interface MoneyRequest {
  id: string;
  requesterName: string;
  requesterPhone: string;
  amount: number;
  note?: string;
  createdAt: string;
  expiresAt?: string;
}

async function fetchRequest(requestId: string): Promise<MoneyRequest | null> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/payment-requests/${requestId}`, {
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) return (await res.json()) as MoneyRequest;
    } catch { /* fall through */ }
  }
  // Seed for demo
  return {
    id: requestId,
    requesterName: 'David Hamutenya',
    requesterPhone: '+264 81 765 4321',
    amount: 250,
    note: 'Contribution for farewell party',
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
    expiresAt: new Date(Date.now() + 86400_000).toISOString(),
  };
}

async function payRequest(
  requestId: string,
  walletId: string,
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/payment-requests/${requestId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ walletId, pin }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) return { success: true };
      return { success: false, error: data.error ?? 'Payment failed' };
    } catch { /* fall through */ }
  }
  return { success: true };
}

async function declineRequest(requestId: string): Promise<void> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      await fetch(`${API_BASE_URL}/api/v1/mobile/payment-requests/${requestId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
      });
    } catch { /* ignore */ }
  }
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleString('en-NA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

export default function MoneyRequestScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const [request, setRequest] = useState<MoneyRequest | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<'paid' | 'declined' | null>(null);

  // PIN modal
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    Promise.all([
      fetchRequest(requestId ?? ''),
      getWallets(),
    ]).then(([req, ws]) => {
      setRequest(req);
      setWallets(ws);
      const primary = ws.find(w => w.isPrimary) ?? ws[0];
      if (primary) setSelectedWalletId(primary.id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [requestId]);

  function openPin() {
    setPin(Array(PIN_LENGTH).fill(''));
    setPinError(null);
    setShowPin(true);
  }

  function handlePinChange(text: string, index: number) {
    const next = [...pin];
    next[index] = text;
    setPin(next);
    if (text && index < PIN_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  async function handlePay() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) { setPinError('Please enter your full PIN.'); return; }
    if (!selectedWalletId || !requestId) return;
    setSubmitting(true);
    const result = await payRequest(requestId, selectedWalletId, fullPin);
    setSubmitting(false);
    if (result.success) {
      setShowPin(false);
      setDone('paid');
    } else {
      setPinError(result.error ?? 'Payment failed. Please try again.');
      setPin(Array(PIN_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }

  async function handleDecline() {
    await declineRequest(requestId ?? '');
    setDone('declined');
  }

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const hasFunds = selectedWallet ? selectedWallet.balance >= (request?.amount ?? 0) : true;

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
            <View style={[styles.doneIcon, { backgroundColor: done === 'paid' ? '#D1FAE5' : '#F1F5F9' }]}>
              <Ionicons
                name={done === 'paid' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={40}
                color={done === 'paid' ? '#22C55E' : '#94A3B8'}
              />
            </View>
            <Text style={styles.doneTitle}>
              {done === 'paid' ? 'Payment Sent!' : 'Request Declined'}
            </Text>
            <Text style={styles.doneSub}>
              {done === 'paid'
                ? `N$ ${request?.amount?.toLocaleString('en-NA', { minimumFractionDigits: 2 })} sent to ${request?.requesterName}.`
                : 'You have declined this payment request.'}
            </Text>
            <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)' as never)}>
              <Text style={styles.homeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Money Request', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Request card */}
          <View style={styles.requestCard}>
            <View style={styles.requestAmount}>
              <Text style={styles.requestLabel}>Requesting</Text>
              <Text style={styles.requestValue}>
                N$ {request?.amount?.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
              </Text>
              {request?.note ? <Text style={styles.requestNote}>{request.note}</Text> : null}
            </View>
          </View>

          {/* Requester */}
          <View style={styles.requesterCard}>
            <Text style={styles.cardLabel}>From</Text>
            <View style={styles.requesterRow}>
              <Avatar name={request?.requesterName ?? '?'} size={44} />
              <View>
                <Text style={styles.requesterName}>{request?.requesterName}</Text>
                <Text style={styles.requesterPhone}>{request?.requesterPhone}</Text>
              </View>
            </View>
            {request?.createdAt ? (
              <Text style={styles.requestTime}>Sent {formatDate(request.createdAt)}</Text>
            ) : null}
          </View>

          {/* Pay from wallet selector */}
          {wallets.length > 0 && (
            <View style={styles.walletSection}>
              <Text style={styles.cardLabel}>Pay from</Text>
              {wallets.map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.walletRow, selectedWalletId === w.id && styles.walletRowActive]}
                  onPress={() => setSelectedWalletId(w.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.walletIcon}>
                    <Ionicons name="wallet-outline" size={18} color={designSystem.colors.brand.primary} />
                  </View>
                  <View style={styles.walletInfo}>
                    <Text style={styles.walletName}>{w.name}</Text>
                    <Text style={[styles.walletBalance, w.balance < (request?.amount ?? 0) && { color: designSystem.colors.semantic.error }]}>
                      N$ {w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  {selectedWalletId === w.id && (
                    <Ionicons name="checkmark-circle" size={20} color={designSystem.colors.brand.primary} />
                  )}
                </TouchableOpacity>
              ))}
              {!hasFunds && (
                <View style={styles.warnBanner}>
                  <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
                  <Text style={styles.warnText}>Insufficient balance in selected wallet.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payBtn, (!hasFunds || !selectedWalletId) && styles.btnDisabled]}
            onPress={openPin}
            disabled={!hasFunds || !selectedWalletId}
            activeOpacity={0.9}
          >
            <Ionicons name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.payBtnText}>
              Pay N$ {request?.amount?.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.8}>
            <Text style={styles.declineBtnText}>Decline Request</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* PIN modal */}
      <Modal visible={showPin} transparent animationType="slide" onRequestClose={() => { setShowPin(false); setSubmitting(false); }}>
        <View style={styles.overlay}>
          <View style={styles.pinCard}>
            <View style={styles.handle} />
            <Text style={styles.pinTitle}>Confirm Payment</Text>
            <Text style={styles.pinSub}>
              Enter your PIN to send N$ {request?.amount?.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
            </Text>
            <View style={styles.pinRow}>
              {pin.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={r => (inputRefs.current[i] = r)}
                  style={[styles.pinBox, digit ? styles.pinBoxFilled : null, pinError ? styles.pinBoxError : null]}
                  value={digit}
                  onChangeText={t => handlePinChange(t, i)}
                  onKeyPress={e => {
                    if (e.nativeEvent.key === 'Backspace' && !pin[i] && i > 0) inputRefs.current[i - 1]?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                  secureTextEntry
                  caretHidden
                  autoFocus={i === 0}
                />
              ))}
            </View>
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <View style={styles.pinActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowPin(false); setSubmitting(false); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submitting && styles.btnDisabled]}
                onPress={handlePay}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmBtnText}>Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  content: { padding: 24, paddingBottom: 16 },
  requestCard: { backgroundColor: DS.colors.brand.primary, borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16 },
  requestAmount: { alignItems: 'center' },
  requestLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  requestValue: { fontSize: 44, fontWeight: '800', color: '#fff', marginBottom: 8 },
  requestNote: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontStyle: 'italic' },
  requesterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: DS.colors.neutral.border },
  cardLabel: { fontSize: 11, color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  requesterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  requesterName: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text },
  requesterPhone: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  requestTime: { fontSize: 12, color: DS.colors.neutral.textTertiary },
  walletSection: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: DS.colors.neutral.border, gap: 8 },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: DS.colors.neutral.border },
  walletRowActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  walletIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  walletInfo: { flex: 1 },
  walletName: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.text },
  walletBalance: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  warnBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10 },
  warnText: { fontSize: 12, color: '#92400E' },
  footer: { padding: 24, paddingBottom: 32, gap: 12 },
  payBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  declineBtn: { height: 56, borderWidth: 1.5, borderColor: DS.colors.neutral.border, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  declineBtnText: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  btnDisabled: { opacity: 0.4 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 8, textAlign: 'center' },
  doneSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 28 },
  homeBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  homeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pinCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle: { width: 36, height: 5, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  pinTitle: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, textAlign: 'center', marginBottom: 4 },
  pinSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 28 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  pinBox: { width: 48, height: 56, borderWidth: 1.5, borderColor: DS.colors.neutral.border, borderRadius: 16, textAlign: 'center', fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, backgroundColor: DS.colors.neutral.background },
  pinBoxFilled: { borderColor: DS.colors.brand.primary, backgroundColor: '#fff' },
  pinBoxError: { borderColor: DS.colors.semantic.error },
  pinError: { fontSize: 13, color: DS.colors.semantic.error, textAlign: 'center', marginBottom: 8 },
  pinActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, height: 52, borderWidth: 1.5, borderColor: DS.colors.neutral.border, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  confirmBtn: { flex: 2, height: 52, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
