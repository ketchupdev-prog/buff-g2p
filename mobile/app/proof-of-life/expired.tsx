/**
 * Proof of Life – Expired / Frozen – Buffr G2P. §3.6 screen 61.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function ProofOfLifeExpiredScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={60} color={designSystem.colors.semantic.error} />
        </View>
        <Text style={styles.title}>Wallet Frozen</Text>
        <Text style={styles.body}>
          Your wallet has been frozen because we haven't been able to verify your identity in over 120 days.
        </Text>
        <Text style={styles.body}>
          To reactivate your account, please visit your nearest agent or NamPost branch with a valid ID.
        </Text>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={18} color={designSystem.colors.semantic.warning} style={{ marginRight: 8 }} />
          <Text style={styles.warningText}>All wallet actions are currently disabled. Vouchers can only be redeemed at NamPost or SmartPay units.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.agentButton}
            onPress={() => router.push('/agents' as never)}
            accessibilityLabel="Find an agent"
          >
            <Ionicons name="location" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.agentButtonText}>Find Nearest Agent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace('/(tabs)' as never)}
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: designSystem.colors.feedback.red100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...designSystem.typography.textStyles.heading,
    color: designSystem.colors.neutral.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    ...designSystem.typography.textStyles.body,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    maxWidth: 320,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: designSystem.colors.feedback.yellow100,
    borderRadius: designSystem.radius.md,
    padding: designSystem.spacing.scale.md,
    marginTop: 16,
    marginBottom: 40,
    width: '100%',
  },
  warningText: { ...designSystem.typography.textStyles.bodySm, color: '#92400e', flex: 1, lineHeight: 20 },
  actions: { width: '100%' },
  agentButton: {
    height: designSystem.components.button.height,
    backgroundColor: designSystem.colors.semantic.error,
    borderRadius: designSystem.components.button.borderRadius,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentButtonText: { ...designSystem.typography.textStyles.body, color: '#fff', fontWeight: '700' },
  homeButton: {
    height: designSystem.components.button.height,
    borderWidth: 1.5,
    borderColor: designSystem.colors.neutral.border,
    borderRadius: designSystem.components.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.textSecondary, fontWeight: '600' },
});
