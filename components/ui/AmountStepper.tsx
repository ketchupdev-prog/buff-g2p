/**
 * AmountStepper – +/− stepper with large centred amount display.
 * Used in: loans/apply. Can be reused for any stepped amount input.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AmountStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  currency?: string;
  onChange: (next: number) => void;
  style?: ViewStyle;
}

export function AmountStepper({
  value,
  min = 0,
  max = Infinity,
  step = 100,
  currency = 'N$',
  onChange,
  style,
}: AmountStepperProps) {
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        style={[styles.btn, !canDecrement && styles.btnDisabled]}
        onPress={() => canDecrement && onChange(Math.max(min, value - step))}
        disabled={!canDecrement}
        accessibilityLabel="Decrease amount"
      >
        <Ionicons name="remove" size={22} color={canDecrement ? '#fff' : 'rgba(255,255,255,0.3)'} />
      </TouchableOpacity>

      <View style={styles.display}>
        <Text style={styles.currency}>{currency}</Text>
        <Text style={styles.value}>{value.toLocaleString()}</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, !canIncrement && styles.btnDisabled]}
        onPress={() => canIncrement && onChange(Math.min(max, value + step))}
        disabled={!canIncrement}
        accessibilityLabel="Increase amount"
      >
        <Ionicons name="add" size={22} color={canIncrement ? '#fff' : 'rgba(255,255,255,0.3)'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  btn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  display: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  currency: { fontSize: 22, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  value: { fontSize: 42, fontWeight: '700', color: '#fff' },
});
