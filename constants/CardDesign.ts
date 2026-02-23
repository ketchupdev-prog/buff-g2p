// constants/CardDesign.ts
export const CARD_WIDTH = 340;
export const CARD_HEIGHT = 214;
export const CARD_BORDER_RADIUS = 12;
export const CARD_ASPECT_RATIO = CARD_WIDTH / CARD_HEIGHT;

export const CardAnimation = {
  FLIP_DURATION: 600,
  SELECTION_DURATION: 300,
  CAROUSEL_SNAP_DURATION: 400,
  SHIMMER_DURATION: 2000,
};

// Card design assets: assets/images/card-designs/frame-*.svg (e.g. frame-10.svg).
// React Native Image/ImageBackground does not support require() for SVG; use a styled View
// (e.g. brand gradient) for the card background, or integrate react-native-svg for SVG designs.
// Design key is for future use when SVG/PNG designs are loaded (e.g. by URL or transformed asset).
export type CardDesignKey = 'DEFAULT' | 'BLUE' | 'GREEN';
export const CARD_DESIGNS: Record<CardDesignKey, null | number> = {
  DEFAULT: null,
  BLUE: null,
  GREEN: null,
};
