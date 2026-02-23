/**
 * GradientView – drop-in replacement for expo-linear-gradient LinearGradient.
 * Uses react-native-svg which IS included in Expo Go, unlike expo-linear-gradient.
 * Accepts the same `colors`, `start`, `end`, `style` props.
 */
import React, { useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface GradientViewProps {
  colors: readonly string[] | string[];
  style?: ViewStyle | ViewStyle[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  children?: React.ReactNode;
}

let _idCounter = 0;

export function GradientView({
  colors,
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  children,
}: GradientViewProps) {
  const idRef = useRef(`gv_${++_idCounter}`);
  const id = idRef.current;

  return (
    <View style={[styles.root, style as ViewStyle]}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient
            id={id}
            x1={String(start.x)}
            y1={String(start.y)}
            x2={String(end.x)}
            y2={String(end.y)}
            gradientUnits="objectBoundingBox"
          >
            {colors.map((color, i) => (
              <Stop
                key={i}
                offset={String(i / Math.max(colors.length - 1, 1))}
                stopColor={color}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
