import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { verifyOtp, requestOtp } from '@/services/auth';
import { OnboardingLayout } from '@/components/layout';

const DS = designSystem;
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60;

export default function OtpVerificationScreen() {
  const { profile, setBuffrId } = useUser();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [verifying, setVerifying] = useState(false);
  const phoneNumber = profile?.phone ?? '+264';
  const { devCode, channel: paramChannel, email: paramEmail } = useLocalSearchParams<{
    devCode?: string;
    channel?: string;
    email?: string;
  }>();
  const channel = (paramChannel === 'email' ? 'email' : 'sms') as 'sms' | 'email';
  const resendEmail = paramEmail ?? undefined;

  // Resend cooldown: start at 60s when screen mounts, then count down
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

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
        const result = await verifyOtp(
          profile.phone,
          fullOtp,
          (channel === 'email' && resendEmail) ? resendEmail : undefined
        );
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
          const msg = (result.error ?? "").toLowerCase().includes("expired")
            ? "Code expired. Please request a new code."
            : (result.error ?? "Invalid code. Please try again.");
          alert(msg);
        }
      }
    } catch (e) {
      console.error('Verify OTP error:', e);
      alert('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const otpSubtitle =
    channel === 'email' && resendEmail
      ? `We have sent an OTP to your ${resendEmail}. Please confirm it.`
      : `We have sent an OTP to your ${phoneNumber} phone number. Please confirm it.`;

  return (
    <OnboardingLayout
      screenTitle="Can you please verify"
      screenSubtitle={otpSubtitle}
      scrollable={false}
    >
      <View style={styles.container}>
        {devCode != null && devCode !== '' && (
          <View style={styles.devHint}>
            <Text style={styles.devHintText}>
              Your verification code: {devCode}
            </Text>
          </View>
        )}

        {/* S9: Lockout banner */}
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

        <TouchableOpacity
          style={styles.resendButton}
          disabled={verifying || isLockedOut || resendCooldown > 0}
          onPress={async () => {
            if (!profile?.phone || resendCooldown > 0) return;
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            try {
              const result = await requestOtp(
                profile.phone,
                channel === 'email' ? resendEmail : undefined,
                channel
              );
              if (!result.success) {
                alert(result.error ?? 'Could not resend code.');
                setResendCooldown(0);
              }
            } catch (e) {
              console.error('Resend OTP error:', e);
              alert('Could not resend code. Try again.');
              setResendCooldown(0);
            }
          }}
        >
          <Text style={styles.resendButtonText}>
            {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeNumberLink}
          onPress={() => router.replace('/onboarding/phone')}
          disabled={verifying}
        >
          <Text style={styles.changeNumberLinkText}>Change number</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, (verifying || isLockedOut) && styles.primaryButtonDisabled]}
          onPress={handleVerify}
          disabled={verifying || isLockedOut}
        >
          {verifying ? <ActivityIndicator color="#F4F4F5" /> : <Text style={styles.primaryButtonText}>Verify</Text>}
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  devHint: {
    backgroundColor: designSystem.colors.feedback?.yellow100 ?? '#fef3c7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  devHintText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral?.text ?? '#1f2937',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    borderRadius: 16,
    textAlign: 'center',
    ...designSystem.typography.textStyles.title,
    color: designSystem.colors.neutral.text,
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  resendButtonText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.brand.primary,
  },
  changeNumberLink: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  changeNumberLinkText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary ?? designSystem.colors.neutral.text,
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#18181B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: designSystem.spacing.g2p.sectionSpacing,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#F4F4F5',
    fontSize: 16,
    fontWeight: '600',
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
