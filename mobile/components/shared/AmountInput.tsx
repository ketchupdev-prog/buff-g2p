/**
 * AmountInput Component
 * 
 * Purpose: Reusable amount input field with currency prefix
 * Location: mobile/components/shared/AmountInput.tsx
 * 
 * Features:
 * - Currency prefix (N$)
 * - Decimal input validation (max 2 decimal places)
 * - Quick amount buttons
 * - Error display
 * - Available balance hint
 * - Auto-focus support
 * 
 * Follows Rule 2: Modular component for easy maintenance
 * Follows Rule 3: Component documentation
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { designSystem } from '@/constants/designSystem';
import { ErrorState } from '@/components/ui';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  quickAmounts?: number[];
  error?: string | null;
  label?: string;
  placeholder?: string;
  availableBalance?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function AmountInput({
  value,
  onChange,
  currency = 'N$',
  quickAmounts = [100, 200, 500, 1000],
  error = null,
  label,
  placeholder = '0',
  availableBalance,
  autoFocus = false,
  disabled = false,
}: AmountInputProps) {
  
  const handleChange = (text: string) => {
    // Only allow numbers and single decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Limit to 2 decimal places
    const match = /^(\d*\.?\d{0,2})/.exec(cleaned);
    if (match) {
      onChange(match[1]);
    }
  };

  const handleQuickAmount = (amount: number) => {
    onChange(amount.toString());
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      {/* Amount Input */}
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <Text style={styles.currencyPrefix}>{currency}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={designSystem.colors.neutral.textTertiary}
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          editable={!disabled}
          returnKeyType="done"
          accessibilityLabel={`Enter amount in ${currency}`}
        />
      </View>

      {/* Error State */}
      {error && (
        <ErrorState
          variant="default"
          message={error}
          style={{ marginTop: 8 }}
        />
      )}

      {/* Available Balance */}
      {availableBalance !== undefined && (
        <Text style={styles.balanceHint}>
          Available: {currency}{availableBalance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
        </Text>
      )}

      {/* Quick Amount Buttons */}
      {quickAmounts.length > 0 && (
        <View style={styles.quickAmountsContainer}>
          <Text style={styles.quickAmountsLabel}>Quick amounts</Text>
          <View style={styles.quickAmounts}>
            {quickAmounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickAmountBtn,
                  parseFloat(value) === amount && styles.quickAmountBtnActive
                ]}
                onPress={() => handleQuickAmount(amount)}
                disabled={disabled}
              >
                <Text style={[
                  styles.quickAmountText,
                  parseFloat(value) === amount && styles.quickAmountTextActive
                ]}>
                  {currency}{amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  container: { width: '100%' },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.neutral.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: DS.colors.neutral.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputWrapperError: {
    borderColor: DS.colors.semantic.error,
  },
  currencyPrefix: {
    fontSize: 32,
    fontWeight: '800',
    color: DS.colors.neutral.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 48,
    fontWeight: '800',
    color: DS.colors.neutral.text,
    textAlign: 'left',
    padding: 0,
  },
  balanceHint: {
    fontSize: 13,
    color: DS.colors.neutral.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  quickAmountsContainer: {
    marginTop: 24,
  },
  quickAmountsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.colors.neutral.textSecondary,
    marginBottom: 8,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: DS.colors.neutral.border,
    backgroundColor: '#fff',
  },
  quickAmountBtnActive: {
    borderColor: DS.colors.brand.primary,
    backgroundColor: DS.colors.brand.primary + '10',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.neutral.text,
  },
  quickAmountTextActive: {
    color: DS.colors.brand.primary,
  },
});
