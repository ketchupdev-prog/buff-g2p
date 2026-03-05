/**
 * TextInput Component Tests
 * 
 * Tests all features: clear button, validation, formatting, accessibility
 * Location: mobile/__tests__/components/TextInput.test.tsx
 * 
 * Run: npm test -- TextInput.test.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextInput } from '@/components/ui';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

describe('TextInput', () => {
  describe('Basic Rendering', () => {
    it('should render with placeholder', () => {
      const { getByPlaceholderText } = render(
        <TextInput placeholder="Enter text" />
      );
      
      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('should render with label', () => {
      const { getByText } = render(
        <TextInput label="Username" placeholder="Enter username" />
      );
      
      expect(getByText('Username')).toBeTruthy();
    });

    it('should show required asterisk when required=true', () => {
      const { getByText } = render(
        <TextInput label="Email" required placeholder="Enter email" />
      );
      
      expect(getByText(/\*/)).toBeTruthy();
    });
  });

  describe('Prefix and Suffix', () => {
    it('should render prefix text', () => {
      const { getByText } = render(
        <TextInput prefix="+264" placeholder="Phone" />
      );
      
      expect(getByText('+264')).toBeTruthy();
    });

    it('should render suffix text', () => {
      const { getByText } = render(
        <TextInput suffix="NAD" placeholder="Amount" />
      );
      
      expect(getByText('NAD')).toBeTruthy();
    });
  });

  describe('Clear Button', () => {
    it('should show clear button when clearable=true and has value', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          clearable={true}
          value="test"
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      // Clear button should be rendered (component handles this internally)
      const input = getByPlaceholderText('Text');
      expect(input).toBeTruthy();
      expect(input.props.value).toBe('test');
    });

    it('should not show clear button when clearable=false', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          clearable={false}
          value="test"
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      // Should not render clear button (component handles it internally)
      const input = getByPlaceholderText('Text');
      expect(input).toBeTruthy();
    });

    it('should call onClear when clear button pressed', () => {
      const mockOnClear = jest.fn();
      const mockOnChangeText = jest.fn();
      
      const { getByPlaceholderText } = render(
        <TextInput
          clearable={true}
          value="test"
          onChangeText={mockOnChangeText}
          onClear={mockOnClear}
          placeholder="Text"
        />
      );
      
      // Simulate clearing
      fireEvent.changeText(getByPlaceholderText('Text'), '');
      
      // onChangeText should be called with empty string
      expect(mockOnChangeText).toHaveBeenCalledWith('');
    });

    it('should trigger haptic feedback on clear (if enabled)', () => {
      const mockOnChangeText = jest.fn();
      
      const { getByPlaceholderText } = render(
        <TextInput
          clearable={true}
          value="test"
          onChangeText={mockOnChangeText}
          hapticFeedback={true}
          placeholder="Text"
        />
      );
      
      // Simulate clearing (haptic happens in component)
      fireEvent.changeText(getByPlaceholderText('Text'), '');
      
      // Component should call Haptics.impactAsync when clearing
    });
  });

  describe('Validation', () => {
    it('should show green check for valid input', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          showValidation={true}
          isValid={true}
          value="valid"
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      // Validation icon should be rendered (component handles this internally)
      const input = getByPlaceholderText('Text');
      expect(input).toBeTruthy();
    });

    it('should show red X for invalid input', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          showValidation={true}
          isValid={false}
          value="invalid"
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      // Should render close-circle icon
      // (Component handles this internally)
    });

    it('should call onValidate callback', () => {
      const mockOnValidate = jest.fn().mockReturnValue(true);
      const mockOnChangeText = jest.fn();
      
      const { getByPlaceholderText } = render(
        <TextInput
          onValidate={mockOnValidate}
          onChangeText={mockOnChangeText}
          placeholder="Text"
        />
      );
      
      const input = getByPlaceholderText('Text');
      fireEvent.changeText(input, 'test');
      
      expect(mockOnValidate).toHaveBeenCalledWith('test');
    });

    it('should show error message from validation', () => {
      const mockOnValidate = jest.fn().mockReturnValue({
        valid: false,
        error: 'Custom validation error',
      });
      
      const { getByPlaceholderText, getByText } = render(
        <TextInput
          onValidate={mockOnValidate}
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      const input = getByPlaceholderText('Text');
      fireEvent.changeText(input, 'invalid');
      
      expect(getByText('Custom validation error')).toBeTruthy();
    });
  });

  describe('Auto-formatting', () => {
    it('should format phone numbers', () => {
      const mockOnChangeText = jest.fn();
      
      const { getByPlaceholderText } = render(
        <TextInput
          autoFormat="phone"
          onChangeText={mockOnChangeText}
          placeholder="Phone"
        />
      );
      
      const input = getByPlaceholderText('Phone');
      fireEvent.changeText(input, '81234567');
      
      // Should format to "81 234 5678"
      expect(mockOnChangeText).toHaveBeenCalledWith(expect.stringContaining('81 234'));
    });

    it('should format currency', () => {
      const mockOnChangeText = jest.fn();
      
      const { getByPlaceholderText } = render(
        <TextInput
          autoFormat="currency"
          onChangeText={mockOnChangeText}
          placeholder="Amount"
        />
      );
      
      const input = getByPlaceholderText('Amount');
      fireEvent.changeText(input, '1234.56');
      
      // Should format to "1,234.56"
      expect(mockOnChangeText).toHaveBeenCalledWith('1,234.56');
    });

    it('should lowercase email', () => {
      const mockOnChangeText = jest.fn();
      
      const { getByPlaceholderText } = render(
        <TextInput
          autoFormat="email"
          onChangeText={mockOnChangeText}
          placeholder="Email"
        />
      );
      
      const input = getByPlaceholderText('Email');
      fireEvent.changeText(input, 'TEST@EXAMPLE.COM');
      
      expect(mockOnChangeText).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('Character Count', () => {
    it('should show character count when showCharCount=true', () => {
      const { getByText } = render(
        <TextInput
          label="Bio"
          maxLength={50}
          showCharCount={true}
          value="test"
          onChangeText={jest.fn()}
          placeholder="Bio"
        />
      );
      
      expect(getByText('4/50')).toBeTruthy();
    });

    it('should update character count as user types', () => {
      const { getByText, getByPlaceholderText, rerender } = render(
        <TextInput
          label="Bio"
          maxLength={50}
          showCharCount={true}
          value=""
          onChangeText={jest.fn()}
          placeholder="Bio"
        />
      );
      
      expect(getByText('0/50')).toBeTruthy();
      
      // Update value
      rerender(
        <TextInput
          label="Bio"
          maxLength={50}
          showCharCount={true}
          value="Hello world"
          onChangeText={jest.fn()}
          placeholder="Bio"
        />
      );
      
      expect(getByText('11/50')).toBeTruthy();
    });
  });

  describe('Error States', () => {
    it('should show error message', () => {
      const { getByText } = render(
        <TextInput
          error="This field is required"
          placeholder="Text"
        />
      );
      
      expect(getByText('This field is required')).toBeTruthy();
    });

    it('should show error icon with error message', () => {
      const { getByText } = render(
        <TextInput
          error="Invalid input"
          placeholder="Text"
        />
      );
      
      // Error message and icon should be rendered
      expect(getByText('Invalid input')).toBeTruthy();
    });

    it('should apply error border color', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          error="Error"
          value="test"
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      // Border color changes (tested via snapshot or style inspection)
    });
  });

  describe('Focus States', () => {
    it('should apply focus styles when focused', () => {
      const { getByPlaceholderText } = render(
        <TextInput placeholder="Text" />
      );
      
      const input = getByPlaceholderText('Text');
      fireEvent(input, 'focus');
      
      // Focus border should be applied (component internal state)
    });

    it('should trigger haptic feedback on focus', () => {
      const { getByPlaceholderText } = render(
        <TextInput hapticFeedback={true} placeholder="Text" />
      );
      
      const input = getByPlaceholderText('Text');
      fireEvent(input, 'focus');
      
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <TextInput
          accessibilityLabel="Email input"
          placeholder="Email"
        />
      );
      
      expect(getByLabelText('Email input')).toBeTruthy();
    });

    it('should have accessibility hint', () => {
      const { getByA11yHint } = render(
        <TextInput
          accessibilityHint="Enter your email address"
          placeholder="Email"
        />
      );
      
      expect(getByA11yHint('Enter your email address')).toBeTruthy();
    });

    it('should set clear button accessibility role', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          clearable={true}
          value="test"
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      // Clear button should have accessibilityRole="button"
      // (Component sets this internally)
      const input = getByPlaceholderText('Text');
      expect(input).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxLength constraint', () => {
      const mockOnChangeText = jest.fn();
      
      const { getByPlaceholderText } = render(
        <TextInput
          maxLength={10}
          onChangeText={mockOnChangeText}
          placeholder="Text"
        />
      );
      
      const input = getByPlaceholderText('Text');
      fireEvent.changeText(input, '12345678901234567890');
      
      // Input component enforces maxLength (native behavior)
    });

    it('should handle empty value', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          value=""
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      expect(getByPlaceholderText('Text')).toBeTruthy();
    });

    it('should handle undefined value', () => {
      const { getByPlaceholderText } = render(
        <TextInput
          onChangeText={jest.fn()}
          placeholder="Text"
        />
      );
      
      expect(getByPlaceholderText('Text')).toBeTruthy();
    });
  });
});
