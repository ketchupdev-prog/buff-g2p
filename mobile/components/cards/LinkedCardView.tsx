/**
 * LinkedCardView – Buffr G2P.
 * Gradient card display for linked bank cards (e.g. Nedbank).
 * Matches Figma: gradient (purple → orange), bank label, account type, cardholder, masked number.
 * Location: mobile/components/cards/LinkedCardView.tsx
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CARD_BORDER_RADIUS, CARD_HEIGHT, CARD_WIDTH } from '@/constants/CardDesign';

interface LinkedCardViewProps {
  label: string;
  subLabel?: string;
  userName: string;
  last4: string;
  brand?: string;
}

const GRADIENT_COLORS = ['#7C3AED', '#A855F7', '#F59E0B', '#FBBF24'] as const;

export function LinkedCardView({
  label,
  subLabel = 'Savings account',
  userName,
  last4,
  brand,
}: LinkedCardViewProps) {
  const maskedNumber = `•••• •••• •••• ${last4}`;
  const initial = (brand ?? label).charAt(0).toUpperCase();

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={[...GRADIENT_COLORS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: CARD_BORDER_RADIUS }]}
      >
        <View style={styles.overlay} />
        <View style={styles.header}>
          <View>
            <Text style={styles.cardLabel}>{label}</Text>
            <Text style={styles.subLabel}>{subLabel}</Text>
          </View>
          <View style={styles.bankLogo}>
            <Text style={styles.bankLogoText}>{initial}</Text>
          </View>
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.cardNumber}>{maskedNumber}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    width: '100%',
    height: '100%',
    padding: 24,
    justifyContent: 'space-between',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  bankLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankLogoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardNumber: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
