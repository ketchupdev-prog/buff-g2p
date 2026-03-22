/**
 * Colors – Smartpay.
 * Re-exports and flat view of designSystem.colors for auth, headers, tab bar, Themed.
 * Single source of truth: constants/designSystem.ts (no duplicate hex values).
 * Location: fintech/smartpay/constants/Colors.ts
 */
import { designSystem } from '@/constants/designSystem';

const c = designSystem.colors;

export default {
  primary: c.brand.primary,
  primaryMuted: c.brand.primaryMuted,
  background: c.background,
  ink: c.text,
  gray: c.neutral.textSecondary,
  lightGray: c.border,

  // Used by `components/Themed.tsx` (light/dark mode tokens)
  // Keep the keys aligned (Themed expects `text` and `background`).
  light: {
    text: c.text,              // #020617 (slate-950) - WCAG AA compliant on white
    background: c.background,  // #FFFFFF (white)
    tint: c.brand.primary,     // #005D6E (teal)
  },
  dark: {
    text: '#e5e7eb',           // gray-200 - WCAG AA compliant on dark (4.5:1)
    background: '#0a0a0a',     // near-black - true dark background
    tint: c.brand.primaryLight, // #B2E5ED (light teal) - better contrast on dark
  },
};
