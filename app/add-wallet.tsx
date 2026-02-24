/**
 * Add Wallet – Buffr G2P.
 * §25 / Figma 151:391.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { createWallet } from '@/services/wallets';
import {
  BottomSheet,
  EmojiIcon,
  EmojiPicker,
  PayFromSheet,
  SegmentedControl,
  type PaySource,
} from '@/components/ui';

type Frequency = 'Weekly' | 'Bi-weekly' | 'Monthly';
const FREQUENCIES: Frequency[] = ['Weekly', 'Bi-weekly', 'Monthly'];
const REPAYMENT_OPTIONS = ['3', '6', '9', '12', '24'];
const DAYS = Array.from({ length: 28 }, (_, i) => String(i + 1));

export default function AddWalletScreen() {
  const [walletName,    setWalletName]    = useState('');
  const [selectedIcon,  setSelectedIcon]  = useState('💳');
  const [nameFocused,   setNameFocused]   = useState(false);

  const [showEmojiPicker,  setShowEmojiPicker]  = useState(false);
  const [showPayFrom,      setShowPayFrom]      = useState(false);
  const [showDayPicker,    setShowDayPicker]    = useState(false);
  const [showRepayPicker,  setShowRepayPicker]  = useState(false);

  const [autoPayEnabled,    setAutoPayEnabled]    = useState(false);
  const [frequency,         setFrequency]         = useState<Frequency>('Monthly');
  const [deductDay,         setDeductDay]         = useState('15');
  const [deductTime,        setDeductTime]        = useState('09:00');
  const [autoAmount,        setAutoAmount]        = useState('');
  const [numRepayments,     setNumRepayments]     = useState('12');
  const [paySource,         setPaySource]         = useState<PaySource | null>(null);
  const [amountFocused,     setAmountFocused]     = useState(false);

  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState<string | null>(null);
  const [saveSuccess,  setSaveSuccess] = useState(false);
  const pingAnim = useRef(new Animated.Value(1)).current;

  const handleCreate = async () => {
    const trimmed = walletName.trim();
    if (!trimmed) { setError('Please enter a wallet name.'); return; }
    setError(null);
    setLoading(true);
    try {
      const result = await createWallet(trimmed, 'savings', undefined, undefined, selectedIcon);
      if (result.success) {
        setSaveSuccess(true);
        Animated.sequence([
          Animated.timing(pingAnim, { toValue: 1.3, duration: 400, useNativeDriver: true }),
          Animated.timing(pingAnim, { toValue: 1,   duration: 300, useNativeDriver: true }),
        ]).start();
        setTimeout(() => router.back(), 1400);
      } else {
        setError(result.error ?? 'Could not create wallet.');
      }
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  };

  if (saveSuccess) {
    return (
      <View style={styles.successScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Animated.View style={{ transform: [{ scale: pingAnim }] }}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
        </Animated.View>
        <Text style={styles.successTitle}>Wallet Created!</Text>
        <Text style={styles.successSub}>Your new wallet has been set up.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Add Wallet', headerTitleStyle: { fontSize: 18, fontWeight: '600', color: '#020617' }, headerTintColor: '#1E293B', headerStyle: { backgroundColor: '#fff' } }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Icon – per Buffr design: Set icon + emoji picker */}
          <View style={styles.iconField}>
            <EmojiIcon value={selectedIcon} onPress={() => setShowEmojiPicker(true)} size={80} />
            <Text style={styles.setIconLabel}>Set icon</Text>
          </View>

          {/* Name – user-defined, e.g. Aquarium */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Wallet Name</Text>
            <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Aquarium"
                placeholderTextColor="#94A3B8"
                value={walletName}
                onChangeText={(t) => { setWalletName(t); setError(null); }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                returnKeyType="done"
                maxLength={50}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Auto Pay toggle */}
          <View style={styles.autoPayCard}>
            <View style={styles.autoPayText}>
              <Text style={styles.autoPayTitle}>Auto Pay</Text>
              <Text style={styles.autoPayDesc}>Automatically fund this wallet on a schedule</Text>
            </View>
            <Switch
              value={autoPayEnabled}
              onValueChange={setAutoPayEnabled}
              trackColor={{ false: 'rgba(120,120,128,0.16)', true: '#22C55E' }}
              thumbColor="#fff"
            />
          </View>

          {/* Auto Pay config */}
          {autoPayEnabled && (
            <View style={styles.configCard}>

              <Text style={styles.configLabel}>Frequency</Text>
              <SegmentedControl
                options={FREQUENCIES}
                selected={frequency}
                onSelect={setFrequency}
                style={{ marginBottom: 4 }}
              />

              <Text style={styles.configLabel}>Deduct On</Text>
              <TouchableOpacity style={styles.configRow} onPress={() => setShowDayPicker(true)} activeOpacity={0.8}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.configRowText}>Day {deductDay} of cycle</Text>
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
              </TouchableOpacity>

              <Text style={styles.configLabel}>Time</Text>
              <View style={styles.configRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <TextInput
                  style={styles.configRowInput}
                  value={deductTime}
                  onChangeText={setDeductTime}
                  placeholder="09:00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>

              <Text style={styles.configLabel}>Amount</Text>
              <View style={[styles.configRow, amountFocused && { borderColor: '#020617' }]}>
                <Text style={styles.currencyPrefix}>N$</Text>
                <TextInput
                  style={[styles.configRowInput, { flex: 1 }]}
                  value={autoAmount}
                  onChangeText={setAutoAmount}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                />
              </View>

              <Text style={styles.configLabel}>Number of Repayments</Text>
              <TouchableOpacity style={styles.configRow} onPress={() => setShowRepayPicker(true)} activeOpacity={0.8}>
                <Ionicons name="repeat-outline" size={16} color="#6B7280" />
                <Text style={styles.configRowText}>{numRepayments} repayments</Text>
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
              </TouchableOpacity>

              <Text style={styles.configLabel}>Payment Method</Text>
              <TouchableOpacity style={styles.configRow} onPress={() => setShowPayFrom(true)} activeOpacity={0.8}>
                {paySource ? (
                  <>
                    <Ionicons name={paySource.icon} size={16} color={paySource.iconColor} />
                    <Text style={styles.configRowText}>{paySource.label}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={16} color="#9CA3AF" />
                    <Text style={[styles.configRowText, { color: '#9CA3AF' }]}>Select payment method</Text>
                  </>
                )}
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color="#E11D48" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: 80 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, (!walletName.trim() || loading) && styles.saveBtnDisabled]}
            onPress={handleCreate}
            disabled={!walletName.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Wallet</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Sheets */}
      <EmojiPicker
        visible={showEmojiPicker}
        selected={selectedIcon}
        onSelect={setSelectedIcon}
        onClose={() => setShowEmojiPicker(false)}
      />

      <PayFromSheet
        visible={showPayFrom}
        selected={paySource}
        onSelect={setPaySource}
        onClose={() => setShowPayFrom(false)}
      />

      {/* Day picker */}
      <BottomSheet visible={showDayPicker} onClose={() => setShowDayPicker(false)} title="Select Day" maxHeight="50%">
        <View style={styles.dayGrid}>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.dayCell, deductDay === d && styles.dayCellActive]}
              onPress={() => { setDeductDay(d); setShowDayPicker(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayCellText, deductDay === d && styles.dayCellTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      {/* Repayments picker */}
      <BottomSheet visible={showRepayPicker} onClose={() => setShowRepayPicker(false)} title="Number of Repayments" maxHeight="50%">
        {REPAYMENT_OPTIONS.map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.repayRow, numRepayments === n && styles.repayRowActive]}
            onPress={() => { setNumRepayments(n); setShowRepayPicker(false); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.repayText, numRepayments === n && styles.repayTextActive]}>{n} repayments</Text>
            {numRepayments === n && <Ionicons name="checkmark-circle" size={20} color="#0029D6" />}
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },

  iconField: { alignItems: 'center', marginBottom: 20 },
  setIconLabel: { fontSize: 13, color: '#64748B', marginTop: 8 },

  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, color: '#64748B', marginBottom: 8, fontWeight: '500' },
  inputWrap: { height: 48, borderRadius: 9999, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 20, justifyContent: 'center' },
  inputWrapFocused: { borderColor: '#020617', backgroundColor: '#fff' },
  input: { fontSize: 16, color: '#020617', padding: 0 },

  typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: '#E5E7EB', gap: 12 },
  typeCardActive: { borderColor: '#0029D6', backgroundColor: '#EFF6FF' },
  typeEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  typeText: { flex: 1 },
  typeLabel: { fontSize: 15, fontWeight: '600', color: '#020617' },
  typeLabelActive: { color: '#0029D6' },
  typeDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },

  autoPayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, marginBottom: 12, gap: 12 },
  autoPayText: { flex: 1 },
  autoPayTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  autoPayDesc: { fontSize: 13, color: '#475569', marginTop: 2 },

  configCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  configLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 12, marginBottom: 6 },
  configRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10, marginBottom: 2 },
  configRowText: { flex: 1, fontSize: 14, color: '#111827' },
  configRowInput: { fontSize: 14, color: '#111827', padding: 0 },
  currencyPrefix: { fontSize: 14, fontWeight: '600', color: '#111827' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginTop: 8 },
  errorText: { flex: 1, fontSize: 13, color: '#E11D48' },

  footer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, backgroundColor: '#fff' },
  saveBtn: { height: 52, borderRadius: 9999, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  successScreen: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#020617', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#64748B', textAlign: 'center' },

  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  dayCell: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  dayCellActive: { backgroundColor: '#0029D6' },
  dayCellText: { fontSize: 15, fontWeight: '500', color: '#111827' },
  dayCellTextActive: { color: '#fff', fontWeight: '700' },

  repayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  repayRowActive: { backgroundColor: '#EFF6FF' },
  repayText: { fontSize: 16, color: '#111827' },
  repayTextActive: { color: '#0029D6', fontWeight: '600' },
});
