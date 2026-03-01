/**
 * RecentContactsCarousel – Buffr G2P.
 * Horizontal list of contacts/recipients for quick send. Data from getContacts();
 * reflects real contacts; when empty shows nothing or empty state. On tap navigates
 * to send flow with recipient. Production: no placeholder data.
 * Location: components/home/RecentContactsCarousel.tsx
 */
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Contact } from '@/services/send';

export interface RecentContactsCarouselProps {
  contacts: Contact[];
  limit?: number;
  onContactPress: (contact: Contact) => void;
}

const DEFAULT_LIMIT = 8;

export function RecentContactsCarousel({
  contacts,
  limit = DEFAULT_LIMIT,
  onContactPress,
}: RecentContactsCarouselProps) {
  const shown = contacts.slice(0, limit);

  if (shown.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recent Contacts</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {shown.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.chip}
            onPress={() => onContactPress(contact)}
            activeOpacity={0.8}
            accessibilityLabel={`Send to ${contact.name}`}
          >
            <View style={styles.avatar}>
              {contact.avatarUri ? (
                <Image source={{ uri: contact.avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLetter}>
                  {(contact.name?.[0] ?? '?').toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>{contact.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  scroll: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  chip: { alignItems: 'center', minWidth: 64 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: '#0029D6' },
  name: { fontSize: 12, fontWeight: '500', color: '#374151' },
});
