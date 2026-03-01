/**
 * My QR Code – Buffr G2P.
 * §3.6 screen 41. User's NAMQR / receive code (display). Production: full NAMQR TLV per spec.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

export default function QRCodeScreen() {
  const { profile, buffrId } = useUser();
  const displayValue = buffrId
    ? `BUFFR:${buffrId}:${profile?.phone ?? ''}`
    : 'BUFFR:RECEIVE';

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My QR Code</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.qrCard}>
            <QRCode value={displayValue} size={220} backgroundColor={designSystem.colors.neutral.surface} color={designSystem.colors.neutral.text} />
            <Text style={styles.hint}>Others can scan this to send you money</Text>
          </View>
          {buffrId && <Text style={styles.buffrId}>Buffr ID: {buffrId}</Text>}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  qrCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 32,
    alignItems: 'center',
  },
  hint: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 20, textAlign: 'center' },
  buffrId: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textTertiary, marginTop: 24 },
});
