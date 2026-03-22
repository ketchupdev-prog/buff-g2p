/**
 * Terms of Service – Buffr G2P.
 * §3.5 Settings sub-screen. PSD-1 §10.4 – user agreement intro, fees, complaints reference.
 * Location: app/(tabs)/profile/terms.tsx
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { LEGAL_TERMS } from '@/constants/legalTerms';

export default function TermsScreen() {
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
          <Text style={styles.body}>{LEGAL_TERMS.userAgreementIntro}</Text>
          <Text style={styles.body}>For fees and redemption rights, see Settings → Fees and charges. For complaints, see Settings → Contact us. The full terms will be available via our website or in-app link when configured.</Text>
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
  body: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, marginBottom: 12 },
});
