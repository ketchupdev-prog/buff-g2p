/**
 * About Buffr – Buffr G2P.
 * §3.5.1 / §3.5.2. App name, version, description; in-app links to Privacy policy and Terms of service.
 * Location: app/(tabs)/profile/about.tsx
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import Constants from 'expo-constants';
import { designSystem } from '@/constants/designSystem';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function AboutScreen() {
  const handlePrivacy = () => router.push('/(tabs)/profile/privacy-policy' as never);
  const handleTerms = () => router.push('/(tabs)/profile/terms' as never);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Buffr</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.appName}>Buffr G2P</Text>
          <Text style={styles.version}>Version {APP_VERSION}</Text>
          <Text style={styles.body}>
            Government-to-Person vouchers, wallet, and payments. Receive grants, send money, pay bills, and cash out at agents, NamPost, and SmartPay.
          </Text>

          <View style={styles.linksCard}>
            <TouchableOpacity style={styles.linkRow} onPress={handlePrivacy}>
              <Ionicons name="document-text-outline" size={20} color={designSystem.colors.neutral.textSecondary} />
              <Text style={styles.linkLabel}>Privacy policy</Text>
              <Ionicons name="chevron-forward" size={18} color={designSystem.colors.neutral.textTertiary} />
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity style={styles.linkRow} onPress={handleTerms}>
              <Ionicons name="document-outline" size={20} color={designSystem.colors.neutral.textSecondary} />
              <Text style={styles.linkLabel}>Terms of service</Text>
              <Ionicons name="chevron-forward" size={18} color={designSystem.colors.neutral.textTertiary} />
            </TouchableOpacity>
          </View>
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
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16, paddingBottom: 32 },
  appName: { ...designSystem.typography.textStyles.titleLg, color: designSystem.colors.neutral.text, marginBottom: 4 },
  version: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginBottom: 16 },
  body: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.textSecondary, marginBottom: 24, lineHeight: 22 },
  linksCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  linkDivider: { height: 1, backgroundColor: designSystem.colors.neutral.border, marginLeft: 48 },
  linkLabel: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, flex: 1 },
});
