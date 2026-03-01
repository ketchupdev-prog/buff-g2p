/**
 * CardFrame – Buffr G2P.
 * Credit-card style preview with user name, unique card number, expiry.
 * Renders the actual SVG card design from assets via CardDesignBackground.
 * Data should come from onboarding/account; frameId defaults to primary wallet design.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CARD_WIDTH, CARD_HEIGHT, CARD_BORDER_RADIUS, PRIMARY_WALLET_CARD_FRAME_ID } from '@/constants/CardDesign';
import { CardDesignBackground } from './CardDesignBackground';

interface CardFrameProps {
  userName: string;
  cardNumber: string;
  expiryDate: string;
  frameId?: number;
}

const CardFrame: React.FC<CardFrameProps> = ({
  userName,
  cardNumber,
  expiryDate,
  frameId = PRIMARY_WALLET_CARD_FRAME_ID,
}) => {
  return (
    <View style={styles.cardContainer}>
      <CardDesignBackground
        frameId={frameId}
        style={[styles.cardBackground, { borderRadius: CARD_BORDER_RADIUS }]}
      >
        {/* Frosted overlay for text legibility */}
        <View style={styles.overlay} />

        {/* Header: logo + chip */}
        <View style={styles.header}>
          <Text style={styles.brandLabel}>Buffr</Text>
          <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.9)" style={styles.wifiIcon} />
        </View>

        {/* Card number */}
        <Text style={styles.cardNumber}>{cardNumber}</Text>

        {/* Footer: name + expiry */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.fieldLabel}>CARD HOLDER</Text>
            <Text style={styles.fieldValue}>{userName}</Text>
          </View>
          <View style={styles.expiryBlock}>
            <Text style={styles.fieldLabel}>EXPIRES</Text>
            <Text style={styles.fieldValue}>{expiryDate}</Text>
          </View>
        </View>
      </CardDesignBackground>
    </View>
  );
};

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
  cardBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    padding: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  wifiIcon: {
    transform: [{ rotate: '90deg' }],
  },
  cardNumber: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  expiryBlock: { alignItems: 'flex-end' },
  fieldLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default CardFrame;
