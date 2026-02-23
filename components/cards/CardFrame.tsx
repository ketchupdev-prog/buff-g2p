import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CARD_WIDTH, CARD_HEIGHT, CARD_BORDER_RADIUS } from '@/constants/CardDesign';
import { designSystem } from '@/constants/designSystem';

/**
 * CardFrame – Buffr card preview with user name, unique card number, expiry.
 * Uses brand gradient background; card designs in assets/images/card-designs (SVG) can be
 * integrated later via react-native-svg. Data should come from onboarding/account.
 */
interface CardFrameProps {
  userName: string;
  cardNumber: string;
  expiryDate: string;
}

const CardFrame: React.FC<CardFrameProps> = ({
  userName,
  cardNumber,
  expiryDate,
}) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardBackground}>
        <Text style={styles.cardLabel}>Buffr</Text>
        <Text style={styles.cardNumber}>{cardNumber}</Text>
        <View style={styles.cardDetailsRow}>
          <Text style={styles.cardDetailText}>{userName}</Text>
          <Text style={styles.cardDetailText}>{expiryDate}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden', // Clip content to border radius
    backgroundColor: designSystem.colors.neutral.surface, // Fallback background
    ...designSystem.shadows.md, // Apply a shadow from design system
  },
  cardBackground: {
    flex: 1,
    width: '100%',
    padding: designSystem.spacing.g2p.horizontalPadding,
    justifyContent: 'space-between',
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: designSystem.colors.brand.primary,
  },
  cardLabel: {
    color: 'white',
    ...designSystem.typography.textStyles.title,
    fontWeight: 'bold',
    alignSelf: 'flex-end', // Position "Buffr" label
  },
  cardNumber: {
    color: 'white',
    ...designSystem.typography.textStyles.titleLg,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDetailText: {
    color: 'white',
    ...designSystem.typography.textStyles.body,
  },
});

export default CardFrame;
