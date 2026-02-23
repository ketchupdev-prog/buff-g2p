/**
 * Profile (Me) tab – Buffr G2P.
 * Shows user info from UserContext. Links to settings, QR code, analytics, proof-of-life.
 * §3.5 screen 35 / Figma 725:8543.
 */
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

type ProfileLink = {
  id: string;
  label: string;
  icon: string;
  route: string;
  danger?: boolean;
};

const PROFILE_LINKS: Array<{ section: string; items: ProfileLink[] }> = [
  {
    section: 'Account',
    items: [
      { id: 'qr', label: 'My QR Code', icon: 'qr-code', route: '/profile/qr-code' },
      { id: 'analytics', label: 'Analytics', icon: 'bar-chart', route: '/profile/analytics' },
      { id: 'learn', label: 'Financial Literacy', icon: 'book', route: '/profile/learn' },
      { id: 'gamification', label: 'Rewards & Badges', icon: 'star', route: '/profile/gamification' },
    ],
  },
  {
    section: 'Security',
    items: [
      { id: 'proof', label: 'Proof of Life', icon: 'shield-checkmark', route: '/proof-of-life/verify' },
      { id: 'notifications', label: 'Notifications', icon: 'notifications', route: '/profile/notifications' },
      { id: 'location', label: 'Find Agents & ATMs', icon: 'location', route: '/profile/location' },
      { id: 'aichat', label: 'AI Assistant', icon: 'chatbubble-ellipses', route: '/profile/ai-chat' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings', route: '/profile/settings' },
    ],
  },
];

export default function ProfileScreen() {
  const { profile, buffrId, cardNumberMasked, clearUser } = useUser();

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Buffr User';
  const phone = profile?.phone ?? '';
  const initials = (profile?.firstName?.[0] ?? 'B').toUpperCase() + (profile?.lastName?.[0] ?? '').toUpperCase();

  const handleSignOut = async () => {
    await clearUser();
    router.replace('/onboarding' as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Me</Text>
        <TouchableOpacity
          onPress={() => router.push('/profile/settings')}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={designSystem.colors.neutral.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar & Name */}
        <View style={styles.profileCard}>
          {profile?.photoUri ? (
            <Image source={{ uri: profile.photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.fullName}>{fullName}</Text>
          {phone ? <Text style={styles.phone}>{phone}</Text> : null}
          {buffrId ? (
            <View style={styles.buffrIdBadge}>
              <Text style={styles.buffrIdLabel}>Buffr ID  </Text>
              <Text style={styles.buffrIdValue}>{buffrId}</Text>
            </View>
          ) : null}
          {cardNumberMasked ? (
            <Text style={styles.cardNumber}>{cardNumberMasked}</Text>
          ) : null}
        </View>

        {/* Menu Sections */}
        {PROFILE_LINKS.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => router.push(item.route as never)}
                accessibilityLabel={item.label}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconBox}>
                    <Ionicons
                      name={item.icon as never}
                      size={18}
                      color={item.danger ? designSystem.colors.semantic.error : designSystem.colors.brand.primary}
                    />
                  </View>
                  <Text style={[styles.menuItemText, item.danger && styles.dangerText]}>
                    {item.label}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={designSystem.colors.neutral.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSignOut}
            accessibilityLabel="Sign out"
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: designSystem.colors.feedback.red100 }]}>
                <Ionicons name="log-out-outline" size={18} color={designSystem.colors.semantic.error} />
              </View>
              <Text style={[styles.menuItemText, styles.dangerText]}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={designSystem.colors.neutral.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: designSystem.spacing.g2p.contentBottomPadding }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.scale.md,
    backgroundColor: designSystem.colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
  },
  headerTitle: {
    ...designSystem.typography.textStyles.title,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
  },
  scroll: { flex: 1, paddingHorizontal: designSystem.spacing.g2p.horizontalPadding },
  profileCard: {
    alignItems: 'center',
    paddingVertical: designSystem.spacing.scale['2xl'],
    marginTop: designSystem.spacing.scale.lg,
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.lg,
    marginBottom: designSystem.spacing.scale.xl,
    ...designSystem.shadows.sm,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    ...designSystem.typography.textStyles.titleLg,
    color: designSystem.colors.brand.primary,
    fontWeight: '700',
  },
  fullName: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  phone: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 8,
  },
  buffrIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: designSystem.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 6,
  },
  buffrIdLabel: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.brand.primary,
    fontWeight: '600',
  },
  buffrIdValue: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.brand.primaryDark,
    fontWeight: '700',
  },
  cardNumber: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textTertiary,
    letterSpacing: 1,
  },
  section: { marginBottom: designSystem.spacing.scale.lg },
  sectionTitle: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: designSystem.spacing.scale.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: designSystem.radius.md,
    paddingVertical: 14,
    paddingHorizontal: designSystem.spacing.scale.md,
    marginBottom: designSystem.spacing.scale.xs,
    ...designSystem.shadows.sm,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
  },
  dangerText: { color: designSystem.colors.semantic.error },
});
