/**
 * AppHeader – Buffr G2P.
 * Standard app header: search bar (left) + notification bell + user avatar (right).
 * Design: elongated search pill; compact right group (bell with badge, avatar) in same style.
 * Use on Home, Transactions, Vouchers, Bills, Agents, Location and any screen with search in header.
 * Location: components/layout/AppHeader.tsx
 */
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AppHeaderProps {
  /** Placeholder when search is shown. Default "Search anything..." */
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  /** When false, show title instead of search (e.g. Settings, Notifications). */
  showSearch?: boolean;
  /** Title when showSearch is false. */
  title?: string;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
  /** User photo URI (e.g. from UserContext profile.photoUri). */
  avatarUri?: string | null;
  /** Initials when no photo (e.g. first letter of firstName + lastName). Shown in avatar placeholder. */
  avatarInitials?: string | null;
  /** Show red badge on notification icon. */
  notificationBadge?: boolean;
  /** Show a back arrow on the left (for pushed stack screens with custom header). */
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const SEARCH_PLACEHOLDER = 'Search anything...';

export function AppHeader({
  searchPlaceholder = SEARCH_PLACEHOLDER,
  searchValue = '',
  onSearchChange,
  showSearch = true,
  title = '',
  onNotificationPress,
  onAvatarPress,
  avatarUri = null,
  avatarInitials = null,
  notificationBadge = false,
  showBackButton = false,
  onBackPress,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      {showBackButton && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBackPress}
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
      )}
      {showSearch ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#94A3B8"
            value={searchValue}
            onChangeText={onSearchChange}
            editable={onSearchChange != null}
          />
        </View>
      ) : (
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      )}

      <View style={styles.rightGroup}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onNotificationPress}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={24} color="#4B5563" />
          {notificationBadge && <View style={styles.badge} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={onAvatarPress}
          accessibilityLabel="Profile"
          activeOpacity={0.8}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              {avatarInitials ? (
                <Text style={styles.avatarInitials} numberOfLines={1}>{avatarInitials}</Text>
              ) : (
                <Ionicons name="person-outline" size={22} color="#64748B" />
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#020617', paddingVertical: 0 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#111827' },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    minWidth: 88,
    backgroundColor: '#F8FAFC',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  backBtn: { padding: 4, marginRight: 4 },
  iconBtn: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    backgroundColor: '#E11D48',
    borderRadius: 4,
  },
  avatarWrap: {
    marginLeft: 0,
    width: 36,
    height: 36,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0029D6',
    letterSpacing: 0.5,
  },
});
