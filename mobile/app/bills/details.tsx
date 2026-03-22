/**
 * Bill Payment - Step 1: Account & Amount Details - Buffr G2P.
 * Collects account/meter/phone number and amount or package selection.
 * Part of 3-step bill payment wizard with ProgressIndicator.
 */
import React, { useEffect, useState } from 'react';
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
import { useUser } from '@/contexts/UserContext';
import { ProgressIndicator, ErrorState } from '@/components/ui';
import { CATEGORY_CONFIG, getBundles, type Bundle } from '@/constants/billsConfig';

export default function BillDetailsScreen() {
  const { billerId, billerName, category } = useLocalSearchParams<{
    billerId: string;
    billerName: string;
    category: string;
  }>();
  const { profile } = useUser();

  const cfg = CATEGORY_CONFIG[category ?? 'other'] ?? CATEGORY_CONFIG.other;
  const bundles = getBundles(billerId ?? '', category ?? '');
  const hasPackages = cfg.hasPackages && bundles.length > 0;

  const [accountRef, setAccountRef] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [bundleTab, setBundleTab] = useState<'airtime' | 'data'>('airtime');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill own phone for airtime
    if (category === 'airtime' && profile?.phone) {
      setAccountRef(profile.phone);
    }
  }, [category, profile]);

  const parsedAmount = selectedBundle ? selectedBundle.amount : parseFloat(amount) || 0;

  function handleContinue() {
    // Validation
    if (!accountRef.trim()) {
      setError(`Please enter your ${cfg.acctLabel.toLowerCase()}.`);
      return;
    }
    if (!hasPackages && parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (hasPackages && !selectedBundle) {
      setError('Please select a package.');
      return;
    }

    // Navigate to Step 2: Wallet selection
    router.push({
      pathname: '/bills/wallet',
      params: {
        billerId: billerId ?? '',
        billerName: billerName ?? '',
        category: category ?? 'other',
        accountRef: accountRef.trim(),
        amount: parsedAmount.toString(),
        bundleId: selectedBundle?.id ?? '',
        bundleLabel: selectedBundle?.label ?? '',
      },
    } as never);
  }

  // ── Bundle filtering for airtime (airtime vs data tabs) ──
  const airtimeBundles = bundles.filter((b) => b.id.startsWith('air_'));
  const dataBundles = bundles.filter((b) => b.id.startsWith('dat_'));
  const displayBundles =
    category === 'airtime'
      ? bundleTab === 'airtime'
        ? airtimeBundles
        : dataBundles
      : bundles;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: billerName ?? 'Pay Bill',
          headerTintColor: designSystem.colors.neutral.text,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ProgressIndicator currentStep={1} totalSteps={3} stepLabels={['Details', 'Wallet', 'Confirm']} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Biller hero */}
            <View style={[styles.billerHero, { backgroundColor: cfg.color }]}>
              <View style={styles.billerHeroIcon}>
                <Ionicons name={cfg.icon as never} size={28} color={cfg.color} />
              </View>
              <View>
                <Text style={styles.billerHeroName}>{billerName}</Text>
                <Text style={styles.billerHeroCat}>
                  {(category ?? 'other').replace('_', ' / ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </View>
            </View>

            {/* Account/reference number */}
            <Text style={styles.fieldLabel}>{cfg.acctLabel}</Text>
            <TextInput
              style={[styles.input, error && !amount && { borderColor: designSystem.colors.semantic.error }]}
              placeholder={cfg.acctPlaceholder}
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={accountRef}
              onChangeText={(t) => {
                setAccountRef(t);
                setError(null);
              }}
              keyboardType={cfg.acctKeyboard}
              autoFocus={!accountRef}
              returnKeyType="next"
            />

            {/* Airtime tab selector */}
            {category === 'airtime' && (
              <View style={styles.bundleTabRow}>
                {(['airtime', 'data'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.bundleTab, bundleTab === tab && styles.bundleTabActive]}
                    onPress={() => {
                      setBundleTab(tab);
                      setSelectedBundle(null);
                      setAmount('');
                    }}
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
                  {category === 'airtime'
                    ? bundleTab === 'airtime'
                      ? 'Airtime Amount'
                      : 'Data Bundle'
                    : 'Select Package'}
                </Text>
                <View style={styles.bundleGrid}>
                  {displayBundles.map((bundle) => (
                    <TouchableOpacity
                      key={bundle.id}
                      style={[
                        styles.bundleCard,
                        selectedBundle?.id === bundle.id && styles.bundleCardActive,
                      ]}
                      onPress={() => {
                        setSelectedBundle(bundle);
                        setError(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.bundleLabel,
                          selectedBundle?.id === bundle.id && { color: designSystem.colors.brand.primary },
                        ]}
                      >
                        {bundle.label}
                      </Text>
                      <Text style={styles.bundleDesc}>{bundle.desc}</Text>
                      <Text
                        style={[
                          styles.bundleAmount,
                          selectedBundle?.id === bundle.id && { color: designSystem.colors.brand.primary },
                        ]}
                      >
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
                    onChangeText={(t) => {
                      setAmount(t.replace(/[^0-9.]/g, ''));
                      setError(null);
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>
                {cfg.quickAmounts && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                    {cfg.quickAmounts.map((v) => (
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
                )}
              </>
            )}

            {error && (
              <ErrorState variant="default" message={error} style={{ marginTop: 16 }} />
            )}

            {/* Info for electricity */}
            {category === 'electricity' && (
              <View style={styles.infoBanner}>
                <Ionicons name="flash-outline" size={14} color="#D97706" />
                <Text style={styles.infoText}>
                  A prepaid token will be generated after payment. Enter it directly on your meter.
                </Text>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Continue button */}
          <View style={styles.footer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>
                {parsedAmount > 0 ? `N$${parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}` : '—'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.continueBtn,
                { backgroundColor: cfg.color },
                (!parsedAmount || !accountRef.trim()) && styles.btnDisabled,
              ]}
              onPress={handleContinue}
              disabled={!parsedAmount || !accountRef.trim()}
              activeOpacity={0.9}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
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
  billerHero: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  billerHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  billerHeroName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  billerHeroCat: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.colors.neutral.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 16,
  },
  input: {
    height: 54,
    backgroundColor: '#fff',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    paddingHorizontal: 18,
    fontSize: 16,
    color: DS.colors.neutral.text,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    paddingHorizontal: 20,
  },
  amountPrefix: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '700', color: DS.colors.neutral.text, padding: 0 },
  quickRow: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  quickChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    backgroundColor: '#fff',
  },
  quickChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  quickChipText: { fontSize: 13, fontWeight: '700', color: DS.colors.neutral.textSecondary },
  quickChipTextActive: { color: '#fff' },
  bundleTabRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 4 },
  bundleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    backgroundColor: '#fff',
  },
  bundleTabActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  bundleTabText: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.textSecondary },
  bundleTabTextActive: { color: '#fff' },
  bundleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bundleCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    position: 'relative',
  },
  bundleCardActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  bundleLabel: { fontSize: 16, fontWeight: '800', color: DS.colors.neutral.text, marginBottom: 2 },
  bundleDesc: { fontSize: 11, color: DS.colors.neutral.textSecondary, marginBottom: 6 },
  bundleAmount: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.textSecondary },
  bundleCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: DS.colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  infoText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: DS.colors.neutral.border,
    backgroundColor: '#fff',
    gap: 12,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: DS.colors.neutral.textSecondary, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: DS.colors.neutral.text },
  continueBtn: { height: 56, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
});
