/**
 * BalanceCard - Smartpay Home Screen
 * 
 * Figma Specs:
 * - Height: 188px
 * - Border Radius: 12px
 * - Padding: 20px (compact for iPhone 393 width)
 * - Shadow: sm
 * - Background: White
 * 
 * Features:
 * - Total balance display
 * - Eye toggle for visibility
 * - Wallet name + card meta row
 * - Shadow elevation
 * 
 * @see Figma Node: BalanceCard Organism
 * @location components/home/BalanceCard.tsx
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem as DS } from '@/constants/designSystem';

export interface BalanceCardProps {
  /** Total balance in NAD */
  balance: number;
  /** Whether balance is currently visible */
  balanceVisible: boolean;
  /** Callback when eye icon is pressed */
  onToggleVisibility: () => void;
  /** Name of the primary wallet */
  walletName: string;
  /** Account holder display name */
  ownerName?: string;
  /** SmartpayID linked to the account/wallet identity */
  smartpayId?: string;
  /** Optional status/help text shown under wallet name */
  helperText?: string;
  /** Open QR for receive/proxy routing */
  onOpenQr?: () => void;
}

/**
 * BalanceCard component - displays total balance with privacy toggle
 * 
 * Figma-inspired card layout with taller, real-card proportions
 */
export function BalanceCard({
  balance,
  balanceVisible,
  onToggleVisibility,
  walletName,
  ownerName,
  smartpayId,
  helperText,
  onOpenQr,
}: BalanceCardProps) {
  return (
    <View style={styles.card} accessibilityLabel={`Total balance ${balanceVisible ? `N$${balance.toFixed(2)}` : 'hidden'}`}>
      <View style={styles.topContent}>
        {/* Header row with label and eye toggle */}
        <View style={styles.header}>
          <Text style={styles.label}>Total Balance</Text>
          <TouchableOpacity
            onPress={onToggleVisibility}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={balanceVisible ? 'Hide balance' : 'Show balance'}
            accessibilityRole="button"
          >
            <Ionicons
              name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
              size={24}
              color={DS.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Balance amount or hidden state */}
        <View style={styles.amountContainer}>
          {balanceVisible ? (
            <Text style={styles.amount}>
              N${balance.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          ) : (
            <Text style={styles.amountHidden}>••••••</Text>
          )}
        </View>

        {/* Wallet identity + optional state message */}
        <Text style={styles.walletName}>{walletName}</Text>
        {ownerName ? <Text style={styles.ownerName}>{ownerName}</Text> : null}
        {helperText ? <Text style={styles.helperText} numberOfLines={1}>{helperText}</Text> : null}
      </View>

      {/* Identity meta row - SmartpayID (proxy) + icon-only QR */}
      <View style={styles.metaRow}>
        <View style={styles.idWrap}>
          <Text style={styles.idLabel}>SmartpayID:</Text>
          <Text style={styles.smartpayIdText}>{smartpayId ?? 'SP-00000000'}</Text>
        </View>
        {onOpenQr ? (
          <TouchableOpacity
            style={styles.qrButton}
            onPress={onOpenQr}
            accessibilityLabel="Open my receive QR"
            accessibilityRole="button"
          >
            <Ionicons name="qr-code-outline" size={24} color={DS.colors.brand.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 188,
    backgroundColor: DS.colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: DS.colors.border,
    marginBottom: DS.spacing.lg,
    ...DS.shadows.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  topContent: {
    gap: 0,
    // Reserve space for anchored SmartpayID + QR row
    paddingBottom: 64,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: DS.colors.textSecondary,
  },
  amountContainer: {
    marginBottom: 2,
  },
  amount: {
    fontSize: 30,
    fontWeight: '700',
    color: DS.colors.text,
    lineHeight: 36,
  },
  amountHidden: {
    fontSize: 30,
    fontWeight: '700',
    color: DS.colors.text,
    lineHeight: 36,
    letterSpacing: 6,
  },
  walletName: {
    fontSize: 14,
    fontWeight: '500',
    color: DS.colors.textSecondary,
    marginTop: 0,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.neutral.text,
    marginTop: 0,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '500',
    color: DS.colors.neutral.textSecondary,
    marginTop: 0,
  },
  metaRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  idLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.colors.neutral.textSecondary,
  },
  smartpayIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.colors.brand.primary,
  },
  qrButton: {
    width: 56,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 12,
    backgroundColor: DS.colors.brand.primaryMuted,
    borderWidth: 1,
    borderColor: DS.colors.brand.primaryLight,
    flexShrink: 0,
  },
});
