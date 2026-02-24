/**
 * Cash Out – Cash at ATM – Buffr G2P.
 * Cardless ATM withdrawal with a one-time code. Fee: N$8. Instant.
 * §3.3 screen 22.
 */
import React, { useEffect, useRef, useState } from 'react';
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
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getWallet } from '@/services/wallets';

const EXPIRE_SECS = 10 * 60; // 10 minutes

function generateATMCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatExpiry(secs: number): string {
  const now = new Date();
  now.setSeconds(now.getSeconds() + secs);
  return now.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' });
}

export default function CashOutAtmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [atmCode, setAtmCode] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [countdown, setCountdown] = useState(EXPIRE_SECS);
  const [showCode, setShowCode] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { getWallet(id ?? '').then(w => setBalance(w?.balance ?? null)).catch(() => {}); }, [id]);

  useEffect(() => {
    if (showCode) {
      setCountdown(EXPIRE_SECS);
      setExpiryTime(formatExpiry(EXPIRE_SECS));
      timerRef.current = setInterval(() => {
        setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current!); return 0; } return c - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [showCode]);

  function handleGetCode() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError('Enter a valid amount.'); return; }
    if (num < 50) { setError('Minimum ATM withdrawal is N$50.'); return; }
    if (num > 3000) { setError('Maximum ATM withdrawal is N$3,000.'); return; }
    if (num % 10 !== 0) { setError('Amount must be a multiple of N$10 (e.g. N$100, N$200).'); return; }
    if (balance !== null && (num + 8) > balance) { setError(`Insufficient balance. You need N$ ${(num + 8).toFixed(2)} (including N$8 fee).`); return; }
    setError(null);
    setAtmCode(generateATMCode());
    setShowCode(true);
  }

  function handleReset() {
    setShowCode(false);
    setAtmCode('');
    setAmount('');
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Cash at ATM', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {!showCode ? (
            <>
              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.feeBadge}>
                  <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
                  <Text style={styles.feeText}>N$8 fee · Instant · Cardless withdrawal</Text>
                </View>

                {balance !== null && (
                  <View style={styles.balanceBadge}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceValue}>N$ {balance.toFixed(2)}</Text>
                  </View>
                )}

                <Text style={styles.sectionLabel}>Withdrawal Amount</Text>
                <View style={styles.amountWrap}>
                  <Text style={styles.amountPrefix}>N$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor={designSystem.colors.neutral.textTertiary}
                    value={amount}
                    onChangeText={t => { setAmount(t.replace(/[^0-9]/g, '')); setError(null); }}
                    keyboardType="number-pad"
                    autoFocus
                  />
                </View>
                <Text style={styles.limitHint}>Multiples of N$10 · Min N$50 · Max N$3,000</Text>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Quick amounts */}
                <View style={styles.quickRow}>
                  {[100, 200, 500, 1000].map(v => (
                    <TouchableOpacity key={v} style={[styles.quickChip, amount === String(v) && styles.quickChipActive]} onPress={() => { setAmount(String(v)); setError(null); }}>
                      <Text style={[styles.quickChipText, amount === String(v) && styles.quickChipTextActive]}>N${v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.stepsCard}>
                  <Text style={styles.stepsTitle}>How it works</Text>
                  {[
                    'Enter the amount and tap "Get ATM Code"',
                    'Go to any Buffr-enabled ATM',
                    'Select "Cardless Withdrawal" on the ATM',
                    'Enter the 6-digit code displayed here',
                    'Collect your cash',
                  ].map((s, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                      <Text style={styles.stepText}>{s}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.findAtmBtn} onPress={() => router.push('/(tabs)/home/agents' as never)}>
                  <Ionicons name="location-outline" size={16} color={designSystem.colors.brand.primary} />
                  <Text style={styles.findAtmText}>Find nearest Buffr-enabled ATM</Text>
                  <Ionicons name="chevron-forward" size={14} color={designSystem.colors.brand.primary} />
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity style={[styles.btn, !amount && styles.btnDisabled]} onPress={handleGetCode} disabled={!amount}>
                  <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Get ATM Code</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              {/* ATM Code Card */}
              <View style={styles.codeCard}>
                <Text style={styles.codeCardLabel}>Your ATM Code</Text>
                <Text style={styles.codeCardValue}>{atmCode}</Text>
                <Text style={styles.codeCardAmount}>N$ {parseFloat(amount).toFixed(2)}</Text>
                <View style={styles.timerRow}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.timerText}>
                    {countdown > 0 ? `${formatCountdown(countdown)} remaining · Expires at ${expiryTime}` : 'Code Expired'}
                  </Text>
                </View>
              </View>

              {countdown === 0 ? (
                <View style={styles.expiredCard}>
                  <Ionicons name="hourglass-outline" size={32} color="#E11D48" />
                  <Text style={styles.expiredTitle}>Code Expired</Text>
                  <Text style={styles.expiredSub}>Your ATM code has expired. Generate a new one.</Text>
                  <TouchableOpacity style={styles.btn} onPress={handleReset}>
                    <Text style={styles.btnText}>Generate New Code</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.instructCard}>
                  <Text style={styles.instructTitle}>At the ATM</Text>
                  {[
                    'Go to any Buffr-enabled ATM near you',
                    'Select "Cardless Withdrawal" or "QR Withdrawal"',
                    `Enter code: ${atmCode}`,
                    'Collect your N$ ' + parseFloat(amount).toFixed(2) + ' cash',
                  ].map((s, i) => (
                    <View key={i} style={styles.instructRow}>
                      <View style={styles.instructNum}><Text style={styles.instructNumText}>{i + 1}</Text></View>
                      <Text style={styles.instructText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.findAtmBtn} onPress={() => router.push('/(tabs)/home/agents' as never)}>
                <Ionicons name="location-outline" size={16} color={designSystem.colors.brand.primary} />
                <Text style={styles.findAtmText}>Find nearest ATM</Text>
                <Ionicons name="chevron-forward" size={14} color={designSystem.colors.brand.primary} />
              </TouchableOpacity>

              <View style={{ height: 24 }} />
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)' as never)}>
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
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', color: DS.colors.neutral.text },
  limitHint: { fontSize: 12, color: DS.colors.neutral.textTertiary, marginTop: 6, marginLeft: 4 },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 8 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 4 },
  quickChip: { flex: 1, height: 40, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  quickChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  quickChipText: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  quickChipTextActive: { color: '#fff' },
  stepsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 20, borderWidth: 1, borderColor: DS.colors.neutral.border },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 11, fontWeight: '700', color: DS.colors.brand.primary },
  stepText: { flex: 1, fontSize: 13, color: DS.colors.neutral.textSecondary, lineHeight: 18 },
  findAtmBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: DS.colors.brand.primaryMuted, borderRadius: 12, padding: 14, marginTop: 16 },
  findAtmText: { flex: 1, fontSize: 14, fontWeight: '600', color: DS.colors.brand.primary },
  footer: { padding: 24, paddingBottom: 32 },
  btn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  codeCard: { backgroundColor: DS.colors.brand.primary, borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16 },
  codeCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  codeCardValue: { fontSize: 52, fontWeight: '800', color: '#fff', letterSpacing: 10, marginBottom: 8 },
  codeCardAmount: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 12 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  timerText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  instructCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: DS.colors.neutral.border },
  instructTitle: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 14 },
  instructRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  instructNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  instructNumText: { fontSize: 12, fontWeight: '700', color: DS.colors.brand.primary },
  instructText: { fontSize: 13, color: DS.colors.neutral.textSecondary, flex: 1 },
  expiredCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  expiredTitle: { fontSize: 18, fontWeight: '700', color: '#E11D48', marginTop: 12, marginBottom: 6 },
  expiredSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 20 },
  doneBtn: { height: 56, borderWidth: 1.5, borderColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: DS.colors.brand.primary },
});
