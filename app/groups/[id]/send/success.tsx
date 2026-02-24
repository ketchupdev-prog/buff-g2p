/**
 * Group Send Success – Buffr G2P. §3.12 screen 47c-ii.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function GroupSendSuccessScreen() {
  const { id, amount } = useLocalSearchParams<{ id: string; amount?: string }>();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={64} color={designSystem.colors.semantic.success} />
        </View>
        <Text style={styles.title}>Sent successfully</Text>
        <Text style={styles.subtitle}>The group has been updated.</Text>
        {amount ? <Text style={styles.amount}>N$ {amount}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={() => router.replace({ pathname: '/groups/[id]', params: { id: id ?? '' } } as never)}>
          <Text style={styles.btnText}>Back to group</Text>
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
  subtitle: { fontSize: 14, color: designSystem.colors.neutral.textSecondary, marginBottom: 8 },
  amount: { fontSize: 18, fontWeight: '600', color: designSystem.colors.neutral.text, marginBottom: 24 },
  btn: { width: '100%', height: 52, backgroundColor: designSystem.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
