/**
 * Change PIN – Buffr G2P.
 * §3.5 Settings sub-screen. Enter current PIN, new PIN, confirm.
 * Location: app/(tabs)/profile/change-pin.tsx
 */
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { changePin } from '@/services/profile';
import { validatePinFormat } from '@/services/pinAuth';

export default function ChangePinScreen() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePin = async () => {
    // Validate current PIN
    const currentValidation = validatePinFormat(currentPin);
    if (!currentValidation.valid) {
      Alert.alert('Invalid PIN', currentValidation.error);
      return;
    }

    // Validate new PIN
    const newValidation = validatePinFormat(newPin);
    if (!newValidation.valid) {
      Alert.alert('Invalid PIN', newValidation.error);
      return;
    }

    // Check confirmation matches
    if (newPin !== confirmPin) {
      Alert.alert('PINs do not match', 'Please make sure your new PIN and confirmation match.');
      return;
    }

    setLoading(true);
    try {
      const result = await changePin({ currentPin, newPin });
      if (result.success) {
        Alert.alert('Success', 'Your PIN has been changed successfully.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error ?? 'Failed to change PIN. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = currentPin.length >= 4 && newPin.length >= 4 && confirmPin.length >= 4;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change PIN</Text>
        </View>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              To change your PIN, enter your current PIN, then choose and confirm a new PIN.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current PIN</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={currentPin}
                  onChangeText={setCurrentPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry={!showCurrent}
                  placeholder="Enter current PIN"
                  placeholderTextColor={designSystem.colors.neutral.textTertiary}
                />
                <TouchableOpacity 
                  onPress={() => setShowCurrent(!showCurrent)} 
                  style={styles.eyeBtn}
                  accessibilityLabel={showCurrent ? 'Hide PIN' : 'Show PIN'}
                >
                  <Ionicons 
                    name={showCurrent ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={designSystem.colors.neutral.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New PIN</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry={!showNew}
                  placeholder="Enter new PIN"
                  placeholderTextColor={designSystem.colors.neutral.textTertiary}
                />
                <TouchableOpacity 
                  onPress={() => setShowNew(!showNew)} 
                  style={styles.eyeBtn}
                  accessibilityLabel={showNew ? 'Hide PIN' : 'Show PIN'}
                >
                  <Ionicons 
                    name={showNew ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={designSystem.colors.neutral.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New PIN</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry={!showConfirm}
                  placeholder="Confirm new PIN"
                  placeholderTextColor={designSystem.colors.neutral.textTertiary}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirm(!showConfirm)} 
                  style={styles.eyeBtn}
                  accessibilityLabel={showConfirm ? 'Hide PIN' : 'Show PIN'}
                >
                  <Ionicons 
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color={designSystem.colors.neutral.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, !isValid && styles.buttonDisabled]} 
              onPress={handleChangePin}
              disabled={!isValid || loading}
              accessibilityLabel="Change PIN"
            >
              <Text style={styles.buttonText}>
                {loading ? 'Changing PIN...' : 'Change PIN'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
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
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16 },
  description: { 
    ...designSystem.typography.textStyles.body, 
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 24,
  },
  inputGroup: { marginBottom: 16 },
  label: { 
    ...designSystem.typography.textStyles.bodySm, 
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
  },
  eyeBtn: {
    padding: 12,
  },
  button: {
    height: 52,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: designSystem.colors.neutral.border,
  },
  buttonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
    fontWeight: '600',
  },
});
