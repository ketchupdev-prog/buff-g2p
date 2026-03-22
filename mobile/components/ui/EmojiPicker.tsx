/**
 * EmojiPicker – bottom sheet with a grid of emoji options.
 * Used in: add-wallet, loans/apply (add details), future group/wallet rename flows.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from './BottomSheet';

const DEFAULT_EMOJIS = [
  ['📊', '💰', '🎁', '💼', '🏦', '🎮', '✈️', '🏠'],
  ['🎓', '🚗', '💊', '🛍️', '🌱', '🎵', '⚽', '🍕'],
  ['❤️', '🌟', '🔥', '💎', '🎯', '📱', '🎨', '🏋️'],
  ['💰', '🏦', '🎯', '📊', '💼', '🔑', '🏠', '🚗'],
  ['⚡', '📱', '🍕', '✈️', '💊', '🛍️', '🌱', '🎵'],
  ['❤️', '🌟', '🔥', '💎', '🎮', '⚽', '🎨', '🏆'],
];

interface EmojiPickerProps {
  visible: boolean;
  selected: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  emojis?: string[][];
}

export function EmojiPicker({
  visible,
  selected,
  onSelect,
  onClose,
  emojis = DEFAULT_EMOJIS,
}: EmojiPickerProps) {
  const all = emojis.flat();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Choose Icon" maxHeight="60%">
      <ScrollView contentContainerStyle={styles.grid}>
        {all.map((emoji, i) => (
          <TouchableOpacity
            key={`${emoji}-${i}`}
            style={[styles.cell, selected === emoji && styles.cellActive]}
            onPress={() => { onSelect(emoji); onClose(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

/** Tappable icon circle that opens the picker */
interface EmojiIconProps {
  value: string;
  onPress: () => void;
  size?: number;
}
export function EmojiIcon({ value, onPress, size = 80 }: EmojiIconProps) {
  return (
    <View style={styles.iconWrap}>
      <TouchableOpacity
        style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2 }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.iconEmoji, { fontSize: size * 0.45 }]}>{value}</Text>
      </TouchableOpacity>
      <Text style={styles.iconHint}>Tap to change icon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingBottom: 8 },
  cell: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  cellActive: { backgroundColor: '#DBEAFE', borderWidth: 2, borderColor: '#2563EB' },
  emoji: { fontSize: 28 },
  cancelBtn: {
    paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 14, marginTop: 8,
  },
  cancelText: { fontSize: 16, color: '#3B82F6', fontWeight: '500' },
  // Icon circle (tap target)
  iconWrap: { alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2, borderColor: '#0029D6',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  iconEmoji: {},
  iconHint: { fontSize: 12, color: '#9CA3AF' },
});
