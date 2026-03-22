/**
 * Fees and Charges – Buffr G2P.
 * §12.6 PSD-1 §10.4, PSD-3 §14. Displays fees, redemption rights from legalTerms.
 * Location: app/(tabs)/profile/fees-charges.tsx
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { LEGAL_TERMS } from '@/constants/legalTerms';

export default function FeesChargesScreen() {
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
          <Text style={styles.sectionTitle}>Fees</Text>
          <Text style={styles.body}>{LEGAL_TERMS.feesAndCharges}</Text>
          <Text style={styles.sectionTitle}>Redemption rights</Text>
          <Text style={styles.body}>{LEGAL_TERMS.redemptionRights}</Text>
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
    marginBottom: 8,
    marginTop: 16,
  },
  body: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, marginBottom: 4 },
});
