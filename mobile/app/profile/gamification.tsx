/**
 * Gamification / Rewards & Badges – Buffr G2P.
 * §3.6 screen 44. Rewards, points, badges.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

const BADGES = [
  { id: 'first_voucher', label: 'First voucher', icon: 'gift-outline', earned: true },
  { id: 'saver', label: 'Regular saver', icon: 'wallet-outline', earned: false },
  { id: 'on_time', label: 'On-time verification', icon: 'checkmark-circle-outline', earned: true },
  { id: 'helper', label: 'Community helper', icon: 'people-outline', earned: false },
];

export default function GamificationScreen() {
  const [points] = useState(120);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rewards & Badges</Text>
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.pointsCard}>
            <Ionicons name="star" size={32} color={designSystem.colors.brand.accent ?? designSystem.colors.semantic.warning} />
            <View style={styles.pointsTextWrap}>
              <Text style={styles.pointsLabel}>Your points</Text>
              <Text style={styles.pointsValue}>{points}</Text>
            </View>
            <Text style={styles.pointsHint}>Earn more by redeeming vouchers and completing verification</Text>
          </View>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesGrid}>
            {BADGES.map((b) => (
              <View key={b.id} style={[styles.badgeCard, !b.earned && styles.badgeCardLocked]}>
                <Ionicons name={b.icon as never} size={36} color={b.earned ? designSystem.colors.brand.primary : designSystem.colors.neutral.textTertiary} />
                <Text style={[styles.badgeLabel, !b.earned && styles.badgeLabelLocked]}>{b.label}</Text>
                {!b.earned && <Text style={styles.badgeLocked}>Locked</Text>}
              </View>
            ))}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 20 },
  pointsCard: {
    backgroundColor: designSystem.colors.brand.primary50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.brand.primaryMuted,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  pointsTextWrap: { marginLeft: 16, flex: 1 },
  pointsLabel: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary },
  pointsValue: { ...designSystem.typography.textStyles.titleLg, color: designSystem.colors.brand.primary },
  pointsHint: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary, marginTop: 12, width: '100%' },
  sectionTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginBottom: 12 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: {
    width: '47%',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    alignItems: 'center',
  },
  badgeCardLocked: { opacity: 0.7 },
  badgeLabel: { ...designSystem.typography.textStyles.bodySm, fontWeight: '600', color: designSystem.colors.neutral.text, marginTop: 8, textAlign: 'center' },
  badgeLabelLocked: { color: designSystem.colors.neutral.textTertiary },
  badgeLocked: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textTertiary, marginTop: 4 },
});
