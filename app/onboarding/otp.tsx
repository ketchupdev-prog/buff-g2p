import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState, useEffect } from 'react';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { verifyOtp } from '@/services/auth';

const DS = designSystem;
const OTP_LENGTH = 5;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export default function OtpVerificationScreen() {
  const { profile, setProfile, setBuffrId } = useUser();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [verifying, setVerifying] = useState(false);
  const phoneNumber = profile?.phone ?? '+264';

  // S9: Rate-limiting state.
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // S9: Countdown effect — ticks every second while locked out.
  useEffect(() => {
    if (lockedUntil <= 0) {
      setLockoutRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      setLockoutRemaining(Math.max(0, left));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLockedOut = lockoutRemaining > 0;

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    // S9: Block submission while locked out.
    if (isLockedOut) return;

    const fullOtp = otp.join('');
    if (fullOtp.length !== OTP_LENGTH) {
      alert('Please enter the complete OTP.');
      return;
    }
    if (!profile?.phone) {
      alert('Phone number missing. Please go back and enter your phone.');
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyOtp(profile.phone, fullOtp);
      if (result.success && result.buffrId && result.cardNumberMasked) {
        // S9: Reset attempt counter on success.
        setAttempts(0);
        await setBuffrId(result.buffrId, result.cardNumberMasked, result.expiryDate ?? undefined);
        router.push('/onboarding/name');
      } else {
        // S9: Increment failed-attempt counter; lock out after MAX_ATTEMPTS.
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
        } else {
          alert('Invalid code. Please try again.');
        }
      }
    } catch (e) {
      console.error('Verify OTP error:', e);
      alert('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Can you please verify',
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
          We sent a code to {phoneNumber}
        </Text>

        {/* S9: Lockout banner — shown when too many failed attempts have occurred. */}
        {isLockedOut && (
          <View style={styles.lockoutBanner}>
            <Text style={styles.lockoutBannerText}>
              Too many attempts. Try again in {Math.floor(lockoutRemaining / 60)}m {lockoutRemaining % 60}s
            </Text>
          </View>
        )}

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref as TextInput)}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              value={digit}
              caretHidden={true} // Hide cursor
              editable={!isLockedOut && !verifying}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.resendButton} disabled={verifying || isLockedOut}>
          <Text style={styles.resendButtonText}>Resend code (60s)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, (verifying || isLockedOut) && styles.primaryButtonDisabled]}
          onPress={handleVerify}
          disabled={verifying || isLockedOut}
        >
          {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify</Text>}
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
  instructionText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    textAlign: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  otpInput: {
    width: 48, // Adjust width based on number of digits and spacing
    height: 56,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    borderRadius: designSystem.components.otpInput.borderRadius,
    textAlign: 'center',
    ...designSystem.typography.textStyles.title, // Larger font for OTP digits
    color: designSystem.colors.neutral.text,
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: designSystem.spacing.g2p.sectionSpacing * 2,
  },
  resendButtonText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.brand.primary,
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
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
    fontWeight: 'bold',
  },
  // S9: Lockout banner styles.
  lockoutBanner: {
    backgroundColor: DS.colors.feedback.red100,
    borderRadius: DS.radius.sm,
    paddingVertical: DS.spacing.scale.sm,
    paddingHorizontal: DS.spacing.scale.md,
    marginBottom: DS.spacing.scale.md,
  },
  lockoutBannerText: {
    ...DS.typography.textStyles.bodySm,
    color: DS.colors.semantic.error,
    textAlign: 'center',
    fontWeight: '600',
  },
});
