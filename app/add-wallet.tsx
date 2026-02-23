/**
 * Add Wallet – Buffr G2P.
 * Design: reference AddWallet patterns (emoji icon picker, pill input, auto pay toggle, success ping).
 * §3.4 screen 34 / Figma 151:391.
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
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
import { createWallet, type Wallet } from '@/services/wallets';

type WalletType = Wallet['type'];

// Quick emoji selection grid for wallet icons
const EMOJI_ROWS = [
  ['📊', '💰', '🎁', '💼', '🏦', '🎮', '✈️', '🏠'],
  ['🎓', '🚗', '💊', '🛍️', '🌱', '🎵', '⚽', '🍕'],
  ['❤️', '🌟', '🔥', '💎', '🎯', '📱', '🎨', '🏋️'],
];
const ALL_EMOJIS = EMOJI_ROWS.flat();

const WALLET_TYPES: Array<{ key: WalletType; label: string; description: string; emoji: string }> = [
  { key: 'main', label: 'Main Wallet', description: 'Your primary spending wallet', emoji: '📊' },
  { key: 'savings', label: 'Savings', description: 'Set money aside for later', emoji: '💰' },
  { key: 'grant', label: 'Grant Wallet', description: 'Dedicated to G2P payments', emoji: '🎁' },
];

export default function AddWalletScreen() {
  const [walletName, setWalletName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📊');
  const [type, setType] = useState<WalletType>('main');
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const pingAnim = useRef(new Animated.Value(1)).current;

  const handleCreate = async () => {
    const trimmed = walletName.trim();
    if (!trimmed) { setError('Please enter a wallet name.'); return; }
    setError(null);
    setLoading(true);
    try {
      const result = await createWallet(trimmed, type);
      if (result.success) {
        setSaveSuccess(true);
        Animated.sequence([
          Animated.timing(pingAnim, { toValue: 1.3, duration: 400, useNativeDriver: true }),
          Animated.timing(pingAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
        setTimeout(() => router.back(), 1400);
      } else {
        setError(result.error ?? 'Could not create wallet. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (saveSuccess) {
    return (
      <View style={styles.successScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Animated.View style={[styles.successPing, { transform: [{ scale: pingAnim }] }]}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
        </Animated.View>
        <Text style={styles.successTitle}>Wallet Created!</Text>
        <Text style={styles.successSub}>Your new wallet has been set up successfully.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Add Wallet',
          headerTitleStyle: { fontSize: 18, fontWeight: '600', color: '#020617' },
          headerBackTitleVisible: false,
          headerTintColor: '#1E293B',
          headerStyle: { backgroundColor: '#fff' },
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Emoji icon picker */}
          <TouchableOpacity style={styles.iconWrap} onPress={() => setShowEmojiPicker(true)} activeOpacity={0.8}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{selectedIcon}</Text>
            </View>
            <Text style={styles.setIconLabel}>Tap to change icon</Text>
          </TouchableOpacity>

          {/* Wallet name field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Wallet Name</Text>
            <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
              <TextInput
                style={styles.input}
                placeholder="e.g. My Savings"
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

          {/* Wallet type */}
          <Text style={styles.fieldLabel}>Type</Text>
          {WALLET_TYPES.map((wt) => {
            const isActive = type === wt.key;
            return (
              <TouchableOpacity
                key={wt.key}
                style={[styles.typeCard, isActive && styles.typeCardActive]}
                onPress={() => { setType(wt.key); setSelectedIcon(wt.emoji); }}
                activeOpacity={0.8}
              >
                <Text style={styles.typeEmoji}>{wt.emoji}</Text>
                <View style={styles.typeText}>
                  <Text style={[styles.typeLabel, isActive && styles.typeLabelActive]}>{wt.label}</Text>
                  <Text style={styles.typeDesc}>{wt.description}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={22} color="#0029D6" />}
              </TouchableOpacity>
            );
          })}

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

          {autoPayEnabled && (
            <View style={styles.autoPayHint}>
              <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
              <Text style={styles.autoPayHintText}>
                Auto Pay settings can be configured after wallet creation in the wallet detail screen.
              </Text>
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

        {/* Save button */}
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

      {/* Emoji picker modal */}
      <Modal visible={showEmojiPicker} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowEmojiPicker(false)} activeOpacity={1} />
          <View style={styles.emojiSheet}>
            <View style={styles.emojiSheetHandle} />
            <Text style={styles.emojiSheetTitle}>Choose Icon</Text>
            <ScrollView contentContainerStyle={styles.emojiGrid}>
              {ALL_EMOJIS.map((emoji, i) => (
                <TouchableOpacity
                  key={`${emoji}-${i}`}
                  style={[styles.emojiCell, selectedIcon === emoji && styles.emojiCellActive]}
                  onPress={() => { setSelectedIcon(emoji); setShowEmojiPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiCellText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.emojiCancel} onPress={() => setShowEmojiPicker(false)}>
              <Text style={styles.emojiCancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.homeIndicatorWrap}><View style={styles.homeIndicatorPill} /></View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  // Icon picker
  iconWrap: { alignItems: 'center', marginTop: 32, marginBottom: 28 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D9EAF3', borderWidth: 1, borderColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  iconEmoji: { fontSize: 36 },
  setIconLabel: { fontSize: 13, color: '#64748B' },
  // Name field
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, color: '#64748B', marginBottom: 8, fontWeight: '500' },
  inputWrap: { height: 48, borderRadius: 9999, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', paddingHorizontal: 20, justifyContent: 'center' },
  inputWrapFocused: { borderColor: '#020617', backgroundColor: '#fff' },
  input: { fontSize: 16, color: '#020617', padding: 0 },
  // Wallet type cards
  typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: '#E5E7EB', gap: 12 },
  typeCardActive: { borderColor: '#0029D6', backgroundColor: '#EFF6FF' },
  typeEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  typeText: { flex: 1 },
  typeLabel: { fontSize: 15, fontWeight: '600', color: '#020617' },
  typeLabelActive: { color: '#0029D6' },
  typeDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
  // Divider
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },
  // Auto Pay
  autoPayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, marginBottom: 12, gap: 12 },
  autoPayText: { flex: 1 },
  autoPayTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  autoPayDesc: { fontSize: 13, color: '#475569', marginTop: 2 },
  autoPayHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 12 },
  autoPayHintText: { flex: 1, fontSize: 13, color: '#2563EB', lineHeight: 18 },
  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginTop: 8 },
  errorText: { flex: 1, fontSize: 13, color: '#E11D48' },
  // Footer save button
  footer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, backgroundColor: '#fff' },
  saveBtn: { height: 52, borderRadius: 9999, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  // Success screen
  successScreen: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successPing: { marginBottom: 24 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#020617', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  // Emoji picker modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' },
  emojiSheet: { backgroundColor: '#EAECEF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, paddingHorizontal: 16, maxHeight: '60%' },
  emojiSheetHandle: { width: 36, height: 5, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  emojiSheetTitle: { fontSize: 16, fontWeight: '600', color: '#020617', textAlign: 'center', marginBottom: 16 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingBottom: 8 },
  emojiCell: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  emojiCellActive: { backgroundColor: '#DBEAFE', borderWidth: 2, borderColor: '#2563EB' },
  emojiCellText: { fontSize: 28 },
  emojiCancel: { paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginTop: 8 },
  emojiCancelText: { fontSize: 18, color: '#3B82F6', fontWeight: '500' },
  homeIndicatorWrap: { height: 21, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8, marginTop: 4 },
  homeIndicatorPill: { width: 139, height: 5, backgroundColor: '#000', borderRadius: 100 },
});
