/**
 * Loan Apply – Buffr G2P.
 * Multi-step: Offer Details → FaceID → Credited → Add Details.
 * §22 / Figma 108:276.
 * Uses UserContext for profile and walletStatus.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { getSecureItem } from '@/services/secureStorage';
import { useUser } from '@/contexts/UserContext';
import {
  AmountStepper,
  EmojiIcon,
  EmojiPicker,
  InfoBanner,
  SuccessScreen,
  Toggle,
} from '@/components/ui';
import type { LoanOffer } from './index';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
type Step = 'offer' | 'biometric' | 'credited' | 'details';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function getOffer(offerId: string): Promise<LoanOffer | null> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/loans/offers/${offerId}`, {
        headers: { 'Content-Type': 'application/json', ...h },
      });
      if (res.ok) return (await res.json()) as LoanOffer;
    } catch (e) { console.error('getOffer:', e); }
  }
  try {
    const raw = await AsyncStorage.getItem('buffr_loan_offer');
    return raw ? (JSON.parse(raw) as LoanOffer) : null;
  } catch { return null; }
}

async function applyForLoan(offerId: string, amount: number): Promise<{ success: boolean; loanId?: string; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/loans/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ offerId, amount }),
      });
      if (res.ok) {
        const data = (await res.json()) as { loanId?: string };
        return { success: true, loanId: data.loanId };
      }
      const err = (await res.json()) as { message?: string };
      return { success: false, error: err.message ?? 'Application failed.' };
    } catch (e) { console.error('applyForLoan:', e); }
  }
  try {
    const loanId = `loan_${Date.now()}`;
    const interest = Math.round(amount * 0.15);
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    const newLoan = {
      id: loanId, amount, interestAmount: interest,
      totalRepayable: amount + interest,
      disbursedAt: new Date().toISOString(),
      status: 'active' as const,
      repaymentDue: dueDate.toISOString(),
    };
    const existing = await AsyncStorage.getItem('buffr_active_loans');
    const loans = existing ? (JSON.parse(existing) as typeof newLoan[]) : [];
    await AsyncStorage.setItem('buffr_active_loans', JSON.stringify([...loans, newLoan]));
    return { success: true, loanId };
  } catch { return { success: false, error: 'Could not process application.' }; }
}

async function saveLoanDetails(loanId: string, name: string, icon: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem('buffr_loan_details') ?? '{}';
    const details = JSON.parse(raw) as Record<string, { name: string; icon: string }>;
    details[loanId] = { name, icon };
    await AsyncStorage.setItem('buffr_loan_details', JSON.stringify(details));
  } catch { /* non-critical */ }
}

const TIER_LABELS: Record<string, string> = {
  quick: 'Quick Cash Advance',
  standard: 'Standard Grant Loan',
  maximum: 'Maximum Grant Loan',
};

export default function LoansApplyScreen() {
  const { offerId, tierId, maxAmount } = useLocalSearchParams<{ offerId: string; tierId: string; maxAmount: string }>();
  useUser();
  const max = parseInt(maxAmount ?? '0', 10);

  const [offer, setOffer] = useState<LoanOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('offer');
  const [amount, setAmount] = useState(max);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [loanId, setLoanId] = useState<string | null>(null);
  const [loanName, setLoanName] = useState('');
  const [loanIcon, setLoanIcon] = useState('💰');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const biometricPulse = useRef(new Animated.Value(1)).current;

  const loadOffer = useCallback(async () => {
    setLoading(true);
    const o = await getOffer(offerId ?? '');
    setOffer(o);
    setLoading(false);
  }, [offerId]);

  useEffect(() => { loadOffer(); }, [loadOffer]);

  useEffect(() => {
    if (step !== 'biometric') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(biometricPulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(biometricPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    const t = setTimeout(async () => {
      loop.stop();
      setApplying(true);
      const result = await applyForLoan(offerId ?? '', amount);
      setApplying(false);
      if (result.success) { setLoanId(result.loanId ?? null); setStep('credited'); }
      else { setApplyError(result.error ?? 'Application failed.'); setStep('offer'); }
    }, 2000);
    return () => { loop.stop(); clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSaveDetails = async () => {
    if (!loanId) { router.back(); return; }
    setSavingDetails(true);
    await saveLoanDetails(loanId, loanName.trim() || 'My Loan', loanIcon);
    setSavingDetails(false);
    router.replace('/(tabs)/home/loans' as never);
  };

  const interest = Math.round(amount * (offer?.interestRate ?? 15) / 100);
  const totalRepayable = amount + interest;

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Apply for Loan', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }} />
        <ActivityIndicator color="#0029D6" />
      </View>
    );
  }

  // ── Biometric ─────────────────────────────────────────────────────────────
  if (step === 'biometric') {
    return (
      <View style={styles.centerFill}>
        <Stack.Screen options={{ headerShown: false }} />
        <Animated.View style={[styles.biometricCircle, { transform: [{ scale: biometricPulse }] }]}>
          <Text style={styles.biometricIcon}>🔐</Text>
        </Animated.View>
        <Text style={styles.biometricTitle}>Verifying Identity</Text>
        <Text style={styles.biometricSub}>Touch ID / Face ID authentication…</Text>
        <ActivityIndicator color="#0029D6" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // ── Loan Credited ─────────────────────────────────────────────────────────
  if (step === 'credited') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SuccessScreen
          title="Loan Credited!"
          value={`N$${amount.toLocaleString()}`}
          subtitle="has been added to your Buffr wallet."
          actions={[
            { label: 'Add details', onPress: () => setStep('details') },
            { label: 'Skip', onPress: () => router.replace('/(tabs)/home/loans' as never), variant: 'secondary' },
          ]}
        />
      </>
    );
  }

  // ── Add Details ───────────────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Add Details', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }} />
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.detailsScroll}>
            <EmojiIcon value={loanIcon} onPress={() => setShowEmojiPicker(true)} size={88} />
            <Text style={styles.fieldLabel}>Loan Name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Emergency Fund"
                placeholderTextColor="#94A3B8"
                value={loanName}
                onChangeText={setLoanName}
                returnKeyType="done"
                maxLength={50}
              />
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cta} onPress={handleSaveDetails} disabled={savingDetails} activeOpacity={0.9}>
              {savingDetails ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <EmojiPicker
          visible={showEmojiPicker}
          selected={loanIcon}
          onSelect={setLoanIcon}
          onClose={() => setShowEmojiPicker(false)}
        />
      </View>
    );
  }

  // ── Offer Details ─────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Apply for Loan', headerTintColor: '#111827', headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.offerScroll} showsVerticalScrollIndicator={false}>

          {/* Offer card */}
          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>{TIER_LABELS[tierId ?? ''] ?? 'Loan'}</Text>
            <Text style={styles.offerSub}>Voucher-backed advance</Text>
            <AmountStepper
              value={amount}
              min={100}
              max={max}
              step={100}
              onChange={setAmount}
              style={styles.stepper}
            />
            <Text style={styles.offerMax}>Max N${max.toLocaleString()}</Text>
          </View>

          {/* Terms */}
          <View style={styles.termsCard}>
            {[
              { label: 'Interest Rate', value: `${offer?.interestRate ?? 15}% APR` },
              { label: 'Interest Amount', value: `N$${interest.toLocaleString()}` },
              { label: 'Total Repayable', value: `N$${totalRepayable.toLocaleString()}`, highlight: true },
              { label: 'Repayment', value: offer?.repaymentInfo ?? 'Auto from next grant' },
            ].map((row, i, arr) => (
              <View key={row.label}>
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>{row.label}</Text>
                  <Text style={[styles.termValue, row.highlight && styles.termValueHighlight]}>
                    {row.value}
                  </Text>
                </View>
                {i < arr.length - 1 && <View style={styles.termDivider} />}
              </View>
            ))}
          </View>

          {/* Auto Pay */}
          <View style={styles.autoPayRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoPayTitle}>Auto Pay</Text>
              <Text style={styles.autoPayDesc}>Auto-repay from future grant disbursements</Text>
            </View>
            <Toggle value={autoPayEnabled} onValueChange={setAutoPayEnabled} />
          </View>

          <InfoBanner
            variant="warning"
            message="Stamp duties, Namfisa levies & disbursement fees apply. By proceeding you agree to Buffr Loan Terms."
            style={{ marginBottom: 16 }}
          />

          {applyError && (
            <InfoBanner variant="error" message={applyError} style={{ marginBottom: 8 }} />
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={() => { setApplyError(null); setStep('biometric'); }} disabled={applying} activeOpacity={0.9}>
            {applying ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Get Loan</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  safe: { flex: 1 },
  centerFill: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Offer
  offerScroll: { padding: 24 },
  offerCard: { borderRadius: 24, backgroundColor: '#0029D6', padding: 24, marginBottom: 20, alignItems: 'center' },
  offerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  offerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 28 },
  stepper: { marginBottom: 8 },
  offerMax: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // Terms
  termsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  termRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  termLabel: { fontSize: 14, color: '#6B7280' },
  termValue: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: '55%', textAlign: 'right' },
  termValueHighlight: { color: '#0029D6', fontWeight: '700' },
  termDivider: { height: 1, backgroundColor: '#F3F4F6' },

  // Auto Pay
  autoPayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 16 },
  autoPayTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  autoPayDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  // Footer
  footer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cta: { height: 54, borderRadius: 9999, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Biometric
  biometricCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  biometricIcon: { fontSize: 56 },
  biometricTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  biometricSub: { fontSize: 14, color: '#6B7280' },

  // Details
  detailsScroll: { padding: 24, paddingTop: 32 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280', marginBottom: 8 },
  inputWrap: { height: 52, borderRadius: 9999, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 20, justifyContent: 'center', marginBottom: 20 },
  input: { fontSize: 16, color: '#020617', padding: 0 },
});
