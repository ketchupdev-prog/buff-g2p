/**
 * Edit Profile – Buffr G2P.
 * §3.5 Settings sub-screen. Editable name, photo, phone; persists to UserContext (AsyncStorage).
 * Optional backend sync when API is available.
 * Location: app/(tabs)/profile/edit-profile.tsx
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { pickImageFromGallery } from '@/services/device';

export default function EditProfileScreen() {
  const { profile, setProfile } = useUser();
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(profile?.photoUri ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickPhoto = useCallback(async () => {
    const uri = await pickImageFromGallery();
    if (uri) setPhotoUri(uri);
  }, []);

  const validate = useCallback((): boolean => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst && !trimmedLast) {
      setError('Please enter at least a first or last name.');
      return false;
    }
    setError(null);
    return true;
  }, [firstName, lastName]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      await setProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || '',
        photoUri: photoUri || null,
      });
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('EditProfile save:', e);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, phone, photoUri, setProfile, validate]);

  const initials =
    (firstName.trim()[0] ?? '')?.toUpperCase() + (lastName.trim()[0] ?? '')?.toUpperCase() || '?';

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
        </View>

        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo */}
            <View style={styles.photoSection}>
              <TouchableOpacity
                onPress={handlePickPhoto}
                style={styles.avatarTouch}
                accessibilityLabel="Change profile photo"
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.photoHint}>Tap to change photo</Text>
            </View>

            {/* Form */}
            <View style={styles.card}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +264 81 123 4567"
                placeholderTextColor={designSystem.colors.neutral.textTertiary}
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              accessibilityLabel="Save profile"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
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
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 24, paddingBottom: 32 },
  photoSection: { alignItems: 'center', marginBottom: 24 },
  avatarTouch: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: designSystem.colors.brand.primary,
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: designSystem.colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textTertiary, marginTop: 8 },
  card: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  label: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginBottom: 6 },
  input: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  errorText: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.semantic.error,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: '#fff' },
});
