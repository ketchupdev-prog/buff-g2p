/**
 * Add card – Scan step. Buffr G2P §3.4 / Buffr App Design.
 * Step 2a when user chose "Scan your card": point camera at card; fallback to manual entry.
 * No OCR in scope: shows instructions and "Enter manually instead" → details.
 * Uses UserContext so state is applied throughout card flow.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

export default function AddCardScanScreen() {
  useUser();
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Scan card' }} />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <Text style={styles.stepLabel}>Step 2 – Scan your card</Text>
        <View style={styles.scanPlaceholder}>
          <Ionicons name="scan-outline" size={64} color={designSystem.colors.neutral.textTertiary} />
          <Text style={styles.instruction}>Point your camera at your card</Text>
          <Text style={styles.instructionSub}>Position the card within the frame. Card scanning will be available in a future update.</Text>
        </View>
        <TouchableOpacity
          style={styles.manualLink}
          onPress={() => router.replace('/add-card/details' as never)}
          accessibilityLabel="Enter manually instead"
        >
          <Ionicons name="create-outline" size={20} color={designSystem.colors.brand.primary} />
          <Text style={styles.manualLinkText}>Enter manually instead</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  content: { flex: 1, padding: 20 },
  stepLabel: { fontSize: 13, color: designSystem.colors.neutral.textSecondary, marginBottom: 16 },
  scanPlaceholder: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  instruction: { fontSize: 17, fontWeight: '600', color: designSystem.colors.neutral.text, marginTop: 16 },
  instructionSub: { fontSize: 13, color: designSystem.colors.neutral.textSecondary, marginTop: 8, textAlign: 'center' },
  manualLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingVertical: 12 },
  manualLinkText: { fontSize: 15, fontWeight: '600', color: designSystem.colors.brand.primary },
});
