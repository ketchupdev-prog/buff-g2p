/**
 * Cash Out - Buffr G2P.
 * Multi-step flow: Select Wallet → Enter Amount → Select Method → Confirm → Success
 * §3.4 Cash-out at agent or bank transfer
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
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
import { useUser } from '@/contexts/UserContext';
import { getWallets, type Wallet } from '@/services/wallets';
import { getSecureItem } from '@/services/secureStorage';
import { ProgressIndicator, ErrorState, SuccessScreen } from '@/components/ui';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PIN_LENGTH = 6;

type CashOutStep = 'wallet' | 'amount' | 'method' | 'confirm' | 'success';
type CashOutMethod = 'agent' | 'bank';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function submitCashOut(params: {
  walletId: string;
  amount: number;
  method: CashOutMethod;
  pin: string;
  bankAccountId?: string;
}): Promise<{ success: boolean; reference?: string; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/wallets/${params.walletId}/cash-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { reference?: string; error?: string };
      if (res.ok) return { success: true, reference: data.reference };
      return { success: false, error: data.error };
    } catch { /* fall through */ }
  }
  return { success: false, error: 'Unable to process cash-out. Please check your connection and try again.' };
}

const DS = designSystem;

export default function CashOutScreen() {
  const { walletId: initialWalletId } = useLocalSearchParams<{ walletId?: string }>();
  const { profile } = useUser();

  const [step, setStep] = useState<CashOutStep>(initialWalletId ? 'amount' : 'wallet');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(initialWalletId ?? null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<CashOutMethod | null>(null);
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const loadWallets = useCallback(async () => {
    setLoading(true);
    try {
      const ws = await getWallets();
      setWallets(ws);
      if (!initialWalletId && ws.length > 0) {
        const primary = ws.find(w => w.isPrimary) ?? ws[0];
        setSelectedWalletId(primary.id);
      }
    } catch {
      setError('Could not load wallets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [initialWalletId]);

  useEffect(() => { loadWallets(); }, [loadWallets]);

  useEffect(() => {
    if (step !== 'confirm') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [step, pulseAnim]);

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const parsedAmount = parseFloat(amount) || 0;
  const hasFunds = selectedWallet ? selectedWallet.balance >= parsedAmount : false;

  const getStepIndex = (): number => {
    const steps: CashOutStep[] = ['wallet', 'amount', 'method', 'confirm', 'success'];
    return steps.indexOf(step) + 1;
  };

  function handlePinChange(text: string, i: number) {
    const next = [...pin];
    next[i] = text;
    setPin(next);
    if (text && i < PIN_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }

  async function handleConfirm() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) {
      setError('Enter your full 6-digit PIN.');
      return;
    }
    if (!selectedWalletId || !method) return;

    setSubmitting(true);
    setError(null);
    const res = await submitCashOut({
      walletId: selectedWalletId,
      amount: parsedAmount,
      method,
      pin: fullPin,
    });
    setSubmitting(false);

    if (res.success) {
      setReference(res.reference ?? '');
      setStep('success');
    } else {
      setError(res.error ?? 'Cash-out failed. Please try again.');
      setPin(Array(PIN_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }

  const stepLabels = initialWalletId
    ? ['Amount', 'Method', 'Confirm', 'Success']
    : ['Wallet', 'Amount', 'Method', 'Confirm', 'Success'];

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SuccessScreen
          title="Cash-Out Requested!"
          value={`N$${parsedAmount.toLocaleString()}`}
          subtitle={method === 'agent' ? 'Visit a Buffr Agent to collect cash. Show this reference:' : 'Funds will arrive in your bank account within 1-2 business days.'}
          actions={[
            {
              label: 'View Transaction',
              onPress: () => router.replace('/(tabs)/transactions' as never),
            },
            {
              label: 'Done',
              onPress: () => router.replace('/(tabs)/home' as never),
              variant: 'secondary',
            },
          ]}
        >
          {reference && (
            <View style={styles.referenceCard}>
              <Text style={styles.referenceLabel}>REFERENCE</Text>
              <Text style={styles.referenceValue}>{reference}</Text>
            </View>
          )}
        </SuccessScreen>
      </>
    );
  }

  // ── Main Flow ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Cash Out',
          headerTintColor: DS.colors.neutral.text,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ProgressIndicator
          currentStep={getStepIndex()}
          totalSteps={stepLabels.length}
          stepLabels={stepLabels}
        />

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {loading ? (
              <ActivityIndicator color={DS.colors.brand.primary} style={{ marginTop: 60 }} />
            ) : error && wallets.length === 0 ? (
              <ErrorState variant="network" message={error} onRetry={loadWallets} />
            ) : (
              <>
                {/* ── Step 1: Select Wallet ────────────────────────────────── */}
                {step === 'wallet' && (
                  <>
                    <Text style={styles.stepTitle}>Select wallet to cash out from</Text>
                    {wallets.map((w) => (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.walletCard, selectedWalletId === w.id && styles.walletCardActive]}
                        onPress={() => setSelectedWalletId(w.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.walletIcon}>
                          <Ionicons name="wallet-outline" size={20} color={DS.colors.brand.primary} />
                        </View>
                        <View style={styles.walletInfo}>
                          <Text style={styles.walletName}>{w.name}</Text>
                          <Text style={styles.walletBalance}>
                            N${w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                        {selectedWalletId === w.id && (
                          <Ionicons name="checkmark-circle" size={24} color={DS.colors.brand.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* ── Step 2: Enter Amount ─────────────────────────────────── */}
                {step === 'amount' && (
                  <>
                    <Text style={styles.stepTitle}>How much would you like to cash out?</Text>
                    {selectedWallet && (
                      <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>{selectedWallet.name} Balance</Text>
                        <Text style={styles.balanceValue}>
                          N${selectedWallet.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.amountWrap, error && { borderColor: DS.colors.semantic.error }]}>
                      <Text style={styles.amountPrefix}>N$</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="0.00"
                        placeholderTextColor={DS.colors.neutral.textTertiary}
                        value={amount}
                        onChangeText={(t) => {
                          setAmount(t.replace(/[^0-9.]/g, ''));
                          setError(null);
                        }}
                        keyboardType="decimal-pad"
                        autoFocus
                      />
                    </View>
                    {!hasFunds && parsedAmount > 0 && (
                      <Text style={styles.errorText}>Insufficient balance in selected wallet.</Text>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                      {[100, 200, 500, 1000, 2000].map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[styles.quickChip, amount === String(v) && styles.quickChipActive]}
                          onPress={() => {
                            setAmount(String(v));
                            setError(null);
                          }}
                        >
                          <Text style={[styles.quickChipText, amount === String(v) && styles.quickChipTextActive]}>
                            N${v}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {/* ── Step 3: Select Method ────────────────────────────────── */}
                {step === 'method' && (
                  <>
                    <Text style={styles.stepTitle}>How would you like to receive cash?</Text>
                    <TouchableOpacity
                      style={[styles.methodCard, method === 'agent' && styles.methodCardActive]}
                      onPress={() => {
                        setMethod('agent');
                        setError(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.methodIconWrap}>
                        <Ionicons name="storefront-outline" size={28} color={DS.colors.brand.primary} />
                      </View>
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodTitle}>Buffr Agent</Text>
                        <Text style={styles.methodDesc}>
                          Collect cash at any Buffr Agent location. Instant withdrawal.
                        </Text>
                      </View>
                      {method === 'agent' && (
                        <Ionicons name="checkmark-circle" size={24} color={DS.colors.brand.primary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.methodCard, method === 'bank' && styles.methodCardActive]}
                      onPress={() => {
                        setMethod('bank');
                        setError(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.methodIconWrap}>
                        <Ionicons name="business-outline" size={28} color={DS.colors.brand.primary} />
                      </View>
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodTitle}>Bank Transfer</Text>
                        <Text style={styles.methodDesc}>
                          Transfer to your linked bank account. Takes 1-2 business days.
                        </Text>
                      </View>
                      {method === 'bank' && (
                        <Ionicons name="checkmark-circle" size={24} color={DS.colors.brand.primary} />
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {/* ── Step 4: Confirm with PIN ─────────────────────────────── */}
                {step === 'confirm' && (
                  <>
                    <Animated.View style={[styles.confirmIconWrap, { transform: [{ scale: pulseAnim }] }]}>
                      <Ionicons name="cash-outline" size={48} color={DS.colors.semantic.success} />
                    </Animated.View>
                    <Text style={styles.confirmTitle}>Confirm Cash-Out</Text>
                    <View style={styles.confirmDetails}>
                      <View style={styles.confirmRow}>
                        <Text style={styles.confirmLabel}>Amount</Text>
                        <Text style={styles.confirmValue}>N${parsedAmount.toLocaleString()}</Text>
                      </View>
                      <View style={styles.confirmRow}>
                        <Text style={styles.confirmLabel}>Method</Text>
                        <Text style={styles.confirmValue}>{method === 'agent' ? 'Buffr Agent' : 'Bank Transfer'}</Text>
                      </View>
                      <View style={styles.confirmRow}>
                        <Text style={styles.confirmLabel}>From</Text>
                        <Text style={styles.confirmValue}>{selectedWallet?.name}</Text>
                      </View>
                    </View>
                    <Text style={styles.pinTitle}>Enter your PIN to confirm</Text>
                    <View style={styles.pinRow}>
                      {pin.map((digit, i) => (
                        <TextInput
                          key={i}
                          ref={(r) => (inputRefs.current[i] = r)}
                          style={[styles.pinBox, digit ? styles.pinBoxFilled : null, error ? styles.pinBoxError : null]}
                          value={digit}
                          onChangeText={(t) => handlePinChange(t, i)}
                          onKeyPress={(e) => {
                            if (e.nativeEvent.key === 'Backspace' && !pin[i] && i > 0) {
                              inputRefs.current[i - 1]?.focus();
                            }
                          }}
                          keyboardType="number-pad"
                          maxLength={1}
                          secureTextEntry
                          caretHidden
                          autoFocus={i === 0}
                        />
                      ))}
                    </View>
                    {error && <ErrorState variant="default" message={error} style={{ marginTop: 16 }} />}
                  </>
                )}
              </>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* ── Footer CTA ─────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            {step === 'wallet' && (
              <TouchableOpacity
                style={[styles.cta, !selectedWalletId && styles.ctaDisabled]}
                onPress={() => setStep('amount')}
                disabled={!selectedWalletId}
                activeOpacity={0.9}
              >
                <Text style={styles.ctaText}>Continue</Text>
              </TouchableOpacity>
            )}
            {step === 'amount' && (
              <TouchableOpacity
                style={[styles.cta, (!parsedAmount || !hasFunds) && styles.ctaDisabled]}
                onPress={() => {
                  Keyboard.dismiss();
                  if (parsedAmount <= 0) {
                    setError('Enter a valid amount.');
                    return;
                  }
                  if (!hasFunds) {
                    setError('Insufficient balance.');
                    return;
                  }
                  setError(null);
                  setStep('method');
                }}
                disabled={!parsedAmount || !hasFunds}
                activeOpacity={0.9}
              >
                <Text style={styles.ctaText}>
                  {parsedAmount > 0 ? `Cash Out N$${parsedAmount.toLocaleString()}` : 'Enter Amount'}
                </Text>
              </TouchableOpacity>
            )}
            {step === 'method' && (
              <TouchableOpacity
                style={[styles.cta, !method && styles.ctaDisabled]}
                onPress={() => {
                  setError(null);
                  setStep('confirm');
                }}
                disabled={!method}
                activeOpacity={0.9}
              >
                <Text style={styles.ctaText}>Continue</Text>
              </TouchableOpacity>
            )}
            {step === 'confirm' && (
              <TouchableOpacity
                style={[styles.cta, submitting && styles.ctaDisabled]}
                onPress={handleConfirm}
                disabled={submitting}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Confirm Cash-Out</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 16 },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.colors.neutral.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  // Wallet selection
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: DS.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  walletCardActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  walletInfo: { flex: 1 },
  walletName: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text },
  walletBalance: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  // Amount
  balanceCard: {
    backgroundColor: DS.colors.brand.primaryMuted,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginBottom: 4 },
  balanceValue: { fontSize: 24, fontWeight: '700', color: DS.colors.brand.primary },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: DS.colors.neutral.border,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  amountPrefix: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '700', color: DS.colors.neutral.text, padding: 0 },
  quickRow: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  quickChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: DS.colors.neutral.border,
    backgroundColor: '#fff',
  },
  quickChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  quickChipText: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.textSecondary },
  quickChipTextActive: { color: '#fff' },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 4, marginBottom: 8 },
  // Method
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: DS.colors.neutral.border,
    padding: 18,
    marginBottom: 16,
  },
  methodCardActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  methodIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: DS.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodInfo: { flex: 1 },
  methodTitle: { fontSize: 17, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 4 },
  methodDesc: { fontSize: 13, color: DS.colors.neutral.textSecondary, lineHeight: 18 },
  // Confirm
  confirmIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: DS.colors.neutral.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmDetails: {
    backgroundColor: DS.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    padding: 18,
    marginBottom: 28,
  },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  confirmLabel: { fontSize: 14, color: DS.colors.neutral.textSecondary },
  confirmValue: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text },
  pinTitle: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 16 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  pinBox: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: DS.colors.neutral.border,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: DS.colors.neutral.text,
    backgroundColor: DS.colors.neutral.background,
  },
  pinBoxFilled: { borderColor: DS.colors.brand.primary, backgroundColor: '#fff' },
  pinBoxError: { borderColor: DS.colors.semantic.error },
  // Success
  referenceCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  referenceLabel: { fontSize: 10, fontWeight: '800', color: '#92400E', letterSpacing: 1.5, marginBottom: 12 },
  referenceValue: { fontSize: 24, fontWeight: '800', color: '#92400E', letterSpacing: 2 },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: DS.colors.neutral.border,
  },
  cta: {
    height: 54,
    borderRadius: 9999,
    backgroundColor: DS.colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  ctaDisabled: { opacity: 0.4 },
});
