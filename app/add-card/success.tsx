/**
 * Card added – Buffr G2P. §3.4 screen 34e.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function AddCardSuccessScreen() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Card added', headerBackVisible: false }} />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={64} color={designSystem.colors.semantic.success} />
        </View>
        <Text style={styles.title}>Card added</Text>
        <Text style={styles.subtitle}>You can use this card to add money or pay.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/cards')}>
          <Text style={styles.btnText}>View cards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.linkText}>Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: designSystem.colors.neutral.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: designSystem.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 32 },
  btn: { width: '100%', height: 52, backgroundColor: designSystem.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  link: { marginTop: 16 },
  linkText: { fontSize: 14, fontWeight: '600', color: designSystem.colors.brand.primary },
});
