/**
 * WalletCard – Buffr G2P.
 * Single wallet card for the home carousel: icon, progress towards 100% (savings goal), name, balance, accent bar.
 * Progress = funds in wallet towards targetAmount when user creates a saving goal.
 * Location: components/home/WalletCard.tsx
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Wallet } from '@/services/wallets';
import { getWalletCardFill } from '@/constants/CardDesign';
import { getWalletIcon, getWalletProgress } from '@/utils/walletDisplay';

export interface WalletCardComponentProps {
  wallet: Wallet;
  index: number;
  onPress: () => void;
}

export function WalletCard({ wallet, index, onPress }: WalletCardComponentProps) {
  const progress = getWalletProgress(wallet);
  const borderColor = getWalletCardFill(wallet.cardDesignFrameId, index);
  const barColor = borderColor;
  const barPercent = progress?.percent ?? 0;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Wallet ${wallet.name}, balance N$ ${wallet.balance.toFixed(2)}${progress ? `, ${progress.percent}% of goal` : ''}`}
    >
      <View style={styles.topRow}>
        <Text style={styles.emoji}>{getWalletIcon(wallet)}</Text>
        {progress != null && <Text style={styles.progress}>{progress.label}</Text>}
      </View>
      <Text style={styles.name} numberOfLines={1}>{wallet.name}</Text>
      <Text style={styles.balance}>
        N$ {wallet.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { backgroundColor: barColor, width: `${barPercent}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  emoji: { fontSize: 28 },
  progress: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  name: { fontSize: 13, fontWeight: '500', color: '#020617', marginBottom: 4 },
  balance: { fontSize: 18, fontWeight: '700', color: '#020617' },
  barTrack: { height: 4, borderRadius: 9999, marginTop: 12, width: '100%', backgroundColor: '#E5E7EB', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 9999 },
});
