/**
 * Terms of Service – Buffr G2P.
 * §3.5.1 / §3.5.2. Full Namibian-aligned Terms and Conditions from legalDocuments; in-app links to Fees and Contact; optional “Open in browser”.
 * Location: app/(tabs)/profile/terms.tsx
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { TERMS_AND_CONDITIONS } from '@/constants/legalDocuments';
import { SUPPORT_URLS, openSupportUrl } from '@/constants/support';

export default function TermsScreen() {
  const handleFees = () => router.push('/(tabs)/profile/fees-charges' as never);
  const handleContact = () => router.push('/(tabs)/profile/contact-us' as never);
  const handleOpenFull = () => openSupportUrl(SUPPORT_URLS.termsOfService);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of service</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.quickLinks}>
            <TouchableOpacity style={styles.inlineLink} onPress={handleFees}>
              <Ionicons name="cash-outline" size={18} color={designSystem.colors.brand.primary} />
              <Text style={styles.inlineLinkText}>Fees and charges</Text>
              <Ionicons name="chevron-forward" size={16} color={designSystem.colors.brand.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineLink} onPress={handleContact}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={designSystem.colors.brand.primary} />
              <Text style={styles.inlineLinkText}>Contact us</Text>
              <Ionicons name="chevron-forward" size={16} color={designSystem.colors.brand.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fullDocument}>{TERMS_AND_CONDITIONS}</Text>

          {SUPPORT_URLS.termsOfService ? (
            <TouchableOpacity style={styles.webBtn} onPress={handleOpenFull}>
              <Ionicons name="open-outline" size={18} color={designSystem.colors.brand.primary} />
              <Text style={styles.webBtnText}>Open full terms in browser</Text>
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
  quickLinks: { marginBottom: 16 },
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  inlineLinkText: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.brand.primary },
  fullDocument: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
  },
  webBtnText: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.brand.primary },
});
