/**
 * Agents Map – Buffr G2P. §3.4. Map view of nearby agents, NamPost, ATMs.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function AgentsNearbyScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: true, title: 'Map', headerBackTitleVisible: false }} />
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={64} color={designSystem.colors.neutral.textTertiary} />
          <Text style={styles.placeholderTitle}>Map view</Text>
          <Text style={styles.placeholderDesc}>Agent and ATM locations will appear on the map. Integration with maps SDK coming soon.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  placeholderTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginTop: 16 },
  placeholderDesc: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 8, textAlign: 'center' },
});
