/**
 * ServicesGrid - Smartpay Home Services
 * 
 * Figma Specs:
 * - 3×3 grid layout (9 tiles)
 * - Tile size: 110×110px (calculated from screen width)
 * - Gap: 16px between tiles
 * - Calculation: (screenWidth - padding - gaps) / 3
 * - Services array from designSystem.colors.services
 * 
 * @see Figma Node: ServiceCard Grid
 * @location components/home/ServicesGrid.tsx
 */
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { designSystem as DS } from '@/constants/designSystem';
import { ServiceTile, Service } from './ServiceTile';

export interface ServicesGridProps {
  /** Array of services to display */
  services?: Service[];
  /** Callback when a service is pressed */
  onServicePress?: (service: Service) => void;
  /** Callback for navigation with route string */
  onNavigate?: (route: string) => void;
}

const HORIZONTAL_PADDING = DS.spacing.horizontalPadding ?? 16;
const GAP = 16;
const NUM_COLUMNS = 3;
const NUM_ROWS = 3;

// Default services – exactly 9 for 3×3 grid
const DEFAULT_SERVICES: Service[] = [
  { id: 'proof-of-life', label: 'Proof of Life', icon: 'shield-checkmark-outline', color: '#FFB800', route: '/(authenticated)/proof-of-life/intro' },
  { id: 'receive', label: 'Receive', icon: 'arrow-down-circle-outline', color: '#22C55E', route: '/(authenticated)/receive' },
  { id: 'wallets', label: 'Wallets', icon: 'wallet-outline', color: '#0029D6', route: '/(authenticated)/wallets' },
  { id: 'cash-out', label: 'Cash Out', icon: 'cash-outline', color: '#F59E0B', route: '/(authenticated)/cash-out' },
  { id: 'vouchers', label: 'Vouchers', icon: 'gift-outline', color: '#E11D48', route: '/voucher' },
  { id: 'location-map', label: 'Map', icon: 'map-outline', color: '#2563EB', route: '/(authenticated)/location-finder?tab=agents&service=cashout' },
  { id: 'loans', label: 'Loans', icon: 'business-outline', color: '#7C3AED', route: '/loans' },
  { id: 'groups', label: 'Groups', icon: 'people-outline', color: '#EC4899', route: '/(authenticated)/groups' },
  { id: 'bills', label: 'Bills', icon: 'document-text-outline', color: '#8B5CF6', route: '/bills' },
];

/**
 * ServicesGrid component - 3×3 grid of service tiles
 * Uses useWindowDimensions so tile size is correct after mount (avoids 0 width on init).
 * Figma: 3 columns, 16px gap, ~110px tiles
 */
export function ServicesGrid({ 
  services = DEFAULT_SERVICES, 
  onServicePress,
  onNavigate,
}: ServicesGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  // Parent (home) already has horizontal padding; use same inset so we don't double-pad (DRY)
  const contentWidth = screenWidth - HORIZONTAL_PADDING * 2;
  const tileSize = contentWidth > 0 ? (contentWidth - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS : 100;
  const gridWidth = NUM_COLUMNS * tileSize + GAP * (NUM_COLUMNS - 1);

  const handleServicePress = (service: Service) => {
    if (onServicePress) {
      onServicePress(service);
    } else if (onNavigate) {
      onNavigate(service.route);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
      </View>
      <View style={[styles.grid, { gap: GAP, width: gridWidth }]}>
        {services.slice(0, NUM_COLUMNS * NUM_ROWS).map((service) => (
          <View key={service.id} style={[styles.tileWrapper, { width: tileSize, height: tileSize }]}>
            <ServiceTile
              service={service}
              width={tileSize}
              onPress={() => handleServicePress(service)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: DS.spacing.sectionSpacing,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: DS.colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tileWrapper: {
    // width/height set inline to TILE_SIZE for strict 3×3
  },
});
