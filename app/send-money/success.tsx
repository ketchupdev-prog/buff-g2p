/**
 * Send Money – Success – Buffr G2P.
 * §3.4 screen 30 / Figma 87:410.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function SendSuccessScreen() {
  const { recipientName, amount, transactionId } = useLocalSearchParams<{
    recipientName: string;
    amount: string;
    transactionId?: string;
  }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={designSystem.colors.semantic.success} />
        </View>
        <Text style={styles.title}>Transfer Successful!</Text>
        <Text style={styles.subtitle}>
          You sent <Text style={styles.highlight}>N$ {parseFloat(amount ?? '0').toFixed(2)}</Text>
          {'\n'}to <Text style={styles.highlight}>{recipientName || 'Recipient'}</Text>
        </Text>
        {transactionId ? (
          <View style={styles.refBox}>
            <Text style={styles.refLabel}>Reference</Text>
            <Text style={styles.refValue}>{transactionId}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)' as never)}
            accessibilityLabel="Go to home"
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
          {transactionId && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(`/transactions/${transactionId}` as never)}
              accessibilityLabel="View transaction details"
            >
              <Text style={styles.secondaryButtonText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
  },
  iconContainer: { marginBottom: 24 },
  title: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
  },
  highlight: {
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
  },
  refBox: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 40,
    ...designSystem.shadows.sm,
  },
  refLabel: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary },
  refValue: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.text, fontWeight: '600', marginTop: 2 },
  actions: { width: '100%' },
  primaryButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { ...designSystem.typography.textStyles.body, color: '#fff', fontWeight: '700' },
  secondaryButton: {
    height: designSystem.components.button.height,
    borderWidth: 1.5,
    borderColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: { ...designSystem.typography.textStyles.body, color: designSystem.colors.brand.primary, fontWeight: '600' },
});
