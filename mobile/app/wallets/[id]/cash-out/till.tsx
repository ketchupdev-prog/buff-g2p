/**
 * Cash Out – Cash at Till – Buffr G2P.
 * Scan till QR or generate a cash code. Fee: Free. Instant.
 * §3.3 screen 19. Audit F9 (header), F11 (balance).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getWallet } from '@/services/wallets';

const STEPS = [
  { icon: 'cash-outline' as const, label: 'Enter the amount you want to withdraw' },
  { icon: 'qr-code-outline' as const, label: "Point your camera at the till's QR code" },
  { icon: 'checkmark-circle-outline' as const, label: 'Collect your cash from the cashier' },
];

export default function CashOutTillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWallet(id ?? '').then(w => setBalance(w?.balance ?? null)).catch(() => {});
  }, [id]);

  // D5: Clear error when screen gains focus (e.g. user navigated back) so no stale error.
  useFocusEffect(useCallback(() => {
    setError(null);
  }, []));

  function isAmountValid(): boolean {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 10 || num > 5000) return false;
    if (balance !== null && num > balance) return false;
    return true;
  }

  function validate(): number | null {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError('Enter a valid amount.'); return null; }
    if (num < 10) { setError('Minimum amount is N$10.'); return null; }
    if (num > 5000) { setError('Maximum amount is N$5,000.'); return null; }
    if (balance !== null && num > balance) {
      setError(`Insufficient funds. Available: N$${balance.toFixed(2)}`);
      return null;
    }
    setError(null);
    return num;
  }

  function handleScanQR() {
    const num = validate();
    if (!num) return;
    router.push({ pathname: '/scan-qr', params: { mode: 'cashout', method: 'till', walletId: id ?? '', amount: num.toFixed(2) } });
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Cash at Till', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: designSystem.colors.neutral.surface } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.feeBadge}>
              <Ionicons name="gift-outline" size={16} color="#15803D" />
              <Text style={styles.feeText}>Free · No charges · Instant</Text>
            </View>

            {balance !== null && (
              <View style={styles.balanceBadge}>
                <Text style={styles.balanceLabel}>Available</Text>
                <Text style={styles.balanceValue}>N${balance.toFixed(2)}</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Amount to withdraw</Text>
            <View style={styles.amountWrap}>
              <Text style={styles.amountPrefix}>N$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                value={amount}
                onChangeText={t => {
                  const cleaned = t.replace(/[^0-9.]/g, '');
                  const match = /^(\d*\.?\d{0,2})/.exec(cleaned);
                  setAmount(match ? match[1] : '');
                  setError(null);
                }}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <Text style={styles.limitHint}>Min N$10 · Max N$5,000</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>How it works</Text>
              {STEPS.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <Ionicons name={s.icon} size={18} color={designSystem.colors.brand.primary} style={{ marginTop: 1 }} />
                  <Text style={styles.stepText}>{s.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, (!amount || !isAmountValid()) && styles.btnDisabled]}
              onPress={handleScanQR}
              disabled={!amount || !isAmountValid()}
              activeOpacity={0.9}
            >
              <Ionicons name="qr-code-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Scan Till QR</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  balanceLabel: { fontSize: 13, color: designSystem.colors.neutral.textSecondary },
  balanceValue: { fontSize: 16, fontWeight: '700', color: designSystem.colors.neutral.text },
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 24, paddingBottom: 8 },
  feeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 12, padding: 12, marginBottom: 24 },
  feeText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: designSystem.colors.neutral.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: designSystem.colors.neutral.border, paddingHorizontal: 20, height: 56 },
  amountPrefix: { fontSize: 18, fontWeight: '600', color: designSystem.colors.neutral.textSecondary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: designSystem.colors.neutral.text },
  limitHint: { fontSize: 12, color: designSystem.colors.neutral.textTertiary, marginTop: 6, marginLeft: 4 },
  errorText: { fontSize: 13, color: designSystem.colors.semantic.error, marginTop: 8 },
  stepsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 24, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: designSystem.colors.neutral.text, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 11, fontWeight: '700', color: designSystem.colors.brand.primary },
  stepText: { flex: 1, fontSize: 13, color: designSystem.colors.neutral.textSecondary, lineHeight: 18 },
  footer: { padding: 24, paddingBottom: 32, gap: 12 },
  btn: { height: 56, backgroundColor: designSystem.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
