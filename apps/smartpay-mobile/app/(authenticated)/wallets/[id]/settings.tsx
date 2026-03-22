/**
 * Wallet Settings Screen - Edit wallet metadata + Auto Pay setup.
 *
 * Purpose:
 * - Edit wallet name and emoji icon.
 * - Configure Auto Pay through the guided modal sequence.
 * - Keep wallet type internal (`custom`) and never user-selected.
 *
 * Location: app/(authenticated)/wallets/[id]/settings.tsx
 */
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader } from '@/components/layout/AppHeader';
import { designSystem as DS } from '@/constants/designSystem';
import { getWalletById, updateWallet } from '@/services/wallets';
import type { Wallet } from '@/types/api';
import { useWallets } from '@/contexts/WalletsContext';
import { EmojiKeyboardPicker } from '@/components/wallets/EmojiKeyboardPicker';
import { AutoPayConfigModal, type AutoPayConfig } from '@/components/wallets/AutoPayConfigModal';

export default function WalletSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh, linkedAccounts } = useWallets();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💳');
  const [autoPayConfig, setAutoPayConfig] = useState<AutoPayConfig | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAutoPayModal, setShowAutoPayModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const data = await getWalletById(id);
      if (!data) return;
      setWallet(data);
      setName(data.name ?? '');
      setEmoji(data.icon ?? '💳');
    };
    void load();
  }, [id]);

  const handleSave = async () => {
    if (!id || !wallet) return;
    if (!name.trim()) {
      Alert.alert('Required', 'Wallet name is required.');
      return;
    }

    setLoading(true);
    try {
      await updateWallet(id, {
        name: name.trim(),
        icon: emoji,
        color: wallet.color || DS.colors.brand.primary,
      });

      if (autoPayConfig) {
        console.log('[Wallet Settings] Auto Pay config queued:', {
          walletId: id,
          ...autoPayConfig,
        });
      }

      await refresh();
      Alert.alert('Saved', 'Wallet settings updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Wallet Settings" showBackButton onBackPress={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.emojiSection}>
          <TouchableOpacity style={styles.emojiCircle} onPress={() => setShowEmojiPicker(true)} activeOpacity={0.7}>
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
          <Text style={styles.emojiLabel}>Set Icon</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Wallet Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={50}
            placeholder="Wallet name"
            placeholderTextColor={DS.colors.textTertiary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Auto Pay</Text>
          <TouchableOpacity style={styles.autoPayRow} onPress={() => setShowAutoPayModal(true)} activeOpacity={0.7}>
            <View>
              <Text style={styles.autoPayTitle}>{autoPayConfig ? 'Enabled' : 'Optional'}</Text>
              <Text style={styles.autoPayDescription}>
                {autoPayConfig
                  ? `${autoPayConfig.method} • ${autoPayConfig.payFromLabel}`
                  : 'Configure recurring funding for this wallet'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (loading || !name.trim()) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading || !name.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>

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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: DS.spacing.md,
    gap: DS.spacing.lg,
    paddingBottom: DS.spacing['2xl'],
  },
  emojiSection: {
    alignItems: 'center',
  },
  emojiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DS.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.spacing.sm,
  },
  emoji: {
    fontSize: 36,
  },
  emojiLabel: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
  },
  section: {
    gap: DS.spacing.sm,
  },
  label: {
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
  },
  input: {
    backgroundColor: DS.colors.surface,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.components.input.borderRadius,
    minHeight: 56,
    paddingHorizontal: DS.spacing.md,
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.text,
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
  chevron: {
    fontSize: 24,
    color: DS.colors.textTertiary,
    fontWeight: '300',
  },
  saveButton: {
    backgroundColor: DS.colors.text,
    borderRadius: DS.components.button.borderRadiusPill,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DS.spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: DS.colors.background,
    fontSize: DS.typography.fontSize.base,
    fontWeight: DS.typography.fontWeight.semibold,
  },
});
