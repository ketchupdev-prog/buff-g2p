/**
 * WalletCard – Buffr G2P.
 * Single wallet card for the home carousel.
 * Design matches voucher card visual language: colored icon + balance + progress bar.
 * Location: components/home/WalletCard.tsx
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Wallet } from '@/services/wallets';
import { getWalletCardFill } from '@/constants/CardDesign';
import { getWalletIcon, getWalletProgress } from '@/utils/walletDisplay';

export interface WalletCardComponentProps {
  wallet: Wallet;
  index: number;
  onPress: () => void;
}

// Map a wallet type to an Ionicons icon name
function getIoniconName(wallet: Wallet): React.ComponentProps<typeof Ionicons>['name'] {
  const t = (wallet.type ?? '').toLowerCase();
  if (t.includes('saving')) return 'wallet-outline';
  if (t.includes('business')) return 'briefcase-outline';
  if (t.includes('loan')) return 'cash-outline';
  return 'card-outline';
}

export function WalletCard({ wallet, index, onPress }: WalletCardComponentProps) {
  const progress = getWalletProgress(wallet);
  const accentColor = getWalletCardFill(wallet.cardDesignFrameId, index);
  const barPercent = progress?.percent ?? 0;
  const iconBg = accentColor + '22'; // 13% opacity tint

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Wallet ${wallet.name}, balance N$${wallet.balance.toFixed(2)}${progress ? `, ${progress.percent}% of goal` : ''}`}
    >
      {/* Top accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        {/* Icon row */}
        <View style={styles.topRow}>
          <View style={[styles.iconBox, { backgroundColor: iconBg, borderColor: accentColor + '40' }]}>
            <Ionicons name={getIoniconName(wallet)} size={20} color={accentColor} />
          </View>
          {progress != null && (
            <View style={[styles.progressBadge, { backgroundColor: iconBg }]}>
              <Text style={[styles.progressBadgeText, { color: accentColor }]}>{progress.label}</Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>{wallet.name}</Text>

        {/* Balance */}
        <Text style={styles.balance}>
          {'N$'}{wallet.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
        </Text>

        {/* Progress bar */}
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { backgroundColor: accentColor, width: `${Math.min(barPercent, 100)}%` },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 164,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  body: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  balance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#020617',
    marginBottom: 12,
  },
  barTrack: {
    height: 4,
    borderRadius: 9999,
    width: '100%',
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 9999,
  },
});
