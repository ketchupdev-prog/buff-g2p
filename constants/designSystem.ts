// constants/designSystem.ts
export const designSystem = {
  "name": "Buffr G2P",
  "version": "1.0",
  "source": "Figma: Buffr App Design (VeGAwsChUvwTBZxAU6H8VQ); buffr constants Theme.ts, Layout.ts",
  "breakpoints": {
    "mobile": { "maxWidth": 393, "description": "G2P reference width; center content on larger screens" }
  },
  "colors": {
    "brand": {
      "primary": "#0029D6",
      "primaryDark": "#1D4ED8",
      "primaryMuted": "#DBEAFE",
      "primary50": "#EFF6FF",
      "secondary": "#E11D48",
      "accent": "#FFB800"
    },
    "semantic": {
      "success": "#22C55E",
      "error": "#E11D48",
      "warning": "#F59E0B",
      "info": "#2563EB"
    },
    "neutral": {
      "background": "#F8FAFC",
      "surface": "#FFFFFF",
      "border": "#E2E8F0",
      "text": "#020617",
      "textSecondary": "#64748B",
      "textTertiary": "#94A3B8"
    },
    "gray": {
      "50": "#F9FAFB",
      "100": "#F3F4F6",
      "200": "#E5E7EB",
      "500": "#6B7280",
      "600": "#4B5563",
      "900": "#111827"
    },
    "slate": {
      "50": "#F8FAFC",
      "100": "#F1F5F9",
      "200": "#E2E8F0",
      "300": "#CBD5E1",
      "400": "#94A3B8",
      "800": "#1E293B",
      "900": "#0F172A",
      "950": "#020617"
    },
    "feedback": {
      "green100": "#D1FAE5",
      "green500": "#22C55E",
      "red100": "#FEE2E2",
      "yellow100": "#FEF3C7",
      "blue100": "#DBEAFE",
      "blue600": "#2563EB",
      "purple100": "#F3E8FF"
    },
    "gradient": {
      "purple": "#7C3AED",
      "blue": "#3B82F6",
      "sky": "#0EA5E9"
    },
    "backgroundGradient": {
      "description": "Buffr App Design (BuffrCrew): Home screen gradient blob — teal → blue → dark blue, ~80% opacity on white",
      "blobColors": ["#5EEAD4", "#3B82F6", "#1D4ED8"],
      "blobLocations": [0, 0.712, 1],
      "screenColors": ["#FFFFFF", "#E8FBF9", "#D6EBFE", "#93C5FD", "#C7DAFA", "#EFF6FF"],
      "screenLocations": [0, 0.25, 0.4, 0.5, 0.6, 1]
    }
  },
  "typography": {
    "fontFamily": {
      "sans": "System",
      "ios": "SF Pro",
      "android": "Roboto",
      "description": "Figma uses SF Pro; fallback to platform default in React Native"
    },
    "fontSize": {
      "xs": 12,
      "sm": 14,
      "base": 16,
      "lg": 18,
      "xl": 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 36
    },
    "fontWeight": {
      "normal": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    },
    "lineHeight": {
      "tight": 1.25,
      "snug": 1.375,
      "normal": 1.5,
      "relaxed": 1.625,
      "loose": 2
    },
    "textStyles": {
      "caption": { "fontSize": 12, "lineHeight": 16, "fontWeight": "400" },
      "bodySm": { "fontSize": 14, "lineHeight": 20, "fontWeight": "400" },
      "body": { "fontSize": 16, "lineHeight": 24, "fontWeight": "400" },
      "bodyLg": { "fontSize": 18, "lineHeight": 28, "fontWeight": "400" },
      "titleSm": { "fontSize": 18, "lineHeight": 28, "fontWeight": "600" },
      "title": { "fontSize": 20, "lineHeight": 28, "fontWeight": "600" },
      "titleLg": { "fontSize": 24, "lineHeight": 32, "fontWeight": "600" },
      "heading": { "fontSize": 30, "lineHeight": 36, "fontWeight": "700" },
      "display": { "fontSize": 36, "lineHeight": 40, "fontWeight": "700" },
      "tabLabel": { "fontSize": 11, "lineHeight": 14, "fontWeight": "600" }
    }
  },
  "spacing": {
    "scale": { "xs": 4, "sm": 8, "md": 16, "lg": 20, "xl": 24, "2xl": 32, "3xl": 40, "4xl": 48, "5xl": 64 },
    "g2p": {
      "horizontalPadding": 24,
      "verticalPadding": 16,
      "sectionSpacing": 32,
      "largeSectionSpacing": 40,
      "contentBottomPadding": 128
    },
    "screen": {
      "maxContainerWidth": 393,
      "horizontalPadding": 16.5,
      "cardGap": 17
    }
  },
  "radius": {
    "sm": 12,
    "md": 16,
    "lg": 24,
    "xl": 32,
    "pill": 9999
  },
  "shadows": {
    "sm": { "shadowColor": "#000", "shadowOffset": { "width": 0, "height": 1 }, "shadowOpacity": 0.05, "shadowRadius": 2, "elevation": 1 },
    "md": { "shadowColor": "#000", "shadowOffset": { "width": 0, "height": 4 }, "shadowOpacity": 0.1, "shadowRadius": 6, "elevation": 4 },
    "lg": { "shadowColor": "#000", "shadowOffset": { "width": 0, "height": 10 }, "shadowOpacity": 0.1, "shadowRadius": 15, "elevation": 8 }
  },
  "components": {
    "searchBar": { "borderRadius": 999, "placeholder": "Search anything...", "placeholderSend": "Search phone, UPI, UID", "height": 56 },
    "input": { "height": 56, "borderRadius": 12 },
    "button": { "height": 56, "minTouchTarget": 44, "borderRadius": 16 },
    "pillButton": { "borderRadius": 999, "minTouchTarget": 44 },
    "iconButton": { "size": 40, "minTouchTarget": 44 },
    "card": { "borderRadius": 12 },
    "chip": { "borderRadius": 999 },
    "header": { "height": 64 },
    "tabBar": { "height": 80 },
    "balanceCard": { "height": 120 },
    "transactionItem": { "height": 60 },
    "utilityRow": { "height": 60 },
    "utilityGridRow": { "height": 120 },
    "physicalCard": { "width": 340, "height": 214, "borderRadius": 12, "aspectRatio": 340/214 },
    "pill": {
      "search": { "borderRadius": 999, "height": 56 },
      "logo": { "borderRadius": 999 },
      "contactChip": { "borderRadius": 999, "effect": "effect_WHEBAW" },
      "headerProfile": { "borderRadius": 999 },
      "headerBell": { "borderRadius": 999 },
      "walletShowAdd": { "borderRadius": 999 },
      "promote": { "borderRadius": 999 }
    },
    "avatar": {
      "header": { "size": 40, "borderRadius": 999 },
      "contactChip": { "size": 40, "borderRadius": 999 },
      "groupMember": { "size": 32, "borderRadius": 999 }
    },
    "qrDisplay": { "minSize": 200, "borderRadius": 12 },
    "qrScanner": { "fullScreen": true },
    "groupRow": { "borderRadius": 16, "avatarSize": 32 },
    "contactRow": { "avatarSize": 40, "borderRadius": 12 },
    "otpInput": { "boxCount": 5, "borderRadius": 16 },
    "qr": { "errorCorrection": "M", "versionRange": [3, 5], "encoding": "Byte Mode with ECI for UTF-8", "description": "NAMQR per Bank of Namibia; TLV payload, CRC Tag 63, Token Vault NREF Tag 65" }
  },
  "animations": {
    "cardFlip": { "durationMs": 600, "easing": "ease-in-out" },
    "cardSelection": { "durationMs": 300 },
    "carouselSnap": { "durationMs": 400 },
    "shimmer": { "durationMs": 2000 },
    "buttonPress": { "scale": 0.98, "durationMs": 150 },
    "loading": { "durationMs": 1500, "description": "Loading spinner / skeleton cycle for API calls" }
  },
  "layout": {
    "safeArea": { "top": "Platform.ios ? 44 : StatusBar.currentHeight", "bottom": "Platform.ios ? 34 : 0" },
    "screenZones": {
      "statusBarHeight": 44,
      "headerHeight": 80,
      "headerTotal": 140,
      "balanceCardHeight": 120,
      "walletCarouselHeight": 80,
      "transactionItemHeight": 60,
      "tabBarHeight": 49,
      "tabBarTotal": 83
    }
  }
} as const;
