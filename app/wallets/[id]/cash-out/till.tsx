/**
 * Cash Out – Cash at Till – Buffr G2P.
 * Scan till QR or generate a cash code. Fee: Free. Instant.
 * §3.3 screen 19.
 */
import React, { useState } from 'react';
import {
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
import { designSystem } from '@/constants/designSystem';

const STEPS = [
  { icon: 'cash-outline' as const, label: 'Enter the amount you want to withdraw' },
  { icon: 'qr-code-outline' as const, label: "Tap 'Scan Till QR' and scan the QR code at the till point" },
  { icon: 'checkmark-circle-outline' as const, label: 'Collect your cash from the cashier' },
];

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function CashOutTillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');

  function validate(): number | null {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError('Enter a valid amount.'); return null; }
    if (num < 10) { setError('Minimum amount is N$10.'); return null; }
    if (num > 5000) { setError('Maximum amount is N$5,000.'); return null; }
    setError(null);
    return num;
  }

  function handleScanQR() {
    const num = validate();
    if (!num) return;
    router.push({ pathname: '/scan-qr', params: { mode: 'cashout', method: 'till', walletId: id, amount: num.toFixed(2) } } as never);
  }

  function handleGenerateCode() {
    if (!validate()) return;
    setCode(generateCode());
    setShowCode(true);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Cash at Till', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.feeBadge}>
              <Ionicons name="gift-outline" size={16} color="#15803D" />
              <Text style={styles.feeText}>Free · No charges · Instant</Text>
            </View>

            <Text style={styles.sectionLabel}>Amount to withdraw</Text>
            <View style={styles.amountWrap}>
              <Text style={styles.amountPrefix}>N$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                value={amount}
                onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, '')); setError(null); }}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <Text style={styles.limitHint}>Min N$10 · Max N$5,000</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>How it works</Text>
              {STEPS.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <Ionicons name={s.icon} size={18} color={designSystem.colors.brand.primary} style={{ marginTop: 1 }} />
                  <Text style={styles.stepText}>{s.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, !amount && styles.btnDisabled]} onPress={handleScanQR} disabled={!amount} activeOpacity={0.9}>
              <Ionicons name="qr-code-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Scan Till QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, !amount && styles.btnDisabled]} onPress={handleGenerateCode} disabled={!amount} activeOpacity={0.9}>
              <Ionicons name="key-outline" size={18} color={designSystem.colors.brand.primary} style={{ marginRight: 8 }} />
              <Text style={styles.btnOutlineText}>Generate Cash Code</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <Modal visible={showCode} transparent animationType="slide" onRequestClose={() => setShowCode(false)}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.modalHandle} />
              <View style={styles.codeIconWrap}>
                <Ionicons name="key-outline" size={32} color={designSystem.colors.brand.primary} />
              </View>
              <Text style={styles.codeTitle}>Your Cash Code</Text>
              <Text style={styles.codeValue}>{code}</Text>
              <Text style={styles.codeHint}>Show this 6-digit code to the cashier at the till point</Text>
              <View style={styles.codeAmtRow}>
                <Text style={styles.codeAmtLabel}>Amount:</Text>
                <Text style={styles.codeAmtValue}>N$ {parseFloat(amount || '0').toFixed(2)}</Text>
              </View>
              <View style={styles.infoBanner}>
                <Ionicons name="time-outline" size={14} color="#D97706" />
                <Text style={styles.infoBannerText}>Expires in 15 minutes</Text>
              </View>
              <TouchableOpacity style={styles.btn} onPress={() => { setShowCode(false); router.replace('/(tabs)' as never); }} activeOpacity={0.9}>
                <Text style={styles.btnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 24, paddingBottom: 8 },
  feeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 12, padding: 12, marginBottom: 24 },
  feeText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 20, height: 56 },
  amountPrefix: { fontSize: 18, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: DS.colors.neutral.text },
  limitHint: { fontSize: 12, color: DS.colors.neutral.textTertiary, marginTop: 6, marginLeft: 4 },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 8 },
  stepsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 24, borderWidth: 1, borderColor: DS.colors.neutral.border },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 11, fontWeight: '700', color: DS.colors.brand.primary },
  stepText: { flex: 1, fontSize: 13, color: DS.colors.neutral.textSecondary, lineHeight: 18 },
  footer: { padding: 24, paddingBottom: 32, gap: 12 },
  btn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnOutline: { height: 56, borderWidth: 1.5, borderColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnOutlineText: { fontSize: 16, fontWeight: '600', color: DS.colors.brand.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, alignItems: 'center' },
  modalHandle: { width: 36, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, marginBottom: 24 },
  codeIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  codeTitle: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 16 },
  codeValue: { fontSize: 52, fontWeight: '800', color: DS.colors.brand.primary, letterSpacing: 10, marginBottom: 12 },
  codeHint: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 16 },
  codeAmtRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  codeAmtLabel: { fontSize: 15, color: DS.colors.neutral.textSecondary },
  codeAmtValue: { fontSize: 15, fontWeight: '700', color: DS.colors.neutral.text },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 24, width: '100%', justifyContent: 'center' },
  infoBannerText: { fontSize: 13, color: '#92400E' },
});
