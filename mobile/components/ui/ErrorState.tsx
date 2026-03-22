/**
 * ErrorState Component
 * 
 * Purpose: Standardized error state display for consistent error handling across the app
 * Location: mobile/components/ui/ErrorState.tsx
 * 
 * Features:
 * - Consistent error messaging with icon
 * - Different variants for different error types
 * - Retry action button
 * - Design system tokens for styling
 * - Accessible with proper ARIA labels
 * - Support for custom actions
 * 
 * Usage:
 *   <ErrorState message="Failed to load data" onRetry={() => refetch()} />
 *   <ErrorState variant="network" onRetry={handleRetry} />
 *   <ErrorState variant="empty" title="No transactions yet" message="Your transaction history will appear here" />
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '@/constants/designSystem';

interface ErrorStateProps {
  variant?: 'default' | 'network' | 'auth' | 'notFound' | 'server' | 'empty';
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showIcon?: boolean;
  customAction?: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
  };
  /** Alias for customAction used by many call sites */
  action?: { label: string; onPress: () => void };
  /** Optional container style */
  style?: ViewStyle;
}

const ERROR_CONFIGS = {
  default: {
    icon: 'alert-circle-outline' as const,
    title: 'Something went wrong',
    message: 'An error occurred. Please try again.',
    color: designSystem.colors.semantic.error,
  },
  network: {
    icon: 'cloud-offline-outline' as const,
    title: 'No internet connection',
    message: 'Please check your connection and try again.',
    color: designSystem.colors.semantic.warning,
  },
  auth: {
    icon: 'lock-closed-outline' as const,
    title: 'Authentication required',
    message: 'Please sign in to continue.',
    color: designSystem.colors.semantic.error,
  },
  notFound: {
    icon: 'search-outline' as const,
    title: 'Not found',
    message: 'The content you are looking for could not be found.',
    color: designSystem.colors.neutral.textSecondary,
  },
  server: {
    icon: 'server-outline' as const,
    title: 'Server error',
    message: 'Our servers are experiencing issues. Please try again later.',
    color: designSystem.colors.semantic.error,
  },
  empty: {
    icon: 'file-tray-outline' as const,
    title: 'No data',
    message: 'No items to display.',
    color: designSystem.colors.neutral.textSecondary,
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  variant = 'default',
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  showIcon = true,
  customAction,
  action,
  style,
}) => {
  const config = ERROR_CONFIGS[variant];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const actionToUse = customAction ?? (action ? { label: action.label, onPress: action.onPress, variant: 'primary' as const } : undefined);
  
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="alert"
      accessibilityLabel={`${displayTitle}. ${displayMessage}`}
    >
      {showIcon && (
        <View
          style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}
        >
          <Ionicons name={config.icon} size={48} color={config.color} />
        </View>
      )}
      
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityLabel={retryLabel}
          accessibilityRole="button"
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={designSystem.colors.brand.primary}
            style={styles.retryIcon}
          />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
      
      {actionToUse && (
        <TouchableOpacity
          style={[
            styles.customButton,
            actionToUse.variant === 'primary' && styles.customButtonPrimary,
          ]}
          onPress={actionToUse.onPress}
          accessibilityLabel={actionToUse.label}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.customButtonText,
              actionToUse.variant === 'primary' && styles.customButtonTextPrimary,
            ]}
          >
            {actionToUse.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Full-screen error state (for page-level errors)
export const ErrorStateFull: React.FC<ErrorStateProps> = (props) => {
  return (
    <View style={styles.fullContainer}>
      <ErrorState {...props} />
    </View>
  );
};

// Inline error state (for component-level errors)
export const ErrorStateInline: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  retryLabel = 'Retry',
}) => {
  return (
    <View style={styles.inlineContainer}>
      <View style={styles.inlineContent}>
        <Ionicons
          name="alert-circle-outline"
          size={16}
          color={designSystem.colors.semantic.error}
          style={styles.inlineIcon}
        />
        <Text style={styles.inlineMessage}>{message || 'An error occurred'}</Text>
      </View>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.inlineRetry}>
          <Text style={styles.inlineRetryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.scale.xl,
    paddingVertical: designSystem.spacing.scale.xl * 2,
  },
  fullContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.neutral.background,
    paddingHorizontal: designSystem.spacing.scale.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designSystem.spacing.scale.lg,
  },
  title: {
    fontSize: designSystem.typography.fontSize.xl,
    fontWeight: '600',
    color: designSystem.colors.neutral.text,
    marginBottom: designSystem.spacing.scale.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: designSystem.typography.fontSize.base,
    color: designSystem.colors.neutral.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: designSystem.spacing.scale.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing.scale.xl,
    paddingVertical: designSystem.spacing.scale.md,
    borderRadius: designSystem.radius.lg,
    borderWidth: 1,
    borderColor: designSystem.colors.brand.primary,
    backgroundColor: `${designSystem.colors.brand.primary}10`,
  },
  retryIcon: {
    marginRight: designSystem.spacing.scale.sm,
  },
  retryText: {
    fontSize: designSystem.typography.fontSize.base,
    fontWeight: '600',
    color: designSystem.colors.brand.primary,
  },
  customButton: {
    marginTop: designSystem.spacing.scale.md,
    paddingHorizontal: designSystem.spacing.scale.xl,
    paddingVertical: designSystem.spacing.scale.md,
    borderRadius: designSystem.radius.lg,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  customButtonPrimary: {
    backgroundColor: designSystem.colors.brand.primary,
    borderColor: designSystem.colors.brand.primary,
  },
  customButtonText: {
    fontSize: designSystem.typography.fontSize.base,
    fontWeight: '600',
    color: designSystem.colors.neutral.text,
    textAlign: 'center',
  },
  customButtonTextPrimary: {
    color: designSystem.colors.neutral.background,
  },
  // Inline variant styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: designSystem.spacing.scale.md,
    backgroundColor: `${designSystem.colors.semantic.error}10`,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    borderColor: `${designSystem.colors.semantic.error}30`,
  },
  inlineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineIcon: {
    marginRight: designSystem.spacing.scale.sm,
  },
  inlineMessage: {
    flex: 1,
    fontSize: designSystem.typography.fontSize.sm,
    color: designSystem.colors.semantic.error,
  },
  inlineRetry: {
    marginLeft: designSystem.spacing.scale.md,
    paddingHorizontal: designSystem.spacing.scale.md,
    paddingVertical: designSystem.spacing.scale.sm,
  },
  inlineRetryText: {
    fontSize: designSystem.typography.fontSize.sm,
    fontWeight: '600',
    color: designSystem.colors.semantic.error,
  },
});
