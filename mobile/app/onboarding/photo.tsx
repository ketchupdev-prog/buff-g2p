import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { pickImageFromGallery, captureImage } from '@/services/device';
import { OnboardingLayout } from '@/components/layout';
import { Ionicons } from '@expo/vector-icons';

export default function PhotoUploadScreen() {
  const { profile, setProfile } = useUser();
  const [image, setImage] = useState<string | null>(profile?.photoUri ?? null);
  const [loading, setLoading] = useState(false);
  const firstName = profile?.firstName ?? '';

  const pickImage = async () => {
    setLoading(true);
    try {
      const uri = await pickImageFromGallery();
      if (uri) setImage(uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (image) await setProfile({ photoUri: image });
    router.push('/onboarding/face-id');
  };

  const handleSkip = () => {
    router.push('/onboarding/face-id');
  };

  const subtitle = firstName
    ? `Upload a profile picture to personalize your account, ${firstName}.`
    : 'Upload a profile picture to personalize your account.';

  return (
    <OnboardingLayout
      screenTitle="Add a Photo"
      screenSubtitle={subtitle}
      showSkip
      onSkip={handleSkip}
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.photoContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {firstName ? firstName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
            <Ionicons name="camera" size={20} color={designSystem.colors.neutral.surface} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
          <Ionicons name="cloud-upload-outline" size={20} color={designSystem.colors.neutral.text} />
          <Text style={styles.actionButtonText}>Upload from Gallery</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
            <Text style={styles.secondaryButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, !image && styles.primaryButtonDisabled]}
            onPress={handleContinue}
            disabled={!image}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    alignItems: 'center',
  },
  photoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: designSystem.colors.brand.primary50 ?? designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
    overflow: 'hidden',
    position: 'relative',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    ...designSystem.typography.textStyles.display,
    color: designSystem.colors.brand.primary,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designSystem.colors.neutral.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    height: 52,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderColor: designSystem.colors.neutral.border,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: designSystem.colors.neutral.surface,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  actionButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 24,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderColor: designSystem.colors.neutral.border,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#F4F4F5',
    fontSize: 16,
    fontWeight: '600',
  },
});