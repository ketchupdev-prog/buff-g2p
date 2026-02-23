/**
 * Send Money – Receiver Details – Buffr G2P.
 * Recipient hero, Pay From selector, amount input, note, Pay CTA.
 * §26 / Figma 153:752.
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { getWallets, type Wallet } from '@/services/wallets';
import { Avatar, PayFromSheet, PayFromPill, buildPaySources, type PaySource } from '@/components/ui';

export default function ReceiverDetailsScreen() {
  const { recipientPhone, recipientName, recipientEmail, recipientBankingName } =
    useLocalSearchParams<{
      recipientPhone: string;
      recipientName: string;
      recipientEmail?: string;
      recipientBankingName?: string;
    }>();

  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [paySource, setPaySource] = useState<PaySource | null>(null);
  const [showPayFrom, setShowPayFrom] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    getWallets().then((ws) => {
      setWallets(ws);
      const sources = buildPaySources(ws);
      if (sources.length > 0) setPaySource(sources[0]);
    });
  }, []);

  const selectedWallet = paySource?.sourceType === 'wallet'
    ? wallets.find(w => w.id === paySource.id)
    : null;

  const handlePay = () => {
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
        walletId: paySource?.id ?? wallets[0]?.id ?? '',
      },
    } as never);
  };

  const canPay = parseFloat(amount) > 0;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Receiver Details',
            headerBackTitle: '',
            headerTintColor: '#111827',
            headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#111827' },
            headerRight: () => (
              <TouchableOpacity style={{ marginRight: 16 }} accessibilityLabel="Save contact">
                <Ionicons name="heart-outline" size={22} color="#111827" />
              </TouchableOpacity>
            ),
          }}
        />

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            {/* Hero: recipient profile */}
            <View style={styles.hero}>
              <View style={styles.avatarShadow}>
                <Avatar name={recipientName ?? '?'} size={88} />
              </View>
              <Text style={styles.recipientName}>{recipientName || 'Recipient'}</Text>
              {recipientEmail ? <Text style={styles.recipientSub}>{recipientEmail}</Text> : null}
              <Text style={styles.recipientSub}>{recipientPhone}</Text>
              {recipientBankingName ? <Text style={styles.recipientBank}>Banking name: {recipientBankingName}</Text> : null}
            </View>

            {/* Pay From + Note row */}
            <View style={styles.controlRow}>
              <PayFromPill source={paySource} onPress={() => setShowPayFrom(true)} />
              <TouchableOpacity
                style={styles.noteBtn}
                onPress={() => setShowNoteInput(v => !v)}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil-outline" size={15} color="#6B7280" />
                <Text style={styles.noteBtnText}>Note</Text>
              </TouchableOpacity>
            </View>

            {showNoteInput && (
              <TextInput
                style={styles.noteInput}
                placeholder="What's this for?"
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                maxLength={100}
                returnKeyType="done"
              />
            )}

            {/* Amount input */}
            <View style={styles.amountWrap}>
              <Text style={styles.amountPrefix}>N$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                value={amount}
                onChangeText={(t) => { setAmount(t.replace(/[^0-9.]/g, '')); setAmountError(null); }}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {amountError ? <Text style={styles.amountError}>{amountError}</Text> : null}

            {selectedWallet && (
              <Text style={styles.balanceHint}>
                Available: N$ {selectedWallet.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
              </Text>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Pay button */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <TouchableOpacity
              style={[styles.payBtn, !canPay && styles.payBtnDisabled]}
              onPress={handlePay}
              disabled={!canPay}
              activeOpacity={0.9}
            >
              <Text style={styles.payBtnText}>
                Pay {recipientName ? recipientName.split(' ')[0] : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Pay From sheet */}
      <PayFromSheet
        visible={showPayFrom}
        selected={paySource}
        onSelect={setPaySource}
        onClose={() => setShowPayFrom(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24 },
  avatarShadow: {
    marginBottom: 16,
    shadowColor: '#0029D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    borderRadius: 44,
  },
  recipientName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  recipientSub: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  recipientBank: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  // Control row
  controlRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 16, gap: 10 },
  noteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 10,
  },
  noteBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  noteInput: {
    marginHorizontal: 24, marginBottom: 12, height: 48,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 9999, paddingHorizontal: 16, fontSize: 15, color: '#111827',
  },

  // Amount
  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginTop: 8 },
  amountPrefix: { fontSize: 20, fontWeight: '600', color: '#9CA3AF', marginRight: 8 },
  amountInput: { fontSize: 52, fontWeight: '700', color: '#111827', minWidth: 80, textAlign: 'center', padding: 0 },
  amountError: { textAlign: 'center', fontSize: 13, color: '#E11D48', marginTop: 8 },
  balanceHint: { textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 6 },

  // Footer
  footer: { paddingHorizontal: 24, paddingTop: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  payBtn: { height: 54, borderRadius: 9999, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  payBtnDisabled: { opacity: 0.4 },
  payBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
