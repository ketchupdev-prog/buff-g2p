/**
 * Receive Money – Landing screen. Buffr G2P.
 * Home "Receive" tile links here. PRD §3.9, §7.6.1. Deep links go to /receive/[transactionId], etc.
 * Uses UserContext for profile and state consistency.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

const DS = designSystem;

export default function ReceiveLandingScreen() {
  useUser();
  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Receive Money',
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text },
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: DS.colors.neutral.text,
          headerStyle: { backgroundColor: DS.colors.neutral.surface },
        }}
      />
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <View style={styles.iconWrap}>
          <Ionicons name="arrow-down-circle-outline" size={64} color={DS.colors.semantic.success} />
        </View>
        <Text style={styles.title}>Receive money into your Buffr wallet</Text>
        <Text style={styles.desc}>
          When someone sends you money, you'll get a notification. You can add it to your wallet or cash out. Use the Transactions tab to see recent activity.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(tabs)/transactions' as never)}
          activeOpacity={0.8}
          accessibilityLabel="View transactions"
        >
          <Text style={styles.primaryBtnText}>View Transactions</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(tabs)/vouchers' as never)}
          activeOpacity={0.8}
          accessibilityLabel="View vouchers"
        >
          <Text style={styles.secondaryBtnText}>View Vouchers</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  iconWrap: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: DS.colors.neutral.text, textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 15, color: DS.colors.neutral.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    backgroundColor: DS.colors.brand.primary,
    borderRadius: 9999,
    marginBottom: 12,
    gap: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: DS.colors.brand.primary },
});
