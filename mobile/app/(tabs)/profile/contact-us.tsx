/**
 * Contact Us – Buffr G2P.
 * §3.5.1 / §3.5.2. Complaints process; tappable Email (mailto), Phone (tel); optional “Open support” in browser.
 * Location: app/(tabs)/profile/contact-us.tsx
 */
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { COMPLAINTS_PROCEDURE } from '@/constants/legalDocuments';
import { SUPPORT_CONTACT, SUPPORT_URLS, openSupportUrl } from '@/constants/support';

export default function ContactUsScreen() {
  const handleEmail = () => {
    if (SUPPORT_CONTACT.email) Linking.openURL(`mailto:${SUPPORT_CONTACT.email}`);
  };
  const handlePhone = () => {
    if (SUPPORT_CONTACT.phone) Linking.openURL(`tel:${SUPPORT_CONTACT.phone.replace(/\s/g, '')}`);
  };
  const handleOpenSupport = () => openSupportUrl(SUPPORT_URLS.contactUrl);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact us</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Complaints and support</Text>
          <Text style={styles.body}>{COMPLAINTS_PROCEDURE}</Text>

          <Text style={styles.sectionTitle}>How to reach us</Text>
          {SUPPORT_CONTACT.email ? (
            <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail-outline" size={22} color={designSystem.colors.brand.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{SUPPORT_CONTACT.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={designSystem.colors.neutral.textTertiary} />
            </TouchableOpacity>
          ) : null}
          {SUPPORT_CONTACT.phone ? (
            <TouchableOpacity style={styles.contactRow} onPress={handlePhone}>
              <View style={styles.contactIcon}>
                <Ionicons name="call-outline" size={22} color={designSystem.colors.brand.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{SUPPORT_CONTACT.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={designSystem.colors.neutral.textTertiary} />
            </TouchableOpacity>
          ) : null}

          {SUPPORT_URLS.contactUrl ? (
            <TouchableOpacity style={styles.webBtn} onPress={handleOpenSupport}>
              <Ionicons name="open-outline" size={18} color={designSystem.colors.brand.primary} />
              <Text style={styles.webBtnText}>Open support page</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.footer}>
            For payment system matters you may also contact the Bank of Namibia.
          </Text>
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
  sectionTitle: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  body: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.textSecondary, marginBottom: 12, lineHeight: 22 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 14,
    marginTop: 8,
  },
  contactIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  contactContent: { flex: 1 },
  contactLabel: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary, marginBottom: 2 },
  contactValue: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  webBtnText: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.brand.primary },
  footer: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textTertiary, marginTop: 24 },
});
