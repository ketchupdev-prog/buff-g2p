/**
 * Edit Profile – Buffr G2P.
 * §3.5 Settings sub-screen. Edit name, photo, phone.
 * Location: app/(tabs)/profile/edit-profile.tsx
 */
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { updateProfile } from '@/services/profile';

export default function EditProfileScreen() {
  const { profile, setProfile } = useUser();
  
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [photoUri, setPhotoUri] = useState(profile?.photoUri ?? null);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = () => {
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'First name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        photoUrl: photoUri ?? undefined,
      });

      if (result.success) {
        // Update local context
        await setProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          photoUri: photoUri,
        });
        
        Alert.alert('Success', 'Your profile has been updated.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error ?? 'Failed to update profile');
      }
    } catch (e) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit profile</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
            disabled={!hasChanges || loading}
          >
            <Text style={[styles.saveBtnText, !hasChanges && styles.saveBtnTextDisabled]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Photo */}
            <View style={styles.photoSection}>
              <View style={styles.photoContainer}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="person" size={40} color={designSystem.colors.neutral.textTertiary} />
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.changePhotoBtn}>
                <Text style={styles.changePhotoText}>Change photo</Text>
              </TouchableOpacity>
            </View>

            {/* Phone (read-only) */}
            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{profile?.phone ?? '—'}</Text>
              </View>
              <Text style={styles.hint}>Phone number cannot be changed</Text>
            </View>

            {/* First Name */}
            <View style={styles.field}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={(text) => { setFirstName(text); handleChange(); }}
                placeholder="Enter first name"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                autoCapitalize="words"
              />
            </View>

            {/* Last Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={(text) => { setLastName(text); handleChange(); }}
                placeholder="Enter last name"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                autoCapitalize="words"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text, flex: 1 },
  saveBtn: { padding: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...designSystem.typography.textStyles.body, color: designSystem.colors.brand.primary, fontWeight: '600' },
  saveBtnTextDisabled: { color: designSystem.colors.neutral.textTertiary },
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16 },
  photoSection: { alignItems: 'center', marginBottom: 24 },
  photoContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', marginBottom: 12 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: designSystem.colors.neutral.border, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  changePhotoBtn: { padding: 4 },
  changePhotoText: { 
    ...designSystem.typography.textStyles.body, 
    color: designSystem.colors.brand.primary,
    fontWeight: '600',
  },
  field: { marginBottom: 16 },
  label: { 
    ...designSystem.typography.textStyles.bodySm, 
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    paddingHorizontal: 16,
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
  },
  readOnlyField: {
    height: 48,
    backgroundColor: designSystem.colors.neutral.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  readOnlyText: { 
    ...designSystem.typography.textStyles.body, 
    color: designSystem.colors.neutral.textTertiary 
  },
  hint: { 
    ...designSystem.typography.textStyles.caption, 
    color: designSystem.colors.neutral.textTertiary, 
    marginTop: 4 
  },
});
