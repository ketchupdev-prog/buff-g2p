/**
 * Fees and Charges – Buffr G2P.
 * §12.6 PSD-1 §10.4, PSD-3 §14. Full schedule from legalDocuments; link to Contact us.
 * Location: app/(tabs)/profile/fees-charges.tsx
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { FEES_AND_CHARGES_SCHEDULE } from '@/constants/legalDocuments';

export default function FeesChargesScreen() {
  const handleContact = () => router.push('/(tabs)/profile/contact-us' as never);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fees and charges</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.fullDocument}>{FEES_AND_CHARGES_SCHEDULE}</Text>

          <TouchableOpacity style={styles.contactLink} onPress={handleContact}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={designSystem.colors.brand.primary} />
            <Text style={styles.contactLinkText}>Questions? Contact us</Text>
            <Ionicons name="chevron-forward" size={16} color={designSystem.colors.brand.primary} />
          </TouchableOpacity>
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
    marginBottom: 8,
  },
  contactLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
  },
  contactLinkText: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.brand.primary },
});
