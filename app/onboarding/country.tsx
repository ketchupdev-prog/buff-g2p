/**
 * Country selection (optional) – Buffr G2P.
 * §3.1 screen 1b. Shown when product enables country step in onboarding.
 * Uses UserContext so onboarding state is consistent.
 */
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

const COUNTRIES = [
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
];

export default function CountryScreen() {
  useUser(); // Ensure UserContext is applied in onboarding flow
  const [selected, setSelected] = useState<string>('NA');

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Select Country', headerTintColor: designSystem.colors.neutral.text }} />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <Text style={styles.subtitle}>Your country helps us show the right services.</Text>
        <FlatList
          data={COUNTRIES}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, selected === item.code && styles.rowSelected]}
              onPress={() => setSelected(item.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={styles.name}>{item.name}</Text>
              {selected === item.code && <Ionicons name="checkmark-circle" size={24} color={designSystem.colors.brand.primary} />}
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/phone')} activeOpacity={0.9}>
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  content: { flex: 1, padding: 20 },
  subtitle: { fontSize: 14, color: designSystem.colors.neutral.textSecondary, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  rowSelected: { borderColor: designSystem.colors.brand.primary },
  flag: { fontSize: 24, marginRight: 12 },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: designSystem.colors.neutral.text },
  btn: { marginTop: 24, height: 52, backgroundColor: designSystem.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
