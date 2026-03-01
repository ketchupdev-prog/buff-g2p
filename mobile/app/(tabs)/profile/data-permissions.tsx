/**
 * Data & Permissions – Buffr G2P.
 * §3.5.1 / §3.5.2. Per-permission rows with purpose; “Open device Settings”; Open Banking consent copy.
 * Location: app/(tabs)/profile/data-permissions.tsx
 */
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

type PermissionRow = { id: string; icon: string; title: string; purpose: string };

const APP_PERMISSIONS: PermissionRow[] = [
  { id: 'camera', icon: 'camera-outline', title: 'Camera', purpose: 'Scan QR codes for payments and voucher redemption; capture ID or documents when required.' },
  { id: 'contacts', icon: 'people-outline', title: 'Contacts', purpose: 'Find recipients when you send money (optional; you can type a number instead).' },
  { id: 'notifications', icon: 'notifications-outline', title: 'Notifications', purpose: 'Receive alerts for vouchers, payments, and security reminders.' },
  { id: 'biometrics', icon: 'finger-print-outline', title: 'Biometrics', purpose: 'Proof of life and quick sign-in where supported.' },
  { id: 'storage', icon: 'folder-open-outline', title: 'Storage', purpose: 'Save receipts and documents when you choose to download them.' },
];

export default function DataPermissionsScreen() {
  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Data & permissions</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>App permissions</Text>
          <Text style={styles.intro}>
            Buffr uses the following device permissions. You can turn them on or off in your device Settings.
          </Text>
          {APP_PERMISSIONS.map((p) => (
            <View key={p.id} style={styles.permissionCard}>
              <View style={styles.permissionIcon}>
                <Ionicons name={p.icon as never} size={22} color={designSystem.colors.brand.primary} />
              </View>
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>{p.title}</Text>
                <Text style={styles.permissionPurpose}>{p.purpose}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.settingsBtn} onPress={handleOpenSettings}>
            <Ionicons name="settings-outline" size={20} color={designSystem.colors.brand.primary} />
            <Text style={styles.settingsBtnText}>Open device Settings</Text>
            <Ionicons name="open-outline" size={18} color={designSystem.colors.brand.primary} />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Open Banking & data sharing</Text>
          <Text style={styles.body}>
            If you use features that share account or payment data with third-party providers (e.g. bank linking, payment initiation),
            that sharing is done only with your consent. You can revoke consent for specific services in the relevant flow
            or via support. We do not sell your data. See Privacy policy for more.
          </Text>
        </ScrollView>
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
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16, paddingBottom: 32 },
  sectionTitle: {
    ...designSystem.typography.textStyles.titleSm,
    color: designSystem.colors.neutral.text,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  intro: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginBottom: 12, lineHeight: 20 },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 14,
    marginBottom: 8,
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionContent: { flex: 1 },
  permissionTitle: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text, marginBottom: 4 },
  permissionPurpose: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, lineHeight: 20 },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  settingsBtnText: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.brand.primary },
  body: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.textSecondary, lineHeight: 22 },
});
