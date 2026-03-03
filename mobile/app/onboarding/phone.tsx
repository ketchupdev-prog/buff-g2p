import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { requestOtp } from '@/services/auth';

const COUNTRY_CODE = '+264';

type SendChannel = 'sms' | 'email';

export default function PhoneEntryScreen() {
  const { setProfile } = useUser();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<SendChannel>('sms');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 7) {
      setError('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    if (channel === 'email') {
      const trimmed = email.trim();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError('Please enter a valid email address.');
        return;
      }
    }
    const fullPhone = `${COUNTRY_CODE} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
    await setProfile({ phone: fullPhone });
    setError(null);
    setSending(true);
    try {
      const result = await requestOtp(
        fullPhone,
        channel === 'email' ? email.trim() : undefined,
        channel
      );
      if (result.success) {
        router.push({ pathname: '/onboarding/otp', params: result.devCode ? { devCode: result.devCode } : {} });
      } else {
        setError(result.error ?? 'Could not send code. Try again.');
      }
    } catch (e) {
      setError('Network error. Check your connection and that the backend is running.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Tell us your mobile number',
          headerTitleStyle: {
            ...designSystem.typography.textStyles.title,
            color: designSystem.colors.neutral.text,
          },
          headerBackTitleVisible: false,
          headerTintColor: designSystem.colors.neutral.text, // Color of the back arrow
        }}
      />
      <View style={styles.container}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Country</Text>
          <View style={styles.countryCodeContainer}>
            <Text style={styles.countryCodeText}>+264</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.textInput}
            placeholder="81 234 5678"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            maxLength={9}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Send code by</Text>
          <View style={styles.channelRow}>
            <TouchableOpacity
              style={[styles.channelButton, channel === 'sms' && styles.channelButtonActive]}
              onPress={() => setChannel('sms')}
            >
              <Text style={[styles.channelButtonText, channel === 'sms' && styles.channelButtonTextActive]}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.channelButton, channel === 'email' && styles.channelButtonActive]}
              onPress={() => setChannel('email')}
            >
              <Text style={[styles.channelButtonText, channel === 'email' && styles.channelButtonTextActive]}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {channel === 'email' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    marginBottom: 8, // Small spacing below label
  },
  countryCodeContainer: {
    height: designSystem.components.input.height,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: designSystem.components.input.borderRadius,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  countryCodeText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
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
    marginTop: 'auto', // Push button to the bottom
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  primaryButtonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
    fontWeight: 'bold',
  },
  errorText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.semantic?.error ?? '#b91c1c',
    marginTop: 8,
    textAlign: 'center',
  },
  channelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  channelButton: {
    flex: 1,
    height: designSystem.components.input.height,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: designSystem.components.input.borderRadius,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  channelButtonActive: {
    borderColor: designSystem.colors.brand.primary,
    backgroundColor: designSystem.colors.brand.primary + '15',
  },
  channelButtonText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
  },
  channelButtonTextActive: {
    color: designSystem.colors.brand.primary,
    fontWeight: '600',
  },
});
