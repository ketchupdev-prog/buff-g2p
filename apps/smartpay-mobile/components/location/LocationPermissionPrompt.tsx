import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { designSystem as DS } from '@/constants/designSystem';

export interface LocationPermissionPromptProps {
  onAllowLocation: () => void;
  onSearchManually: () => void;
}

/**
 * Pre-permission explanation card (Figma-aligned: surface #F8FAFC, primary CTA #0029D6).
 */
export function LocationPermissionPrompt({
  onAllowLocation,
  onSearchManually,
}: LocationPermissionPromptProps) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.card}>
        <View style={styles.iconCircle} accessibilityElementsHidden>
          <Ionicons name="location" size={36} color={DS.colors.figmaPrimary} />
        </View>
        <Text style={styles.title}>Find agents near you</Text>
        <Text style={styles.body}>
          We&apos;ll show you nearby agents for cash-out. Your location is not stored.
        </Text>
        <Button
          title="Allow location"
          onPress={onAllowLocation}
          variant="primary"
          size="lg"
          accessibilityLabel="Allow location access"
        />
        <View style={styles.spacer} />
        <Button
          title="Search manually"
          onPress={onSearchManually}
          variant="outline"
          size="lg"
          accessibilityLabel="Search without sharing location"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    justifyContent: 'center',
    backgroundColor: DS.colors.surface,
  },
  card: {
    backgroundColor: DS.colors.background,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: DS.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DS.colors.brand.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: DS.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  spacer: { height: 12 },
});
