/**
 * Add card – Buffr G2P. §3.4 screen 34c. Scan or enter manually.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function AddCardScreen() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Add card' }} />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <TouchableOpacity style={styles.option} onPress={() => router.push('/add-card/details')}>
          <View style={styles.optionIcon}>
            <Ionicons name="scan-outline" size={28} color={designSystem.colors.brand.primary} />
          </View>
          <Text style={styles.optionTitle}>Scan card</Text>
          <Text style={styles.optionSub}>Use your camera to capture card details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => router.push('/add-card/details')}>
          <View style={styles.optionIcon}>
            <Ionicons name="create-outline" size={28} color={designSystem.colors.brand.primary} />
          </View>
          <Text style={styles.optionTitle}>Enter manually</Text>
          <Text style={styles.optionSub}>Type your card number and details</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  content: { flex: 1, padding: 20 },
  option: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  optionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  optionTitle: { fontSize: 17, fontWeight: '700', color: designSystem.colors.neutral.text },
  optionSub: { fontSize: 13, color: designSystem.colors.neutral.textSecondary, marginTop: 4 },
});
