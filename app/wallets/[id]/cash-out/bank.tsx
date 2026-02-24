/**
 * Cash Out – Bank Transfer – Buffr G2P.
 * EFT to linked bank account. Fee: N$5. 1–2 business days.
 * §3.3 screen 18.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { executeCashOut, getBankAccounts } from '@/services/cashout';
import { getWallet } from '@/services/wallets';

const SEED_ACCOUNTS = [
  { id: 'bank_ned', bankName: 'Nedbank', accountNumber: '•••• 2293', accountName: 'User Account' },
  { id: 'bank_bwh', bankName: 'Bank Windhoek', accountNumber: '•••• 4184', accountName: 'User Account' },
];

const PIN_LENGTH = 6;
type Step = 'details' | 'pin';

export default function CashOutBankScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [balance, setBalance] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<typeof SEED_ACCOUNTS>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('details');
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [w, accs] = await Promise.all([getWallet(id), getBankAccounts()]);
      setBalance(w?.balance ?? null);
      const list = accs.length > 0 ? accs : SEED_ACCOUNTS;
      setAccounts(list);
      setSelectedAccount(list[0]?.id ?? null);
    } catch { /* use defaults */ } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function handleNext() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError('Enter a valid amount.'); return; }
    if (balance !== null && num > balance) { setError(`Insufficient balance. Available: N$${balance.toFixed(2)}`); return; }
    if (!selectedAccount) { setError('Select a bank account.'); return; }
    setError(null);
    setStep('pin');
  }

  function handlePinChange(text: string, index: number) {
    const next = [...pin]; next[index] = text; setPin(next);
    if (text && index < PIN_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyPress(e: { nativeEvent: { key: string } }, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  }

  async function handleConfirm() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) { setError('Enter your full PIN.'); return; }
    setError(null); setSubmitting(true);
    try {
      const result = await executeCashOut({
        walletId: id ?? '',
        method: 'bank',
        amount: parseFloat(amount),
        pin: fullPin,
        bankAccountId: selectedAccount ?? undefined,
      });
      if (result.success) {
        router.replace({
          pathname: `/wallets/${id}/cash-out/success`,
          params: { method: 'bank', amount, reference: result.transactionId ?? '', walletId: id },
        } as never);
      } else {
        setError(result.error ?? 'Transfer failed. Please try again.');
        setPin(Array(PIN_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch { setError('Something went wrong.'); }
    finally { setSubmitting(false); }
  }

  const acct = accounts.find(a => a.id === selectedAccount);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Bank Transfer', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {loading ? (
            <View style={styles.center}><ActivityIndicator color={designSystem.colors.brand.primary} /></View>
          ) : step === 'details' ? (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {/* Balance */}
              <View style={styles.balanceBadge}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>{'N$'}{balance?.toFixed(2) ?? '–'}</Text>
              </View>

              {/* Fee info */}
              <View style={styles.feeCard}>
                <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                <Text style={styles.feeText}>N$5 fee · Arrives in 1–2 business days</Text>
              </View>

              {/* Account selector */}
              <Text style={styles.sectionLabel}>Pay to</Text>
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountCard, selectedAccount === acc.id && styles.accountCardActive]}
                  onPress={() => setSelectedAccount(acc.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.accountIcon}>
                    <Ionicons name="business-outline" size={20} color={selectedAccount === acc.id ? '#fff' : designSystem.colors.brand.primary} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountBank, selectedAccount === acc.id && { color: '#fff' }]}>{acc.bankName}</Text>
                    <Text style={[styles.accountNum, selectedAccount === acc.id && { color: 'rgba(255,255,255,0.7)' }]}>{acc.accountNumber} · {acc.accountName}</Text>
                  </View>
                  {selectedAccount === acc.id && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                </TouchableOpacity>
              ))}

              {/* Amount */}
              <Text style={styles.sectionLabel}>Amount</Text>
              <View style={styles.amountWrap}>
                <Text style={styles.amountPrefix}>N$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={designSystem.colors.neutral.textTertiary}
                  value={amount}
                  onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, '')); setError(null); }}
                  keyboardType="decimal-pad"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {/* Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>To</Text>
                  <Text style={styles.summaryValue}>{acct?.bankName} {acct?.accountNumber}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={[styles.summaryValue, { color: designSystem.colors.brand.primary, fontWeight: '700' }]}>{'N$'}{parseFloat(amount).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Fee</Text>
                  <Text style={styles.summaryValue}>N$5.00</Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryLabel}>Total deducted</Text>
                  <Text style={[styles.summaryValue, { fontWeight: '700' }]}>{'N$'}{(parseFloat(amount) + 5).toFixed(2)}</Text>
                </View>
              </View>

              <Text style={styles.pinLabel}>Enter your PIN to confirm</Text>
              <View style={styles.pinRow}>
                {pin.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => (inputRefs.current[i] = r as TextInput)}
                    style={[styles.pinBox, digit ? styles.pinBoxFilled : null, error ? styles.pinBoxError : null]}
                    value={digit}
                    onChangeText={t => handlePinChange(t, i)}
                    onKeyPress={e => handleKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    secureTextEntry
                    caretHidden
                  />
                ))}
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            {step === 'details' ? (
              <TouchableOpacity style={[styles.btn, !amount && styles.btnDisabled]} onPress={handleNext} disabled={!amount} activeOpacity={0.9}>
                <Text style={styles.btnText}>Continue</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[styles.btn, submitting && styles.btnDisabled]} onPress={handleConfirm} disabled={submitting} activeOpacity={0.9}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirm Transfer</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => { setStep('details'); setPin(Array(PIN_LENGTH).fill('')); setError(null); }}>
                  <Text style={styles.backLinkText}>← Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 8 },
  balanceBadge: { backgroundColor: designSystem.colors.brand.primaryMuted, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  balanceLabel: { fontSize: 12, color: designSystem.colors.brand.primary, marginBottom: 4 },
  balanceValue: { fontSize: 24, fontWeight: '700', color: designSystem.colors.brand.primary },
  feeCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DBEAFE', borderRadius: 12, padding: 12, marginBottom: 24 },
  feeText: { fontSize: 13, color: '#1D4ED8', flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: designSystem.colors.neutral.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: designSystem.colors.neutral.border },
  accountCardActive: { backgroundColor: designSystem.colors.brand.primary, borderColor: designSystem.colors.brand.primary },
  accountIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  accountInfo: { flex: 1 },
  accountBank: { fontSize: 15, fontWeight: '600', color: designSystem.colors.neutral.text },
  accountNum: { fontSize: 12, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: designSystem.colors.neutral.border, paddingHorizontal: 20, height: 56, marginTop: 8 },
  amountPrefix: { fontSize: 18, fontWeight: '600', color: designSystem.colors.neutral.textSecondary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: designSystem.colors.neutral.text },
  errorText: { fontSize: 13, color: designSystem.colors.semantic.error, textAlign: 'center', marginTop: 10 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 28, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: designSystem.colors.neutral.border },
  summaryLabel: { fontSize: 14, color: designSystem.colors.neutral.textSecondary },
  summaryValue: { fontSize: 14, color: designSystem.colors.neutral.text, fontWeight: '500' },
  pinLabel: { fontSize: 16, color: designSystem.colors.neutral.text, textAlign: 'center', marginBottom: 20 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  pinBox: { width: 44, height: 52, borderWidth: 1.5, borderColor: designSystem.colors.neutral.border, borderRadius: 16, textAlign: 'center', fontSize: 18, fontWeight: '700', color: designSystem.colors.neutral.text, backgroundColor: '#fff' },
  pinBoxFilled: { borderColor: designSystem.colors.brand.primary, backgroundColor: designSystem.colors.brand.primaryMuted },
  pinBoxError: { borderColor: designSystem.colors.semantic.error },
  footer: { padding: 24, paddingBottom: 32, gap: 10 },
  btn: { height: 56, backgroundColor: designSystem.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { fontSize: 14, color: designSystem.colors.brand.primary, fontWeight: '600' },
});
