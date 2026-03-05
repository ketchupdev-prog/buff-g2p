/**
 * ContactsList Component
 * 
 * Purpose: Reusable contact list with search and selection
 * Location: mobile/components/shared/ContactsList.tsx
 * 
 * Features:
 * - Search functionality
 * - Contact avatar with initials
 * - Loading state
 * - Empty state
 * - Click to select contact
 * 
 * Follows Rule 2: Modular component for easy maintenance
 * Follows Rule 3: Component documentation
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '@/constants/designSystem';
import { ErrorState } from '@/components/ui';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface ContactsListProps {
  contacts: Contact[];
  loading?: boolean;
  onSelect: (contact: Contact) => void;
  showSearch?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
}

export function ContactsList({
  contacts,
  loading = false,
  onSelect,
  showSearch = true,
  emptyMessage = 'No contacts found',
  searchPlaceholder = 'Search contacts',
}: ContactsListProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query)
      )
    : contacts;

  return (
    <View style={styles.container}>
      {/* Search */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={designSystem.colors.neutral.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              accessibilityLabel="Search contacts"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={designSystem.colors.neutral.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Contact List */}
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={designSystem.colors.brand.primary} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <ErrorState
            variant="empty"
            title={emptyMessage}
            message={query.trim() ? 'Try a different search term' : 'Your contacts will appear here'}
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            {contacts.length > 0 && !query && (
              <Text style={styles.sectionLabel}>Recent Contacts</Text>
            )}
            {filtered.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.contactRow}
                onPress={() => onSelect(c)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(c.name)}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={designSystem.colors.brand.primary} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    paddingHorizontal: DS.spacing.g2p.horizontalPadding,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.neutral.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.neutral.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: DS.colors.neutral.text,
  },
  scroll: { flex: 1 },
  loader: { marginTop: 48 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.colors.neutral.textSecondary,
    marginHorizontal: DS.spacing.g2p.horizontalPadding,
    marginTop: 16,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.g2p.horizontalPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.neutral.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.colors.neutral.text,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: DS.colors.neutral.textSecondary,
  },
});
