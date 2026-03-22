/**
 * SegmentedControl – horizontal tab selector.
 * Used for: Balance/Earnings/Spendings (transactions), Weekly/Bi-weekly/Monthly (add-wallet),
 * period selectors, and any 2–5 option group.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';

interface SegmentedControlProps<T extends string> {
  options: T[];
  selected: T;
  onSelect: (option: T) => void;
  /** Label overrides; if omitted the option string is used directly */
  labels?: Partial<Record<T, string>>;
  activeColor?: string;
  style?: ViewStyle;
  /** 'pill' = each tab is a rounded pill (default); 'underline' = flat with bottom border indicator */
  variant?: 'pill' | 'underline';
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  labels,
  activeColor = '#0029D6',
  style,
  variant = 'pill',
}: SegmentedControlProps<T>) {
  if (variant === 'underline') {
    return (
      <View style={[styles.underlineContainer, style]}>
        {options.map(opt => {
          const isActive = opt === selected;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.underlineTab, isActive && { borderBottomColor: activeColor, borderBottomWidth: 2 }]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.underlineLabel, isActive && { color: activeColor, fontWeight: '700' }]}>
                {labels?.[opt] ?? opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.pillContainer, style]}>
      {options.map(opt => {
        const isActive = opt === selected;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.pillTab, isActive && { backgroundColor: activeColor }]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
              {labels?.[opt] ?? opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Pill variant
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 9999,
    padding: 4,
  },
  pillTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9999,
    alignItems: 'center',
  },
  pillLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  pillLabelActive: { color: '#fff', fontWeight: '700' },

  // Underline variant
  underlineContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  underlineTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  underlineLabel: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
});
