/**
 * Confetti – Buffr G2P.
 * 30-particle overlay celebrating successful actions.
 * §19 Gamification. Pointer-events none; auto-dismisses.
 */
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = [
  '#0029D6', '#22C55E', '#F59E0B', '#E11D48',
  '#8B5CF6', '#0891B2', '#F97316', '#EC4899',
];

const SHAPES = [6, 8, 10, 12]; // border radius values for different shapes

interface Particle {
  id: number;
  x: number;
  targetX: number;
  targetY: number;
  targetRotate: number;
  color: string;
  size: number;
  radius: number;
  delay: number;
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: randomBetween(SCREEN_W * 0.1, SCREEN_W * 0.9),
    targetX: randomBetween(-60, 60),
    targetY: randomBetween(SCREEN_H * 0.5, SCREEN_H * 0.9),
    targetRotate: randomBetween(-360, 360),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: randomBetween(6, 12),
    radius: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    delay: randomBetween(0, 400),
  }));
}

interface ParticleViewProps {
  particle: Particle;
  onDone?: () => void;
}

function ParticleView({ particle, onDone }: ParticleViewProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(-60);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const duration = 1400;
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.targetX, { duration, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withDelay(
      particle.delay,
      withTiming(particle.targetY, { duration, easing: Easing.in(Easing.quad) }),
    );
    rotate.value = withDelay(
      particle.delay,
      withTiming(particle.targetRotate, { duration }),
    );
    opacity.value = withDelay(
      particle.delay + 900,
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          left: particle.x - particle.size / 2,
          top: 40,
          width: particle.size,
          height: particle.size * 0.6,
          backgroundColor: particle.color,
          borderRadius: particle.radius,
        },
      ]}
    />
  );
}

interface ConfettiProps {
  count?: number;
  onComplete?: () => void;
}

export function Confetti({ count = 30, onComplete }: ConfettiProps) {
  const particles = useMemo(() => generateParticles(count), [count]);
  const doneCount = React.useRef(0);

  const handleDone = () => {
    doneCount.current += 1;
    if (doneCount.current >= particles.length && onComplete) {
      onComplete();
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ParticleView key={p.id} particle={p} onDone={handleDone} />
      ))}
    </View>
  );
}
