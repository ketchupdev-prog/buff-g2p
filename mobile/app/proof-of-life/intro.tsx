/**
 * Proof of Life – Step 1: Introduction – Buffr G2P.
 * Explains why verification is needed and provides overview.
 * Part of 3-step proof-of-life wizard with ProgressIndicator.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { ProgressIndicator } from '@/components/ui';

export default function ProofOfLifeIntroScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Proof of Life',
          headerTitleStyle: {
            ...designSystem.typography.textStyles.title,
            color: designSystem.colors.neutral.text,
          },
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <ProgressIndicator currentStep={1} totalSteps={3} stepLabels={['Introduction', 'Verify', 'Complete']} />

      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={80} color={designSystem.colors.brand.primary} />
        </View>

        <Text style={styles.title}>Identity Verification</Text>
        <Text style={styles.body}>
          Every 90 days, we need to confirm you're still eligible to receive grants. This helps prevent fraud and
          ensures funds reach the right people.
        </Text>

        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>How it works</Text>
          <Step number="1" text="Tap 'Start Verification' below" />
          <Step number="2" text="Complete face ID or fingerprint scan on your device" />
          <Step number="3" text="Your verification is confirmed for 90 days" />
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => router.push('/proof-of-life/scan' as never)}
            accessibilityLabel="Start verification"
          >
            <Ionicons name="finger-print" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.verifyButtonText}>Start Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.agentButton} onPress={() => router.push('/agents' as never)}>
            <Text style={styles.agentButtonText}>Find an Agent Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  container: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: designSystem.spacing.g2p.sectionSpacing,
    alignItems: 'center',
  },
  iconContainer: { marginBottom: 24 },
  title: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 320,
  },
  stepCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.lg,
    padding: designSystem.spacing.scale.xl,
    width: '100%',
    marginBottom: 20,
    ...designSystem.shadows.sm,
  },
  stepTitle: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
    marginBottom: 16,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  stepNumText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.brand.primary,
    fontWeight: '700',
  },
  stepText: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.text,
    flex: 1,
    lineHeight: 20,
  },
  spacer: { flex: 1 },
  footer: {
    width: '100%',
    paddingBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  verifyButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyButtonText: { ...designSystem.typography.textStyles.body, color: '#fff', fontWeight: '700' },
  agentButton: {
    height: designSystem.components.button.height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.brand.primary,
    fontWeight: '600',
  },
});
