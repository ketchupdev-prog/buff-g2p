import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import {
  checkBiometricCapability,
  enableBiometric,
  BiometricCapability,
} from '@/services/biometrics';
import { OnboardingLayout } from '@/components/layout';

export default function FaceIdSetupScreen() {
  useUser();
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkCapability();
  }, []);

  const checkCapability = async () => {
    try {
      const cap = await checkBiometricCapability();
      setCapability(cap);
    } catch (error) {
      console.error('Error checking biometric capability:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleEnable = async () => {
    if (!capability?.isAvailable) {
      Alert.alert(
        'Not Available',
        capability?.isEnrolled
          ? 'Biometric authentication is not available on this device.'
          : 'No biometric credentials enrolled. Please set up Face ID or Touch ID in your device settings first.',
        [
          { text: 'Skip for now', onPress: handleSkip },
          { text: 'OK' },
        ]
      );
      return;
    }

    try {
      setLoading(true);
      const result = await enableBiometric();

      if (result.success) {
        Alert.alert(
          'Success',
          'Biometric authentication enabled! You can now use it for quick sign-in and secure payments.',
          [{ text: 'Continue', onPress: () => router.push('/onboarding/complete') }]
        );
      } else {
        Alert.alert(
          'Failed',
          result.error || 'Could not enable biometric authentication',
          [
            { text: 'Try Again', onPress: handleEnable },
            { text: 'Skip', onPress: handleSkip },
          ]
        );
      }
    } catch (error) {
      console.error('Error enabling biometric:', error);
      Alert.alert('Error', 'An error occurred. Please try again or skip for now.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/complete');
  };

  const subtitle = capability?.isAvailable
    ? `Use ${capability.supportedTypes.join(' or ')} to quickly and securely access your Buffr account.`
    : 'Biometric authentication is not available on this device. You can skip and use PIN only.';

  return (
    <OnboardingLayout
      screenTitle="Enable Authentication"
      screenSubtitle={checking ? 'Checking biometric availability...' : subtitle}
      showSkip
      onSkip={handleSkip}
      scrollable={false}
    >
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />

        {checking ? (
          <ActivityIndicator size="large" color={designSystem.colors.brand.primary} style={{ marginVertical: 24 }} />
        ) : capability?.isAvailable ? (
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✓ Quick sign-in</Text>
            <Text style={styles.featureItem}>✓ Secure payments</Text>
            <Text style={styles.featureItem}>✓ Privacy protection</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, (!capability?.isAvailable || loading || checking) && styles.buttonDisabled]}
          onPress={handleEnable}
          disabled={loading || !capability?.isAvailable || checking}
        >
          {loading ? (
            <ActivityIndicator color="#F4F4F5" />
          ) : (
            <Text style={styles.primaryButtonText}>Enable</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSkip}
          disabled={loading || checking}
        >
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    alignItems: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  featureList: {
    marginVertical: 16,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  featureItem: {
    fontSize: 16,
    color: designSystem.colors.semantic.success,
    marginBottom: 12,
    fontWeight: '500',
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#F4F4F5',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 52,
    borderColor: designSystem.colors.neutral.border,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  secondaryButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: designSystem.colors.neutral.border,
    opacity: 0.6,
  },
});
