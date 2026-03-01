/**
 * HeaderBackButton – Buffr G2P.
 * Back control for stack headers. When history is empty (e.g. deep link), replaces to Home per PRD §6.4.
 * Use in Stack.Screen options.headerLeft or layout screenOptions.
 * Location: components/layout/HeaderBackButton.tsx
 */
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

const tint = designSystem.colors.neutral.text;

export function HeaderBackButton() {
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as never);
    }
  }

  return (
    <TouchableOpacity
      onPress={handleBack}
      style={styles.button}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="arrow-back" size={24} color={tint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginLeft: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
