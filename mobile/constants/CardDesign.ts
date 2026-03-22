// constants/CardDesign.ts
/**
 * Card designs (assets/images/card-designs/frame-2.svg … frame-32.svg) are used for:
 * - Main Buffr account (primary wallet): the Buffr Card on Home; represents the user's primary wallet.
 * - Additional wallets: the same designs can represent user-created wallets with user context
 *   (wallet name, balance, type). Each wallet may have an optional cardDesignFrameId (2–32).
 */
export const CARD_WIDTH = 340;
export const CARD_HEIGHT = 214;
export const CARD_BORDER_RADIUS = 16;
export const CARD_ASPECT_RATIO = CARD_WIDTH / CARD_HEIGHT;

export const CardAnimation = {
  FLIP_DURATION: 600,
  SELECTION_DURATION: 300,
  CAROUSEL_SNAP_DURATION: 400,
  SHIMMER_DURATION: 2000,
};

/** All card design frame IDs (assets/images/card-designs/frame-{n}.svg), 2–32. */
export const CARD_DESIGN_FRAME_IDS = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
] as const;

/** Default frame for primary Buffr account (main wallet) card. */
export const PRIMARY_WALLET_CARD_FRAME_ID = 10;

/**
 * Primary fill colors extracted from each card frame SVG.
 * Used as fallback when SVG asset is loading, and as accent colors for WalletCard.
 */
export const CARD_FRAME_FILL: Partial<Record<number, string>> = {
  2:  '#6A38F8',
  3:  '#DA2F2F',
  4:  '#1E40AF',
  5:  '#1E40AF',
  6:  '#B2B2B2',
  7:  '#363636',
  8:  '#F47B61',
  9:  '#A9DFEA',
  10: '#1E40AF',
  11: '#1E40AF',
  12: '#272244',
  13: '#1E40AF',
  14: '#1E40AF',
  15: '#E8AA30',
  16: '#1E40AF',
  17: '#1E40AF',
  18: '#1E40AF',
  19: '#1E40AF',
  20: '#1E40AF',
  21: '#320055',
  22: '#CBD0DB',
  23: '#CBD0DB',
  24: '#EBADC5',
  25: '#470089',
  26: '#C0C2D8',
  27: '#505CF1',
  28: '#E4AD9B',
  29: '#402255',
  30: '#149CAF',
  31: '#99BCFF',
  32: '#FF9233',
};

/** Static require() map for all card design SVG assets. */
export const CARD_FRAME_MODULES: Partial<Record<number, number>> = {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  2:  require('../assets/images/card-designs/frame-2.svg'),
  3:  require('../assets/images/card-designs/frame-3.svg'),
  4:  require('../assets/images/card-designs/frame-4.svg'),
  5:  require('../assets/images/card-designs/frame-5.svg'),
  6:  require('../assets/images/card-designs/frame-6.svg'),
  7:  require('../assets/images/card-designs/frame-7.svg'),
  8:  require('../assets/images/card-designs/frame-8.svg'),
  9:  require('../assets/images/card-designs/frame-9.svg'),
  10: require('../assets/images/card-designs/frame-10.svg'),
  11: require('../assets/images/card-designs/frame-11.svg'),
  12: require('../assets/images/card-designs/frame-12.svg'),
  13: require('../assets/images/card-designs/frame-13.svg'),
  14: require('../assets/images/card-designs/frame-14.svg'),
  15: require('../assets/images/card-designs/frame-15.svg'),
  16: require('../assets/images/card-designs/frame-16.svg'),
  17: require('../assets/images/card-designs/frame-17.svg'),
  18: require('../assets/images/card-designs/frame-18.svg'),
  19: require('../assets/images/card-designs/frame-19.svg'),
  20: require('../assets/images/card-designs/frame-20.svg'),
  21: require('../assets/images/card-designs/frame-21.svg'),
  22: require('../assets/images/card-designs/frame-22.svg'),
  23: require('../assets/images/card-designs/frame-23.svg'),
  24: require('../assets/images/card-designs/frame-24.svg'),
  25: require('../assets/images/card-designs/frame-25.svg'),
  26: require('../assets/images/card-designs/frame-26.svg'),
  27: require('../assets/images/card-designs/frame-27.svg'),
  28: require('../assets/images/card-designs/frame-28.svg'),
  29: require('../assets/images/card-designs/frame-29.svg'),
  30: require('../assets/images/card-designs/frame-30.svg'),
  31: require('../assets/images/card-designs/frame-31.svg'),
  32: require('../assets/images/card-designs/frame-32.svg'),
};

/** Resolve card background color for a wallet: use wallet's cardDesignFrameId or cycle by index. */
export function getWalletCardFill(frameId?: number, walletIndex: number = 0): string {
  if (frameId != null && CARD_FRAME_FILL[frameId]) return CARD_FRAME_FILL[frameId]!;
  const ids = CARD_DESIGN_FRAME_IDS.filter((id) => CARD_FRAME_FILL[id]);
  const id = ids[walletIndex % ids.length] ?? PRIMARY_WALLET_CARD_FRAME_ID;
  return CARD_FRAME_FILL[id] ?? '#1E40AF';
}

export type CardDesignKey = 'DEFAULT' | 'BLUE' | 'GREEN';
export const CARD_DESIGNS: Record<CardDesignKey, number | null> = {
  DEFAULT: PRIMARY_WALLET_CARD_FRAME_ID,
  BLUE: 10,
  GREEN: null,
};
