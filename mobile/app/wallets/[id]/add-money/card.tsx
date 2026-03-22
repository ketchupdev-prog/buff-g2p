/**
 * Add Money via Card – Buffr G2P.
 * Select linked card, enter amount, 2FA, then top up. PRD §18.5.
 * Uses UserContext for walletStatus (frozen guard) and profile.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { getWallet, addMoneyToWallet, type Wallet } from '@/services/wallets';
import { TwoFAModal } from '@/components/modals';

const DS = designSystem;
const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

export default function AddMoneyCardScreen() {
  const { id: walletId } = useLocalSearchParams<{ id: string }>();
  const { profile, walletStatus, isLoaded } = useUser();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isFrozen = walletStatus === 'frozen';

  useEffect(() => {
    if (walletId) {
      getWallet(walletId).then(setWallet).finally(() => setLoading(false));
    }
  }, [walletId]);

  const cards = wallet?.linkedCards ?? [];
  const activeCardId = selectedCardId ?? cards[0]?.id ?? null;
  const amountNum = parseFloat(amount) || 0;
  const canContinue = !isFrozen && activeCardId && amountNum >= 10 && amountNum <= 50000;

  function handleContinue() {
    if (!canContinue || !walletId) return;
    setShowPin(true);
  }

  async function handleVerify(pin: string) {
    if (!walletId) return { success: false as const, error: 'Missing wallet' };
    setSubmitting(true);
    const res = await addMoneyToWallet(walletId, amountNum, 'debit_card');
    setSubmitting(false);
    if (res.success) {
      setShowPin(false);
      router.replace({ pathname: '/wallets/[id]' as never, params: { id: walletId } });
      return { success: true as const };
    }
    return { success: false as const, error: res.error };
  }

  if (!isLoaded || loading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Add Money', headerTintColor: DS.colors.neutral.text }} />
        <View style={styles.centered}>
          <ActivityIndicator color={DS.colors.brand.primary} />
        </View>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Add Money', headerTintColor: DS.colors.neutral.text }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Wallet not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Add Money via Card', headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isFrozen && (
            <View style={styles.frozenBanner}>
              <Ionicons name="lock-closed-outline" size={20} color={DS.colors.semantic.error} />
              <Text style={styles.frozenText}>Your wallet is frozen. Complete proof-of-life to add money.</Text>
            </View>
          )}
          <Text style={styles.sectionTitle}>Select card</Text>
          {cards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No linked cards. Add a card to top up.</Text>
              <TouchableOpacity style={styles.linkCardBtn} onPress={() => router.push('/add-card' as never)}>
                <Ionicons name="card-outline" size={18} color={DS.colors.brand.primary} />
                <Text style={styles.linkCardText}>Add card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cards.map((card) => {
              const isSelected = activeCardId === card.id;
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.cardRow, isSelected && styles.cardRowActive]}
                  onPress={() => setSelectedCardId(card.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="card-outline" size={24} color={DS.colors.brand.primary} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardLabel}>{card.label}</Text>
                    <Text style={styles.cardLast4}>•••• {card.last4}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={DS.colors.brand.primary} />}
                </TouchableOpacity>
              );
            })
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>N$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={DS.colors.neutral.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.quickBtn, parseFloat(amount) === v && styles.quickBtnActive]}
                onPress={() => setAmount(String(v))}
              >
                <Text style={[styles.quickText, parseFloat(amount) === v && styles.quickTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>Add money</Text>
          </TouchableOpacity>
        </ScrollView>

        <TwoFAModal
          visible={showPin}
          onClose={() => setShowPin(false)}
          onVerify={handleVerify}
          title="Verify identity"
          subtitle="Enter your 6-digit PIN to add money"
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: DS.colors.semantic.error, marginBottom: 12 },
  link: { fontSize: 16, fontWeight: '600', color: DS.colors.brand.primary },
  content: { padding: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: DS.colors.neutral.border },
  emptyText: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginBottom: 12 },
  linkCardBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkCardText: { fontSize: 14, fontWeight: '600', color: DS.colors.brand.primary },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    marginBottom: 10,
    gap: 12,
  },
  cardRowActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  cardLast4: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    marginBottom: 12,
  },
  currency: { fontSize: 20, fontWeight: '700', color: DS.colors.neutral.text, marginRight: 10 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: DS.colors.neutral.text },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: DS.colors.neutral.background, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  quickBtnActive: { borderColor: DS.colors.brand.primary, backgroundColor: DS.colors.brand.primary50 },
  quickText: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.text },
  quickTextActive: { color: DS.colors.brand.primary },
  continueBtn: { marginTop: 24, height: 52, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  frozenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DS.colors.feedback.red100,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  frozenText: { flex: 1, fontSize: 13, color: DS.colors.semantic.error, lineHeight: 18 },
});
