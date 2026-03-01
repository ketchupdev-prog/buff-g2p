/**
 * My QR Code – Buffr G2P.
 * Avatar → QR code card → Buffr ID chip → share / download actions.
 * §3.6 screen 41.
 */
import React, { useRef } from 'react';
import {
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';

const AVATAR_COLORS = ['#0029D6', '#7C3AED', '#059669', '#D97706', '#DC2626'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function QRCodeScreen() {
  const { profile, buffrId } = useUser();
  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() || 'User' : 'User';
  const phone = profile?.phone ?? '';
  const displayId = buffrId ?? 'BUFFR-ID';
  const qrValue = buffrId
    ? `BUFFR:${buffrId}:${phone}`
    : 'BUFFR:RECEIVE';

  const color = avatarColor(name);
  const svgRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Send me money on Buffr!\nBuffr ID: ${displayId}\nPhone: ${phone}`,
        title: `${name}'s Buffr QR`,
      });
    } catch { /* ignore */ }
  };

  const handleDownload = () => {
    // On native, QR SVG download would require react-native-share or file system.
    // For now trigger the system share sheet with the Buffr ID text.
    handleShare();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My QR Code</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={styles.avatarInitials}>{initials(name)}</Text>
          </View>
          <Text style={styles.userName}>{name}</Text>

          {/* QR card */}
          <View style={styles.qrCard}>
            <QRCode
              value={qrValue}
              size={200}
              backgroundColor="#fff"
              color="#111827"
              getRef={(ref) => { svgRef.current = ref as typeof svgRef.current; }}
            />
          </View>

          {/* ID + phone chips */}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Ionicons name="card-outline" size={14} color="#0029D6" />
              <Text style={styles.chipText}>{displayId}</Text>
            </View>
            {phone ? (
              <View style={styles.chip}>
                <Ionicons name="call-outline" size={14} color="#6B7280" />
                <Text style={[styles.chipText, { color: '#6B7280' }]}>{phone}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.hint}>Scan to send money via any NAMQR-compatible app</Text>
        </View>

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={20} color="#111827" />
            <Text style={styles.actionBtnText}>Share QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleDownload} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Download QR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  // Avatar
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarInitials: { fontSize: 30, fontWeight: '700', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 28 },

  // QR card
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  // Chips
  chipsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#0029D6' },

  hint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },

  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
  },
  actionBtnPrimary: { backgroundColor: '#020617' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#111827' },
});
