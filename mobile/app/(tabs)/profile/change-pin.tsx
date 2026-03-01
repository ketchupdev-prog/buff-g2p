/**
 * Change PIN – Buffr G2P.
 * §3.5 Settings sub-screen. Set or change 2FA PIN; hashed client-side (pinAuth) and stored in SecureStore.
 * When backend PIN API exists, call it after local update.
 * Location: app/(tabs)/profile/change-pin.tsx
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import {
  hasPinSet,
  setStoredPinHash,
  hashPin,
  verifyPin,
  validatePinFormat,
  MAX_PIN_LENGTH,
} from '@/services/pinAuth';

const PIN_LENGTH = 6;

export default function ChangePinScreen() {
  const [isSetMode, setIsSetMode] = useState(true); // true = set new PIN (no current); false = change (require current)
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const set = await hasPinSet();
      if (!cancelled) setIsSetMode(!set);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!isSetMode) {
      if (!currentPin.trim()) {
        setError('Enter your current PIN.');
        return;
      }
      const ok = await verifyPin(currentPin);
      if (!ok) {
        setError('Current PIN is incorrect.');
        return;
      }
    }

    const vNew = validatePinFormat(newPin);
    if (!vNew.valid) {
      setError(vNew.error ?? 'Invalid new PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const hash = await hashPin(newPin);
      await setStoredPinHash(hash);
      Alert.alert(
        isSetMode ? 'PIN set' : 'PIN changed',
        'Your PIN has been updated successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      console.error('ChangePin submit:', e);
      setError('Failed to save PIN. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isSetMode, currentPin, newPin, confirmPin]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.backgroundFallback} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Change PIN</Text>
          </View>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={designSystem.colors.brand.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isSetMode ? 'Set PIN' : 'Change PIN'}</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.body}>
            {isSetMode
              ? 'Choose a PIN (4–8 digits) to verify your identity for transactions and sensitive actions.'
              : 'Enter your current PIN, then choose and confirm a new PIN.'}
          </Text>

          {!isSetMode && (
            <View style={styles.card}>
              <Text style={styles.label}>Current PIN</Text>
              <TextInput
                style={styles.input}
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder="••••••"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={MAX_PIN_LENGTH}
                editable={!submitting}
              />
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>{isSetMode ? 'New PIN' : 'New PIN'}</Text>
            <TextInput
              style={styles.input}
              value={newPin}
              onChangeText={setNewPin}
              placeholder="••••••"
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={MAX_PIN_LENGTH}
              editable={!submitting}
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Confirm new PIN</Text>
            <TextInput
              style={styles.input}
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="••••••"
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={MAX_PIN_LENGTH}
              editable={!submitting}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityLabel={isSetMode ? 'Set PIN' : 'Change PIN'}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{isSetMode ? 'Set PIN' : 'Change PIN'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: designSystem.colors.neutral.background,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: {
    padding: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: 16,
    paddingBottom: 32,
  },
  body: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 6,
  },
  input: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    paddingVertical: 10,
    paddingHorizontal: 0,
    letterSpacing: 4,
  },
  errorText: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.semantic.error,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    ...designSystem.typography.textStyles.body,
    fontWeight: '600',
    color: '#fff',
  },
});
