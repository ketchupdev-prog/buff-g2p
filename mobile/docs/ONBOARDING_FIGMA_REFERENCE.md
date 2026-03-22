# Onboarding modals – Figma design reference

When Figma MCP returns 429, use this spec (from PRD §3.8.1 and §3.8).

## Source

- **Figma file:** Buffr App Design, key `VeGAwsChUvwTBZxAU6H8VQ`
- **Re-fetch when possible:** `get_figma_data(fileKey: "VeGAwsChUvwTBZxAU6H8VQ", nodeId: "<nodeId>")`

## Node IDs (onboarding)

| Screen                     | nodeId   | Route / note           |
|----------------------------|----------|------------------------|
| Welcome                    | 23:1495  | /onboarding            |
| Select your beloved country| 30:1518  | optional               |
| Tell us your mobile number | 44:461   | /onboarding/phone      |
| Can you please verify      | 44:509 or 59:2 | /onboarding/otp |
| Add user's details         | 45:712   | /onboarding/name      |
| Enable Authentication      | 45:681 or 45:792 | /onboarding/face-id |
| Registration Completed     | 45:818   | /onboarding/complete  |

## Layout (from §3.8.1)

- **Dimensions:** 393×852 px (iPhone portrait).
- **Background:** Onboarding steps: `#FFFFFF`. Phone Entry (44:461) spec also lists `#F8FAFC`.
- **Content width:** 361px with **16px horizontal padding** (CTA position 16 → width 393 − 32 = 361).

## Components

- **Primary CTA (Continue / Verify / Select Country / etc.):**
  - Position: (16, 766) from top-left; size **361×52 px**.
  - Fill: **#18181B** (primary).
  - Text: **#F4F4F5**, SF Pro 510, 14px.
  - **borderRadius: 16px.**

- **Input:** Height 56px; borderRadius 12 or 16; optional prefix (+264, N$).

- **Back button:** 52×52 at (16, 54).

## Design tokens (§3.8.1)

- **Primary text:** #18181B  
- **Surface gray (secondary CTA fill, cards):** #F4F4F5  
- **borderRadius:** 16px for CTAs and cards  

## Implementation

- `OnboardingLayout` uses `ONBOARDING_SHEET_PADDING_H = 16` for sheet content when `useOnboardingSolidWhite` is true.
- Modal is anchored at bottom via flex spacer with `minHeight: 42%` of window.
- Phone screen: CTA `#18181B`, text `#F4F4F5`, 52px height, 16px radius.
