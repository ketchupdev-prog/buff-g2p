/**
 * SuccessScreen – full-screen success state with animated checkmark.
 * Used in: send-money/success, cash-out/success, loans/apply (credited step),
 * voucher wallet redemption, and any flow completion screen.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Action {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

interface SuccessScreenProps {
  title: string;
  subtitle?: string;
  /** Large highlighted value (e.g. "N$ 500") shown between title and subtitle */
  value?: string;
  checkColor?: string;
  actions?: Action[];
  style?: ViewStyle;
}

export function SuccessScreen({
  title,
  subtitle,
  value,
  checkColor = '#22C55E',
  actions = [],
  style,
}: SuccessScreenProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 18 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View style={[styles.screen, style]}>
      <Animated.View style={[styles.circleWrap, { transform: [{ scale }] }]}>
        <View style={[styles.circle, { backgroundColor: checkColor }]}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textWrap, { opacity }]}>
        <Text style={styles.title}>{title}</Text>
        {value ? <Text style={[styles.value, { color: checkColor }]}>{value}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionBtn, action.variant === 'secondary' && styles.actionBtnSecondary]}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionText, action.variant === 'secondary' && styles.actionTextSecondary]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    padding: 32,
  },
  circleWrap: { marginBottom: 28 },
  circle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
  },
  textWrap: { alignItems: 'center', width: '100%' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  value: { fontSize: 36, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  actions: { width: '100%', gap: 12 },
  actionBtn: {
    height: 52, borderRadius: 9999, backgroundColor: '#020617',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnSecondary: { backgroundColor: 'transparent' },
  actionText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  actionTextSecondary: { color: '#9CA3AF' },
});
