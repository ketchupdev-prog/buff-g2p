/**
 * OnboardingLayout Component
 *
 * Purpose: Figma-aligned onboarding layout with gradient background, top branding,
 * and a bottom-anchored white sheet (modal) for step content. Keeps onboarding
 * screens consistent: Buffr logo + tagline at top, soft gradient in the middle,
 * interactive content in a rounded white card at the bottom.
 * Location: mobile/components/layout/OnboardingLayout.tsx
 *
 * Features:
 * - Full-screen gradient background (designSystem.backgroundGradient)
 * - Top branding block: Buffr logo + "Your G2P payments companion"
 * - Bottom sheet: white card with rounded top corners (24px), contains progress + content
 * - Optional screenTitle and screenSubtitle inside the sheet (bold title, grey hint)
 * - Back button over gradient; optional Skip in header
 * - Optional step progress: pass currentStep/totalSteps/stepLabels only for multi-step flows (e.g. bills). Onboarding omits these so each screen is a standalone modal.
 * - KeyboardAvoidingView + ScrollView for scrollable step content
 *
 * Follows Buffr Figma: modals at the bottom, consistent layout across Phone, Verify, Name, Photo, Complete.
 */

import React, { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { designSystem } from '@/constants/designSystem';
import { ProgressIndicator } from '@/components/ui';

const DS = designSystem;
const SHEET_TOP_RADIUS = 24;
/** Figma §3.8.1 onboarding modals (44:461, 44:509, 45:712…): content padding 16px, CTA 361×52 #18181B, radius 16px. */
const ONBOARDING_SHEET_PADDING_H = 16;

interface OnboardingLayoutProps {
  children: ReactNode;
  /** Step title shown inside the sheet (e.g. "Tell us your mobile number") */
  screenTitle?: string;
  /** Hint/description below title (e.g. "Enter your mobile number to get started...") */
  screenSubtitle?: string;
  /** Optional: when provided, shows step progress (e.g. multi-step flows like bills). Omit for onboarding so each screen is a standalone modal. */
  currentStep?: number;
  totalSteps?: number;
  stepLabels?: string[];
  showSkip?: boolean;
  onSkip?: () => void;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
}

export function OnboardingLayout({
  children,
  screenTitle,
  screenSubtitle,
  currentStep,
  totalSteps,
  stepLabels,
  showSkip = false,
  onSkip,
  scrollable = true,
  contentContainerStyle,
}: OnboardingLayoutProps) {
  const gradientColors = [...(DS.colors.backgroundGradient.screenColors as readonly string[])];
  const gradientLocations = [...(DS.colors.backgroundGradient.screenLocations as readonly number[])];
  const insets = useSafeAreaInsets();
  const showStepIndicator =
    totalSteps != null && totalSteps > 0 && currentStep != null && currentStep >= 1;
  const onboardingGradient = (DS.colors.backgroundGradient as unknown as { onboarding?: { colors: string[]; locations: number[] } }).onboarding;
  /** Figma §3.8.1: Onboarding screens use solid white background #FFFFFF (no gradient/pink). */
  const useOnboardingSolidWhite = !showStepIndicator && !!onboardingGradient;
  const colors = useOnboardingSolidWhite
    ? (['#FFFFFF', '#FFFFFF'] as [string, string, ...string[]])
    : (gradientColors as [string, string, ...string[]]);
  const locations = useOnboardingSolidWhite
    ? ([0, 1] as [number, number, ...number[]])
    : (gradientLocations as [number, number, ...number[]]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding');
    }
  };

  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.round(windowHeight * 0.55);
  const sheetSpacerMinHeight = Math.round(windowHeight * 0.22);
  const sheetPaddingH = useOnboardingSolidWhite ? ONBOARDING_SHEET_PADDING_H : DS.spacing.g2p.horizontalPadding;

  const content = scrollable ? (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {screenTitle ? <Text style={styles.sheetTitle}>{screenTitle}</Text> : null}
        {screenSubtitle ? <Text style={styles.sheetSubtitle}>{screenSubtitle}</Text> : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={[styles.contentWrap, contentContainerStyle]}>
      {screenTitle ? <Text style={styles.sheetTitle}>{screenTitle}</Text> : null}
      {screenSubtitle ? <Text style={styles.sheetSubtitle}>{screenSubtitle}</Text> : null}
      {children}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {useOnboardingSolidWhite ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />
      ) : (
        <LinearGradient
          colors={colors}
          locations={locations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Top branding + back */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={DS.colors.neutral.text} />
          </TouchableOpacity>
          {showSkip && onSkip ? (
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
        <View style={styles.branding}>
          <Image
            source={require('../../assets/images/buffr_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Buffr</Text>
          <Text style={styles.brandTagline}>Your Next Payment Companion</Text>
        </View>
      </SafeAreaView>

      {/* Spacer pushes sheet to bottom of screen (Figma: modal anchored at bottom) */}
      <View style={[styles.sheetSpacer, { minHeight: sheetSpacerMinHeight }]} />

      {/* Bottom sheet: white card with content */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24, maxHeight: sheetMaxHeight }]}>
        <View style={[styles.sheetInner, { paddingHorizontal: sheetPaddingH }]}>
          {totalSteps != null && totalSteps > 0 && currentStep != null && currentStep >= 1 ? (
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={totalSteps}
              stepLabels={stepLabels}
            />
          ) : null}
          {content}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    paddingHorizontal: DS.spacing.g2p.horizontalPadding,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  skipButton: {
    padding: 8,
  },
  skipPlaceholder: {
    width: 40,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.colors.brand.primary,
  },
  branding: {
    alignItems: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 6,
  },
  brandTitle: {
    ...DS.typography.textStyles.titleLg,
    color: DS.colors.neutral.text,
    marginBottom: 2,
  },
  brandTagline: {
    ...DS.typography.textStyles.bodySm,
    color: DS.colors.neutral.textSecondary,
  },
  sheetSpacer: {
    flex: 1,
    minHeight: 0,
  },
  sheet: {
    flex: 0,
    backgroundColor: DS.colors.neutral.surface,
    borderTopLeftRadius: SHEET_TOP_RADIUS,
    borderTopRightRadius: SHEET_TOP_RADIUS,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  sheetInner: {
    paddingHorizontal: DS.spacing.g2p.horizontalPadding,
    paddingTop: 24,
    paddingBottom: 24,
  },
  sheetTitle: {
    ...DS.typography.textStyles.titleLg,
    color: DS.colors.neutral.text,
    marginBottom: 8,
  },
  sheetSubtitle: {
    ...DS.typography.textStyles.body,
    color: DS.colors.neutral.textSecondary,
    marginBottom: DS.spacing.g2p.sectionSpacing,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 0,
    paddingBottom: 24,
  },
  contentWrap: {
    flexGrow: 0,
    paddingBottom: 24,
  },
});
