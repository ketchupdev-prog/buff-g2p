import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designSystem } from '@/constants/designSystem';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/buffr_logo.png')} // Adjust path as necessary
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome to Buffr</Text>
        <Text style={styles.subtitle}>Your G2P payments companion</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/onboarding/phone')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <Link href="/onboarding/phone" asChild>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white', // Assuming a white background for onboarding
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.sectionSpacing,
    paddingBottom: designSystem.spacing.g2p.contentBottomPadding, // Push content up
  },
  logo: {
    width: 150, // Placeholder size
    height: 150, // Placeholder size
    marginBottom: designSystem.spacing.g2p.sectionSpacing * 2,
  },
  title: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.text,
    marginBottom: designSystem.spacing.g2p.sectionSpacing / 2,
    textAlign: 'center',
  },
  subtitle: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: designSystem.spacing.g2p.sectionSpacing * 2,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    position: 'absolute', // Position buttons at the bottom
    bottom: designSystem.spacing.g2p.sectionSpacing,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding, // Use horizontalPadding for consistency
  },
  primaryButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing / 2,
  },
  primaryButtonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body, // Assuming body text style for buttons
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: designSystem.components.button.height,
    borderColor: designSystem.colors.brand.primary,
    borderWidth: 1,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: designSystem.colors.brand.primary,
    ...designSystem.typography.textStyles.body, // Assuming body text style for buttons
    fontWeight: 'bold',
  },
});
