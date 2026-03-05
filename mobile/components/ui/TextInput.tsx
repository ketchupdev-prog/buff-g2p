/**
 * TextInput Component
 * 
 * Purpose: Production-grade text input with fintech UX best practices
 * Location: /components/ui/TextInput.tsx
 * 
 * Features:
 * - Clear button for easy editing
 * - Visual validation feedback (green check, red X)
 * - Prefix support (country codes, currency symbols)
 * - Auto-formatting (phone numbers, currency)
 * - Paste handling with validation
 * - Accessibility (screen reader, haptics)
 * - Error states with helpful messages
 * - Character count for limited inputs
 * 
 * Based on fintech best practices from:
 * - Stripe, Square, PayPal, Revolut, N26, Monzo
 * - Apple HIG, Material Design guidelines
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { designSystem } from '@/constants/designSystem';

const DS = designSystem;

// ============================================================================
// Types
// ============================================================================

export interface CustomTextInputProps extends Omit<RNTextInputProps, 'style'> {
  // Layout & Styling
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  
  // Label & Accessibility
  label?: string;
  labelStyle?: StyleProp<ViewStyle>;
  required?: boolean;
  
  // Prefix & Suffix (icons, country codes, currency)
  prefix?: string;
  prefixIcon?: keyof typeof Ionicons.glyphMap;
  suffix?: string;
  suffixIcon?: keyof typeof Ionicons.glyphMap;
  
  // Validation
  isValid?: boolean;  // External validation state
  showValidation?: boolean;  // Show green check / red X
  error?: string | null;
  
  // Features
  clearable?: boolean;  // Show clear button when text present
  maxLength?: number;
  showCharCount?: boolean;  // Show "23/50" counter
  
  // Callbacks
  onClear?: () => void;
  onValidate?: (text: string) => boolean | { valid: boolean; error?: string };
  
  // Auto-formatting
  autoFormat?: 'phone' | 'currency' | 'email' | 'none';
  countryCode?: string;  // For phone formatting (default: +264)
  
  // Haptic feedback
  hapticFeedback?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const TextInput: React.FC<CustomTextInputProps> = ({
  containerStyle,
  inputStyle,
  label,
  labelStyle,
  required = false,
  prefix,
  prefixIcon,
  suffix,
  suffixIcon,
  isValid,
  showValidation = false,
  error,
  clearable = true,
  maxLength,
  showCharCount = false,
  onClear,
  onValidate,
  autoFormat = 'none',
  countryCode = '+264',
  hapticFeedback = true,
  value,
  onChangeText,
  ...inputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  // Determine validation state
  const validationState = isValid !== undefined ? isValid : true;
  const displayError = error || internalError;
  const hasError = !!displayError;
  
  // Auto-format text based on type
  const formatText = (text: string): string => {
    if (autoFormat === 'none') return text;
    
    switch (autoFormat) {
      case 'phone':
        // Format: +264 81 234 5678
        const digits = text.replace(/\D/g, '');
        if (digits.length <= 2) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
        if (digits.length <= 9) {
          return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
        }
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
        
      case 'currency':
        // Format: 1,234.56
        const cleaned = text.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
        
      case 'email':
        // Lowercase, trim spaces
        return text.toLowerCase().trim();
        
      default:
        return text;
    }
  };
  
  // Handle text change with formatting and validation
  const handleTextChange = (text: string) => {
    const formatted = formatText(text);
    
    // Call validation if provided
    if (onValidate) {
      const validationResult = onValidate(formatted);
      if (typeof validationResult === 'boolean') {
        setInternalError(validationResult ? null : 'Invalid input');
      } else {
        setInternalError(validationResult.valid ? null : validationResult.error || 'Invalid input');
      }
    }
    
    if (onChangeText) {
      onChangeText(formatted);
    }
  };
  
  // Handle clear button
  const handleClear = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onClear) {
      onClear();
    } else if (onChangeText) {
      onChangeText('');
    }
    setInternalError(null);
  };
  
  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const handleBlur = () => {
    setIsFocused(false);
  };
  
  // Determine border color based on state
  const getBorderColor = () => {
    if (hasError) return DS.colors.semantic.error;
    if (isFocused) return DS.colors.brand.primary;
    if (showValidation && validationState && value && value.length > 0) {
      return DS.colors.semantic.success;
    }
    return DS.colors.neutral.border;
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, labelStyle] as any}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
          {showCharCount && maxLength && (
            <Text style={styles.charCount}>
              {value?.length || 0}/{maxLength}
            </Text>
          )}
        </View>
      )}
      
      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
        ]}
      >
        {/* Prefix */}
        {(prefix || prefixIcon) && (
          <View style={styles.prefixContainer}>
            {prefixIcon && (
              <Ionicons
                name={prefixIcon}
                size={20}
                color={DS.colors.neutral.textSecondary}
                style={styles.prefixIcon}
              />
            )}
            {prefix && <Text style={styles.prefixText}>{prefix}</Text>}
          </View>
        )}
        
        {/* Text Input */}
        <ReactNativeTextInput
          style={[styles.textInput, inputStyle] as any}
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={DS.colors.neutral.textTertiary}
          maxLength={maxLength}
          {...inputProps}
        />
        
        {/* Clear Button (Fintech Standard) */}
        {clearable && value && value.length > 0 && !inputProps.editable && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear input"
            accessibilityRole="button"
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={DS.colors.neutral.textTertiary}
            />
          </TouchableOpacity>
        )}
        
        {/* Validation Icon */}
        {showValidation && value && value.length > 0 && !clearable && (
          <View style={styles.validationIcon}>
            {validationState && !hasError ? (
              <Ionicons name="checkmark-circle" size={20} color={DS.colors.semantic.success} />
            ) : hasError ? (
              <Ionicons name="close-circle" size={20} color={DS.colors.semantic.error} />
            ) : null}
          </View>
        )}
        
        {/* Suffix */}
        {(suffix || suffixIcon) && (
          <View style={styles.suffixContainer}>
            {suffixIcon && (
              <Ionicons
                name={suffixIcon}
                size={20}
                color={DS.colors.neutral.textSecondary}
              />
            )}
            {suffix && <Text style={styles.suffixText}>{suffix}</Text>}
          </View>
        )}
      </View>
      
      {/* Error Message */}
      {displayError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={DS.colors.semantic.error} />
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      )}
      
      {/* Helper Text (if no error) */}
      {!displayError && inputProps.accessibilityHint && (
        <Text style={styles.helperText}>{inputProps.accessibilityHint}</Text>
      )}
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: DS.spacing.scale.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.spacing.scale.xs,
  },
  label: {
    ...DS.typography.textStyles.bodySm,
    color: DS.colors.neutral.text,
    fontWeight: '600',
  },
  required: {
    color: DS.colors.semantic.error,
  },
  charCount: {
    ...DS.typography.textStyles.caption,
    color: DS.colors.neutral.textTertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    backgroundColor: DS.colors.neutral.surface,
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderWidth: 2,
    borderColor: DS.colors.brand.primary,
  },
  inputContainerError: {
    borderColor: DS.colors.semantic.error,
  },
  prefixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  prefixIcon: {
    marginRight: 4,
  },
  prefixText: {
    ...DS.typography.textStyles.body,
    color: DS.colors.neutral.text,
    fontWeight: '500',
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    ...DS.typography.textStyles.body,
    color: DS.colors.neutral.text,
    minHeight: 24,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  validationIcon: {
    marginLeft: 8,
  },
  suffixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  suffixText: {
    ...DS.typography.textStyles.body,
    color: DS.colors.neutral.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DS.spacing.scale.xs,
    gap: 6,
  },
  errorText: {
    ...DS.typography.textStyles.caption,
    color: DS.colors.semantic.error,
    flex: 1,
  },
  helperText: {
    ...DS.typography.textStyles.caption,
    color: DS.colors.neutral.textSecondary,
    marginTop: DS.spacing.scale.xs,
  },
});

// ============================================================================
// Export
// ============================================================================

export default TextInput;
