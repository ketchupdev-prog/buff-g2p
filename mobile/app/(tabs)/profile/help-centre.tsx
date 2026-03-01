/**
 * Help Centre – Buffr G2P.
 * §3.5.1 / §3.5.2. FAQ by category (expandable); complaints notice; link to Contact us.
 * Location: app/(tabs)/profile/help-centre.tsx
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { LEGAL_TERMS } from '@/constants/legalTerms';
import { SUPPORT_URLS, openSupportUrl } from '@/constants/support';

type FaqItem = { q: string; a: string };

const FAQ_CATEGORIES: Array<{ title: string; items: FaqItem[] }> = [
  {
    title: 'Getting started',
    items: [
      { q: 'How do I receive a voucher?', a: 'When you are eligible for a government grant, you will receive an SMS or notification. You can redeem the voucher to your Buffr wallet, collect cash at a NamPost or SmartPay agent, or get a code to use at an ATM.' },
      { q: 'How do I add money to my wallet?', a: 'From Home, tap your wallet and choose “Add money”. You can link a bank account or card, or receive money from another Buffr user.' },
    ],
  },
  {
    title: 'Vouchers & wallet',
    items: [
      { q: 'Where can I cash out?', a: 'You can cash out at Till (retailer), Agent, Merchant, ATM, or via bank transfer. Fees apply for some methods; see Settings → Fees and charges.' },
      { q: 'What if my voucher expires?', a: 'Vouchers have an expiry date. Redeem or collect before then. If you miss it, contact support for guidance.' },
    ],
  },
  {
    title: 'Security & account',
    items: [
      { q: 'How do I change my PIN?', a: 'Go to Settings → Security → Change PIN. Enter your current PIN, then set and confirm a new one.' },
      { q: 'What is proof of life?', a: 'Every 90 days we verify you are still the account holder. Use Settings → Proof of life to complete verification with your device biometrics.' },
    ],
  },
  {
    title: 'Complaints',
    items: [
      { q: 'How are complaints handled?', a: LEGAL_TERMS.complaintsNotice },
    ],
  },
];

export default function HelpCentreScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = useCallback((key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

  const handleContact = () => router.push('/(tabs)/profile/contact-us' as never);
  const handleOpenHelp = () => openSupportUrl(SUPPORT_URLS.helpCentre);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help centre</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Find answers to common questions below. For complaints or further help, contact us.
          </Text>

          {FAQ_CATEGORIES.map((cat) => (
            <View key={cat.title} style={styles.category}>
              <Text style={styles.categoryTitle}>{cat.title}</Text>
              {cat.items.map((item, i) => {
                const key = `${cat.title}-${i}`;
                const isOpen = expanded === key;
                return (
                  <View key={key} style={styles.faqCard}>
                    <TouchableOpacity
                      style={styles.faqQuestion}
                      onPress={() => toggle(key)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.faqQ}>{item.q}</Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={designSystem.colors.neutral.textSecondary}
                      />
                    </TouchableOpacity>
                    {isOpen && <Text style={styles.faqA}>{item.a}</Text>}
                  </View>
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={designSystem.colors.brand.primary} />
            <Text style={styles.contactBtnText}>Contact us</Text>
            <Ionicons name="chevron-forward" size={18} color={designSystem.colors.brand.primary} />
          </TouchableOpacity>

          {SUPPORT_URLS.helpCentre ? (
            <TouchableOpacity style={styles.webLink} onPress={handleOpenHelp}>
              <Ionicons name="open-outline" size={18} color={designSystem.colors.neutral.textSecondary} />
              <Text style={styles.webLinkText}>View help online</Text>
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
  intro: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.textSecondary, marginBottom: 20 },
  category: { marginBottom: 24 },
  categoryTitle: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
    marginBottom: 10,
  },
  faqCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 8,
  },
  faqQ: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, flex: 1 },
  faqA: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
    lineHeight: 20,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  contactBtnText: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.brand.primary, flex: 1 },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  webLinkText: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary },
});
