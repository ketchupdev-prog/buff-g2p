/**
 * ProgressIndicator Component
 * 
 * Purpose: Reusable step progress indicator for multi-step flows
 * Location: mobile/components/ui/ProgressIndicator.tsx
 * 
 * Features:
 * - Shows "Step X of Y" with visual progress
 * - Circular step indicators with checkmarks for completed steps
 * - Linear progress bar between steps
 * - Responsive design with design system tokens
 * - Accessible with proper ARIA labels
 * 
 * Usage:
 *   <ProgressIndicator currentStep={2} totalSteps={4} />
 *   <ProgressIndicator currentStep={1} totalSteps={5} stepLabels={['Amount', 'Receiver', 'Review', 'Confirm', 'Success']} />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { designSystem } from '@/constants/designSystem';

interface ProgressIndicatorProps {
  currentStep: number; // 1-indexed (1, 2, 3, ...)
  totalSteps: number;
  stepLabels?: string[]; // Optional labels for each step
  showStepText?: boolean; // Show "Step X of Y" text
  variant?: 'default' | 'minimal'; // Minimal = dots only
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  showStepText = true,
  variant = 'default',
}) => {
  // Ensure valid step range
  const validCurrentStep = Math.max(1, Math.min(currentStep, totalSteps));
  
  // Calculate progress percentage
  const progressPercentage = ((validCurrentStep - 1) / (totalSteps - 1)) * 100;
  
  const renderStepIndicator = (stepNumber: number) => {
    const isCompleted = stepNumber < validCurrentStep;
    const isCurrent = stepNumber === validCurrentStep;
    const isUpcoming = stepNumber > validCurrentStep;
    
    return (
      <View key={stepNumber} style={styles.stepContainer}>
        <View
          style={[
            styles.stepCircle,
            isCompleted && styles.stepCircleCompleted,
            isCurrent && styles.stepCircleCurrent,
            isUpcoming && styles.stepCircleUpcoming,
          ]}
          accessibilityLabel={`Step ${stepNumber} of ${totalSteps}${isCompleted ? ', completed' : isCurrent ? ', current' : ', upcoming'}`}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color={designSystem.colors.background} />
          ) : (
            <Text
              style={[
                styles.stepNumber,
                isCurrent && styles.stepNumberCurrent,
                isUpcoming && styles.stepNumberUpcoming,
              ]}
            >
              {stepNumber}
            </Text>
          )}
        </View>
        
        {stepLabels && stepLabels[stepNumber - 1] && (
          <Text
            style={[
              styles.stepLabel,
              isCurrent && styles.stepLabelCurrent,
              isCompleted && styles.stepLabelCompleted,
            ]}
            numberOfLines={1}
          >
            {stepLabels[stepNumber - 1]}
          </Text>
        )}
      </View>
    );
  };
  
  if (variant === 'minimal') {
    // Minimal variant: just dots
    return (
      <View style={styles.minimalContainer}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <View
            key={step}
            style={[
              styles.minimalDot,
              step <= validCurrentStep && styles.minimalDotActive,
            ]}
          />
        ))}
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Step text */}
      {showStepText && (
        <View style={styles.header}>
          <Text style={styles.stepText}>
            Step {validCurrentStep} of {totalSteps}
          </Text>
          <Text style={styles.progressText}>
            {Math.round(progressPercentage)}% Complete
          </Text>
        </View>
      )}
      
      {/* Visual progress */}
      <View style={styles.progressContainer}>
        {/* Background track */}
        <View style={styles.progressTrack} />
        
        {/* Filled progress */}
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercentage}%` },
          ]}
        />
        
        {/* Step indicators */}
        <View style={styles.stepsRow}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(renderStepIndicator)}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: designSystem.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing.md,
  },
  stepText: {
    fontSize: designSystem.typography.sizes.base,
    fontWeight: '600',
    color: designSystem.colors.text,
  },
  progressText: {
    fontSize: designSystem.typography.sizes.sm,
    color: designSystem.colors.textSecondary,
  },
  progressContainer: {
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: designSystem.colors.border,
    borderRadius: designSystem?.borderRadius?.full ?? designSystem?.radius?.full ?? 9999,
    transform: [{ translateY: -2 }],
  },
  progressFill: {
    position: 'absolute',
    top: '50%',
    left: 0,
    height: 4,
    backgroundColor: designSystem.colors.primary,
    borderRadius: designSystem?.borderRadius?.full ?? designSystem?.radius?.full ?? 9999,
    transform: [{ translateY: -2 }],
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    gap: designSystem.spacing.xs,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: designSystem.colors.background,
  },
  stepCircleCompleted: {
    backgroundColor: designSystem.colors.primary,
    borderColor: designSystem.colors.primary,
  },
  stepCircleCurrent: {
    backgroundColor: designSystem.colors.primary,
    borderColor: designSystem.colors.primary,
  },
  stepCircleUpcoming: {
    backgroundColor: designSystem.colors.background,
    borderColor: designSystem.colors.border,
  },
  stepNumber: {
    fontSize: designSystem.typography.sizes.sm,
    fontWeight: '600',
  },
  stepNumberCurrent: {
    color: designSystem.colors.background,
  },
  stepNumberUpcoming: {
    color: designSystem.colors.textSecondary,
  },
  stepLabel: {
    fontSize: designSystem.typography.sizes.xs,
    color: designSystem.colors.textSecondary,
    maxWidth: 60,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: designSystem.colors.primary,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: designSystem.colors.text,
  },
  // Minimal variant styles
  minimalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: designSystem.spacing.xs,
    paddingVertical: designSystem.spacing.md,
  },
  minimalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designSystem.colors.border,
  },
  minimalDotActive: {
    backgroundColor: designSystem.colors.primary,
    width: 24,
  },
});
