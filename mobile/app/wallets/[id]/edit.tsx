/**
 * Edit Wallet – Buffr G2P.
 * Edit wallet name, icon, and card design. Calls updateWallet.
 * Location: app/wallets/[id]/edit.tsx
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { CARD_DESIGN_FRAME_IDS, CARD_FRAME_FILL, PRIMARY_WALLET_CARD_FRAME_ID } from '@/constants/CardDesign';
import { getWallet, updateWallet, type Wallet } from '@/services/wallets';
import { EmojiIcon, EmojiPicker } from '@/components/ui';

const DS = designSystem;

export default function EditWalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💼');
  const [cardDesignFrameId, setCardDesignFrameId] = useState<number>(PRIMARY_WALLET_CARD_FRAME_ID);
  const [nameFocused, setNameFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const w = await getWallet(id);
      setWallet(w);
      if (w) {
        setName(w.name);
        setIcon(w.icon?.trim() || '💼');
        setCardDesignFrameId(w.cardDesignFrameId ?? PRIMARY_WALLET_CARD_FRAME_ID);
      }
    } catch (e) {
      console.error('EditWallet load:', e);
      setError('Could not load wallet.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a wallet name.');
      return;
    }
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      const result = await updateWallet(id, {
        name: trimmed,
        icon: icon || undefined,
        cardDesignFrameId,
      });
      if (result.success) {
        router.back();
      } else {
        setError(result.error ?? 'Could not update wallet.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: true, title: 'Edit Wallet', headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
        <View style={styles.center}>
          <ActivityIndicator color={DS.colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!wallet) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: true, title: 'Edit Wallet', headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
        <View style={styles.center}>
          <Text style={styles.notFound}>Wallet not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Wallet',
          headerTintColor: DS.colors.neutral.text,
          headerStyle: { backgroundColor: '#fff' },
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
              {saving ? (
                <ActivityIndicator size="small" color={DS.colors.brand.primary} />
              ) : (
                <Ionicons name="checkmark" size={24} color={DS.colors.brand.primary} />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.iconField}>
            <EmojiIcon value={icon} onPress={() => setShowEmojiPicker(true)} size={80} />
            <Text style={styles.iconLabel}>Icon</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Wallet Name</Text>
            <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Savings"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(t) => { setName(t); setError(null); }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                returnKeyType="done"
                maxLength={50}
              />
            </View>
          </View>
          <View style={styles.cardDesignSection}>
            <Text style={styles.fieldLabel}>Card design</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardDesignRow}
            >
              {CARD_DESIGN_FRAME_IDS.map((frameId) => {
                const fill = CARD_FRAME_FILL[frameId] ?? '#1E40AF';
                const selected = cardDesignFrameId === frameId;
                return (
                  <TouchableOpacity
                    key={frameId}
                    style={[
                      styles.cardDesignSwatch,
                      { backgroundColor: fill },
                      selected && styles.cardDesignSwatchSelected,
                    ]}
                    onPress={() => setCardDesignFrameId(frameId)}
                    accessibilityLabel={`Card design ${frameId}`}
                    accessibilityState={{ selected }}
                  >
                    {selected && (
                      <View style={styles.cardDesignCheck}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={(emoji) => { setIcon(emoji); setShowEmojiPicker(false); }}
        selected={icon}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFound: { fontSize: 16, color: DS.colors.neutral.textSecondary, marginBottom: 12 },
  link: { fontSize: 16, color: DS.colors.brand.primary },
  saveBtn: { marginRight: 16, minWidth: 32, alignItems: 'flex-end' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  iconField: { alignItems: 'center', marginBottom: 24 },
  iconLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginTop: 8 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginBottom: 8 },
  inputWrap: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    backgroundColor: DS.colors.neutral.surface,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: DS.colors.brand.primary },
  input: { fontSize: 16, color: DS.colors.neutral.text, padding: 0 },
  cardDesignSection: { marginBottom: 24 },
  cardDesignRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  cardDesignSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDesignSwatchSelected: {
    borderWidth: 3,
    borderColor: DS.colors.brand.primary,
  },
  cardDesignCheck: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 8 },
});
