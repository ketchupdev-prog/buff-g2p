/**
 * NamPost Collection Code – Buffr G2P.
 * Displays dynamic NAMQR for branch; user scans with app to complete redemption. §3.2 screen 11.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function NamPostCodeScreen() {
  const { voucherId, branchId, branchName } = useLocalSearchParams<{ voucherId: string; branchId: string; branchName?: string }>();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Collection Code', headerTintColor: designSystem.colors.neutral.text }} />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <Text style={styles.instruction}>Show this at the branch to collect your cash.</Text>
        <View style={styles.qrPlaceholder}>
          <Ionicons name="qr-code-outline" size={120} color={designSystem.colors.brand.primary} />
          <Text style={styles.qrLabel}>NAMQR (Token Vault)</Text>
          <Text style={styles.qrMeta}>Voucher · {branchName ?? 'Branch'}</Text>
        </View>
        <Text style={styles.hint}>Branch displays this code; you scan with the app to confirm.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)' as never)}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  instruction: { fontSize: 15, color: designSystem.colors.neutral.text, textAlign: 'center', marginBottom: 24 },
  qrPlaceholder: { width: 200, height: 200, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: designSystem.colors.neutral.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  qrLabel: { fontSize: 12, color: designSystem.colors.neutral.textSecondary, marginTop: 8 },
  qrMeta: { fontSize: 11, color: designSystem.colors.neutral.textTertiary },
  hint: { fontSize: 13, color: designSystem.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 32 },
  doneBtn: { width: '100%', height: 52, backgroundColor: designSystem.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
