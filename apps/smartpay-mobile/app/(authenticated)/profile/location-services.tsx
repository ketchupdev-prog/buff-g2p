/**
 * Location Services Preferences Screen - Smartpay
 *
 * Purpose:
 * - Manage user location permission and privacy preferences
 * - Keep location controls separate from map discovery flow
 *
 * Location: app/(authenticated)/profile/location-services.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { designSystem as ds } from '@/constants/designSystem';
import { checkLocationPermission, requestLocationPermission } from '@/services/copilot/locationService';

type PermissionLabel = 'Granted' | 'Denied' | 'Undetermined';

export default function LocationServicesScreen() {
  const router = useRouter();
  const [permissionLabel, setPermissionLabel] = useState<PermissionLabel>('Undetermined');
  const [sharePreciseLocation, setSharePreciseLocation] = useState(false);
  const [useLocationForNearby, setUseLocationForNearby] = useState(true);
  const [allowLocationBasedOffers, setAllowLocationBasedOffers] = useState(false);

  useEffect(() => {
    syncPermissionStatus();
  }, []);

  const syncPermissionStatus = async () => {
    try {
      const permission = await checkLocationPermission();
      if (permission.granted) {
        setPermissionLabel('Granted');
        setSharePreciseLocation(true);
        return;
      }

      if (permission.status === 'undetermined') {
        setPermissionLabel('Undetermined');
      } else {
        setPermissionLabel('Denied');
      }
      setSharePreciseLocation(false);
    } catch (error) {
      console.error('Failed to check location permission:', error);
      setPermissionLabel('Undetermined');
    }
  };

  const handleTogglePreciseLocation = async (enabled: boolean) => {
    if (!enabled) {
      setSharePreciseLocation(false);
      Alert.alert(
        'Location access disabled',
        'Nearby services will use your manual/default location instead of device location.'
      );
      return;
    }

    const result = await requestLocationPermission();
    if (result.granted) {
      setSharePreciseLocation(true);
      setPermissionLabel('Granted');
      return;
    }

    setSharePreciseLocation(false);
    setPermissionLabel(result.status === 'undetermined' ? 'Undetermined' : 'Denied');
    Alert.alert(
      'Permission needed',
      'Enable location access in system settings to use precise device location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  };

  const openSystemSettings = () => {
    Linking.openSettings();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={ds.colors.neutral.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Services</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="pin-outline" size={18} color={ds.colors.brand.primary} />
            <Text style={styles.statusTitle}>Current Permission</Text>
          </View>
          <View style={styles.permissionBadge}>
            <Text style={styles.permissionBadgeText}>{permissionLabel}</Text>
          </View>
          <Text style={styles.statusHint}>
            Control how Smartpay uses your location for nearby agents, ATMs, and NamPost branches.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="locate-outline"
              label="Share Precise Location"
              subtitle="Use your device GPS for nearby results"
              value={sharePreciseLocation}
              onValueChange={handleTogglePreciseLocation}
            />
            <View style={styles.menuDivider} />
            <SettingRow
              icon="map-outline"
              label="Use Location for Nearby Services"
              subtitle="Agents, ATMs, and NamPost finder"
              value={useLocationForNearby}
              onValueChange={setUseLocationForNearby}
            />
            <View style={styles.menuDivider} />
            <SettingRow
              icon="megaphone-outline"
              label="Location-Based Offers"
              subtitle="Allow nearby promotions and service suggestions"
              value={allowLocationBasedOffers}
              onValueChange={setAllowLocationBasedOffers}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.systemSettingsButton} onPress={openSystemSettings} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={18} color={ds.colors.brand.primary} />
          <Text style={styles.systemSettingsText}>Open Device Location Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  subtitle,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void | Promise<void>;
}) {
  return (
    <View style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconBox}>
          <Ionicons name={icon} size={20} color={ds.colors.brand.primary} />
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuItemText}>{label}</Text>
          <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: ds.colors.neutral.muted, true: ds.colors.brand.primaryLight }}
        thumbColor={value ? ds.colors.brand.primary : ds.colors.neutral.textTertiary}
        ios_backgroundColor={ds.colors.neutral.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.colors.neutral.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ds.spacing.md,
    paddingVertical: ds.spacing.sm,
    backgroundColor: ds.colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: ds.colors.neutral.border,
  },
  backBtn: { padding: ds.spacing.sm },
  headerTitle: { ...ds.typography.textStyles.h2, color: ds.colors.neutral.text },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  container: { paddingHorizontal: ds.spacing.md, paddingBottom: ds.spacing.xxl },
  statusCard: {
    marginTop: ds.spacing.lg,
    marginBottom: ds.spacing.lg,
    backgroundColor: ds.colors.neutral.surface,
    borderRadius: ds.radius.lg,
    padding: ds.spacing.md,
    ...ds.shadows.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: ds.spacing.xs, marginBottom: ds.spacing.sm },
  statusTitle: { ...ds.typography.textStyles.body, color: ds.colors.neutral.text, fontWeight: '600' },
  permissionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: ds.spacing.sm,
    paddingVertical: 4,
    borderRadius: ds.radius.sm,
    backgroundColor: ds.colors.brand.primaryMuted,
    marginBottom: ds.spacing.sm,
  },
  permissionBadgeText: { ...ds.typography.textStyles.caption, color: ds.colors.brand.primary, fontWeight: '600' },
  statusHint: { ...ds.typography.textStyles.bodySmall, color: ds.colors.neutral.textSecondary },
  section: { marginBottom: ds.spacing.lg },
  sectionTitle: {
    ...ds.typography.textStyles.caption,
    color: ds.colors.neutral.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: ds.spacing.sm,
    paddingHorizontal: ds.spacing.xs,
  },
  sectionCard: {
    backgroundColor: ds.colors.neutral.surface,
    borderRadius: ds.radius.lg,
    overflow: 'hidden',
    ...ds.shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: ds.spacing.md,
    minHeight: 56,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ds.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ds.spacing.sm,
  },
  menuTextWrap: { flex: 1 },
  menuItemText: { ...ds.typography.textStyles.body, color: ds.colors.neutral.text },
  menuItemSubtitle: { ...ds.typography.textStyles.caption, color: ds.colors.neutral.textSecondary, marginTop: 2 },
  menuDivider: {
    height: 1,
    backgroundColor: ds.colors.neutral.border,
    marginLeft: 56,
  },
  systemSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ds.spacing.xs,
    paddingVertical: ds.spacing.md,
    borderRadius: ds.radius.pill,
    backgroundColor: ds.colors.brand.primaryMuted,
    borderWidth: 1,
    borderColor: ds.colors.brand.primaryLight,
  },
  systemSettingsText: {
    ...ds.typography.textStyles.bodySmall,
    color: ds.colors.brand.primary,
    fontWeight: '600',
  },
});
