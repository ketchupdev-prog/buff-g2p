/**
 * Invite to Smartpay Screen
 * 
 * Features:
 * - User invite code display (large, copyable)
 * - Format: "SP-INV-ABC12XY"
 * - Share button with pre-filled message
 * - Invite link: `smartpay://invite?code=ABC12XY`
 * - Referral count (optional)
 * - QR code for invite (optional)
 * 
 * Pattern: buffr-g2p invite + iOS share sheet
 * Location: app/(authenticated)/invite/index.tsx
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Clipboard,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { designSystem as ds } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateInviteCode, type InviteValidation } from '@/services/invite';

const PENDING_INVITE_CODE_KEY = 'smartpay_pending_invite_code';
const INVITE_BENEFITS = [
  'Easy mobile payments',
  'Multiple wallets for savings',
  'Secure transactions',
  '24/7 AI assistant',
] as const;

export default function InviteScreen() {
  const router = useRouter();
  const { profile } = useUser();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [referralCount] = useState(0);

  const inviteCode = profile?.inviteCode || 'SMART2024';
  const inviteLink = profile?.inviteLink || `smartpay://invite?code=${inviteCode}`;
  const formattedCode = `SP-INV-${inviteCode}`;
  const userName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'A friend';

  const deepLinkCode = useMemo(() => {
    const raw = typeof code === 'string' ? code : undefined;
    return raw ? raw.toUpperCase() : null;
  }, [code]);

  const [inviteValidation, setInviteValidation] = useState<InviteValidation | null>(null);
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!deepLinkCode) return;
      setIsValidatingInvite(true);
      try {
        const result = await validateInviteCode(deepLinkCode);
        if (!cancelled) setInviteValidation(result);
      } catch (e) {
        if (!cancelled) setInviteValidation({ valid: false, error: e instanceof Error ? e.message : 'Invite validation failed' });
      } finally {
        if (!cancelled) setIsValidatingInvite(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [deepLinkCode]);

  const handleContinueWithInvite = async () => {
    const nextCode = deepLinkCode ?? null;
    if (!nextCode) {
      Alert.alert('Error', 'Invite code is missing');
      return;
    }
    try {
      await AsyncStorage.setItem(PENDING_INVITE_CODE_KEY, nextCode);
      router.push('/onboarding/phone' as any);
    } catch (e) {
      console.error('Failed to store pending invite code:', e);
      Alert.alert('Error', 'Could not start onboarding with this invite');
    }
  };

  const shareMessage = `${userName} invited you to join Smartpay! 🎉\n\nGet started with mobile payments, wallets, and more.\n\nUse my invite code: ${formattedCode}\n\nDownload: ${inviteLink}`;

  const handleCopy = (value: string, successMessage: string) => {
    Clipboard.setString(value);
    Alert.alert('Copied', successMessage);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: shareMessage,
        title: 'Join Smartpay',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* AppHeader */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={ds.colors.neutral.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite to Smartpay</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Ionicons name="gift" size={64} color={ds.colors.brand.primary} />
          <Text style={styles.heroTitle}>Share the benefits</Text>
          <Text style={styles.heroSubtitle}>
            Invite friends to Smartpay and earn rewards together
          </Text>
        </View>

        {deepLinkCode && (
          <View style={styles.inviteCodeCard}>
            <Text style={styles.cardLabel}>Invite link preview</Text>
            <View style={{ alignItems: 'center', marginBottom: ds.spacing.md }}>
              <Text style={styles.codeText}>{`Code: ${deepLinkCode}`}</Text>
              {isValidatingInvite ? (
                <Text style={styles.codeTip}>Validating invite...</Text>
              ) : inviteValidation?.valid ? (
                <Text style={styles.codeTip}>
                  Invited by {inviteValidation.inviterName ?? 'Smartpay'}
                </Text>
              ) : (
                <Text style={styles.codeTip}>
                  {inviteValidation?.error ?? 'Invalid invite code'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleContinueWithInvite}
              disabled={!inviteValidation?.valid && !isValidatingInvite}
              accessibilityLabel="Continue onboarding with invite"
            >
              <Text style={styles.shareBtnText}>Continue with invite</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>Or scan this QR code</Text>
          <View style={styles.qrBox}>
            <QRCode
              value={inviteLink}
              size={200}
              backgroundColor={ds.colors.background}
              color={ds.colors.neutral.text}
            />
          </View>
        </View>

        {/* Invite Link Card */}
        <View style={styles.linkCard}>
          <Text style={styles.cardLabel}>Invite Link</Text>
          <TouchableOpacity
            style={styles.linkBox}
            onPress={() => handleCopy(inviteLink, 'Invite link copied to clipboard')}
            activeOpacity={0.7}
            accessibilityLabel="Copy invite link"
          >
            <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
              {inviteLink}
            </Text>
            <Ionicons name="copy-outline" size={20} color={ds.colors.brand.primary} />
          </TouchableOpacity>
        </View>

        {/* Referral Count (optional) */}
        {referralCount > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{referralCount}</Text>
              <Text style={styles.statLabel}>Friends Joined</Text>
            </View>
          </View>
        )}

        {/* Benefits List */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>What your friends get</Text>
          {INVITE_BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color={ds.colors.semantic.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Primary CTA: Share */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          accessibilityLabel="Share invite"
        >
          <Ionicons name="share-social" size={20} color="#fff" />
          <Text style={styles.shareBtnText}>Share Invite</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.colors.neutral.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ds.spacing.md,
    paddingVertical: ds.spacing.sm,
    backgroundColor: ds.colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: ds.colors.neutral.border,
  },
  backBtn: { padding: ds.spacing.sm },
  headerTitle: { ...ds.typography.textStyles.h2, color: ds.colors.neutral.text },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  container: { padding: ds.spacing.lg, paddingBottom: ds.spacing.xxl },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: ds.spacing.xl,
    marginBottom: ds.spacing.lg,
  },
  heroTitle: {
    ...ds.typography.textStyles.h2,
    color: ds.colors.neutral.text,
    marginTop: ds.spacing.md,
    marginBottom: ds.spacing.xs,
  },
  heroSubtitle: {
    ...ds.typography.textStyles.body,
    color: ds.colors.neutral.textSecondary,
    textAlign: 'center',
  },
  
  // Invite Code Card
  inviteCodeCard: {
    backgroundColor: ds.colors.neutral.surface,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.lg,
    marginBottom: ds.spacing.lg,
    alignItems: 'center',
    ...ds.shadows.md,
  },
  cardLabel: {
    ...ds.typography.textStyles.bodySmall,
    color: ds.colors.neutral.textSecondary,
    marginBottom: ds.spacing.md,
    fontWeight: '500',
  },
  codeText: {
    ...ds.typography.textStyles.h2,
    color: ds.colors.brand.primary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  codeTip: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.neutral.textTertiary,
  },
  
  // QR Code Section
  qrSection: {
    alignItems: 'center',
    marginBottom: ds.spacing.lg,
  },
  qrLabel: {
    ...ds.typography.textStyles.bodySmall,
    color: ds.colors.neutral.textSecondary,
    marginBottom: ds.spacing.md,
  },
  qrBox: {
    backgroundColor: ds.colors.background,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.lg,
    ...ds.shadows.sm,
  },
  
  // Invite Link Card
  linkCard: {
    backgroundColor: ds.colors.neutral.surface,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.lg,
    marginBottom: ds.spacing.lg,
    ...ds.shadows.sm,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ds.colors.neutral.muted,
    borderRadius: ds.radius.md,
    paddingVertical: ds.spacing.sm,
    paddingHorizontal: ds.spacing.md,
    marginTop: ds.spacing.xs,
    gap: ds.spacing.sm,
  },
  linkText: {
    ...ds.typography.textStyles.bodySmall,
    color: ds.colors.brand.primary,
    flex: 1,
  },
  
  // Stats Card
  statsCard: {
    backgroundColor: ds.colors.neutral.surface,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.lg,
    marginBottom: ds.spacing.lg,
    alignItems: 'center',
    ...ds.shadows.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...ds.typography.textStyles.h1,
    color: ds.colors.brand.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...ds.typography.textStyles.bodySmall,
    color: ds.colors.neutral.textSecondary,
    marginTop: ds.spacing.xs,
  },
  
  // Benefits Section
  benefitsSection: {
    backgroundColor: ds.colors.neutral.surface,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.lg,
    marginBottom: ds.spacing.xl,
    ...ds.shadows.sm,
  },
  benefitsTitle: {
    ...ds.typography.textStyles.body,
    fontWeight: '600',
    color: ds.colors.neutral.text,
    marginBottom: ds.spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ds.spacing.md,
    gap: ds.spacing.sm,
  },
  benefitText: {
    ...ds.typography.textStyles.body,
    color: ds.colors.neutral.text,
  },
  
  // Share Button (Primary CTA - 56px)
  shareBtn: {
    flexDirection: 'row',
    backgroundColor: ds.colors.brand.primary,
    borderRadius: ds.components.button.borderRadiusPill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    gap: ds.spacing.sm,
  },
  shareBtnText: {
    ...ds.typography.textStyles.button,
    color: '#fff',
  },
});
