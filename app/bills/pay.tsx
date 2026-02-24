/**
 * Bill Payment – Buffr G2P.
 * Universal payment screen for all bill types:
 * electricity, water, airtime/data, TV, internet, insurance, tickets, other.
 * §3.4 bill payment flow.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { getSecureItem } from '@/services/secureStorage';
import { designSystem } from '@/constants/designSystem';
import { getWallets, type Wallet } from '@/services/wallets';
import { useUser } from '@/contexts/UserContext';
import { useGamification } from '@/contexts/GamificationContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const PIN_LENGTH = 6;

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
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
    } catch { /* fall through */ }
  }
  return { success: false, error: 'Unable to process payment. Please check your connection and try again.' };
}

// ─── Category config ────────────────────────────────────────────────────────

interface CategoryConfig {
  icon: string;
  color: string;
  acctLabel: string;
  acctPlaceholder: string;
  acctKeyboard: 'default' | 'phone-pad' | 'number-pad';
  hasToken: boolean; // electricity prepaid token
  hasPackages: boolean; // TV subscriptions, data bundles
  quickAmounts?: number[];
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  electricity: {
    icon: 'flash-outline', color: '#F59E0B',
    acctLabel: 'Meter Number', acctPlaceholder: 'e.g. 12345678',
    acctKeyboard: 'number-pad', hasToken: true, hasPackages: false,
    quickAmounts: [100, 200, 500, 1000, 2000],
  },
  water: {
    icon: 'water-outline', color: '#06B6D4',
    acctLabel: 'Account Number', acctPlaceholder: 'e.g. WDH-123456',
    acctKeyboard: 'default', hasToken: false, hasPackages: false,
    quickAmounts: [100, 200, 500],
  },
  airtime: {
    icon: 'phone-portrait-outline', color: '#0029D6',
    acctLabel: 'Mobile Number', acctPlaceholder: '+264 81 xxx xxxx',
    acctKeyboard: 'phone-pad', hasToken: false, hasPackages: true,
  },
  tv: {
    icon: 'tv-outline', color: '#7C3AED',
    acctLabel: 'Smart Card / IUC Number', acctPlaceholder: 'e.g. 1234567890',
    acctKeyboard: 'number-pad', hasToken: false, hasPackages: true,
  },
  internet: {
    icon: 'wifi-outline', color: '#10B981',
    acctLabel: 'Account Number', acctPlaceholder: 'e.g. TN-123456',
    acctKeyboard: 'default', hasToken: false, hasPackages: false,
    quickAmounts: [199, 299, 499, 999],
  },
  insurance: {
    icon: 'shield-outline', color: '#E11D48',
    acctLabel: 'Policy Number', acctPlaceholder: 'e.g. POL-123456',
    acctKeyboard: 'default', hasToken: false, hasPackages: false,
    quickAmounts: [250, 500, 1000, 1500],
  },
  tickets: {
    icon: 'ticket-outline', color: '#D97706',
    acctLabel: 'Booking Reference', acctPlaceholder: 'e.g. TKT-ABCD123',
    acctKeyboard: 'default', hasToken: false, hasPackages: false,
    quickAmounts: [50, 100, 200, 350],
  },
  other: {
    icon: 'document-text-outline', color: '#6B7280',
    acctLabel: 'Account / Reference Number', acctPlaceholder: 'Enter account number',
    acctKeyboard: 'default', hasToken: false, hasPackages: false,
    quickAmounts: [100, 200, 500, 1000],
  },
};

// ─── Packages / Bundles ─────────────────────────────────────────────────────

interface Bundle { id: string; label: string; desc: string; amount: number }

const AIRTIME_BUNDLES: Record<string, Bundle[]> = {
  mtc: [
    { id: 'air_10', label: 'N$10', desc: 'Airtime top-up', amount: 10 },
    { id: 'air_20', label: 'N$20', desc: 'Airtime top-up', amount: 20 },
    { id: 'air_50', label: 'N$50', desc: 'Airtime top-up', amount: 50 },
    { id: 'air_100', label: 'N$100', desc: 'Airtime top-up', amount: 100 },
    { id: 'air_200', label: 'N$200', desc: 'Airtime top-up', amount: 200 },
    { id: 'dat_100mb', label: '100 MB', desc: '1 day validity', amount: 10 },
    { id: 'dat_500mb', label: '500 MB', desc: '7 day validity', amount: 35 },
    { id: 'dat_1gb', label: '1 GB', desc: '30 day validity', amount: 65 },
    { id: 'dat_2gb', label: '2 GB', desc: '30 day validity', amount: 99 },
    { id: 'dat_5gb', label: '5 GB', desc: '30 day validity', amount: 199 },
    { id: 'dat_10gb', label: '10 GB', desc: '30 day validity', amount: 349 },
  ],
  telecom: [
    { id: 'air_10', label: 'N$10', desc: 'Airtime top-up', amount: 10 },
    { id: 'air_30', label: 'N$30', desc: 'Airtime top-up', amount: 30 },
    { id: 'air_50', label: 'N$50', desc: 'Airtime top-up', amount: 50 },
    { id: 'air_100', label: 'N$100', desc: 'Airtime top-up', amount: 100 },
    { id: 'dat_500mb', label: '500 MB', desc: '7 day validity', amount: 40 },
    { id: 'dat_1gb', label: '1 GB', desc: '30 day validity', amount: 75 },
    { id: 'dat_3gb', label: '3 GB', desc: '30 day validity', amount: 149 },
    { id: 'dat_10gb', label: '10 GB', desc: '30 day validity', amount: 399 },
  ],
  tn_mobile: [
    { id: 'air_5', label: 'N$5', desc: 'Airtime top-up', amount: 5 },
    { id: 'air_10', label: 'N$10', desc: 'Airtime top-up', amount: 10 },
    { id: 'air_20', label: 'N$20', desc: 'Airtime top-up', amount: 20 },
    { id: 'air_50', label: 'N$50', desc: 'Airtime top-up', amount: 50 },
    { id: 'dat_200mb', label: '200 MB', desc: '3 day validity', amount: 12 },
    { id: 'dat_1gb', label: '1 GB', desc: '30 day validity', amount: 49 },
    { id: 'dat_3gb', label: '3 GB', desc: '30 day validity', amount: 99 },
  ],
};

const TV_PACKAGES: Record<string, Bundle[]> = {
  dstv: [
    { id: 'access', label: 'Access', desc: '40+ channels', amount: 129 },
    { id: 'family', label: 'Family', desc: '80+ channels', amount: 229 },
    { id: 'compact', label: 'Compact', desc: '125+ channels', amount: 399 },
    { id: 'compact_plus', label: 'Compact Plus', desc: '155+ channels', amount: 549 },
    { id: 'premium', label: 'Premium', desc: '175+ channels + sport', amount: 879 },
  ],
  gotv: [
    { id: 'lite', label: 'GOtv Lite', desc: '15+ channels', amount: 39 },
    { id: 'value', label: 'GOtv Value', desc: '30+ channels', amount: 75 },
    { id: 'plus', label: 'GOtv Plus', desc: '45+ channels', amount: 119 },
    { id: 'max', label: 'GOtv Max', desc: '60+ channels', amount: 159 },
  ],
  showmax: [
    { id: 'mobile', label: 'Mobile', desc: 'Phone & tablet only', amount: 49 },
    { id: 'standard', label: 'Standard', desc: '2 screens at once', amount: 99 },
    { id: 'pro', label: 'Pro (with Sport)', desc: '2 screens + live sport', amount: 199 },
  ],
};

function getBundles(billerId: string, category: string): Bundle[] {
  if (category === 'airtime') return AIRTIME_BUNDLES[billerId] ?? AIRTIME_BUNDLES.mtc;
  if (category === 'tv') return TV_PACKAGES[billerId] ?? TV_PACKAGES.dstv;
  return [];
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BillPayScreen() {
  const { billerId, billerName, category, acctLabel: acctLabelParam } = useLocalSearchParams<{
    billerId: string;
    billerName: string;
    category: string;
    acctLabel?: string;
  }>();
  const { profile } = useUser();
  const { recordEvent } = useGamification();

  const cfg = CATEGORY_CONFIG[category ?? 'other'] ?? CATEGORY_CONFIG.other;
  const bundles = getBundles(billerId ?? '', category ?? '');
  const hasPackages = cfg.hasPackages && bundles.length > 0;

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [accountRef, setAccountRef] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [bundleTab, setBundleTab] = useState<'airtime' | 'data'>('airtime');
  const [error, setError] = useState<string | null>(null);

  // PIN modal
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Result
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    getWallets().then(ws => {
      setWallets(ws);
      const primary = ws.find(w => w.isPrimary) ?? ws[0];
      if (primary) setSelectedWalletId(primary.id);
    }).catch(() => {});
    // Pre-fill own phone for airtime
    if (category === 'airtime' && profile?.phone) setAccountRef(profile.phone);
  }, [category, profile]);

  const parsedAmount = selectedBundle ? selectedBundle.amount : (parseFloat(amount) || 0);
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const hasFunds = selectedWallet ? selectedWallet.balance >= parsedAmount : true;

  function validate(): boolean {
    if (!accountRef.trim()) { setError(`Please enter your ${cfg.acctLabel.toLowerCase()}.`); return false; }
    if (!hasPackages && parsedAmount <= 0) { setError('Enter a valid amount.'); return false; }
    if (hasPackages && !selectedBundle) { setError('Please select a package.'); return false; }
    if (!hasFunds) { setError('Insufficient balance in selected wallet.'); return false; }
    setError(null);
    return true;
  }

  function openPin() {
    Keyboard.dismiss();
    if (!validate()) return;
    setPin(Array(PIN_LENGTH).fill(''));
    setPinError(null);
    setShowPin(true);
  }

  function handlePinChange(text: string, i: number) {
    const next = [...pin];
    next[i] = text;
    setPin(next);
    if (text && i < PIN_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }

  async function handleConfirm() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) { setPinError('Enter your full 6-digit PIN.'); return; }
    if (!selectedWalletId) return;
    setSubmitting(true);
    const res = await submitBillPayment({
      billerId: billerId ?? '',
      billerName: billerName ?? '',
      category: category ?? 'other',
      accountRef: accountRef.trim(),
      amount: parsedAmount,
      walletId: selectedWalletId,
      pin: fullPin,
      bundleId: selectedBundle?.id,
    });
    setSubmitting(false);
    if (res.success) {
      setShowPin(false);
      recordEvent('bill_paid');
      router.replace({
        pathname: '/bills/success' as never,
        params: {
          amount: parsedAmount.toString(),
          reference: res.reference ?? '',
          billerName: billerName ?? '',
          accountRef: accountRef.trim(),
          ...(res.token ? { token: res.token } : {}),
        },
      });
      return;
    } else {
      setPinError(res.error ?? 'Payment failed. Please try again.');
      setPin(Array(PIN_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }

  // ── Payment Form ──────────────────────────────────────────────────────────
  const airtimeBundles = bundles.filter(b => b.id.startsWith('air_'));
  const dataBundles = bundles.filter(b => b.id.startsWith('dat_'));
  const displayBundles = category === 'airtime'
    ? (bundleTab === 'airtime' ? airtimeBundles : dataBundles)
    : bundles;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{
        headerShown: true,
        headerTitle: billerName ?? 'Pay Bill',
        headerTintColor: designSystem.colors.neutral.text,
        headerStyle: { backgroundColor: '#fff' },
      }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* Biller hero */}
            <View style={[styles.billerHero, { backgroundColor: cfg.color }]}>
              <View style={styles.billerHeroIcon}>
                <Ionicons name={cfg.icon as never} size={28} color={cfg.color} />
              </View>
              <View>
                <Text style={styles.billerHeroName}>{billerName}</Text>
                <Text style={styles.billerHeroCat}>{(category ?? 'other').replace('_', ' / ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
              </View>
            </View>

            {/* Account/reference number */}
            <Text style={styles.fieldLabel}>{acctLabelParam ?? cfg.acctLabel}</Text>
            <TextInput
              style={[styles.input, error && !amount && { borderColor: designSystem.colors.semantic.error }]}
              placeholder={cfg.acctPlaceholder}
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={accountRef}
              onChangeText={t => { setAccountRef(t); setError(null); }}
              keyboardType={cfg.acctKeyboard}
              autoFocus={!accountRef}
              returnKeyType="next"
            />

            {/* Airtime tab selector */}
            {category === 'airtime' && (
              <View style={styles.bundleTabRow}>
                {(['airtime', 'data'] as const).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.bundleTab, bundleTab === tab && styles.bundleTabActive]}
                    onPress={() => { setBundleTab(tab); setSelectedBundle(null); setAmount(''); }}
                  >
                    <Ionicons
                      name={tab === 'airtime' ? 'call-outline' : 'wifi-outline'}
                      size={14}
                      color={bundleTab === tab ? '#fff' : designSystem.colors.neutral.textSecondary}
                    />
                    <Text style={[styles.bundleTabText, bundleTab === tab && styles.bundleTabTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Package / bundle grid */}
            {hasPackages && (
              <>
                <Text style={styles.fieldLabel}>
                  {category === 'airtime' ? (bundleTab === 'airtime' ? 'Airtime Amount' : 'Data Bundle') : 'Select Package'}
                </Text>
                <View style={styles.bundleGrid}>
                  {displayBundles.map(bundle => (
                    <TouchableOpacity
                      key={bundle.id}
                      style={[styles.bundleCard, selectedBundle?.id === bundle.id && styles.bundleCardActive]}
                      onPress={() => { setSelectedBundle(bundle); setError(null); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.bundleLabel, selectedBundle?.id === bundle.id && { color: designSystem.colors.brand.primary }]}>
                        {bundle.label}
                      </Text>
                      <Text style={styles.bundleDesc}>{bundle.desc}</Text>
                      <Text style={[styles.bundleAmount, selectedBundle?.id === bundle.id && { color: designSystem.colors.brand.primary }]}>
                        N${bundle.amount}
                      </Text>
                      {selectedBundle?.id === bundle.id && (
                        <View style={styles.bundleCheck}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Amount input (non-package types) */}
            {!hasPackages && (
              <>
                <Text style={styles.fieldLabel}>Amount (N$)</Text>
                <View style={[styles.amountWrap, error && { borderColor: designSystem.colors.semantic.error }]}>
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
                {cfg.quickAmounts && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                    {cfg.quickAmounts.map(v => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.quickChip, amount === String(v) && styles.quickChipActive]}
                        onPress={() => { setAmount(String(v)); setError(null); }}
                      >
                        <Text style={[styles.quickChipText, amount === String(v) && styles.quickChipTextActive]}>N${v}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
                      <Text style={[styles.walletBalance, !hasFunds && selectedWalletId === w.id && { color: designSystem.colors.semantic.error }]}>
                        N${w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    {selectedWalletId === w.id && (
                      <Ionicons name="checkmark-circle" size={20} color={designSystem.colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Info for electricity */}
            {category === 'electricity' && (
              <View style={styles.infoBanner}>
                <Ionicons name="flash-outline" size={14} color="#D97706" />
                <Text style={styles.infoText}>A prepaid token will be generated after payment. Enter it directly on your meter.</Text>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Pay button */}
          <View style={styles.footer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>
                {parsedAmount > 0 ? `N$${parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}` : '—'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: cfg.color }, (!parsedAmount || !accountRef.trim() || !hasFunds) && styles.btnDisabled]}
              onPress={openPin}
              disabled={!parsedAmount || !accountRef.trim()}
              activeOpacity={0.9}
            >
              <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.payBtnText}>
                {parsedAmount > 0 ? `Pay N$${parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}` : 'Enter Amount'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* PIN Modal */}
      <Modal visible={showPin} transparent animationType="slide" onRequestClose={() => { setShowPin(false); setSubmitting(false); }}>
        <View style={styles.overlay}>
          <View style={styles.pinCard}>
            <View style={styles.handle} />
            <Text style={styles.pinTitle}>Confirm Payment</Text>
            <Text style={styles.pinSub}>
              Enter your PIN to pay N${parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })} to {billerName}
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
                style={[styles.confirmBtn, { backgroundColor: cfg.color }, submitting && styles.btnDisabled]}
                onPress={handleConfirm}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>Pay Now</Text>}
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
  content: { padding: 20, paddingBottom: 16 },
  billerHero: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  billerHeroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  billerHeroName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  billerHeroCat: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: DS.colors.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10, marginTop: 16 },
  input: { height: 54, backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 18, fontSize: 16, color: DS.colors.neutral.text },
  amountWrap: { flexDirection: 'row', alignItems: 'center', height: 60, backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 20 },
  amountPrefix: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '700', color: DS.colors.neutral.text, padding: 0 },
  quickRow: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, backgroundColor: '#fff' },
  quickChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  quickChipText: { fontSize: 13, fontWeight: '700', color: DS.colors.neutral.textSecondary },
  quickChipTextActive: { color: '#fff' },
  bundleTabRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 4 },
  bundleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, backgroundColor: '#fff' },
  bundleTabActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  bundleTabText: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.textSecondary },
  bundleTabTextActive: { color: '#fff' },
  bundleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bundleCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: DS.colors.neutral.border, position: 'relative' },
  bundleCardActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  bundleLabel: { fontSize: 16, fontWeight: '800', color: DS.colors.neutral.text, marginBottom: 2 },
  bundleDesc: { fontSize: 11, color: DS.colors.neutral.textSecondary, marginBottom: 6 },
  bundleAmount: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.textSecondary },
  bundleCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: DS.colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 8 },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: DS.colors.neutral.border, backgroundColor: '#fff', marginBottom: 8 },
  walletRowActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  walletIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center' },
  walletInfo: { flex: 1 },
  walletName: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.text },
  walletBalance: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginTop: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: DS.colors.neutral.border, backgroundColor: '#fff', gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: DS.colors.neutral.textSecondary, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: DS.colors.neutral.text },
  payBtn: { height: 56, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
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
  confirmBtn: { flex: 2, height: 52, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  successContent: { padding: 28, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  successIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', color: DS.colors.neutral.text, marginBottom: 4 },
  successAmount: { fontSize: 40, fontWeight: '800', color: '#22C55E', marginBottom: 4 },
  successBiller: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginBottom: 28 },
  receiptCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: DS.colors.neutral.border, overflow: 'hidden', width: '100%', marginBottom: 16 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  receiptLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  receiptValue: { fontSize: 13, fontWeight: '500', color: DS.colors.neutral.text, maxWidth: '55%', textAlign: 'right' },
  tokenCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24, width: '100%', borderWidth: 1, borderColor: '#FCD34D' },
  tokenLabel: { fontSize: 10, fontWeight: '800', color: '#92400E', letterSpacing: 1.5, marginBottom: 12 },
  tokenValue: { fontSize: 28, fontWeight: '800', color: '#92400E', letterSpacing: 4, marginBottom: 8 },
  tokenHint: { fontSize: 12, color: '#B45309' },
  doneBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, marginBottom: 12 },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  anotherBtn: { paddingVertical: 8 },
  anotherBtnText: { fontSize: 15, color: DS.colors.brand.primary, fontWeight: '600' },
});
