/**
 * Bill Payment - Step 2: Wallet Selection - Buffr G2P.
 * Shows transaction summary and lets user select payment wallet.
 * Part of 3-step bill payment wizard with ProgressIndicator.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getWallets, type Wallet } from '@/services/wallets';
import { ProgressIndicator, ErrorState } from '@/components/ui';
import { CATEGORY_CONFIG } from '@/constants/billsConfig';

export default function BillWalletScreen() {
  const {
    billerId,
    billerName,
    category,
    accountRef,
    amount,
    bundleId,
    bundleLabel,
  } = useLocalSearchParams<{
    billerId: string;
    billerName: string;
    category: string;
    accountRef: string;
    amount: string;
    bundleId?: string;
    bundleLabel?: string;
  }>();

  const cfg = CATEGORY_CONFIG[category ?? 'other'] ?? CATEGORY_CONFIG.other;
  const parsedAmount = parseFloat(amount ?? '0');

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWallets()
      .then((ws) => {
        setWallets(ws);
        const primary = ws.find((w) => w.isPrimary) ?? ws[0];
        if (primary) setSelectedWalletId(primary.id);
      })
      .catch(() => {
        setError('Failed to load wallets. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);
  const hasFunds = selectedWallet ? selectedWallet.balance >= parsedAmount : true;

  function handleContinue() {
    if (!selectedWalletId) {
      setError('Please select a wallet.');
      return;
    }
    if (!hasFunds) {
      setError('Insufficient balance in selected wallet.');
      return;
    }

    // Navigate to Step 3: Confirm & PIN
    router.push({
      pathname: '/bills/confirm',
      params: {
        billerId: billerId ?? '',
        billerName: billerName ?? '',
        category: category ?? 'other',
        accountRef: accountRef ?? '',
        amount: amount ?? '0',
        bundleId: bundleId ?? '',
        bundleLabel: bundleLabel ?? '',
        walletId: selectedWalletId,
      },
    } as never);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Select Wallet',
          headerTintColor: designSystem.colors.neutral.text,
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ProgressIndicator currentStep={2} totalSteps={3} stepLabels={['Details', 'Wallet', 'Confirm']} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={designSystem.colors.brand.primary} size="large" />
            <Text style={styles.loadingText}>Loading wallets...</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content}>
              {/* Transaction Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View style={[styles.summaryIcon, { backgroundColor: cfg.color }]}>
                    <Ionicons name={cfg.icon as never} size={24} color="#fff" />
                  </View>
                  <View style={styles.summaryHeaderText}>
                    <Text style={styles.summaryBiller}>{billerName}</Text>
                    <Text style={styles.summaryCategory}>
                      {(category ?? 'other').replace('_', ' / ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryDivider} />

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

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={[styles.summaryValue, styles.summaryAmount]}>
                    N${parsedAmount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              {/* Wallet selection */}
              <Text style={styles.sectionTitle}>Select Payment Wallet</Text>

              {wallets.length === 0 ? (
                <ErrorState
                  variant="empty"
                  message="No wallets available"
                  title="Add a Wallet"
                  style={{ marginTop: 20 }}
                />
              ) : (
                wallets.map((w) => {
                  const canAfford = w.balance >= parsedAmount;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={[styles.walletRow, selectedWalletId === w.id && styles.walletRowActive]}
                      onPress={() => {
                        setSelectedWalletId(w.id);
                        setError(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.walletIcon}>
                        <Ionicons name="wallet-outline" size={16} color={designSystem.colors.brand.primary} />
                      </View>
                      <View style={styles.walletInfo}>
                        <Text style={styles.walletName}>{w.name}</Text>
                        <Text
                          style={[
                            styles.walletBalance,
                            !canAfford && selectedWalletId === w.id && { color: designSystem.colors.semantic.error },
                          ]}
                        >
                          N${w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                        </Text>
                        {!canAfford && selectedWalletId === w.id && (
                          <Text style={styles.insufficientText}>Insufficient funds</Text>
                        )}
                      </View>
                      {selectedWalletId === w.id && (
                        <Ionicons name="checkmark-circle" size={20} color={designSystem.colors.brand.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}

              {error && (
                <ErrorState variant="default" message={error} style={{ marginTop: 16 }} />
              )}

              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Continue button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.continueBtn,
                  { backgroundColor: cfg.color },
                  (!selectedWalletId || !hasFunds) && styles.btnDisabled,
                ]}
                onPress={handleContinue}
                disabled={!selectedWalletId || !hasFunds}
                activeOpacity={0.9}
              >
                <Text style={styles.continueBtnText}>Continue to Payment</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: DS.colors.neutral.textSecondary },
  content: { padding: 20, paddingBottom: 16 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    marginBottom: 24,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  summaryIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  summaryHeaderText: { flex: 1 },
  summaryBiller: { fontSize: 16, fontWeight: '700', color: DS.colors.neutral.text },
  summaryCategory: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: DS.colors.neutral.border, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.text, textAlign: 'right', maxWidth: '55%' },
  summaryAmount: { fontSize: 18, fontWeight: '800', color: DS.colors.brand.primary },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.colors.neutral.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  walletRowActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  walletIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: DS.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: { flex: 1 },
  walletName: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.text },
  walletBalance: { fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 2 },
  insufficientText: { fontSize: 11, color: DS.colors.semantic.error, marginTop: 2, fontWeight: '600' },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: DS.colors.neutral.border,
    backgroundColor: '#fff',
  },
  continueBtn: { height: 56, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
});
