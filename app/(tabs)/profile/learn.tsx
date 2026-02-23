/**
 * Financial Literacy – Buffr G2P.
 * §3.6 Learn. Topics: saving, vouchers, cash-out, security.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

const TOPICS = [
  { id: 'vouchers', title: 'Understanding your vouchers', desc: 'How grants work and when they arrive', icon: 'gift-outline' },
  { id: 'wallet', title: 'Your Buffr wallet', desc: 'Balance, add money, and cash-out options', icon: 'wallet-outline' },
  { id: 'cashout', title: 'Cashing out safely', desc: 'Agents, NamPost, ATMs, and mobile units', icon: 'cash-outline' },
  { id: 'saving', title: 'Saving tips', desc: 'Simple ways to set money aside', icon: 'trending-up-outline' },
  { id: 'security', title: 'Keeping your account safe', desc: 'PIN, proof of life, and avoiding scams', icon: 'shield-checkmark-outline' },
];

export default function LearnScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Literacy</Text>
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.intro}>Short guides to help you get the most from Buffr.</Text>
          {TOPICS.map((t) => (
            <TouchableOpacity key={t.id} style={styles.card} activeOpacity={0.8}>
              <View style={styles.iconWrap}>
                <Ionicons name={t.icon as never} size={24} color={designSystem.colors.brand.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{t.title}</Text>
                <Text style={styles.cardDesc}>{t.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={designSystem.colors.neutral.textTertiary} />
            </TouchableOpacity>
          ))}
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
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16 },
  intro: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text },
  cardDesc: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 4 },
});
