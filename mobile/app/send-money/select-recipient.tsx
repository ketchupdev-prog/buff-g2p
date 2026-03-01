/**
 * Send Money – Select Recipient – Buffr G2P.
 * §3.4 screen 27 / Figma 92:212.
 * Uses UserContext for profile and walletStatus (frozen guard).
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
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { getContacts, lookupRecipient, type Contact } from '@/services/send';

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
}

export default function SelectRecipientScreen() {
  const { profile, walletStatus } = useUser();
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lookupResult, setLookupResult] = useState<Contact | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    getContacts().then((c) => {
      setContacts(c);
      setLoadingContacts(false);
    });
  }, []);

  const handleLookup = useCallback(async () => {
    if (!query.trim()) return;
    setLooking(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const result = await lookupRecipient(query.trim());
      if (result) {
        setLookupResult(result);
      } else {
        setLookupError('No Buffr user found with that phone number or ID.');
      }
    } catch {
      setLookupError('Search failed. Please try again.');
    } finally {
      setLooking(false);
    }
  }, [query]);

  function selectContact(contact: Contact) {
    router.push({
      pathname: '/send-money/amount',
      params: { recipientPhone: contact.phone, recipientName: contact.name },
    } as never);
  }

  const filtered = query.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query)
      )
    : contacts;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Contact View',
          headerTitleStyle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: designSystem.colors.neutral.text,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={designSystem.colors.neutral.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search phone number or Buffr ID"
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={query}
              onChangeText={(t) => { setQuery(t); setLookupResult(null); setLookupError(null); }}
              keyboardType="phone-pad"
              returnKeyType="search"
              onSubmitEditing={handleLookup}
              accessibilityLabel="Search recipient"
            />
            {query ? (
              <TouchableOpacity onPress={() => { setQuery(''); setLookupResult(null); setLookupError(null); }}>
                <Ionicons name="close-circle" size={18} color={designSystem.colors.neutral.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.lookupButton}
            onPress={handleLookup}
            disabled={!query.trim() || looking}
            accessibilityLabel="Look up recipient"
          >
            {looking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.lookupText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Lookup Result */}
        {lookupResult && (
          <View style={styles.lookupResultBox}>
            <Text style={styles.lookupResultLabel}>Found:</Text>
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => selectContact(lookupResult)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(lookupResult.name)}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{lookupResult.name}</Text>
                <Text style={styles.contactPhone}>{lookupResult.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={designSystem.colors.brand.primary} />
            </TouchableOpacity>
          </View>
        )}

        {lookupError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{lookupError}</Text>
          </View>
        )}

        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {loadingContacts ? (
            <ActivityIndicator color={designSystem.colors.brand.primary} style={styles.loader} />
          ) : (
            <>
              {contacts.length > 0 && (
                <Text style={styles.sectionLabel}>Recent Contacts</Text>
              )}
              {filtered.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.contactRow}
                  onPress={() => selectContact(c)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(c.name)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Text style={styles.contactPhone}>{c.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={designSystem.colors.neutral.textTertiary} />
                </TouchableOpacity>
              ))}
              {contacts.length === 0 && !query && (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={40} color={designSystem.colors.neutral.textTertiary} />
                  <Text style={styles.emptyText}>No contacts yet.</Text>
                  <Text style={styles.emptySubtext}>Search for a phone number or Buffr ID above.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  flex: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designSystem.spacing.g2p.horizontalPadding,
    backgroundColor: designSystem.colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    gap: designSystem.spacing.scale.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.background,
    borderRadius: designSystem.radius.pill,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.text },
  lookupButton: {
    height: 44,
    backgroundColor: designSystem.colors.brand.primary,
    borderRadius: designSystem.radius.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookupText: { ...designSystem.typography.textStyles.bodySm, color: '#fff', fontWeight: '600' },
  lookupResultBox: {
    marginHorizontal: designSystem.spacing.g2p.horizontalPadding,
    marginTop: designSystem.spacing.scale.md,
    padding: designSystem.spacing.scale.md,
    backgroundColor: designSystem.colors.feedback.green100,
    borderRadius: designSystem.radius.md,
  },
  lookupResultLabel: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.semantic.success,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorBox: {
    margin: designSystem.spacing.g2p.horizontalPadding,
    padding: designSystem.spacing.scale.md,
    backgroundColor: designSystem.colors.feedback.red100,
    borderRadius: designSystem.radius.md,
  },
  errorText: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.semantic.error },
  scroll: { flex: 1, paddingHorizontal: designSystem.spacing.g2p.horizontalPadding },
  loader: { marginTop: 40 },
  sectionLabel: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.brand.primary,
    fontWeight: '700',
  },
  contactInfo: { flex: 1 },
  contactName: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, fontWeight: '500' },
  contactPhone: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginTop: 16 },
  emptySubtext: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, textAlign: 'center', marginTop: 8 },
});
