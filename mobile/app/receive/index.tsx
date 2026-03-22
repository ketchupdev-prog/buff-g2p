/**
 * Receive Money – Buffr G2P.
 * Large QR in card (avatar, name, Buffr ID, QR, copy pill); receive to main or wallet of choice; Share QR + Download QR.
 * PRD §3.9, §7.6.1. No UPI wording.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';
import { useUser } from '@/contexts/UserContext';
import { getWallets, type Wallet } from '@/services/wallets';
import { QRCodeCard } from '@/components/QRCodeCard';

const DS = designSystem;

const MAIN_WALLET_OPTION: { id: string; name: string; type: 'main' } = {
  id: '',
  name: 'Buffr main wallet',
  type: 'main',
};

export default function ReceiveScreen() {
  const { profile, buffrId } = useUser();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<{ id: string; name: string; type: string }>(MAIN_WALLET_OPTION);
  const [copied, setCopied] = useState(false);

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() || 'User' : 'User';
  const displayId = buffrId ?? '—';
  const phone = profile?.phone ?? '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getWallets();
      if (!cancelled) {
        setWallets(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const options = [MAIN_WALLET_OPTION, ...wallets.map((w) => ({ id: w.id, name: w.name, type: w.type }))];
  const qrValue = buffrId
    ? selectedWallet.id
      ? `BUFFR:${buffrId}:${phone}:${selectedWallet.id}`
      : `BUFFR:${buffrId}:${phone}`
    : 'BUFFR:RECEIVE';

  const shareMessage = phone
    ? `Send me money on Buffr!\nBuffr ID: ${displayId}\nPhone: ${phone}\nReceive to: ${selectedWallet.name}`
    : `Send me money on Buffr!\nBuffr ID: ${displayId}\nReceive to: ${selectedWallet.name}`;

  const shareQR = async () => {
    try {
      await Share.share({ message: shareMessage, title: 'Receive Money on Buffr' });
    } catch { /* ignore */ }
  };

  const downloadQR = async () => {
    try {
      await Share.share({ message: shareMessage, title: 'Receive Money on Buffr' });
    } catch { /* ignore */ }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Receive Money',
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text },
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: DS.colors.neutral.text,
          headerStyle: { backgroundColor: DS.colors.neutral.surface },
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            Show your QR code or share your Buffr ID so someone can send you money.
          </Text>

          {/* Receive to */}
          <Text style={styles.receiveToLabel}>Receive to</Text>
          {loading ? (
            <ActivityIndicator size="small" color={DS.colors.brand.primary} style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.walletOptions}>
              {options.map((opt) => {
                const isSelected = selectedWallet.id === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id || 'main'}
                    style={[styles.walletChip, isSelected ? styles.walletChipSelected : null]}
                    onPress={() => setSelectedWallet(opt)}
                    activeOpacity={0.8}
                    accessibilityLabel={`Receive to ${opt.name}`}
                  >
                    <Text style={[styles.walletChipText, isSelected ? styles.walletChipTextSelected : null]}>
                      {opt.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Card: avatar, name, Buffr ID, optional Receive to (only when not main), large QR, ID pill with copy, hint */}
          <QRCodeCard
            fullName={fullName}
            buffrId={displayId}
            qrValue={qrValue}
            receiveToWalletName={selectedWallet.id ? selectedWallet.name : undefined}
            hint={`Scan to pay or send money to ${selectedWallet.name}`}
            copied={copied}
            onCopiedChange={setCopied}
          />

          {/* Share QR + Download QR */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={shareQR} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={20} color={DS.colors.neutral.text} />
              <Text style={styles.actionBtnText}>Share QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={downloadQR} activeOpacity={0.8}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Download QR</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },

  lead: {
    fontSize: 15,
    color: DS.colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  receiveToLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.colors.neutral.textSecondary,
    marginBottom: 8,
  },
  walletOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  walletChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: DS.radius.pill,
    backgroundColor: DS.colors.neutral.surface,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
  },
  walletChipSelected: {
    backgroundColor: DS.colors.brand.primaryMuted,
    borderColor: DS.colors.brand.primary,
  },
  walletChipText: { fontSize: 14, fontWeight: '500', color: DS.colors.neutral.text },
  walletChipTextSelected: { color: DS.colors.brand.primary },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: DS.radius.pill,
    backgroundColor: DS.colors.neutral.surface,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
  },
  actionBtnPrimary: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
});
