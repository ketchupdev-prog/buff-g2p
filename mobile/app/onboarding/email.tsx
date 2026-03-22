/**
 * Email Entry – Buffr G2P onboarding.
 * Captures email for account recovery and OTP delivery. After phone entry, user enters email;
 * app calls requestOtp(phone, email, 'email') and navigates to OTP screen.
 * PRD §3.1 (2b), §7.6. Layout per Figma §3.8.1 (361×52 CTA, 16px radius).
 * Uses TextInput for clear button, validation, and consistent UX (DRY).
 */
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { requestOtp } from '@/services/auth';
import { ErrorState, TextInput } from '@/components/ui';
import { OnboardingLayout } from '@/components/layout';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailEntryScreen() {
  const { profile, setProfile } = useUser();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phoneFromParams = params.phone ?? profile?.phone ?? '';
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    const phone = phoneFromParams.replace(/\s/g, '') || profile?.phone;
    if (!phone) {
      setError('Phone number missing. Please go back and enter your phone.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const result = await requestOtp(phone, trimmed, 'email');
      if (result.success) {
        await setProfile({ email: trimmed });
        const query: Record<string, string> = { channel: 'email', email: trimmed };
        if (result.devCode) query.devCode = result.devCode;
        router.push({ pathname: '/onboarding/otp', params: query });
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
    <OnboardingLayout
      screenTitle="Enter your email"
      screenSubtitle="We'll send your verification code to this email address."
      scrollable={false}
    >
      <View style={styles.container}>
        <View style={styles.inputGroup}>
          <TextInput
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={(t: string) => { setEmail(t); setError(null); }}
            autoFormat="email"
            clearable
            onClear={() => { setEmail(''); setError(null); }}
            error={error ?? undefined}
            containerStyle={styles.inputContainer}
            inputStyle={styles.textInput}
          />
        </View>
        {error && (
          <ErrorState
            variant={error.includes('Network') ? 'network' : 'default'}
            message={error}
            onRetry={handleContinue}
            style={styles.errorBlock}
          />
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} disabled={sending}>
          {sending ? <ActivityIndicator color="#F4F4F5" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const DS = designSystem;
const ONBOARDING_RADIUS = 16;
const CTA_HEIGHT = 52;

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  inputGroup: {
    marginBottom: DS.spacing.g2p.sectionSpacing,
  },
  inputContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    borderRadius: 12,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 0,
    minHeight: 24,
  },
  errorBlock: {
    marginBottom: 16,
  },
  primaryButton: {
    height: CTA_HEIGHT,
    backgroundColor: '#18181B',
    borderRadius: ONBOARDING_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: DS.spacing.g2p.sectionSpacing,
  },
  primaryButtonText: {
    color: '#F4F4F5',
    fontSize: 16,
    fontWeight: '600',
  },
});
