/**
 * BadgeToast – Buffr G2P.
 * Slide-down achievement notification. Rendered globally in app/_layout.tsx.
 * §19 Gamification. Auto-dismisses after 3 s.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeId, BADGE_META } from '@/contexts/GamificationContext';
import { hapticSuccess } from '@/utils/haptics';

interface BadgeToastProps {
  badgeId: BadgeId | null;
  onDismiss: () => void;
}

export function BadgeToast({ badgeId, onDismiss }: BadgeToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!badgeId) return;

    hapticSuccess();

    // Slide in
    translateY.value = withSpring(0, { damping: 16, stiffness: 140 });
    opacity.value = withTiming(1, { duration: 180 });

    // Auto-dismiss after 3 s
    dismissTimer.current = setTimeout(() => {
      translateY.value = withTiming(-120, { duration: 280 });
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
    }, 3000);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [badgeId]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!badgeId) return null;

  const meta = BADGE_META[badgeId];

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + 8 }, animStyle]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Achievement unlocked: ${meta.label}`}
    >
      <View style={[styles.iconBox, { backgroundColor: meta.color + '22' }]}>
        <Ionicons name={meta.icon as never} size={20} color={meta.color} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.headline}>Achievement Unlocked</Text>
        <Text style={styles.label} numberOfLines={1}>{meta.label}</Text>
      </View>
      <View style={styles.starBadge}>
        <Ionicons name="star" size={12} color="#F59E0B" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 9999,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1, minWidth: 0 },
  headline: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  label: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 1 },
  starBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
