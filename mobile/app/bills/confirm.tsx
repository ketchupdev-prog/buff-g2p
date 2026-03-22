/**
 * Bill Payment - Step 3: Confirm & PIN - Buffr G2P.
 * Final confirmation, PIN entry, and payment submission.
 * Part of 3-step bill payment wizard with ProgressIndicator.
 */
import React, { useRef, useState } from 'react';
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
import { getSecureItem } from '@/services/secureStorage';
import { useGamification } from '@/contexts/GamificationContext';
import { ProgressIndicator, ErrorState } from '@/components/ui';
import { CATEGORY_CONFIG } from '@/constants/billsConfig';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PIN_LENGTH = 6;

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function submitBillPayment(params: {
  billerId: string;
  billerName: string;
  category: string;
  accountRef: string;
  amount: number;
  walletId: string;
  pin: string;
  bundleId?: string;
}): Promise<{ success: boolean; reference?: string; token?: string; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/bills/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { reference?: string; token?: string; error?: string };
      if (res.ok) return { success: true, reference: data.reference, token: data.token };
      return { success: false, error: data.error };
    } catch {
      /* fall through */
    }
  }
  return { success: false, error: 'Unable to process payment. Please check your connection and try again.' };
}

export default function BillConfirmScreen() {
  const {
    billerId,
    billerName,
    category,
    accountRef,
    amount,
    bundleId,
    bundleLabel,
    walletId,
  } = useLocalSearchParams<{
    billerId: string;
    billerName: string;
    category: string;
    accountRef: string;
    amount: string;
    bundleId?: string;
    bundleLabel?: string;
    walletId: string;
  }>();

  const { recordEvent } = useGamification();
  const cfg = CATEGORY_CONFIG[category ?? 'other'] ?? CATEGORY_CONFIG.other;
  const parsedAmount = parseFloat(amount ?? '0');

  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  function handlePinChange(text: string, i: number) {
    const next = [...pin];
    next[i] = text;
    setPin(next);
    setPinError(null);
    if (text && i < PIN_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }

  async function handleConfirm() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) {
      setPinError('Enter your full 6-digit PIN.');
      return;
    }
    if (!walletId) return;

    setSubmitting(true);
    const res = await submitBillPayment({
      billerId: billerId ?? '',
      billerName: billerName ?? '',
      category: category ?? 'other',
      accountRef: accountRef ?? '',
      amount: parsedAmount,
      walletId: walletId,
      pin: fullPin,
      bundleId: bundleId ?? '',
    });
    setSubmitting(false);

    if (res.success) {
      recordEvent('bill_paid');
      router.replace({
        pathname: '/bills/success' as never,
        params: {
          amount: parsedAmount.toString(),
          reference: res.reference ?? '',
          billerName: billerName ?? '',
          accountRef: accountRef ?? '',
          ...(res.token ? { token: res.token } : {}),
        },
      });
    } else {
      setPinError(res.error ?? 'Payment failed. Please try again.');
      setPin(Array(PIN_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Confirm Payment',
          headerTintColor: designSystem.colors.neutral.text,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ProgressIndicator currentStep={3} totalSteps={3} stepLabels={['Details', 'Wallet', 'Confirm']} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Summary Card */}
            <View style={[styles.summaryCard, { borderColor: cfg.color }]}>
              <View style={[styles.summaryIcon, { backgroundColor: cfg.color }]}>
                <Ionicons name={cfg.icon as never} size={32} color="#fff" />
              </View>
              <Text style={styles.summaryTitle}>Payment Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biller</Text>
                <Text style={styles.summaryValue}>{billerName}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{cfg.acctLabel}</Text>
                <Text style={styles.summaryValue}>{accountRef}</Text>
              </View>

              {bundleLabel ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Package</Text>
                  <Text style={styles.summaryValue}>{bundleLabel}</Text>
                </View>
              ) : null}

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: 16 }]}>Total Amount</Text>
                <Text style={[styles.summaryValue, styles.summaryAmount]}>
                  N${parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* PIN Entry */}
            <Text style={styles.pinInstructions}>Enter your 6-digit PIN to confirm payment</Text>
            <View style={styles.pinRow}>
              {pin.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputRefs.current[i] = r)}
                  style={[styles.pinBox, digit ? styles.pinBoxFilled : null, pinError ? styles.pinBoxError : null]}
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

            {pinError && (
              <ErrorState
                variant="auth"
                message={pinError}
                onRetry={() => {
                  setPinError(null);
                  setPin(Array(PIN_LENGTH).fill(''));
                  inputRefs.current[0]?.focus();
                }}
                style={{ marginTop: 16 }}
              />
            )}

            {/* Security notice */}
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={16} color={designSystem.colors.brand.primary} />
              <Text style={styles.securityText}>Your payment is secured with end-to-end encryption</Text>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Pay button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: cfg.color }, submitting && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={submitting || pin.join('').length < PIN_LENGTH}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.payBtnText}>
                    Pay N${parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 16 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    marginBottom: 24,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DS.colors.neutral.text,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.text, textAlign: 'right', maxWidth: '55%' },
  summaryAmount: { fontSize: 24, fontWeight: '800', color: DS.colors.brand.primary },
  summaryDivider: { height: 1, backgroundColor: DS.colors.neutral.border, width: '100%', marginVertical: 8 },
  pinInstructions: {
    fontSize: 14,
    color: DS.colors.neutral.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  pinBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
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
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 12,
    backgroundColor: DS.colors.brand.primaryMuted,
    borderRadius: 12,
  },
  securityText: { fontSize: 12, color: DS.colors.brand.primary, fontWeight: '600' },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: DS.colors.neutral.border,
    backgroundColor: '#fff',
  },
  payBtn: { height: 56, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
});
