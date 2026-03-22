import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import CardFrame from '@/components/cards/CardFrame';
import { useUser } from '@/contexts/UserContext';
import { generateBuffrIdFromPhone } from '@/services/auth';
import { ensurePrimaryWallet } from '@/services/wallets';
import { OnboardingLayout } from '@/components/layout';

export default function OnboardingCompleteScreen() {
  const { profile, cardNumberMasked, expiryDate: contextExpiry, setBuffrId, isLoaded } = useUser();
  const [cardReady, setCardReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    const timer = setTimeout(() => {
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
          const { buffrId, cardNumberMasked: masked } = await generateBuffrIdFromPhone(profile.phone);
          if (!cancelled) {
            await setBuffrId(buffrId, masked, null);
            await ensurePrimaryWallet();
            setCardReady(true);
          }
        } catch (e) {
          console.error('generateBuffrIdFromPhone:', e);
          if (!cancelled) setCardReady(true);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [profile?.phone, cardNumberMasked, setBuffrId, isLoaded]);

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
    <OnboardingLayout
      screenTitle="Registration Completed"
      screenSubtitle="Your account has been verified successfully. Let's get started with Buffr!"
      scrollable={true}
    >
      <View style={styles.container}>
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

      {profile && (profile.firstName || profile.email) && (
        <View style={styles.profileRow}>
          {profile.photoUri ? (
            <Image source={{ uri: profile.photoUri }} style={styles.profileAvatar} />
          ) : (
            <View style={styles.profileAvatarPlaceholder}>
              <Text style={styles.profileAvatarLetter}>
                {(profile.firstName ?? profile.email ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName || 'User'}</Text>
            {profile.email ? (
              <Text style={styles.profileEmail}>{profile.email}</Text>
            ) : null}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={handleGoToHome}>
        <Text style={styles.primaryButtonText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  cardPreviewContainer: {
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  profileAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatarLetter: {
    ...designSystem.typography.textStyles.title,
    color: designSystem.colors.brand.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
  },
  profileEmail: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.brand.primary,
    marginTop: 2,
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  primaryButtonText: {
    color: '#F4F4F5',
    fontSize: 16,
    fontWeight: '600',
  },
});
