import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { ErrorState, TextInput } from '@/components/ui';
import { OnboardingLayout } from '@/components/layout';

const COUNTRY_CODE = '+264';

export default function PhoneEntryScreen() {
  const { setProfile } = useUser();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 7) {
      setError('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    const fullPhoneClean = `${COUNTRY_CODE}${digits}`;
    await setProfile({ phone: fullPhoneClean });
    setError(null);
    router.push({ pathname: '/onboarding/email', params: { phone: fullPhoneClean } });
  };

  return (
    <OnboardingLayout
      screenTitle="Tell us Your Number"
      screenSubtitle="Enter your mobile number to get started with Buffr and access government payments."
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.inputRow}>
          <TextInput
            prefix={COUNTRY_CODE}
            prefixIcon="call-outline"
            placeholder="Enter number"
            keyboardType="phone-pad"
            value={phoneNumber}
              onChangeText={(t: string) => { setPhoneNumber(t); setError(null); }}
            maxLength={9}
            autoFormat="phone"
            countryCode={COUNTRY_CODE}
            clearable
            onClear={() => { setPhoneNumber(''); setError(null); }}
            error={error ?? undefined}
            containerStyle={styles.phoneInputWrap}
            inputStyle={styles.textInput}
          />
        </View>

        {error && (
          <ErrorState
            variant={error.includes('Network') ? 'network' : 'default'}
            message={error}
            onRetry={handleContinue}
            style={{ marginBottom: 16 }}
          />
        )}

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
  inputRow: {
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  phoneInputWrap: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  textInput: {
    flex: 1,
    paddingVertical: 0,
    minHeight: 24,
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
