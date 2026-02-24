import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
// import * as LocalAuthentication from 'expo-local-authentication'; // Will be needed for actual implementation

export default function FaceIdSetupScreen() {
  useUser(); // Ensure UserContext is applied in onboarding flow
  const handleEnable = async () => {
    // In a real app, prompt for biometric authentication
    // const hasHardware = await LocalAuthentication.hasHardwareAsync();
    // const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    // if (hasHardware && isEnrolled) {
    //   const authenticated = await LocalAuthentication.authenticateAsync();
    //   if (authenticated.success) {
    //     console.log('Biometrics enabled');
    //     router.push('/onboarding/complete');
    //   } else {
    //     alert('Biometric authentication failed or cancelled.');
    //   }
    // } else {
    //   alert('Biometric hardware not available or not enrolled.');
    //   router.push('/onboarding/complete'); // Skip if not available
    // }
    alert('Enable Biometrics functionality not implemented yet.');
    router.push('/onboarding/complete'); // Navigate to Completion
  };

  const handleSkip = () => {
    console.log('Biometrics skipped');
    router.push('/onboarding/complete'); // Navigate to Completion
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Enable Authentication',
          headerTitleStyle: {
            ...designSystem.typography.textStyles.title,
            color: designSystem.colors.neutral.text,
          },
          headerBackTitleVisible: false,
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/icon.png')} // Placeholder for Face ID icon
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.heading}>Enable Authentication</Text>
        <Text style={styles.instructionText}>
          Use Face ID to quickly and securely access your Buffr account.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={handleEnable}>
          <Text style={styles.primaryButtonText}>Enable</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
          <Text style={styles.secondaryButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingTop: designSystem.spacing.g2p.sectionSpacing,
    alignItems: 'center',
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: designSystem.spacing.g2p.sectionSpacing * 1.5,
  },
  heading: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.text,
    marginBottom: designSystem.spacing.g2p.sectionSpacing / 2,
    textAlign: 'center',
  },
  instructionText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing * 2,
  },
  primaryButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: designSystem.spacing.g2p.sectionSpacing / 2,
    marginTop: 'auto', // Push to bottom
  },
  primaryButtonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: designSystem.components.button.height,
    borderColor: designSystem.colors.brand.primary,
    borderWidth: 1,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  secondaryButtonText: {
    color: designSystem.colors.brand.primary,
    ...designSystem.typography.textStyles.body,
    fontWeight: 'bold',
  },
});
