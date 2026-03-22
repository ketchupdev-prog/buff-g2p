/**
 * SuccessIcon – Buffr G2P.
 * Animated checkmark circle with spring pop on mount.
 * §19 Gamification – Reanimated 3/4 micro-interaction.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess } from '@/utils/haptics';

interface SuccessIconProps {
  size?: number;
  color?: string;
  bgColor?: string;
  delay?: number;
}

export function SuccessIcon({
  size = 80,
  color = '#fff',
  bgColor = '#22C55E',
  delay = 0,
}: SuccessIconProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    // Circle pops in
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 180 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 100 }));
    // Checkmark bounces in slightly after
    checkScale.value = withDelay(
      delay + 120,
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    hapticSuccess();
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
        circleStyle,
      ]}
    >
      <Animated.View style={checkStyle}>
        <Ionicons name="checkmark" size={size * 0.55} color={color} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
