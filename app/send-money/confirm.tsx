/**
 * Send Money – Confirm – Buffr G2P.
 * 2FA (PIN) before sending. §3.4 screen 29.
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { sendMoney } from '@/services/send';

const PIN_LENGTH = 6;

export default function ConfirmSendScreen() {
  const { recipientPhone, recipientName, amount, note, walletId } = useLocalSearchParams<{
    recipientPhone: string;
    recipientName: string;
    amount: string;
    note?: string;
    walletId?: string;
  }>();

  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  function handlePinChange(text: string, index: number) {
    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);
    if (text && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: { nativeEvent: { key: string } }, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleConfirm() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) {
      setError('Please enter your full PIN.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const result = await sendMoney({
        recipientPhone: recipientPhone ?? '',
        amount: parseFloat(amount ?? '0'),
        note: note ?? undefined,
        walletId: walletId ?? undefined,
        pin: fullPin,
      });
      if (result.success) {
        router.replace({
          pathname: '/send-money/success',
          params: {
            recipientName,
            amount,
            transactionId: result.transactionId ?? '',
          },
        } as never);
      } else {
        setError(result.error ?? 'Transfer failed. Please try again.');
        setPin(Array(PIN_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Confirm Send',
          headerTitleStyle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
          headerBackTitleVisible: false,
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>To</Text>
              <Text style={styles.summaryValue}>{recipientName || recipientPhone}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={[styles.summaryValue, styles.amount]}>N$ {parseFloat(amount ?? '0').toFixed(2)}</Text>
            </View>
            {note ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Note</Text>
                <Text style={styles.summaryValue}>{note}</Text>
              </View>
            ) : null}
          </View>

          {/* PIN */}
          <Text style={styles.pinLabel}>Enter your PIN to confirm</Text>
          <View style={styles.pinRow}>
            {pin.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => (inputRefs.current[i] = r as TextInput)}
                style={[styles.pinBox, digit ? styles.pinBoxFilled : null, error ? styles.pinBoxError : null]}
                value={digit}
                onChangeText={(t) => handlePinChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry
                caretHidden
                accessibilityLabel={`PIN digit ${i + 1}`}
              />
            ))}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleConfirm}
            disabled={sending}
            accessibilityLabel="Send money"
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.sendButtonText}>Send N$ {parseFloat(amount ?? '0').toFixed(2)}</Text>
              </>
            )}
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
  summaryCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.md,
    padding: designSystem.spacing.scale.md,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
    ...designSystem.shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
  },
  summaryLabel: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary },
  summaryValue: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.text, fontWeight: '500' },
  amount: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.brand.primary, fontWeight: '700' },
  pinLabel: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: designSystem.spacing.scale.md,
  },
  pinBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: designSystem.colors.neutral.border,
    borderRadius: designSystem.components.otpInput.borderRadius,
    textAlign: 'center',
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  pinBoxFilled: { borderColor: designSystem.colors.brand.primary },
  pinBoxError: { borderColor: designSystem.colors.semantic.error },
  errorText: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.semantic.error,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: { padding: designSystem.spacing.g2p.horizontalPadding, paddingBottom: designSystem.spacing.g2p.sectionSpacing },
  sendButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { ...designSystem.typography.textStyles.body, color: '#fff', fontWeight: '700' },
});
