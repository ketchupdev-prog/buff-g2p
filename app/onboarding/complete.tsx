import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import CardFrame from '@/components/cards/CardFrame';
import { useUser } from '@/contexts/UserContext';
import { getOrCreateBuffrId } from '@/services/auth';
import { ensurePrimaryWallet } from '@/services/wallets';

export default function OnboardingCompleteScreen() {
  const { profile, cardNumberMasked, expiryDate: contextExpiry, setBuffrId } = useUser();
  const [cardReady, setCardReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cardNumberMasked) {
        setCardReady(true);
        return;
      }
      if (!profile?.phone) {
        setCardReady(true);
        return;
      }
      try {
        const { buffrId, cardNumberMasked: masked, expiryDate } = await getOrCreateBuffrId(profile.phone);
        if (!cancelled) {
          await setBuffrId(buffrId, masked, expiryDate ?? undefined);
          // Create the Buffr Account (primary wallet) – idempotent, no-ops if already exists
          await ensurePrimaryWallet();
          setCardReady(true);
        }
      } catch (e) {
        console.error('getOrCreateBuffrId:', e);
        if (!cancelled) setCardReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.phone, cardNumberMasked, setBuffrId]);

  const handleGoToHome = async () => {
    try {
      await AsyncStorage.setItem('buffr_onboarding_complete', 'true');
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to set onboarding complete status', e);
      alert('Could not complete onboarding. Please try again.');
    }
  };

  const userName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  const cardNumber = cardNumberMasked ?? '';
  const expiryDate = contextExpiry ?? '--/--';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.heading}>Registration Completed</Text>
        <Text style={styles.instructionText}>
          Welcome to Buffr. Your account has been successfully created.
        </Text>

        <View style={styles.cardPreviewContainer}>
          {cardReady ? (
            <CardFrame
              userName={userName}
              cardNumber={cardNumber}
              expiryDate={expiryDate}
            />
          ) : (
            <View style={styles.cardPlaceholder}>
              <ActivityIndicator size="large" color={designSystem.colors.brand.primary} />
              <Text style={styles.cardPlaceholderText}>Preparing your card…</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleGoToHome}>
          <Text style={styles.primaryButtonText}>Go to Home</Text>
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
    justifyContent: 'center', // Center content vertically
  },
  icon: {
    width: 120,
    height: 120,
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
  cardPreviewContainer: {
    marginBottom: designSystem.spacing.g2p.sectionSpacing * 2,
  },
  cardPlaceholder: {
    minHeight: 214,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPlaceholderText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 12,
  },
  primaryButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'absolute', // Position at bottom
    bottom: designSystem.spacing.g2p.sectionSpacing,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
  },
  primaryButtonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
    fontWeight: 'bold',
  },
});
