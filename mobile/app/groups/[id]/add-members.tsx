/**
 * Add Members – Buffr G2P. Admin-only; invite by phone or add to group.
 * Persists to local list when API not used; Group Settings reads and shows updated members.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { getSecureItem } from '@/services/secureStorage';

const DS = designSystem;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const STORAGE_KEY_GROUP_MEMBERS = 'buffr_group_settings_members_';

interface NewMember {
  id: string;
  name: string;
  role: 'member';
  phone?: string;
}

export default function AddMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite() {
    const trimmedPhone = phone.replace(/\s/g, '');
    const trimmedName = name.trim() || (trimmedPhone ? `+${trimmedPhone}` : '');
    if (!trimmedPhone && !name.trim()) {
      setError('Enter a phone number or name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (API_BASE_URL) {
        const token = await getSecureItem('buffr_access_token');
        const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups/${id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...h },
          body: JSON.stringify({ phone: trimmedPhone || undefined, name: trimmedName || undefined }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? 'Could not add member.');
          return;
        }
      } else {
        const newMember: NewMember = {
          id: `m_${Date.now()}`,
          name: trimmedName || 'New member',
          role: 'member',
          phone: trimmedPhone || undefined,
        };
        const key = STORAGE_KEY_GROUP_MEMBERS + id;
        const raw = await AsyncStorage.getItem(key);
        const list = raw ? (JSON.parse(raw) as NewMember[]) : [];
        list.push(newMember);
        await AsyncStorage.setItem(key, JSON.stringify(list));
      }
      router.back();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Add Members', headerTintColor: DS.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.content}>
            <Text style={styles.hint}>Invite by phone number. They'll receive a link to join the group.</Text>

            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={t => { setPhone(t); setError(null); }}
              placeholder="+264 81 234 5678"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Text style={styles.label}>Name (optional)</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Display name"
              placeholderTextColor="#94A3B8"
              editable={!loading}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleInvite}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send invite</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  content: { padding: 20 },
  hint: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 13, color: DS.colors.neutral.textSecondary, marginBottom: 8 },
  input: {
    height: 52, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, fontSize: 16, color: DS.colors.neutral.text,
    marginBottom: 16, borderWidth: 1, borderColor: DS.colors.neutral.border,
  },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginBottom: 12 },
  btn: { height: 52, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
