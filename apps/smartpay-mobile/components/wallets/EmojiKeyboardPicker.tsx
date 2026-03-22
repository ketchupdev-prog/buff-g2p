/**
 * EmojiKeyboardPicker - Wallet emoji keyboard selector modal.
 *
 * Purpose:
 * - Opens a focused text input so users can pick an emoji using their keyboard.
 * - Reusable for add-wallet and wallet-settings screens.
 *
 * Location: components/wallets/EmojiKeyboardPicker.tsx
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { designSystem as DS } from '@/constants/designSystem';

interface EmojiKeyboardPickerProps {
  visible: boolean;
  initialValue?: string;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiKeyboardPicker({
  visible,
  initialValue = '💳',
  onClose,
  onSelect,
}: EmojiKeyboardPickerProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setValue(initialValue);
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [visible, initialValue]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSelect(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => null}>
          <Text style={styles.title}>Select Icon</Text>
          <Text style={styles.subtitle}>Use your keyboard to choose an emoji.</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={setValue}
            autoCorrect={false}
            autoCapitalize="none"
            placeholder="💳"
            placeholderTextColor={DS.colors.textTertiary}
            maxLength={8}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, !value.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!value.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    justifyContent: 'center',
    padding: DS.spacing.lg,
  },
  card: {
    backgroundColor: DS.colors.background,
    borderRadius: DS.radius.xl,
    padding: DS.spacing.lg,
    gap: DS.spacing.sm,
  },
  title: {
    fontSize: DS.typography.fontSize.lg,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
  },
  subtitle: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
  },
  input: {
    marginTop: DS.spacing.xs,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.surface,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.md,
    fontSize: 28,
    minHeight: 56,
    textAlign: 'center',
    color: DS.colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: DS.spacing.sm,
    marginTop: DS.spacing.sm,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.text,
    fontWeight: DS.typography.fontWeight.medium,
  },
  saveButton: {
    flex: 1,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.brand.primary,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: DS.typography.fontSize.base,
    color: '#fff',
    fontWeight: DS.typography.fontWeight.semibold,
  },
});
