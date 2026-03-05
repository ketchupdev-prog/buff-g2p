/**
 * Your QR Code – Buffr G2P.
 * Same card as Receive: avatar, name, Buffr ID, large QR, copy pill, hint. Share QR + Download QR.
 * Profile entry; §3.6 screen 41. No UPI wording.
 */
import React, { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { QRCodeCard } from '@/components/QRCodeCard';

const DS = designSystem;

export default function QRCodeScreen() {
  const { profile, buffrId } = useUser();
  const [copied, setCopied] = useState(false);

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() || 'User' : 'User';
  const displayId = buffrId ?? 'BUFFR-ID';
  const phone = profile?.phone ?? '';
  const qrValue = buffrId ? `BUFFR:${buffrId}:${phone}` : 'BUFFR:RECEIVE';

  const shareMessage = `Send me money on Buffr!\nBuffr ID: ${displayId}${phone ? `\nPhone: ${phone}` : ''}`;

  const handleShare = async () => {
    try {
      await Share.share({ message: shareMessage, title: `${fullName}'s Buffr QR` });
    } catch { /* ignore */ }
  };

  const handleDownload = async () => {
    try {
      await Share.share({ message: shareMessage, title: `${fullName}'s Buffr QR` });
    } catch { /* ignore */ }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={DS.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your QR Code</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          <QRCodeCard
            fullName={fullName}
            buffrId={displayId}
            qrValue={qrValue}
            hint="Scan to pay or send money"
            copied={copied}
            onCopiedChange={setCopied}
          />

          {/* Share QR + Download QR */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={20} color={DS.colors.neutral.text} />
              <Text style={styles.actionBtnText}>Share QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleDownload} activeOpacity={0.8}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Download QR</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: DS.colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.neutral.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.neutral.background,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DS.colors.neutral.text },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  scrollContent: { paddingBottom: 32 },

  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: DS.radius.pill,
    backgroundColor: DS.colors.neutral.background,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
  },
  actionBtnPrimary: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
});
