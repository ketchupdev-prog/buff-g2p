/**
 * Bills Screen - Smartpay Mobile
 * 
 * Bill payment categories: electricity, water, airtime, data
 * Follows ServiceTile pattern from home screen
 * Integration with services/api.ts billPayment endpoint
 * 
 * Pattern: Same as cash-out/index.tsx - method selection
 * Location: app/(authenticated)/bills/index.tsx
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { designSystem as ds } from '@/constants/designSystem';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

interface BillCategory {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  route: string;
}

const BILL_CATEGORIES: BillCategory[] = [
  {
    id: 'electricity',
    label: 'Electricity',
    icon: 'flash-outline',
    color: '#F59E0B',
    route: '/(authenticated)/bills/electricity',
  },
  {
    id: 'water',
    label: 'Water',
    icon: 'water-outline',
    color: '#3B82F6',
    route: '/(authenticated)/bills/water',
  },
  {
    id: 'airtime',
    label: 'Airtime',
    icon: 'call-outline',
    color: '#22C55E',
    route: '/(authenticated)/bills/airtime',
  },
  {
    id: 'data',
    label: 'Data Bundles',
    icon: 'wifi-outline',
    color: '#8B5CF6',
    route: '/(authenticated)/bills/data',
  },
];

export default function BillsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryPress = (category: BillCategory) => {
    // For now, show alert since detail screens don't exist yet
    // In production, would navigate to category.route
    alert(`${category.label} payment coming soon!`);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LoadingState message="Loading bill categories..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={ds.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bills</Text>
          <View style={styles.headerRight} />
        </View>
        <ErrorState message={error} onRetry={handleRetry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={ds.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bills</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Pay Your Bills</Text>
          <Text style={styles.heroSubtitle}>
            Select a category to make a payment
          </Text>
        </View>

        {/* Bill Categories Grid */}
        <View style={styles.categoriesContainer}>
          {BILL_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                { backgroundColor: `${category.color}15` },
              ]}
              onPress={() => handleCategoryPress(category)}
              activeOpacity={0.7}
              accessibilityLabel={`${category.label} bill payment`}
              accessibilityRole="button"
              accessibilityHint={`Opens ${category.label} bill payment screen`}
            >
              {/* Icon Container */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${category.color}30` },
                ]}
              >
                <Ionicons
                  name={category.icon}
                  size={32}
                  color={category.color}
                />
              </View>

              {/* Label */}
              <Text style={styles.categoryLabel}>{category.label}</Text>

              {/* Arrow */}
              <Ionicons
                name="chevron-forward"
                size={20}
                color={ds.colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Payments Section (placeholder) */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={48}
              color={ds.colors.textTertiary}
            />
            <Text style={styles.emptyText}>No recent payments</Text>
            <Text style={styles.emptySubtext}>
              Your bill payment history will appear here
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: ds.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ds.spacing.md,
    paddingVertical: ds.spacing.sm,
    backgroundColor: ds.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: ds.colors.border,
  },
  backBtn: {
    padding: ds.spacing.sm,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...ds.typography.textStyles.screenTitle,
    color: ds.colors.text,
  },
  headerRight: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: ds.spacing.md,
    paddingTop: ds.spacing.lg,
    paddingBottom: ds.spacing.xxl,
  },

  // Hero Section
  hero: {
    marginBottom: ds.spacing.xl,
  },
  heroTitle: {
    ...ds.typography.textStyles.largeTitle,
    color: ds.colors.text,
    marginBottom: ds.spacing.xs,
  },
  heroSubtitle: {
    ...ds.typography.textStyles.body,
    color: ds.colors.textSecondary,
  },

  // Categories Grid
  categoriesContainer: {
    marginBottom: ds.spacing.xl,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ds.spacing.md,
    borderRadius: ds.radius.md,
    marginBottom: ds.spacing.md,
    minHeight: 80,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: ds.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ds.spacing.md,
  },
  categoryLabel: {
    ...ds.typography.textStyles.subheading,
    color: ds.colors.text,
    flex: 1,
  },

  // Recent Section
  recentSection: {
    marginTop: ds.spacing.lg,
  },
  sectionTitle: {
    ...ds.typography.textStyles.sectionHeader,
    color: ds.colors.text,
    marginBottom: ds.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ds.spacing.xl,
    paddingHorizontal: ds.spacing.lg,
  },
  emptyText: {
    ...ds.typography.textStyles.body,
    color: ds.colors.textSecondary,
    marginTop: ds.spacing.md,
    fontWeight: '600',
  },
  emptySubtext: {
    ...ds.typography.textStyles.bodySmall,
    color: ds.colors.textTertiary,
    marginTop: ds.spacing.xs,
    textAlign: 'center',
  },
});
