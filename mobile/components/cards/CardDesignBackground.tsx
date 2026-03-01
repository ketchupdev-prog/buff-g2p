/**
 * CardDesignBackground – Buffr G2P.
 * Renders an SVG card design frame as a full-bleed background.
 * Uses expo-asset to resolve local URI then SvgUri to render.
 * Falls back to the solid fill color while the asset loads.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Asset } from 'expo-asset';
import {
  CARD_FRAME_FILL,
  CARD_FRAME_MODULES,
  PRIMARY_WALLET_CARD_FRAME_ID,
} from '@/constants/CardDesign';

interface CardDesignBackgroundProps {
  frameId?: number;
  children?: React.ReactNode;
  style?: object;
}

export function CardDesignBackground({
  frameId = PRIMARY_WALLET_CARD_FRAME_ID,
  children,
  style,
}: CardDesignBackgroundProps) {
  const [svgUri, setSvgUri] = useState<string | null>(null);
  const fillColor = CARD_FRAME_FILL[frameId] ?? '#1E40AF';
  const mod = CARD_FRAME_MODULES[frameId];

  useEffect(() => {
    if (!mod) return;
    let cancelled = false;
    Asset.fromModule(mod)
      .downloadAsync()
      .then((asset) => {
        if (!cancelled && asset.localUri) {
          setSvgUri(asset.localUri);
        }
      })
      .catch(() => {
        // SVG won't load – solid fill fallback is already shown
      });
    return () => { cancelled = true; };
  }, [frameId, mod]);

  return (
    <View style={[styles.container, { backgroundColor: fillColor }, style]}>
      {svgUri ? (
        <SvgUri
          uri={svgUri}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
