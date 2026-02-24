/**
 * ErrorWithRetry – Buffr G2P.
 * Central error state with message and retry button. Use for failed loads or submit errors.
 * Location: components/common/ErrorWithRetry.tsx
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { designSystem } from '@/constants/designSystem';

const DS = designSystem;

interface ErrorWithRetryProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export function ErrorWithRetry({
  message,
  onRetry,
  title = 'Something went wrong',
}: ErrorWithRetryProps) {
  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLabel={`${title}. ${message}`}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.button}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.colors.neutral.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: DS.colors.neutral.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: DS.colors.brand.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
