/**
 * Profile Settings – Buffr G2P.
 * §3.5 screen 36. Sections: Account, Security, Notifications, Privacy, Help, About.
 * Uses UserContext for profile and state consistency.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

type SettingItem = { id: string; label: string; icon: string; route?: string; onPress?: () => void };

const SECTIONS: Array<{ title: string; items: SettingItem[] }> = [
  {
    title: 'Account',
    items: [
      { id: 'profile', label: 'Edit profile', icon: 'person-outline', route: '/(tabs)/profile' },
      { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', route: '/(tabs)/profile/notifications' },
    ],
  },
  {
    title: 'Security',
    items: [
      { id: 'proof', label: 'Proof of life', icon: 'shield-checkmark-outline', route: '/proof-of-life/verify' },
      { id: 'pin', label: 'Change PIN', icon: 'key-outline' },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { id: 'privacy', label: 'Privacy policy', icon: 'document-text-outline' },
      { id: 'data', label: 'Data & permissions', icon: 'lock-closed-outline' },
    ],
  },
  {
    title: 'Help',
    items: [
      { id: 'help', label: 'Help centre', icon: 'help-circle-outline' },
      { id: 'contact', label: 'Contact us', icon: 'chatbubble-ellipses-outline' },
    ],
  },
  {
    title: 'About',
    items: [
      { id: 'about', label: 'About Buffr', icon: 'information-circle-outline' },
      { id: 'terms', label: 'Terms of service', icon: 'document-outline' },
      { id: 'version', label: 'App version', icon: 'phone-portrait-outline' },
    ],
  },
];

export default function ProfileSettingsScreen() {
  useUser();
  const handlePress = (item: SettingItem) => {
    if (item.route) router.push(item.route as never);
    else if (item.onPress) item.onPress();
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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.row, index < section.items.length - 1 && styles.rowBorder]}
                    onPress={() => handlePress(item)}
                    accessibilityLabel={item.label}
                    disabled={item.id === 'version'}
                  >
                    <View style={styles.rowLeft}>
                      <Ionicons name={item.icon as never} size={20} color={designSystem.colors.neutral.textSecondary} />
                      <Text style={[styles.rowLabel, item.id === 'version' && styles.rowLabelMuted]}>{item.label}</Text>
                      {item.id === 'version' && <Text style={styles.versionText}>1.0.0</Text>}
                    </View>
                    {item.id !== 'version' && <Ionicons name="chevron-forward" size={18} color={designSystem.colors.neutral.textTertiary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          <View style={{ height: 32 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: designSystem.colors.neutral.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  rowLabel: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text },
  rowLabelMuted: { color: designSystem.colors.neutral.textTertiary },
  versionText: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textTertiary, marginLeft: 8 },
});
