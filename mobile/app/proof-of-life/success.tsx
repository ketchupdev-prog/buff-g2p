/**
 * Proof of Life – Step 3: Success – Buffr G2P.
 * Confirmation screen after successful biometric verification.
 * Part of 3-step proof-of-life wizard with ProgressIndicator.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { ProgressIndicator } from '@/components/ui';

export default function ProofOfLifeSuccessScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProgressIndicator currentStep={3} totalSteps={3} stepLabels={['Introduction', 'Verify', 'Complete']} />
      <View style={styles.container}>
        <Ionicons name="checkmark-circle" size={90} color={designSystem.colors.semantic.success} />
        <Text style={styles.title}>Verification Complete</Text>
        <Text style={styles.subtitle}>
          Thank you. Your identity has been verified and your wallet is active for another 90 days.
        </Text>
        <View style={styles.infoBox}>
          <Ionicons name="calendar-outline" size={18} color={designSystem.colors.brand.primary} style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>Next verification due in 90 days.</Text>
        </View>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)' as never)}
          accessibilityLabel="Return to home"
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  title: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  subtitle: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 300,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: designSystem.radius.md,
    padding: designSystem.spacing.scale.md,
    marginBottom: 48,
    width: '100%',
  },
  infoText: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.brand.primary, flex: 1 },
  homeButton: {
    width: '100%',
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: { ...designSystem.typography.textStyles.body, color: '#fff', fontWeight: '700' },
});
