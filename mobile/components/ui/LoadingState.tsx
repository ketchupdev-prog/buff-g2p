/**
 * LoadingState Component
 * 
 * Purpose: Standardized loading indicator for all screens
 * Location: mobile/components/ui/LoadingState.tsx
 * 
 * Features:
 * - Multiple variants (spinner, skeleton, overlay)
 * - Consistent styling
 * - Optional loading message
 * - Customizable size
 * 
 * Sprint 4: Polish & Enhancements
 * Follows Rule 2: Modular component for easy maintenance
 * Follows Rule 3: Component documentation
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { designSystem } from '@/constants/designSystem';

type LoadingVariant = 'spinner' | 'skeleton' | 'overlay';
type LoadingSize = 'small' | 'medium' | 'large';

interface LoadingStateProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  message?: string;
  style?: ViewStyle;
}

export function LoadingState({
  variant = 'spinner',
  size = 'medium',
  message,
  style,
}: LoadingStateProps) {
  
  if (variant === 'overlay') {
    return (
      <View style={[styles.overlay, style]}>
        <View style={styles.overlayContent}>
          <ActivityIndicator 
            size="large" 
            color={designSystem.colors.brand.primary} 
          />
          {message && (
            <Text style={styles.overlayMessage}>{message}</Text>
          )}
        </View>
      </View>
    );
  }

  if (variant === 'skeleton') {
    return (
      <View style={[styles.skeletonContainer, style]}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <View style={styles.skeletonCircle} />
            <View style={styles.skeletonLines}>
              <View style={[styles.skeletonLine, styles.skeletonLineTitle]} />
              <View style={[styles.skeletonLine, styles.skeletonLineSubtitle]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Default: spinner variant
  const spinnerSize = size === 'small' ? 'small' : size === 'large' ? 'large' : undefined;

  return (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator 
        size={spinnerSize} 
        color={designSystem.colors.brand.primary} 
      />
      {message && (
        <Text style={styles.spinnerMessage}>{message}</Text>
      )}
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  // Spinner variant
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  spinnerMessage: {
    marginTop: 16,
    fontSize: 14,
    color: DS.colors.neutral.textSecondary,
    textAlign: 'center',
  },

  // Overlay variant
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  overlayMessage: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.neutral.text,
    textAlign: 'center',
  },

  // Skeleton variant
  skeletonContainer: {
    padding: DS.spacing.g2p.horizontalPadding,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.colors.neutral.border,
    marginRight: 12,
  },
  skeletonLines: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: DS.colors.neutral.border,
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonLineTitle: {
    width: '70%',
  },
  skeletonLineSubtitle: {
    width: '50%',
  },
});
