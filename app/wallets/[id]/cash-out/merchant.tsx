/**
 * Cash Out – Cash at Merchant – Buffr G2P.
 * Scan merchant QR or show cash code. Fee: N$3. Instant.
 * §3.3 screen 21.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { designSystem } from '@/constants/designSystem';
import { executeCashOut } from '@/services/cashout';
import { getWallet } from '@/services/wallets';

const PIN_LENGTH = 6;
const EXPIRE_SECS = 15 * 60;

function generateRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, (_, i) => i === 4 ? '-' : chars[Math.floor(Math.random() * chars.length)]).join('');
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

type Step = 'amount' | 'pin' | 'code';

export default function CashOutMerchantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [cashRef, setCashRef] = useState('');
  const [countdown, setCountdown] = useState(EXPIRE_SECS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { getWallet(id ?? '').then(w => setBalance(w?.balance ?? null)).catch(() => {}); }, [id]);

  useEffect(() => {
    if (step === 'code') {
      setCountdown(EXPIRE_SECS);
      timerRef.current = setInterval(() => {
        setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current!); return 0; } return c - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  function validate(): number | null {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError('Enter a valid amount.'); return null; }
    if (balance !== null && num > balance) { setError(`Insufficient. Available: N$ ${balance.toFixed(2)}`); return null; }
    setError(null); return num;
  }

  function handleScanQR() {
    const num = validate(); if (!num) return;
    router.push({ pathname: '/scan-qr', params: { mode: 'cashout', method: 'merchant', walletId: id, amount: num.toFixed(2) } } as never);
  }

  function handleShowCode() { if (!validate()) return; setStep('pin'); setTimeout(() => inputRefs.current[0]?.focus(), 100); }

  function handlePinChange(text: string, i: number) {
    const next = [...pin]; next[i] = text; setPin(next);
    if (text && i < PIN_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }
  function handleKeyPress(e: { nativeEvent: { key: string } }, i: number) {
    if (e.nativeEvent.key === 'Backspace' && !pin[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  async function handleConfirm() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) { setError('Enter your full PIN.'); return; }
    setError(null); setSubmitting(true);
    try {
      const result = await executeCashOut({ walletId: id ?? '', method: 'merchant', amount: parseFloat(amount), pin: fullPin });
      setCashRef(result.success && result.transactionId ? result.transactionId : generateRef());
      setStep('code');
    } catch { setCashRef(generateRef()); setStep('code'); }
    finally { setSubmitting(false); }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Cash at Merchant', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {step === 'amount' && (
            <>
              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.feeBadge}>
                  <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
                  <Text style={styles.feeText}>N$3 fee · Instant</Text>
                </View>
                {balance !== null && (
                  <View style={styles.balanceBadge}>
                    <Text style={styles.balanceLabel}>Available</Text>
                    <Text style={styles.balanceValue}>N$ {balance.toFixed(2)}</Text>
                  </View>
                )}
                <Text style={styles.sectionLabel}>Amount</Text>
                <View style={styles.amountWrap}>
                  <Text style={styles.amountPrefix}>N$</Text>
                  <TextInput style={styles.amountInput} placeholder="0.00" placeholderTextColor={designSystem.colors.neutral.textTertiary}
                    value={amount} onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, '')); setError(null); }} keyboardType="decimal-pad" autoFocus />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <View style={styles.optionCard}>
                  <Text style={styles.optionTitle}>Choose how to cash out</Text>
                  <TouchableOpacity style={styles.optionRow} onPress={handleScanQR} activeOpacity={0.8}>
                    <View style={styles.optionIcon}><Ionicons name="qr-code-outline" size={20} color={designSystem.colors.brand.primary} /></View>
                    <View style={styles.optionInfo}><Text style={styles.optionLabel}>Scan Merchant QR</Text><Text style={styles.optionSub}>Scan the QR code displayed at the merchant</Text></View>
                    <Ionicons name="chevron-forward" size={16} color={designSystem.colors.neutral.textTertiary} />
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <TouchableOpacity style={styles.optionRow} onPress={handleShowCode} activeOpacity={0.8}>
                    <View style={styles.optionIcon}><Ionicons name="key-outline" size={20} color={designSystem.colors.brand.primary} /></View>
                    <View style={styles.optionInfo}><Text style={styles.optionLabel}>Show Cash Code</Text><Text style={styles.optionSub}>Generate a code to show the merchant</Text></View>
                    <Ionicons name="chevron-forward" size={16} color={designSystem.colors.neutral.textTertiary} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}

          {step === 'pin' && (
            <>
              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Amount</Text><Text style={[styles.summaryValue, { color: designSystem.colors.brand.primary, fontWeight: '700' }]}>N$ {parseFloat(amount).toFixed(2)}</Text></View>
                  <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}><Text style={styles.summaryLabel}>Fee</Text><Text style={styles.summaryValue}>N$ 3.00</Text></View>
                </View>
                <Text style={styles.pinLabel}>Enter your PIN to confirm</Text>
                <View style={styles.pinRow}>
                  {pin.map((digit, i) => (
                    <TextInput key={i} ref={r => (inputRefs.current[i] = r as TextInput)}
                      style={[styles.pinBox, digit ? styles.pinBoxFilled : null, error ? styles.pinBoxError : null]}
                      value={digit} onChangeText={t => handlePinChange(t, i)} onKeyPress={e => handleKeyPress(e, i)}
                      keyboardType="number-pad" maxLength={1} secureTextEntry caretHidden />
                  ))}
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </ScrollView>
              <View style={styles.footer}>
                <TouchableOpacity style={[styles.btn, submitting && styles.btnDisabled]} onPress={handleConfirm} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Get Cash Code</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => { setStep('amount'); setPin(Array(PIN_LENGTH).fill('')); setError(null); }}>
                  <Text style={styles.backLinkText}>← Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'code' && (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.codeCard}>
                <Text style={styles.codeCardLabel}>Merchant Cash Code</Text>
                <Text style={styles.codeCardValue}>{cashRef}</Text>
                <Text style={styles.codeCardAmount}>N$ {parseFloat(amount).toFixed(2)}</Text>
                <View style={styles.timerRow}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.timerText}>{countdown > 0 ? `Expires in ${formatCountdown(countdown)}` : 'Expired'}</Text>
                </View>
              </View>
              <View style={styles.instructCard}>
                <Text style={styles.instructTitle}>Show to the merchant cashier</Text>
                {['Show this code on your screen', 'Cashier enters code in their terminal', 'Collect your N$ ' + parseFloat(amount).toFixed(2) + ' cash'].map((s, i) => (
                  <View key={i} style={styles.instructRow}>
                    <View style={styles.instructNum}><Text style={styles.instructNumText}>{i + 1}</Text></View>
                    <Text style={styles.instructText}>{s}</Text>
                  </View>
                ))}
              </View>
              {countdown === 0 && (
                <TouchableOpacity style={styles.btn} onPress={() => { setStep('amount'); setCashRef(''); }}>
                  <Text style={styles.btnText}>Generate New Code</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.doneBtn, { marginTop: 12 }]} onPress={() => router.replace('/(tabs)' as never)}>
                <Text style={styles.doneBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  feeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DBEAFE', borderRadius: 12, padding: 12, marginBottom: 16 },
  feeText: { fontSize: 13, color: '#1D4ED8', fontWeight: '600' },
  balanceBadge: { backgroundColor: DS.colors.brand.primaryMuted, borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { fontSize: 12, color: DS.colors.brand.primary, marginBottom: 2 },
  balanceValue: { fontSize: 22, fontWeight: '700', color: DS.colors.brand.primary },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 20, height: 56 },
  amountPrefix: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: DS.colors.neutral.text },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 8, textAlign: 'center' },
  optionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 4, marginTop: 24, borderWidth: 1, borderColor: DS.colors.neutral.border },
  optionTitle: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary, paddingHorizontal: 16, paddingTop: 16, marginBottom: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  optionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  optionSub: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: DS.colors.neutral.border, marginHorizontal: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 28, borderWidth: 1, borderColor: DS.colors.neutral.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  summaryLabel: { fontSize: 14, color: DS.colors.neutral.textSecondary },
  summaryValue: { fontSize: 14, color: DS.colors.neutral.text, fontWeight: '500' },
  pinLabel: { fontSize: 16, color: DS.colors.neutral.text, textAlign: 'center', marginBottom: 20 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  pinBox: { width: 44, height: 52, borderWidth: 1.5, borderColor: DS.colors.neutral.border, borderRadius: 16, textAlign: 'center', fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, backgroundColor: '#fff' },
  pinBoxFilled: { borderColor: DS.colors.brand.primary, backgroundColor: DS.colors.brand.primaryMuted },
  pinBoxError: { borderColor: DS.colors.semantic.error },
  footer: { padding: 24, paddingBottom: 32, gap: 10 },
  btn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { fontSize: 14, color: DS.colors.brand.primary, fontWeight: '600' },
  codeCard: { backgroundColor: DS.colors.brand.primary, borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16 },
  codeCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  codeCardValue: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 6, marginBottom: 8 },
  codeCardAmount: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 12 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  timerText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  instructCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: DS.colors.neutral.border },
  instructTitle: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 14 },
  instructRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  instructNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  instructNumText: { fontSize: 12, fontWeight: '700', color: DS.colors.brand.primary },
  instructText: { fontSize: 13, color: DS.colors.neutral.textSecondary, flex: 1 },
  doneBtn: { height: 56, borderWidth: 1.5, borderColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: DS.colors.brand.primary },
});
