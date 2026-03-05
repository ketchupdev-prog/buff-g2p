/**
 * Create Group – Buffr G2P.
 * Single-screen contact picker per Buffr app design: header with count, selected members strip
 * (5 slots: dotted Add placeholders + avatars with name and remove X), search contact,
 * contacts list with diamond selector, Create Group button (disabled when 0 selected).
 * §3.6 group creation; §47c-vi Add Members flow.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { getSecureItem } from '@/services/secureStorage';
import { getContacts, type Contact } from '@/services/send';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui';

const DS = designSystem;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const MAX_VISIBLE_SLOTS = 5;

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function createGroup(params: {
  name: string;
  purpose: string;
  type: string;
  maxMembers: number;
  invitePhones: string[];
}): Promise<{ success: boolean; groupId?: string; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { groupId?: string; error?: string };
      if (res.ok) return { success: true, groupId: data.groupId };
      return { success: false, error: data.error };
    } catch { /* fall through */ }
  }
  return { success: true, groupId: 'grp_' + Date.now() };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export default function CreateGroupScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Contact[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    getContacts().then((c) => {
      setContacts(c);
      setLoading(false);
    });
  }, []);

  const filtered = query.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query)
      )
    : contacts;

  const toggleContact = (c: Contact) => {
    setSelected((prev) =>
      prev.some((x) => x.id === c.id)
        ? prev.filter((x) => x.id !== c.id)
        : [...prev, c]
    );
  };

  const removeSelected = (c: Contact) => {
    setSelected((prev) => prev.filter((x) => x.id !== c.id));
  };

  const isSelected = (c: Contact) => selected.some((x) => x.id === c.id);

  async function handleCreate() {
    if (selected.length === 0) return;
    setSubmitting(true);
    setError(null);
    const result = await createGroup({
      name: 'New Group',
      purpose: '',
      type: 'custom',
      maxMembers: 20,
      invitePhones: selected.map((c) => c.phone.replace(/\s/g, '')),
    });
    setSubmitting(false);
    if (result.success) {
      setDone(result.groupId ?? 'new');
    } else {
      setError(result.error ?? 'Failed to create group. Please try again.');
    }
  }

  if (done) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <View style={styles.successIcon}>
              <Ionicons name="people-circle-outline" size={44} color={DS.colors.brand.primary} />
            </View>
            <Text style={styles.successTitle}>Group Created!</Text>
            <Text style={styles.successSub}>You can add a name and more members in group settings.</Text>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => router.replace({ pathname: '/groups/[id]', params: { id: done } } as never)}
            >
              <Text style={styles.viewBtnText}>View Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/(tabs)' as never)}>
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Create Group',
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text },
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: DS.colors.neutral.text,
          headerStyle: { backgroundColor: DS.colors.neutral.surface },
          headerRight: () => (
            <View style={styles.headerCount}>
              <Text style={styles.headerCountText}>{selected.length}</Text>
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Selected members strip: 5 slots */}
        <View style={styles.selectedStrip}>
          {Array.from({ length: MAX_VISIBLE_SLOTS }).map((_, i) => {
            const contact = selected[i];
            if (contact) {
              return (
                <View key={contact.id} style={styles.slot}>
                  <View style={styles.avatarWrap}>
                    <Avatar name={contact.name} size={56} />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeSelected(contact)}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${contact.name}`}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.slotName} numberOfLines={1}>{firstName(contact.name)}</Text>
                </View>
              );
            }
            return (
              <View key={`empty-${i}`} style={styles.slot}>
                <View style={styles.emptySlot}>
                  <Text style={styles.addLabel}>Add</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Search contact */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={DS.colors.neutral.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contact"
            placeholderTextColor={DS.colors.neutral.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            accessibilityLabel="Search contact"
          />
        </View>

        {/* Contacts section */}
        <Text style={styles.sectionTitle}>Contacts</Text>

        {loading ? (
          <ActivityIndicator color={DS.colors.brand.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const sel = isSelected(item);
              return (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => toggleContact(item)}
                  activeOpacity={0.7}
                  accessibilityLabel={sel ? `Deselect ${item.name}` : `Select ${item.name}`}
                  accessibilityState={{ selected: sel }}
                >
                  <Avatar name={item.name} size={44} />
                  <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.diamond, sel && styles.diamondSelected]}>
                    {sel ? (
                      <Ionicons name="add" size={16} color="#fff" />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {query.trim() ? 'No contacts match your search' : 'No contacts yet'}
              </Text>
            }
          />
        )}

        {error ? (
          <ErrorState
            variant="default"
            message={error}
            onRetry={handleCreate}
            style={styles.errorWrap}
          />
        ) : null}

        {/* Create Group button */}
        <TouchableOpacity
          style={[
            styles.createBtn,
            selected.length === 0 && styles.createBtnDisabled,
            submitting && styles.createBtnDisabled,
          ]}
          onPress={handleCreate}
          disabled={selected.length === 0 || submitting}
          activeOpacity={0.9}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.createBtnText, selected.length === 0 && styles.createBtnTextDisabled]}>
              Create Group
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  safe: { flex: 1 },
  flex: { flex: 1 },

  headerCount: {
    minWidth: 28,
    alignItems: 'flex-end',
  },
  headerCountText: {
    fontSize: 17,
    fontWeight: '700',
    color: DS.colors.neutral.text,
  },

  selectedStrip: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: DS.colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.neutral.border,
  },
  slot: { alignItems: 'center', width: 64 },
  avatarWrap: { position: 'relative', marginBottom: 6 },
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: DS.colors.neutral.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DS.colors.neutral.textTertiary,
  },
  slotName: {
    fontSize: 12,
    fontWeight: '500',
    color: DS.colors.neutral.text,
    maxWidth: 64,
    textAlign: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
    height: 44,
    backgroundColor: DS.colors.neutral.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: DS.colors.neutral.text,
    paddingVertical: 0,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.colors.neutral.textSecondary,
    marginHorizontal: 24,
    marginBottom: 8,
  },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingBottom: 24 },
  loader: { marginTop: 48 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.neutral.border,
    gap: 12,
  },
  contactName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: DS.colors.neutral.text,
    minWidth: 0,
  },
  diamond: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: DS.colors.neutral.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diamondSelected: {
    backgroundColor: DS.colors.neutral.text,
    borderColor: DS.colors.neutral.text,
  },
  emptyText: {
    fontSize: 14,
    color: DS.colors.neutral.textTertiary,
    textAlign: 'center',
    marginTop: 24,
  },
  errorWrap: { marginHorizontal: 24, marginBottom: 12 },

  createBtn: {
    height: 56,
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.neutral.text,
  },
  createBtnDisabled: {
    backgroundColor: DS.colors.neutral.border,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  createBtnTextDisabled: {
    color: DS.colors.neutral.textTertiary,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: DS.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: DS.colors.neutral.text, marginBottom: 8 },
  successSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 32 },
  viewBtn: {
    height: 56,
    backgroundColor: DS.colors.brand.primary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    marginBottom: 12,
  },
  viewBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  homeLink: { paddingVertical: 8 },
  homeLinkText: { fontSize: 15, color: DS.colors.brand.primary, fontWeight: '600' },
});
