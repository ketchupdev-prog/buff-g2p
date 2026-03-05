/**
 * Proof of Life – Step 2: Biometric Scan – Buffr G2P.
 * Triggers biometric authentication and submits verification.
 * Part of 3-step proof-of-life wizard with ProgressIndicator.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItem } from '@/services/secureStorage';
import { designSystem } from '@/constants/designSystem';
import { ProgressIndicator, ErrorState } from '@/components/ui';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function submitProofOfLife(): Promise<{ success: boolean; error?: string }> {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: 'Verification failed. An internet connection is required for proof-of-life verification.',
    };
  }
  const timestamp = new Date().toISOString();
  try {
    const token = await getSecureItem('buffr_access_token');
    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/user/proof-of-life`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ method: 'in_app_biometric', timestamp }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) {
      await AsyncStorage.setItem('buffr_proof_of_life', timestamp);
      return { success: true };
    }
    return { success: false, error: data.error ?? 'Verification failed' };
  } catch {
    return {
      success: false,
      error: 'Verification failed. An internet connection is required for proof-of-life verification.',
    };
  }
}

export default function ProofOfLifeScanScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasCapability, setHasCapability] = useState(false);

  useEffect(() => {
    // Check biometric capability on mount
    checkBiometricCapability();
  }, []);

  async function checkBiometricCapability() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasCapability(hasHardware && isEnrolled);
    } catch (e) {
      console.error('checkBiometricCapability:', e);
      setHasCapability(false);
    } finally {
      setChecking(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      // Check hardware support
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setError(
          'Biometric authentication is not available on this device. Please visit your nearest agent with your ID.'
        );
        setLoading(false);
        return;
      }

      // Prompt biometric
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to continue receiving grants',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        if (result.error === 'user_cancel') {
          setError(null);
        } else {
          setError('Biometric verification was not completed. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Submit to backend
      const submitResult = await submitProofOfLife();
      if (submitResult.success) {
        router.replace('/proof-of-life/success' as never);
      } else {
        setError(submitResult.error ?? 'Verification failed. Please try again or visit an agent.');
      }
    } catch (e) {
      console.error('handleVerify:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Verify Identity',
          headerTitleStyle: {
            ...designSystem.typography.textStyles.title,
            color: designSystem.colors.neutral.text,
          },
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <ProgressIndicator currentStep={2} totalSteps={3} stepLabels={['Introduction', 'Verify', 'Complete']} />

      <View style={styles.container}>
        {checking ? (
          <>
            <ActivityIndicator size="large" color={designSystem.colors.brand.primary} />
            <Text style={styles.checkingText}>Checking biometric capability...</Text>
          </>
        ) : (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="finger-print" size={90} color={designSystem.colors.brand.primary} />
            </View>

            <Text style={styles.title}>Biometric Verification</Text>
            <Text style={styles.body}>
              {hasCapability
                ? 'Place your finger on the sensor or look at the camera to verify your identity.'
                : 'Biometric authentication is not set up on this device. You can visit an agent for in-person verification.'}
            </Text>

            {error && <ErrorState variant="auth" message={error} onRetry={handleVerify} style={{ marginTop: 20, width: '100%' }} />}

            <View style={styles.spacer} />

            <View style={styles.footer}>
              {hasCapability ? (
                <TouchableOpacity
                  style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
                  onPress={handleVerify}
                  disabled={loading}
                  accessibilityLabel="Start biometric verification"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="finger-print" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.verifyButtonText}>Verify Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.verifyButton, { backgroundColor: designSystem.colors.neutral.textSecondary }]}
                  onPress={() => router.push('/agents' as never)}
                >
                  <Ionicons name="location" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.verifyButtonText}>Find Nearest Agent</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  container: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: designSystem.spacing.g2p.sectionSpacing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkingText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 16,
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
  verifyButtonDisabled: { opacity: 0.6 },
  verifyButtonText: { ...designSystem.typography.textStyles.body, color: '#fff', fontWeight: '700' },
});
