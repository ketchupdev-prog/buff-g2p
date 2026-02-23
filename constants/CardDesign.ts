// constants/CardDesign.ts
/**
 * Card designs (assets/images/card-designs/frame-2.svg … frame-32.svg) are used for:
 * - Main Buffr account (primary wallet): the Buffr Card on Home; represents the user’s primary wallet.
 * - Additional wallets: the same designs can represent user-created wallets with user context
 *   (wallet name, balance, type). Each wallet may have an optional cardDesignFrameId (2–32).
 */
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

/** All card design frame IDs (assets/images/card-designs/frame-{n}.svg), 2–32. */
export const CARD_DESIGN_FRAME_IDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32] as const;

/** Default frame for primary Buffr account (main wallet) card. */
export const PRIMARY_WALLET_CARD_FRAME_ID = 10;

/** Fallback fill colors for card frames when SVG is not loaded (by frame ID). */
export const CARD_FRAME_FILL: Partial<Record<number, string>> = {
  3: '#DA2F2F',
  4: '#1E40AF',
  10: '#1E40AF',
};

/** Resolve card background color for a wallet: use wallet’s cardDesignFrameId or cycle by index. */
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
