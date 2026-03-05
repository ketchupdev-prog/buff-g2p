/**
 * ScreenLayout Component
 * 
 * Purpose: Common screen wrapper with header, back button, and SafeAreaView
 * Location: mobile/components/layout/ScreenLayout.tsx
 * 
 * Features:
 * - Standardized header with title
 * - Optional back button
 * - Optional right header actions
 * - SafeAreaView handling
 * - StatusBar configuration
 * - Consistent spacing
 * 
 * Follows Rule 2: Modular component for easy maintenance
 * Follows Rule 3: Component documentation
 * Follows DRY principle: Eliminates header duplication across 30+ screens
 */

import React, { ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

interface ScreenLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  headerRight?: ReactNode;
  scrollable?: boolean;
  edges?: Edge[];
  backgroundColor?: string;
  headerBackgroundColor?: string;
  contentContainerStyle?: ViewStyle;
}

export function ScreenLayout({
  children,
  title,
  showHeader = true,
  showBackButton = true,
  onBackPress,
  headerRight,
  scrollable = true,
  edges = ['top', 'bottom'],
  backgroundColor = designSystem.colors.neutral.background,
  headerBackgroundColor = '#fff',
  contentContainerStyle,
}: ScreenLayoutProps) {
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const headerOptions = showHeader
    ? {
        headerShown: true,
        headerTitle: title || '',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600' as const,
          color: designSystem.colors.neutral.text,
        },
        headerLeft: showBackButton
          ? () => (
              <TouchableOpacity
                onPress={handleBackPress}
                style={styles.backButton}
                accessibilityLabel="Go back"
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={designSystem.colors.neutral.text}
                />
              </TouchableOpacity>
            )
          : undefined,
        headerRight: headerRight ? () => <View>{headerRight}</View> : undefined,
        headerStyle: { backgroundColor: headerBackgroundColor },
        headerBackVisible: false,
      }
    : { headerShown: false };

  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  return (
    <View style={[styles.screen, { backgroundColor }]}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'}
        backgroundColor={headerBackgroundColor}
      />
      <Stack.Screen options={headerOptions} />
      <SafeAreaView style={styles.safe} edges={edges}>
        {content}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
});
