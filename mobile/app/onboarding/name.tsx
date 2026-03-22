import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { OnboardingLayout } from '@/components/layout';

export default function NameEntryScreen() {
  const { profile, setProfile } = useUser();
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');

  useEffect(() => {
    if (profile?.firstName) setFirstName(profile.firstName);
    if (profile?.lastName) setLastName(profile.lastName);
  }, [profile?.firstName, profile?.lastName]);

  const handleContinue = async () => {
    const first = firstName.trim();
    const last = lastName.trim();
    if (first && last) {
      await setProfile({ firstName: first, lastName: last });
      router.push('/onboarding/photo');
    } else {
      alert('Please enter your first and last name.');
    }
  };

  return (
    <OnboardingLayout
      screenTitle="Add user's details"
      screenSubtitle="Please enter your legal name as it appears on your ID document."
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="First Name"
            placeholderTextColor={designSystem.colors.neutral.textTertiary}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Last Name"
            placeholderTextColor={designSystem.colors.neutral.textTertiary}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  inputGroup: {
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  label: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  primaryButtonText: {
    color: '#F4F4F5',
    fontSize: 16,
    fontWeight: '600',
  },
});
