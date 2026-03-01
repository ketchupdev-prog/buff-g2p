/**
 * Gamification / Rewards & Badges – Buffr G2P.
 * §3.6 screen 44. Reads live badge data from GamificationContext.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useGamification, BADGE_META, type BadgeId } from '@/contexts/GamificationContext';

const ALL_BADGE_IDS: BadgeId[] = [
  'first_send', 'first_receive', 'first_voucher', 'first_cashout',
  'first_proof', 'streak_3', 'streak_6', 'streak_12',
  'first_scan', 'first_group', 'first_loan', 'first_bill',
];

const POINTS_PER_BADGE = 25;

function levelFromPoints(pts: number): { level: number; label: string; nextAt: number } {
  if (pts < 50)  return { level: 1, label: 'Starter',   nextAt: 50 };
  if (pts < 150) return { level: 2, label: 'Active',    nextAt: 150 };
  if (pts < 300) return { level: 3, label: 'Champion',  nextAt: 300 };
  return             { level: 4, label: 'Expert',    nextAt: pts }; // max
}

export default function GamificationScreen() {
  const { points, badges, monthStreak } = useGamification();
  const { level, label, nextAt } = levelFromPoints(points);
  const progress = level < 4 ? Math.min((points / nextAt) * 100, 100) : 100;

  const earnedBadges = ALL_BADGE_IDS.filter(id => badges[id]?.earned);
  const lockedBadges = ALL_BADGE_IDS.filter(id => !badges[id]?.earned);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rewards & Badges</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Points hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.pointsLabel}>Your Points</Text>
                <Text style={styles.pointsValue}>{points}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.levelText}>Level {level} · {label}</Text>
              </View>
            </View>
            {level < 4 && (
              <>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress}%` as `${number}%` }]} />
                </View>
                <Text style={styles.progressLabel}>{points} / {nextAt} pts to Level {level + 1}</Text>
              </>
            )}
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{earnedBadges.length}</Text>
                <Text style={styles.heroStatLabel}>Badges earned</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{monthStreak}</Text>
                <Text style={styles.heroStatLabel}>Month streak</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{lockedBadges.length}</Text>
                <Text style={styles.heroStatLabel}>Left to earn</Text>
              </View>
            </View>
          </View>

          {/* Earned badges */}
          {earnedBadges.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Earned Badges</Text>
              <View style={styles.badgesGrid}>
                {earnedBadges.map((id) => {
                  const meta = BADGE_META[id];
                  const earned = badges[id];
                  return (
                    <View key={id} style={styles.badgeCard}>
                      <View style={[styles.badgeIcon, { backgroundColor: meta.color + '20' }]}>
                        <Ionicons name={meta.icon as never} size={32} color={meta.color} />
                      </View>
                      <Text style={styles.badgeLabel}>{meta.label}</Text>
                      {earned.earnedAt && (
                        <Text style={styles.badgeDate}>
                          {new Date(earned.earnedAt).toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Locked badges */}
          {lockedBadges.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: earnedBadges.length > 0 ? 8 : 0 }]}>
                Badges to Earn
              </Text>
              <View style={styles.badgesGrid}>
                {lockedBadges.map((id) => {
                  const meta = BADGE_META[id];
                  return (
                    <View key={id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                      <View style={[styles.badgeIcon, { backgroundColor: '#F3F4F6' }]}>
                        <Ionicons name={meta.icon as never} size={32} color="#9CA3AF" />
                        <View style={styles.lockOverlay}>
                          <Ionicons name="lock-closed" size={12} color="#6B7280" />
                        </View>
                      </View>
                      <Text style={[styles.badgeLabel, styles.badgeLabelLocked]}>{meta.label}</Text>
                      <Text style={styles.badgeLocked}>{POINTS_PER_BADGE} pts</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {earnedBadges.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={designSystem.colors.neutral.textTertiary} />
              <Text style={styles.emptyTitle}>Start earning badges</Text>
              <Text style={styles.emptyDesc}>
                Redeem a voucher, send money, or complete identity verification to earn your first badge.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },

  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 20 },

  heroCard: {
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pointsLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  pointsValue: { fontSize: 40, fontWeight: '800', color: '#fff', marginTop: 4 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 5 },
  levelText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginBottom: 6 },
  progressFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 16 },

  heroStats: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },

  sectionTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginBottom: 12 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },

  badgeCard: {
    width: '47%',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  badgeCardLocked: { opacity: 0.75 },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  lockOverlay: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  badgeLabel: { ...designSystem.typography.textStyles.bodySm, fontWeight: '700', color: designSystem.colors.neutral.text, textAlign: 'center' },
  badgeLabelLocked: { color: designSystem.colors.neutral.textTertiary },
  badgeDate: { fontSize: 10, color: designSystem.colors.neutral.textTertiary },
  badgeLocked: { fontSize: 10, fontWeight: '700', color: designSystem.colors.neutral.textTertiary },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginTop: 16 },
  emptyDesc: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 16 },
});
