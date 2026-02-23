import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { verifyOtp } from '@/services/auth';

const OTP_LENGTH = 5;

export default function OtpVerificationScreen() {
  const { profile, setProfile, setBuffrId } = useUser();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [verifying, setVerifying] = useState(false);
  const phoneNumber = profile?.phone ?? '+264';

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
        await setBuffrId(result.buffrId, result.cardNumberMasked, result.expiryDate ?? undefined);
        router.push('/onboarding/name');
      } else {
        alert('Invalid code. Please try again.');
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
          headerTitle: 'Verify code',
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
            />
          ))}
        </View>

        <TouchableOpacity style={styles.resendButton} disabled={verifying}>
          <Text style={styles.resendButtonText}>Resend code (60s)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleVerify} disabled={verifying}>
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
  primaryButtonText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
    fontWeight: 'bold',
  },
});
