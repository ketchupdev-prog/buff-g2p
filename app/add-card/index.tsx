/**
 * Add card – Buffr G2P. §3.4 screen 34c. Buffr App Design: "Scan your card" or "Add Card +" (manual).
 * Step 1 of card flow: choose scan or manual entry.
 * Uses UserContext so state is applied throughout card flow.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

export default function AddCardScreen() {
  useUser();
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Add card' }} />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <Text style={styles.stepLabel}>Step 1 – How do you want to add your card?</Text>
        <TouchableOpacity
          style={[styles.option, styles.optionPrimary]}
          onPress={() => router.push('/add-card/scan')}
          activeOpacity={0.8}
          accessibilityLabel="Scan your card"
        >
          <View style={[styles.optionIcon, styles.optionPrimaryIcon]}>
            <Ionicons name="scan-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.optionTitlePrimary}>Scan your card</Text>
          <Text style={styles.optionSubPrimary}>Use your camera to capture card details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.option}
          onPress={() => router.push('/add-card/details')}
          activeOpacity={0.8}
          accessibilityLabel="Add card manually"
        >
          <View style={styles.optionIcon}>
            <Ionicons name="create-outline" size={28} color={designSystem.colors.brand.primary} />
          </View>
          <Text style={styles.optionTitle}>Add Card +</Text>
          <Text style={styles.optionSub}>Enter card number and details manually</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  content: { flex: 1, padding: 20 },
  stepLabel: { fontSize: 13, color: designSystem.colors.neutral.textSecondary, marginBottom: 16 },
  option: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  optionPrimary: { backgroundColor: designSystem.colors.brand.primary, borderColor: designSystem.colors.brand.primary },
  optionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  optionPrimaryIcon: { backgroundColor: 'rgba(255,255,255,0.3)' },
  optionTitle: { fontSize: 17, fontWeight: '700', color: designSystem.colors.neutral.text },
  optionTitlePrimary: { fontSize: 17, fontWeight: '700', color: '#fff' },
  optionSub: { fontSize: 13, color: designSystem.colors.neutral.textSecondary, marginTop: 4 },
  optionSubPrimary: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
});
