import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

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
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Add user's details",
          headerTitleStyle: {
            ...designSystem.typography.textStyles.title,
            color: designSystem.colors.neutral.text,
          },
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <View style={styles.container}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter first name"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter last name"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

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
    height: designSystem.components.input.height,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    borderRadius: designSystem.components.input.borderRadius,
    paddingHorizontal: 15,
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
  },
  primaryButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  primaryButtonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
    fontWeight: 'bold',
  },
});
