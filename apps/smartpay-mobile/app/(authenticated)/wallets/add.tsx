/**
 * Add Wallet Screen - Simplified to match Figma design
 *
 * Figma: Adding A Wallet.svg, Wallet Name.svg, Setting up Icon.svg
 * Flow: Select Emoji (keyboard) -> Name Wallet -> Optional Auto Pay modal -> Save
 *
 * Location: app/(authenticated)/wallets/add.tsx
 */
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { designSystem as DS } from '@/constants/designSystem';
import { createWallet } from '@/services/wallets';
import { useWallets } from '@/contexts/WalletsContext';
import { EmojiKeyboardPicker } from '@/components/wallets/EmojiKeyboardPicker';
import { AutoPayConfigModal, type AutoPayConfig } from '@/components/wallets/AutoPayConfigModal';

export default function AddWalletScreen() {
  const { refresh, linkedAccounts } = useWallets();
  const [emoji, setEmoji] = useState('💳');
  const [name, setName] = useState('');
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [autoPayConfig, setAutoPayConfig] = useState<AutoPayConfig | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAutoPayModal, setShowAutoPayModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a wallet name');
      return;
    }

    setLoading(true);
    try {
      const wallet = await createWallet({
        name: name.trim(),
        icon: emoji,
        color: DS.colors.brand.primary,
        type: 'custom',
        currency: 'NAD',
      });

      if (wallet) {
        if (autoPayConfig) {
          console.log('[Wallet Add] Auto Pay config queued:', {
            walletId: wallet.id,
            ...autoPayConfig,
          });
        }

        await refresh();
        Alert.alert(
          'Success',
          autoPayConfig ? 'Wallet created with Auto Pay enabled' : 'Wallet created successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', 'Failed to create wallet. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create wallet:', error);
      Alert.alert('Error', 'Failed to create wallet. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Wallet</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emojiSection}>
          <TouchableOpacity
            style={styles.emojiCircle}
            onPress={() => setShowEmojiPicker(true)}
            activeOpacity={0.7}
            accessibilityLabel="Select emoji"
            accessibilityRole="button"
            accessibilityHint="Tap to open keyboard and choose wallet emoji"
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
          <Text style={styles.emojiLabel}>Set Icon</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Wallet Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Aduarium"
            placeholderTextColor={DS.colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={50}
            autoCapitalize="words"
            autoFocus
            accessibilityLabel="Wallet name input"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Auto Pay</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Text style={styles.autoPayTitle}>{autoPayEnabled ? 'Enabled' : 'Optional'}</Text>
              <Text style={styles.autoPayDescription}>
                {autoPayConfig
                  ? `${autoPayConfig.method} • ${autoPayConfig.payFromLabel}`
                  : 'Configure recurring funding for this wallet'}
              </Text>
            </View>
            <Switch
              value={autoPayEnabled}
              onValueChange={(value) => {
                setAutoPayEnabled(value);
                if (value) {
                  setShowAutoPayModal(true);
                } else {
                  setAutoPayConfig(null);
                }
              }}
              trackColor={{ false: '#787880', true: '#34C759' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#787880"
              accessibilityLabel="Auto Pay toggle"
            />
          </View>
          {autoPayEnabled && (
            <TouchableOpacity
              style={styles.autoPayRow}
              onPress={() => setShowAutoPayModal(true)}
              activeOpacity={0.7}
              accessibilityLabel="Configure autopay details"
              accessibilityRole="button"
            >
              <Text style={styles.autoPayConfigText}>Configure Auto Pay details</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || loading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading || !name.trim()}
          activeOpacity={0.8}
          accessibilityLabel="Save wallet"
          accessibilityRole="button"
        >
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <EmojiKeyboardPicker
        visible={showEmojiPicker}
        initialValue={emoji}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={(value) => {
          setEmoji(value);
          setShowEmojiPicker(false);
        }}
      />

      <AutoPayConfigModal
        visible={showAutoPayModal}
        linkedAccounts={linkedAccounts}
        initialConfig={autoPayConfig ?? undefined}
        onClose={() => setShowAutoPayModal(false)}
        onSave={(config) => {
          setAutoPayConfig(config);
          setShowAutoPayModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
  },
  backButton: {
    padding: DS.spacing.xs,
  },
  backText: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.brand.primary,
  },
  headerTitle: {
    fontSize: DS.typography.fontSize.lg,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
  },
  headerPlaceholder: {
    width: 60,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: DS.spacing['2xl'],
    paddingHorizontal: DS.spacing.md,
    paddingBottom: 100,
  },

  // Emoji Section
  emojiSection: {
    alignItems: 'center',
    marginBottom: DS.spacing['2xl'],
  },
  emojiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DS.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DS.spacing.sm,
  },
  emoji: {
    fontSize: 36,
  },
  emojiLabel: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
  },

  // Form Section
  section: {
    marginBottom: DS.spacing.xl,
  },
  label: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
    marginBottom: DS.spacing.sm,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: DS.components.input.borderRadius,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.md,
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.text,
    borderWidth: 1,
    borderColor: DS.colors.text,
    minHeight: 48,
  },

  autoPayRow: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.border,
    padding: DS.spacing.md,
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRow: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.border,
    padding: DS.spacing.md,
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLeft: {
    flex: 1,
    marginRight: DS.spacing.md,
  },
  autoPayTitle: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
  },
  autoPayDescription: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
    marginTop: 2,
    maxWidth: 250,
  },
  autoPayConfigText: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.text,
    fontWeight: DS.typography.fontWeight.medium,
  },
  chevron: {
    fontSize: 24,
    color: DS.colors.textTertiary,
    fontWeight: '300',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.md,
    paddingBottom: DS.spacing.lg,
    backgroundColor: DS.colors.background,
  },
  saveButton: {
    backgroundColor: DS.colors.text,
    borderRadius: DS.components.button.borderRadiusPill,
    paddingVertical: DS.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.background,
  },
});
