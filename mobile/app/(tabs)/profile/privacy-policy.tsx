/**
 * Privacy Policy – Buffr G2P.
 * §3.5.1 / §3.5.2. Full Namibian-aligned Privacy Policy from legalDocuments; optional “Open in browser” when URL set.
 * Location: app/(tabs)/profile/privacy-policy.tsx
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { PRIVACY_POLICY_FULL } from '@/constants/legalDocuments';
import { SUPPORT_URLS, openSupportUrl } from '@/constants/support';

export default function PrivacyPolicyScreen() {
  const handleOpenFull = () => openSupportUrl(SUPPORT_URLS.privacyPolicy);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy policy</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.fullDocument}>{PRIVACY_POLICY_FULL}</Text>
          {SUPPORT_URLS.privacyPolicy ? (
            <TouchableOpacity style={styles.linkButton} onPress={handleOpenFull}>
              <Ionicons name="open-outline" size={18} color={designSystem.colors.brand.primary} />
              <Text style={styles.linkButtonText}>Open full policy in browser</Text>
            </TouchableOpacity>
          ) : null}
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
  fullDocument: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
  },
  linkButtonText: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.brand.primary },
});
