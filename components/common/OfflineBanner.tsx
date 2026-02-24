/**
 * OfflineBanner – Buffr G2P.
 * Shown when the app is offline; optional retry or dismiss.
 * Location: components/common/OfflineBanner.tsx
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { designSystem } from '@/constants/designSystem';

const DS = designSystem;

interface OfflineBannerProps {
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function OfflineBanner({
  message = 'You\'re offline. Some features may be limited.',
  onRetry,
  showRetry = !!onRetry,
}: OfflineBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLabel={message}>
      <Text style={styles.text}>{message}</Text>
      {showRetry && onRetry && (
        <Text
          style={styles.retry}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry connection"
        >
          Retry
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: DS.colors.semantic.warning,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  retry: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
});
