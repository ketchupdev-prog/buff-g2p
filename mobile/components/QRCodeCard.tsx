/**
 * QRCodeCard – Buffr G2P.
 * Single card layout for Receive and Profile: user row (avatar, name, Buffr ID), optional
 * "Receive to" wallet label, large QR, ID pill with copy, hint.
 * Represents main Buffr account when receiveToWalletName is omitted; when provided (Receive
 * screen with wallet of choice), shows which wallet the QR credits. PRD §3.9, §4.5 (per-wallet
 * QR for receive), §7.6.1. No UPI wording.
 * Location: components/QRCodeCard.tsx
 */
import React from 'react';
import { Clipboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { designSystem } from '@/constants/designSystem';
import { Avatar } from '@/components/ui/Avatar';

const DS = designSystem;
const QR_SIZE = 220;

export interface QRCodeCardProps {
  fullName: string;
  buffrId: string;
  qrValue: string;
  /** When set, QR credits this wallet (Receive screen). When omitted, card represents main Buffr account (Profile). PRD §4.5 per-wallet QR. */
  receiveToWalletName?: string;
  hint?: string;
  copied?: boolean;
  onCopy?: () => void;
  onCopiedChange?: (copied: boolean) => void;
}

export function QRCodeCard({
  fullName,
  buffrId,
  qrValue,
  receiveToWalletName,
  hint = 'Scan to pay or send money',
  copied = false,
  onCopy,
  onCopiedChange,
}: QRCodeCardProps) {
  const handleCopy = () => {
    if (buffrId) {
      Clipboard.setString(buffrId);
      onCopiedChange?.(true);
      setTimeout(() => onCopiedChange?.(false), 2000);
    }
    onCopy?.();
  };

  return (
    <View style={styles.card}>
      {/* User row: avatar + name + Buffr ID */}
      <View style={styles.userRow}>
        <Avatar name={fullName} size={64} />
        <View style={styles.userText}>
          <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.userId} numberOfLines={1}>{buffrId}</Text>
        </View>
      </View>

      {/* When sharing a specific wallet, show which one the QR credits (PRD §4.5 per-wallet QR) */}
      {receiveToWalletName ? (
        <View style={styles.receiveToWrap}>
          <Text style={styles.receiveToLabel}>Receive to</Text>
          <Text style={styles.receiveToName}>{receiveToWalletName}</Text>
        </View>
      ) : null}

      {/* Large QR */}
      <View style={styles.qrWrap}>
        <QRCode
          value={qrValue}
          size={QR_SIZE}
          backgroundColor={DS.colors.neutral.surface}
          color="#111827"
        />
      </View>

      {/* Buffr ID pill with copy */}
      <TouchableOpacity
        style={styles.idPill}
        onPress={handleCopy}
        disabled={!buffrId}
        activeOpacity={0.8}
        accessibilityLabel={copied ? 'Copied' : 'Copy Buffr ID'}
      >
        <Text style={styles.idPillText}>{buffrId}</Text>
        {copied ? (
          <Ionicons name="checkmark" size={18} color={DS.colors.semantic.success} />
        ) : (
          <Ionicons name="copy-outline" size={18} color={DS.colors.brand.primary} />
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.colors.neutral.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...DS.shadows.lg,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  userText: { flex: 1, marginLeft: 16, minWidth: 0 },
  userName: { fontSize: 18, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 2 },
  userId: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  receiveToWrap: {
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: DS.colors.neutral.background,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: DS.colors.brand.primary,
  },
  receiveToLabel: { fontSize: 11, fontWeight: '600', color: DS.colors.neutral.textTertiary, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  receiveToName: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  qrWrap: {
    alignSelf: 'center',
    backgroundColor: DS.colors.neutral.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: DS.colors.brand.primaryMuted,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: DS.radius.pill,
    marginBottom: 12,
    minWidth: 160,
  },
  idPillText: { fontSize: 14, fontWeight: '600', color: DS.colors.brand.primary },
  hint: { fontSize: 12, color: DS.colors.neutral.textTertiary, textAlign: 'center', lineHeight: 18 },
});
