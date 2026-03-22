# SmartPay Design System

Complete design system documentation integrating Buffr design analysis with SmartPay implementation guidelines.

---

## Table of Contents

- [Design Principles](#design-principles)
- [Buffr Design System Integration](#buffr-design-system-integration)
- [Components](#components)
- [Design Tokens](#design-tokens)
- [File Organization](#file-organization)

---

## Design Principles

SmartPay's design system is built on modern fintech principles emphasizing trust, security, and accessibility.

### Core Principles

**1. Trust and Security**
- Deep, modern teal as primary color (`#005D6E`)
- Clean, minimalist aesthetic
- Clear visual hierarchy
- Consistent patterns

**2. Accessibility First**
- WCAG AA+ compliance
- Touch targets ≥44px
- High contrast ratios (18.3:1 primary text)
- Font scaling support
- Screen reader optimization

**3. Mobile-First**
- Designed for 393×852px (iPhone 14/15)
- One-handed ergonomics
- Bottom sheet modals
- Tab-based navigation

**4. Modern iOS Polish**
- Smooth, fluid transitions
- Meaningful, subtle animations
- Haptic feedback
- Native patterns

**5. Clutter-Free**
- 8px grid system
- Generous whitespace
- Minimal visual noise
- Focus on content

---

## Buffr Design System Integration

SmartPay integrates design patterns from 256 Buffr screens, adapting them for SmartPay's brand identity.

### Visual Style

**Design Language:** Clean, modern, minimalist

**Card Style:**
- Subtle shadows (3-level system)
- Rounded corners (12-28px)
- Glassmorphism (sparingly on wallet cards)

**Iconography:**
- Linear, minimal stroke icons
- Consistent 24×24px base size
- Solid fills for emphasis

**Illustrations:**
- Simple, flat, accent-colored
- 2D with subtle gradients
- Soft, friendly shapes

### Screen Dimensions

**Standard Canvas:** 393×852px (iPhone 14/15)

**Safe Areas:**
- Top: 44px (status bar + notch)
- Bottom: 34px (home indicator)
- Sides: 16px (standard padding)

### Interaction States

| State | Treatment |
|-------|-----------|
| Normal | Default appearance |
| Hover/Active | Darker background (iOS)/Ripple (Android) |
| Disabled | 40% opacity, gray color |
| Loading | Animated skeleton/spinner |
| Success | Green indicator + checkmark |
| Error | Red indicator + warning icon |

---

## Components

### Component Hierarchy

```
Atoms (Basic Elements)
├── Buttons
├── Input Fields
├── Icons
├── Text Elements
└── Loading Indicators

Molecules (Simple Components)
├── Cards
├── List Items
├── Search Bars
└── Badge Indicators

Organisms (Complex Components)
├── Navigation (Tab Bar, Header)
├── Modals (Bottom Sheet, Dialog)
├── Carousels
└── Forms
```

### Key Components

#### 1. Buttons

**Primary CTA:**
- Height: 56px
- Radius: 16px (pill-shaped)
- Background: `#0029D6` (Figma) or `#005D6E` (SmartPay teal)
- Text: White, 16px, Semibold

**Secondary Button:**
- Same dimensions
- Background: `#F1F5F9` (slate-100)
- Text: `#020617` (slate-950)

**Tertiary/Text Button:**
- No background
- Text: Primary color
- Underline on press

**Touch Target:** All buttons ≥56px height (exceeds 44px minimum)

#### 2. Input Fields

**Input/Large:**
- Height: 56px
- Radius: 28px (pill-shaped)
- Border: 1px `#E2E8F0` (slate-200)
- Padding: 16-24px horizontal
- Focus: 2px border `#005D6E`

**SearchBar:**
- Height: 48px
- Radius: 24px
- Placeholder: "Search or ask Copilot..."
- Icon: Left-aligned magnifying glass

#### 3. Cards

**Balance Card:**
- Height: 120px
- Radius: 12px
- Background: Gradient or solid
- Shadow: `DS.shadows.md`

**Wallet Card:**
- Size: 164×140px
- Radius: 16px
- Accent bar: 4px top border
- Pattern: Optional background pattern

**Service Card:**
- Size: 110×110px
- Radius: 12px
- Icon: 24×24px centered
- Label: 14px below icon

**Transaction Card:**
- Height: Variable (72-80px typical)
- Radius: 12px
- Icon: Left (40×40px)
- Details: Center
- Amount: Right-aligned

#### 4. Navigation

**Tab Bar:**
- Height: 72px
- 4 tabs maximum (SmartPay uses 3)
- Icons: 24×24px
- Labels: 12px
- Active indicator: Teal underline

**Header:**
- Height: 54-64px
- Back button: Left
- Title: Center or left-aligned
- Action button: Right
- Shadow: Subtle or none

#### 5. Modals

**Bottom Sheet (Preferred):**
- Radius: 24-28px (top corners)
- Drag handle: Optional 32×4px rounded bar
- Background: White or `#F8FAFC`
- Backdrop: 40% black overlay

**Dialog/Alert:**
- Width: 280-320px (centered)
- Radius: 16px
- Padding: 24px
- Actions: Right-aligned or stacked

---

## Design Tokens

### Color Palette

#### Primary Colors

```typescript
const colors = {
  // SmartPay Brand
  smartpay: {
    teal: '#005D6E',        // Primary brand color
    tealLight: '#007A8A',   // Lighter variant
    tealDark: '#004455',    // Darker variant
  },

  // Slate Scale (Primary UI)
  slate: {
    50:  '#F8FAFC',  // Light backgrounds
    100: '#F1F5F9',  // Cards, containers
    200: '#E2E8F0',  // Borders, dividers
    300: '#CBD5E1',  
    400: '#94A3B8',  // Secondary text
    500: '#64748B',  // Tertiary text
    600: '#475569',  
    700: '#334155',  
    800: '#1E293B',  
    900: '#0F172A',  // Secondary dark
    950: '#020617',  // Primary text, dark elements
  },

  // Amber Scale (Accents)
  amber: {
    50:  '#FFFBEB',  // Light accent background
    100: '#FEF3C7',  
    600: '#D97706',  // Primary accent
    900: '#78350F',  // Warning text
  },

  // Semantic Colors
  success: '#22C55E',    // Green-500
  error: '#EF4444',      // Red-500
  warning: '#F59E0B',    // Amber-500
  info: '#3B82F6',       // Blue-500
};
```

#### Text Colors

```typescript
const textColors = {
  primary: '#020617',      // slate-950 (18.3:1 contrast)
  secondary: '#64748B',    // slate-500 (4.6:1 contrast)
  tertiary: '#94A3B8',     // slate-400 (disabled/placeholder)
  inverse: '#FFFFFF',      // White on dark backgrounds
  link: '#005D6E',         // SmartPay teal
  success: '#22C55E',      
  error: '#EF4444',        
  warning: '#78350F',      // amber-900
};
```

#### Service Colors (3×3 Grid)

```typescript
const serviceColors = {
  send: '#005D6E',         // Teal
  receive: '#22C55E',      // Green
  cashOut: '#F59E0B',      // Amber
  voucher: '#8B5CF6',      // Purple
  payBill: '#EC4899',      // Pink
  loans: '#EF4444',        // Red
  groups: '#3B82F6',       // Blue
  merchant: '#F97316',     // Orange
  more: '#6B7280',         // Gray
};
```

### Typography

#### Font Scale

```typescript
const typography = {
  // Size Scale
  xs: 12,     // Small text, timestamps
  sm: 14,     // Captions, labels
  base: 16,   // Body text (default)
  lg: 18,     // Subheadings
  xl: 20,     
  '2xl': 24,  // Screen titles
  '3xl': 28,  
  '4xl': 32,  // Large amounts
  '5xl': 40,  // Hero text

  // Weight Scale
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',

  // Line Height
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};
```

#### Typography Usage

| Use Case | Size | Weight | Color |
|----------|-----:|--------|-------|
| Screen Title | 24px | Semibold | slate-950 |
| Section Header | 18px | Semibold | slate-950 |
| Body Text | 16px | Regular | slate-950 |
| Secondary Text | 14px | Regular | slate-500 |
| Caption | 12px | Regular | slate-400 |
| Button Text | 16px | Semibold | White/slate-950 |
| Amount (Large) | 32-40px | Bold | slate-950 |

### Spacing System

**8px Grid System:**

```typescript
const spacing = {
  0: 0,
  1: 4,      // 0.5 units - Tight spacing
  2: 8,      // 1 unit - Minimum gap
  3: 12,     // 1.5 units - Element gaps
  4: 16,     // 2 units - Screen padding
  5: 20,     
  6: 24,     // 3 units - Card padding
  8: 32,     // 4 units - Section gaps
  10: 40,    
  12: 48,    // 6 units - Large gaps
  16: 64,    
  20: 80,    
  24: 96,    
};
```

**Usage Guidelines:**

- Screen edges: 16px (spacing[4])
- Card padding: 16-24px (spacing[4-6])
- Component gaps: 8-12px (spacing[2-3])
- Section gaps: 32px (spacing[8])
- Large gaps: 48px (spacing[12])

### Border Radius

```typescript
const borderRadius = {
  sm: 8,      // Small elements
  md: 12,     // Cards, containers
  lg: 16,     // Large cards
  xl: 24,     // Modals
  '2xl': 28,  // Bottom sheets
  '3xl': 35,  // Extra large (Buffr style)
  full: 9999, // Pills, circles
};
```

**Component-Specific:**

- Buttons: 16px (pill-shaped)
- Input fields: 12-28px (varies by size)
- Cards: 12-24px
- Modals: 24-28px (top corners)
- Avatars: 50% (circular)

### Shadows

```typescript
const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
```

**Usage:**
- Cards: `shadows.md`
- Floating buttons: `shadows.lg`
- Bottom sheets: `shadows.lg`
- Subtle cards: `shadows.sm`

### Component Dimensions

```typescript
const dimensions = {
  // Buttons
  button: {
    height: 56,
    minHeight: 48,
  },

  // Inputs
  input: {
    large: 56,
    medium: 48,
    small: 40,
  },

  // Cards
  balanceCard: 120,
  walletCard: { width: 164, height: 140 },
  serviceCard: { width: 110, height: 110 },

  // Navigation
  tabBar: 72,
  header: 64,

  // Avatars
  avatar: {
    small: 32,
    medium: 40,
    large: 56,
  },

  // QR Codes
  qr: {
    minimum: 200,
    large: 320,
    scanFrame: 280,
  },

  // Touch Targets
  minTouchTarget: 44,
};
```

---

## File Organization

### Design Asset Structure

```
smartpay/
├── mobile/
│   ├── constants/
│   │   ├── designSystem.ts     # Single source of truth
│   │   ├── Colors.ts           # Legacy (migrating to designSystem)
│   │   └── Styles.ts           # Legacy (migrating to designSystem)
│   │
│   ├── components/
│   │   ├── common/             # Shared UI components
│   │   ├── shared/             # Cross-feature components
│   │   ├── copilot/            # AI Copilot UI
│   │   ├── home/               # Home screen components
│   │   └── [feature]/          # Feature-specific components
│   │
│   └── assets/
│       ├── images/             # PNG, JPG images
│       └── fonts/              # Custom fonts
│
├── docs/
│   ├── DESIGN_SYSTEM.md        # This file
│   ├── BUFFR_DESIGN_ANALYSIS.md
│   ├── BUFFR_DESIGN_TOKENS.md
│   └── BUFFR_FILE_INVENTORY.md
│
└── design/
    └── buffr/                  # Source design assets
        ├── Buffr App Design/   # 256 SVG screens
        └── Buffr Card Design/  # 22 card variations
```

### Component Organization (DRY)

**Atomic Design Methodology:**

```
components/
├── atoms/              # Basic building blocks
│   ├── Button/
│   ├── Input/
│   ├── Icon/
│   └── Text/
│
├── molecules/          # Simple components
│   ├── SearchBar/
│   ├── ListItem/
│   ├── Card/
│   └── Badge/
│
├── organisms/          # Complex components
│   ├── Header/
│   ├── TabBar/
│   ├── BottomSheet/
│   └── Form/
│
└── templates/          # Page layouts
    ├── HomeLayout/
    ├── DetailLayout/
    └── FormLayout/
```

### Design Token Usage

**Single Source of Truth:**

All design tokens are defined in `mobile/constants/designSystem.ts`:

```typescript
import { DS } from '@/constants/designSystem';

// ✅ Good - Using design tokens
<View style={{
  backgroundColor: DS.colors.background,
  padding: DS.spacing[4],
  borderRadius: DS.borderRadius.md,
  ...DS.shadows.md,
}} />

// ❌ Bad - Hardcoded values
<View style={{
  backgroundColor: '#F8FAFC',
  padding: 16,
  borderRadius: 12,
  shadowColor: '#000',
}} />
```

**Referencing Other Docs:**

For detailed specifications, reference:

- **Component Dimensions:** See [FIGMA_COMPONENT_SPECS.md](./FIGMA_COMPONENT_SPECS.md)
- **Color System:** See [BUFFR_DESIGN_TOKENS.md](./BUFFR_DESIGN_TOKENS.md)
- **File Inventory:** See [BUFFR_FILE_INVENTORY.md](./BUFFR_FILE_INVENTORY.md)
- **Design Analysis:** See [BUFFR_DESIGN_ANALYSIS.md](./BUFFR_DESIGN_ANALYSIS.md)

---

## Implementation Examples

### Creating a Card Component

```typescript
import { DS } from '@/constants/designSystem';

function TransactionCard({ transaction }) {
  return (
    <View style={[
      styles.card,
      DS.shadows.md,
    ]}>
      <View style={styles.icon}>
        <Icon name={transaction.icon} size={24} color={DS.colors.primary} />
      </View>
      <View style={styles.details}>
        <Text style={styles.title}>{transaction.name}</Text>
        <Text style={styles.subtitle}>{transaction.date}</Text>
      </View>
      <Text style={styles.amount}>
        {transaction.type === 'credit' ? '+' : '-'}
        N${transaction.amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.background,
    padding: DS.spacing[4],
    borderRadius: DS.borderRadius.md,
    marginBottom: DS.spacing[2],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: DS.borderRadius.full,
    backgroundColor: DS.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DS.spacing[3],
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: DS.typography.base,
    fontWeight: DS.typography.medium,
    color: DS.colors.text.primary,
    marginBottom: DS.spacing[1],
  },
  subtitle: {
    fontSize: DS.typography.sm,
    color: DS.colors.text.secondary,
  },
  amount: {
    fontSize: DS.typography.lg,
    fontWeight: DS.typography.semibold,
    color: DS.colors.text.primary,
  },
});
```

### Using Tailwind CSS (Web)

If using Tailwind for web implementation:

```jsx
<div className="
  flex items-center
  bg-white
  p-4 rounded-xl
  shadow-md
  mb-2
">
  <div className="
    w-10 h-10
    rounded-full
    bg-slate-100
    flex items-center justify-center
    mr-3
  ">
    <Icon name={transaction.icon} size={24} />
  </div>
  <div className="flex-1">
    <h3 className="text-base font-medium text-slate-950 mb-1">
      {transaction.name}
    </h3>
    <p className="text-sm text-slate-500">
      {transaction.date}
    </p>
  </div>
  <span className="text-lg font-semibold text-slate-950">
    {transaction.type === 'credit' ? '+' : '-'}N${transaction.amount}
  </span>
</div>
```

---

## Accessibility

### Touch Targets

**Minimum:** 44×44px (iOS HIG)

**Recommended:**
- Buttons: 48-56px height
- List items: 56-72px height
- Icons with hitSlop: 24px icon + 10px padding = 44px target

```typescript
<TouchableOpacity
  style={styles.iconButton}
  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
>
  <Icon name="close" size={24} />
</TouchableOpacity>
```

### Contrast Ratios

| Element | Ratio | Standard |
|---------|------:|----------|
| Primary Text | 18.3:1 | AAA |
| Secondary Text | 4.6:1 | AA |
| Accent | 5.2:1 | AA (large text) |
| Disabled | 3:1 | Minimum |

### Screen Reader Support

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Send money to John Doe"
  accessibilityHint="Opens amount entry screen"
  accessibilityRole="button"
>
  <Text>Send</Text>
</TouchableOpacity>
```

---

## Animation Specifications

### Animation Recipes

Based on 52 documented animation frames from Buffr:

**Micro-Interactions:**
- Duration: 200-300ms
- Easing: ease-out
- Examples: Button press, toggle switch

**Page Transitions:**
- Duration: 300-400ms
- Easing: ease-in-out
- Type: Slide, fade

**Loading States:**
- Duration: 600-1000ms (loop)
- Type: Skeleton shimmer, spinner

**Success Animations:**
- Duration: 800-1200ms
- Type: Lottie checkmark, bounce

### Implementation

```typescript
import { Animated } from 'react-native';

// Button press animation
const scale = new Animated.Value(1);

const handlePressIn = () => {
  Animated.spring(scale, {
    toValue: 0.95,
    useNativeDriver: true,
  }).start();
};

const handlePressOut = () => {
  Animated.spring(scale, {
    toValue: 1,
    useNativeDriver: true,
  }).start();
};

<Animated.View style={{ transform: [{ scale }] }}>
  <TouchableOpacity
    onPressIn={handlePressIn}
    onPressOut={handlePressOut}
  >
    <Text>Press Me</Text>
  </TouchableOpacity>
</Animated.View>
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- ✅ Set up design tokens (`designSystem.ts`)
- ✅ Create color palette
- ✅ Define spacing system
- ✅ Set up typography scale

### Phase 2: Core Components (Week 2)
- Button components (Primary, Secondary, Tertiary)
- Input field components
- Card components
- Icon system

### Phase 3: Navigation (Week 3)
- Tab bar
- Header
- Bottom sheets
- Modals

### Phase 4: Screens (Week 4-5)
- Home dashboard
- Transaction screens
- Send money flow
- Settings screens

### Phase 5: Polish (Week 6)
- Animations
- Loading states
- Error states
- Accessibility audit

---

## Resources

### Internal Documentation

- [Figma Component Specs](./FIGMA_COMPONENT_SPECS.md)
- [Buffr Design Analysis](./BUFFR_DESIGN_ANALYSIS.md)
- [Buffr Design Tokens](./BUFFR_DESIGN_TOKENS.md)
- [Buffr File Inventory](./BUFFR_FILE_INVENTORY.md)
- [Design Brief Answers](./DESIGN_BRIEF_ANSWERS.md)

### External Resources

- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Expo Design Resources](https://docs.expo.dev/design/overview/)

---

**Last Updated:** March 17, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
