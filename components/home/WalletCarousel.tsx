/**
 * WalletCarousel – Buffr G2P.
 * Horizontal list of user wallets + "Add Wallet" card. Driven by real data from
 * getWallets(); reflects create/delete/modify from add-wallet and wallet detail screens.
 * Parent should pass wallets from state and refetch on focus or pull-to-refresh.
 * Location: components/home/WalletCarousel.tsx
 */
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Wallet } from '@/services/wallets';
import { WalletCard } from './WalletCard';

export interface WalletCarouselProps {
  wallets: Wallet[];
  loading: boolean;
  onWalletPress: (wallet: Wallet) => void;
  onAddWalletPress: () => void;
  onAddFundsPress?: () => void;
}

export function WalletCarousel({
  wallets,
  loading,
  onWalletPress,
  onAddWalletPress,
  onAddFundsPress,
}: WalletCarouselProps) {
  if (loading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#0029D6" />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {wallets.map((wallet, index) => (
        <WalletCard
          key={wallet.id}
          wallet={wallet}
          index={index}
          onPress={() => onWalletPress(wallet)}
        />
      ))}
      <TouchableOpacity
        style={styles.addCard}
        onPress={onAddFundsPress ?? onAddWalletPress}
        activeOpacity={0.8}
        accessibilityLabel="Add funds to wallet"
      >
        <Ionicons name="add" size={28} color="#2563EB" />
        <Text style={styles.addCardText}>Add Funds</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingCard: {
    width: 160,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addCardText: { fontSize: 13, fontWeight: '500', color: '#2563EB' },
});
