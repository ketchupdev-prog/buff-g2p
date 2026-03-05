import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

const CTA_HEIGHT = 52;
const BUTTON_RADIUS = 16;

export default function WelcomeScreen() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={designSystem.colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background} />
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/buffr_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome to Buffr</Text>
        <Text style={styles.subtitle}>Your G2P payments companion</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/onboarding/phone')}
          activeOpacity={0.8}
          accessibilityLabel="Get Started"
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/onboarding/phone')}
          activeOpacity={0.8}
          accessibilityLabel="Sign In"
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.sectionSpacing,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  title: {
    ...designSystem.typography.textStyles.display,
    color: designSystem.colors.neutral.text,
    marginBottom: designSystem.spacing.g2p.sectionSpacing / 2,
    textAlign: 'center',
  },
  subtitle: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingBottom: designSystem.spacing.g2p.sectionSpacing + 24,
    gap: 12,
  },
  secondaryButton: {
    height: CTA_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    borderRadius: BUTTON_RADIUS,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: designSystem.colors.neutral.text,
    ...designSystem.typography.textStyles.body,
    fontWeight: (designSystem.typography.fontWeight.semibold as '600'),
  },
  primaryButton: {
    height: CTA_HEIGHT,
    backgroundColor: designSystem.colors.neutral.text,
    borderRadius: BUTTON_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: designSystem.colors.neutral.surface,
    ...designSystem.typography.textStyles.body,
    fontWeight: (designSystem.typography.fontWeight.semibold as '600'),
  },
});
