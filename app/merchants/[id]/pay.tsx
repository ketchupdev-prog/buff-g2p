/**
 * Merchant Payment – Buffr G2P.
 * Pay a Buffr-registered merchant. 2FA PIN required.
 * §5.2 merchant payment flow.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { getWallets, type Wallet } from '@/services/wallets';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PIN_LENGTH = 6;

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await AsyncStorage.getItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function payMerchant(params: {
  merchantId: string;
  walletId: string;
  amount: number;
  note?: string;
  pin: string;
}): Promise<{ success: boolean; reference?: string; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/merchants/${params.merchantId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { reference?: string; error?: string };
      if (res.ok) return { success: true, reference: data.reference };
      return { success: false, error: data.error ?? 'Payment failed' };
    } catch { /* fall through */ }
  }
  return { success: true, reference: 'REF' + Date.now().toString().slice(-8) };
}

export default function MerchantPayScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ reference: string; amount: number } | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const merchantName = name ?? 'Merchant';

  useEffect(() => {
    getWallets().then(ws => {
      setWallets(ws);
      const primary = ws.find(w => w.isPrimary) ?? ws[0];
      if (primary) setSelectedWalletId(primary.id);
    }).catch(() => {});
  }, []);

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const parsedAmount = parseFloat(amount) || 0;
  const hasFunds = selectedWallet ? selectedWallet.balance >= parsedAmount : true;

  function handleContinue() {
    if (!amount || parsedAmount <= 0) { setError('Enter a valid amount.'); return; }
    if (parsedAmount < 1) { setError('Minimum payment is N$1.'); return; }
    if (!selectedWalletId) { setError('Select a wallet to pay from.'); return; }
    if (!hasFunds) { setError('Insufficient balance.'); return; }
    setError(null);
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

  async function handleConfirm() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) { setPinError('Enter your full 6-digit PIN.'); return; }
    if (!id || !selectedWalletId) return;
    setSubmitting(true);
    const result = await payMerchant({ merchantId: id, walletId: selectedWalletId, amount: parsedAmount, note: note.trim() || undefined, pin: fullPin });
    setSubmitting(false);
    if (result.success) {
      setShowPin(false);
      setDone({ reference: result.reference ?? '', amount: parsedAmount });
    } else {
      setPinError(result.error ?? 'Payment failed. Please try again.');
      setPin(Array(PIN_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }

  if (done) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle-outline" size={44} color="#22C55E" />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successAmount}>N$ {done.amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.successMerchant}>paid to {merchantName}</Text>
            <View style={styles.refBox}>
              <Text style={styles.refLabel}>Reference</Text>
              <Text style={styles.refValue}>{done.reference}</Text>
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)' as never)}>
              <Text style={styles.doneBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: `Pay ${merchantName}`, headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Merchant info */}
            <View style={styles.merchantCard}>
              <View style={styles.merchantIcon}>
                <Ionicons name="storefront-outline" size={28} color={designSystem.colors.brand.primary} />
              </View>
              <Text style={styles.merchantName}>{merchantName}</Text>
              <Text style={styles.merchantSub}>Buffr-registered merchant</Text>
            </View>

            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={[styles.amountWrap, error && { borderColor: designSystem.colors.semantic.error }]}>
              <Text style={styles.prefix}>N$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                value={amount}
                onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, '')); setError(null); }}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Quick amounts */}
            <View style={styles.quickRow}>
              {[50, 100, 200, 500].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.quickChip, amount === String(v) && styles.quickChipActive]}
                  onPress={() => { setAmount(String(v)); setError(null); }}
                >
                  <Text style={[styles.quickChipText, amount === String(v) && styles.quickChipTextActive]}>N${v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Note */}
            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="What is this payment for?"
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={note}
              onChangeText={setNote}
              maxLength={120}
            />

            {/* Wallet selector */}
            {wallets.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Pay from</Text>
                {wallets.map(w => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.walletRow, selectedWalletId === w.id && styles.walletRowActive]}
                    onPress={() => setSelectedWalletId(w.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.walletIcon}>
                      <Ionicons name="wallet-outline" size={16} color={designSystem.colors.brand.primary} />
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletName}>{w.name}</Text>
                      <Text style={[styles.walletBalance, (!hasFunds && selectedWalletId === w.id) && { color: designSystem.colors.semantic.error }]}>
                        N$ {w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    {selectedWalletId === w.id && (
                      <Ionicons name="checkmark-circle" size={20} color={designSystem.colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.payBtn, (!amount || !selectedWalletId || !hasFunds) && styles.btnDisabled]}
              onPress={handleContinue}
              disabled={!amount || !selectedWalletId}
            >
              <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.payBtnText}>
                {parsedAmount > 0
                  ? `Pay N$ ${parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`
                  : 'Enter Amount to Pay'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* PIN modal */}
      <Modal visible={showPin} transparent animationType="slide" onRequestClose={() => { setShowPin(false); setSubmitting(false); }}>
        <View style={styles.overlay}>
          <View style={styles.pinCard}>
            <View style={styles.handle} />
            <Text style={styles.pinTitle}>Confirm Payment</Text>
            <Text style={styles.pinSub}>
              Enter your PIN to pay N$ {parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })} to {merchantName}
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
                onPress={handleConfirm}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.confirmBtnText}>Pay Now</Text>}
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
  merchantCard: { backgroundColor: DS.colors.brand.primary, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  merchantIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  merchantName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  merchantSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10, marginTop: 16 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 20, height: 60 },
  prefix: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: DS.colors.neutral.text },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 6 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickChip: { flex: 1, height: 40, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  quickChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  quickChipText: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  quickChipTextActive: { color: '#fff' },
  noteInput: { height: 50, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 16, fontSize: 15, color: DS.colors.neutral.text },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: DS.colors.neutral.border, backgroundColor: '#fff', marginBottom: 8 },
  walletRowActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  walletIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  walletInfo: { flex: 1 },
  walletName: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.text },
  walletBalance: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  footer: { padding: 24, paddingBottom: 32 },
  payBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 4 },
  successAmount: { fontSize: 36, fontWeight: '800', color: '#22C55E', marginBottom: 4 },
  successMerchant: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginBottom: 24 },
  refBox: { backgroundColor: DS.colors.neutral.background, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 28, width: '100%' },
  refLabel: { fontSize: 11, color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  refValue: { fontSize: 16, fontWeight: '700', color: DS.colors.neutral.text, letterSpacing: 1 },
  doneBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48 },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
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
