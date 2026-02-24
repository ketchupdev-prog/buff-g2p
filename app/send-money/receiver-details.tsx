/**
 * Send Money – Receiver details – Buffr G2P.
 * Review recipient, choose payment source (wallet), add note; step before 2FA. §3.4 screen 27b.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { getWallets, type Wallet } from '@/services/wallets';
import { designSystem } from '@/constants/designSystem';
import { Avatar, PayFromSheet, PayFromPill, buildPaySources, type PaySource } from '@/components/ui';

export default function ReceiverDetailsScreen() {
  const { recipientPhone, recipientName, amount, note: noteParam } = useLocalSearchParams<{ recipientPhone: string; recipientName: string; amount: string; note?: string }>();
  const [note, setNote] = useState(noteParam ?? '');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [paySource, setPaySource] = useState<PaySource | null>(null);
  const [showPayFrom, setShowPayFrom] = useState(false);

  useEffect(() => {
    getWallets().then((ws) => {
      setWallets(ws);
      const sources = buildPaySources(ws);
      if (sources.length > 0) setPaySource(sources[0]);
    });
  }, []);

  const walletId = paySource?.sourceType === 'wallet' ? paySource.id : wallets[0]?.id;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Receiver details', headerTintColor: designSystem.colors.neutral.text }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.recipientCard}>
              <Avatar name={recipientName ?? ''} size={48} />
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName}>{recipientName ?? 'Recipient'}</Text>
                <Text style={styles.recipientPhone}>{recipientPhone}</Text>
              </View>
            </View>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>N$ {amount ?? '0.00'}</Text>

            <Text style={styles.label}>Pay from</Text>
            <TouchableOpacity style={styles.payFromRow} onPress={() => setShowPayFrom(true)}>
              <PayFromPill source={paySource} wallets={wallets} />
              <Ionicons name="chevron-down" size={20} color={designSystem.colors.neutral.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 16 }]}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a message"
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              style={styles.btn}
              onPress={() =>
                router.push({
                  pathname: '/send-money/confirm',
                  params: { recipientPhone, recipientName, amount: amount ?? '0', note, walletId: walletId ?? '' },
                } as never)
              }
            >
              <Text style={styles.btnText}>Continue to verify</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <PayFromSheet
        visible={showPayFrom}
        onClose={() => setShowPayFrom(false)}
        sources={buildPaySources(wallets)}
        selected={paySource}
        onSelect={setPaySource}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  recipientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  recipientInfo: { marginLeft: 12, flex: 1 },
  recipientName: { fontSize: 17, fontWeight: '700', color: designSystem.colors.neutral.text },
  recipientPhone: { fontSize: 13, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  amountLabel: { fontSize: 12, fontWeight: '600', color: designSystem.colors.neutral.textSecondary, marginBottom: 4 },
  amountValue: { fontSize: 24, fontWeight: '800', color: designSystem.colors.neutral.text, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: designSystem.colors.neutral.textSecondary, marginBottom: 8 },
  payFromRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  noteInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: designSystem.colors.neutral.border, fontSize: 15, color: designSystem.colors.neutral.text, minHeight: 72, textAlignVertical: 'top' },
  btn: { marginTop: 28, height: 52, backgroundColor: designSystem.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
