/**
 * Help Centre – Buffr G2P.
 * §3.5 Settings sub-screen. FAQ and complaints process (PSD-1 §16).
 * Location: app/(tabs)/profile/help-centre.tsx
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { LEGAL_TERMS } from '@/constants/legalTerms';

export default function HelpCentreScreen() {
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
          <Text style={styles.sectionTitle}>Getting help</Text>
          <Text style={styles.body}>
            Need help? Check how to receive vouchers, send money, cash out, and manage your wallet. Full FAQ and guides will be available here or via the support link when configured.
          </Text>
          <Text style={styles.sectionTitle}>Complaints</Text>
          <Text style={styles.body}>{LEGAL_TERMS.complaintsNotice}</Text>
          <Text style={styles.body}>For complaints or support, go to Settings → Contact us.</Text>
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
  body: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, marginBottom: 12 },
});
