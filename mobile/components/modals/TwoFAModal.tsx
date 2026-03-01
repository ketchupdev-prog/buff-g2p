/**
 * TwoFAModal – Buffr G2P.
 * Reusable 6-digit PIN verification modal. PRD §3.12.2 screen 48.
 * Use for: voucher redeem, send money, group send/request, cash-out, merchant pay, loan apply.
 * Location: components/modals/TwoFAModal.tsx
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { designSystem } from '@/constants/designSystem';

const DS = designSystem;
const PIN_LENGTH = 6;

function useLockoutCountdown(lockoutUntil: number): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (lockoutUntil <= 0) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setRemaining(Math.max(0, left));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);
  return remaining;
}

export interface TwoFAModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with PIN; return { success, error?, retryAfterSeconds? }. On success, modal calls onSuccess then closes. */
  onVerify: (pin: string) => Promise<{ success: boolean; error?: string; retryAfterSeconds?: number }>;
  /** Called after successful verify, before closing. Use for navigation when PIN is only confirmation (e.g. NamPost flow). */
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export function TwoFAModal({
  visible,
  onClose,
  onVerify,
  onSuccess,
  title = 'Verify Identity',
  subtitle = 'Enter your 6-digit PIN to confirm',
}: TwoFAModalProps) {
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  function handlePinChange(text: string, index: number) {
    const next = [...pin];
    next[index] = text;
    setPin(next);
    setError(null);
    if (text && index < PIN_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  async function handleVerify() {
    const fullPin = pin.join('');
    if (fullPin.length < PIN_LENGTH) {
      setError('Please enter your full PIN.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await onVerify(fullPin);
      if (result.success) {
        setPin(Array(PIN_LENGTH).fill(''));
        onSuccess?.();
        onClose();
      } else {
        if (result.retryAfterSeconds != null && result.retryAfterSeconds > 0) {
          setLockoutUntil(Date.now() + result.retryAfterSeconds * 1000);
        }
        setError(result.error ?? 'Verification failed. Please try again.');
        setPin(Array(PIN_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setPin(Array(PIN_LENGTH).fill(''));
    setError(null);
    onClose();
  }

  const lockoutRemaining = useLockoutCountdown(lockoutUntil);
  const isLockedOut = lockoutRemaining > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.pinRow}>
            {pin.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => (inputRefs.current[i] = r as TextInput)}
                style={[
                  styles.pinBox,
                  digit ? styles.pinBoxFilled : null,
                  error ? styles.pinBoxError : null,
                ]}
                value={digit}
                onChangeText={(t) => handlePinChange(t, i)}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === 'Backspace' && !pin[i] && i > 0) {
                    inputRefs.current[i - 1]?.focus();
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry
                caretHidden
                editable={!loading && !isLockedOut}
              />
            ))}
          </View>
          {isLockedOut ? (
            <Text style={styles.lockoutText}>Too many attempts. Try again in {lockoutRemaining}s</Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.verifyBtn, (loading || isLockedOut) && styles.verifyBtnDisabled]}
              onPress={handleVerify}
              disabled={loading || isLockedOut}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 28 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  pinBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: DS.colors.neutral.text,
    backgroundColor: DS.colors.neutral.background,
  },
  pinBoxFilled: { borderColor: DS.colors.brand.primary, backgroundColor: '#fff' },
  pinBoxError: { borderColor: DS.colors.semantic.error },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, textAlign: 'center', marginBottom: 12 },
  lockoutText: { fontSize: 13, color: DS.colors.semantic.warning, textAlign: 'center', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, height: 52, borderWidth: 1.5, borderColor: DS.colors.neutral.border, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: DS.colors.neutral.textSecondary, fontWeight: '600' },
  verifyBtn: { flex: 1, height: 52, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
