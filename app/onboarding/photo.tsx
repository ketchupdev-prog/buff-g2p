import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

export default function PhotoUploadScreen() {
  const { profile, setProfile } = useUser();
  const [image, setImage] = useState<string | null>(profile?.photoUri ?? null);

  const pickImage = async () => {
    alert('Choose from Gallery functionality not implemented yet.');
    setImage('https://via.placeholder.com/150/0000FF/FFFFFF?text=Gallery'); // Placeholder image
  };

  const takePhoto = async () => {
    alert('Take Photo functionality not implemented yet.');
    setImage('https://via.placeholder.com/150/FF0000/FFFFFF?text=Camera'); // Placeholder image
  };

  const handleContinue = async () => {
    if (image) await setProfile({ photoUri: image });
    router.push('/onboarding/face-id'); // Navigate to Face ID Setup
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Add your photo',
          headerTitleStyle: {
            ...designSystem.typography.textStyles.title,
            color: designSystem.colors.neutral.text,
          },
          headerBackTitleVisible: false,
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <View style={styles.container}>
        <Text style={styles.instructionText}>
          Add a profile photo so your friends can recognize you.
        </Text>

        <View style={styles.photoContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>No Photo</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
          <Text style={styles.actionButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
          <Text style={styles.actionButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
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
  instructionText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    textAlign: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  photoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75, // Make it circular
    backgroundColor: designSystem.colors.neutral.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
    overflow: 'hidden', // Ensure image stays within bounds
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  actionButton: {
    height: designSystem.components.button.height,
    width: '100%',
    borderColor: designSystem.colors.neutral.border,
    borderWidth: 1,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing / 2,
  },
  actionButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    fontWeight: 'bold',
  },
  primaryButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  primaryButtonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
    fontWeight: 'bold',
  },
});