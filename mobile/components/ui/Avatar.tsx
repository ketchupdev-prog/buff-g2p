/**
 * Avatar – initials circle with deterministic colour from name hash.
 * Used across: transactions, send-money, qr-code, groups, contacts.
 */
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

const AVATAR_COLORS = [
  '#0029D6', '#7C3AED', '#059669', '#D97706',
  '#DC2626', '#0891B2', '#0F766E', '#9333EA',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: number;
  fontSize?: number;
  color?: string;
  style?: ViewStyle;
}

export function Avatar({ name, size = 44, fontSize, color, style }: AvatarProps) {
  const bg = color ?? getAvatarColor(name);
  const fs = fontSize ?? Math.round(size * 0.38);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: fs }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { justifyContent: 'center', alignItems: 'center' },
  initials: { fontWeight: '700', color: '#fff' },
});
