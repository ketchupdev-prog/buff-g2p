/**
 * Send Money – Amount – Buffr G2P.
 * §3.4 screen 28 / Figma 153:752.
 */
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getWallets, type Wallet } from '@/services/wallets';

export default function SendAmountScreen() {
  const { recipientPhone, recipientName } = useLocalSearchParams<{
    recipientPhone: string;
    recipientName: string;
  }>();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    getWallets().then((ws) => {
      setWallets(ws);
      if (ws.length > 0) setSelectedWalletId(ws[0].id);
    });
  }, []);

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  const handleContinue = () => {
    const numeric = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numeric) || numeric <= 0) {
      setAmountError('Please enter a valid amount.');
      return;
    }
    if (selectedWallet && numeric > selectedWallet.balance) {
      setAmountError(`Insufficient balance. Available: N$ ${selectedWallet.balance.toFixed(2)}`);
      return;
    }
    setAmountError(null);
    router.push({
      pathname: '/send-money/confirm',
      params: {
        recipientPhone,
        recipientName,
        amount: numeric.toFixed(2),
        note,
        walletId: selectedWalletId ?? '',
      },
    } as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Send Money',
          headerTitleStyle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
          headerBackTitleVisible: false,
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Recipient */}
          <View style={styles.recipientRow}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientInitial}>
                {(recipientName?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.recipientName}>{recipientName || 'Recipient'}</Text>
              <Text style={styles.recipientPhone}>{recipientPhone}</Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={styles.currency}>N$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={amount}
              onChangeText={(t) => { setAmount(t.replace(/[^0-9.]/g, '')); setAmountError(null); }}
              keyboardType="decimal-pad"
              autoFocus
              accessibilityLabel="Amount to send"
            />
          </View>
          {amountError ? <Text style={styles.amountError}>{amountError}</Text> : null}

          {/* Wallet selector */}
          {wallets.length > 0 && (
            <View style={styles.walletSelector}>
              <Text style={styles.walletSelectorLabel}>From:</Text>
              {wallets.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.walletChip, selectedWalletId === w.id && styles.walletChipActive]}
                  onPress={() => setSelectedWalletId(w.id)}
                  accessibilityLabel={`${w.name}, balance N$ ${w.balance.toFixed(2)}`}
                >
                  <Text style={[styles.walletChipText, selectedWalletId === w.id && styles.walletChipTextActive]}>
                    {w.name}
                  </Text>
                  <Text style={[styles.walletChipBalance, selectedWalletId === w.id && styles.walletChipTextActive]}>
                    N$ {w.balance.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="What is this for?"
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={note}
              onChangeText={setNote}
              maxLength={100}
              returnKeyType="done"
              accessibilityLabel="Note for recipient"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            accessibilityLabel="Continue to confirm"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: designSystem.spacing.g2p.sectionSpacing,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  recipientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recipientInitial: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.brand.primary,
    fontWeight: '700',
  },
  recipientName: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, fontWeight: '600' },
  recipientPhone: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  currency: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.textSecondary,
    marginRight: 8,
    fontWeight: '700',
  },
  amountInput: {
    ...designSystem.typography.textStyles.display,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'center',
  },
  amountError: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.semantic.error,
    textAlign: 'center',
    marginBottom: designSystem.spacing.scale.md,
  },
  walletSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: designSystem.spacing.scale.sm,
    marginTop: designSystem.spacing.scale.xl,
    marginBottom: designSystem.spacing.scale.lg,
  },
  walletSelectorLabel: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
    fontWeight: '500',
  },
  walletChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designSystem.radius.pill,
    borderWidth: 1.5,
    borderColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  walletChipActive: {
    borderColor: designSystem.colors.brand.primary,
    backgroundColor: designSystem.colors.brand.primary50,
  },
  walletChipText: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary, fontWeight: '600' },
  walletChipBalance: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textTertiary },
  walletChipTextActive: { color: designSystem.colors.brand.primary },
  noteContainer: { marginTop: designSystem.spacing.scale.md },
  noteLabel: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginBottom: 6 },
  noteInput: {
    height: designSystem.components.input.height,
    backgroundColor: designSystem.colors.neutral.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    borderRadius: designSystem.components.input.borderRadius,
    paddingHorizontal: 16,
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
  },
  footer: { padding: designSystem.spacing.g2p.horizontalPadding, paddingBottom: designSystem.spacing.g2p.sectionSpacing },
  continueButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: { ...designSystem.typography.textStyles.body, color: '#fff', fontWeight: '700' },
});
