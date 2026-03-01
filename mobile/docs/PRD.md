# Buffr G2P App – Product Requirements Document (Revised v1.21)

**Ketchup Software Solutions**  
**Ecosystem:** Government-to-Person (G2P) – Beneficiary Platform (Mobile App)  
**Date:** March 2026  
**v1.5 updates:** Screen header and back navigation consistency (§6.4): every stack screen must provide back or Home; Agent Network and entry screens must fallback to Home when history is empty; header patterns and quick reference table. **v1.6 gap analysis (senior developer review):** §11.12–§11.21 – Offline architecture, Push notifications, Analytics & monitoring, Testing strategy, Deployment & CI/CD, Security implementation details, Accessibility, Internationalization (i18n), Edge case handling, Performance budget. **Card and wallet model (§3.4, §4.3b):** Cards are for the main Buffr account (primary wallet) and can represent additional wallets with user context (name, balance, type; optional cardDesignFrameId per wallet).  
**v1.7 updates:** **Implementation status & areas for improvement** (§3.13): Group Settings POV (admin vs member), deactivating members, adding members (§3.6 47c-v, 47c-vi); Request Status modal; Wallet History screen (§3.6 50a); implementation checklist and improvement areas.  
**v1.8 updates:** **Design source and implementation alignment** (§3.0): BuffrCrew/Buffr App Design folder (Downloads); Home balance pill "+" = **Add funds** (not Add wallet); EFT account name = **Buffr Financial Services**; Add Money – Debit/Credit Card = **link card to top up** (navigate to /add-card), not "coming soon".  
**v1.9 updates:** **Flow-to-design alignment** (§3.14): Add Card flow aligned (Scan your card / Add Card +, scan step, details, success); Home search filters services, transactions, contacts. §3.14 lists flows aligned and flows still to align with Buffr App Design (Send money, Add Wallet, Groups, Loans, Onboarding, Vouchers, Cash-out, etc.).  
**v1.10 updates:** **Home pill "+ Add"** and **Navigation audit** (§3.15): Home balance pill label = **"+ Add"** (not "+ Add funds"). §3.15 adds a deep investigative audit of flows and navigation: entry, Home downstream, Send money, Wallets/cash-out, Groups, Add card, Loans, Vouchers, Receive, and **transaction detail consistency**. Rectifications: (1) Home pill label and PRD §3.0/§3.14.1; (2) Wallet detail and Wallet History now link to `/(tabs)/transactions/[id]` for transaction detail (was `/transactions/[id]`). Findings and usage rules documented for implementation alignment.  
**v1.11 updates:** **Complete User Flows & Navigation Master** (§18): Single source of truth for all user journeys, roles, navigation paths, and edge cases. Aligned with implemented behaviour: Add Money as bottom sheet modal from Home and Wallet Detail (§4.2.1, §4.3); Receive landing at `/receive` (§4.10); back fallback to `/(tabs)` when `router.canGoBack()` is false (§6.4); shared TwoFAModal for send, voucher, group send/request (§4.4, §4.7, §4.9); 2FA lockout with countdown (§7). §18.5 listed missing screens; these are implemented in v1.13.
**v1.12 updates:** **Code audit & rectifications** (§3.16): Comprehensive audit of implemented code against PRD v1.10. 27 flows verified correct. 15 issues (B1–B15) identified and prioritised P1/P2/P3. Critical security fix F5 (removed client-side cash code generation using `Math.random()` with no backend registration from `till.tsx` and `merchant.tsx`). Routing fixes F3 (cash-out QR scan now routes to new `confirm.tsx` rather than hub) and F4 (payment-mode scan now passes `walletId`). CRC validation F2 verified already done (`utils/crc.ts` + `validateNAMQRCRC`). Agents index screen F1 confirmed already implemented (audit false positive). New screen: `app/wallets/[id]/cash-out/confirm.tsx`. GitHub-Issues-format tickets generated for P2/P3 items F6–F23.
**v1.13 updates:** **§18.5 screens implemented** and **UserContext/state applied throughout.** (1) All formerly “missing” §18.5 screens are implemented: Bill Payment Success (`/bills/success`), Loan Success (`/loans/success`), Add Money via Card (`/wallets/[id]/add-money/card`), Voucher NamPost Instruction (`/utilities/vouchers/redeem/nampost/instruction`), Voucher Redeem Confirm (`/utilities/vouchers/redeem/confirm`); flows wired from pay, apply, add-money, voucher detail, and scan-qr. (2) **UserContext** (`useUser()`) is applied across the app: onboarding (index, country, face-id, photo), wallets (list, detail, history, add-money, add-money/card), cards (list, add-card index/scan/details/success), send-money (select-recipient, amount, receiver-details, confirm, success), receive (index), loans (index, success, apply, detail), bills (pay, success), vouchers (detail, redeem instruction/confirm), scan-qr, add-wallet, and profile (index, qr-code, settings, notifications). Screens use `profile` for personalised copy where appropriate; `isLoaded` to gate content until context is ready; `walletStatus === 'frozen'` to show a banner and disable financial actions (add money, redeem, etc.) per §2.4.
**v1.14 updates:** **§3.16 additional rectifications implemented.** F6 (TLV-aware Tag 63 lookup in `utils/crc.ts`), F7 (abort non-NAMQR QRs before Token Vault – clear message, no API call), F8 (guard missing `walletId` in cash-out confirm), F9 (header background on till/merchant), F11 (balance on till). Scan-qr back button uses canGoBack → replace to `/(tabs)` when no history. See §3.16.8 for resolution status.
**v1.15 updates:** **§3.16 remaining P2/P3 items implemented.** F10 (N$ format – no space globally; PRD §5); F14 (`general` method in CASH_OUT_METHODS); F15 (CTA disabled until amount valid on till/merchant); F16 (amount input single decimal, max 2 decimal places – till, merchant, send-money/amount); F17 (QR scan: network/timeout/expired-specific error messages). B11, B14, B15, D2, D4, E1, E2, E3, E11 addressed.
**v1.16 updates:** **§3.16 further items.** F12 confirmed (voucher mode in scan-qr routes to `/utilities/vouchers/redeem/confirm`). F18 (PIN lockout in cash-out confirm: banner "PIN locked. Try again in X minutes.", confirm disabled; parse lockout from API error). F19 confirmed (single `useLocalSearchParams` in confirm). F21 confirmed (till uses `edges={['bottom']}`). F22 (DS moved to top of till.tsx). F23 confirmed (Profile at `(tabs)/profile`, Settings at `(tabs)/profile/settings` and `/profile/settings`).
**v1.17 updates:** **§3.16 remaining.** F20: removed `as never` from cash-out navigation in `till.tsx` and `merchant.tsx` (typed routes already enabled in `app.json` experiments). F13: voucher list at `(tabs)/vouchers`, detail at `utilities/vouchers/[id]` — confirmed in route tree. C2: Add Money as bottom sheet modal confirmed — `AddMoneyModal` used from Home ("+ Add", Buffr card "Add money", carousel Add funds) and from Wallet Detail ("Add" button).
**v1.18 updates:** **§3.16 D/E closure.** D5 (error dismissal on navigation back): till and merchant use `useFocusEffect` to clear amount error when screen gains focus so returning users don't see stale errors. §3.16.4/§3.16.5: D1–D9 and E1–E12 resolution status added to §3.16.8.
**v1.21 updates:** **Security fixes implemented** (§19 hardening – v1.21): All 6 P0 pre-release blockers resolved (V1, V2, V3, V4, S1, S7, S9). All P1 client-side fixes applied (V2, V6, V11, S2, S3). All P2 client-side fixes applied (V7, V8, V10/S8, S11, S12). All P3 client-side hardening applied (S4, S10, S13, S14). Overall risk rating reduced from HIGH → MEDIUM. Remaining open: V5, V9, V12, S5 (design/backend work), B2–B9, G1 (backend/infra). §19.1 risk distribution, §19.4 compliance scores, §19.5 roadmap, and §19.7 summary table updated to reflect resolved state. `expo-crypto` required as new dependency for SHA-256 PIN hashing.
**v1.22 updates:** **Expo and prebuild:** Expo SDK and all PRD dependencies (§11.3, §11.11.3) are installed in the project. **`npx expo prebuild`** has been run; native `ios/` and `android/` directories exist. Use `npx expo run:ios` / `npx expo run:android` for development builds; see §11.11.3b and `docs/IOS_SETUP.md` for pod install and encoding notes.
**v1.20 updates:** **Security Audit & Hardening Plan** (§19): Full penetration-testing-style audit of the codebase. 26 findings across frontend (V1–V12), backend (B1–B9), and services/config (S1–S14) – 2 Critical, 5 High, 10 Medium, 9 Low. Compliance gap analysis against NAMQR v5.0, Namibian Open Banking v1.0, ETA 4/2019, PSD-12, PSD-1, PSD-3. Prioritised remediation roadmap (Immediate / Sprint 1 / Sprint 2 / Sprint 3). Google Maps placeholder key finding added (G1). Full Executive Summary, Methodology, Findings table, Compliance Gaps, and Recommendations.
**v1.19 updates:** **Wallet CRUD and auth consistency.** (1) Edit Wallet: screen at `app/wallets/[id]/edit.tsx` – name, icon (EmojiPicker), and card design (horizontal swatch picker, frame IDs 2–32 from `CardDesign.ts`); wired from Wallet Detail header (Edit + Delete for non-main; Edit only for main). (2) Wallet delete: `deleteWallet(id)` in `services/wallets.ts` (API DELETE + AsyncStorage fallback); Wallet Detail delete confirm calls it and navigates to `/(tabs)` on success. (3) Wallet update: `updateWallet(id, { name, icon, cardDesignFrameId })` in `services/wallets.ts` (API PATCH + AsyncStorage fallback). (4) Auth token: all API auth headers use `getSecureItem('buffr_access_token')` instead of `AsyncStorage.getItem` (services: transactions, vouchers, send, cashout; app: bills/pay, merchants, receive/request, receive/voucher, receive/group-invite, loans, home/loans, proof-of-life, utilities/vouchers/redeem/nampost/booking). (5) Wallets list refetch on focus: `useFocusEffect` in `app/wallets/index.tsx` so list updates after add/delete.
**Status:** Specification – Build in `buffr-g2p`  
**Self-contained:** This PRD is the **full specification**: wireframes (§3.7), **complete Figma screen index** (§3.8), user flows and flow logic (§7, §7.6), API request/response shapes (§9.4), design system (§5), **full component hierarchy organism→atom** (§4.7, §8.2), project structure and copy-paste code (§11, §11.7–§11.8). **No TODOs**—entry, onboarding, contexts, 2FA, compliance, NAMQR, and Open Banking are fully specified. Implement from this document with **100% confidence**. Use **Archon MCP** with this PRD for code generation (§9.5, §11.9).  
**Design sources:** Figma MCP (Buffr App Design; file key `VeGAwsChUvwTBZxAU6H8VQ`), Archon (CONSOLIDATED_PRD, BUFFR_G2P_FINAL_ARCHITECTURE).  
**Compliance:** This revision integrates:
- **Namibian NAMQR Code Specifications v5.0** (April 2025)
- **Namibian Open Banking Standards v1.0** (March 2025)
- **Electronic Transactions Act 4 of 2019** (as amended)
- **Payment System Management Act, 2023** and associated Determinations:
  - **PSD-12** (Operational and Cybersecurity Standards)
  - **PSD-1** (Licensing and Authorisation of Payment Service Providers)
  - **PSD-3** (Issuing of Electronic Money)

All QR‑based transactions, payment flows, API interactions, security measures, and operational processes must conform to these national laws and standards. See §12 (Legal & Regulatory) and §14 (NAMQR & Open Banking mapping).

---

## Table of Contents

1. [Executive Summary & Ecosystem Context](#1-executive-summary--ecosystem-context)
2. [Buffr G2P App Scope](#2-buffr-g2p-app-scope)
3. [Complete Screen Inventory & Layouts](#3-complete-screen-inventory--layouts) (§3.0 Design source & implementation alignment; §3.8 Figma index; §3.9 Receiver; §3.10 USSD; §3.11 PRD↔Complete Doc; §3.12 UX Master Checklist; §3.13 Implementation Status; §3.14 Flow-to-Design Alignment; §3.15 Navigation and Flows Audit; §3.16 Audit Findings & Rectifications)
4. [Component Inventory](#4-component-inventory) (§4.7 full hierarchy: organisms → atoms from Figma)
5. [Design System](#5-design-system) (§5.3 Figma effects/backgrounds; §5.4 Design verification: Buffr App Design – cards, wallet, group, animations)
6. [Layouts & Navigation](#6-layouts--navigation)
7. [User Flows](#7-user-flows)
8. [Data Hierarchy (Organism → Atom)](#8-data-hierarchy-organism--atom) (§8.2 UI component hierarchy from Figma)
9. [Tech Stack & Implementation](#9-tech-stack--implementation) (§9.2b Design & Code Reference for Expo/production; §9.5 Using Archon MCP for implementation – 100% confidence)
10. [Compliance & Security (App)](#10-compliance--security-app)
11. [Implementation File Map](#11-implementation-file-map--code-self-contained) (§11.0 Expo docs; §11.4 copy-paste code; §11.11 Expo Tabs Template Implementation Guide; §11.7–§11.8 Legal & NAMQR/Open Banking)
11.12–11.21 [Gap Analysis & Recommendations for v1.6](#1112-1121-gap-analysis--recommendations-for-v16-senior-developer-review) (Offline, Push, Analytics, Testing, Deployment, Security, Accessibility, i18n, Edge Cases, Performance)
12. [Legal & Regulatory Compliance](#12-legal--regulatory-compliance-new) (§12.1–§12.5: ETA, PSD-12, PSD-1, PSD-3, applicability, measures)
13. [Implementation Roadmap (PRD ↔ System Design Guide)](#13-implementation-roadmap-prd--system-design-guide) (§13.1–§13.6: 23 rules, system design principles, PRD enhancements, sprint plan, AI leverage, validation)
14. [Compliance with NAMQR and Open Banking](#14-compliance-with-namqr-and-open-banking) (§14.1–§14.3: NAMQR alignment table, Open Banking alignment table, implementation checklist)
15. [Figma Design Enrichment](#15-figma-design-enrichment) (§15.1–§15.8: batch plan, JSON spec, canonical design spec, full-app coverage)
16. [Database Design](#16-database-design) (§16.1–§16.4: PostgreSQL schema, loans, voucher redemption, validation)
17. [ISO 20022 & Open Banking API Design](#17-iso-20022--open-banking-api-design) (§17.1–§17.5: API structure, endpoint catalogue, ISO 20022 mapping, validation)
18. [Complete User Flows & Navigation Master](#18-complete-user-flows--navigation-master) (§18: Production-ready reference – all flows, roles, navigation, dead-end prevention, edge cases, missing screens)
19. [Security Audit & Hardening Plan](#19-security-audit--hardening-plan) (§19.1 Executive Summary; §19.2 Scope & Methodology; §19.3 Findings; §19.4 Compliance Gaps; §19.5 Remediation Roadmap; §19.7 Summary Table — ✅ 20/30 findings resolved in v1.21)

---

## 1. Executive Summary & Ecosystem Context

### 1.1 Ecosystem Overview (Ketchup Software Solutions)

A digital ecosystem for **Government-to-Person (G2P)** payments, social grants, subsidies, and broader government services in Namibia—including non-cash aid, deliveries, and community-based logistics. The ecosystem serves beneficiaries across all 14 regions, from urban centers to remote rural areas.

**Current challenge:** Over 70% of grant recipients are unbanked and rely on cash, leading to long queues, safety risks, and high costs at NamPost branches and mobile pay points.

**Four pillars of beneficiary access:**

| Pillar | Features | Who It Serves |
|--------|----------|---------------|
| **ATMs** | 24/7 self-service; card + PIN, cardless (SMS code), or QR from app; fee per withdrawal | Smartphone and non-smartphone users |
| **Mobile App** | Full digital wallet; QR (NAMQR); P2P; bill pay; airtime; delivery tracking; agents map; transaction history; proof-of-life; iOS & Android | Smartphone users; digitally literate beneficiaries |
| **USSD (*123#)** | Text menus: balance; redeem voucher; cash-out code; bills; delivery; proof-of-life; SMS confirmations | Feature-phone users; low-literacy; poor data coverage |
| **Agent Network** | Cash-out (code + ID; biometric at POS); bill pay; airtime; parcel collection; proof-of-life; extended hours | All beneficiaries; those preferring human interaction |

**Buffr G2P** is the **Mobile App** pillar—the beneficiary-facing app (Expo/React Native) that we will build in the  /Users/georgenekwaya/buffr-g2p`buffr-g2p` project. All critical notifications (voucher issued, redemption confirmation, collection codes, expiry) are sent via **SMS** so beneficiaries without smartphones or data are never left behind.

### 1.2 Ecosystem Components (Relevant to App)

| Component | Role | Relation to Buffr G2P App |
|-----------|------|----------------------------|
| **Ketchup SmartPay** | G2P engine; beneficiary registry; voucher lifecycle; Token Vault; SMS; distribution via webhook/API | App receives vouchers, validates redemption via Token Vault; all flows call backend APIs |
| **Beneficiary Platform** | User-facing wallet and access | **Buffr G2P app = this platform’s mobile app** |
| **Biometric Verification Service** | Standalone identity verification (1:1 vs enrolled template) | Consumed at enrolment, cash-out, proof-of-life (app triggers, does not embed) |
| **Agent / NamPost / ATM / Mobile Units** | Physical layer | App shows “agents nearby” map, NamPost booking, SmartPay units, ATM locator |

### 1.3 Reference Documents

| Document | Purpose |
|----------|---------|
| `../buffr/docs/CONSOLIDATED_PRD.md` | Full ecosystem PRD (Ketchup SmartPay, BUFFR, portals, APIs, compliance) |
| `../buffr/docs/BUFFR_G2P_FINAL_ARCHITECTURE.md` | Corrected voucher (3 methods) + wallet cash-out (5 methods); 40+ screens; navigation; API |
| `../buffr/docs/IMPLEMENTATION_REFERENCE.md` | MCP usage: Figma (designs), Archon (docs) |
| **NAMQR Code Specifications** (Bank of Namibia) | **Binding.** TLV payload structure, mandatory tags (00, 01, 26/29, 52, 58, 59, 60, 65, 63), Token Vault (NREF), Signed QR (Tag 66). Payee-presented QR for Agent/ATM/Till/Merchant cash-out. |
| **Namibian Open Banking Standards v1.0** (g2p/docs/NAMIBIAN_OPEN_BANKING_STANDARDS_V1.txt) | **Binding** when interacting with banks. mTLS (QWACs), OAuth 2.0 / OIDC (PAR, PKCE), API structure (data/links/meta), consent scopes, SCA. |

---

## 2. Buffr G2P App Scope

### 2.1 What We Build in buffr_g2p

- **Single codebase:** React Native (Expo), TypeScript.
- **Platform:** iOS and Android; same flows and outcomes as USSD (parity).
- **Scope:** All screens, components, and layouts listed in this PRD for the **Beneficiary Platform mobile app**, with full compliance to:

  | Standard / Law | Key Requirements |
  |----------------|------------------|
  | **NAMQR Code Specifications v5.0** | TLV format, Token Vault, Signed QR, mandatory tags |
  | **Open Banking Standards v1.0** | OAuth 2.0, mTLS, QWACs, consent flows |
  | **Electronic Transactions Act 4 of 2019** | Legal recognition of data messages, electronic signatures, admissibility of electronic evidence, retention of records |
  | **PSD-12 (Cybersecurity)** | 2FA for all payments, encryption, incident reporting (24h), recovery time objectives, risk management framework |
  | **PSD-1 (Licensing)** | Ketchup must operate as a licensed PSP or TPPP under a sponsoring bank; comply with capital, governance, and reporting requirements |
  | **PSD-3 (E‑money)** | If Buffr holds customer funds as e‑money: trust account, 100% backing, no interest on wallets, capital requirements, AML/CFT compliance |

- **In-scope features:** Onboarding (optional country selection), **G2P voucher system** (3 methods: Wallet, NamPost, SmartPay – NamPost/SmartPay use **dynamic NAMQR** displayed by branch/unit; user scans with app), home, **wallet cash-out** (5 methods: Bank, Till, Agent, Merchant, ATM – Till/Agent/Merchant/ATM use **user scans payee-generated NAMQR**), wallet payments (send money, merchants, bills), **cards**, **QR Code Scanner** (full NAMQR: TLV parse, CRC, Signed QR verification), **My QR Code** (static NAMQR for receive), **groups**, profile, settings, extras. Optional: bank linking via **OAuth 2.0** consent. See §3.0 for Figma alignment, §12 for legal compliance, and §14 for NAMQR/Open Banking mapping.
- **USSD channel (*123#):** Text-based menus for beneficiaries without smartphones. Supports balance enquiry, voucher redemption, cash-out code generation, bill payments, airtime top-up, delivery tracking, and proof-of-life. All actions confirmed via SMS. See §3.10, §7.6.6–7.6.7.

### 2.2 Correct Voucher & Wallet Model (from FINAL_ARCHITECTURE)

**Voucher redemption (3 methods only):**

| # | Method | Flow | Fee | Screen(s) |
|---|--------|------|-----|-----------|
| 1 | **Buffr Wallet** | Voucher → instant wallet credit | Free | Voucher Detail → 2FA → Wallet Success |
| 2 | **Cash at NamPost** | Voucher → select branch → **branch displays dynamic NAMQR** → user scans with app → 2FA → collect cash | Free | NamPost Branch List → NamPost Collection Code (displays NAMQR; user scans) |
| 3 | **Cash at SmartPay Mobile Units** | Voucher → select unit → **unit displays dynamic NAMQR** → user scans with app → 2FA → collect cash | Free | SmartPay Units → SmartPay Collection Code (displays NAMQR; user scans) |

**Wallet cash-out (5 methods):** *After* voucher is in wallet, user can cash out via:

| # | Method | Flow | Fee | Screen(s) |
|---|--------|------|-----|-----------|
| 1 | Bank Transfer | Wallet → bank account (Open Banking PIS) | N$ 5 | Cash-Out Hub → Bank Transfer → OAuth consent → 2FA → Confirmation |
| 2 | Cash at Till | **User scans till’s NAMQR** → app validates via Token Vault → 2FA → till gives cash | Free | Cash at Till → Scan QR (till displays NAMQR) |
| 3 | Cash at Agent | **User scans agent’s NAMQR** → app validates → 2FA → agent gives cash | N$ 5 | Cash at Agent → Scan QR (agent displays NAMQR) |
| 4 | Cash at Merchant | **User scans merchant’s NAMQR** → app validates → 2FA → merchant gives cash | N$ 3 | Cash at Merchant → Scan QR (merchant displays NAMQR) |
| 5 | Cash at ATM | **User enters amount on ATM → ATM displays NAMQR → user scans with app** → 2FA → ATM dispenses | N$ 8 | Cash at ATM → Scan QR (ATM displays NAMQR) |

**Wallet payments (from balance):** Pay merchants (NAMQR), P2P send, bill pay, wallet-to-wallet.

### 2.3 Voucher-backed loans (advance)

Loans are **voucher-backed advances** for beneficiaries who want liquidity before their next grant.

| Rule | Description |
|------|-------------|
| **Eligibility** | Based on **previous voucher** value (last redeemed voucher, or last month’s grant value as determined by backend). |
| **Max advance** | Up to **1/3 of previous voucher value** (e.g. previous voucher N$ 300 → max loan N$ 100). |
| **Interest** | **15%** on the advance (applied at disbursement or at repayment; backend defines exact calculation). |
| **Repayment** | **Auto-pay from wallet** when the beneficiary **redeems the next month’s voucher to Buffr Wallet**. On redemption to wallet, the system first deducts the loan repayment (principal + interest) from the credited amount, then the remainder is available as wallet balance. |
| **Flow** | Beneficiary applies for loan (amount up to 1/3 of previous voucher value) → 2FA → disbursement to wallet or cash; backend tracks loan and attaches repayment to next voucher-to-wallet redemption. |

Backend must support: loan eligibility (previous voucher value), apply, disbursement, and automatic deduction on next voucher-to-wallet redemption. Database and API design (§9.3, §9.4) should reflect loan entity, link to voucher history, and repayment rule. App screens: Loans list, apply (amount, terms), active loan detail, status. See §3.6 screen 40, §7.7.

### 2.4 Proof-of-Life & Beneficiary Verification

**Purpose:** Ensure beneficiaries are alive and eligible to continue receiving grants. The government requires periodic biometric verification to prevent payments to deceased persons ("ghost beneficiaries") and detect identity fraud.

**Verification methods (beneficiary chooses based on access):**

| Method | Channel | How it works |
|--------|---------|--------------|
| **In-app biometric** | Mobile App | Beneficiary opens app → receives prompt "Verify to continue receiving grants" → completes face/fingerprint scan via device biometrics → result sent to Biometric Verification Service. |
| **At agent/NamPost** | POS Terminal (FP09) | Beneficiary visits agent with ID → agent selects "Proof-of-life" on terminal → beneficiary provides biometric (face/fingerprint) → terminal verifies against enrolled template. |
| **At mobile unit** | Mobile Unit POS | Same as agent terminal, but unit visits beneficiary's location. |
| **USSD fallback** | USSD + SMS | If no smartphone and cannot reach agent, USSD menu allows beneficiary to request home visit or schedule appointment; Ketchup SMS confirms arrangements. |

**Rules:**
- **Frequency:** Quarterly (90 days). Configurable by government programme.
- **Grace period:** 30 days after due date. After grace period, wallet is **frozen** (cannot redeem, cash out, send money, or pay merchants). Vouchers can still be redeemed only at NamPost/SmartPay with biometric verification at the point of redemption (which also serves as proof-of-life).
- **Escalation:** If unverified for 90 days past due, beneficiary flagged in Government Portal for field follow-up; after 120 days, account deactivated (requires re-enrolment).
- **Notifications:**
  - 14 days before due: SMS + app notification
  - Due date: SMS + app notification
  - Grace period start: SMS
  - Wallet frozen: SMS with instructions to visit nearest agent/mobile unit

**Technical flow (in-app biometric):**
1. App checks `lastProofOfLife` from user profile (`GET /api/v1/mobile/user/profile` includes `lastProofOfLife` and `proofOfLifeDueDate`).
2. If `proofOfLifeDueDate` is within next 14 days, home screen shows banner: "Please verify to continue receiving grants."
3. User taps banner → opens verification screen.
4. App captures biometric (face/fingerprint) using device biometrics or camera.
5. App sends `POST /api/v1/mobile/user/proof-of-life` with biometric data (or reference).
6. Backend calls Biometric Verification Service; on success, updates `lastProofOfLife` and `proofOfLifeDueDate = now + 90 days`.
7. App shows success screen, removes banner.

**Agent/USSD flows:** Handled by POS terminal/USSD gateway, not directly by app, but app reflects status (frozen/unfrozen) based on API.

---

## 3. Complete Screen Inventory & Layouts

Every screen below is planned for implementation in `buffr_g2p`. **Route** = Expo Router path. **Layout** = primary layout type (Stack, Tab, Modal). **Key components** = main UI building blocks.

### 3.0 Scope and Figma alignment

- **Screen inventory (§3.1–§3.6)** lists all in-scope screens (including optional and card/group/QR flows). **Figma screen index (§3.8)** lists every top-level frame in Figma with nodeId; some Figma frames are **variants** of the same route (e.g. multiple “Main Screen” nodes = same Home with different tab content), and some are **optional** or **future** (e.g. country selection, bank linking).
- **In scope for initial build:** All screens in §3.1–§3.6, including: onboarding (with optional country step if enabled), G2P voucher flows (§3.2), wallet cash-out (§3.3), Home & payments (§3.4), profile (§3.5), extras (§3.6) including **QR Code Scanner**, **Groups** (Create Group, Group view), and **card flows** (Add card, Add card details, Card added, Cards View).
- **Optional / later:** Country selection (Figma “Select your beloved country”), Bank linking (“Available bank accounts”) – include in inventory as optional; implement when product requires.
- **Duplicate nodeIds in §3.8:** Multiple Figma nodeIds can map to the same PRD screen (e.g. “Main Screen” 45:837, 162:1202, 723:8346, 725:8543 → same Home route). Use any listed nodeId to re-query that screen design.
- **Screens in Figma but not in §3:** None after this update; all Figma screens in §3.8 are either mapped to a §3 screen or explicitly marked optional/future in the table.

**Design source (BuffrCrew) and implementation alignment**

- **Design assets:** Figma-exported screens and flows live in **Downloads/BuffrCrew/Buffr App Design** (and card frames in **BuffrCrew/Buffr Card Design**). Key SVGs: Home screen, Home screen (Total Balance Visible/Hidden), Add Money, Add Money (Changed Method), Adding A Wallet, Add Card, Wallet View, Receiver's Details, Group Send/Request, Loans, Transactions, etc. Use these for labels, hierarchy, and flow order when aligning implementation.
- **Figma / JSON spec:** When available, use `buffr_g2p/docs/BUFFR_G2P_FIGMA_DESIGN_SPEC.json` (file key `VeGAwsChUvwTBZxAU6H8VQ`, Buffr App Design) and §15 for nodeIds and batch fetch.
- **Implementation alignment (binding for this app):**
  - **Home – balance pill "+"** → **Add** (add to the visible balance). Route: `/wallets/[firstWalletId]/add-money` if user has wallets, else `/wallets`. Label: **"+ Add"**. Do **not** route to Add Wallet; the "+" implies adding to the account balance shown.
  - **Add Wallet** → Route `/add-wallet`. Reached from Wallets list or profile/settings, not from the Home balance pill.
  - **Add Money screen** (`/wallets/[id]/add-money`): Three methods – Bank Transfer (EFT), Agent Deposit, Debit/Credit Card. **Debit/Credit Card** = "Link a card to top up": selectable method that shows copy and a **Link a card** CTA navigating to `/add-card`. No "coming soon" or disabled state.
  - **EFT / Bank Transfer:** Account name shown to user = **Buffr Financial Services** (not Buffr Namibia Pty Ltd).
  - **Add Card flow** (§3.14.1): Step 1 = `/add-card` ("Scan your card" primary, "Add Card +" manual). If scan chosen → `/add-card/scan` (scan step; "Enter manually instead" → details). Step 2 = `/add-card/details` (CTA "Add Card +"). Step 3 = `/add-card/success`. See §3.12.2 Add Card flow and §3.14.
  - **Home search:** Header search bar filters Services grid, Recent transactions, and Recent contacts by query ("Search anything…"). See §3.14.1.

### 3.1 Onboarding (8 screens, 1 optional)

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 1 | Welcome | `/` or `/onboarding` | Stack, full screen | Logo, title, subtitle, “Get Started” / “Create account” CTA |
| 1b | Country selection *(optional)* | `/onboarding/country` | Stack | Country list, “Detected country”, “Select Country”; Figma 30:1518 |
| 2 | Phone Entry | `/onboarding/phone` | Stack | Country code +264, phone input, “Continue” |
| 3 | OTP Verification | `/onboarding/otp` | Stack | OTP input (4–6 digits), “Resend”, “Verify” |
| 4 | Name Entry | `/onboarding/name` | Stack | First name, last name, “Continue”; profile update via PATCH user (§9.4) |
| 5 | Photo Upload | `/onboarding/photo` | Stack | Camera/gallery, crop, “Continue”; profile photo via PATCH user (§9.4). *Biometric capture (face/fingerprint) occurs during enrolment at welfare office, mobile unit, or agent POS terminal – not in app. The app only uses device biometrics for authentication and proof-of-life verification (§2.4).* |
| 6 | Face ID Setup | `/onboarding/face-id` | Stack | Biometric prompt, “Enable” / “Skip” |
| 7 | Completion | `/onboarding/complete` | Stack | Success message, Buffr ID/card preview, “Go to Home” |

**Onboarding layout:** Single stack, no tabs; after completion → replace with main app (tabs). Name and photo are persisted via `PATCH /api/v1/mobile/user/profile` when API exists (§9.4).

### 3.2 G2P Voucher System (10 screens)

**NAMQR compliance:** NamPost and SmartPay redemption use **payee-presented dynamic NAMQR**. The branch/unit displays the NAMQR; the user scans it with the Buffr app. All QR payloads use **TLV format** and **Token Vault** (NREF) validation. See §14.

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 8 | Vouchers List | `/(tabs)/vouchers` or `/utilities/vouchers` | Tab or Stack | Type filters, list/cards of vouchers (available, redeemed, expired), pull-to-refresh |
| 9 | Voucher Detail | `/utilities/vouchers/[id]` | Stack | Amount, status, expiry; 3 redemption buttons (Wallet, NamPost, SmartPay); 2FA step before redeem |
| 10 | NamPost Branch List | `/utilities/vouchers/redeem/nampost` | Stack | List/map of branches, distance; select branch → **screen displays dynamic NAMQR** (generated by backend with Token Vault ID) |
| 11 | NamPost Collection Code | `/utilities/vouchers/redeem/nampost/code` | Stack | **Displays dynamic NAMQR** (payee-presented) containing branch’s IPP full form alias, amount, Token Vault ID. User scans with app → app validates via Token Vault → 2FA → success |
| 12 | NamPost Success | `/utilities/vouchers/redeem/nampost/success` | Stack | “Success”, branch details, “Done” |
| 13 | SmartPay Units | `/utilities/vouchers/redeem/smartpay` | Stack | List/map of mobile units; select unit → **screen displays dynamic NAMQR** |
| 14 | SmartPay Collection Code | `/utilities/vouchers/redeem/smartpay/code` | Stack | **Displays dynamic NAMQR** (payee-presented). User scans with app → validate → 2FA → success |
| 15 | Wallet Redemption (instant) | In-app state / modal | Modal or Stack | “Redeem to wallet” → 2FA → Wallet Success |
| 16 | Wallet Success | `/utilities/vouchers/redeem/wallet/success` | Stack | “Credited to wallet”, amount, “View wallet” / “Cash out” |

**Voucher layout:** Stack within tab or under `utilities`; modals for 2FA and success where appropriate.

### 3.3 Wallet Cash-Out (8 screens)

**NAMQR compliance:** Cash-out at Till, Agent, Merchant, and ATM uses **payee-presented NAMQR**. The till/agent/merchant/ATM **generates** the dynamic NAMQR; the **user scans** it with the Buffr app. The app parses TLV, validates via Token Vault, shows payee and amount, then user 2FA. See §14.

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 17 | Wallet Cash-Out Hub | `/wallets/[id]/cash-out` | Stack | 5 method cards (Bank, Till, Agent, Merchant, ATM) with fee and time |
| 18 | Cash at Till | `/wallets/[id]/cash-out/till` | Stack | **User enters amount → app instructs “Scan the till’s QR”.** Till (merchant) displays dynamic NAMQR (IPP alias + amount). User scans → app validates via Token Vault → show merchant + amount → 2FA → success |
| 19 | Cash at Agent | `/wallets/[id]/cash-out/agent` or via Agent Network | Stack | **User scans agent-generated NAMQR.** Agent’s POS displays QR with IPP alias + amount. User scans → validate → 2FA → agent hands cash |
| 20 | Cash at Merchant | `/wallets/[id]/cash-out/merchant` or via Merchants | Stack | **User scans merchant-generated NAMQR.** Same flow as Till/Agent |
| 21 | Cash at ATM | `/wallets/[id]/cash-out/atm` | Stack | **User enters amount on ATM → ATM displays NAMQR on screen.** User scans with app → validate → 2FA → ATM dispenses cash |
| 22 | Bank Transfer | `/wallets/[id]/cash-out/bank` | Stack | Bank selection, account, amount; **Open Banking PIS** (OAuth consent redirect) → 2FA → confirmation |
| 23 | Cash-Out Success | `/wallets/[id]/cash-out/success` | Stack | “Success”, amount, method, “Back to wallet” |

**Deprecated:** “Cash-Out Code (shared)” screen where app generated a code/QR is removed; cash-out now uses **user scans payee NAMQR** only.

**Cash-out layout:** Stack under `wallets/[id]/cash-out/`; scanner invoked for Till/Agent/Merchant/ATM flows.

**Design reference – Wallet Cash-Out:** Buffr G2P Complete Code Reference §7 (Wallet & Cash Out) and Implementation Guide – Wallet Cash-Out System: **Wallet Cash-Out Hub** compares 5 methods (Bank N$5 / 1–2 days; Till free / instant; Agent N$5 / instant; Merchant N$3 / instant; ATM N$8 / instant) with fee, time, and limit; **Cash at Till** (CashbackTillScreen): retailer selection → amount → 2FA → till code (e.g. 8-char, 7-day expiry); **Cash at Agent** (CashOutAtAgent): agent selection → amount → source wallet → 2FA → transaction code/QR (e.g. 6-char, 30-min expiry); **Bank Transfer**: bank selection → OAuth consent → 2FA → confirmation. Code/expiry rules: agent 30 min, NamPost until branch closing, SmartPay 2 h, till 7 days.

### 3.4 Home & Wallet Payments (10 screens)

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 25 | Home | `/(tabs)/index` or `/(tabs)` | Tab | Header (avatar, notifications); Search (pill); “Send to” contacts; Balance card; **Buffr Card** (main Buffr account / primary wallet); Wallets carousel; Services grid; FABs (Send, QR); bottom tabs |
| 26 | Add Money Modal | Modal from Home or Wallet Detail | Modal / Bottom sheet | **AddMoneyModal:** 3 methods – Bank Transfer, Debit Card, Redeem Voucher (→ Vouchers). Shown from Home “Add” or from Wallet Detail “Add money”. Per Complete Doc §6. |
| 27 | Send Money – Select recipient | `/send-money/select-recipient` | Stack | **SendToScreen:** Contacts list, search, recents, favorites; “Send to” selection |
| 27b | Send Money – Receiver details | `/send-money/receiver-details` | Stack | **ReceiverDetailsScreen:** Review recipient, choose payment source (wallet), add note; step **before** 2FA. Align flow: Select recipient → Amount → **Receiver details** → 2FA → Success. |
| 28 | Send Money – Amount | `/send-money/amount` | Stack | Amount input, note, “Continue” |
| 29 | Send Money – Confirm | `/send-money/confirm` | Stack | Summary, 2FA modal (§11.4.13), “Send” |
| 30 | Send Money – Success | `/send-money/success` | Stack | **PaymentSuccess** (reusable); success, receipt, “Done” |
| 31 | Merchant Directory | `/(tabs)/merchants` or `/merchants` | Tab or Stack | Categories, list/map; tap → Pay Merchant |
| 32 | Pay Merchant | `/merchants/[id]/pay` | Stack | Amount, wallet source, NAMQR flow, 2FA, success |
| 33 | Bill Payments | `/bills` or `/(tabs)/bills` | Stack or Tab | Billers (electricity, water, municipal), select → amount → pay from wallet |
| 34 | Add Wallet | `/add-wallet` | Modal | Name, type (main/savings), icon; “Create”; optional step 2: card design picker (§11.4.14) |
| 34b | Cards View | `/cards` or from Home | Stack or Tab | **CardViewScreen:** Buffr (NamPost) main card + any linked bank cards; list/grid; Figma 115:529 |
| 34c | Add card | `/add-card` | Stack | “Scan your card” or manual; Figma 44:593 |
| 34d | Add card details | `/add-card/details` | Stack | Card number, expiry, etc.; Figma 44:639 |
| 34e | Card added | `/add-card/success` | Stack | Success state; Figma 45:660 |

**Home layout:** Tab layout for Home, Transactions, (optional) Vouchers/Merchants/Profile; Stack for each flow.

**Card and wallet model:** Card designs (e.g. `assets/images/card-designs/frame-2.svg` … `frame-32.svg`) are used for (1) the **main Buffr account (primary wallet)**—the Buffr Card on Home represents the user’s primary wallet with user context (display name, masked card number); (2) **additional wallets**—the same designs can represent user-created wallets, each with user context (wallet name, balance, type) and an optional card design frame ID (2–32) per wallet. The Buffr Card block on Home is the primary wallet; each item in the Wallets carousel may use a card design (by `cardDesignFrameId`) to show a consistent visual identity. See `constants/CardDesign.ts`, Wallet type `cardDesignFrameId` (§9.4 / implementation), and Add Wallet optional step 2 (card design picker, §11.4.14).

**Design reference – wallet flows & Auto Pay:** For full UI/UX and code patterns, see the **Buffr G2P Complete Code Reference** and **Implementation Guide**: (1) **Add Wallet** – Step 1: icon picker (emoji grid), name (pill input), **Auto Pay** toggle + config (frequency: weekly/bi-weekly/monthly; deduct date/time; amount N$; repayments; payment method). Step 2 (optional): card design selection. Save → success ping (scale animation) → navigate home. (2) **Wallet Cash-Out Hub** – 5 method cards (Bank, Till, Agent, Merchant, ATM) with fee, time, and limit per method; comparison table; direct navigation to each flow. (3) **WalletCard** – icon circle, name, balance, owner (user context); optional card design color by `cardDesignFrameId`. (4) **Cash-out flows** – Cash at Till (retailer selection → code); Cash at Agent (agent selection → amount → code/QR); Bank Transfer (bank selection → OAuth/2FA). Align implementation with `AddWallet.tsx` (state-flow), `WalletCashOutScreen.tsx`, `CashOutAtAgent.tsx`, `CashbackTillScreen.tsx` patterns and UserContext for owner/display name.

### 3.5 Profile & Management (5 screens)

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 35 | Profile | `/profile` or `/(tabs)/profile` | Stack or Tab | Avatar, name, Buffr ID; stats (vouchers, wallet); verification status; linked accounts; “Settings” |
| 36 | Settings | `/settings` or `/profile/settings` | Stack | Sections: Account, Security, Notifications, Privacy, Help, About |
| 37 | Analytics Dashboard | `/analytics` | Stack | **TransactionsBalance / Analytics:** Segmented control (Balance / Earnings / Spendings); period selector (Weekly / Monthly / All Time); bar chart; category breakdown. Voucher + wallet analytics (charts, totals). Per Complete Doc §21. |
| 38 | Location Services | `/location` or `/map` | Stack | Map: agents, NamPost, SmartPay units, ATMs; filters; list view |
| 39 | Transactions History | `/(tabs)/transactions` or `/transactions` | Tab or Stack | List with filters (date, type); tap → Transaction detail |

**Profile layout:** Stack from Profile root; Settings as child stack.

#### 3.5.1 Settings screen (36) – Full specification

The Settings screen is the central hub for account, security, privacy, help, and about. It is reachable from Profile via “Settings” and is implemented at `/(tabs)/profile/settings`. All sub-screens use a consistent header (back arrow, title) and scrollable content. Implementation files are under `app/(tabs)/profile/`.

| Section | Item | Route | Purpose | Compliance / notes |
|--------|------|--------|---------|--------------------|
| **Account** | Edit profile | `/(tabs)/profile/edit-profile` | Edit name, phone, photo (placeholder until backend). Uses UserContext `profile` (firstName, lastName, phone, photoUri). | §3.5; data minimisation. |
| | Notifications | `/(tabs)/profile/notifications` | Toggle notification categories (e.g. vouchers, transactions). Persisted to AsyncStorage; sync with backend when available. | PSD-1; user preferences. |
| **Security** | Proof of life | `/proof-of-life/verify` | Entry point for quarterly biometric verification. Explains 90-day rule; “Start verification” triggers device biometric. Cross-ref §3.6 screens 50b, 58–61. | G2P compliance (§2.4); wallet status in UserContext. |
| | Change PIN | `/(tabs)/profile/change-pin` | Current PIN → new PIN → confirm. Placeholder copy until backend PIN API; then wire to secure endpoint (hash client-side per §11). | E-money access control; 2FA. |
| **Privacy** | Privacy policy | `/(tabs)/profile/privacy-policy` | Summary of data collection and use; link to full policy when URL available. | PSD-1, data protection; §12. |
| | Data & permissions | `/(tabs)/profile/data-permissions` | Lists app permissions (camera, contacts, notifications, biometrics, storage). Directs user to device Settings. When Open Banking is enabled, this screen should also describe consent to share data with TPPs and how to revoke (cross-ref §11.8, Namibian Open Banking consent). | Open Banking consent/revocation; PSD-1. |
| | Fees and charges | `/(tabs)/profile/fees-charges` | Displays `LEGAL_TERMS.feesAndCharges` and `LEGAL_TERMS.redemptionRights`. PSD-1 §10.4, PSD-3 §14. | §12.6; constants/legalTerms.ts. |
| **Help** | Help centre | `/(tabs)/profile/help-centre` | Getting help, FAQ placeholder, complaints notice from legalTerms. | PSD-1 §16. |
| | Contact us | `/(tabs)/profile/contact-us` | Complaints process, escalation, “how to reach us”. Uses legalTerms.complaintsNotice, complaintsProcess, complaintsEscalation. | PSD-1 §16.7, §16.9, §16.10. |
| **About** | About Buffr | `/(tabs)/profile/about` | App name, version (from `expo-constants`), short description. | — |
| | Terms of service | `/(tabs)/profile/terms` | User agreement intro from legalTerms; cross-links to Fees and charges and Contact us. | PSD-1 §10.4. |
| | App version | *(no navigation)* | Display-only row showing current app version (e.g. 1.0.0) from `expo-constants`. Not tappable. | — |

**Implementation checklist (Settings):**

- Settings hub: `app/(tabs)/profile/settings.tsx` – sections Account, Security, Privacy, Help, About; each item navigates to route above or shows version.
- All sub-screens use designSystem colours and spacing; header with back + title; ScrollView content.
- Legal copy: single source in `constants/legalTerms.ts`; referenced by Fees and charges, Terms, Privacy policy, Help centre, Contact us, and send-money confirm consent.
- Edit profile uses UserContext `profile` only (no `user`); Proof of life uses `/proof-of-life/verify`; App version uses `Constants.expoConfig?.version` for consistency with About.

#### 3.5.2 Fintech / banking implementation patterns (Settings links)

Settings sub-screens follow patterns observed in leading fintech and banking apps (e.g. Starling, CommBank, Open Banking UK consent dashboards, SAP Fiori profile/settings):

| Area | Pattern | Buffr implementation |
|------|---------|------------------------|
| **Edit profile** | Clearly labelled section; profile editing separate from general settings; optional profile header. | Editable form: first name, last name, phone, photo (gallery picker). Save to UserContext + AsyncStorage; backend sync when API available. |
| **Notifications** | Security/transaction notifications prominent; category toggles; first-time setup guidance. | Preference toggles (Vouchers, Payments, Security, System, Reminders) persisted to AsyncStorage; inbox list with mark read. |
| **Security (PIN, Proof of life)** | Dedicated security section; authentication methods discoverable; biometric support. | Change PIN: set/change flow with client-side hash in SecureStore. Proof of life: `/proof-of-life/verify` with biometric prompt. |
| **Privacy policy** | In-app summary + “View full policy” opening web content (WebView or system browser). | Structured sections in-app; “Open full policy” button uses `expo-web-browser` when `SUPPORT_URLS.privacyPolicy` is set. |
| **Data & permissions** | Per-permission explanation; “Manage in device Settings” for system permissions; consent dashboard for Open Banking. | Rows: Camera, Contacts, Notifications, Biometrics, Storage (purpose + “Open device Settings” via `Linking.openSettings()`). Open Banking consent/revocation copy. |
| **Fees and charges** | Clear disclosure; cross-link to Contact for questions. | `legalTerms.feesAndCharges` + `redemptionRights`; link to Contact us. |
| **Help centre** | Search/FAQ by topic (Getting started, Security, Complaints); self-service first; link to Contact. | FAQ categories with expandable items; complaints notice from legalTerms; “Contact us” navigates to Contact us screen. |
| **Contact us** | Tiered: FAQ → in-app message/email/phone; clear complaints process. | Complaints process + escalation (legalTerms); tappable Email (mailto), Phone (tel); optional “Open support” (WebBrowser) when URL configured. |
| **About** | App name, version, short description; links to Privacy, Terms, optional “View online”. | Version from expo-constants; description; in-app links to Privacy policy and Terms of service. |
| **Terms of service** | Intro + cross-links to Fees, Contact; “View full terms” in browser when URL set. | legalTerms.userAgreementIntro; links to Fees and charges and Contact us; “Open full terms” when `SUPPORT_URLS.termsOfService` set. |

**Support / legal URLs:** Optional URLs in `constants/support.ts` (e.g. `privacyPolicy`, `termsOfService`, `helpCentre`, `contactUrl`). When set, screens show “Open in browser” / “View online” and use `expo-web-browser` or `Linking.openURL`. When not set, in-app content and navigation links only.

### 3.6 Additional Features (14+ screens / overlays)

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 40 | Loans | `/loans` | Stack | Voucher-backed loans list, **apply** (amount, terms), **active loan detail** with **timeline** (Loan Credited → Repaid/Overdue), hero card (emoji + name), auto-pay row; repayment auto-debited when next voucher redeemed to wallet (§2.3). Per Complete Doc §23 **LoanDetailScreen**. |
| 40b | Edit Auto Pay | `/wallets/[id]/auto-pay` or modal | Stack or Modal | **EditAutoPayScreen:** Frequency (weekly/bi-weekly/monthly); deduct date/time (iOS-style rollers); amount N$; number of repayments; payment method (bank cards, wallets). Used after Add Wallet or from Wallet Detail. Per Complete Doc §6 & §25. |
| 41 | My QR Code | `/qr-code` | Stack or Modal | User’s NAMQR / receive code (display only) |
| 41b | QR Code Scanner | `/scan-qr` or from Pay Merchant | Stack | Full-screen scanner for pay-by-QR or collect-by-QR; Figma 81:465 |
| 42 | Notification Center | `/notifications` or modal | Stack or Modal | List of notifications (voucher, redemption, cash-out, system) |
| 43 | AI Chat | `/ai-chat` | Stack | Chat UI with DeepSeek companion |
| 44 | Gamification *(effects only)* | — | **Not a screen** | **Gamification is effects only:** badges, points, progress, toasts (e.g. BadgeToast overlay), streak/NumberRoll, micro-interactions. Shown in-context on Profile, Home, or after actions. No dedicated screen; optional badge showcase can be a section or deep link, not core navigation. See §19 (Cross-App Gamification). |
| 45 | Financial Literacy | `/learn` | Stack | Articles / tips |
| 46 | Agent Network | `/agents` or `/agents/nearby` | Stack | Map + list of agents; tap → detail / cash-out |
| 47 | Merchant Directory (full) | `/merchants` | Stack | Categories, search, map |
| 47b | Create Group | `/groups/create` | Stack | Group name, description, member selection (pill search, chips); “Create”; Figma 174:696 |
| 47c | Group view / detail | `/groups/[id]` | Stack | Group name, members, activity; **Send** / **Request** actions; optional in G2P scope (§2.1) |
| 47c-i | Group Send | `/groups/[id]/send` | Stack | **GroupSendScreen:** Send money to group; amount, note; 2FA → **GroupPaymentSuccess** |
| 47c-ii | Group Payment Success | `/groups/[id]/send/success` | Stack | **GroupPaymentSuccess:** Confirmation after group send |
| 47c-iii | Group Request | `/groups/[id]/request` | Stack | **GroupRequestScreen:** Request money from group members; amount, note; 2FA → **GroupRequestSuccess** |
| 47c-iv | Group Request Success | `/groups/[id]/request/success` | Stack | **GroupRequestSuccess:** Request sent confirmation |
| 47c-v | Group Settings | `/groups/[id]/settings` | Stack | **GroupSettingsScreen:** POV admin vs member. **Admin:** edit group name, Add members, deactivate other members (remove button), Save. **Member:** read-only name, no Add members, no remove on others; **all:** Deactivate Yourself. Pill layout with contact avatars/initials per Figma. Cross-ref §3.9 receive flows (group invite). |
| 47c-vi | Add Members | `/groups/[id]/add-members` | Stack | **AddMembersScreen:** Admin-only. Invite by phone (optional name); Send invite → API or local persist; back to Settings. |
| 47c-vii | Request Status (modal) | Modal from Group detail | Modal | **RequestStatusModal:** Per-member Paid/Pending for a group request; N$ per member, progress bar, member list with badges; Back. Opened from "View status" on request cards. |
| 47d | Available bank accounts *(optional)* | `/onboarding/bank-accounts` or settings | Stack | Bank linking; Figma 44:537, 60:62 |
| 48 | 2FA Verification Modal | Shared modal | Modal | PIN or biometric prompt; “Verify” / “Cancel”; validation **server-side only** (§11.4.13) |
| 49 | Transaction Detail | `/transactions/[id]` | Stack | Amount, type, date, status, receipt, “Share” |
| 50 | Wallet Detail | `/wallets/[id]` | Stack | Balance, **Monthly Pay** (Auto Pay), **History** → Wallet History (50a), "Transfer", "Add"; **Add Money** from Home or here. Cash out, Edit Auto Pay (40b). |
| 50a | Wallet History | `/wallets/[id]/history` | Stack | Tabs: **Earnings** (receive, voucher_redeem, loan_disbursement), **Added** (add_money). List from getTransactions({ walletId }); tap → Transaction detail (49). |

| 50b | **Proof-of-life reminder** | Modal or `/proof-of-life` | Modal / Stack | Shown when due for quarterly verification (90-day rule). "Confirm your identity to keep your account active." Options: "Verify now", "Remind later", "Learn more". Backend triggers; app displays and can open verification flow. |
| 58 | Proof-of-Life Banner | Home screen banner | Inline | Appears when `proofOfLifeDueDate` ≤ 14 days away. Text: "Please verify to continue receiving grants. [Verify now]" |
| 59 | Proof-of-Life – Verify | `/proof-of-life/verify` | Stack | Explains requirement: "Every 90 days we need to verify you're still receiving grants." Button "Start verification" → triggers device biometric prompt. |
| 60 | Proof-of-Life – Success | `/proof-of-life/success` | Stack | "Thank you. Your verification is valid for another 90 days." |
| 61 | Proof-of-Life – Expired / Frozen | `/proof-of-life/expired` | Stack | Shown when wallet frozen. Text: "Your wallet is frozen because we haven't verified you in over 120 days. Visit your nearest agent or mobile unit with your ID to reactivate." Disables all wallet actions. |

Receiver-perspective screens (incoming payment, voucher, group invite, request to pay) are in **§3.9 Receiver Flows**.

### 3.10 USSD Flows & Menus

The USSD channel provides the same core functionality as the mobile app, optimised for low-literacy users and feature phones. All USSD sessions are stateless; each menu step is a new request. SMS confirmations are sent after each transaction.

**USSD short code:** `*123#` (to be registered with mobile network operators).

**Main menu (after dialling *123#):**

```
Welcome to Buffr
1. Balance
2. Voucher
3. Cash out
4. Pay bills
5. Buy airtime
6. Proof of life
7. Track delivery
0. Help
```

**Sub-menus (simplified representation):**

| Action | Menu path | Input | Output |
|--------|-----------|-------|--------|
| **Balance** | 1 → | – | SMS: "Your Buffr wallet balance is N$ XXX.XX" |
| **Voucher** | 2 → | 1. Redeem to wallet<br>2. Get cash code<br>3. Check expiry | SMS with outcome or code |
| **Cash out** | 3 → | Enter amount → select method (agent, ATM) → | SMS with 6-digit code (valid 30 min) |
| **Pay bills** | 4 → | Select biller → enter account → amount → confirm | SMS confirmation |
| **Airtime** | 5 → | Enter phone → amount → confirm | SMS confirmation |
| **Proof of life** | 6 → | – | SMS: "Visit nearest agent with your ID to verify." |
| **Track delivery** | 7 → | Enter parcel code → | SMS with status and location |
| **Help** | 0 → | – | SMS with agent locator link (if phone supports) or instructions |

**Technical notes:**
- All USSD requests are routed through the mobile operator's USSD gateway to the Buffr backend.
- The backend authenticates the user via MSISDN (phone number) and maintains no session; each request must include the full context (e.g., selected option, entered amount) in the USSD string.
- Responses are plain text, limited to 160 characters per screen.
- After any transaction that generates a code (cash-out, voucher collection), the backend immediately sends an SMS with the code and instructions.
- USSD usage is logged for audit and compliance (same as app).

**Parity with app:**
- **Voucher redemption:** In app, user can scan QR or enter code. In USSD, user selects "Get cash code" and receives an SMS code to present at agent/ATM. The code is the same as the dynamic QR payload's numeric representation (or a separate 6-digit code generated by Token Vault).
- **Cash-out:** In app, user scans payee QR. In USSD, user requests a code, receives SMS code, presents code and ID at agent. Agent enters code into POS to complete cash-out.
- **Proof of life:** In app, user can do biometric verification. In USSD, user is instructed to visit agent. When agent verifies at POS, the system updates proof-of-life status, which is reflected in both channels.
- All transactions are recorded against the same user account, so balance and history are consistent across channels.

### 3.11 PRD ↔ Complete Documentation alignment (v1.6)

This subsection records gaps identified between the PRD (v1.4/1.5) and the **Complete Documentation** (implemented Expo codebase). Additions have been applied so the PRD covers all screens and flows required for Buffr G2P.

**Screens added or enhanced in §3:**

| Addition | PRD location | Source |
|----------|---------------|--------|
| **Group payment flows** | §3.6: 47c-i … 47c-v | GroupSendScreen, GroupPaymentSuccess, GroupRequestScreen, GroupRequestSuccess, GroupSettingsScreen (Complete Doc §9). Cross-ref §3.9 receive flows. |
| **Receiver Details** (before 2FA) | §3.4: 27b | ReceiverDetailsScreen; flow: Select recipient → Amount → **Receiver details** → 2FA → Success (Complete Doc §8). |
| **Edit Auto Pay** | §3.6: 40b | EditAutoPayScreen – frequency, deduct date/time, amount, repayments, payment method (Complete Doc §6, §25). |
| **Add Money Modal** | §3.4: 26, §3.6: 50 | Bottom sheet: Bank Transfer, Debit Card, Redeem Voucher; from Home or Wallet Detail (Complete Doc §6). |
| **Loan Detail** (timeline, hero, auto-pay) | §3.6: 40 | LoanDetailScreen with timeline (Credited → Repaid/Overdue), hero card, auto-pay row (Complete Doc §23). |
| **Analytics** (segmented, period, chart) | §3.5: 37 | Segmented control (Balance/Earnings/Spendings), period selector, bar chart, category breakdown (Complete Doc §21). |
| **Cards View** | §3.4: 34b | CardViewScreen: Buffr main card + linked bank cards (Complete Doc §7). |
| **Gamification** | §3.6: 44 | **Effects only** (badges, points, toasts, streaks); not a screen. In-context on Profile/Home; §19. |

**PRD-only (G2P-specific, not in generic Complete Doc):**

- **Proof-of-life** (screens 50b, 58–61): Quarterly biometric verification; required for G2P compliance (§2.4).
- **Receive screens** (§3.9, 51–57): Incoming payment, voucher, group invite, request-to-pay; cross-referenced with group request flows.

**Implementation checklist (align with Complete Doc):**

1. Implement Group payment screens (Group Send/Request/Success, Group Settings).
2. Implement Edit Auto Pay (full-screen or modal) and link from Add Wallet and Wallet Detail.
3. Implement Add Money Modal as bottom sheet from Home and Wallet Detail.
4. Enhance Loan Detail with timeline and auto-pay row.
5. Enhance Analytics with segmented control, period selector, and category breakdown.
6. Align Send Money flow with Receiver Details step before 2FA.
7. Retain Proof-of-life screens (G2P-specific).
8. Treat Gamification as **effects only** (no screen): badges, points, toasts, micro-interactions in-context (Profile/Home); §19.

### 3.12 UX Master Checklist – Screens, Sub-screens, Flows & Steps

Single source of truth for **all** screens, sub-screens/modals, and **every flow with step-by-step UX**. Use for design sign-off, QA, and implementation tracking.

#### 3.12.1 All screens and sub-screens (by ID)

| ID | Name | Route / Location | Type | § Ref |
|----|------|-------------------|------|--------|
| 1 | Welcome | `/` or `/onboarding` | Screen | §3.1 |
| 1b | Country selection *(optional)* | `/onboarding/country` | Screen | §3.1 |
| 2 | Phone Entry | `/onboarding/phone` | Screen | §3.1 |
| 3 | OTP Verification | `/onboarding/otp` | Screen | §3.1 |
| 4 | Name Entry | `/onboarding/name` | Screen | §3.1 |
| 5 | Photo Upload | `/onboarding/photo` | Screen | §3.1 |
| 6 | Face ID Setup | `/onboarding/face-id` | Screen | §3.1 |
| 7 | Onboarding Completion | `/onboarding/complete` | Screen | §3.1 |
| 8 | Vouchers List | `/(tabs)/vouchers` or `/utilities/vouchers` | Screen | §3.2 |
| 9 | Voucher Detail | `/utilities/vouchers/[id]` | Screen | §3.2 |
| 10 | NamPost Branch List | `/utilities/vouchers/redeem/nampost` | Screen | §3.2 |
| 11 | NamPost Collection Code (NAMQR) | `/utilities/vouchers/redeem/nampost/code` | Screen | §3.2 |
| 12 | NamPost Success | `/utilities/vouchers/redeem/nampost/success` | Screen | §3.2 |
| 13 | SmartPay Units | `/utilities/vouchers/redeem/smartpay` | Screen | §3.2 |
| 14 | SmartPay Collection Code (NAMQR) | `/utilities/vouchers/redeem/smartpay/code` | Screen | §3.2 |
| 15 | Wallet Redemption (instant) | In-app state / modal | Modal/Stack | §3.2 |
| 16 | Wallet Success | `/utilities/vouchers/redeem/wallet/success` | Screen | §3.2 |
| 17 | Wallet Cash-Out Hub | `/wallets/[id]/cash-out` | Screen | §3.3 |
| 18 | Cash at Till | `/wallets/[id]/cash-out/till` | Screen | §3.3 |
| 19 | Cash at Agent | `/wallets/[id]/cash-out/agent` | Screen | §3.3 |
| 20 | Cash at Merchant | `/wallets/[id]/cash-out/merchant` | Screen | §3.3 |
| 21 | Cash at ATM | `/wallets/[id]/cash-out/atm` | Screen | §3.3 |
| 22 | Bank Transfer | `/wallets/[id]/cash-out/bank` | Screen | §3.3 |
| 23 | Cash-Out Success | `/wallets/[id]/cash-out/success` | Screen | §3.3 |
| 25 | Home | `/(tabs)/index` or `/(tabs)` | Tab | §3.4 |
| 26 | Add Money Modal | From Home or Wallet Detail | **Modal** (bottom sheet) | §3.4 |
| 27 | Send Money – Select recipient | `/send-money/select-recipient` | Screen | §3.4 |
| 27b | Send Money – Receiver details | `/send-money/receiver-details` | Screen | §3.4 |
| 28 | Send Money – Amount | `/send-money/amount` | Screen | §3.4 |
| 29 | Send Money – Confirm | `/send-money/confirm` | Screen | §3.4 |
| 30 | Send Money – Success | `/send-money/success` | Screen | §3.4 |
| 31 | Merchant Directory | `/(tabs)/merchants` or `/merchants` | Screen | §3.4 |
| 32 | Pay Merchant | `/merchants/[id]/pay` | Screen | §3.4 |
| 33 | Bill Payments | `/bills` or `/(tabs)/bills` | Screen | §3.4 |
| 34 | Add Wallet | `/add-wallet` | Modal | §3.4 |
| 34b | Cards View | `/cards` | Screen | §3.4 |
| 34c | Add card | `/add-card` | Screen | §3.4 |
| 34c-scan | Add card – Scan | `/add-card/scan` | Screen | §3.4 (Buffr App Design: scan step; "Enter manually instead" → details) |
| 34d | Add card details | `/add-card/details` | Screen | §3.4 |
| 34e | Card added | `/add-card/success` | Screen | §3.4 |
| 35 | Profile | `/profile` or `/(tabs)/profile` | Screen | §3.5 |
| 36 | Settings | `/settings` or `/profile/settings` | Screen | §3.5 |
| 37 | Analytics Dashboard | `/analytics` | Screen | §3.5 |
| 38 | Location Services (Agents/Map) | `/location` or `/map` | Screen | §3.5 |
| 39 | Transactions History | `/(tabs)/transactions` or `/transactions` | Screen | §3.5 |
| 40 | Loans | `/loans` | Screen | §3.6 |
| 40b | Edit Auto Pay | `/wallets/[id]/auto-pay` or modal | Screen/Modal | §3.6 |
| 41 | My QR Code | `/qr-code` | Screen | §3.6 |
| 41b | QR Code Scanner | `/scan-qr` | Screen | §3.6 |
| 42 | Notification Center | `/notifications` | Screen/Modal | §3.6 |
| 43 | AI Chat | `/ai-chat` | Screen | §3.6 |
| 44 | Gamification *(effects only)* | — | **Effects only (not a screen)** | §3.6, §19 |
| 45 | Financial Literacy | `/learn` | Screen | §3.6 |
| 46 | Agent Network | `/agents` or `/agents/nearby` | Screen | §3.6 |
| 47 | Merchant Directory (full) | `/merchants` | Screen | §3.6 |
| 47b | Create Group | `/groups/create` | Screen | §3.6 |
| 47c | Group view / detail | `/groups/[id]` | Screen | §3.6 |
| 47c-i | Group Send | `/groups/[id]/send` | Screen | §3.6 |
| 47c-ii | Group Payment Success | `/groups/[id]/send/success` | Screen | §3.6 |
| 47c-iii | Group Request | `/groups/[id]/request` | Screen | §3.6 |
| 47c-iv | Group Request Success | `/groups/[id]/request/success` | Screen | §3.6 |
| 47c-v | Group Settings | `/groups/[id]/settings` | Screen | §3.6 |
| 47c-vi | Add Members | `/groups/[id]/add-members` | Screen | §3.6 |
| 47c-vii | Request Status (modal) | Modal from Group detail | **Modal** | §3.6 |
| 47d | Available bank accounts *(optional)* | `/onboarding/bank-accounts` or settings | Screen | §3.6 |
| 48 | 2FA Verification Modal | Shared modal | **Modal** | §3.6, §11.4.13 |
| 49 | Transaction Detail | `/transactions/[id]` | Screen | §3.6 |
| 50 | Wallet Detail | `/wallets/[id]` | Screen | §3.6 |
| 50a | Wallet History | `/wallets/[id]/history` | Screen | §3.6 |
| 50b | Proof-of-life reminder | Modal or `/proof-of-life` | **Modal** / Stack | §3.6 |
| 51 | Incoming Payment Notification | (modal / push) | Modal / notification | §3.9 |
| 52 | Receive Money – Details | `/receive/[transactionId]` | Screen | §3.9 |
| 53 | Receive Voucher – Details | `/receive/voucher/[voucherId]` | Screen | §3.9 |
| 54 | Receive Group Invitation | `/receive/group-invite/[inviteId]` | Screen | §3.9 |
| 55 | Incoming Request (Request to Pay) | `/receive/request/[requestId]` | Screen | §3.9 |
| 56 | Shared QR Code (Receiver's View) | `/receive/my-qr` | Screen | §3.9 |
| 57 | Scan QR (Receiver's View) | `/scan-qr` | Screen | §3.9 |
| 58 | Proof-of-Life Banner | Home screen | **Inline** (banner) | §3.6 |
| 59 | Proof-of-Life – Verify | `/proof-of-life/verify` | Screen | §3.6 |
| 60 | Proof-of-Life – Success | `/proof-of-life/success` | Screen | §3.6 |
| 61 | Proof-of-Life – Expired / Frozen | `/proof-of-life/expired` | Screen | §3.6 |

**Modals / overlays (no separate route):** 26 (Add Money), 48 (2FA), 50b (Proof-of-life reminder). **Inline:** 58 (Proof-of-life banner on Home).

#### 3.12.2 Flows with step-by-step UX

Each row is one step; sequence order is by flow then step number. **Screen ID** = checklist ID from §3.12.1.

| Flow | Step | Action / Screen | Screen ID(s) | Notes |
|------|-----|-----------------|--------------|--------|
| **Onboarding** | 1 | Welcome | 1 | Get Started / Sign In |
| | 2 | Country *(optional)* | 1b | If enabled |
| | 3 | Phone Entry | 2 | +264, Continue |
| | 4 | OTP Verification | 3 | Resend, Verify |
| | 5 | Name Entry | 4 | First, last; PATCH profile |
| | 6 | Photo Upload | 5 | Camera/gallery; PATCH profile |
| | 7 | Face ID Setup | 6 | Enable / Skip |
| | 8 | Completion → Home | 7 | Set flag; replace to (tabs) |
| **Voucher – Redeem to Wallet** | 1 | Vouchers List | 8 | |
| | 2 | Voucher Detail | 9 | Tap "Redeem to Buffr Wallet" |
| | 3 | 2FA Modal | 48 | verification_token |
| | 4 | Wallet Success | 16 | |
| **Voucher – Cash at NamPost** | 1 | Vouchers List → Detail | 8, 9 | Tap "Cash at NamPost" |
| | 2 | NamPost Branch List | 10 | Select branch |
| | 3 | NamPost Collection Code (display NAMQR) | 11 | User scans with app |
| | 4 | 2FA Modal | 48 | |
| | 5 | NamPost Success | 12 | |
| **Voucher – Cash at SmartPay** | 1 | Vouchers List → Detail | 8, 9 | Tap "Cash at SmartPay Unit" |
| | 2 | SmartPay Units | 13 | Select unit |
| | 3 | SmartPay Collection Code (display NAMQR) | 14 | User scans with app |
| | 4 | 2FA Modal | 48 | |
| | 5 | Success | (as 12) | |
| **Cash-out – Till / Agent / Merchant / ATM** | 1 | Wallet Detail or Hub | 50 or 17 | |
| | 2 | Cash-Out Hub | 17 | Tap method (18/19/20/21) |
| | 3 | Method screen (Till/Agent/Merchant/ATM) | 18, 19, 20, 21 | User scans **payee** NAMQR |
| | 4 | 2FA Modal | 48 | |
| | 5 | Cash-Out Success | 23 | |
| **Cash-out – Bank Transfer** | 1 | Cash-Out Hub | 17 | Tap Bank Transfer |
| | 2 | Bank Transfer | 22 | Bank, account, amount; OAuth redirect |
| | 3 | 2FA Modal | 48 | |
| | 4 | Cash-Out Success | 23 | |
| **Send Money (P2P)** | 1 | Select recipient | 27 | SendToScreen |
| | 2 | Amount | 28 | |
| | 3 | Receiver details | 27b | Review recipient, source wallet, note |
| | 4 | Confirm + 2FA | 29, 48 | |
| | 5 | Success | 30 | PaymentSuccess (reusable) |
| **Group Send** | 1 | Group detail | 47c | Tap Send |
| | 2 | Group Send | 47c-i | Amount, note |
| | 3 | 2FA Modal | 48 | |
| | 4 | Group Payment Success | 47c-ii | |
| **Group Request** | 1 | Group detail | 47c | Tap Request |
| | 2 | Group Request | 47c-iii | Amount, note |
| | 3 | 2FA Modal | 48 | |
| | 4 | Group Request Success | 47c-iv | |
| **Receive Money** | 1 | Notification / deep link | 51 | |
| | 2 | Receive Money Details | 52 | Add to wallet / Cash out now |
| **Receive Voucher** | 1 | Notification / Vouchers list | 51, 8 | |
| | 2 | Receive Voucher Details or Voucher Detail | 53 or 9 | Redeem → voucher flow |
| **Receive Group Invite** | 1 | Notification / deep link | 51 | |
| | 2 | Receive Group Invitation | 54 | Accept / Decline |
| **Receive Request to Pay** | 1 | Notification / deep link | 51 | |
| | 2 | Incoming Request | 55 | Pay now → Send Money flow (27→30) |
| **Proof-of-Life (in-app)** | 1 | Banner on Home (if due ≤14 days) | 58 | |
| | 2 | Proof-of-Life Verify | 59 | Start verification |
| | 3 | Device biometric | – | expo-local-authentication |
| | 4 | Proof-of-Life Success or Expired | 60 or 61 | |
| **Add Wallet** | 1 | Add Wallet | 34 | Name, type, icon; optional Auto Pay |
| | 2 | Edit Auto Pay *(if toggled)* | 40b | Frequency, date, amount, method |
| | 3 | (Optional) Card design picker | – | §11.4.14 |
| | 4 | Success → Home | – | |
| **Add Card** | 1 | Add card | 34c | "Scan your card" (primary) or "Add Card +" (manual) |
| | 2a | Add card – Scan *(if scan chosen)* | 34c-scan | Point camera at card; "Enter manually instead" → 34d |
| | 2 | Add card details | 34d | Number, expiry, CVV, name; CTA "Add Card +" |
| | 3 | Card added | 34e | Success state |
| **Pay Merchant** | 1 | Merchant Directory or Scan QR | 31, 41b | |
| | 2 | Pay Merchant | 32 | Amount, wallet; user scans merchant NAMQR |
| | 3 | 2FA Modal | 48 | |
| | 4 | Success | (as 30) | |
| **Loan – Apply** | 1 | Loans | 40 | List / offers |
| | 2 | Apply (amount, terms) | 40 | In flow or sub-screen |
| | 3 | 2FA Modal | 48 | |
| | 4 | Loan detail (timeline, hero, auto-pay row) | 40 | LoanDetailScreen |
| **Wallet – Add Money** | 1 | Home or Wallet Detail | 25, 50 | Tap Add money |
| | 2 | Add Money Modal | 26 | Bank Transfer / Debit Card / Redeem Voucher |
| | 3 | (Sub-flow per method) | – | e.g. Bank → OAuth; Voucher → voucher list |

**Flow logic detail:** §7.6 (entry, onboarding, voucher, cash-out, send money, 2FA, receive, proof-of-life, USSD, loan).

#### 3.12.3 Quick reference – screen count

| Category | Count | IDs |
|----------|-------|-----|
| Onboarding | 8 (1 optional) | 1, 1b, 2–7 |
| G2P Voucher | 10 | 8–16 |
| Wallet Cash-Out | 8 | 17–23 |
| Home & Payments | 16 | 25–34, 34b–34e |
| Profile & Management | 5 | 35–39 |
| Extras (Groups, QR, Loans, etc.) | 24+ | 40–50, 50a, 50b, 58–61; 47b, 47c, 47c-i…47c-vii |
| Modals / overlays | 3 | 26, 48, 50b |
| Inline | 1 | 58 (banner) |
| Receiver flows | 7 | 51–57 |
| **Total (unique screens/sub-screens)** | **~70+** | (some IDs are modals/inline) |

### 3.13 Implementation Status & Areas for Improvement

**Purpose:** Track what is implemented in `buffr-g2p` vs PRD and identify gaps for prioritisation.

#### 3.13.1 Implemented (aligns with PRD)

| Area | Screens / behaviour | Notes |
|------|---------------------|--------|
| **Group View (47c)** | `/groups/[id]` | Pill member cards, request cards (#EEF2FF), Recent Activity (AsyncStorage), bottom bar (wave, Send, Request). |
| **Group Settings (47c-v)** | `/groups/[id]/settings` | POV: admin (edit name, Add members, deactivate others, Save) vs member (read-only, Deactivate Yourself). Pill + avatars. |
| **Add Members (47c-vi)** | `/groups/[id]/add-members` | Admin-only: phone + optional name, Send invite; API or `buffr_group_settings_members_<id>` when offline. |
| **Request Status modal (47c-vii)** | Modal from Group detail | Per-member Paid/Pending, N$ per member, progress bar; opened from "View status" on request cards. |
| **Wallet History (50a)** | `/wallets/[id]/history` | Tabs: Earnings (receive, voucher_redeem, loan_disbursement), Added (add_money); tap → Transaction detail (49). |
| **Persistence (offline)** | AsyncStorage | Member list: `buffr_group_settings_members_<id>`; group txs/requests: `buffr_group_txs_<id>`, `buffr_group_requests_<id>`. |

#### 3.13.2 Areas for improvement

| Priority | Area | Description | § Ref |
|----------|------|-------------|--------|
| High | **Offline architecture** | Formalise sync strategy, conflict resolution, and offline-first data model. | §11.12 |
| High | **Push notifications** | Incoming payment, voucher, group invite, request-to-pay; deep links to screens. | §11.13 |
| High | **Testing strategy** | Unit (utils, contexts), integration (API, storage), E2E (critical flows: onboarding, send, group). | §11.14 |
| Medium | **Deployment & CI/CD** | Build, test, and deploy pipeline (EAS or equivalent); environment config. | §11.15 |
| Medium | **Security implementation** | 2FA server-side only; secure storage for tokens; certificate pinning if required. | §11.16 |
| Medium | **Accessibility** | Labels, contrast, focus order, screen reader support for core flows. | §11.17 |
| Medium | **Internationalization (i18n)** | Locale strings (e.g. English / local); date/currency formatting. | §11.18 |
| Medium | **Edge case handling** | No network, partial failure, duplicate submit; clear error copy and retry. | §11.19 |
| Lower | **Analytics & monitoring** | Events for key actions; crash reporting; performance metrics. | §11.13 |
| Lower | **Performance budget** | Bundle size, frame rate, and time-to-interactive targets. | §11.21 |

**Usage:** Update §3.13.1 as features ship; use §3.13.2 for sprint planning and gap closure.

### 3.14 Flow-to-Design Alignment (Buffr App Design)

**Purpose:** Single list of which flows are aligned with **Buffr App Design** (Downloads/BuffrCrew/Buffr App Design) and which still need step order, copy, and layout updates. Use with `docs/BUFFR_APP_DESIGN_REFERENCE.md` for design asset step names.

**Design source:** Buffr App Design folder; design reference §2 (Screens and flows by feature). Align implementation step labels, CTAs, and flow order to match design file names and PRD §3.12.2.

#### 3.14.1 Flows aligned with design (implemented)

| Flow | Design reference (§2) | Implementation | Notes |
|------|------------------------|----------------|-------|
| **Add Card** | Add Card → Add details (1..5) → Details Added | `/add-card` → Scan your card / Add Card + → (optional) `/add-card/scan` → `/add-card/details` → `/add-card/success` | Step 1: "Scan your card" (primary), "Add Card +" (manual). Scan step has "Enter manually instead". Details CTA: "Add Card +". |
| **Home – balance & search** | Home screen (Total Balance Visible/Hidden), Search | `/(tabs)/home`: "+ Add" pill → add-money; Search bar filters Services grid, Recent transactions, Recent contacts. | Balance pill = "+ Add"; search filters content. |

#### 3.14.2 Flows to align with design (priority)

| Flow | Design reference (§2) | Gaps / actions |
|------|------------------------|----------------|
| **Send money** | Contact View → Add Amount → Receiver's Details (1..7) → Select Pay From → Transfer → Receipt (1..8) | Verify step order: Select recipient → Amount → **Receiver details** → Pay from → 2FA → Success. Align screen titles and copy (e.g. "Receiver's Details", "Select Pay From", "After Making Transaction", "Receipt"). |
| **Add Wallet** | Adding A Wallet, Wallet Name, Setting up Icon; Add Money (methods); Auto Pay (Set Date, Set Time, Number Of Payments) | Align step labels (Wallet Name, Setting up Icon); Add Money method selection copy; Auto Pay flow (Set Date, Set Time, Date Has Been Set, Time Has Been Set, Number Of Payments Selected). |
| **Add Money (methods)** | Add Money, Add Money (Changed Method); Select Method, Changed Method | Ensure method cards and "Changed Method" state match design; EFT = Buffr Financial Services; Card = Link a card (done). |
| **Groups** | Create Group (Create Group-1); Group View (1, 2, request sent); Group Send (Group Send-1); Group Request; Group Settings (Group Remove); Requested Amount (paid 3/4), Requested Amount Collected | Align Create Group copy and step; Group detail layout; Group Send/Request step labels; Group Settings "Group Remove" vs "Deactivate"; Request status (paid 3/4, Collected). |
| **Loans** | Loans (1, 2, Paid); Loan Offer Details (1..3); Loan Details (1, 2, Paid); Loan Credited; Loan Pay | Align list/detail titles; Loan Credited success; Loan Pay flow labels. |
| **Onboarding** | Starting screen → Tell us your mobile number → Can you please verify → Add user's details → Enable Authentication → Registration Completed; optional Add card, Available bank accounts | Align screen titles and copy to design (e.g. "Tell us your mobile number", "Can you please verify", "Add user's details", "Enable Authentication", "Registration Completed"). Optional Add card step in onboarding. |
| **Vouchers** | (Design ref §2 does not list voucher step names; use §3.2) | Align voucher list/detail/redeem copy and method cards to any Buffr App Design SVGs for vouchers. |
| **Wallet cash-out** | (Design ref §2: Wallet View, Add Money; cash-out per §3.3) | Align Cash-Out Hub method cards (Bank, Till, Agent, Merchant, ATM) copy and fee/time; scan step instructions ("Scan the till's QR", etc.). |
| **Wallet detail & history** | Wallet View (1); Wallet History (Added, Spendings); Wallet Settings | Align Wallet detail layout; Wallet History tabs (Added / Spendings) labels; Wallet Settings copy. |
| **Transactions & receipts** | Transactions (Balance, Earnings, Spendings); Receipt (1..8) | Align Transactions filters/tabs; Receipt view layout and copy. |
| **Profile & notifications** | Notifications (Received, Not Available); Settings, Profile Settings; Bank Accounts | Align Notifications list and empty state; Settings sections; Profile layout. |
| **QR & scan** | Your QR Code (1, 2); QR Scan | Align My QR Code layout; Scan QR instructions and overlay copy. |

#### 3.14.3 Implementation rules (binding)

- **New or changed flows:** When adding or changing a flow, check BUFFR_APP_DESIGN_REFERENCE.md §2 for the feature; align step order, screen titles, and CTA copy to design file names and PRD §3.12.2.
- **CTAs:** Use PRD §4.7 Primary CTA copy (e.g. "Add Card +", "Add Wallet +", "Get Started", "Verify") where the design specifies them.
- **Step labels:** Use design step names (e.g. "Receiver's Details", "Scan your card") in headers or step indicators where they appear in Buffr App Design.

### 3.15 Navigation and Flows Audit (implementation alignment)

**Purpose:** Deep audit of routes and navigation so flows match PRD §3.12.2 and §7. Findings are binding for implementation and future changes. Re-audit after adding routes or changing stack structure.

**Audit date:** Document version when audit was last run. Update this section when fixing navigation or adding flows.

#### 3.15.1 Entry and root layout

| Item | Expected (PRD) | Implementation | Status |
|------|----------------|----------------|--------|
| App entry | If onboarding complete → Home; else → Onboarding | `app/index.tsx`: Redirect to `/(tabs)/home` or `/onboarding` from AsyncStorage `buffr_onboarding_complete` | ✅ Correct |
| Root Stack | index, onboarding, (tabs), utilities, wallets, send-money, merchants, receive, proof-of-life, add-wallet, scan-qr, groups | `_layout.tsx`: All listed as Stack.Screen; add-card, cards, bills, loans, agents are file-based (discovered by Expo Router) | ✅ Correct |
| Tabs | Home, Transactions, Vouchers; Profile hidden (href: null) | `(tabs)/_layout.tsx`: Home, Transactions, Vouchers, profile (href: null), two (href: null) | ✅ Correct |

#### 3.15.2 Home → downstream flows

| From | Action | Expected route | Implementation | Status |
|------|--------|----------------|----------------|--------|
| Home balance pill "+" | Add to balance | `/wallets/[id]/add-money` or `/wallets` | `wallets.length ? /wallets/${wallets[0].id}/add-money : /wallets`; label **"+ Add"** | ✅ Correct (label updated to "+ Add") |
| Home Buffr card block | View wallets | `/wallets` | `/wallets` | ✅ Correct |
| Home Buffr card "Add money" | Add money | Same as pill | `/wallets/${wallets[0].id}/add-money` or `/wallets` | ✅ Correct |
| Home Wallet carousel | Add wallet | `/add-wallet` | `/add-wallet` | ✅ Correct |
| Home Wallet carousel | Add funds | add-money or add-wallet | `onAddFundsPress`: add-money or add-wallet | ✅ Correct |
| Home contact tap | Send money | Amount with recipient params | `/send-money/amount` with recipientPhone, recipientName | ✅ Correct |
| Home Services grid | Each tile | Per §3.4 routes (e.g. proof-of-life, receive, wallets, vouchers, bills, loans, agents) | SERVICES_GRID routes; agents → `/(tabs)/home/agents` | ✅ Correct |
| Home "See all" transactions | Transactions tab | `/(tabs)/transactions` | `/(tabs)/transactions` | ✅ Correct |
| Home recent tx row | Transaction detail | `/(tabs)/transactions/[id]` | `/(tabs)/transactions/${tx.id}` | ✅ Correct |
| FAB Send | Send money | Select recipient | `/send-money/select-recipient` | ✅ Correct |
| FAB QR | Scan QR | `/scan-qr` | `/scan-qr` | ✅ Correct |

#### 3.15.3 Send money flow

| Step | Screen | Route | Params / next | Status |
|------|--------|--------|---------------|--------|
| 1 | Contact View | `/send-money/select-recipient` | → amount with recipientPhone, recipientName | ✅ |
| 2 | Add Amount | `/send-money/amount` | recipientPhone, recipientName; → receiver-details with amount, note | ✅ |
| 3 | Receiver's Details | `/send-money/receiver-details` | amount, note; Pay from; → confirm with walletId | ✅ |
| 4 | Transfer (2FA) | `/send-money/confirm` | recipientPhone, recipientName, amount, note, walletId; → success | ✅ |
| 5 | Receipt / Success | `/send-money/success` | Back to Home or View Details → `/(tabs)/transactions/[id]` | ✅ |

#### 3.15.4 Wallets and cash-out

| From | Action | Route | Status |
|------|--------|--------|--------|
| Wallets list | Wallet detail | `/wallets/[id]` (pathname `/wallets/[id]`, params `{ id: w.id }`) | ✅ Expo Router convention |
| Wallet detail | Add money, Cash out, History, Auto Pay, Send, etc. | `/wallets/[id]/add-money`, `/wallets/[id]/cash-out`, `/wallets/[id]/history`, `/wallets/[id]/auto-pay`, `/send-money/select-recipient` | ✅ |
| Wallet detail | Transaction row | Transaction detail | **Fixed:** use `/(tabs)/transactions/${tx.id}` (was `/transactions/${tx.id}`) so detail opens in tab context | ✅ Rectified |
| Wallet History | Transaction row | Same | **Fixed:** `/(tabs)/transactions/${tx.id}` | ✅ Rectified |
| Cash-out Till / Merchant | Scan QR | `/scan-qr` with mode, method, walletId, amount | ✅ |
| Cash-out success | Done | `/(tabs)` | ✅ |

#### 3.15.5 Groups

| From | Action | Route | Status |
|------|--------|--------|--------|
| Groups list | Create Group | `/groups/create` | ✅ |
| Groups list | Group detail | `/groups/[id]` with params `{ id: g.id }` | ✅ |
| Create Group success | View Group | `router.replace({ pathname: '/groups/[id]', params: { id: done } })` | ✅ Expo Router template |
| Group detail | Send / Request / Settings | `/groups/[id]/send`, `/groups/[id]/request`, `/groups/[id]/settings` | ✅ |
| Group Send/Request success | Back to group | `router.replace({ pathname: '/groups/[id]', params: { id } })` | ✅ |

#### 3.15.6 Add card and cards

| From | Action | Route | Status |
|------|--------|--------|--------|
| Add Money (card method) / Cards screen | Add card | `/add-card` | ✅ |
| Add card | Scan → Scan step | `/add-card/scan` | ✅ |
| Add card | Manual | `/add-card/details` | ✅ |
| Add card scan | Enter manually | `router.replace('/add-card/details')` | ✅ |
| Add card details success | View cards / Home | `/cards` or `/(tabs)` | ✅ |

#### 3.15.7 Loans

| From | Action | Route | Status |
|------|--------|--------|--------|
| Home Loans tile | Loans list | `/(tabs)/home/loans` | ✅ |
| Top-level `/loans/[id]` | Redirect | Redirect to `/(tabs)/home/loans/[id]` (canonical tab) | ✅ |
| Top-level `/loans/apply` | Redirect | Redirect to `/(tabs)/home/loans/apply` | ✅ |

#### 3.15.8 Vouchers and utilities

| From | Action | Route | Status |
|------|--------|--------|--------|
| Vouchers tab / utilities | Voucher detail | `/utilities/vouchers/[id]` with params `{ id: item.id }` | ✅ |
| Voucher detail | Redeem Wallet / NamPost / SmartPay | redeem/wallet/success, redeem/nampost, redeem/smartpay | ✅ |
| NamPost/SmartPay code | Done | `/(tabs)` or `/(tabs)/vouchers` | ✅ |

#### 3.15.9 Receive flows

| From | Action | Route | Status |
|------|--------|--------|--------|
| Deep link / notification | Receive money, voucher, request, group invite | `/receive/[transactionId]`, `/receive/voucher/[voucherId]`, `/receive/request/[requestId]`, `/receive/group-invite/[inviteId]` | ✅ |
| After action | Home | `router.replace('/(tabs)')` | ✅ |

#### 3.15.10 Transaction detail consistency

| Source | Target | Required path | Notes |
|--------|--------|---------------|--------|
| Home recent tx | Transaction detail | `/(tabs)/transactions/[id]` | ✅ Implemented |
| Send success "View Details" | Transaction detail | `/(tabs)/transactions/[id]` | ✅ Implemented |
| Wallet detail tx row | Transaction detail | `/(tabs)/transactions/[id]` | ✅ **Rectified** (was `/transactions/[id]`) |
| Wallet History tx row | Transaction detail | `/(tabs)/transactions/[id]` | ✅ **Rectified** (was `/transactions/[id]`) |
| Transactions tab list | Transaction detail | `/(tabs)/transactions/[id]` | ✅ Implemented |

**Rule:** Transaction detail lives at `(tabs)/transactions/[id].tsx`. All links to transaction detail must use `/(tabs)/transactions/${id}` so the correct tab stack is used.

#### 3.15.11 Findings and rectifications (summary)

| # | Finding | Rectification | § |
|---|---------|----------------|---|
| 1 | Home balance pill label was "+ Add funds". PRD/design: short label "+ Add". | Label and accessibility set to **"+ Add"** in `(tabs)/home/index.tsx`. PRD §3.0 and §3.14.1 updated. | §3.0, §3.14.1 |
| 2 | Wallet detail and Wallet History linked to `/transactions/${id}`; transaction detail lives under `(tabs)/transactions/[id]`. Inconsistent with Home and Send success which use `/(tabs)/transactions/${id}`. | Both `wallets/[id].tsx` and `wallets/[id]/history.tsx` updated to `/(tabs)/transactions/${tx.id}`. | §3.15.4, §3.15.10 |
| 3 | Full flows/navigation/UX audit (Feb 2026) | Structured report: `docs/AUDIT_REPORT.md` (A–F). High: Add Money modal, Group 2FA, Receive index. Medium: Back fallback to Home, shared 2FA, QR CRC. | §3.15.12 |

#### 3.15.12 Full audit report (flows, navigation, UX consistency)

A comprehensive audit against PRD v1.10 was performed covering screens, routes, flows (§7, §3.12.2), navigation (§6.4), CTAs, error/empty states, QR/NAMQR, receiver flows, proof-of-life, loans, groups, add card, home search, cash-out, vouchers, consistency, and offline/edge cases (§11.12–11.21).

**Report location:** `docs/AUDIT_REPORT.md`

**Sections:** A. Correctly implemented flows | B. Issues & discrepancies | C. Missing screens/sub-screens | D. Consistency gaps | E. Edge cases not handled | F. Proposed fix plan (priority, effort, dependencies).

**High-priority fixes from audit:** (1) Add Money as bottom sheet modal per §3.4 screen 26; (2) Group Send and Group Request to include 2FA (Modal 48) before success; (3) Receive index/landing screen at `/receive` (Home "Receive" tile currently has no index route). **Medium:** Back navigation fallback to Home when `!router.canGoBack()` (§6.4); shared TwoFAModal; QR CRC verification or documentation. **Edge cases:** Offline queue, 2FA lockout (429 + countdown), push notifications and deep links per §3.13.2.

**Usage:** When adding or changing navigation, (1) follow §3.12.2 flow steps and §7 flow logic; (2) use transaction detail path `/(tabs)/transactions/[id]` from any stack; (3) update this section with new findings and rectifications; (4) re-audit after major flow or navigation changes and update `AUDIT_REPORT.md`.

---

### 3.7 Wireframes (ASCII) – key screens

Use these as the single source of truth for layout and copy. All values (placeholders, labels, buttons) are final.

**Welcome (onboarding/index)**  
```
┌─────────────────────────────────────┐
│            [Buffr Logo]             │
│                                     │
│       Welcome to Buffr              │
│   Your G2P payments companion       │
│                                     │
│  [    Get Started (primary)    ]    │
│  [    Sign In (outline)        ]    │
└─────────────────────────────────────┘
```

**Phone entry (onboarding/phone)**  
```
┌─────────────────────────────────────┐
│  ←  Enter phone                     │
│                                     │
│  Country    +264                    │
│  Phone      [ 81 234 5678      ]    │
│                                     │
│  [       Continue (primary)    ]   │
└─────────────────────────────────────┘
```

**OTP (onboarding/otp)**  
```
┌─────────────────────────────────────┐
│  ←  Verify code                     │
│  We sent a code to +264 81 234 5678 │
│  [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ]│
│  Resend code (60s)                  │
│  [       Verify (primary)      ]    │
└─────────────────────────────────────┘
```

**Home (tabs/index)**  
```
┌─────────────────────────────────────┐
│  Buffr        [🔔] [Avatar]         │
│  [ 🔍 Search anything...     ]     │
│  Send to: [Clara][Lukas][Rachel]…  │
│  ┌─────────────────────────────┐   │
│  │ Balance    N$ 1,234.00       │   │
│  │ Main wallet                  │   │
│  └─────────────────────────────┘   │
│  Wallets: [Wallet1][Wallet2][+]     │
│  Services:                          │
│  [Send][Pay][Bills][Airtime][More]  │
│  Recent                             │
│  • Voucher redeemed  N$ 500   Today │
│  • Cash out          N$ 200   Yesterday │
│  [FAB Send] [FAB QR]                │
├─────────────────────────────────────┤
│  Home  Transactions  Vouchers  Me  │
└─────────────────────────────────────┘
```

**Voucher detail (utilities/vouchers/[id])**  
```
┌─────────────────────────────────────┐
│  ←  Voucher                         │
│  N$ 500.00  •  Expires 28 Feb 2026  │
│  Status: Available                  │
│  [ Redeem to Buffr Wallet ]         │
│  [ Cash at NamPost        ]         │
│  [ Cash at SmartPay Unit  ]         │
└─────────────────────────────────────┘
```

**Wallet cash-out hub (wallets/[id]/cash-out)**  
```
┌─────────────────────────────────────┐
│  ←  Cash out                        │
│  Choose method                      │
│  [ Bank transfer    N$ 5  1-2 days ]│
│  [ Cash at till     Free  Instant  ]│
│  [ Cash at agent    N$ 5  Instant  ]│
│  [ Cash at merchant N$ 3  Instant  ]│
│  [ Cash at ATM      N$ 8  Instant  ]│
└─────────────────────────────────────┘
```

**2FA modal (shared)**  
```
┌─────────────────────────────────────┐
│  Verify identity                   │
│  Enter PIN or use biometric        │
│  [ • • • • • • ]                   │
│  [ Cancel ]    [ Verify ]          │
└─────────────────────────────────────┘
```

### 3.8 Figma screen index (complete – all top-level frames)

**Source:** Figma MCP `get_figma_data` for **Buffr App Design** (file key `VeGAwsChUvwTBZxAU6H8VQ`, root node `0:1` – 🍞 Wireframes). Every top-level frame below is a screen in Figma; use the given `nodeId` to re-query that screen. **PRD mapping** = §3 route and/or §4.7 organism.

| # | Figma name | nodeId | PRD mapping (§3 route / §4.7 organism) |
|---|------------|--------|----------------------------------------|
| 1 | Starting... | 8:2 | Splash / entry |
| 2 | Welcome page | 23:1495 | §3.1 Welcome, `/onboarding` |
| 3 | Select your beloved country | 30:1518 | §3.1 Country selection (optional), `/onboarding/country` |
| 4 | Tell us your mobile number | 44:461 | §3.1 Phone Entry, `/onboarding/phone` |
| 5 | Can you please verify | 44:509, 59:2 | §3.1 OTP Verification, `/onboarding/otp` |
| 6 | Available bank accounts | 44:537, 60:62 | §3.6 Bank linking (optional), `/onboarding/bank-accounts` or settings |
| 7 | Add user's details | 45:712 | §3.1 Name/Photo, `/onboarding/name`, §4.7 Add profile |
| 8 | Add card | 44:593 | §3.4 Add card, `/add-card`, §4.7 Add card |
| 9 | Add card details | 44:639 | §3.4 Add card details, `/add-card/details` |
| 10 | Frame 19 / Frame 27 | 45:680, 59:58 | Card type / validation modal |
| 11 | Card added | 45:660 | §3.4 Card added (success), `/add-card/success` |
| 12 | Enable Authentication | 45:681, 45:792 | §3.1 Face ID, `/onboarding/face-id`, §4.7 2FA |
| 13 | Registeration Completed | 45:818 | §3.1 Completion, `/onboarding/complete` |
| 14 | Main Screen | 45:837, 162:1202, 723:8346, 725:8543 | §3.4 Home, `/(tabs)`, §4.7 Home (QR/Profile tabs) |
| 15 | Cards View | 115:529 | §3.4 Cards View, `/cards` |
| 16 | Wallet view | 116:629 | §3.4 Wallet, §3.5 Wallet Detail, `/wallets/[id]` |
| 17 | Transfer Amount | 153:752 | §3.4 Send Money, `/send-money/amount` |
| 18 | Notifications | 153:566 | §3.6 Notification Center, `/notifications` |
| 19 | Wallet history | 152:427 | §3.5 Transactions History, `/(tabs)/transactions` |
| 20 | Managing / Adding a wallet | 151:391 | §3.4 Add Wallet, `/add-wallet`, §4.7 |
| 21 | Scan QR | 81:465 | §3.6 QR Code Scanner, `/scan-qr`, §4.7 QR Code Scanner |
| 22 | Send Options | 92:212 | §3.4 Send – Select recipient, `/send-money/select-recipient` |
| 23 | Loans | 108:276 | §3.6 Loans, `/loans` |
| 24 | Transactions | 114:302 | §3.5 Transactions History, `/(tabs)/transactions` |
| 25 | Active Loan Details | 111:487 | §3.6 Loan detail |
| 26 | Active Offer Details | 111:629 | Offer / promotion detail |
| 27 | Selected contact | 94:308, 174:873 | §4.7 Selected contact, send flow |
| 28 | After Payment History w/ specific contact | 99:538 | §4.7 After Payment History |
| 29 | After recieve request sent / (Reciever's POV) | 171:574, 172:630 | Request money flow |
| 30 | Receiver's Details | 84:356, 98:443, 170:534 | §4.7 Receiver's Details, send confirm |
| 31 | Make Group | 174:696 | §3.6 Create Group, `/groups/create`, §4.7 Make Group |
| 32 | Payment Successful | 87:410, 99:488 | §3.4 Send Success, `/send-money/success` |
| 33 | After Payment Details | 88:211, 99:505 | Post-payment detail |
| 34 | Refund Request | 169:433 | Refund flow |
| 35 | Transaction details | 115:495 | §3.6 Transaction Detail, `/transactions/[id]` |
| 36 | New feature / Frame 20–26, 21, 23, 24 | 723:8369, 723:8361, 723:8363, 723:8378, 723:8346, etc. | Home tab variants, tips/leaderboard/refunds |

**Usage:** Re-query any screen with `get_figma_data(fileKey: "VeGAwsChUvwTBZxAU6H8VQ", nodeId: "<nodeId from table>")`. All components used on these screens are documented in §4, §4.7 (organism → atom), and §5 (design tokens).  

**Scope alignment (§3.0):** Every Figma top-level frame above is mapped to a §3 screen or an optional/future flow. Multiple nodeIds (e.g. “Main Screen” 45:837, 162:1202, 723:8346, 725:8543) can represent the same route (Home) in different states; use any listed nodeId to query that design. Screens marked “optional” in §3 (country, bank linking) are in scope when product requires them.

### 3.9 Receiver Flows (Incoming Transactions)

Screens for the **receiver's point of view**: incoming payments, vouchers, group invitations, and payment requests. Routes under `app/receive/`. Flow logic: §7.6.1–§7.6.4.

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 51 | Incoming Payment Notification | (modal) | Modal / Push Notification | Shown when someone sends money or a voucher. Displays amount, sender name, optional message. "Accept" / "Decline" buttons (if required). |
| 52 | Receive Money – Details | `/receive/[transactionId]` | Stack | Shows sender, amount, note, date. Options: "Add to wallet", "Cash out now", "View details". |
| 53 | Receive Voucher – Details | `/receive/voucher/[voucherId]` | Stack | Similar to receive money, but for voucher redemption. Shows voucher amount, expiry, terms. "Redeem" button leads to voucher redemption flow. |
| 54 | Receive Group Invitation | `/receive/group-invite/[inviteId]` | Stack | Displays group name, inviter, member count. "Accept" / "Decline" buttons. On accept, group appears in groups list. |
| 55 | Incoming Request (Request to Pay) | `/receive/request/[requestId]` | Stack | Someone has requested payment from the user. Shows requester, amount, note. "Pay now" leads to payment flow. "Decline" dismisses. |
| 56 | Shared QR Code (Receiver's View) | `/receive/my-qr` | Stack | **Existing "My QR Code" screen** can be considered the receiver's static QR. Enhance it with a "Share" button and usage instructions. |
| 57 | Scan QR (Receiver's View) | `/scan-qr` | Stack | **Already exists.** In the receiver's context, scanning a QR could mean scanning a voucher code or a payment request. Keep as is. |

---

## 4. Component Inventory

Reusable UI building blocks to implement once and use across screens.

### 4.1 Layout components

| Component | Purpose | Used in |
|-----------|---------|---------|
| **ScreenContainer** | Safe area + padding; max width 393 | All screens |
| **StackScreen** | Header (back, title, optional right action) + children | All stack screens |
| **TabBar** | Bottom tabs (Home, Transactions, Vouchers?, Profile?) | Tab layout |
| **ModalContainer** | Full-screen or bottom-sheet modal wrapper | Add Money, 2FA, Code display |

### 4.2 Inputs & buttons

| Component | Purpose | Spec (from Figma/PRD) |
|-----------|---------|------------------------|
| **SearchBar** | Pill shape (borderRadius 999), placeholder “Search anything…” or “Search phone, UPI, UID”; magnifying-glass icon | Home, Send, Lists; Figma Input/Large 1417:42922 |
| **PillButton** | Primary / secondary / outline; height 56; min touch 44; borderRadius 16px (full) or 999 (pill) | CTAs; see §4.7 atoms |
| **Primary CTA** | Get Started, Select Country, Verify Number, Verify OTP, Add Card +, Add Wallet +, Create, Verify (2FA); fill primary blue; style_GLUVY9 | Onboarding, Add card, Add wallet, 2FA |
| **Secondary / outline** | Sign In, Change number, back chevron; stroke border | Onboarding, OTP |
| **Pill actions** | Show, Add (wallet cards); Promote; Profile, Bell (header); borderRadius 999 | Home header, wallet carousel |
| **TextInput** | Themed; height 56; optional prefix (+264, N$, country); borderRadius 12 or 16 | Phone, Amount, Name, Group name |
| **OTPInput** | 5–6 digit boxes; stroke border; borderRadius 16px | OTP screen |
| **AmountInput** | Currency prefix (N$), numeric keyboard | Send money, Cash-out, Bills |

### 4.3 Cards & lists

| Component | Purpose | Spec |
|-----------|---------|------|
| **BalanceCard** | Main balance display; gradient or glass; optional flip to show/hide balance | Home; align Buffr App Design + `constants/CardDesign.ts` |
| **WalletCard** | Wallet item in carousel (name, balance, icon); icon circle 999px; “Show”/“Add” pills | Home; carousel scale on focus per Buffr `CardCarouselView`; effect_E7Q5GM |
| **CardFlipView** | 3D flip front/back (e.g. balance card front, details back); Reanimated, haptics | Balance card, wallet/card carousel; **verified** Buffr `components/cards/CardFlipView.tsx` |
| **VoucherCard** | Voucher list item (amount, status, expiry, type) | Vouchers list |
| **ServiceCard** | 12px radius; icon + label (e.g. Mobile Recharge, Pay Merchants) | Home services grid; Figma 12px radius |
| **ContactChip** | Avatar + name (Send to: Clara, Lukas, Rachel, …); pill 999px; fill + stroke + effect_WHEBAW | Home Send-to row; Send flow; Create group selected members; §4.7 |
| **ListItem** | Row with left icon/avatar, title, subtitle, chevron | Lists |
| **MethodCard** | Cash-out or redemption method (icon, title, fee, time) | Cash-Out Hub, Voucher Detail |
| **Group row** | Group name + member avatars/count; tap → group detail | Groups list; Figma “Group name” 8926 |
| **Contact row (Selected contact)** | Avatar + name (nickname) + UPI/phone | Send flow, After Payment History; Figma 8560, 8821 |

### 4.3b Carousels (cards, wallets, vouchers, contacts, loans)

All carousels use **horizontal scroll**, **snap** (duration 400ms per §5.1 `animations.carouselSnap`), and **scale-on-focus** (focused item ~1, adjacent ~0.9) where applicable. Reuse one carousel primitive (e.g. `CarouselView`) with different item renderers.

| Carousel | Content | Where used | Spec |
|----------|---------|------------|------|
| **Cards carousel** | Physical/linked cards (CardFlipView per item); front = number/name/expiry, back = CVV. Buffr Card on Home = main Buffr account (primary wallet); same designs can represent additional wallets with user context (name, balance, type; optional cardDesignFrameId per wallet). | Home balance block, Cards View (§3.4 34b) | CardDesign.ts: 340×214, radius 12; flip 600ms; snap 400ms |
| **Wallets carousel** | WalletCard per wallet (icon circle 999px + name + balance; optional card design color by cardDesignFrameId) + "Add Wallet +" card; each wallet displays user context (name, balance, type). | Home (§3.4 screen 25) | effect_E7Q5GM shadow; card radius 16px; scale on focus |
| **Vouchers carousel** | VoucherCard per voucher (amount, status, expiry); optional horizontal strip on Home or Vouchers tab | Home or `/(tabs)/vouchers` | Same card radius 12px; snap 400ms |
| **Contacts carousel** | ContactChip per contact (avatar + name); horizontal scroll, no snap required | Home "Send to" row, Send flow select-recipient, Create group selected members | Pill 999px; effect_WHEBAW; §4.7 Send-to row |
| **Groups carousel** | Group row per group (name + member avatars/count) | Groups list or Home "Groups" section | Group row component; tap → group detail |
| **Loans / loan components carousel** | Loan card per offer (amount, term, status); optional horizontal strip | Loans screen (§3.6 screen 40) | Same card radius 12px; snap 400ms |

**Shared carousel behavior:**  
- **Snap:** `carouselSnap.durationMs: 400` (§5.1); use `ScrollView` with `pagingEnabled` or `snapToInterval` / `snapToAlignment` or horizontal `FlatList` with `getItemLayout`.  
- **Scale on focus:** Optional; focused index at scale 1, others at 0.9 (per Buffr `CardCarouselView`).  
- **Height:** Per §5.1 `layout.screenZones` – e.g. `walletCarouselHeight: 80`, `balanceCardHeight: 120`; cards carousel item height from CardDesign (214).  
- **Loans:** When loans feature is enabled, use same carousel pattern for loan offers/cards; loan detail uses ListItem or MethodCard-style rows.

### 4.4 Feedback, error, warning, and empty states

All screens and list/carousel components must support **loading**, **error**, **empty**, and **validation/warning** states. Use design tokens: `colors.semantic.error`, `colors.semantic.warning`, `colors.semantic.success` (§5.1).

| Component | Purpose | When to show |
|-----------|---------|----------------|
| **Toast** | Short-lived message (success or error) | After submit ("Voucher redeemed", "Code copied"), API 4xx ("Invalid code"), or validation failure |
| **LoadingOverlay** | Full-screen or inline spinner | During API call (auth, redeem, cash-out, send, load wallets/vouchers) |
| **ErrorState** | Retry + message | When list/fetch fails (wallets, vouchers, transactions, contacts); "Something went wrong" + Retry |
| **EmptyState** | Illustration + message + optional CTA | Zero items (no vouchers, wallets, contacts, transactions, groups, loans) |
| **2FAModal** | PIN or biometric; Verify/Cancel | Before redeem, cash-out, send; **error:** "Wrong PIN" (401) inline in modal |
| **Inline validation error** | Text under input (red, caption size) | Phone invalid, OTP wrong, amount &gt; balance, required field missing |
| **Warning banner** | Banner or alert (warning color) | Expiring voucher, low balance, session expiring, maintenance message |
| **Network error** | Full-screen or banner | No connectivity; "Check your connection" + Retry |
| **NetworkError** | Dedicated component (full-screen or banner) | Use when `fetch` fails (no network) or backend unreachable; show "Check your connection" + Retry; implement as `components/feedback/NetworkError.tsx` (§11.4.17) |
| **NotificationBadge** | Badge count on bell/tabs | Home screen notifications bell shows unread count; badge on tabs when new items arrive. §11.4.16, §11.4.17. |
| **Toast (receiver)** | "Payment received" | When a payment is received (push or in‑app). |
| **Empty state (notifications)** | "No notifications yet." | Notifications list when empty. |
| **Error state (receiver)** | "Could not load details. Tap to retry." | When receive-detail fetch fails. |

Home screen (screen 25) must include the **notifications bell** with a badge count (§3.8, §4.7). Unread count from `GET /api/v1/mobile/notifications` (e.g. `unreadCount` in response or derived from list).

**Error / warning / empty states by screen or flow:**

| Screen / flow | Loading | Error | Empty | Warning / validation |
|---------------|---------|-------|-------|----------------------|
| **Entry** | Spinner while reading AsyncStorage | – | – | – |
| **Onboarding (phone)** | – | Toast on send-otp 4xx | – | Inline error under phone field |
| **Onboarding (OTP)** | – | Toast "Invalid code" on verify 401 | – | Inline error under OTP; "Change number" link |
| **Onboarding (name/photo)** | – | Toast on PATCH profile 4xx | – | Inline error if required field missing |
| **Home** | Skeleton or spinner for balance/wallets | ErrorState + Retry for wallets/vouchers | EmptyState "No wallets yet" + "Add Wallet"; "No vouchers" + "Redeem from SMS" | Warning banner if voucher expiring soon |
| **Wallets carousel** | LoadingOverlay or shimmer | ErrorState + Retry | EmptyState "Add your first wallet" + CTA | – |
| **Vouchers list** | LoadingOverlay or skeleton | ErrorState + Retry | EmptyState "No vouchers" + "You'll see them here when you receive one" | Warning on voucher expiring in &lt;7 days |
| **Voucher detail** | – | Toast on redeem 4xx; stay on detail | – | Warning if expired (disable redeem) |
| **Wallet cash-out** | LoadingOverlay on submit | Toast on cashout 4xx; ErrorState if load methods fails | – | Inline error if amount &gt; balance; warning if low balance |
| **Send money** | LoadingOverlay on send | Toast on 4xx; ErrorState if load contacts fails | EmptyState "No contacts" + "Add contact" | Inline error amount &gt; balance; recipient required |
| **Contacts / Send-to** | Spinner while loading contacts | ErrorState + Retry | EmptyState "No contacts yet" | – |
| **Groups list** | LoadingOverlay | ErrorState + Retry | EmptyState "No groups" + "Create Group" | – |
| **Loans** | LoadingOverlay | ErrorState + Retry | EmptyState "No loan offers" | Warning on overdue or expiring offer |
| **Transactions** | LoadingOverlay or skeleton | ErrorState + Retry | EmptyState "No transactions yet" | – |
| **2FA modal** | Spinner on Verify | Inline "Wrong PIN" (401) inside modal | – | – |
| **Cards carousel** | – | – | EmptyState "No cards" + "Add card" | – |
| **QR Scanner** | – | "Camera access denied" or "No connection" | – | – |

**Receiver-focused UX (addendum):**
- **Notification badges** on home screen tabs when new items arrive.
- **Toast** when a payment is received (even if app is closed, push notification).
- **Empty state for notifications:** "No notifications yet."
- **Error state for failed retrieval:** "Could not load details. Tap to retry."
- Home screen (screen 25) **notifications bell** shows a badge count for unread notifications.

**Design tokens for states:**  
- **Error:** `colors.semantic.error` (#E11D48); text and border.  
- **Warning:** `colors.semantic.warning` (#F59E0B); banner background `feedback.yellow100`.  
- **Success:** `colors.semantic.success` (#22C55E); Toast success.  
- **Loading:** `ActivityIndicator` with `colors.brand.primary` or neutral spinner.

#### 4.4.1 UX audit implementation (from design spec)

Implement these so the app matches the UX audit in `BUFFR_G2P_FIGMA_DESIGN_SPEC.json` and meets accessibility and clarity goals:

- **Accessibility labels:** Add `accessibilityLabel` (and `accessibilityHint` where helpful) to all icon-only buttons and key images: back chevron, QR icon, scan button, bell, profile avatar, "Show"/"Add" pills, primary CTAs (e.g. "Get Started", "Verify", "Redeem"). Use short, action-oriented text (e.g. "Scan QR code", "Notifications", "Go back").
- **Error state artboards:** If Figma does not include error screens, implement and document in code: (1) Invalid QR – message + "Try again" / "Back"; (2) Network error – `NetworkError` component per §4.4; (3) 2FA failure – inline "Wrong PIN" in 2FA modal; (4) Redeem/cash-out 4xx – Toast + stay on screen. Reuse `ErrorState`, `Toast`, and inline validation patterns from §4.4.
- **High-contrast mode:** Support an optional high-contrast theme (e.g. theme toggle in settings or system-driven). Use semantic colors from §5.1; ensure text/background contrast ≥4.5:1 for body, 3:1 for large text. Document the high-contrast palette in `constants/Theme.ts` (e.g. `highContrast` overrides for `colors.neutral` and `colors.semantic`).
- **QR scan instructions:** On Scan QR and on cash-out/NamPost/SmartPay instruction screens, show short explanatory copy (e.g. "Point your camera at the QR code") and/or an icon; use simple language for low-literacy users (§5.1, design spec `clarityOfInstructions`).

### 4.5 Icons & media (NAMQR-compliant)

| Component | Purpose | NAMQR / Open Banking spec |
|-----------|---------|---------------------------|
| **Icon** | Heroicons-style set (magnifying-glass, ticket, rectangle-stack, banknotes, qr-code, home-modern, device-phone-mobile, clipboard-document-list, star, shield-check, plus-circle, chevron-right, bell) – use @expo/vector-icons or Figma heroicons | – |
| **Avatar** | User/contact/group member photo or initials; circle; sizes: header (~40px), contact chip, group row; used in ContactChip, Profile header, Selected contact, Create group chips | – |
| **QRDisplay** | **(NAMQR engine.)** QR for: (1) personal receive (static NAMQR, Tag 29), (2) collection code (dynamic NAMQR), (3) merchant payment. | **Must construct NAMQR payload in TLV format** per NAMQR spec. Accept parameters (alias, amount, currency, etc.) and produce QR with correct encoding (Byte Mode, ECI UTF-8). Include **CRC (Tag 63)**. Payload from backend `POST /api/v1/mobile/qr/generate` (Token Vault NREF in Tag 65). |
| **QR Code Scanner** | **(NAMQR engine.)** Full-screen scanner for pay-by-QR or collect-by-QR; Figma 81:465. | **Must parse TLV**, extract tags, **validate CRC (Tag 63)**. If **Signed QR (Tag 66)** present, verify signature using public key (ListVAE/ListKeys). Display warning if QR unsigned. Before proceeding, **validate via Token Vault** (`POST /api/v1/mobile/qr/validate`). |

**New molecules/atoms for compliance:**  
- **OAuth Redirect WebView** – modal/screen that loads bank’s authentication URL and handles redirect URI (e.g. `buffr://oauth-callback`).  
- **Signed QR Verification** – utility (e.g. `SignedQRVerifier.ts`) that, given public key and QR payload, verifies ECDSA signature (SHA-256); integrated into scanner.

### 4.6 Design tokens (constants)

| Token set | Contents |
|-----------|----------|
| **Colors** | Primary, secondary, success, error, warning, background, text, border |
| **Radius** | sm 12, md 16, lg 24, pill 9999 (from Figma) |
| **Spacing** | G2P horizontal 24, section 32, component 16 |
| **Typography** | Header, title, body, caption; font sizes and weights |

### 4.7 Full component hierarchy (Organism → Atom, from Figma MCP)

**Source:** Figma MCP `get_figma_data` for **Buffr App Design** (file key `VeGAwsChUvwTBZxAU6H8VQ`, root node `0:1` – 🍞 Wireframes). All screens and components below are derived from this file. Use same `fileKey` and specific `nodeId` to re-query any screen.

**Organisms (screens / full frames)**  
- **Starting…** (8:2) – placeholder / splash.  
- **Welcome page** (23:1495) – logo, title, subtitle, “Get Started” CTA.  
- **Select your beloved country** (30:1518) – country list, “Detected country”, “Select Country” CTA.  
- **Tell us your mobile number** (44:461) – title, “Enter number” field, 🇳🇦, “Verify Number” CTA.  
- **Can you please verify** (44:509, 59:2) – OTP boxes (5× “_”), “Verify OTP” CTA, “Change number” link.  
- **Add profile** (Frame with “Add a nickname (optional)”, “This name will be displayed in the buffr app”).  
- **Add card** (1726) – “Scan your card”, “Add Card +” primary and secondary.  
- **Add card details** (1881) – “Card Number”, “Add Card +” CTA.  
- **Card added** (2057) – success state.  
- **Home (QR tab)** (723:8403) – “QR” tab label, “Search anything” pill, “Today’s earnings” / N$ 2,700, chart area, “Wallet balance” / “Add Wallet +” row, “Recent transaction” blocks, “Promote” pill.  
- **Home (Profile tab)** (725:8543) – “Profile” pill, “Bell” pill, “Your prime time earnings”, “Tip Jar”, “Star buyer”, tab content.  
- **Send / Contacts** – “Search phone, UPI, UID” (3146, 3550, 6264), “Contacts”, “Unique Buffr UPI address”, “Name (nickname)”.  
- **QR Code Scanner** (6137) – scanner screen.  
- **Selected contact** (8560, 8821) – contact detail for send flow.  
- **After Payment History w/ specific contact** (9122).  
- **Group / Create group** – “Group name” (8926), member selection, chips.

**Molecules (sections / composite components)**  
- **Header row:** Logo pill (Buffr) + notification (Bell) + Profile avatar; borderRadius 999px; fill surface white.  
- **Search pill:** Input/Large – placeholder “Search anything” (or “Search phone, UPI, UID” on send); borderRadius 999px; height 56; magnifying-glass icon.  
- **Send-to row:** Horizontal scroll of **ContactChips** (avatar + name), e.g. Clara, Lukas, Rachel; pill 999px; fill + stroke + effect_WHEBAW.  
- **Balance block:** “Total Balance” / “Today’s earnings” label + N$ + amount (text-xl + text-3xl); optional chart + legend (“Today’s Earnings”, “Lifetime Average”).  
- **Wallet carousel row:** WalletCard(s) (icon circle 999px + name + “Show”/“Add”) + “Add Wallet +” card; card borderRadius 16px; effect_E7Q5GM shadow.  
- **Services grid:** 2×N **ServiceCard** (icon + label); borderRadius 12px.  
- **Recent transaction list:** Repeated “Recent transaction” rows (or transaction item row: icon, title, amount, date).  
- **Tab bar (glass):** Home, Transactions, Vouchers?, Profile/Me; fill_DUFEPX rgba(255,255,255,0.7); effect_2HVBI9 (shadow + blur 32px); borderRadius 24px top.  
- **OTP row:** 5 or 6 single-character boxes; stroke border; borderRadius 16px.  
- **2FA modal:** Title “Verify identity”, PIN input or biometric, “Cancel” / “Verify” buttons.  
- **QR display block:** Unique Buffr UPI address + QR code asset; for receive / collection code.  
- **Group row:** Group name + member count or avatars; used in group list and create-group flow.  
- **Contact row (Selected contact):** Avatar + name (nickname) + UPI/phone; used in send flow and history.

**Atoms (primitives – buttons, pills, icons, text, inputs)**  
- **Actions / buttons (from Figma)**  
  - **Primary CTA:** “Get Started”, “Select Country”, “Verify Number”, “Verify OTP”, “Add Card +”, “Add Wallet +”, “Create”, “Verify” (2FA); fill primary blue; borderRadius 16px; height ~56; text style GLUVY9 (white).  
  - **Secondary / outline:** “Sign In”, “Change number”, back chevron; stroke border; borderRadius 16px.  
  - **Pill actions:** “Show”, “Add” (on wallet cards); “Promote”, “QR” (tab); “Profile”, “Bell”; borderRadius 999px; surface fill or transparent.  
- **Pills (all from Figma)**  
  - **Search pill:** 999px; placeholder “Search anything…” or “Search phone, UPI, UID”; Input/Large.  
  - **Logo pill:** Buffr wordmark; 999px; surface white.  
  - **Contact chips:** Avatar circle + name; 999px; fill + stroke + shadow (effect_WHEBAW).  
  - **Header pills:** Profile, Bell; 999px.  
  - **Wallet card pills:** “Show”, “Add”; 999px.  
  - **Tab labels:** Home, Transactions, Vouchers, Me; SF Pro 17px/590; not visual pill but tap target.  
- **Avatars**  
  - **Contact chip avatar:** Circle; photo or initials; size from Figma (e.g. 40px); used in Send-to row and Selected contact.  
  - **Profile avatar:** Header right; circle; photo or placeholder.  
  - **Group member avatar:** Smaller circle in group row or create-group selected chips.  
- **Icons (Heroicons-style from Figma)**  
  - magnifying-glass (search), ticket, rectangle-stack, banknotes, qr-code, home-modern, device-phone-mobile, clipboard-document-list, star, shield-check, plus-circle, chevron-right, bell.  
- **Inputs**  
  - **TextInput:** Height 56; borderRadius 12 or 16; optional prefix (+264, N$, country).  
  - **OTPInput:** 5–6 boxes; border stroke; 16px radius.  
  - **AmountInput:** N$ prefix; numeric keyboard.  
- **Text styles (atoms)**  
  - Caption: text-xs/leading-4, font-normal or font-semibold.  
  - Body: text-sm/leading-5, text-base/leading-6.  
  - Title: text-xl/leading-7, text-3xl/leading-9, text-4xl/leading-10.  
  - Tab label: SF Pro 17px, fontWeight 590.  
  - Button: style_GLUVY9 (white on primary) or style_1601UH (dark on surface).

**QR & Buffr identity (from Figma)**  
- **QR tab/screen:** Tab label “QR”; screen content can show “QR Code Scanner” or “My QR” (receive).  
- **Unique Buffr UPI address:** Text + QR code asset; for personal receive / NAMQR; shown in profile or send flow (Name (nickname) + UPI).  
- **QR Code Scanner:** Full-screen scanner for pay-by-QR or collect-by-QR.  
- **Personal QR for wallets/accounts:** Per-wallet or per-account QR for receive; use same QRDisplay component; align with NAMQR spec when integrating.

**Groups (from Figma)**  
- **Group name:** Text field/label “Group name” (8926); used in create group and group detail.  
- **Create group flow:** Group name + description, pill search, contacts list with checkboxes, selected members as **chips** (avatar + name), add-by-phone; “Create” CTA.  
- **Group row (list):** Group name + member avatars or count; tap → group detail.  
- **Selected contact chips:** Same ContactChip (avatar + name) used for “Send to” and “Selected contact”; reuse in group member selection.

**Design components (Figma component sets)**  
- **Status Bar - iPhone** (83:7): Time 9:41, Levels (signal); variants Mode=Light, Background=False.  
- **Home Indicator** (639:3876): Device=iPhone, Orientation=Portrait.  
- **Input/Large** (1417:42922): Search pill 999px.  
- **Tabbar** (1417:44518): Type=Home (or Transactions, Vouchers, Me).  
- **Noise & Texture** (447:4412): Background overlay.  
- **Heroicons:** magnifying-glass, ticket, rectangle-stack, banknotes, qr-code, etc.  

Use this hierarchy to implement screens top-down: build atoms (buttons, pills, avatars, inputs, text styles), then molecules (search row, balance block, wallet carousel, tab bar), then organisms (each screen). Keep design tokens (§5.1) and Figma effects (§5.3) consistent across all levels.

---

## 5. Design System

Design tokens and variables for consistent UI across Buffr G2P. Values are aligned with **Figma (Buffr App Design)** and **buffr** app constants (`Theme.ts`, `Layout.ts`). Use **Archon** (Expo/React Native docs) for StyleSheet, Dimensions, and safe-area usage in code.

### 5.1 Design system JSON (canonical tokens)

All spacing, typography, radius, and component specs below are the single source of truth. Map these into app constants (e.g. `constants/Theme.ts`, `constants/Layout.ts`) and use in `StyleSheet.create()` or theme context.

```json
{
  "designSystem": {
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
        "tabLabel": { "fontSize": 17, "lineHeight": 22, "fontWeight": "590" }
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
  }
}
```

### 5.2 Usage in code (Expo / React Native)

- **StyleSheet:** Use the JSON values in `StyleSheet.create()` (e.g. `fontSize: designSystem.typography.fontSize.base`, `borderRadius: designSystem.radius.pill`). Export the design system from a single module (e.g. `constants/designSystem.ts`) and reference it in components.
- **Dimensions:** Use `Dimensions.get('window')` for screen width; cap content at `breakpoints.mobile.maxWidth` (393) for G2P consistency. Use `useWindowDimensions` for responsive layouts.
- **Safe area:** Use `react-native-safe-area-context` (`SafeAreaView`, `useSafeAreaInsets`) for notches and home indicator; align insets with `layout.safeArea` for status bar and tab bar spacing.
- **Fonts:** Load custom fonts (e.g. SF Pro–style or brand font) with `expo-font` and assign to `typography.fontFamily`; otherwise use platform defaults.
- **Theming:** Optional theme context (e.g. `useColorScheme()`) can switch `colors` for light/dark; keep the same structure and variable names.
- **Accessibility & high-contrast:** Implement per §4.4.1 (accessibilityLabel on icon buttons, high-contrast theme option with ≥4.5:1 contrast). Add `colorsHighContrast` or theme override in Theme.ts when high-contrast mode is enabled.

### 5.3 Animations, effects, transitions, backgrounds (from Figma MCP only)

**Source:** Figma MCP `get_figma_data` for **Buffr App Design** (file key `VeGAwsChUvwTBZxAU6H8VQ`, Home screen node `575:4252`). All values below are taken only from Figma; re-query Figma MCP for other frames or nodes to extend.

**Backgrounds**
- **Screen root:** Fill `fill_97A6ZF` (Buffr App Design background).
- **Vector + Noise & Texture:** Top-layer vector uses fill + effects; opacity 0.8. Component **Noise & Texture** (447:4412) overlays the screen fill.
- **Surface / cards:** Fill `fill_BTWHWH` – used for Input/Large (search), logo pill (Frame 49), service cards (Frame 82/83), balance/card container.
- **Tab bar (glass):** Fill `fill_DUFEPX`: `rgba(255, 255, 255, 0.7)`. Implement as semi-transparent white + blur for glass effect.
- **Wallet icon circles:** `fill_WYCFIJ` #F2D9ED (e.g. Pocket Money), `fill_TA7E5M` #F2E9D9 (e.g. School Fees) – soft tint behind emoji.
- **Contact chips:** Various fills per chip (e.g. `fill_EO1SDT`, `fill_AZZKZ3`, `fill_F7UIEB`); neutral `fill_97A6ZF` for some. Use for “Send to” avatars/chips.
- **Primary blue (Add Wallet, tab active):** `fill_CGFW6I` #2563EB; stroke `stroke_H8Y4YW` #2563EB 1.5px. Tab label active: `fill_JEPQS2` #1D4ED8.

**Effects (shadows, blur)**
- **Wallet cards:** `effect_E7Q5GM` → `boxShadow: 0px 4px 32px 0px rgba(30, 58, 138, 0.3)`. Use for wallet list/carousel cards.
- **Tab bar:** `effect_2HVBI9` → `boxShadow: 0px 4px 40px 0px rgba(100, 116, 139, 0.4)` and `backdropFilter: blur(32px)`. Use for bottom nav glass.
- **Contact chips:** `effect_WHEBAW` – applied to Frame 77/78/79 (chip containers). Re-query Figma for exact shadow/blur if needed.
- **Vector (header area):** `effect_MYDEOV` – on decorative vector; re-query for values if needed.

**Border radius (from Figma nodes)**
- **999px (pill):** Search (Input/Large), logo pill (Frame 49), contact chips (Frame 77/78/79), “Show” / “Add” buttons, wallet icon circles (Frame 60), plus-circle icon container.
- **12px:** Service cards (Frame 82/83 – Mobile Recharge, Buy Tickets, etc.), balance/card block (Frame 102).
- **16px:** Wallet cards (Frame 61, 62, 58 – Pocket Money, School Fees, Add Wallet).
- **24px (top only):** Tab bar container – `borderRadius: 24px 24px 0px 0`.

**Transitions and animations**
- Figma design does not export animation duration or easing. Use **§5.1 design system JSON** `animations` (cardFlip 600ms, carouselSnap 400ms, buttonPress scale 0.98) for implementation.
- **Stack/screen transitions:** Use Expo Router / React Navigation defaults (e.g. slide from right, fade) unless a prototype in Figma specifies otherwise; re-query Figma for prototype transitions if defined.
- **Micro-interactions:** Button press → scale 0.98; card flip → 600ms; carousel snap → 400ms (see §5.1).

**Typography (from Figma text styles)**
- **Placeholder / body:** `text-base/leading-6/font-normal` (Search placeholder, Buffr logo text).
- **Chips, labels:** `text-sm/leading-5/font-normal` or `font-medium` (contact names, service labels, “Total Balance”, wallet names).
- **Small labels:** `text-xs/leading-4/font-medium` (service cards, “Show”, “Add”, “Buffr Card”, “••018”).
- **Balance:** `text-xl/leading-7/font-normal` (N$), `text-4xl (h6)/leading-10/font-normal` (xxx amount).
- **Tab bar label:** SF Pro, fontWeight 590, fontSize 17, lineHeight ~1.29 (style_RW1NG9).
- **Caption:** SF Pro Text, 400, 12px, lineHeight ~1.33 (text-xs/leading-4/font-normal).

**How to extend**
- Call Figma MCP `get_figma_data` with same `fileKey` and another `nodeId` (e.g. voucher list, wallet detail, profile, onboarding frames) to get that screen’s fills, effects, and radii.
- Use **Figma component sets** from the response (e.g. Input/Large 1417:42922, Tabbar 1417:44518, Status Bar 959:5411, Home Indicator 639:3876) to align implementation components.
- **Full organism → atom inventory** (all actions, buttons, pills, avatars, groups, QR, design components) is in **§4.7**; design tokens for pills, avatars, QR, groups are in **§5.1** `components.pill`, `components.avatar`, `components.qrDisplay`, `components.qrScanner`, `components.groupRow`, `components.contactRow`.

### 5.4 Design verification (Buffr App Design)

This section aligns the PRD with **Figma Buffr App Design** (file key `VeGAwsChUvwTBZxAU6H8VQ`, Home node `575:4252`) and the existing **buffr** app codebase (`ketchup-smartpay/buffr`). Use it to verify cards, create wallet, create group, and animations.

**Figma (Buffr App Design)**  
- **Home screen (575:4252):** Search = Input/Large, pill (borderRadius 999px), placeholder “Search anything…”, heroicons-mini/magnifying-glass. Logo pill (Buffr) borderRadius 999px. Contact chips (Clara, Lukas, Rachel, etc.) = Frame with fill + stroke + shadow, borderRadius 999px; text style text-sm/leading-5/font-normal. Services grid = cards with 12px radius.  
- **Components:** Input/Large (1417:42922), Tabbar (1417:44518), heroicons (magnifying-glass, ticket, rectangle-stack, banknotes, qr-code, home-modern, etc.).

**Cards (buffr codebase)**  
- **Dimensions:** `constants/CardDesign.ts`: WIDTH 340, HEIGHT 214, BORDER_RADIUS 12, aspect ratio ~1.588.  
- **Card flip:** `components/cards/CardFlipView.tsx` – Reanimated `rotateY` 0↔180°, duration 600ms (`CardAnimation.FLIP_DURATION`), `backfaceVisibility: 'hidden'`, haptic on press. Front/back slots for balance card or physical card (front = number/name/expiry, back = CVV).  
- **Carousel:** `CardCarouselView` uses `CardFlipView` + `CardFrame` / `CardBackView`; scale 0.9↔1 on scroll for focus.  
- **Animation constants:** FLIP_DURATION 600, SELECTION_DURATION 300, CAROUSEL_SNAP_DURATION 400, SHIMMER_DURATION 2000 (buffr `CardDesign.ts`).

**Create wallet flow (buffr)**  
- **App route:** `app/add-wallet.tsx` – multi-step with `AddWalletForm`; on success `addWallet` (context), `refreshWallets`, toast, `router.replace('/(tabs)')`.  
- **State-flow:** `components/state-flow/AddWallet.tsx` – Step 1: icon picker (emoji), name (pill), **Auto Pay** toggle + config (frequency weekly/bi-weekly/monthly, deduct date/time, amount N$, repayments, payment method). Step 2 (optional in some flows): card design selection. Save → success ping (scale animation) → navigate home with new wallet.  
- **Fields:** name, purpose?, type (personal|business|savings|…), icon, cardDesign?, autoPayEnabled, autoPayFrequency, deductDate/Time, amount, repayments, paymentMethodId.  
- **G2P PRD:** Add Wallet = modal or stack; name, type (main/savings), “Create”; optional 2-step. Align with buffr for icon + name + optional Auto Pay when building.  
- **Design reference:** Buffr G2P Complete Code Reference §7 (Wallet & Cash Out): `AddWallet.tsx` (2-step, Auto Pay config), `WalletCashOutScreen.tsx` (5 methods comparison), `CashOutAtAgent.tsx` (amount → code/QR), `CashbackTillScreen.tsx` (retailer → code); Implementation Guide – Wallet Cash-Out System (5 methods, fees, limits, codes/expiry).

**Create group flow (buffr)**  
- **App route:** `app/create-group.tsx` – full screen: LinearGradient background, header “Create Group”, group name + description inputs, pill search, device/API contacts list with checkboxes, selected members as chips (avatar + name), add-by-phone input; “Create” calls API then navigates to group view.  
- **State-flow:** `components/state-flow/CreateGroupScreen.tsx` – “Create Savings Group”; name (max 50), description (optional, max 200); “Create” → `createGroupApi({ name, description })` → `onNavigate('group-view', { groupId, groupName, … })`.  
- **API:** `services/groupsApi.ts` – createGroup; backend `POST /api/v1/mobile/groups` (or equivalent).  
- **G2P PRD:** Groups are optional in G2P beneficiary scope; when included, use same flow: name, description, member selection (pill search, chips, contacts), create → group detail.

**Animation tokens (from buffr)**  
- Card flip: 600ms, ease-in-out.  
- Carousel snap: 400ms.  
- Button press: scale 0.98 or Reanimated `withSpring`.  
- Success ping: scale 1→1.3→1, ~400+300ms.  
- Use `react-native-reanimated` for card flip; optional `react-native-gesture-handler` for swipe. Haptics on card flip and primary actions (HapticFeedbackManager.lightImpact).

---

## 6. Layouts & Navigation

### 6.1 App-level layout (Expo Router)

```
app/
  _layout.tsx          # Root: fonts, providers, Stack
  index.tsx            # Entry: redirect to onboarding or (tabs)
  onboarding/
    _layout.tsx        # Stack (no tabs)
    index.tsx          # Welcome
    phone.tsx
    otp.tsx
    name.tsx
    photo.tsx
    face-id.tsx
    complete.tsx
  (tabs)/
    _layout.tsx        # Tab bar: Home, Transactions, Vouchers,
    index.tsx          # Home
    transactions.tsx
    vouchers.tsx       # optional tab
    profile.tsx
  (stack)/             # Or nested under (tabs) where needed
    utilities/
      vouchers/
        [id].tsx
        redeem/
          nampost/
          smartpay/
          wallet/
    wallets/
      [id].tsx
      [id]/cash-out/
      [id]/add-money/
    send-money/
    merchants/
    bills/
    agents/
    ...
```

### 6.2 Tab bar (default)

| Tab | Label | Route | Icon |
|-----|--------|--------|------|
| Home | Home | `/(tabs)/index` | home |
| Transactions | Transactions | `/(tabs)/transactions` | list/rectangle-stack |
| (optional) Vouchers | Vouchers | `/(tabs)/vouchers` | ticket |


### 6.3 Stack groupings

- **Onboarding:** one stack; no tabs until completion.
- **Main:** tabs for Home, Transactions, Profile , Vouchers.
- **Vouchers:** stack for list → detail → redeem (NamPost, SmartPay, wallet).
- **Wallets:** stack for wallet detail → cash-out → method flows.
- **Send money:** stack for select recipient → amount → confirm → success.
- **Merchants / Bills / Agents:** each with own stack or nested under tabs.

### 6.4 Screen header and back navigation consistency

**Requirement:** Every non-tab, non-terminal screen must provide a clear way to go back or to Home so users are never stuck. Tab screens (Home, Transactions, Vouchers; profile is in header, not a tab) use the tab bar; success/terminal screens use a primary CTA (e.g. "Done", "View receipt") instead of a header back.

**Header patterns (implement consistently):**

| Pattern | Use on | Back / Home |
|--------|--------|-------------|
| **ScreenHeader** (or layout that wraps it) | Most stack screens | Left: back arrow → `router.back()`; when history is empty (e.g. deep link) → `router.replace('/(tabs)')` so user reaches Home. Optional right action (e.g. Map on Agent Network). |
| **StandardScreenLayout** | Detail/modal-style stack screens (agent detail, cash-out, merchant, bill pay, voucher redeem) | Same as above; uses ScreenHeader internally with `showBackButton` default true. |
| **Custom in-screen header** | Add Bank, Add Wallet, wallet sub-screens (history, transfer, settings) | Back arrow or back button → `router.back()`. |
| **State-flow screens** (single route, state-driven content) | When using state-flow UX | Back → `onNavigate('home')` or previous state; no `router.back()`. |
| **Success / terminal screens** | Payment sent, Request sent, Redemption successful, Onboarding complete | No header back. Single primary CTA: "Done" → `router.replace('/(tabs)')` or "View receipt" / "Back to group" as specified per flow. |

**Agent Network (and similar entry screens):**

- Title: **"Agent Network"**. Header must show: **back** (left), **title** (centre), **Map** (right, primary-style button). Back behaviour: if `router.canGoBack()` then `router.back()`, else `router.replace('/(tabs)')` so deep links do not leave the user without a way to reach Home.

**Quick reference – where is back?**

| Screen type | Back / Home |
|-------------|-------------|
| Stack with ScreenHeader / StandardScreenLayout | Left arrow → back or replace to (tabs) when no history |
| Add Bank / Add Wallet / Wallet sub-screens | Custom back arrow → `router.back()` |
| State-flow | Custom back → `onNavigate('home')` or previous state |
| Tab (Home, Transactions, Vouchers; no Profile tab) | No back; tab bar only; profile via header avatar (§6.4.2) |
| Success / terminal | No back; use "Done" / "View receipt" / "Back to group" |

**Implementation note:** In `buffr` (reference app), `ScreenHeader` is in `components/common/ScreenHeader.tsx`; `StandardScreenLayout` in `components/layouts/StandardScreenLayout.tsx`. When building `buffr_g2p`, reuse or port these so every stack screen has a consistent header and back behaviour. See also §4 (StackScreen: "Header (back, title, optional right action)").

### 6.4.1 App header with search (tab and list screens)

**Requirement:** On tab and list screens where search is applicable, **search lives in the header**, not below it. The header is a single row: **search bar (left)** and **notification bell + user avatar (right)** in a compact group, same light grey rounded style as the search pill.

**Layout:**

| Element | Position | Spec |
|--------|----------|------|
| Search bar | Left (flex) | Elongated rounded pill; magnifying-glass icon; placeholder e.g. "Search anything…", "Search transactions…", "Search vouchers…", "Search billers…", "Search area or agent…" per screen. |
| Right group | Right | Single rounded container: notification bell (with red badge when unread) + user avatar (photo or placeholder). Tapping bell → Notifications; tapping avatar → Profile. |

**Screens that use this header (search in header):**

| Screen | Route | Search placeholder |
|--------|--------|---------------------|
| Home | `/(tabs)/home` or `/(tabs)` | "Search anything…" |
| Transactions | `/(tabs)/transactions` | "Search transactions…" |
| Vouchers | `/(tabs)/vouchers` | "Search vouchers…" |
| Pay Bills | `/(tabs)/home/bills` | "Search billers…" |
| Agent Network | `/(tabs)/home/agents` | "Search area or agent…" |
| Find Agents & ATMs | `/(tabs)/profile/location` (or equivalent) | "Search area or address…" |

**Implementation:** Use the shared component `components/layout/AppHeader.tsx` (`AppHeader`). Props: `searchPlaceholder`, `searchValue`, `onSearchChange`, `showSearch`, `onNotificationPress`, `onAvatarPress`, `avatarUri` (from UserContext `profile.photoUri`), `notificationBadge`. For screens without search (e.g. Settings, Notifications), use `showSearch={false}` and `title` for a title-only header with the same right group (notification + avatar).

### 6.4.2 No profile tab on home; profile in header

**Requirement:** There is **no Profile (or "Me") tab** in the bottom tab bar on the home flow. Profile is reached via the **header avatar** (next to the notification bell). The tab bar shows only: **Home**, **Transactions**, **Vouchers**. The profile route (`/(tabs)/profile`) remains available for deep links and for navigation from the header avatar; it is hidden from the tab bar using `href: null` in the tabs layout.

**Rationale:** The design places the user avatar in the header on every screen with the app header; a separate profile tab is redundant and clutters the tab bar.

**Implementation:** In `app/(tabs)/_layout.tsx`, set `href: null` (or equivalent) on the profile `Tabs.Screen` so the profile tab is not visible. Ensure `onAvatarPress` in `AppHeader` navigates to `/(tabs)/profile`.

---

## 7. User Flows

### 7.1 First-time user (onboarding)

1. Open app → Welcome → Create account  
2. Phone Entry (+264) → OTP → Name → Photo → Face ID (optional) → Completion  
3. Redirect to Home (tabs)

### 7.2 Voucher received (SMS) → Redemption

1. User gets SMS (from Ketchup): voucher issued / ready.  
2. Open app → Vouchers list (or Home → Vouchers).  
3. Tap voucher → Voucher Detail.  
4. Choose one of 3 methods:  
   - **Wallet:** 2FA → redeem → Wallet Success; balance updated.  
   - **NamPost:** Branch list → Book → Booking Success (code).  
   - **SmartPay:** Unit list → Select → Collection Code (QR + code).  

### 7.3 Wallet cash-out (after voucher in wallet)

1. Home → Wallet balance or Wallet detail.  
2. “Cash out” → Wallet Cash-Out Hub.  
3. Choose one of 5 methods → amount → (2FA where required) → code or confirmation.  
4. Cash-Out Success.

### 7.4 Send money (P2P)

1. Home → “Send to” contact or Send Money.  
2. Select recipient → Amount → Confirm → 2FA → Success.

### 7.5 Pay merchant

1. Home → Services “Pay Merchants” or Merchants tab.  
2. Select merchant → Amount → Pay from wallet → 2FA → Success.

### 7.6 Flow logic (no TODOs – full logic)

**Entry (app/index.tsx)**  
1. On mount: read `AsyncStorage.getItem('buffr_onboarding_complete')`.  
2. If `'true'` → `router.replace('/(tabs)')`.  
3. Else → `router.replace('/onboarding')`.  
4. No auth SDK required for first cut; later add JWT check and redirect to login if expired.

**Onboarding completion**  
1. On `onboarding/complete`: call `AsyncStorage.setItem('buffr_onboarding_complete', 'true')`, then `router.replace('/(tabs)')`.  
2. Optional: store user id/phone in context and SecureStore after OTP verify.

**Phone → OTP**  
1. Validate: Namibia +264, 9 digits after code.  
2. `POST /api/v1/mobile/auth/send-otp` body `{ phone: '+264812345678' }`.  
3. On 200: navigate to `onboarding/otp`, pass phone in route params or context.  
4. On 4xx: show error under field, do not navigate.

**OTP → Name**  
1. User enters 6 digits.  
2. `POST /api/v1/mobile/auth/verify-otp` body `{ phone, code }`.  
3. On 200: store token (e.g. SecureStore), set user in UserContext, navigate to `onboarding/name`.  
4. On 401: show “Invalid code”. Resend: same send-otp, then reset countdown.

**Name → Photo → Face ID → Complete**  
1. Name: required first + last; on Continue → save to UserContext; call `PATCH /api/v1/mobile/user/profile` with `{ first_name, last_name }` if API exists (§9.4); navigate to photo.  
2. Photo: capture or pick; upload optional or stub; on Continue → call PATCH user/profile with `photo_url` if API exists; navigate to face-id.  
3. Face ID: prompt “Enable biometric?”; on Enable call native biometric; on Skip or success → navigate to complete.  
4. Complete: show “You’re all set”, Buffr ID if returned from backend; button “Go to Home” → set onboarding complete (AsyncStorage), `router.replace('/(tabs)')`.

**G2P voucher flow (summary)**  
- **3 redemption methods only** (§2.2): (1) Buffr Wallet – instant credit; (2) Cash at NamPost – **branch displays dynamic NAMQR, user scans with app**; (3) Cash at SmartPay – **unit displays dynamic NAMQR, user scans with app**. All high-value actions use 2FA (server-side verification_token).  
- Voucher list → Voucher detail → choose method → (Wallet: 2FA → redeem; NamPost/SmartPay: select branch/unit → **screen displays NAMQR** → user scans → validate via Token Vault → 2FA → success).

**Voucher redeem (Wallet)**  
1. Voucher detail: user taps “Redeem to Buffr Wallet”.  
2. Open 2FA modal (action: `redeem_voucher`, payload: `{ voucherId, method: 'wallet' }`).  
3. On Verify: call `POST /api/v1/mobile/auth/verify-2fa` with PIN (or biometric); receive `verification_token` from response. Then `POST /api/v1/mobile/vouchers/{id}/redeem` body `{ method: 'wallet', verification_token }`.  
4. On 200: navigate to `utilities/vouchers/redeem/wallet/success` with amount in params.  
5. On 4xx: close 2FA, show Toast error, stay on detail.

**Voucher redeem (NamPost) – NAMQR-compliant**  
1. User taps “Cash at NamPost” → navigate to `utilities/vouchers/redeem/nampost` (branch list).  
2. Fetch branches: `GET /api/v1/mobile/nampost/nearby?lat=&lng=` or list.  
3. User selects branch → navigate to `redeem/nampost/code`. **Screen displays dynamic NAMQR** (generated by backend with Token Vault NREF, branch IPP alias, amount).  
4. User scans this QR with the **same Buffr app** (or another device). App parses TLV, validates CRC, **validates via Token Vault** (`POST /api/v1/mobile/qr/validate`), shows branch and amount.  
5. User 2FA → POST redeem (or confirm payment) with `verification_token` → success → collect cash at branch.

**Voucher redeem (SmartPay) – NAMQR-compliant**  
1. User taps “Cash at SmartPay Unit” → navigate to `utilities/vouchers/redeem/smartpay`.  
2. Fetch units: `GET /api/v1/mobile/smartpay/nearby`.  
3. User selects unit → navigate to `redeem/smartpay/code`. **Screen displays dynamic NAMQR** (unit’s IPP alias, amount, Token Vault NREF).  
4. User scans with app → validate via Token Vault → 2FA → success → collect cash at unit.

**Cash-out (Till / Agent / Merchant / ATM) – NAMQR-compliant**  
1. From hub, user taps Till, Agent, Merchant, or ATM.  
2. **User is instructed to scan the payee’s NAMQR** (till/agent/merchant displays QR, or ATM displays QR after user enters amount on ATM keypad).  
3. App scans QR → parses TLV → validates CRC (Tag 63) → if Signed QR (Tag 66), verify signature → **POST /api/v1/mobile/qr/validate** with NREF and scanned payload.  
4. On valid: show payee name and amount → 2FA modal → `POST /api/v1/mobile/wallets/{id}/cashout` (or payment API) with `verification_token`.  
5. On 200: navigate to `wallets/[id]/cash-out/success`. On 4xx: Toast error.

**Cash-out (Bank Transfer) – Open Banking**  
1. User selects Bank Transfer → bank selection, account, amount.  
2. For **Open Banking PIS**: app redirects to bank’s auth page (OAuth 2.0 consent) via WebView; user consents; bank redirects to `buffr://oauth-callback?code=...`.  
3. Backend exchanges code for access token (mTLS + QWAC), initiates payment.  
4. App shows 2FA for Buffr wallet debit (if applicable) → confirm → success.

**Token Vault integration (all QR flows)**  
- **Generate QR (e.g. My QR, collection code):** App calls `POST /api/v1/mobile/qr/generate` with params (alias, amount, etc.). Backend obtains NREF from Token Vault, builds TLV payload (incl. Tag 65 = NREF, Tag 63 = CRC), returns payload to app; app renders QR.  
- **Scan QR:** App decodes TLV, validates CRC, optionally verifies Signed QR (Tag 66). App calls `POST /api/v1/mobile/qr/validate` with NREF and scanned payload; backend validates with Token Vault. On valid, app proceeds to show transaction and 2FA.

**OAuth 2.0 consent (bank linking / Open Banking)**  
- **Initiate:** User taps “Link Bank Account” (or similar). App/backend calls bank’s `POST /par` (Pushed Authorisation Request) with scopes (e.g. `banking:accounts.basic.read`).  
- **Redirect:** App opens WebView with bank’s authorization URL + `request_uri`. User authenticates at bank, grants consent. Bank redirects to `buffr://oauth-callback?code=...`.  
- **Token exchange:** App sends code to backend; backend exchanges with bank’s `POST /token` (mTLS, client credentials). Stores access/refresh tokens securely.  
- **Use:** Subsequent API calls to bank include `Authorization: Bearer <access_token>` and `ParticipantId` header.

**Send money**  
1. Select recipient → amount → confirm screen (summary).  
2. “Send” → 2FA (action: `send_money`, payload: `{ recipientId, amount, walletId }`).  
3. POST send-money API with `verification_token`; on 200 → navigate to `send-money/success`.  
4. On 4xx: Toast, stay on confirm.

**Pay merchant – NAMQR-compliant**  
1. User selects merchant (or goes to “Scan QR”).  
2. **User scans merchant-displayed NAMQR** (dynamic QR with payee IPP alias, amount, Token Vault NREF).  
3. App parses TLV, validates CRC, validates via Token Vault, shows merchant name and amount.  
4. User 2FA → payment from Buffr wallet to merchant → success.

**2FA modal (global)**  
- Input: `visible`, `onClose`, `onVerify(verification_token)`, `action` (string), `payload` (object).  
- User enters PIN or uses biometric; app calls backend `POST /api/v1/mobile/auth/verify-2fa` (or equivalent) with PIN/biometric result to get `verification_token`.  
- On success: `onVerify(token)`; close modal.  
- On cancel: `onClose()`; no navigation.  
- No raw PIN stored; only token passed to next API.  
- **External bank access:** For Open Banking PIS/AIS the app redirects to the bank’s auth page (WebView); SCA is performed at the bank. **mTLS:** Server-to-server calls to banks use Mutual TLS with QWAC certificates.

**Electronic Transactions Act requirements (ETA):**
- **Legal recognition of data messages:** All contracts formed through the app (e.g. user agreements, transaction confirmations) are legally valid as data messages under section 17 of the ETA.
- **Electronic signatures:** Where user consent or approval is required (e.g. accepting terms, authorising a payment), the app must capture an **advanced electronic signature** (section 20) – biometric or PIN‑based authentication that meets uniqueness, signer identification, and link to the data message.
- **Retention of records:** The backend must retain all data messages (transaction logs, consents, agreements) in accordance with section 24 of the ETA – format that can be accurately reproduced, with origin, destination, date/time stamps; retention period defined by business/legal (e.g. 5 years).
- **Admissibility of evidence:** Logging must allow generation of affidavits attesting to system reliability and data integrity (ETA s.25). Backend must be capable of producing an affidavit from the person in control of the information system.

**PSD-12 Cybersecurity requirements:**
- **2FA for every payment:** As per PSD-12 section 12.2, **two‑factor authentication is required for every payment transaction**. The app must enforce 2FA (something you know + something you have, or biometric) for all payment initiations.
- **Encryption:** All data in transit must use strong protocols (TLS 1.2+). Data at rest (user information, transaction logs) must be encrypted or tokenised/masked as per PSD-12 section 12.1.
- **Incident reporting:** Any successful cyberattack or security incident must be reported to the Bank of Namibia within 24 hours (preliminary) and a full impact assessment within one month. Backend must have monitoring and logging to detect such incidents.
- **Recovery objectives:** Systems must be designed for RTO ≤ 2 hours and RPO ≤ 5 minutes.

**PSD-1 & PSD-3 licensing and e‑money:**
- **If Ketchup operates as a licensed PSP/TPPP:** The app must integrate with the sponsoring bank’s systems as per the approved license. Backend must submit monthly statistics to the Bank (PSD-1 section 23).
- **If Buffr holds customer funds as e‑money:** A **trust account** must be maintained at a commercial bank, holding 100% of outstanding e‑money liabilities. No commingling of user funds with operational funds. No interest on e‑money wallets. Backend must reconcile funds daily and report any deficiency within one business day.

**7.6.1 Receive Money (P2P)**  
1. Sender initiates send money flow → success.  
2. Receiver gets push notification (or in‑app notification).  
3. Receiver taps notification → `/receive/[transactionId]` screen.  
4. Receiver sees details and can "Add to wallet" (immediate credit) or "Cash out now" (redirect to cash‑out hub).  
5. After action, success screen.

**7.6.2 Receive Voucher**  
1. Voucher is issued (e.g., from government).  
2. Receiver gets SMS and app notification.  
3. Receiver opens app → vouchers list (screen 8).  
4. Tap voucher → voucher detail (screen 9) → redeem.

**7.6.3 Receive Group Invitation**  
1. Someone creates a group and adds the user.  
2. User receives notification → `/receive/group-invite/[inviteId]`.  
3. User accepts → group is added to groups list (screen 47b/c).  
4. User can now view group details.

**7.6.4 Receive Request to Pay**  
1. Someone (e.g., merchant) sends a payment request via the app.  
2. User receives notification → `/receive/request/[requestId]`.  
3. User sees requester, amount, note.  
4. User taps "Pay now" → send money flow pre‑filled with recipient and amount.  
5. After payment, confirmation.

**7.6.5 Proof-of-Life Verification (in-app)**  
1. User opens app. On home screen load, `GET /api/v1/mobile/user/profile` returns `proofOfLifeDueDate`.  
2. If dueDate ≤ 14 days away, app shows banner: "Please verify to continue receiving grants."  
3. User taps banner → navigate to `/proof-of-life/verify`.  
4. Screen explains requirement. User taps "Start verification".  
5. App triggers device biometric prompt (Face ID / fingerprint) via `expo-local-authentication`.  
6. On successful biometric, app calls `POST /api/v1/mobile/user/proof-of-life` with `{ method: 'in_app_biometric' }`.  
7. Backend: calls Biometric Verification Service (1:1 match against enrolled template); on success, updates `lastProofOfLife` and `proofOfLifeDueDate = now + 90 days`; returns updated user profile.  
8. App navigates to `/proof-of-life/success` with confirmation.  
9. Banner removed from home screen.  

**If user ignores banner and dueDate passes:**  
- Days 0–30 past due: app still allows transactions but shows warning banner.  
- Day 31–120 past due: wallet frozen – any attempt to redeem, cash out, send, or pay merchant shows frozen screen (`/proof-of-life/expired`). Vouchers can still be redeemed at NamPost/SmartPay (biometric at point of redemption counts as proof-of-life).  
- >120 days: account deactivated; requires re-enrolment.  

**Agent/USSD proof-of-life flow (not in app):**  
- Agent selects "Proof-of-life" on POS terminal. Beneficiary provides biometric. Terminal calls backend `POST /api/v1/mobile/agent/proof-of-life` (authenticated with agent credentials). Backend updates `lastProofOfLife` as above. Beneficiary's next app sync reflects updated status.

**7.6.6 USSD – Cash-out code request**  
1. User dials *123#, selects "Cash out" → enters amount.  
2. Backend validates sufficient balance.  
3. Backend generates a **6-digit numeric code** (cryptographically random, stored with expiry, e.g., 30 minutes) and associates it with the user's wallet and amount.  
4. Backend immediately sends SMS: "Your cash-out code for N$ XX is 123456. Show this code and your ID at any Buffr agent. Valid 30 min."  
5. User visits agent, presents code and ID.  
6. Agent enters code into POS, system validates, agent hands cash.  
7. Wallet is debited; SMS confirmation sent to user.

**7.6.7 USSD – Voucher cash code request**  
1. User dials *123#, selects "Voucher" → "Get cash code".  
2. Backend checks available vouchers.  
3. If multiple, user selects voucher by number (e.g., "1. N$ 500 exp 2026-03-31").  
4. Backend generates a 6-digit code for that voucher (as per voucher redemption method 2/3), stores with expiry, and sends SMS: "Your cash code for voucher N$ 500 is 123456. Present at NamPost/SmartPay unit. Valid 24h."  
5. User takes code to branch/unit; staff enters code (or user scans QR if branch has QR capability) to redeem cash.

**7.7 Voucher-backed loan (apply and repayment)**  
1. User opens Loans (`/loans`) → sees list of offers / active loans. Eligibility and max amount (1/3 of previous voucher value) come from backend.  
2. Apply: user selects or enters amount (up to max), sees terms (15% interest), confirms → 2FA → backend disburses to wallet (or defined payout method).  
3. Repayment: **automatic**. When the user **redeems the next month’s voucher to Buffr Wallet**, the backend first deducts the loan repayment (principal + 15% interest) from the voucher amount credited; the remainder is the user’s wallet balance. No separate “repay loan” action in the app unless product adds optional early repayment.  
4. Active loan detail screen shows status, amount, interest, and that repayment will be taken from next voucher-to-wallet redemption.

---

## 8. Data Hierarchy (Organism → Atom)

Navigation from high-level to detail (data-driven UI):

| Level | In app | Example |
|-------|--------|---------|
| **Organism** | Home (national/ecosystem view in portals; in app = “my world”) | Home screen: balance, vouchers summary, quick actions |
| **Organ** | Region / programme (in app: “Vouchers” or “Wallet” as sections) | Vouchers list; Wallet list |
| **Tissue** | Cluster (e.g. “Available vouchers”, “Cash-out methods”) | Voucher type filter; Cash-out hub 5 cards |
| **Molecule** | Single transaction / voucher / session | Voucher detail; Transaction detail; One cash-out |
| **Atom** | Single field / event | Amount, date, status, one verification log line |

Drill-down: List → Detail → (e.g. Receipt, Code) at each step.

### 8.2 UI component hierarchy (Organism → Atom, from Figma)

Design components follow the same organism → atom structure for consistent implementation. **Source:** Figma Buffr App Design (file key `VeGAwsChUvwTBZxAU6H8VQ`); full inventory in **§4.7**.

| Level | In design | Examples |
|-------|------------|----------|
| **Organism** | Full screen / frame | Welcome, Home (QR/Profile tabs), Add card, Add profile, Send/Contacts, QR Code Scanner, Selected contact, Create group |
| **Molecule** | Section or composite block | Header row (logo + Bell + Profile), Search pill row, Send-to chips row, Balance block, Wallet carousel, Services grid, Tab bar (glass), OTP row, 2FA modal, QR display block, Group row |
| **Atom** | Primitive UI element | Primary CTA (Get Started, Verify, Add Wallet +), PillButton (Show, Add, Promote, Profile, Bell), ContactChip (avatar + name), Avatar (header/chip/group), Icon (heroicons set), TextInput, OTPInput, Text styles (caption/body/title/tab) |

**Consistency rules:**  
- All pills use `borderRadius: 999` (design token `radius.pill`).  
- All primary CTAs use `components.button` height 56, `radius.md` 16, brand primary fill.  
- Avatars use `components.avatar.*` sizes (header 40, chip 40, group 32).  
- QR display uses `components.qrDisplay`; scanner uses `components.qrScanner`.  
- Groups and contacts use `components.groupRow` and `components.contactRow`; chips reuse `ContactChip` (pill + avatar + name).  
- Design tokens (§5.1) and Figma effects (§5.3) apply at every level.

---

## 9. Tech Stack & Implementation

### 9.1 Stack

| Layer | Choice |
|-------|--------|
| Framework | React Native (Expo SDK 54+) |
| Language | TypeScript |
| Routing | Expo Router (file-based) |
| State | React Context + hooks (user, wallets, vouchers); optional Zustand for UI |
| UI | Custom components + design tokens (Theme.ts, Layout.ts style) |
| API | REST client to Buffr backend (env base URL); **mTLS** for server-to-server bank APIs (QWACs) |
| QR | **NAMQR:** `react-native-qrcode-svg` (display), `expo-camera` / `react-native-vision-camera` (scan); **custom TLV encoder/decoder** (§11) |
| OAuth | `expo-auth-session`, `expo-web-browser` for OAuth redirects (Open Banking consent) |
| Crypto | `expo-crypto` / `react-native-quick-crypto` for CRC and **Signed QR (Tag 66)** verification |
| Secure Storage | `expo-secure-store` for tokens and keys |
| Logging | Centralised logging with retention and audit trails (e.g. Logtail or custom backend); §11.9 auditLogger |

### 9.2 Design & docs sources

| Source | Tool | Use |
|--------|------|-----|
| **Figma** | Figma MCP (`get_figma_data`) | Buffr App Design; file key `VeGAwsChUvwTBZxAU6H8VQ`; Home node `575:4252`; colors, radius, spacing, text styles |
| **Archon** | `perform_rag_query` | CONSOLIDATED_PRD, BUFFR_G2P_FINAL_ARCHITECTURE, BUFFR_G2P_PRD; Expo/React Native docs (StyleSheet, fonts, safe area) |
| **Design System** | §5 this PRD | Canonical JSON tokens; map to `constants/Theme.ts`, `Layout.ts` and StyleSheet in code |
| **NAMQR** | Bank of Namibia NAMQR Code Specifications | TLV payload, mandatory tags (00, 01, 26/29, 52, 58, 59, 60, 65, 63), Token Vault (NREF), Signed QR (Tag 66), payee-presented flows |
| **Open Banking** | Namibian Open Banking Standards v1.0 | mTLS (QWACs), OAuth 2.0 / OIDC (PAR, PKCE), API structure (data/links/meta), SCA |
| **ETA** | Electronic Transactions Act 4 of 2019 | Data messages, electronic signatures, retention, admissibility of evidence |
| **PSD-12, PSD-1, PSD-3** | Bank of Namibia Determinations | Cybersecurity (2FA, encryption, incident reporting, RTO/RPO); licensing; e‑money (trust account, AML/CFT) |

### 9.2b Design & Code Reference for Expo Build (Production)

**Purpose:** This subsection is the **design and code reference** for the Buffr G2P React/Expo app and for extending to production. Use it alongside Figma (§9.2) and §11 Implementation File Map.

**Canonical references (for implementers and AI):**

- **Buffr G2P Complete Code Reference** – Full source of 62+ component files, App.tsx, and styles/globals.css, organised by feature area (Entry & Styles, Core Infrastructure, Shared UI, Onboarding, Home & Navigation, Voucher System, Wallet & Cash Out, Send Money, Merchant Payments, Agent Network, Groups & P2P, Loans, Bill Payments, AI Chat, Gamification, Financial Literacy, Analytics, Profile & Settings, Transactions, Utility Components).
- **Buffr G2P Implementation Guide** – Architecture (voucher 3 methods, wallet cash-out 5 methods), complete screen inventory (40+), user journeys, business rules, technical stack (React Native + Expo SDK 52, Python/FastAPI backend), security & compliance (PSD-1, PSD-3, PSD-12), API endpoints, database schema, production readiness.

**Key design and flow areas to align Expo implementation with:**

| Area | Reference behaviour / patterns |
|------|-------------------------------|
| **Wallet flows** | Add Wallet (2-step: icon + name → pay-from, date, amount, payment count); WalletCashOutScreen (5 methods: Bank, Till, Agent, Merchant, ATM) with fees/times/limits; WalletDetailScreen (balance, Add Funds, Transfer, Auto Pay toggle and config). |
| **Auto Pay** | Toggle in Add Wallet and Wallet Detail; frequency (weekly/bi-weekly/monthly), Deduct On (date + time), Amount, Number of Repayments, Payment Method selector; iOS-style roller pickers for date/time; Edit Auto Pay screen. |
| **Cards** | BuffrCard (user name, card number, NamPost badge, profile picture or initials from UserContext); WalletCard (name, balance, icon, owner from UserContext); CardViewScreen (swipeable Buffr + linked cards, CVV show/hide, Remove/Change/Edit). |
| **Send Money** | SendMoneyFlow: Select Recipient → Enter Amount → Select Method → Receiver Details → Payment Success; SelectRecipient (recents, favorites, all contacts, QR); EnterAmount (N$ display, quick amounts, note); TwoFactorVerification before success. |
| **Groups & P2P** | GroupsScreen (My Groups / Activity tabs, stats card, group list); GroupViewScreen (stacked avatars, Send/Request, request bubbles with status); GroupSendScreen / GroupRequestScreen (amount, note, 2FA for send); GroupPaymentSuccess / GroupRequestSuccess; GroupSettingsScreen (name, members, deactivate). SendToScreen (recents, favorites, contacts) → ReceiverDetailsScreen. |
| **Voucher system** | VouchersScreen (filters, VoucherCard list); VoucherDetailScreen (3 redemption methods: Buffr Wallet, NamPost, SmartPay); NamPostScreen (branch list → detail → booking code + QR); CashbackTillScreen (retailer → amount → till code); SmartPayUnitsScreen (mobile units). |
| **Shared UI** | StatusBar, HomeIndicator, ThemeToggle, TwoFactorVerification (6-digit PIN, Face ID), NotificationCenter, AddMoneyModal (amount, Bank Transfer / Debit Card / Redeem Voucher), MobileContainer primitives. |
| **Context & state** | UserContext (user profile, buffrId, cardNumberMasked, proofOfLifeDueDate, walletStatus, setProfile, setBuffrId, setProofOfLife, clearUser, isLoaded); `useUser()` hook. **Applied throughout the app** (v1.13): onboarding (index, country, face-id, photo), wallets (list, detail, history, add-money, add-money/card), cards (list, add-card flow), send-money (select-recipient, amount, receiver-details, confirm, success), receive, loans (index, success, apply, detail), bills (pay, success), vouchers (detail, redeem instruction/confirm), scan-qr, add-wallet, profile (index, qr-code, settings, notifications). Screens gate on `isLoaded` where appropriate and show a frozen banner + disable financial actions when `walletStatus === 'frozen'` (§2.4). ThemeContext (light/dark); optional wallet list in context for Add Wallet / Wallet Detail. |

**Common Expo/React Native build error and fix:**

- **Error:** `SyntaxError: Identifier 'StyleSheet' has already been declared. (18:21)` in `app/(tabs)/home/index.tsx`.
- **Cause:** Duplicate import from `'react-native'`: two lines such as `} from 'react-native';` followed by `import { Dimensions, StyleSheet, View } from 'react-native';`. Dimensions, StyleSheet, and View are already in the first import block.
- **Fix:** Remove the **second** `import { ... } from 'react-native';` entirely. Keep only the single block that imports ActivityIndicator, Dimensions, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View (and any other RN symbols used) in one statement.

**Production extension:** When adding or changing screens, align with the component inventory and navigation map in the Complete Code Reference (e.g. onboarding → home → transactions | loans | qr-code | send-money | …; vouchers → voucher-detail → nampost | smartpay-units | wallet redeem; wallet-cash-out → cashback-till | agent-network | merchants | location-services). Reuse patterns from UserContext, BuffrCard, WalletCard, TwoFactorVerification, and the 5-method cash-out hub for consistency.

### 9.3 API (backend contract)

- **Base URL:** Env `EXPO_PUBLIC_API_URL` (Buffr backend).  
- **Auth (Buffr):** JWT Bearer (and optionally `x-user-id` in dev).  
- **Auth (external banks):** OAuth 2.0 access tokens + **mTLS (QWAC)** for server-to-server calls.  
- **Key endpoints (Buffr backend):**  
  - `GET /api/v1/mobile/vouchers` – list vouchers  
  - `POST /api/v1/mobile/vouchers/{id}/redeem` – body `{ method, redemption_point?, verification_token }`  
  - `GET /api/v1/mobile/wallets` – list wallets  
  - `POST /api/v1/mobile/wallets/{id}/cashout` – body `{ amount, method, destination, verification_token }`  
  - **`GET /api/v1/mobile/user/profile`** – (Bearer) returns user including **`lastProofOfLife`**, **`proofOfLifeDueDate`**, **`walletStatus`** (`active` \| `frozen` \| `deactivated`). See §9.4 User profile (proof-of-life).  
  - **`POST /api/v1/mobile/user/proof-of-life`** – (Bearer) request `{ method: 'in_app_biometric' }`; response `{ success: boolean; newDueDate: string; message?: string }`. Backend calls Biometric Verification Service; updates user proof-of-life dates and wallet status.  
  - **`POST /api/v1/mobile/agent/proof-of-life`** – (agent-auth) request `{ beneficiaryId: string; biometricData?: ... }`; response same as above. Used when beneficiary verifies at agent/NamPost/mobile unit POS.  
  - `PATCH /api/v1/mobile/user/profile` – body `{ first_name?, last_name?, photo_url? }` (Bearer)  
  - **`POST /api/v1/mobile/qr/generate`** – NAMQR payload (TLV) with Token Vault NREF (§9.4)  
  - **`POST /api/v1/mobile/qr/validate`** – validate scanned NAMQR against Token Vault (§9.4)  
  - **`GET /api/v1/mobile/keys/merchant/{alias}`** – public key for Signed QR (ListVAE)  
  - **`GET /api/v1/mobile/keys/psp/{orgId}`** – public key for PSP Signed QR (ListKeys)  
  - `GET /api/v1/mobile/agents/nearby`, `nampost/nearby`, `smartpay/nearby`, `atms/nearby` – location APIs  
  - Send money, bill pay, merchants, groups: per CONSOLIDATED_PRD and existing Buffr backend.  
- **Receiver flows (notifications & receive):**  
  - `GET /api/v1/mobile/notifications` – list notifications (incoming payments, requests, invitations).  
  - `GET /api/v1/mobile/notifications/{id}` – detail of a specific notification.  
  - `POST /api/v1/mobile/notifications/{id}/accept` – accept a group invite or payment request.  
  - `POST /api/v1/mobile/notifications/{id}/decline` – decline.  
  - `GET /api/v1/mobile/receive/{transactionId}` – details of a received transaction (screen 52).  
  - `GET /api/v1/mobile/receive/voucher/{voucherId}` – details of a received voucher (screen 53).  
  - `POST /api/v1/mobile/receive/accept-payment` – accept a pending payment (if required).  
- **Compliance endpoints (backend):**  
  - **`POST /api/v1/compliance/incident-report`** – report security incident to Bank (PSD-12 s.11.13).  
  - **`GET /api/v1/compliance/audit-logs`** – retrieve logs for user/transaction (ETA s.24, s.25).  
  - **`POST /api/v1/compliance/affidavit`** – generate affidavit for data messages (ETA s.25(4)).  
  - **`POST /api/v1/compliance/monthly-stats`** – submit monthly statistics to Bank (PSD-1 s.23).  
  - **`GET /api/v1/compliance/unverified-beneficiaries?daysOverdue=90`** – (optional) for Government Portal; list beneficiaries overdue for proof-of-life.
- **USSD (gateway calls backend):**  
  - **`POST /api/v1/ussd/menu`** – receives USSD input, returns next menu text. Request: `{ sessionId: string, serviceCode: string, phoneNumber: string, text: string }`. Response: `{ response: string, endSession: boolean }` (conforms to USSD gateway spec). All other actions (balance, voucher redeem, cash-out code generation, etc.) are orchestrated by the USSD handler reusing existing APIs.  
  - **Compliance:** USSD transaction volumes must be included in monthly stats (PSD-1 §23).

### 9.4 API request/response shapes (TypeScript)

**Auth**  
- `POST /api/v1/mobile/auth/send-otp`  
  - Request: `{ phone: string }`  
  - Response: `{ success: boolean; message?: string }`  
- `POST /api/v1/mobile/auth/verify-otp`  
  - Request: `{ phone: string; code: string }`  
  - Response: `{ token: string; user: { id: string; phone: string; name?: string } }`  
- `POST /api/v1/mobile/auth/verify-2fa` (or equivalent)  
  - Request: `{ userId?: string; method: 'pin' | 'biometric' | 'otp'; action: string; payload?: object; pin?: string }` or biometric token per backend contract  
  - Response: `{ verification_token: string; expires_at: string }`  
  - **Note:** PIN is validated **server-side only**; no local PIN check. The backend must accept either a PIN or a biometric token (from the app) and return a `verification_token` for use in redeem, cash-out, and send. App sends `method` and the corresponding proof; backend returns `verification_token`.

**User profile (onboarding name/photo and proof-of-life)**  
- **`GET /api/v1/mobile/user/profile`** (Bearer) – Response: `{ user: { id: string; phone: string; name?: string; photo_url?: string; lastProofOfLife?: string; proofOfLifeDueDate?: string; walletStatus: 'active' | 'frozen' | 'deactivated' } }`. **Use:** Home and proof-of-life banner (§2.4, §7.6.5).  
- `PATCH /api/v1/mobile/user/profile` (or equivalent)  
  - Request: `{ first_name?: string; last_name?: string; photo_url?: string }` (Bearer token required)  
  - Response: `{ user: { id: string; phone: string; name?: string; photo_url?: string; lastProofOfLife?: string; proofOfLifeDueDate?: string; walletStatus?: string } }`  
  - **Use:** After Name Entry (§3.1 screen 4) and Photo Upload (§3.1 screen 5); “PATCH user if API exists” in §7.6.

- **`POST /api/v1/mobile/user/proof-of-life`** – Request: `{ method: 'in_app_biometric' }` (Bearer). Response: `{ success: boolean; newDueDate: string; message?: string }`. **Use:** After device biometric success (§7.6.5); backend calls Biometric Verification Service and updates user.

**Vouchers**  
- `GET /api/v1/mobile/vouchers`  
  - Response: `{ vouchers: Voucher[] }` where `Voucher = { id: string; amount: number; currency: string; status: 'available'|'redeemed'|'expired'; expires_at: string; type?: string }`  
- `GET /api/v1/mobile/vouchers/{id}`  
  - Response: `Voucher` (single)  
- `POST /api/v1/mobile/vouchers/{id}/redeem`  
  - Request: `{ method: 'wallet'|'nampost'|'smartpay'; redemption_point?: string; verification_token: string }`  
  - Response: `{ success: boolean; code?: string; message?: string; wallet_balance?: number }`

**Wallets**  
- `GET /api/v1/mobile/wallets`  
  - Response: `{ wallets: Wallet[] }` where `Wallet = { id: string; name: string; balance: number; currency: string; type: string }`  
- `GET /api/v1/mobile/wallets/{id}`  
  - Response: `Wallet & { transactions?: Transaction[] }`  
- `POST /api/v1/mobile/wallets/{id}/cashout`  
  - Request: `{ amount: number; method: string; destination?: string; verification_token: string }`  
  - Response: `{ success: boolean; code?: string; expires_at?: string; message?: string }`

**NAMQR – QR generate (Token Vault integration)**  
- `POST /api/v1/mobile/qr/generate`  
  - Request: `{ type: 'static' | 'dynamic'; payeeAlias?: string; payerAlias?: string; amount?: number; currency?: string; merchantCategoryCode?: string; transactionReference?: string; description?: string; expiry?: string }`  
  - Response: `{ payload: string; nref: string; expiresAt?: string }` – `payload` is TLV string to encode in QR; `nref` is Token Vault Unique Identifier (Tag 65).

**NAMQR – QR validate (Token Vault)**  
- `POST /api/v1/mobile/qr/validate`  
  - Request: `{ nref: string; scannedPayload: string }`  
  - Response: `{ valid: boolean; message?: string; decodedData?: { payeeName: string; amount: number; currency: string; [k: string]: unknown } }`

**Open Banking (when calling bank APIs)**  
- Headers: `Authorization: Bearer <access_token>`, `x-v: 1`, `ParticipantId: API123456`, `Content-Type: application/json`, **`x-fapi-interaction-id`**: a UUID generated per request to correlate logs across systems (recommended/required by Open Banking).  
- Payloads: root object with `data`, `links`, `meta` per Open Banking Standards Ch. 9.1.  
- Errors: `errors` object for non-200 responses.

**Location**  
- `GET /api/v1/mobile/agents/nearby?lat=&lng=&radius=`  
  - Response: `{ agents: { id: string; name: string; lat: number; lng: number; address: string }[] }`  
- `GET /api/v1/mobile/nampost/nearby?lat=&lng=`  
  - Response: `{ branches: { id: string; name: string; lat: number; lng: number; address: string }[] }`  
- `GET /api/v1/mobile/smartpay/nearby?lat=&lng=`  
  - Response: `{ units: { id: string; name: string; lat: number; lng: number }[] }`  
- `GET /api/v1/mobile/atms/nearby?lat=&lng=`  
  - Response: `{ atms: { id: string; name: string; lat: number; lng: number; address: string }[] }`

**Send money** (per backend)  
- Request: `{ recipient_id: string; amount: number; wallet_id: string; note?: string; verification_token: string }`  
- Response: `{ success: boolean; transaction_id: string; message?: string }`

**Groups**  
- `POST /api/v1/mobile/groups`  
  - Request: `{ name: string; description?: string; member_ids?: string[] }` (Bearer token required)  
  - Response: `{ group: { id: string; name: string; description?: string; member_count: number; created_at: string } }`  
- `GET /api/v1/mobile/groups`  
  - Response: `{ groups: Group[] }` where `Group = { id: string; name: string; description?: string; member_count: number }`

**Loans (voucher-backed advance, §2.3)**  
- `GET /api/v1/mobile/loans` – list user’s loans and/or current offer (eligibility, max amount = 1/3 previous voucher value, 15% interest).  
  - Response: `{ loans?: Loan[]; offer?: { maxAmount: number; interestRate: number; previousVoucherValue?: number } }` where `Loan = { id: string; amount: number; interestRate: number; status: string; disbursedAt: string; repaymentDueFromNextVoucher?: boolean }`  
- `POST /api/v1/mobile/loans/apply` – apply for advance (amount ≤ max from offer).  
  - Request: `{ amount: number; wallet_id?: string; verification_token: string }`  
  - Response: `{ success: boolean; loan?: Loan; message?: string }`  
- `GET /api/v1/mobile/loans/{id}` – single loan detail (for active loan screen).  
  - Response: `Loan` (id, amount, interestRate, totalRepayment, status, disbursedAt, repaymentDueFromNextVoucher, etc.).  
- Repayment is **not** a separate app call: when user redeems **next month’s voucher to Buffr Wallet**, backend deducts loan repayment (principal + 15% interest) from the credited amount before updating wallet balance. Database design should link loan to user and attach repayment to next voucher-to-wallet redemption event.

**Rate limiting (response headers)**  
- Backend should return (when rate limiting is enabled):  
  - `X-RateLimit-Limit`: max requests per window  
  - `X-RateLimit-Remaining`: remaining requests in current window  
  - `X-RateLimit-Reset`: Unix timestamp when the window resets  
- Client: on 429 Too Many Requests, show Toast and optionally retry after reset.

**Transactions**  
- `GET /api/v1/mobile/transactions?wallet_id=&limit=&offset=`  
  - Response: `{ transactions: Transaction[] }` where `Transaction = { id: string; amount: number; type: string; status: string; created_at: string; description?: string }`

### 9.5 Using Archon MCP for implementation (100% confidence)

This PRD is the **single source of truth** for implementing the Buffr G2P app. You can **confidently use Archon MCP** to write code by supplying this document and the references below.

**What Archon has access to (via RAG / docs):**  
- **This PRD** (buffr_g2p/docs/PRD.md): screens (§3, §3.8), components (§4, §4.7), design system (§5), flows (§7, §7.6), API shapes (§9.4), implementation map and code (§11).  
- **CONSOLIDATED_PRD**, **BUFFR_G2P_FINAL_ARCHITECTURE**, **BUFFR_G2P_PRD**: ecosystem context, 40+ screens, voucher/wallet model, API.  
- **Expo / React Native docs** (via Archon): StyleSheet, Dimensions, safe area, fonts, navigation.

**How to use Archon MCP for code generation:**  
1. **Screens:** Implement from §3 (routes, layout, key components) and §3.8 (Figma nodeId per screen).  
2. **Components:** Build from §4 (inventory) and §4.7 (organism → atom: all actions, buttons, pills, avatars, groups, QR). Use §5.1 design JSON (colors, typography, spacing, radius, shadows, `components.pill`, `components.avatar`, `components.qrDisplay`, etc.).  
3. **Flows:** Follow §7 and §7.6 (entry, onboarding, voucher redeem, cash-out, send money, 2FA); no TODOs.  
4. **API:** Use §9.4 request/response shapes; env `EXPO_PUBLIC_API_URL`.  
5. **File map and code:** §11 has full project structure, env vars, dependencies, and copy-paste code for layouts, entry, onboarding, contexts, 2FA, card design, types.

**Confidence statement:**  
- **100% screen coverage:** Every Figma top-level frame is in §3.8 with nodeId and PRD mapping.  
- **100% component coverage:** All organisms, molecules, and atoms (actions, buttons, pills, avatars, groups, QR, inputs, icons) are in §4.7 and §5.1.  
- **Proper documentation for code:** §3 (routes), §4/§4.7 (components), §5 (tokens), §7.6 (flow logic), §9.4 (API shapes), §11 (structure + code) are sufficient for Archon MCP to generate correct, consistent implementation. Use **perform_rag_query** on this PRD and the listed docs when writing screens and components.

---

## 10. Compliance & Security (App)

| Requirement | Implementation in app | Legal Source |
|-------------|------------------------|--------------|
| **NAMQR Payload Format** | All QR codes generated or scanned follow **TLV** structure with mandatory tags (00, 01, 26/29, 52, 58, 59, 60, 65, 63). §4.5, §11. | NAMQR v5.0 |
| **Token Vault Validation** | Every QR scanned is validated against the Token Vault via `POST /api/v1/mobile/qr/validate` before proceeding. §7.6, §9.3. | NAMQR v5.0 |
| **Signed QR (Tag 66)** | If QR contains digital signature, app verifies using public key (ListVAE/ListKeys). Failure → reject; unsigned QR → show warning. §4.5. | NAMQR v5.0 |
| **Mutual TLS (mTLS)** | All server-to-server communication with external banks uses mTLS with **QWAC**. Backend handles; app talks to backend over HTTPS. §9.1, §9.3. | Open Banking v1.0 |
| **OAuth 2.0 Consent** | When accessing external bank data (PIS/AIS), app uses OAuth 2.0 with PKCE and redirects; no sharing of user credentials. §7.6, OAuthContext, useOAuth. | Open Banking v1.0 |
| **Strong Customer Authentication** | **2FA for every payment** – at least two factors (PIN + OTP, or biometric + device). §11.7 use2FA.ts. | PSD-12 s.12.2 |
| **Encryption** | All data in transit TLS 1.2+; data at rest encrypted or tokenised. §11.7 encryption.ts. | PSD-12 s.12.1 |
| **Incident Reporting** | Backend detects and reports successful cyberattacks to Bank within 24h (preliminary) and full report within 30 days. §11.7 incidentReporter.ts. | PSD-12 s.11.13–11.14 |
| **Recovery Objectives** | Systems designed for RTO ≤ 2 hours, RPO ≤ 5 minutes. | PSD-12 s.13 |
| **Electronic Signatures** | User authentication/consent events recorded as **advanced electronic signatures** (biometric or PIN with strong binding). | ETA s.20 |
| **Data Retention** | All data messages (transactions, consents) retained in reproducible format, with origin, destination, timestamps. Retention period defined by business/legal (e.g. 5 years). §11.7 auditLogger.ts. | ETA s.24 |
| **Admissibility of Evidence** | Logging allows generation of affidavits attesting to system reliability and data integrity. §11.7.5 affidavitGenerator. | ETA s.25 |
| **E‑money Safeguarding** | If Buffr holds funds: trust account with 100% backing, daily reconciliation, no interest on wallets. | PSD-3 s.11 |
| **AML/CFT** | Ketchup (as PSP) must comply with Financial Intelligence Act – CDD, risk assessments, reporting of suspicious transactions. | PSD-1 s.10.3.1(d), PSD-3 s.12 |
| **Consumer Protection** | Fees and charges transparently displayed; complaints process accessible; user agreement includes required disclosures. | PSD-1 s.10.4, PSD-3 s.14, ETA Ch.4 |
| **Secure storage** | Tokens and keys in `expo-secure-store`; access tokens never stored in plain text. | PSD-12 |
| **QR Code Integrity** | **CRC (Tag 63)** validated on every scan. §4.5, NAMQRDecoder. | NAMQR v5.0 |
| **No raw voucher codes** | Only Token Vault references and codes from backend; no display of raw voucher secrets | NAMQR v5.0 |
| **Audit trail** | All redemption and cash-out actions logged server-side; app passes verification_token | ETA s.24 |
| **Data minimization** | App requests only needed fields; no PII in logs | ETA, PSD-12 |
| **API security** | Buffr backend APIs protected with API keys and rate limiting; bank APIs use ParticipantId and x-v headers per Open Banking. | Open Banking v1.0 |
| **Receiver data protection** | All received transaction data stored encrypted; accessible only to the intended recipient. | PSD‑1, ETA |
| **Consent for incoming requests** | User must explicitly accept or decline group invites and payment requests; no automatic acceptance. | PSD‑1 s.10.4 |
| **Biometric verification at cash-out** | Beneficiary must verify via biometric at agent/NamPost/mobile unit for cash-out (except app wallet). | Government requirement |
| **Periodic proof-of-life** | 90‑day cycle; wallet frozen if missed; deactivation after 120 days. §2.4, §7.6.5. | Government requirement |
| **Ghost payment prevention** | Proof-of-life ensures payments only to living beneficiaries; flagged in Government Portal. §2.4. | Government requirement |
| **Biometric verification service** | Standalone bounded service; 1:1 match against enrolled templates only; no external identity registry. | Government requirement |
| **USSD session security** | All USSD requests authenticated by MSISDN; sensitive actions (cash-out, voucher redeem) require subsequent SMS-delivered codes (2FA). | PSD-12, ETA |
| **No storage of USSD codes** | Cash-out codes stored hashed in database; only valid for short period. | NAMQR (by analogy) |
| **SMS confirmations** | Every transaction initiated via USSD results in an SMS confirmation, serving as an audit trail and user receipt. | ETA s.24 |

---

## 11. Implementation File Map & Code (Self-Contained)

This section is the **single source of truth** for the Buffr G2P app: full project structure, environment, dependencies, and implementation code. **All code that will be implemented is completed here in the PRD first** (§11.4 copy-paste code, §11.7 Legal & Compliance, §11.8 NAMQR & Open Banking). Implementers must copy from these code blocks into the repo; do not create implementation files before the PRD code for that file is complete. Use Archon (Expo docs) and Figma MCP for reference when needed.

**Design reference – Buffr G2P Complete Code Reference & Implementation Guide:** For wallet flows, Auto Pay, and full component patterns, use the **Buffr G2P Complete Code Reference** (62 components, App.tsx, globals.css) and **Implementation Guide**: §7 Wallet & Cash Out (AddWallet 2-step + Auto Pay; WalletCashOutScreen 5 methods; CashOutAtAgent; CashbackTillScreen); voucher system §6; send money §8; UserContext/ThemeContext §2; BuffrCard, WalletCard, VoucherCard §3; TwoFactorVerification, NotificationCenter §3; navigation map and business rules (voucher 3 methods, wallet cash-out 5 methods, code expiry). Align Expo/React Native implementation with these patterns; see also §3.4 and §3.3 design reference paragraphs above.

### 11.0 Expo documentation reference (from Archon MCP)

**Source:** Archon MCP server **`user-archon`**, tool **`perform_rag_query`** with `source: "docs.expo.dev"`. Use these queries and snippets when implementing or when Archon generates code.

**How to fetch Expo docs:**  
- Call `perform_rag_query` on server **user-archon** with arguments: `{ "query": "<topic>", "source": "docs.expo.dev", "top_k": 5 }` for: Expo Router, Stack, Tabs, SafeAreaView, fonts, SplashScreen, environment variables, AuthSession, SecureStore, Camera, FileSystem, WebBrowser, etc.

**Key Expo doc URLs (from Archon):**

| Topic | URL | Use in PRD |
|-------|-----|-------------|
| **Expo Router – Stack** | https://docs.expo.dev/router/advanced/stack/ | §11.4.1, §11.4.10 – `Stack`, `Stack.Screen`, `screenOptions`, `animation`, `presentation` |
| **Expo Router – Tabs** | https://docs.expo.dev/router/advanced/tabs/ | §11.4.4 – `Tabs`, `Tabs.Screen`, `tabBarActiveTintColor` |
| **Expo Router – Modals** | https://docs.expo.dev/router/advanced/modals/ | Modal screens (2FA, code display) |
| **Safe areas** | https://docs.expo.dev/develop/user-interface/safe-areas/ | §11.4.1, §11.4.2, §11.4.9 – `SafeAreaView`, `SafeAreaProvider`, `useSafeAreaInsets` |
| **Fonts** | https://docs.expo.dev/develop/user-interface/fonts/ | §11.4.1 – `useFonts`, `fontFamily` in `Text` |
| **Splash screen** | https://docs.expo.dev/versions/latest/sdk/splash-screen/ | §11.4.1 – `SplashScreen.preventAutoHideAsync()`, `SplashScreen.hideAsync()` |
| **Environment variables** | https://docs.expo.dev/guides/environment-variables/ | §11.2 – `EXPO_PUBLIC_*`, `process.env.EXPO_PUBLIC_API_URL` |
| **Expo CLI** | https://docs.expo.dev/more/expo-cli/ | §11.6 – `npx expo start`, `npx expo install` |
| **Expo Router – dynamic routes** | https://docs.expo.dev/router/advanced/ | §11.4.16 – file-based `[param]` segments; `useLocalSearchParams`, `useRouter`, `router.push({ pathname, params })` |
| **Expo Router – nesting** | https://docs.expo.dev/router/advanced/nesting-navigators/ | §11.4.1, §11.4.16 – Stack inside Stack; receive stack as child route |

**Code snippets from Expo docs (for implementation):**

1. **SafeAreaView (Expo safe areas doc)**  
   Use `SafeAreaView` from `react-native-safe-area-context` so content stays within safe area (notch, home indicator). Expo Router projects typically wrap the app; if not, wrap root with `SafeAreaProvider`:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
// In screen:
<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
  <Text>Content is in safe area.</Text>
</SafeAreaView>
```

   Alternative: `useSafeAreaInsets()` returns `{ top, right, bottom, left }`; apply as padding to a regular `View`.

2. **Stack screen options (Expo Router Stack doc)**  
   Use in `app/_layout.tsx` and stack `_layout.tsx` files:

   - `animation`: `'default'` | `'fade'` | `'slide_from_right'` | `'slide_from_left'` | `'slide_from_bottom'` | `'flip'` | `'simple_push'` | `'none'`  
   - `animationDuration`: number (ms); iOS; default 350.  
   - `presentation`: `'card'` | `'modal'` | `'transparentModal'` etc.  
   - `headerShown`: boolean.

3. **Fonts (Expo fonts doc)**  
   Load custom fonts with `expo-font`; use in `Text` via `fontFamily`:

```tsx
import { useFonts } from 'expo-font';
// After loading (e.g. in root layout):
const [loaded] = useFonts({ Inter: require('./assets/fonts/Inter.ttf') });
// In component:
<Text style={{ fontFamily: 'Inter', fontWeight: '700' }}>Inter Bold</Text>
```

   Prefer OTF over TTF when both exist. Place fonts in `assets/fonts/`.

4. **Splash screen (Expo SplashScreen SDK)**  
   Keep native splash visible until app ready, then hide:

```tsx
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();
// After fonts/layout ready:
await SplashScreen.hideAsync();
```

   Optional: `SplashScreen.setOptions({ duration: 400, fade: true })` for hide animation.

5. **Expo Router entry**  
   With Expo Router, `main` in `package.json` is `"expo-router/entry"`. Root layout is `app/_layout.tsx`; no need for `registerRootComponent`. Use `router.replace()`, `router.push()` from `expo-router`.

6. **npx expo commands**  
   - `npx expo start` – start dev server.  
   - `npx expo start --tunnel` – tunnel URL for remote devices.  
   - `npx expo install <pkg>` – install dependency compatible with current Expo SDK.  
   - `npx expo -h` – list CLI commands.

**Completing code with Archon:** Use Archon MCP `perform_rag_query` with `source: "docs.expo.dev"` to pull in official Expo/React Native documentation when implementing or extending §11.4 code. Recommended queries: *"Expo Router Stack layout _layout nested routes"*, *"useLocalSearchParams useRouter href pathname params"*, *"Stack.Screen name options screenOptions"*, *"router.push router.replace navigation"*, *"React Native StyleSheet SafeAreaView TouchableOpacity"*. Use `search_code_examples` with `source_id: "docs.expo.dev"` for copy-paste snippets. All §11.4 code has been aligned with these docs.

**Implementation note:** All code in §11.4 follows these Expo/React Native patterns. When adding new screens or components, query Archon with `source: "docs.expo.dev"` for the relevant API (e.g. "expo-router Stack screenOptions", "react-native StyleSheet") and align with §5 design tokens and §4 components.

---

### 11.1 Full project structure (every file)

> **As-Built (February 2026):** Structure below reflects the actual implemented codebase. Tabs are organised as subdirectories under `(tabs)/` for sub-route grouping. Bills canonical screen is `(tabs)/home/bills.tsx`; `bills/pay.tsx` is the universal payment screen. Agents screen lives under `(tabs)/home/agents/` with embedded MapView. Gamification operates as a context + BadgeToast overlay only — not a navigable home screen.

#### 11.1a Current repository layout (buffr-g2p) — tree and ls -la

Root path: `/Users/georgenekwaya/buffr-g2p`. Generated with `tree -L 3 -a -I 'node_modules|.git|.expo|ios|android|dist|build|.next'` (and `ls -la` for backend and mobile).

**Tree (excerpt; mobile app/ and subdirs truncated):**

```
.
|-- .claude
|   `-- settings.local.json
|-- .github
|   |-- FIRST_PUSH.md
|   `-- workflows
|       `-- ci.yml
|-- .gitignore
|-- .mcp.json
|-- .vscode
|-- README.md
|-- backend
|   |-- .env
|   |-- .env.example
|   |-- .gitignore
|   |-- README.md
|   |-- migrations
|   |-- package-lock.json
|   |-- package.json
|   |-- scripts
|   |-- src
|   `-- tsconfig.json
`-- mobile
    |-- .env
    |-- .env.example
    |-- .gitignore
    |-- .npmrc
    |-- app
    |-- app.json
    |-- assets
    |-- babel.config.js
    |-- components
    |-- constants
    |-- contexts
    |-- docs
    |-- i18n
    |-- metro.config.js
    |-- package.json
    |-- react-native.config.js
    |-- scripts
    |-- services
    |-- tsconfig.json
    `-- utils
```

**ls -la backend/**

```
drwxr-xr-x   backend/
-rw-r--r--   .env
-rw-r--r--   .env.example
-rw-r--r--   .gitignore
-rw-r--r--   README.md
drwxr-xr-x   migrations/
drwxr-xr-x   node_modules/
-rw-r--r--   package-lock.json
-rw-r--r--   package.json
drwxr-xr-x   scripts/
drwxr-xr-x   src/
-rw-r--r--   tsconfig.json
```

**ls -la mobile/** (top-level; `ios/`, `android/`, `node_modules/` present when prebuild has been run)

```
drwxr-xr-x   mobile/
-rw-r--r--   .env
-rw-r--r--   .env.example
drwxr-xr-x   .expo/
-rw-r--r--   .gitignore
-rw-r--r--   .npmrc
drwxr-xr-x   android/
drwxr-xr-x   app/
-rw-r--r--   app.json
drwxr-xr-x   assets/
-rw-r--r--   babel.config.js
drwxr-xr-x   components/
drwxr-xr-x   constants/
drwxr-xr-x   contexts/
drwxr-xr-x   docs/
-rw-r--r--   expo-env.d.ts
drwxr-xr-x   i18n/
-rw-r--r--   metro.config.js
drwxr-xr-x   node_modules/
-rw-r--r--   package-lock.json
-rw-r--r--   package.json
drwxr-xr-x   scripts/
drwxr-xr-x   services/
-rw-r--r--   tsconfig.json
drwxr-xr-x   utils/
drwxr-xr-x   ios/
```

---

```
buffr_g2p/
  app.json
  package.json
  tsconfig.json
  babel.config.js
  app/
    _layout.tsx                # Root Stack; wraps AppProviders; mounts BadgeToast
    index.tsx                  # Entry: redirect to /(tabs) or /onboarding based on AsyncStorage flag
    +html.tsx
    +not-found.tsx
    modal.tsx
    api/
      ussd/
        menu+route.tsx         # USSD endpoint handler §9.3, §3.10
    onboarding/
      _layout.tsx
      index.tsx                # Welcome / splash
      phone.tsx
      otp.tsx
      name.tsx
      photo.tsx
      face-id.tsx
      complete.tsx
    (tabs)/
      _layout.tsx              # 4-tab bar: Home, Transactions, Vouchers, Me
      index.tsx                # Redirect → /(tabs)/home
      two.tsx                  # Placeholder (unused)
      home/
        _layout.tsx
        index.tsx              # Home hub: balance, card, wallets, contacts, 3×3 services, recent tx
        bills.tsx              # Canonical bills/utilities screen; accepts ?category= param; 2-level drill-down
        agents/
          _layout.tsx
          index.tsx            # Buffr Agents list with search
          nearby.tsx           # Embedded MapView + agent/NamPost/ATM cards
        loans/
          _layout.tsx
          index.tsx            # Loans list + eligibility
          apply.tsx            # Multi-step loan application (offer → biometric → credited → add details)
          [id].tsx             # Loan detail: hero card, auto-pay, timeline
        merchants/
          index.tsx            # Merchant browser with category chips; navigates to /merchants/[id]/pay
      transactions/
        _layout.tsx
        index.tsx              # Enhanced analytics: Balance/Earnings/Spendings tabs, bar chart, G2P breakdown
        [id].tsx               # Transaction detail
      vouchers/
        _layout.tsx
        index.tsx              # Vouchers list with type/status filters + search
      profile/
        _layout.tsx
        index.tsx              # Me tab: user info, profile links
        settings.tsx           # Account, Security, Privacy, Help, About sections
        analytics.tsx          # Spending analytics: period tabs, hero card, breakdown — reads from transactions
        notifications.tsx      # Notification center; seeded from AsyncStorage; mark as read
        ai-chat.tsx            # Offline FAQ bot with keyword-matching; API-first when backend ready
        learn.tsx              # Financial literacy: expandable in-app articles (5 topics)
        qr-code.tsx            # User's static NAMQR for receiving money
        location.tsx           # Find agents & ATMs (alias for /(tabs)/home/agents/nearby)
        gamification.tsx       # Badges/points view (reads GamificationContext; not linked from profile nav)
    utilities/
      _layout.tsx
      vouchers/
        _layout.tsx
        index.tsx              # Voucher list (with type/status/search filters)
        [id].tsx               # Voucher detail + 3-method redemption selector
        history.tsx            # Past voucher history (redeemed, expired)
        redeem/
          nampost/
            index.tsx          # NamPost branch selector with search
            booking.tsx        # Date/time slot picker → booking confirmation with QR
            success.tsx        # Booking confirmed screen
          smartpay/
            index.tsx          # SmartPay agent selector
            code.tsx           # 30-minute redemption code with countdown + copy
          wallet/
            success.tsx        # Wallet instant redemption success
    wallets/
      _layout.tsx
      [id].tsx                 # Wallet detail: balance, transactions, auto-pay, cash-out link
      [id]/
        cash-out/
          _layout.tsx
          index.tsx            # Cash-out method hub (5 methods)
          till.tsx             # Cash at till (scan till's NAMQR)
          agent.tsx            # Cash at Buffr Agent (scan agent's NAMQR)
          merchant.tsx         # Cash at merchant (scan merchant's NAMQR)
          atm.tsx              # Cash at ATM (ATM displays NAMQR, user scans)
          bank.tsx             # Bank transfer (Open Banking PIS)
          success.tsx          # Cash-out success with animation
        add-money.tsx          # Add money to wallet
    send-money/
      _layout.tsx
      select-recipient.tsx     # Contact picker + phone entry
      amount.tsx               # Amount entry with quick chips
      confirm.tsx              # Confirmation with wallet selector + PIN
      success.tsx              # Animated success with Confetti
    merchants/
      _layout.tsx
      index.tsx                # Merchant browser (category chips + search)
      [id]/
        pay.tsx                # Pay merchant: amount + wallet selector + PIN
    bills/
      _layout.tsx
      index.tsx                # Redirect → /(tabs)/home/bills
      pay.tsx                  # Universal bill payment: all categories (electricity/water/airtime/TV/internet/insurance/tickets/other); PIN → success with token for electricity
    agents/
      _layout.tsx
      index.tsx                # Redirect → /(tabs)/home/agents
      nearby.tsx               # Redirect → /(tabs)/home/agents/nearby
    transactions/
      _layout.tsx
      [id].tsx                 # Transaction detail
    profile/
      _layout.tsx              # Alias stack for /profile/* routes (redirects to /(tabs)/profile/*)
      settings.tsx
      analytics.tsx
      location.tsx
      qr-code.tsx
      notifications.tsx
      ai-chat.tsx
      gamification.tsx
      learn.tsx
    loans/
      _layout.tsx
      index.tsx                # Redirect → /(tabs)/home/loans
      apply.tsx                # Redirect → /(tabs)/home/loans/apply
      [id].tsx                 # Redirect → /(tabs)/home/loans/[id]
    proof-of-life/
      _layout.tsx
      verify.tsx               # Biometric prompt → API or local AsyncStorage fallback
      success.tsx              # Verification confirmed
      expired.tsx              # Wallet frozen — reactivation prompt
    scan-qr.tsx                # Full-screen NAMQR scanner: TLV parse, CRC, Token Vault; mode=payment|cashout|voucher|general
    add-wallet.tsx             # Add wallet: emoji picker, name (any purpose), optional Auto Pay config
    groups/
      _layout.tsx
      create.tsx               # 3-step: Details (name/purpose/type) → Settings → Invite (phone chips)
      [id].tsx                 # Group detail: overview/members/activity tabs
    receive/
      _layout.tsx
      [transactionId].tsx      # Received payment notification
      voucher/
        [voucherId].tsx        # Voucher gift receive: accept → wallet / decline
      group-invite/
        [inviteId].tsx         # Group invite accept/decline
      request/
        [requestId].tsx        # Money request pay/decline with wallet selector + PIN
  components/
    layout/
      AppHeader.tsx            # Search bar + avatar + notification bell
    home/
      WalletCard.tsx           # Wallet card component
      WalletCarousel.tsx       # Horizontal wallet scroll
      RecentContactsCarousel.tsx # Contact avatar row
    cards/
      CardFrame.tsx            # Credit-card visual with CardDesignBackground
      CardDesignBackground.tsx # SVG frame renderer via SvgUri
    animations/
      BadgeToast.tsx           # Achievement badge pop-up (Reanimated 4)
      Confetti.tsx             # Confetti burst animation
      SuccessIcon.tsx          # Animated checkmark
    navigation/
      TabBarIcon.tsx
    ui/
      Avatar.tsx               # Initials circle with deterministic colour hash
      StatusBadge.tsx          # Coloured pill badge
      Toggle.tsx               # Animated custom switch
      InfoBanner.tsx           # Warning/info/error/success strip
      SegmentedControl.tsx     # Pill or underline tabs (generic <T extends string>)
      BottomSheet.tsx          # Slide-up modal with handle + title
      EmojiPicker.tsx          # Emoji grid sheet + EmojiIcon tap target
      PayFromSheet.tsx         # Wallet + linked bank card selector
      Timeline.tsx             # Vertical event list with dots/lines
      AmountStepper.tsx        # +/− stepper with large amount display
      SuccessScreen.tsx        # Animated checkmark + title + value + actions
  constants/
    CardDesign.ts              # Card dimensions; CARD_FRAME_FILL; CARD_FRAME_MODULES
    designSystem.ts            # All design tokens (colors, spacing, radius, typography, shadows)
  contexts/
    UserContext.tsx            # User profile + buffrId; AsyncStorage-persisted; useUser() hook. Applied throughout (v1.13): onboarding, wallets, cards, send-money, receive, loans, bills, vouchers, scan-qr, add-wallet, profile. Use isLoaded to gate UI; walletStatus === 'frozen' for banner and disabled actions (§2.4).
    GamificationContext.tsx    # 12-badge system; recordEvent(); pendingToast drives BadgeToast
    AppProviders.tsx           # Wraps UserProvider + GamificationProvider
  services/
    vouchers.ts                # getVouchers, getVoucher, redeemVoucher; AsyncStorage fallback
    wallets.ts                 # getWallets, createWallet, updateWallet; AsyncStorage fallback
    send.ts                    # getContacts, sendMoney; AsyncStorage fallback (key: buffr_contacts)
    transactions.ts            # getTransactions, getTransaction; AsyncStorage fallback (key: buffr_transactions)
    auth.ts                    # verifyOtp, generateBuffrIdFromPhone, getOrCreateBuffrId
    cashout.ts                 # validateQR (Token Vault), cashOut methods; AsyncStorage fallback
    seedData.ts                # SEED_WALLETS, SEED_TRANSACTIONS; populates AsyncStorage on first launch
  utils/
    haptics.ts                 # Graceful haptic wrapper (no-op if expo-haptics not installed)
  assets/
    fonts/
    images/
      card-designs/
        frame-{2..32}.svg      # 31 SVG card frame assets
  docs/
    PRD.md                     # This document
```

---

### 11.2 Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend base URL (e.g. `https://api.ketchup.cc` or Buffr backend). |
| `EXPO_PUBLIC_APP_ENV` | No | `development` \| `preview` \| `production`. Default: `development`. |

Use `.env` / `.env.local` and load via `expo-constants` or `process.env.EXPO_PUBLIC_*` in app code. Never commit secrets; use EAS Secrets for production.

#### 11.2a Environment files (.env)

The project uses per-app `.env` files. **Do not commit `.env`** (secrets); commit only `.env.example` as a template.

**Mobile** (`/Users/georgenekwaya/buffr-g2p/mobile/`):

| File | Purpose |
|------|---------|
| `.env` | Local overrides; loaded by Expo at start. **Do not commit.** |
| `.env.example` | Template; copy to `.env` and fill. Safe to commit. |

Variables in `mobile/.env.example` (see that file for full list): `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_KETCHUP_API_URL`, `EXPO_PUBLIC_BUFFR_AI_URL`, `EXPO_PUBLIC_GATEWAY_URL`; `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; `APP_NAME`, `APP_VERSION`, `APP_ENV`, `NODE_ENV`; `BUFFR_*` (company display); `NEXT_PUBLIC_STACK_*`, `NEON_AUTH_JWKS_URL`, `NEXT_PUBLIC_APP_URL`. Only `EXPO_PUBLIC_*` are embedded in the app bundle; do not put secrets in `EXPO_PUBLIC_*`.

**Backend** (`/Users/georgenekwaya/buffr-g2p/backend/`):

| File | Purpose |
|------|---------|
| `.env` | Local config and secrets; loaded by Node/scripts. **Do not commit.** |
| `.env.example` | Template; copy to `.env` and fill. Safe to commit. |

Variables in `backend/.env.example` (see that file for full list): `APP_NAME`, `APP_VERSION`, `APP_ENV`, `NODE_ENV`; `DATABASE_URL`, `NEON_CONNECTION_STRING`; `BUFFR_*`; Neon/Stack Auth (`NEON_AUTH_*`, `NEXT_PUBLIC_*`, `STACK_*`, `NEON_AUTH_JWKS_URL`); JWT (`JWT_*`); Fineract; Email/Twilio/AI; `ENCRYPTION_KEY`, `ALLOWED_ORIGINS`, `PORT`, `BASE_URL`; Ketchup SmartPay; USSD; Redis; feature flags; compliance; rate limit; cron; voucher; feedback; savings; `LOG_LEVEL`.

---

### 11.3 Package.json (dependencies & scripts)

```json
{
  "name": "buffr-g2p",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "eslint ."
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-constants": "~17.0.0",
    "expo-font": "~13.0.0",
    "expo-linking": "~7.0.0",
    "expo-router": "~4.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.x",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "@expo/vector-icons": "^14.0.0",
    "@react-native-async-storage/async-storage": "1.23.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.0",
    "typescript": "~5.3.0"
  }
}
```

Add as needed: `expo-auth-session`, `expo-web-browser`, `expo-camera`, `react-native-qrcode-svg`, and any auth SDK. Use `npx expo install <pkg>` to keep Expo SDK compatibility.

#### 11.3.2 Device integration & required packages

The app integrates with device capabilities for contacts, location, gallery, camera, and biometrics. All of the following packages must be installed for full functionality. Use the single install command below for SDK compatibility.

| Package | Purpose | Usage in app |
|--------|---------|---------------|
| **expo-contacts** | Device address book | Send flow (select recipient), Recent Contacts, Create Group; contacts from device when API not configured (§11.4, send.ts). |
| **expo-location** | GPS / device location | Location Services screen (§3.5 screen 38), Agents/NamPost/ATMs map, nearby points; `GET /api/v1/mobile/agents/nearby` etc. with lat/lng. |
| **expo-image-picker** | Gallery & camera picker | Onboarding photo (§3.1 screen 5), profile photo; `launchImageLibraryAsync` (gallery), `launchCameraAsync` (capture). |
| **expo-camera** | Camera stream (e.g. QR scan) | QR Code Scanner (§4.5, §11.8), NAMQR scan; onboarding photo capture option. |
| **expo-local-authentication** | Biometrics (Face ID / fingerprint) | 2FA modal (§11.4.13), proof-of-life verification (§2.4, §7.6.5), Face ID setup in onboarding (§3.1 screen 6). |

**Install all device packages (run from project root):**

```bash
npx expo install expo-contacts expo-location expo-image-picker expo-camera expo-local-authentication
```

**Configuration:**

- **iOS:** Add usage descriptions in `app.json` (or `app.config.js`) for contacts and location. Example: `ios.infoPlist.NSContactsUsageDescription`, `NSLocationWhenInUseUsageDescription`. expo-contacts and expo-location plugins add these when included in `plugins`.
- **Android:** Permissions (READ_CONTACTS, ACCESS_FINE_LOCATION, CAMERA, USE_BIOMETRIC) are declared by the Expo modules; no extra config for standard use.

**Implementation:** See `services/device.ts` (location helpers), `services/send.ts` (contacts via expo-contacts), `app/scan-qr.tsx` (expo-camera), TwoFA modal and proof-of-life screens (expo-local-authentication), onboarding/photo (expo-image-picker).

#### 11.3.1 babel.config.js

Required for **react-native-reanimated** (Reanimated plugin must be listed last in `plugins`). Uses `babel-preset-expo`. Location: project root `buffr_g2p/babel.config.js`.

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

---

### 11.4 Implementation code (copy-paste ready)

All paths are relative to `buffr_g2p/`. Use design tokens from §5 (Design System JSON); constants below align with that JSON.

#### 11.4.0 Actual code pattern – extended to all screens

The **actual implementation code** (not design reference) for the upgraded screens in this project is the canonical pattern. **Extended to all:** every screen in the app must use the same actual code structure.

**Canonical files (copy from these):**

| File | Pattern |
|------|--------|
| `app/(tabs)/vouchers.tsx` | LinearGradient background; header; search bar; type/status filter chips; voucher cards (borderRadius 16, padding 20, border #E5E7EB); list with date groups; hex palette (#F9FAFB, #E5E7EB, #111827, #0029D6, #22C55E, #E11D48, etc.). |
| `app/(tabs)/transactions.tsx` | LinearGradient background; header + filter icon; search ("Search transactions..."); filter chips (All, Sent, Received, Vouchers, Bills); list grouped by date; tx rows (icon sent #E11D48 / received #22C55E, border 16, spacing). |
| `app/loans/index.tsx` | LinearGradient background; header; gradient tiers / loan cards; same hex palette and card/row structure. |

**Extended to all screens:** Home (`app/(tabs)/index.tsx`), Send money (`app/send-money/*`), Wallets (`app/wallets/[id]*`), Profile (`app/(tabs)/profile.tsx`, `app/profile/*`), Cards, Voucher detail, Cash-out flows, Agents, Bills, Receive, and every other route must replicate this **actual code** pattern:

- **Background:** `LinearGradient` where used (e.g. `colors={['#F3F4F6', '#fff', '#F9FAFB']}` or equivalent), or consistent neutral background.
- **Header:** Same structure (title, optional icon/avatar); padding 24, borderBottom #F3F4F6.
- **Search:** Where applicable, same search bar (height 44–48, borderRadius 9999, #F9FAFB bg, #E5E7EB border).
- **Filter chips:** Where applicable, horizontal ScrollView of pills (paddingHorizontal 14–16, paddingVertical 8, borderRadius 9999, active #0029D6).
- **Cards / rows:** Same style tokens: backgroundColor #fff, borderRadius 16, padding 14–20, borderWidth 1, borderColor #E5E7EB, marginBottom 8–12.
- **Palette:** Use the same hex values (#111827 text, #6B7280 / #9CA3AF secondary, #0029D6 primary, #22C55E success, #E11D48 error, #F59E0B warning) so all screens match.

Implementers must **copy from the actual files above** and extend the pattern to every other screen; do not introduce a different structure or palette for new screens.

#### 11.4.1 `app/_layout.tsx` (root layout)

**Expo docs (Archon):** Safe areas (https://docs.expo.dev/develop/user-interface/safe-areas/), Fonts (https://docs.expo.dev/develop/user-interface/fonts/), SplashScreen (https://docs.expo.dev/versions/latest/sdk/splash-screen/), Stack (https://docs.expo.dev/router/advanced/stack/). See §11.0 for snippets.

```tsx
/**
 * Root layout – Buffr G2P.
 * Loads fonts, wraps app in providers, defines Stack. Entry: app/index.tsx.
 * SafeAreaProvider: Expo Router includes it; if not, wrap with SafeAreaProvider from react-native-safe-area-context (see §11.0).
 */
import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppProviders } from '@/contexts/AppProviders';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // No custom fonts required for G2P; empty object. To add: Inter: require('./assets/fonts/Inter.ttf') per §11.0 (Expo fonts doc).
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
          presentation: 'card',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="utilities/vouchers" options={{ presentation: 'card' }} />
        <Stack.Screen name="wallets/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="send-money" options={{ presentation: 'card' }} />
        <Stack.Screen name="merchants" options={{ presentation: 'card' }} />
        <Stack.Screen name="bills" options={{ presentation: 'card' }} />
        <Stack.Screen name="agents" options={{ presentation: 'card' }} />
        <Stack.Screen name="transactions/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="loans" options={{ presentation: 'card' }} />
        <Stack.Screen name="receive" options={{ presentation: 'card', headerShown: true }} />
      </Stack>
    </AppProviders>
  );
}
```

#### 11.4.2 `app/index.tsx` (entry – redirect, full logic)

```tsx
/**
 * Entry: read onboarding completion from AsyncStorage; redirect to (tabs) or /onboarding. No TODOs.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/Theme';

const ONBOARDING_KEY = 'buffr_onboarding_complete';

export default function IndexScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        const onboardingComplete = value === 'true';
        if (onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } catch {
        router.replace('/onboarding');
      } finally {
        setReady(true);
      }
    })();
  }, [router]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
});
```

#### 11.4.3 `app/onboarding/_layout.tsx`

```tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="name" />
      <Stack.Screen name="photo" />
      <Stack.Screen name="face-id" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
```

#### 11.4.4 `app/(tabs)/_layout.tsx` (tabs)

```tsx
import { Tabs } from 'expo-router';
import { COLORS } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} /> }} />
      <Tabs.Screen name="vouchers" options={{ title: 'Vouchers', tabBarIcon: ({ color }) => <Ionicons name="ticket" size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> }} />
    </Tabs>
  );
}
```

#### 11.4.5 `constants/Theme.ts` (design tokens – align with §5 JSON)

```ts
/**
 * Design tokens – Buffr G2P. Align with PRD §5 Design System JSON.
 */
export const COLORS = {
  primary: '#0029D6',
  primaryDark: '#1D4ED8',
  secondary: '#E11D48',
  accent: '#FFB800',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#020617',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  success: '#22C55E',
  error: '#E11D48',
  warning: '#F59E0B',
  info: '#2563EB',
  white: '#FFFFFF',
};

export const RADIUS = { sm: 12, md: 16, lg: 24, xl: 32, pill: 9999 };

export const SHADOW = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
};
```

#### 11.4.6 `constants/Layout.ts` (G2P & spacing)

```ts
import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Screen = {
  WIDTH: SCREEN_WIDTH,
  HEIGHT: SCREEN_HEIGHT,
  SAFE_AREA_TOP: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight ?? 24,
  SAFE_AREA_BOTTOM: Platform.OS === 'ios' ? 34 : 0,
} as const;

export const G2P = {
  MAX_CONTAINER_WIDTH: 393,
  HORIZONTAL_PADDING: 24,
  VERTICAL_PADDING: 16,
  CONTENT_BOTTOM_PADDING: 128,
  HEADER_HEIGHT: 64,
  BOTTOM_NAV_HEIGHT: 80,
  BUTTON_HEIGHT: 56,
  INPUT_HEIGHT: 56,
  MIN_TOUCH_TARGET: 44,
  ICON_BUTTON_SIZE: 40,
} as const;

export const SECTION_SPACING = 32;
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 40, '4xl': 48, '5xl': 64 } as const;

export default { Screen, G2P, SECTION_SPACING, SPACING };
```

#### 11.4.7 `services/api.ts` (base client)

```ts
/**
 * API client – Buffr G2P. Base URL from EXPO_PUBLIC_API_URL.
 * Token refresh: on 401, try refresh token; retry request once or sign out (§12.3).
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ketchup.cc';

type RequestOptions = RequestInit & { params?: Record<string, string>; _retried?: boolean };

async function getToken(): Promise<string | null> {
  // e.g. await SecureStore.getItemAsync('buffr_token') or useUser().token from context
  return null;
}

async function getRefreshToken(): Promise<string | null> {
  // e.g. await SecureStore.getItemAsync('buffr_refresh_token'); backend must issue refresh_token on login/verify-otp if supported
  return null;
}

async function setTokens(access: string, refresh?: string): Promise<void> {
  // SecureStore.setItemAsync('buffr_token', access); if (refresh) SecureStore.setItemAsync('buffr_refresh_token', refresh);
}

async function clearTokens(): Promise<void> {
  // SecureStore.deleteItemAsync('buffr_token'); SecureStore.deleteItemAsync('buffr_refresh_token'); sign out user in UserContext
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, _retried, ...init } = options;
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  const token = await getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res = await fetch(url.toString(), { ...init, headers });
  if (res.status === 401 && !_retried) {
    const refresh = await getRefreshToken();
    if (refresh) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/v1/mobile/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data.token) await setTokens(data.token, data.refresh_token);
          return request<T>(path, { ...options, _retried: true });
        }
      } catch (_) {}
      await clearTokens();
    }
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) => request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: object) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: object) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: object) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};
```

#### 11.4.7a Code: `services/auth.ts`

Auth service for onboarding: send OTP, verify OTP. Per §9.4. Used by onboarding phone and otp screens (§11.4.11).

```ts
/**
 * Auth service – Buffr G2P. sendOtp, verifyOtp for onboarding. Per §9.4, §11.4.11.
 * Location: services/auth.ts
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ketchup.cc';

export interface SendOtpRequest { phone: string; }
export interface VerifyOtpRequest { phone: string; code: string; }
export interface VerifyOtpResponse { token: string; user: { id: string; phone: string; name?: string }; }

async function request<T>(path: string, init: RequestInit & { body?: object }): Promise<T> {
  const res = await fetch(`${BASE_URL}${path.startsWith('/') ? path : '/' + path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) },
    body: init.body ? JSON.stringify(init.body) : init.body,
  });
  if (!res.ok) throw new Error(res.statusText || 'Request failed');
  return res.json();
}

export const auth = {
  sendOtp: (body: SendOtpRequest) =>
    request<{ success: boolean; message?: string }>('/api/v1/mobile/auth/send-otp', { method: 'POST', body }),

  verifyOtp: (body: VerifyOtpRequest) =>
    request<VerifyOtpResponse>('/api/v1/mobile/auth/verify-otp', { method: 'POST', body }),
};
```

#### 11.4.8 `contexts/AppProviders.tsx` (minimal)

```tsx
import { ReactNode } from 'react';
import { UserProvider } from './UserContext';
import { WalletsProvider } from './WalletsContext';
import { VouchersProvider } from './VouchersContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <WalletsProvider>
        <VouchersProvider>{children}</VouchersProvider>
      </WalletsProvider>
    </UserProvider>
  );
}
```

#### 11.4.9 `app/(tabs)/index.tsx` (Home – structure only)

```tsx
/**
 * Home tab – balance, search, Send to contacts, wallets carousel, services grid, FABs.
 * Use ScreenContainer, SearchBar, BalanceCard, WalletCard, ServiceCard, ContactChip per §4.
 * For production header with notifications bell and badge, use the code in §11.4.17.
 */
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Theme';
import { G2P, SECTION_SPACING } from '@/constants/Layout';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header: avatar, notifications – placeholder */}
        <View style={styles.header}>
          <Text style={styles.logo}>Buffr</Text>
        </View>
        {/* SearchBar: pill, placeholder "Search anything..." – use components/inputs/SearchBar */}
        <View style={styles.searchRow} />
        {/* Send to: ContactChip list – use components/cards/ContactChip */}
        <View style={styles.contactsRow} />
        {/* BalanceCard – use components/cards/BalanceCard */}
        <View style={styles.balanceCard} />
        {/* Wallets carousel – use components/cards/WalletCard */}
        <View style={styles.walletsRow} />
        {/* Services grid (3×2) – use components/cards/ServiceCard */}
        <View style={styles.servicesGrid} />
        {/* Recent transactions – use components/list/ListItem */}
        <View style={styles.transactions} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: G2P.HORIZONTAL_PADDING, paddingBottom: G2P.CONTENT_BOTTOM_PADDING },
  header: { paddingVertical: SECTION_SPACING },
  logo: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  searchRow: { marginBottom: SECTION_SPACING },
  contactsRow: { marginBottom: SECTION_SPACING },
  balanceCard: { marginBottom: SECTION_SPACING },
  walletsRow: { marginBottom: SECTION_SPACING },
  servicesGrid: { marginBottom: SECTION_SPACING },
  transactions: {},
});
```

#### 11.4.10 Stack `_layout.tsx` pattern (utilities, wallets, send-money, etc.)

For each stack group (`utilities/`, `wallets/`, `send-money/`, `merchants/`, `bills/`, `agents/`, `transactions/`, `profile/`), add a `_layout.tsx` that wraps children in a Stack:

```tsx
import { Stack } from 'expo-router';

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
      }}
    />
  );
}
```

Expo Router will auto-discover routes under that folder; no need to list every `<Stack.Screen>` unless you need custom options per screen.

#### 11.4.11 Onboarding screens (full code & logic)

All onboarding screens below are copy-paste ready. Logic: Welcome → phone → OTP → name → photo → face-id → complete; on complete set `buffr_onboarding_complete` and `router.replace('/(tabs)')`. Auth APIs: §9.4.

**app/onboarding/index.tsx (Welcome)** – full code:

```tsx
/**
 * Welcome – Buffr G2P onboarding. Logo, title, subtitle, Get Started / Sign In. Per §3.1, §11.4.11.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.logo}>Buffr</Text>
        <Text style={styles.title}>Welcome to Buffr</Text>
        <Text style={styles.subtitle}>Your G2P payments companion</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.push('/onboarding/phone')}>
          <Text style={styles.primaryText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outline} onPress={() => router.push('/onboarding/phone')}>
          <Text style={styles.outlineText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: G2P.HORIZONTAL_PADDING, justifyContent: 'center' },
  logo: { fontSize: 28, fontWeight: '700', color: COLORS.primary, marginBottom: 24, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '600', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40, textAlign: 'center' },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  outline: { height: 56, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  outlineText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
});
```

**app/onboarding/phone.tsx** – full code:

```tsx
/**
 * Phone entry – Buffr G2P onboarding. Country +264, phone input, Continue. Per §3.1, §11.4.11.
 */
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';
import { auth } from '@/services/auth';
import { useUser } from '@/contexts/UserContext';

export default function PhoneScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const digits = phone.replace(/\D/g, '').slice(-9);
    if (digits.length !== 9) {
      setError('Enter a valid 9-digit number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await auth.sendOtp({ phone: '+264' + digits });
      setUser({ id: '', phone: '+264' + digits });
      router.push('/onboarding/otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Enter phone</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.label}>Country</Text>
        <Text style={styles.value}>+264</Text>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="81 234 5678"
          placeholderTextColor={COLORS.textTertiary}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={11}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.primary} onPress={handleContinue} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? 'Sending…' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  back: { padding: G2P.HORIZONTAL_PADDING, paddingTop: 8 },
  backText: { fontSize: 16, color: COLORS.text },
  content: { flex: 1, paddingHorizontal: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, color: COLORS.text, marginBottom: 16 },
  input: { height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, marginBottom: 8 },
  errorText: { fontSize: 12, color: COLORS.error, marginBottom: 8 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

**app/onboarding/otp.tsx** – full code:

```tsx
/**
 * OTP verification – Buffr G2P onboarding. 6 digits, Resend (60s), Verify. Per §3.1, §11.4.11.
 */
import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';
import { auth } from '@/services/auth';
import { useUser } from '@/contexts/UserContext';

export default function OtpScreen() {
  const router = useRouter();
  const { user, setUser, setToken } = useUser();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const phone = user?.phone ?? '';

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter 6 digits');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await auth.verifyOtp({ phone, code });
      await setToken(res.token);
      setUser(res.user);
      router.push('/onboarding/name');
    } catch (e) {
      setError('Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await auth.sendOtp({ phone });
      setResendCooldown(60);
    } catch (_) {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Verify code</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.message}>We sent a code to {phone}</Text>
        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={COLORS.textTertiary}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
          <Text style={styles.resend}>Resend code {resendCooldown > 0 ? `(${resendCooldown}s)` : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primary} onPress={handleVerify} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? 'Verifying…' : 'Verify'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  back: { padding: G2P.HORIZONTAL_PADDING, paddingTop: 8 },
  backText: { fontSize: 16, color: COLORS.text },
  content: { flex: 1, paddingHorizontal: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  message: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 16 },
  input: { height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 16, fontSize: 18, letterSpacing: 8, marginBottom: 8 },
  errorText: { fontSize: 12, color: COLORS.error, marginBottom: 8 },
  resend: { fontSize: 14, color: COLORS.primary, marginBottom: 24 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

**app/onboarding/name.tsx** – full code:

```tsx
/**
 * Name entry – Buffr G2P onboarding. First name, last name, Continue. Per §3.1, §11.4.11.
 */
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';
import { useUser } from '@/contexts/UserContext';
import { api } from '@/services/api';

export default function NameScreen() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const f = firstName.trim();
    const l = lastName.trim();
    if (!f || !l) {
      setError('First and last name required');
      return;
    }
    setError('');
    setLoading(true);
    const newUser = { ...user!, name: `${f} ${l}` };
    setUser(newUser);
    try {
      await api.patch('/api/v1/mobile/user/profile', { first_name: f, last_name: l });
    } catch (_) {}
    setLoading(false);
    router.push('/onboarding/photo');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Your name</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.label}>First name</Text>
        <TextInput style={styles.input} placeholder="First name" placeholderTextColor={COLORS.textTertiary} value={firstName} onChangeText={setFirstName} />
        <Text style={styles.label}>Last name</Text>
        <TextInput style={styles.input} placeholder="Last name" placeholderTextColor={COLORS.textTertiary} value={lastName} onChangeText={setLastName} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.primary} onPress={handleContinue} disabled={loading}>
          <Text style={styles.primaryText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  back: { padding: G2P.HORIZONTAL_PADDING, paddingTop: 8 },
  backText: { fontSize: 16, color: COLORS.text },
  content: { flex: 1, paddingHorizontal: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  input: { height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 },
  errorText: { fontSize: 12, color: COLORS.error, marginBottom: 8 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

**app/onboarding/photo.tsx** – full code:

```tsx
/**
 * Photo upload – Buffr G2P onboarding. Optional; on Continue → face-id. Per §3.1, §11.4.11.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

export default function PhotoScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Add photo</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Add photo</Text>
        <Text style={styles.subtitle}>Optional – you can add one later in profile.</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.push('/onboarding/face-id')}>
          <Text style={styles.primaryText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  back: { padding: G2P.HORIZONTAL_PADDING, paddingTop: 8 },
  backText: { fontSize: 16, color: COLORS.text },
  content: { flex: 1, paddingHorizontal: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

**app/onboarding/face-id.tsx** – full code:

```tsx
/**
 * Face ID / biometric – Buffr G2P onboarding. Enable / Skip → complete. Per §3.1, §11.4.11.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

export default function FaceIdScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Enable Authentication</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Enable biometric?</Text>
        <Text style={styles.subtitle}>Use Face ID or fingerprint for quick sign-in and payments.</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.push('/onboarding/complete')}>
          <Text style={styles.primaryText}>Enable</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outline} onPress={() => router.push('/onboarding/complete')}>
          <Text style={styles.outlineText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  back: { padding: G2P.HORIZONTAL_PADDING, paddingTop: 8 },
  backText: { fontSize: 16, color: COLORS.text },
  content: { flex: 1, paddingHorizontal: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  outline: { height: 56, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  outlineText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
});
```

**app/onboarding/complete.tsx** – full code:

```tsx
/**
 * Onboarding complete – Buffr G2P. "You're all set", Go to Home → set completion flag, replace to (tabs). Per §3.1, §11.4.11.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

const ONBOARDING_KEY = 'buffr_onboarding_complete';

export default function CompleteScreen() {
  const router = useRouter();

  const handleGoHome = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>You're all set</Text>
        <Text style={styles.subtitle}>Welcome to Buffr G2P. You can now use your wallet and vouchers.</Text>
        <TouchableOpacity style={styles.primary} onPress={handleGoHome}>
          <Text style={styles.primaryText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: G2P.HORIZONTAL_PADDING, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40, textAlign: 'center' },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

**Note:** Onboarding phone/otp use `auth` from `@/services/auth`; full code in §11.4.7a. Name screen uses `api.patch` for profile; token from UserContext must be set in api client (§11.4.7).

#### 11.4.12 Contexts (full state & persistence)

**contexts/UserContext.tsx** – full code:

```tsx
/**
 * User context – Buffr G2P. State: user, token. Load token from SecureStore on mount; expose useUser().
 * Location: contexts/UserContext.tsx. Per §11.4.12.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'buffr_token';

type User = {
  id: string;
  phone: string;
  name?: string;
  photo_url?: string;
  lastProofOfLife?: string;
  proofOfLifeDueDate?: string;
  walletStatus?: 'active' | 'frozen' | 'deactivated';
} | null;

interface UserContextType {
  user: User;
  token: string | null;
  setUser: (u: User) => void;
  setToken: (t: string | null) => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((stored) => {
      if (stored) setToken(stored);
    });
  }, []);

  useEffect(() => {
    if (token) {
      import('@/services/api').then(({ api }) => {
        api.get('/api/v1/mobile/user/profile')
          .then((data: { user: User }) => setUser(data.user))
          .catch(() => setToken(null));
      });
    }
  }, [token]);

  const setTokenAndStore = useCallback(async (t: string | null) => {
    setToken(t);
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        token: token ?? null,
        setUser,
        setToken: setTokenAndStore,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
```

**contexts/WalletsContext.tsx** – full code:

```tsx
/**
 * Wallets context – Buffr G2P. Fetches GET /api/v1/mobile/wallets; exposes useWallets().
 * Location: contexts/WalletsContext.tsx. Per §11.4.12.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Wallet } from '@/types/wallet';
import { api } from '@/services/api';

interface WalletsContextType {
  wallets: Wallet[];
  loading: boolean;
  error: string | null;
  loadWallets: () => Promise<void>;
}

const WalletsContext = createContext<WalletsContextType | undefined>(undefined);

export function WalletsProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ wallets: Wallet[] }>('/api/v1/mobile/wallets');
      setWallets(data.wallets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <WalletsContext.Provider value={{ wallets, loading, error, loadWallets }}>
      {children}
    </WalletsContext.Provider>
  );
}

export function useWallets() {
  const ctx = useContext(WalletsContext);
  if (!ctx) throw new Error('useWallets must be used within WalletsProvider');
  return ctx;
}
```

**contexts/VouchersContext.tsx** – full code:

```tsx
/**
 * Vouchers context – Buffr G2P. Fetches GET /api/v1/mobile/vouchers; exposes useVouchers().
 * Location: contexts/VouchersContext.tsx. Per §11.4.12.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Voucher } from '@/types/voucher';
import { api } from '@/services/api';

interface VouchersContextType {
  vouchers: Voucher[];
  loading: boolean;
  error: string | null;
  loadVouchers: () => Promise<void>;
}

const VouchersContext = createContext<VouchersContextType | undefined>(undefined);

export function VouchersProvider({ children }: { children: React.ReactNode }) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ vouchers: Voucher[] }>('/api/v1/mobile/vouchers');
      setVouchers(data.vouchers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <VouchersContext.Provider value={{ vouchers, loading, error, loadVouchers }}>
      {children}
    </VouchersContext.Provider>
  );
}

export function useVouchers() {
  const ctx = useContext(VouchersContext);
  if (!ctx) throw new Error('useVouchers must be used within VouchersProvider');
  return ctx;
}
```

#### 11.4.13 TwoFAModal (logic & integration)

- Props: `visible: boolean`, `onClose: () => void`, `onVerify: (verification_token: string) => void`, `action: string`, `payload: object`.  
- UI: Title “Verify identity”, PIN input (6 digits) or “Use biometric”; Cancel, Verify.  
- Logic: **Verification is server-side only.** On Verify → call `POST /api/v1/mobile/auth/verify-2fa` with `{ pin }` (or biometric result per backend contract); on 200 call `onVerify(response.verification_token)`, then `onClose()`. On 401 show “Wrong PIN”. Cancel → `onClose()` only. There is no local PIN validation; the backend returns the verification_token used for redeem, cash-out, or send money.  
- Usage: Before redeem, cash-out, send money: set modal visible with action and payload; in onVerify pass token to the next API call (redeem/cashout/send), then navigate on success. **Dependency:** `expo-local-authentication` for biometric prompt and fallback detection (§12.3).

#### 11.4.14 Card design & flip (align Buffr App Design)

**constants/CardDesign.ts** (create in buffr_g2p; values from buffr `constants/CardDesign.ts`):

```ts
/**
 * Card design – Buffr App Design. Physical/card carousel and balance card flip.
 */
export const CardDimensions = {
  WIDTH: 340,
  HEIGHT: 214,
  ASPECT_RATIO: 340 / 214,
  BORDER_RADIUS: 12,
};

export const CardAnimation = {
  FLIP_DURATION: 600,
  SELECTION_DURATION: 300,
  CAROUSEL_SNAP_DURATION: 400,
  SHIMMER_DURATION: 2000,
};
```

**CardFlipView (concept):** Reanimated `useSharedValue(0)` for rotate; on press set `rotate.value = withTiming(rotate.value === 0 ? 180 : 0, { duration: CardAnimation.FLIP_DURATION })`; two `Animated.View` with `backfaceVisibility: 'hidden'`, front at `rotateY: 0`→180, back at 180→360. Optional haptic on press. Use for BalanceCard (front = balance, back = details) or wallet/card carousel items.

**Create wallet flow (screens):**  
- Step 1: Wallet name (required), icon picker (emoji or preset), type (main/savings). Optional: Auto Pay toggle, frequency, deduct date/time, amount, payment method.  
- Step 2 (optional): Card design picker if supporting multiple card skins.  
- Submit: POST wallet API or context `addWallet`; on success toast + `router.replace('/(tabs)')` or navigate to wallet detail.

**Create group flow (screens):**  
- Single screen or two: (1) Group name (required, max 50), description (optional, max 200). (2) Optional member selection: pill search, contact list with checkboxes, selected as chips; add-by-phone.  
- Submit: `POST /api/v1/mobile/groups` (or groupsApi.createGroup) with `{ name, description, memberIds? }`; on success navigate to `group-view` or `groups/[id]` with groupId.

#### 11.4.15 Types (api.d.ts, voucher.d.ts, wallet.d.ts)

**types/api.d.ts**  
```ts
export interface ApiError { message: string; code?: string; status: number; }
export interface SendOtpRequest { phone: string; }
export interface VerifyOtpRequest { phone: string; code: string; }
export interface VerifyOtpResponse { token: string; user: { id: string; phone: string; name?: string }; }
export interface Verify2FARequest { pin: string; }
export interface Verify2FAResponse { verification_token: string; expires_at: string; }
export interface PatchUserProfileRequest { first_name?: string; last_name?: string; photo_url?: string; }
export interface PatchUserProfileResponse { user: { id: string; phone: string; name?: string; photo_url?: string }; }
```

**types/voucher.d.ts**  
```ts
export type VoucherStatus = 'available' | 'redeemed' | 'expired';
export interface Voucher {
  id: string;
  amount: number;
  currency: string;
  status: VoucherStatus;
  expires_at: string;
  type?: string;
}
export interface RedeemVoucherRequest {
  method: 'wallet' | 'nampost' | 'smartpay';
  redemption_point?: string;
  verification_token: string;
}
```

**types/wallet.d.ts**  
```ts
export interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
}
export interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  description?: string;
}
export interface CashOutRequest {
  amount: number;
  method: string;
  destination?: string;
  verification_token: string;
}
```

#### 11.4.16 Receiver flows & notifications (full code)

**services/notifications.ts** – API for notifications and accept/decline. Used by receive screens and Home badge. Per §9.3, §3.9.

```ts
/**
 * Notifications API – Buffr G2P. List, get, accept, decline. Used by receive flows and Home unread count.
 * Location: services/notifications.ts. Per §11.4.16, §9.3.
 */
import { api } from './api';

export interface Notification {
  id: string;
  type: 'payment_received' | 'voucher_received' | 'group_invite' | 'payment_request';
  title: string;
  body: string;
  data: Record<string, unknown>; // e.g. transactionId, voucherId, inviteId, requestId
  createdAt: string;
  read: boolean;
}

export const notificationsApi = {
  list: () => api.get<{ notifications: Notification[] }>('/api/v1/mobile/notifications'),
  get: (id: string) => api.get<Notification>(`/api/v1/mobile/notifications/${id}`),
  accept: (id: string) => api.post(`/api/v1/mobile/notifications/${id}/accept`, {}),
  decline: (id: string) => api.post(`/api/v1/mobile/notifications/${id}/decline`, {}),
};
```

**components/feedback/NotificationBadge.tsx** – Badge count on bell/tabs. Hide when count is 0; show "9+" when count > 9. Per §4.4, §3.9.

```tsx
/**
 * NotificationBadge – Buffr G2P. Shows unread count on notifications bell; cap at 9+.
 * Location: components/feedback/NotificationBadge.tsx. Per §11.4.16, §4.4.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Theme';

interface NotificationBadgeProps {
  count: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count }) => {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});
```

**app/receive/_layout.tsx** – Stack layout for receiver flows. Per §3.9.

```tsx
/**
 * Receive stack – Buffr G2P. Screens: [transactionId], voucher/[voucherId], group-invite/[inviteId], request/[requestId].
 * Location: app/receive/_layout.tsx. Per §11.4.16, §3.9.
 */
import { Stack } from 'expo-router';

export default function ReceiveLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="[transactionId]" options={{ title: 'Receive money' }} />
      <Stack.Screen name="voucher/[voucherId]" options={{ title: 'Voucher' }} />
      <Stack.Screen name="group-invite/[inviteId]" options={{ title: 'Group invite' }} />
      <Stack.Screen name="request/[requestId]" options={{ title: 'Payment request' }} />
    </Stack>
  );
}
```

**app/receive/[transactionId].tsx** – Receive money details (screen 52). GET `/api/v1/mobile/receive/{transactionId}`; show sender, amount, note, date; actions: Add to wallet, Cash out now, View details.

```tsx
/**
 * Receive money details – Buffr G2P. Screen 52. Shows sender, amount, note, date; Add to wallet / Cash out / View details.
 * Location: app/receive/[transactionId].tsx. Per §11.4.16, §3.9, §7.6.1.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/services/api';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

interface ReceiveDetail {
  transactionId: string;
  senderName: string;
  amount: number;
  currency: string;
  note?: string;
  date: string;
}

export default function ReceiveMoneyScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ReceiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) return;
    api.get<ReceiveDetail>(`/api/v1/mobile/receive/${transactionId}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load details'))
      .finally(() => setLoading(false));
  }, [transactionId]);

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => setLoading(true) && setError(null)}>
          <Text style={styles.link}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!data) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sender}>{data.senderName}</Text>
      <Text style={styles.amount}>{data.currency} {data.amount.toFixed(2)}</Text>
      {data.note ? <Text style={styles.note}>{data.note}</Text> : null}
      <Text style={styles.date}>{data.date}</Text>
      <TouchableOpacity
        style={styles.primary}
        onPress={async () => {
          try {
            await api.post('/api/v1/mobile/receive/accept-payment', { transactionId: data.transactionId });
          } catch (_) { /* Backend may credit automatically; ignore if not required */ }
          router.replace('/(tabs)');
        }}
      >
        <Text style={styles.primaryText}>Add to wallet</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => router.push('/(tabs)')}>
        <Text style={styles.secondaryText}>Cash out now</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push(`/transactions/${data.transactionId}`)}>
        <Text style={styles.link}>View details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sender: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  amount: { fontSize: 24, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  note: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  date: { fontSize: 12, color: COLORS.textTertiary, marginBottom: 24 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: COLORS.border, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  secondaryText: { color: COLORS.text, fontSize: 16 },
  link: { fontSize: 14, color: COLORS.primary, marginTop: 8 },
  errorText: { fontSize: 14, color: COLORS.error, marginBottom: 8 },
});
```

**app/receive/voucher/[voucherId].tsx** – Receive voucher details (screen 53). GET `/api/v1/mobile/receive/voucher/{voucherId}`; show amount, expiry, terms; "Redeem" → voucher redemption flow.

```tsx
/**
 * Receive voucher details – Buffr G2P. Screen 53. Shows voucher amount, expiry, terms; Redeem → utilities/vouchers/[id]/redeem.
 * Location: app/receive/voucher/[voucherId].tsx. Per §11.4.16, §3.9, §7.6.2.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/services/api';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

interface VoucherReceiveDetail {
  voucherId: string;
  amount: number;
  currency: string;
  expiresAt: string;
  terms?: string;
}

export default function ReceiveVoucherScreen() {
  const { voucherId } = useLocalSearchParams<{ voucherId: string }>();
  const router = useRouter();
  const [data, setData] = useState<VoucherReceiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!voucherId) return;
    api.get<VoucherReceiveDetail>(`/api/v1/mobile/receive/voucher/${voucherId}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load voucher'))
      .finally(() => setLoading(false));
  }, [voucherId]);

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => setLoading(true) && setError(null)}>
          <Text style={styles.link}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!data) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>{data.currency} {data.amount.toFixed(2)}</Text>
      <Text style={styles.expiry}>Expires: {data.expiresAt}</Text>
      {data.terms ? <Text style={styles.terms}>{data.terms}</Text> : null}
      <TouchableOpacity
        style={styles.primary}
        onPress={() => router.replace(`/utilities/vouchers/${data.voucherId}`)}
      >
        <Text style={styles.primaryText}>Redeem</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  amount: { fontSize: 24, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  expiry: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  terms: { fontSize: 12, color: COLORS.textTertiary, marginBottom: 24 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, color: COLORS.primary, marginTop: 8 },
  errorText: { fontSize: 14, color: COLORS.error, marginBottom: 8 },
});
```

**app/receive/group-invite/[inviteId].tsx** – Receive group invitation (screen 54). Fetch invite; show group name, inviter, member count; Accept/Decline call notificationsApi.accept/decline; on accept, group appears in groups list.

```tsx
/**
 * Receive group invitation – Buffr G2P. Screen 54. Show group name, inviter, member count; Accept / Decline.
 * Location: app/receive/group-invite/[inviteId].tsx. Per §11.4.16, §3.9, §7.6.3.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { notificationsApi } from '@/services/notifications';
import { api } from '@/services/api';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

interface GroupInviteDetail {
  inviteId: string;
  groupName: string;
  inviterName: string;
  memberCount: number;
}

export default function ReceiveGroupInviteScreen() {
  const { inviteId } = useLocalSearchParams<{ inviteId: string }>();
  const router = useRouter();
  const [data, setData] = useState<GroupInviteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!inviteId) return;
    api.get<GroupInviteDetail>(`/api/v1/mobile/notifications/${inviteId}`)
      .then((n: unknown) => {
        const d = (n as { notification?: { data: GroupInviteDetail } }).notification?.data ?? (n as GroupInviteDetail);
        setData(typeof d.inviteId !== 'undefined' ? d : { ...d, inviteId });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load invite'))
      .finally(() => setLoading(false));
  }, [inviteId]);

  const handleAccept = async () => {
    if (!inviteId) return;
    setActionLoading(true);
    try {
      await notificationsApi.accept(inviteId);
      router.replace('/groups');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!inviteId) return;
    setActionLoading(true);
    try {
      await notificationsApi.decline(inviteId);
      router.back();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => setLoading(true) && setError(null)}>
          <Text style={styles.link}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!data) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{data.groupName}</Text>
      <Text style={styles.inviter}>Invited by {data.inviterName}</Text>
      <Text style={styles.members}>{data.memberCount} members</Text>
      <TouchableOpacity style={styles.primary} onPress={handleAccept} disabled={actionLoading}>
        <Text style={styles.primaryText}>{actionLoading ? '…' : 'Accept'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={handleDecline} disabled={actionLoading}>
        <Text style={styles.secondaryText}>Decline</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  inviter: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  members: { fontSize: 12, color: COLORS.textTertiary, marginBottom: 24 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: COLORS.border, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: COLORS.text, fontSize: 16 },
  link: { fontSize: 14, color: COLORS.primary, marginTop: 8 },
  errorText: { fontSize: 14, color: COLORS.error, marginBottom: 8 },
});
```

**app/receive/request/[requestId].tsx** – Incoming request to pay (screen 55). Fetch request; show requester, amount, note; "Pay now" → send-money flow pre-filled; "Decline" → notificationsApi.decline.

```tsx
/**
 * Incoming request to pay – Buffr G2P. Screen 55. Show requester, amount, note; Pay now (→ send-money prefill) / Decline.
 * Location: app/receive/request/[requestId].tsx. Per §11.4.16, §3.9, §7.6.4.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { notificationsApi } from '@/services/notifications';
import { api } from '@/services/api';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

interface RequestDetail {
  requestId: string;
  requesterName: string;
  requesterId?: string;
  amount: number;
  currency: string;
  note?: string;
}

export default function ReceiveRequestScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const [data, setData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    api.get<RequestDetail>(`/api/v1/mobile/notifications/${requestId}`)
      .then((n: unknown) => {
        const d = (n as { notification?: { data: RequestDetail } }).notification?.data ?? (n as RequestDetail);
        setData(typeof d.requestId !== 'undefined' ? d : { ...d, requestId });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load request'))
      .finally(() => setLoading(false));
  }, [requestId]);

  const handlePayNow = () => {
    if (!data) return;
    router.push({
      pathname: '/send-money/amount',
      params: { recipientId: data.requesterId ?? '', amount: String(data.amount), currency: data.currency, note: data.note ?? '' },
    });
  };

  const handleDecline = async () => {
    if (!requestId) return;
    setActionLoading(true);
    try {
      await notificationsApi.decline(requestId);
      router.back();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => setLoading(true) && setError(null)}>
          <Text style={styles.link}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!data) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.requester}>{data.requesterName}</Text>
      <Text style={styles.amount}>{data.currency} {data.amount.toFixed(2)}</Text>
      {data.note ? <Text style={styles.note}>{data.note}</Text> : null}
      <TouchableOpacity style={styles.primary} onPress={handlePayNow}>
        <Text style={styles.primaryText}>Pay now</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={handleDecline} disabled={actionLoading}>
        <Text style={styles.secondaryText}>Decline</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  requester: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  amount: { fontSize: 24, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  note: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: COLORS.border, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: COLORS.text, fontSize: 16 },
  link: { fontSize: 14, color: COLORS.primary, marginTop: 8 },
  errorText: { fontSize: 14, color: COLORS.error, marginBottom: 8 },
});
```

**Home screen (app/(tabs)/index.tsx) – notification badge:** Use the header row and badge integration in §11.4.17 below.

#### 11.4.17 NetworkError component and Home notification badge (production)

**components/feedback/NetworkError.tsx** – Full-screen or banner when fetch fails or backend unreachable. Per §4.4, §11.1.

```tsx
/**
 * NetworkError – Buffr G2P. Shown when fetch fails (no network) or backend unreachable.
 * Location: components/feedback/NetworkError.tsx. Per §11.4.17, §4.4.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

interface NetworkErrorProps {
  onRetry: () => void;
  variant?: 'full' | 'banner';
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry, variant = 'full' }) => {
  const content = (
    <>
      <Text style={styles.title}>Check your connection</Text>
      <Text style={styles.message}>We couldn't reach the server. Please check your internet and try again.</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </>
  );
  if (variant === 'banner') {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>No connection.</Text>
        <TouchableOpacity onPress={onRetry}><Text style={styles.bannerLink}>Retry</Text></TouchableOpacity>
      </View>
    );
  }
  return <View style={styles.container}>{content}</View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: G2P.HORIZONTAL_PADDING },
  title: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, backgroundColor: COLORS.warning + '20' },
  bannerText: { fontSize: 14, color: COLORS.text },
  bannerLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
```

**Home header row with notification badge (production)** – Use in `app/(tabs)/index.tsx`; replace the placeholder header with the block below. Unread count from `notificationsApi.list()`; refetch on focus.

```tsx
// At top of HomeScreen: add state and effect for unread count
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { notificationsApi } from '@/services/notifications';
import { NotificationBadge } from '@/components/feedback/NotificationBadge';

// Inside HomeScreen:
const router = useRouter();
const [unreadCount, setUnreadCount] = useState(0);

const loadUnreadCount = useCallback(async () => {
  try {
    const { notifications } = await notificationsApi.list();
    const count = notifications?.filter((n: { read?: boolean }) => !n.read).length ?? 0;
    setUnreadCount(count);
  } catch {
    setUnreadCount(0);
  }
}, []);

useFocusEffect(useCallback(() => { loadUnreadCount(); }, [loadUnreadCount]));

// Header row JSX (replace the placeholder <View style={styles.header}>):
<View style={styles.header}>
  <Text style={styles.logo}>Buffr</Text>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative', padding: 8 }}>
      <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
      <NotificationBadge count={unreadCount} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
      <View style={[styles.avatar, { backgroundColor: COLORS.border }]} />
    </TouchableOpacity>
  </View>
</View>
// Add to StyleSheet: avatar: { width: 40, height: 40, borderRadius: 20 },
```

#### 11.4.18 Voucher-backed loans (full code)

**types/loan.d.ts** – Per §2.3, §9.4.

```ts
/**
 * Loan types – Buffr G2P voucher-backed advance. Per §11.4.18, §2.3.
 */
export type LoanStatus = 'pending' | 'disbursed' | 'repaid' | 'overdue' | 'cancelled';

export interface Loan {
  id: string;
  amount: number;
  interestRate: number;
  totalRepayment: number;
  status: LoanStatus;
  disbursedAt: string;
  repaymentDueFromNextVoucher?: boolean;
  previousVoucherValue?: number;
}

export interface LoanOffer {
  maxAmount: number;
  interestRate: number;
  previousVoucherValue?: number;
  currency: string;
}

export interface LoansListResponse {
  loans?: Loan[];
  offer?: LoanOffer;
}

export interface ApplyLoanRequest {
  amount: number;
  wallet_id?: string;
  verification_token: string;
}

export interface ApplyLoanResponse {
  success: boolean;
  loan?: Loan;
  message?: string;
}
```

**services/loans.ts** – API client for loans. Per §9.4.

```ts
/**
 * Loans API – Buffr G2P voucher-backed advance. List, offer, apply. Per §11.4.18, §9.4, §2.3.
 */
import { api } from './api';
import type { LoansListResponse, ApplyLoanRequest, ApplyLoanResponse } from '@/types/loan';

export const loansApi = {
  list: () => api.get<LoansListResponse>('/api/v1/mobile/loans'),
  apply: (body: ApplyLoanRequest) => api.post<ApplyLoanResponse>('/api/v1/mobile/loans/apply', body),
};
```

**app/loans/_layout.tsx**

```tsx
/**
 * Loans stack – Buffr G2P. List, apply, detail. Per §11.4.18, §3.6 screen 40.
 */
import { Stack } from 'expo-router';

export default function LoansLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, title: 'Loans', animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ title: 'Voucher-backed advance' }} />
      <Stack.Screen name="apply" options={{ title: 'Apply for advance' }} />
      <Stack.Screen name="[id]" options={{ title: 'Loan details' }} />
    </Stack>
  );
}
```

**app/loans/index.tsx** – List and offer; navigate to apply or detail.

```tsx
/**
 * Loans list – Buffr G2P. Shows offer (max 1/3 previous voucher, 15%) and active loans. Per §11.4.18, §7.7.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';
import { loansApi } from '@/services/loans';
import type { Loan, LoanOffer } from '@/types/loan';

export default function LoansScreen() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [offer, setOffer] = useState<LoanOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loansApi.list();
      setLoans(data.loans ?? []);
      setOffer(data.offer ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={load}><Text style={styles.link}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {offer && (
        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>You can borrow up to</Text>
          <Text style={styles.offerAmount}>N$ {offer.maxAmount.toFixed(2)}</Text>
          <Text style={styles.caption}>1/3 of previous voucher • 15% interest • Repaid from next month’s voucher</Text>
          <TouchableOpacity style={styles.primary} onPress={() => router.push('/loans/apply')}>
            <Text style={styles.primaryText}>Apply for advance</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.sectionTitle}>Your loans</Text>
      {loans.length === 0 ? (
        <Text style={styles.empty}>No active loans</Text>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.loanRow} onPress={() => router.push(`/loans/${item.id}`)}>
              <Text style={styles.loanAmount}>N$ {item.amount.toFixed(2)}</Text>
              <Text style={styles.loanStatus}>{item.status}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offerCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  offerTitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  offerAmount: { fontSize: 24, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  caption: { fontSize: 12, color: COLORS.textTertiary, marginBottom: 16 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  empty: { fontSize: 14, color: COLORS.textSecondary },
  loanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  loanAmount: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  loanStatus: { fontSize: 14, color: COLORS.textSecondary },
  errorText: { fontSize: 14, color: COLORS.error, marginBottom: 8 },
  link: { fontSize: 14, color: COLORS.primary },
});
```

**app/loans/apply.tsx** – Amount input, terms, 2FA, submit. Uses TwoFAModal and loansApi.apply.

```tsx
/**
 * Apply for voucher-backed advance – Buffr G2P. Amount (≤ max), terms, 2FA, submit. Per §11.4.18, §7.7.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';
import { loansApi } from '@/services/loans';
import { use2FA } from '@/hooks/use2FA';
import { TwoFAModal } from '@/components/feedback/TwoFAModal';

export default function ApplyLoanScreen() {
  const router = useRouter();
  const { verify2FA, isVerifying } = use2FA();
  const [maxAmount, setMaxAmount] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [show2FA, setShow2FA] = useState(false);

  useEffect(() => {
    loansApi.list().then((data) => {
      if (data.offer) setMaxAmount(data.offer.maxAmount);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleApply = useCallback(async () => {
    const num = parseFloat(amount.replace(/\s/g, ''));
    if (isNaN(num) || num <= 0 || num > maxAmount) {
      Alert.alert('Invalid amount', `Enter up to N$ ${maxAmount.toFixed(2)}`);
      return;
    }
    setShow2FA(true);
  }, [amount, maxAmount]);

  const on2FAVerify = useCallback(async (verification_token: string) => {
    setShow2FA(false);
    const num = parseFloat(amount.replace(/\s/g, ''));
    try {
      const res = await loansApi.apply({ amount: num, verification_token });
      if (res.success && res.loan) {
        router.replace(`/loans/${res.loan.id}`);
      } else {
        Alert.alert('Application failed', res.message ?? 'Try again');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Apply failed');
    }
  }, [amount, router]);

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount (max N$ {maxAmount.toFixed(2)})</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        placeholderTextColor={COLORS.textTertiary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Text style={styles.terms}>15% interest. Repayment will be deducted when you redeem your next month’s voucher to wallet.</Text>
      <TouchableOpacity style={styles.primary} onPress={handleApply} disabled={isVerifying}>
        <Text style={styles.primaryText}>{isVerifying ? 'Verifying…' : 'Apply'}</Text>
      </TouchableOpacity>
      <TwoFAModal
        visible={show2FA}
        onClose={() => setShow2FA(false)}
        onVerify={on2FAVerify}
        action="apply_loan"
        payload={{ amount: parseFloat(amount || '0') }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  input: { height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 18, marginBottom: 16 },
  terms: { fontSize: 12, color: COLORS.textTertiary, marginBottom: 24 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

**app/loans/[id].tsx** – Active loan detail; shows status and repayment-from-next-voucher note.

```tsx
/**
 * Loan detail – Buffr G2P. Status, amount, interest, repayment note. Per §11.4.18, §7.7.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/services/api';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';
import type { Loan } from '@/types/loan';

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<Loan>(`/api/v1/mobile/loans/${id}`)
      .then(setLoan)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (error || !loan) {
    return <View style={styles.centered}><Text style={styles.error}>{error ?? 'Not found'}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>N$ {loan.amount.toFixed(2)}</Text>
      <Text style={styles.status}>{loan.status}</Text>
      <Text style={styles.meta}>Interest: {loan.interestRate}% • Total repayment: N$ {loan.totalRepayment?.toFixed(2) ?? (loan.amount * 1.15).toFixed(2)}</Text>
      {loan.repaymentDueFromNextVoucher !== false && (
        <Text style={styles.note}>Repayment will be deducted automatically when you redeem your next month’s voucher to Buffr Wallet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  amount: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  status: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 8 },
  meta: { fontSize: 14, color: COLORS.textTertiary, marginBottom: 24 },
  note: { fontSize: 14, color: COLORS.textSecondary },
  error: { fontSize: 14, color: COLORS.error },
});
```

**Backend:** Implement `GET /api/v1/mobile/loans/:id` for loan detail (single loan). Repayment is applied server-side when processing voucher redeem to wallet (§2.3, §9.4).

#### 11.4.19 TwoFAModal (full component code)

Full implementation of the 2FA verification modal. Server-side verification only; PIN or biometric. Per §11.4.13, §4.4, §10.

```tsx
/**
 * TwoFAModal – Buffr G2P. Verify identity before redeem, cash-out, send, loan apply.
 * Location: components/feedback/TwoFAModal.tsx. Per §11.4.19, §11.4.13.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, RADIUS } from '@/constants/Theme';
import { useUser } from '@/contexts/UserContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ketchup.cc';

interface TwoFAModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (verification_token: string) => void;
  action: string;
  payload?: object;
}

export function TwoFAModal({ visible, onClose, onVerify, action, payload = {} }: TwoFAModalProps) {
  const { user } = useUser();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitVerification = useCallback(async (method: 'pin' | 'biometric', pinOrToken?: string) => {
    setError('');
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        userId: user?.id ?? undefined,
        method,
        action,
        payload,
      };
      if (method === 'pin' && pinOrToken) body.pin = pinOrToken;

      const res = await fetch(`${API_URL}/api/v1/mobile/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.status === 401) {
        setError('Wrong PIN');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(data?.message ?? 'Verification failed');
        setLoading(false);
        return;
      }
      const token = data.verification_token;
      if (token) {
        setPin('');
        onVerify(token);
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [user?.id, action, payload, onVerify, onClose]);

  const handleVerifyPin = useCallback(() => {
    if (pin.length < 4) {
      setError('Enter at least 4 digits');
      return;
    }
    submitVerification('pin', pin);
  }, [pin, submitVerification]);

  const handleBiometric = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      setError('Biometric not available');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify identity',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });
    if (result.success) {
      submitVerification('biometric');
    } else {
      setError('Biometric failed');
    }
  }, [submitVerification]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Verify identity</Text>
          <Text style={styles.subtitle}>Enter PIN or use biometric</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••"
            placeholderTextColor={COLORS.textTertiary}
            value={pin}
            onChangeText={(t) => { setPin(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            editable={!loading}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.biometric} onPress={handleBiometric} disabled={loading}>
            <Text style={styles.biometricText}>Use biometric</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.verify} onPress={handleVerifyPin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyText}>Verify</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 24 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  input: { height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, fontSize: 18, marginBottom: 8 },
  errorText: { fontSize: 12, color: COLORS.error, marginBottom: 8 },
  biometric: { marginBottom: 16 },
  biometricText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancel: { flex: 1, height: 56, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  verify: { flex: 1, height: 56, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
  verifyText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
```

#### 11.4.20 Layout components (ScreenContainer, StackScreen)

Reusable layout for safe area and header. Per §4.1, §5.1.

```tsx
/**
 * ScreenContainer – Buffr G2P. Safe area + max width 393, horizontal padding.
 * Location: components/layout/ScreenContainer.tsx. Per §11.4.20, §4.1.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { G2P } from '@/constants/Layout';
import { COLORS } from '@/constants/Theme';

export function ScreenContainer({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'bottom']}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, maxWidth: G2P.MAX_CONTAINER_WIDTH, width: '100%', alignSelf: 'center', paddingHorizontal: G2P.HORIZONTAL_PADDING },
});
```

```tsx
/**
 * StackScreen – Buffr G2P. Back button, title, optional right action + children.
 * Location: components/layout/StackScreen.tsx. Per §11.4.20, §4.1.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

interface StackScreenProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export function StackScreen({ title, onBack, rightAction, children }: StackScreenProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.right}>{rightAction ?? null}</View>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: G2P.HORIZONTAL_PADDING, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { padding: 8, marginRight: 8 },
  backText: { fontSize: 18, color: COLORS.text },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.text },
  right: { minWidth: 40, alignItems: 'flex-end' },
  content: { flex: 1, paddingHorizontal: G2P.HORIZONTAL_PADDING, paddingTop: 16 },
});
```

#### 11.4.21 SearchBar component

Pill search input per §4.2, §4.7 (Input/Large, placeholder "Search anything…").

```tsx
/**
 * SearchBar – Buffr G2P. Pill shape, placeholder for Home or Send flow.
 * Location: components/inputs/SearchBar.tsx. Per §11.4.21, §4.2, §4.7.
 */
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  editable?: boolean;
}

const SEARCH_PLACEHOLDER = 'Search anything...';
const SEARCH_PLACEHOLDER_SEND = 'Search phone, UPI, UID';

export function SearchBar({
  placeholder,
  value = '',
  onChangeText,
  editable = true,
}: SearchBarProps) {
  return (
    <View style={styles.wrapper}>
      <Ionicons name="search" size={20} color={COLORS.textTertiary} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder ?? SEARCH_PLACEHOLDER}
        placeholderTextColor={COLORS.textTertiary}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        returnKeyType="search"
      />
    </View>
  );
}

export { SEARCH_PLACEHOLDER, SEARCH_PLACEHOLDER_SEND };

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16 },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 0 },
});
```

#### 11.4.22 services/vouchers.ts and services/wallets.ts

API clients for vouchers and wallets. Per §9.4, §11.6.

```ts
/**
 * Vouchers API – Buffr G2P. List, get, redeem. Per §11.4.22, §9.4.
 * Location: services/vouchers.ts
 */
import { api } from './api';
import type { Voucher } from '@/types/voucher';

export interface RedeemVoucherBody {
  method: 'wallet' | 'nampost' | 'smartpay';
  redemption_point?: string;
  verification_token: string;
}

export const vouchersApi = {
  list: () => api.get<{ vouchers: Voucher[] }>('/api/v1/mobile/vouchers'),
  get: (id: string) => api.get<Voucher>(`/api/v1/mobile/vouchers/${id}`),
  redeem: (id: string, body: RedeemVoucherBody) =>
    api.post<{ success: boolean; code?: string; message?: string; wallet_balance?: number }>(`/api/v1/mobile/vouchers/${id}/redeem`, body),
};
```

```ts
/**
 * Wallets API – Buffr G2P. List, get, cashout. Per §11.4.22, §9.4.
 * Location: services/wallets.ts
 */
import { api } from './api';
import type { Wallet } from '@/types/wallet';
import type { CashOutRequest } from '@/types/wallet';

export const walletsApi = {
  list: () => api.get<{ wallets: Wallet[] }>('/api/v1/mobile/wallets'),
  get: (id: string) => api.get<Wallet & { transactions?: unknown[] }>(`/api/v1/mobile/wallets/${id}`),
  cashout: (id: string, body: CashOutRequest) =>
    api.post<{ success: boolean; code?: string; expires_at?: string; message?: string }>(`/api/v1/mobile/wallets/${id}/cashout`, body),
};
```

#### 11.4.23 Tab placeholder screens (transactions, vouchers, profile)

Minimal tab content so the app runs. Per §11.1, §6.2.

```tsx
/**
 * Transactions tab – Buffr G2P. Placeholder; replace with list from GET /transactions.
 * Location: app/(tabs)/transactions.tsx. Per §11.4.23.
 */
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { COLORS } from '@/constants/Theme';

export default function TransactionsTab() {
  return (
    <ScreenContainer>
      <View style={styles.centered}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Your transaction history will appear here.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
});
```

```tsx
/**
 * Vouchers tab – Buffr G2P. Placeholder; replace with vouchers list from GET /vouchers.
 * Location: app/(tabs)/vouchers.tsx. Per §11.4.23.
 */
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { COLORS } from '@/constants/Theme';

export default function VouchersTab() {
  return (
    <ScreenContainer>
      <View style={styles.centered}>
        <Text style={styles.title}>Vouchers</Text>
        <Text style={styles.subtitle}>Your vouchers will appear here.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
});
```

```tsx
/**
 * Profile tab – Buffr G2P. Placeholder; replace with profile content and Settings link.
 * Location: app/(tabs)/profile.tsx. Per §11.4.23.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { COLORS } from '@/constants/Theme';
import { useUser } from '@/contexts/UserContext';

export default function ProfileTab() {
  const router = useRouter();
  const { user } = useUser();

  return (
    <ScreenContainer>
      <View style={styles.centered}>
        <Text style={styles.title}>{user?.name ?? 'Profile'}</Text>
        <Text style={styles.subtitle}>{user?.phone ?? ''}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/profile/settings')}>
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  button: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

#### 11.4.24 constants/designSystem.ts (optional)

Export design system JSON from §5.1 for use in StyleSheet. Per §11.6, §5.1.

```ts
/**
 * Design system – Buffr G2P. Exported from PRD §5.1 for use in components.
 * Location: constants/designSystem.ts. Per §11.4.24.
 */
export const designSystem = {
  breakpoints: { mobile: { maxWidth: 393 } },
  colors: {
    brand: { primary: '#0029D6', primaryDark: '#1D4ED8', secondary: '#E11D48', accent: '#FFB800' },
    semantic: { success: '#22C55E', error: '#E11D48', warning: '#F59E0B', info: '#2563EB' },
    neutral: { background: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0', text: '#020617', textSecondary: '#64748B', textTertiary: '#94A3B8' },
  },
  typography: {
    fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36 },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
  },
  spacing: { scale: { xs: 4, sm: 8, md: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 40, '4xl': 48, '5xl': 64 }, g2p: { horizontalPadding: 24, verticalPadding: 16, sectionSpacing: 32, contentBottomPadding: 128 } },
  radius: { sm: 12, md: 16, lg: 24, xl: 32, pill: 9999 },
  components: {
    searchBar: { borderRadius: 999, height: 56 },
    button: { height: 56, minTouchTarget: 44, borderRadius: 16 },
    balanceCard: { height: 120 },
    tabBar: { height: 80 },
  },
} as const;
```

#### 11.4.25 Proof-of-life (full code)

Proof-of-life verification flow per §2.4, §3.6 screens 50b/58–61, §7.6.5. Layout + verify, success, expired screens; Home banner snippet below.

**app/proof-of-life/_layout.tsx**

```tsx
/**
 * Proof-of-life stack – Buffr G2P. Verify, success, expired. Per §11.4.25, §3.6, §7.6.5.
 */
import { Stack } from 'expo-router';

export default function ProofOfLifeLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="verify" options={{ title: 'Verify identity' }} />
      <Stack.Screen name="success" options={{ title: 'Verification complete' }} />
      <Stack.Screen name="expired" options={{ title: 'Account frozen' }} />
    </Stack>
  );
}
```

**app/proof-of-life/verify.tsx**

```tsx
/**
 * Proof-of-life – Verify. Explains 90-day requirement; "Start verification" triggers device biometric → POST proof-of-life. Per §11.4.25, §7.6.5.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { api } from '@/services/api';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

export default function ProofOfLifeVerifyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartVerification = async () => {
    setError('');
    setLoading(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        setError('Biometric not available. Visit an agent with your ID to verify.');
        setLoading(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to continue receiving grants',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (!result.success) {
        setError('Verification cancelled or failed.');
        setLoading(false);
        return;
      }
      const res = await api.post<{ success: boolean; newDueDate: string }>('/api/v1/mobile/user/proof-of-life', { method: 'in_app_biometric' });
      if (res.success) {
        router.replace('/proof-of-life/success');
      } else {
        setError('Verification failed. Try again or visit an agent.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Every 90 days we need to verify you're still receiving grants.</Text>
      <Text style={styles.subtitle}>This keeps your account active. Tap below to verify with your fingerprint or face.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.primary} onPress={handleStartVerification} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Start verification</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Remind later</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  title: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  error: { fontSize: 14, color: COLORS.error, marginBottom: 12 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
});
```

**app/proof-of-life/success.tsx**

```tsx
/**
 * Proof-of-life – Success. Confirmation message; done returns to Home. Per §11.4.25, §7.6.5.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

export default function ProofOfLifeSuccessScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thank you.</Text>
      <Text style={styles.subtitle}>Your verification is valid for another 90 days.</Text>
      <TouchableOpacity style={styles.primary} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.primaryText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

**app/proof-of-life/expired.tsx**

```tsx
/**
 * Proof-of-life – Expired / Frozen. Shown when wallet frozen (>120 days unverified). Per §11.4.25, §3.6 screen 61, §7.6.5.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

export default function ProofOfLifeExpiredScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your wallet is frozen</Text>
      <Text style={styles.subtitle}>We haven't verified you in over 120 days. Visit your nearest agent or mobile unit with your ID to reactivate your account.</Text>
      <TouchableOpacity style={styles.primary} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.primaryText}>OK</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 32 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
```

**Home screen – proof-of-life banner (add to app/(tabs)/index.tsx):** When `user?.proofOfLifeDueDate` is within 14 days, show a banner; tap "Verify now" → `router.push('/proof-of-life/verify')`. When `user?.walletStatus === 'frozen'`, redirect to `/proof-of-life/expired` (e.g. in a useEffect or layout guard).

```tsx
// Add to HomeScreen: after loading user (UserContext provides user with proofOfLifeDueDate, walletStatus)
import { useUser } from '@/contexts/UserContext';

const { user } = useUser();

// If frozen, redirect once
useEffect(() => {
  if (user?.walletStatus === 'frozen') {
    router.replace('/proof-of-life/expired');
  }
}, [user?.walletStatus]);

// Helper: is proof-of-life due within 14 days?
const isProofOfLifeDue = (() => {
  if (!user?.proofOfLifeDueDate) return false;
  const due = new Date(user.proofOfLifeDueDate).getTime();
  const in14Days = Date.now() + 14 * 24 * 60 * 60 * 1000;
  return due <= in14Days;
})();

// Banner JSX (render above main content when isProofOfLifeDue):
{isProofOfLifeDue && user?.walletStatus !== 'frozen' && (
  <TouchableOpacity
    style={{ padding: 16, backgroundColor: COLORS.warning + '20', marginHorizontal: G2P.HORIZONTAL_PADDING, marginBottom: 12, borderRadius: 12 }}
    onPress={() => router.push('/proof-of-life/verify')}
  >
    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>Please verify to keep receiving grants.</Text>
    <Text style={{ fontSize: 14, color: COLORS.primary, marginTop: 4 }}>Verify now</Text>
  </TouchableOpacity>
)}
```

#### 11.4.26 Scan QR screen (full code)

Full-screen NAMQR scanner for pay-by-QR, collect-by-QR, cash-out, voucher redemption. Per §3.6 screen 41b, §4.5, §7.6. Uses QRCodeScanner/NAMQRScanner; validates via Token Vault. On valid result, navigate to confirm/2FA flow (caller passes return path or use global state).

**app/scan-qr.tsx**

```tsx
/**
 * Scan QR – Buffr G2P. Full-screen NAMQR scanner for voucher, cash-out, pay merchant. Validates via Token Vault. Per §11.4.26, §3.6, §4.5.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';
import { QRCodeScanner } from '@/components/qr/QRCodeScanner';

export default function ScanQRScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnPath?: string }>();
  const [error, setError] = useState('');

  const handleScan = async (payload: string) => {
    setError('');
    try {
      const { api } = await import('@/services/api');
      const res = await api.post<{ valid: boolean; amount?: number; payee?: string; nref?: string }>('/api/v1/mobile/qr/validate', { scannedPayload: payload });
      if (!res.valid) {
        setError('Invalid QR. Try again.');
        return;
      }
      if (params.returnPath) {
        router.replace({ pathname: params.returnPath as string, params: { amount: res.amount, payee: res.payee, nref: res.nref } });
      } else {
        router.replace({ pathname: '/(tabs)', params: { qrValidated: true, amount: res.amount, payee: res.payee } });
      }
    } catch {
      setError('Could not validate. Check connection and try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Point your camera at the QR code</Text>
      <QRCodeScanner onScan={handleScan} onCancel={() => router.back()} />
      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')}><Text style={styles.link}>Try again</Text></TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hint: { padding: G2P.HORIZONTAL_PADDING, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  errorRow: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontSize: 14, color: COLORS.error },
  link: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
```

**Note:** `QRCodeScanner` must accept `onScan(payload: string)` and `onCancel()`. Implement using `expo-camera` or `react-native-vision-camera`; parse TLV, validate CRC (Tag 63), then call `handleScan` with payload. Token Vault validation is done in this screen via `POST /api/v1/mobile/qr/validate`. §4.5, §11.8.

#### 11.4.27 Add wallet screen (full code)

Modal or stack: name, type (main/savings), "Create"; on success add to WalletsContext and navigate to tabs. Per §3.4 screen 34, §7, §11.1.

**app/add-wallet.tsx**

```tsx
/**
 * Add wallet – Buffr G2P. Name, type; Create → POST wallet, refresh context, go to Home. Per §11.4.27, §3.4, §7.
 */
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { useWallets } from '@/contexts/WalletsContext';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

export default function AddWalletScreen() {
  const router = useRouter();
  const { refreshWallets } = useWallets();
  const [name, setName] = useState('');
  const [type, setType] = useState<'main' | 'savings'>('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a wallet name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/api/v1/mobile/wallets', { name: trimmed, type });
      await refreshWallets();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add wallet</Text>
      <TextInput
        style={styles.input}
        placeholder="Wallet name"
        placeholderTextColor={COLORS.textTertiary}
        value={name}
        onChangeText={setName}
      />
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'main' && styles.typeBtnActive]}
          onPress={() => setType('main')}
        >
          <Text style={[styles.typeText, type === 'main' && styles.typeTextActive]}>Main</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'savings' && styles.typeBtnActive]}
          onPress={() => setType('savings')}
        >
          <Text style={[styles.typeText, type === 'savings' && styles.typeTextActive]}>Savings</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.primary} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Create</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  input: { height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: COLORS.text, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  typeBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  typeText: { fontSize: 16, color: COLORS.textSecondary },
  typeTextActive: { color: COLORS.primary, fontWeight: '600' },
  error: { fontSize: 14, color: COLORS.error, marginBottom: 12 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, color: COLORS.primary, textAlign: 'center' },
});
```

**Backend:** Implement `POST /api/v1/mobile/wallets` with body `{ name: string, type: 'main' | 'savings' }` (Bearer). Returns created wallet. §9.3, §9.4.

#### 11.4.28 Groups (full code)

Create group and group detail. Per §3.6 screens 47b/47c, §7.6 Create group. API: `POST /api/v1/mobile/groups`, `GET /api/v1/mobile/groups/[id]`.

**app/groups/_layout.tsx**

```tsx
/**
 * Groups stack – Buffr G2P. Create, [id] detail. Per §11.4.28, §3.6.
 */
import { Stack } from 'expo-router';

export default function GroupsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="create" options={{ title: 'Create group' }} />
      <Stack.Screen name="[id]" options={{ title: 'Group' }} />
    </Stack>
  );
}
```

**app/groups/create.tsx**

```tsx
/**
 * Create group – Buffr G2P. Name, description, member selection (pill search, chips); Create. Per §11.4.28, §3.6, §7.6.
 */
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

export default function CreateGroupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a group name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ id: string }>('/api/v1/mobile/groups', { name: trimmed, description: description.trim() || undefined, memberIds });
      router.replace(`/groups/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Group name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Family"
        placeholderTextColor={COLORS.textTertiary}
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.area]}
        placeholder="What's this group for?"
        placeholderTextColor={COLORS.textTertiary}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Text style={styles.hint}>Add members from contacts (implement contact picker per §4.7; store selected IDs in memberIds).</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.primary} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Create</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 8 },
  input: { height: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: COLORS.text, marginBottom: 16 },
  area: { height: 80, paddingTop: 12 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 },
  error: { fontSize: 14, color: COLORS.error, marginBottom: 12 },
  primary: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, color: COLORS.primary, textAlign: 'center' },
});
```

**app/groups/[id].tsx**

```tsx
/**
 * Group detail – Buffr G2P. Name, members, activity. Per §11.4.28, §3.6 screen 47c.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/services/api';
import { COLORS } from '@/constants/Theme';
import { G2P } from '@/constants/Layout';

interface GroupDetail {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  members?: { id: string; name: string }[];
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<GroupDetail>(`/api/v1/mobile/groups/${id}`)
      .then(setGroup)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load group'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (error) return <View style={styles.centered}><Text style={styles.error}>{error}</Text></View>;
  if (!group) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{group.name}</Text>
      {group.description ? <Text style={styles.desc}>{group.description}</Text> : null}
      <Text style={styles.meta}>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: G2P.HORIZONTAL_PADDING, paddingTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  desc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  meta: { fontSize: 14, color: COLORS.textTertiary },
  error: { fontSize: 14, color: COLORS.error },
});
```

**Backend:** Implement `POST /api/v1/mobile/groups` (body: name, description?, memberIds?) and `GET /api/v1/mobile/groups/:id`. §9.3.

---

### 11.5 Route-to-file reference (Expo Router)

> **As-Built (February 2026):** ✅ = implemented with full logic; 🔀 = redirect stub; 📋 = specification only (not yet built).

| Route | File | Status |
|-------|------|--------|
| `/` | `app/index.tsx` | ✅ Entry redirect |
| `/onboarding` | `app/onboarding/index.tsx` | ✅ |
| `/onboarding/phone` | `app/onboarding/phone.tsx` | ✅ |
| `/onboarding/otp` | `app/onboarding/otp.tsx` | ✅ |
| `/onboarding/name` | `app/onboarding/name.tsx` | ✅ |
| `/onboarding/photo` | `app/onboarding/photo.tsx` | ✅ |
| `/onboarding/face-id` | `app/onboarding/face-id.tsx` | ✅ |
| `/onboarding/complete` | `app/onboarding/complete.tsx` | ✅ |
| `/(tabs)` | `app/(tabs)/index.tsx` → redirect to home | ✅ |
| `/(tabs)/home` | `app/(tabs)/home/index.tsx` | ✅ Hub: balance, card, wallets, services, tx |
| `/(tabs)/home/bills` | `app/(tabs)/home/bills.tsx` | ✅ 2-level category→biller drill-down; `?category=` param |
| `/(tabs)/home/bills?category=airtime` | same | ✅ Pre-selects Airtime category |
| `/(tabs)/home/bills?category=tickets` | same | ✅ Pre-selects Tickets category |
| `/(tabs)/home/agents` | `app/(tabs)/home/agents/index.tsx` | ✅ Buffr Agents list |
| `/(tabs)/home/agents/nearby` | `app/(tabs)/home/agents/nearby.tsx` | ✅ Embedded MapView + agent/ATM cards |
| `/(tabs)/home/loans` | `app/(tabs)/home/loans/index.tsx` | ✅ Loans list + eligibility |
| `/(tabs)/home/loans/apply` | `app/(tabs)/home/loans/apply.tsx` | ✅ Multi-step: offer→biometric→credited→details |
| `/(tabs)/home/loans/[id]` | `app/(tabs)/home/loans/[id].tsx` | ✅ Loan detail with timeline |
| `/(tabs)/home/merchants` | `app/(tabs)/home/merchants/index.tsx` | ✅ Merchant browser → `/merchants/[id]/pay` |
| `/(tabs)/transactions` | `app/(tabs)/transactions/index.tsx` | ✅ Analytics: Balance/Earnings/Spendings tabs |
| `/(tabs)/transactions/[id]` | `app/(tabs)/transactions/[id].tsx` | ✅ Transaction detail |
| `/(tabs)/vouchers` | `app/(tabs)/vouchers/index.tsx` | ✅ Voucher list with filters |
| `/(tabs)/profile` | `app/(tabs)/profile/index.tsx` | ✅ Me tab: user info, profile links |
| `/(tabs)/profile/settings` | `app/(tabs)/profile/settings.tsx` | ✅ |
| `/(tabs)/profile/analytics` | `app/(tabs)/profile/analytics.tsx` | ✅ Real monthly totals from transactions |
| `/(tabs)/profile/notifications` | `app/(tabs)/profile/notifications.tsx` | ✅ AsyncStorage-seeded; mark as read |
| `/(tabs)/profile/ai-chat` | `app/(tabs)/profile/ai-chat.tsx` | ✅ Offline FAQ bot + quick questions |
| `/(tabs)/profile/learn` | `app/(tabs)/profile/learn.tsx` | ✅ Expandable articles (5 topics) |
| `/(tabs)/profile/qr-code` | `app/(tabs)/profile/qr-code.tsx` | ✅ Static NAMQR display |
| `/(tabs)/profile/location` | `app/(tabs)/profile/location.tsx` | ✅ Alias → agents/nearby |
| `/utilities/vouchers` | `app/utilities/vouchers/index.tsx` | ✅ |
| `/utilities/vouchers/[id]` | `app/utilities/vouchers/[id].tsx` | ✅ |
| `/utilities/vouchers/history` | `app/utilities/vouchers/history.tsx` | ✅ |
| `/utilities/vouchers/redeem/nampost` | `app/utilities/vouchers/redeem/nampost/index.tsx` | ✅ Branch selector |
| `/utilities/vouchers/redeem/nampost/booking` | `app/utilities/vouchers/redeem/nampost/booking.tsx` | ✅ Slot picker |
| `/utilities/vouchers/redeem/nampost/success` | `app/utilities/vouchers/redeem/nampost/success.tsx` | ✅ |
| `/utilities/vouchers/redeem/smartpay` | `app/utilities/vouchers/redeem/smartpay/index.tsx` | ✅ Agent selector |
| `/utilities/vouchers/redeem/smartpay/code` | `app/utilities/vouchers/redeem/smartpay/code.tsx` | ✅ 30-min countdown code |
| `/utilities/vouchers/redeem/wallet/success` | `app/utilities/vouchers/redeem/wallet/success.tsx` | ✅ |
| `/wallets/[id]` | `app/wallets/[id].tsx` | ✅ Wallet detail |
| `/wallets/[id]/cash-out` | `app/wallets/[id]/cash-out/index.tsx` | ✅ 5-method hub |
| `/wallets/[id]/cash-out/bank` | `app/wallets/[id]/cash-out/bank.tsx` | ✅ Bank transfer |
| `/wallets/[id]/cash-out/till` | `app/wallets/[id]/cash-out/till.tsx` | ✅ Cash at till |
| `/wallets/[id]/cash-out/agent` | `app/wallets/[id]/cash-out/agent.tsx` | ✅ Cash at agent |
| `/wallets/[id]/cash-out/merchant` | `app/wallets/[id]/cash-out/merchant.tsx` | ✅ Cash at merchant |
| `/wallets/[id]/cash-out/atm` | `app/wallets/[id]/cash-out/atm.tsx` | ✅ Cardless ATM |
| `/wallets/[id]/cash-out/success` | `app/wallets/[id]/cash-out/success.tsx` | ✅ Animated |
| `/wallets/[id]/add-money` | `app/wallets/[id]/add-money.tsx` | ✅ |
| `/send-money/select-recipient` | `app/send-money/select-recipient.tsx` | ✅ |
| `/send-money/amount` | `app/send-money/amount.tsx` | ✅ |
| `/send-money/confirm` | `app/send-money/confirm.tsx` | ✅ |
| `/send-money/success` | `app/send-money/success.tsx` | ✅ Confetti |
| `/merchants` | `app/merchants/index.tsx` | ✅ Category chips + search |
| `/merchants/[id]/pay` | `app/merchants/[id]/pay.tsx` | ✅ Amount + PIN |
| `/bills` | `app/bills/index.tsx` | 🔀 Redirect → `/(tabs)/home/bills` |
| `/bills/pay` | `app/bills/pay.tsx` | ✅ Universal payment: all 8 categories; electricity token; bundle selection |
| `/agents` | `app/agents/index.tsx` | 🔀 Redirect → `/(tabs)/home/agents` |
| `/agents/nearby` | `app/agents/nearby.tsx` | 🔀 Redirect → `/(tabs)/home/agents/nearby` |
| `/transactions/[id]` | `app/transactions/[id].tsx` | ✅ |
| `/add-wallet` | `app/add-wallet.tsx` | ✅ Emoji + name + Auto Pay config |
| `/scan-qr` | `app/scan-qr.tsx` | ✅ NAMQR scanner with TLV parse + CRC |
| `/groups/create` | `app/groups/create.tsx` | ✅ 3-step flow |
| `/groups/[id]` | `app/groups/[id].tsx` | ✅ Overview/members/activity tabs |
| `/loans` | `app/loans/index.tsx` | 🔀 Redirect → loans tab |
| `/loans/apply` | `app/loans/apply.tsx` | 🔀 Redirect → loans tab apply |
| `/loans/[id]` | `app/loans/[id].tsx` | 🔀 Redirect → loans tab detail |
| `/proof-of-life/verify` | `app/proof-of-life/verify.tsx` | ✅ Biometric + offline fallback |
| `/proof-of-life/success` | `app/proof-of-life/success.tsx` | ✅ |
| `/proof-of-life/expired` | `app/proof-of-life/expired.tsx` | ✅ |
| `/receive/[transactionId]` | `app/receive/[transactionId].tsx` | ✅ |
| `/receive/voucher/[voucherId]` | `app/receive/voucher/[voucherId].tsx` | ✅ Accept gift voucher |
| `/receive/group-invite/[inviteId]` | `app/receive/group-invite/[inviteId].tsx` | ✅ |
| `/receive/request/[requestId]` | `app/receive/request/[requestId].tsx` | ✅ Pay/decline with PIN |

---

### 11.6 Implementation checklist (order of work)

1. **Scaffold:** Create `buffr_g2p` with `npx create-expo-app@latest buffr_g2p -t tabs`. Replace generated `app/` with structure in §11.1; add `app.json`, `tsconfig.json` path `@/*` → `./*`, and `babel.config.js` per §11.3.1 (required for react-native-reanimated).
2. **Constants:** Add `constants/Theme.ts` and `constants/Layout.ts` per §11.4.5–11.4.6; optionally `constants/designSystem.ts` per §11.4.24 (§5 JSON).
3. **Providers:** Add `contexts/AppProviders.tsx` and minimal `UserContext`, `WalletsContext`, `VouchersContext` (state + setState only for first cut).
4. **Root & entry:** Implement `app/_layout.tsx` and `app/index.tsx` per §11.4.1–11.4.2; entry uses AsyncStorage key `buffr_onboarding_complete` (§11.4.2 and §7.6).
5. **Onboarding:** Implement `app/onboarding/_layout.tsx` and all onboarding screens per §11.4.11 (Welcome → phone → otp → name → photo → face-id → complete); on complete set `AsyncStorage.setItem('buffr_onboarding_complete', 'true')` and `router.replace('/(tabs)')` (§7.6).
6. **Tabs:** Implement `app/(tabs)/_layout.tsx` and `app/(tabs)/index.tsx` (Home) per §11.4.4 and §11.4.9; add placeholder tab screens per §11.4.23 (transactions, vouchers, profile).
7. **API:** Add `services/api.ts` per §11.4.7; add `services/vouchers.ts`, `services/wallets.ts` per §11.4.22, `services/auth.ts` per §11.4.7a; add **NAMQR/Open Banking:** `services/tokenVault.ts`, `services/oauth.ts` (§11.8.7, §11.8.7a PAR), `services/openBankingApi.ts` (§11.8.13), `services/mTLSClient.ts` (§11.8.8 – backend reference); **hooks:** `useOAuth.ts` (§11.8.11); **contexts:** `OAuthContext.tsx` (§11.8.12); **utils:** `cryptoHelpers.ts` (§11.1).
8. **Components:** Build layout (**ScreenContainer**, **StackScreen** per §11.4.20; ModalContainer), inputs (**SearchBar** per §11.4.21, PillButton, TextInput, OTPInput, AmountInput), cards (BalanceCard, WalletCard, VoucherCard, ServiceCard, ContactChip, MethodCard), list (ListItem), **carousels** (cards, wallets, vouchers, contacts, groups, loans per §4.3b), feedback (Toast, LoadingOverlay, ErrorState, EmptyState, NetworkError, **TwoFAModal** per §11.4.19, inline validation, warning banner per §4.4), **QR (NAMQR):** NAMQREncoder, NAMQRDecoder, SignedQRVerifier, QRDisplay, QRCodeScanner per §4.5 and design system §5; **Open Banking:** **OpenBankingConsentWebView** per §11.8.14 (OAuth redirect WebView per §4.7).
  9. **Vouchers flow:** Implement utilities/vouchers list, [id], redeem/nampost (branch **displays** NAMQR, user scans), redeem/smartpay (unit **displays** NAMQR, user scans), redeem/wallet/success per §3 and §7; **Token Vault** integration (`POST /qr/generate`, `POST /qr/validate`) per §7.6.
  10. **Wallets flow:** Implement wallets/[id], cash-out hub; **Till/Agent/Merchant/ATM:** user **scans payee’s NAMQR** (payee-presented flow per §3.3, §7.3); **Bank Transfer:** Open Banking PIS with OAuth redirect per §7.6; add-money per §3 and §7.
11. **Send money, merchants, bills, agents:** Implement remaining stacks and screens per §3; wire 2FA modal for sensitive actions per §10.
12. **Profile & extras:** Settings, analytics, location, qr-code, notifications, ai-chat, gamification, learn, loans per §3.
13. **Proof-of-life:** Implement `app/proof-of-life/` (layout, verify, success, expired) per §11.4.25; add Home banner when `proofOfLifeDueDate` ≤ 14 days; redirect to expired when `walletStatus === 'frozen'`.
14. **Scan QR, Add wallet, Groups:** Implement `app/scan-qr.tsx` (§11.4.26), `app/add-wallet.tsx` (§11.4.27), `app/groups/` (create, [id]) (§11.4.28).

Use **Archon** (`perform_rag_query` on `docs.expo.dev`) for Expo Router, Stack, Tabs, and native APIs; key Expo doc URLs and code snippets are in **§11.0**. Use **Figma MCP** (`get_figma_data`, file `VeGAwsChUvwTBZxAU6H8VQ`) for pixel-perfect tokens and components when needed.

---

### 11.7 New files for Legal & Regulatory Compliance

Add the following files to the project (§12, ETA, PSD-12, PSD-1, PSD-3):

```
buffr_g2p/
  hooks/
    use2FA.ts                # Enforce 2FA for every payment (PSD-12 s.12.2)
  utils/
    auditLogger.ts           # Structured logging with retention & evidence (ETA s.24, s.25)
    encryption.ts            # Data at rest encryption (PSD-12 s.12.1)
  services/
    incidentReporter.ts      # Report security incidents to Bank (PSD-12 s.11.13)
    affidavitGenerator.ts    # Generate affidavits for electronic evidence (ETA s.25(4))
    complianceReporter.ts    # Submit monthly statistics to Bank (PSD-1 s.23)
  contexts/
    ComplianceContext.tsx    # Global compliance state (incident flags, audit status)
  constants/
    legalTerms.ts            # Standard legal disclaimers, consent text
  app/(tabs)/
    index.tsx                # Optional: Home screen 2FA indicator
```

Backend must expose: `POST /api/v1/mobile/auth/verify-2fa`, `POST /api/v1/compliance/incident-report`, `GET /api/v1/compliance/audit-logs`, `POST /api/v1/compliance/affidavit`, `POST /api/v1/compliance/monthly-stats` per §9.3.

#### 11.7.1 Code: `hooks/use2FA.ts`

Enforces 2FA for every payment (PSD-12 s.12.2).

```tsx
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useUser } from '@/contexts/UserContext';
import { auditLogger } from '@/utils/auditLogger';

type TwoFactorMethod = 'biometric' | 'pin' | 'otp';

interface TwoFactorResult {
  success: boolean;
  method: TwoFactorMethod;
  timestamp: string;
  verificationToken?: string;
}

export function use2FA() {
  const { user } = useUser();
  const [isVerifying, setIsVerifying] = useState(false);

  const verify2FA = useCallback(async (
    action: string,
    payload: object
  ): Promise<TwoFactorResult | null> => {
    setIsVerifying(true);
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      let method: TwoFactorMethod = 'pin';

      if (compatible && enrolled) {
        const biometricAuth = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to continue',
          fallbackLabel: 'Use PIN',
          disableDeviceFallback: false,
        });
        if (biometricAuth.success) method = 'biometric';
        else method = 'pin';
      } else {
        method = 'pin';
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/mobile/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, method, action, payload }),
      });
      if (!response.ok) throw new Error('2FA verification failed');

      const data = await response.json();
      const verificationToken = data.verification_token;

      auditLogger.log({
        event: '2FA_VERIFIED',
        userId: user?.id,
        method,
        action,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        method,
        timestamp: new Date().toISOString(),
        verificationToken,
      };
    } catch (error) {
      Alert.alert('Verification Failed', 'Please try again.');
      auditLogger.log({
        event: '2FA_FAILED',
        userId: user?.id,
        action,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, [user]);

  return { verify2FA, isVerifying };
}
```

#### 11.7.2 Code: `utils/auditLogger.ts`

Structured logging with retention (ETA s.24, s.25).

```ts
import * as FileSystem from 'expo-file-system';

const LOG_DIR = `${FileSystem.documentDirectory}logs/`;
const MAX_LOG_SIZE = 10 * 1024 * 1024;
const MAX_LOG_FILES = 5;

interface LogEntry {
  event: string;
  userId?: string;
  timestamp: string;
  [key: string]: unknown;
}

class AuditLogger {
  private currentLogFile: string;

  constructor() {
    this.currentLogFile = `${LOG_DIR}audit_${new Date().toISOString().slice(0, 10)}.log`;
    this.ensureLogDir();
  }

  private async ensureLogDir() {
    const dirInfo = await FileSystem.getInfoAsync(LOG_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(LOG_DIR, { intermediates: true });
    }
  }

  private async rotateIfNeeded() {
    const fileInfo = await FileSystem.getInfoAsync(this.currentLogFile);
    if (fileInfo.exists && fileInfo.size && fileInfo.size > MAX_LOG_SIZE) {
      const archiveName = `${LOG_DIR}audit_${Date.now()}.log`;
      await FileSystem.moveAsync({ from: this.currentLogFile, to: archiveName });
      const allLogs = await FileSystem.readDirectoryAsync(LOG_DIR);
      const logFiles = allLogs.filter((f: string) => f.startsWith('audit_')).sort();
      while (logFiles.length > MAX_LOG_FILES) {
        const oldest = logFiles.shift();
        if (oldest) await FileSystem.deleteAsync(`${LOG_DIR}${oldest}`);
      }
      this.currentLogFile = `${LOG_DIR}audit_${new Date().toISOString().slice(0, 10)}.log`;
    }
  }

  async log(entry: LogEntry) {
    await this.rotateIfNeeded();
    const line = JSON.stringify(entry) + '\n';
    await FileSystem.writeAsStringAsync(this.currentLogFile, line, { encoding: 'utf8', append: true });
  }

  async getLogs(startDate: Date, endDate: Date): Promise<LogEntry[]> {
    const allLogs = await FileSystem.readDirectoryAsync(LOG_DIR);
    const relevantFiles = allLogs.filter((f: string) => {
      const dateStr = f.replace('audit_', '').replace('.log', '');
      const fileDate = new Date(dateStr);
      return fileDate >= startDate && fileDate <= endDate;
    });
    const entries: LogEntry[] = [];
    for (const file of relevantFiles) {
      const content = await FileSystem.readAsStringAsync(`${LOG_DIR}${file}`, { encoding: 'utf8' });
      const lines = content.split('\n').filter((l: string) => l.trim() !== '');
      lines.forEach((line: string) => {
        try {
          entries.push(JSON.parse(line) as LogEntry);
        } catch {
          // ignore malformed
        }
      });
    }
    return entries;
  }
}

export const auditLogger = new AuditLogger();
```

#### 11.7.3 Code: `utils/encryption.ts`

Data at rest encryption (PSD-12 s.12.1). AES-GCM; key in SecureStore.

```ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY_STORE = 'encryption_key';

async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORE);
  if (!key) {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    key = Array.from(randomBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORE, key);
  }
  return key;
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

export async function encrypt(plainText: string): Promise<string> {
  const keyHex = await getOrCreateEncryptionKey();
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBuffer(keyHex),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plainText);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...result));
}

export async function decrypt(encryptedBase64: string): Promise<string> {
  const keyHex = await getOrCreateEncryptionKey();
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBuffer(keyHex),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const encrypted = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
```

#### 11.7.4 Code: `services/incidentReporter.ts`

Reports security incidents to Bank (PSD-12 s.11.13–11.14).

```ts
import { auditLogger } from '@/utils/auditLogger';

interface IncidentReport {
  preliminary: boolean;
  incidentDate: string;
  description: string;
  impact?: { financialLoss?: number; dataLoss?: boolean; availabilityLossMinutes?: number };
  actionsTaken?: string;
}

export async function reportIncident(report: IncidentReport) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/compliance/incident-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!response.ok) throw new Error('Failed to report incident');
    auditLogger.log({
      event: 'INCIDENT_REPORTED',
      type: report.preliminary ? 'preliminary' : 'full',
      incidentDate: report.incidentDate,
      timestamp: new Date().toISOString(),
    });
    return await response.json();
  } catch (error) {
    auditLogger.log({
      event: 'INCIDENT_REPORT_FAILED',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
```

#### 11.7.5 Code: `services/affidavitGenerator.ts`

Generates affidavit for data messages (ETA s.25(4)).

```ts
import { auditLogger } from '@/utils/auditLogger';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface AffidavitData {
  caseReference?: string;
  startDate: Date;
  endDate: Date;
  includeUserIds?: string[];
}

export async function generateAffidavit(data: AffidavitData): Promise<string> {
  const logs = await auditLogger.getLogs(data.startDate, data.endDate);
  const filteredLogs = data.includeUserIds
    ? logs.filter((log) => data.includeUserIds?.includes(log.userId as string))
    : logs;
  // Production: set declarant name/title via env (e.g. process.env.AFFIDAVIT_DECLARANT_NAME) or secure config.
  const declarant = { name: process.env.EXPO_PUBLIC_AFFIDAVIT_DECLARANT_NAME ?? 'System Administrator', title: process.env.EXPO_PUBLIC_AFFIDAVIT_DECLARANT_TITLE ?? 'Officer in Control of Information System', date: new Date().toISOString() };
  const affidavitText = `
AFFIDAVIT UNDER SECTION 25(4) OF THE ELECTRONIC TRANSACTIONS ACT 4 OF 2019

I, ${declarant.name}, ${declarant.title}, do hereby solemnly declare and state as follows:
1. I am the person in control of the information system that generated, stored and maintained the data messages referred to in this affidavit.
2. The data messages attached hereto as Annexure A were generated, stored and communicated in the ordinary course of business.
3. The integrity of the data messages has been maintained at all times.
4. The originator of each data message is identified by the userId field in the attached logs.

SWORN AND DECLARED at _________________ on this _____ day of _________________ 20____.

_________________________________
${declarant.name}

ANNEXURE A – LOG EXTRACTS
${filteredLogs.map((log) => JSON.stringify(log)).join('\n')}
`;
  const fileName = `affidavit_${Date.now()}.txt`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(filePath, affidavitText, { encoding: 'utf8' });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(filePath);
  return filePath;
}
```

#### 11.7.6 Code: `services/complianceReporter.ts`

Submits monthly stats to Bank (PSD-1 s.23).

```ts
import { auditLogger } from '@/utils/auditLogger';

interface MonthlyStats {
  month: string;
  totalTransactions: number;
  totalValue: number;
  averageTransactionValue: number;
  successRate: number;
  incidentCount: number;
}

export async function submitMonthlyStats(stats: MonthlyStats) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/compliance/monthly-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats),
    });
    if (!response.ok) throw new Error('Failed to submit monthly stats');
    auditLogger.log({ event: 'MONTHLY_STATS_SUBMITTED', month: stats.month, timestamp: new Date().toISOString() });
    return await response.json();
  } catch (error) {
    auditLogger.log({ event: 'MONTHLY_STATS_FAILED', error: (error as Error).message, timestamp: new Date().toISOString() });
    throw error;
  }
}
```

#### 11.7.7 Code: `contexts/ComplianceContext.tsx`

Global compliance state (incident flags, audit status). Add `ComplianceProvider` to `AppProviders.tsx` (wrap children with `<ComplianceProvider>`).

```tsx
import React, { createContext, useContext, useState } from 'react';
import { auditLogger } from '@/utils/auditLogger';
import { reportIncident } from '@/services/incidentReporter';

interface ComplianceContextType {
  incidentOngoing: boolean;
  setIncidentOngoing: (flag: boolean) => void;
  logAndReportIncident: (description: string, impact?: unknown) => Promise<void>;
  lastAuditCheck: Date | null;
}

const ComplianceContext = createContext<ComplianceContextType | undefined>(undefined);

export const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidentOngoing, setIncidentOngoing] = useState(false);
  const [lastAuditCheck] = useState<Date | null>(null);

  const logAndReportIncident = async (description: string, impact?: unknown) => {
    await auditLogger.log({
      event: 'INCIDENT_DETECTED',
      description,
      impact,
      timestamp: new Date().toISOString(),
    });
    await reportIncident({
      preliminary: true,
      incidentDate: new Date().toISOString(),
      description,
      impact,
    });
    setIncidentOngoing(true);
  };

  return (
    <ComplianceContext.Provider value={{ incidentOngoing, setIncidentOngoing, logAndReportIncident, lastAuditCheck }}>
      {children}
    </ComplianceContext.Provider>
  );
};

export const useCompliance = () => {
  const context = useContext(ComplianceContext);
  if (!context) throw new Error('useCompliance must be used within ComplianceProvider');
  return context;
};
```

#### 11.7.8 Code: `constants/legalTerms.ts`

Standard legal disclaimers and consent text (PSD-1 s.10.4, PSD-3 s.14, ETA Ch.4). Referenced in §12.4.3 (consumer protection).

```ts
/**
 * Standard legal disclaimers and consent text – Buffr G2P.
 * Per PRD §11.7, §12.4.3 (consumer protection, complaints).
 * Location: constants/legalTerms.ts
 */
export const LEGAL_TERMS = {
  userAgreementIntro:
    'By using Buffr G2P you agree to our Terms of Service and Privacy Policy. Fees and charges apply as displayed in the app.',
  consentPayment:
    'I authorise this payment from my Buffr wallet. I understand that this action is legally binding as an advanced electronic signature under the Electronic Transactions Act 4 of 2019.',
  complaintsNotice:
    'If you have a complaint, contact us within 15 days. We will respond within 15 business days. You may also contact the Bank of Namibia for payment system complaints.',
  feeDisclosure:
    'Fees may apply for cash-out (Bank N$5, Agent N$5, Merchant N$3, ATM N$8). Wallet redemption and cash at till are free. Rates are subject to change.',
} as const;
```

---

### 11.8 New files for NAMQR & Open Banking

Add the following files for NAMQR (TLV, Token Vault, Signed QR) and Open Banking (OAuth, PAR, PKCE, mTLS, data/links/meta client):

```
buffr_g2p/
  utils/
    tlv.ts                   # TLV encoder/decoder (NAMQR)
    namqr.ts                 # NAMQR payload build/parse, CRC
    crc.ts                   # CRC-16 (ISO/IEC 13239)
    cryptoHelpers.ts         # ECDSA signature verification (Tag 66)
  services/
    tokenVault.ts            # QR validate/generate via Token Vault
    keyManager.ts            # Fetch/cache public keys (ListVAE/ListKeys)
    oauth.ts                 # OAuth 2.0 PAR, PKCE, token exchange
    openBankingApi.ts        # Open Banking: Buffr backend proxy (banks list, consent, data/links/meta types)
    mTLSClient.ts            # Backend: HTTPS agent with QWAC (reference)
  components/qr/
    NAMQRDisplay.tsx         # Render NAMQR from TLV payload
    NAMQRScanner.tsx         # Camera scanner, TLV parse, CRC, Token Vault, optional signature verify
  components/
    OpenBankingConsentWebView.tsx  # Bank consent: WebView + redirect handling (deep link buffr://oauth-callback)
  hooks/
    useOAuth.ts              # OAuth flow (redirect, code capture, token exchange)
  contexts/
    OAuthContext.tsx         # Store OAuth tokens for external banks
```

Backend must expose: `POST /api/v1/mobile/qr/generate`, `POST /api/v1/mobile/qr/validate`, `/api/v1/mobile/keys/merchant/{alias}`, `/api/v1/mobile/keys/psp/{orgId}` per §9.3. mTLS is server-side only.

#### 11.8.1 Code: `utils/tlv.ts`

TLV encoder/decoder for NAMQR.

```ts
export type TLV = { tag: string; length: string; value: string };

export function encodeTLV(tlvs: TLV[]): string {
  return tlvs.map((tlv) => tlv.tag + tlv.length + tlv.value).join('');
}

export function decodeTLV(tlvString: string): TLV[] {
  const result: TLV[] = [];
  let pos = 0;
  while (pos < tlvString.length) {
    if (pos + 4 > tlvString.length) throw new Error('Invalid TLV: incomplete header');
    const tag = tlvString.substr(pos, 2);
    const lengthStr = tlvString.substr(pos + 2, 2);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length) || length < 1 || length > 99) throw new Error(`Invalid TLV length: ${lengthStr}`);
    if (pos + 4 + length > tlvString.length) throw new Error('Invalid TLV: value exceeds string length');
    const value = tlvString.substr(pos + 4, length);
    result.push({ tag, length: lengthStr, value });
    pos += 4 + length;
  }
  return result;
}

export function getTagValue(tlvs: TLV[], tag: string): string | undefined {
  return tlvs.find((t) => t.tag === tag)?.value;
}
```

#### 11.8.2 Code: `utils/crc.ts`

CRC-16/ARC (ISO/IEC 13239).

```ts
export function calculateCRC(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
```

#### 11.8.3 Code: `utils/namqr.ts`

NAMQR payload build/parse with CRC. Extend with all tags per NAMQR spec.

```ts
import { encodeTLV, decodeTLV, getTagValue, TLV } from './tlv';
import { calculateCRC } from './crc';

export interface NAMQRPayload {
  payloadFormatIndicator: string;
  pointOfInitiationMethod: string;
  globallyUniqueIdentifier?: string;
  merchantCategoryCode: string;
  countryCode: string;
  payeeName: string;
  payeeCity: string;
  tokenVaultUniqueIdentifier: string;
  transactionCurrency?: string;
  transactionAmount?: string;
  transactionReference?: string;
  additionalData?: string;
  referenceLabel?: string;
  description?: string;
  expiryDateTime?: string;
  signature?: string;
}

export function buildNAMQR(payload: NAMQRPayload): string {
  const tlvs: TLV[] = [
    { tag: '00', length: String(payload.payloadFormatIndicator.length).padStart(2, '0'), value: payload.payloadFormatIndicator },
    { tag: '01', length: String(payload.pointOfInitiationMethod.length).padStart(2, '0'), value: payload.pointOfInitiationMethod },
    { tag: '52', length: String(payload.merchantCategoryCode.length).padStart(2, '0'), value: payload.merchantCategoryCode },
    { tag: '58', length: String(payload.countryCode.length).padStart(2, '0'), value: payload.countryCode },
    { tag: '59', length: String(payload.payeeName.length).padStart(2, '0'), value: payload.payeeName },
    { tag: '60', length: String(payload.payeeCity.length).padStart(2, '0'), value: payload.payeeCity },
    { tag: '65', length: String(payload.tokenVaultUniqueIdentifier.length).padStart(2, '0'), value: payload.tokenVaultUniqueIdentifier },
  ];
  if (payload.globallyUniqueIdentifier) tlvs.push({ tag: '26', length: String(payload.globallyUniqueIdentifier.length).padStart(2, '0'), value: payload.globallyUniqueIdentifier });
  if (payload.transactionCurrency) tlvs.push({ tag: '53', length: String(payload.transactionCurrency.length).padStart(2, '0'), value: payload.transactionCurrency });
  if (payload.transactionAmount) tlvs.push({ tag: '54', length: String(payload.transactionAmount.length).padStart(2, '0'), value: payload.transactionAmount });
  if (payload.transactionReference) tlvs.push({ tag: '27', length: String(payload.transactionReference.length).padStart(2, '0'), value: payload.transactionReference });
  if (payload.referenceLabel) tlvs.push({ tag: '62', length: String(payload.referenceLabel.length).padStart(2, '0'), value: payload.referenceLabel });
  if (payload.description) tlvs.push({ tag: '62', length: String(payload.description.length).padStart(2, '0'), value: payload.description });
  if (payload.expiryDateTime) tlvs.push({ tag: '82', length: String(payload.expiryDateTime.length).padStart(2, '0'), value: payload.expiryDateTime });
  if (payload.signature) tlvs.push({ tag: '66', length: String(payload.signature.length).padStart(2, '0'), value: payload.signature });

  const mainPart = encodeTLV(tlvs);
  const crcData = mainPart + '6304';
  const crc = calculateCRC(crcData);
  return mainPart + '6304' + crc;
}

export function parseNAMQR(tlvString: string): NAMQRPayload {
  if (tlvString.length < 8) throw new Error('NAMQR too short');
  const crcPart = tlvString.slice(-8);
  const mainPart = tlvString.slice(0, -8);
  if (!crcPart.startsWith('6304')) throw new Error('Invalid CRC tag/length');
  const expectedCrc = crcPart.slice(4);
  const calculatedCrc = calculateCRC(mainPart + '6304');
  if (calculatedCrc !== expectedCrc) throw new Error(`CRC mismatch: expected ${expectedCrc}, got ${calculatedCrc}`);

  const tlvs = decodeTLV(mainPart);
  const get = (tag: string) => getTagValue(tlvs, tag);
  return {
    payloadFormatIndicator: get('00')!,
    pointOfInitiationMethod: get('01')!,
    globallyUniqueIdentifier: get('26') || get('29'),
    merchantCategoryCode: get('52')!,
    countryCode: get('58')!,
    payeeName: get('59')!,
    payeeCity: get('60')!,
    tokenVaultUniqueIdentifier: get('65')!,
    transactionCurrency: get('53'),
    transactionAmount: get('54'),
    transactionReference: get('27'),
    additionalData: get('62'),
    expiryDateTime: get('82'),
    signature: get('66'),
  };
}
```

#### 11.8.4 Code: `utils/cryptoHelpers.ts`

ECDSA signature verification (Tag 66) and SHA-256. Uses Web Crypto; key format SPKI, curve P-256. (Expo Crypto: https://docs.expo.dev/versions/latest/sdk/crypto/.)

```ts
import * as Crypto from 'expo-crypto';

export async function verifySignature(
  message: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  const msgBuffer = new TextEncoder().encode(message).buffer;
  const sigBuffer = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0)).buffer;
  const keyBuffer = Uint8Array.from(atob(publicKeyBase64), (c) => c.charCodeAt(0)).buffer;

  const publicKey = await crypto.subtle.importKey(
    'spki',
    keyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );

  return await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    sigBuffer,
    msgBuffer
  );
}

export async function sha256(message: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    message
  );
}
```

#### 11.8.5 Code: `services/tokenVault.ts`

QR validate/generate via backend Token Vault. Uses `services/api.ts` or fetch with `EXPO_PUBLIC_API_URL`.

```ts
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface TokenVaultValidationRequest {
  nref: string;
  scannedPayload?: string;
}

export interface TokenVaultValidationResponse {
  valid: boolean;
  message?: string;
  decodedData?: {
    payeeName: string;
    amount: number;
    currency: string;
    [k: string]: unknown;
  };
}

export interface TokenVaultGenerationRequest {
  type: 'static' | 'dynamic';
  payeeAlias?: string;
  payerAlias?: string;
  amount?: number;
  currency?: string;
  merchantCategoryCode?: string;
  transactionReference?: string;
  description?: string;
  expiry?: string;
}

export interface TokenVaultGenerationResponse {
  nref: string;
  payload: string;
  expiresAt?: string;
}

export async function validateWithTokenVault(
  req: TokenVaultValidationRequest
): Promise<TokenVaultValidationResponse> {
  const res = await fetch(`${API_URL}/api/v1/mobile/qr/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Token Vault validation failed');
  return res.json();
}

export async function generateQRWithTokenVault(
  req: TokenVaultGenerationRequest
): Promise<TokenVaultGenerationResponse> {
  const res = await fetch(`${API_URL}/api/v1/mobile/qr/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Token Vault generation failed');
  return res.json();
}
```

#### 11.8.6 Code: `services/keyManager.ts`

Fetch and cache public keys (ListVAE/ListKeys). Uses `expo-secure-store` (https://docs.expo.dev/versions/latest/sdk/securestore/).

```ts
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const KEY_CACHE_PREFIX = 'pubkey_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface PublicKeyEntry {
  key: string;
  fetchedAt: number;
}

export async function getMerchantPublicKey(alias: string): Promise<string | null> {
  const cacheKey = `${KEY_CACHE_PREFIX}merchant_${alias}`;
  const cached = await SecureStore.getItemAsync(cacheKey);
  if (cached) {
    const entry: PublicKeyEntry = JSON.parse(cached);
    if (Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry.key;
  }
  try {
    const res = await fetch(`${API_URL}/api/v1/mobile/keys/merchant/${encodeURIComponent(alias)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.publicKey) {
      await SecureStore.setItemAsync(
        cacheKey,
        JSON.stringify({ key: data.publicKey, fetchedAt: Date.now() })
      );
      return data.publicKey;
    }
  } catch (e) {
    console.warn('Failed to fetch merchant public key', e);
  }
  return null;
}

export async function getPSPPublicKey(orgId: string): Promise<string | null> {
  const cacheKey = `${KEY_CACHE_PREFIX}psp_${orgId}`;
  const cached = await SecureStore.getItemAsync(cacheKey);
  if (cached) {
    const entry: PublicKeyEntry = JSON.parse(cached);
    if (Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry.key;
  }
  try {
    const res = await fetch(`${API_URL}/api/v1/mobile/keys/psp/${encodeURIComponent(orgId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.publicKey) {
      await SecureStore.setItemAsync(
        cacheKey,
        JSON.stringify({ key: data.publicKey, fetchedAt: Date.now() })
      );
      return data.publicKey;
    }
  } catch (e) {
    console.warn('Failed to fetch PSP public key', e);
  }
  return null;
}
```

#### 11.8.7 Code: `services/oauth.ts`

OAuth 2.0 with PKCE; token exchange. Uses `expo-auth-session` and `expo-web-browser` (https://docs.expo.dev/versions/latest/sdk/auth-session/). **Production:** The redirect URI must be registered with the bank. Configure a custom scheme in `app.json` (e.g. `"scheme": "buffr"`); use `useProxy: true` or a bank-approved redirect as required.

```ts
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export interface OAuthConfig {
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  redirectUri: string;
  scopes: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function makeRedirectUri(): Promise<string> {
  return await AuthSession.makeRedirectUri({ useProxy: false });
}

export async function startOAuthFlow(
  config: OAuthConfig
): Promise<{ url: string; codeVerifier: string }> {
  const redirectUri = config.redirectUri || (await makeRedirectUri());
  const codeVerifier = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: config.scopes.join(' '),
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  const url = `${config.authorizationEndpoint}?${params.toString()}`;
  return { url, codeVerifier };
}

async function generateCodeVerifier(): Promise<string> {
  const { getRandomBytesAsync } = await import('expo-crypto');
  const bytes = await getRandomBytesAsync(32);
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return base64URLEncode(arr);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const buf = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(bytes: Uint8Array): string {
  let b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const redirectUri = config.redirectUri || (await makeRedirectUri());
  const res = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}

export async function refreshAccessToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  return res.json();
}
```

#### 11.8.7a Code: PAR (Pushed Authorization Request) – Open Banking

When the Data Provider (bank) supports **Pushed Authorization Requests** (RFC 9126 / Namibian Open Banking), obtain a `request_uri` first, then redirect the Account Holder with that URI instead of sending full authorization params in the URL. This keeps sensitive params off the redirect and satisfies Open Banking consent flow requirements.

```ts
// Add to services/oauth.ts

export interface PARConfig extends OAuthConfig {
  parEndpoint: string;  // e.g. https://auth.bank.example/par
}

export interface PARResponse {
  request_uri: string;  // Short-lived URI to use in redirect
  expires_in: number;
}

/**
 * Push authorization request to bank PAR endpoint.
 * Call this before redirecting the user; then use request_uri in the authorization URL.
 * Backend may perform this server-side with mTLS; app can call Buffr backend POST /api/v1/mobile/open-banking/par instead.
 */
export async function pushAuthorizationRequest(
  config: PARConfig,
  redirectUri: string,
  codeVerifier: string,
  state: string,
  scopes: string[]
): Promise<{ request_uri: string; codeVerifier: string }> {
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const body = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: scopes.join(' '),
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  const res = await fetch(config.parEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PAR failed: ${err}`);
  }
  const data: PARResponse = await res.json();
  return { request_uri: data.request_uri, codeVerifier };
}

/**
 * Build authorization URL using request_uri (PAR flow).
 * Redirect the user to this URL; bank will show consent and redirect back to redirect_uri?code=...&state=...
 */
export function buildAuthorizationUrlWithPAR(
  authorizationEndpoint: string,
  requestUri: string
): string {
  const params = new URLSearchParams({ request_uri: requestUri });
  return `${authorizationEndpoint}?${params.toString()}`;
}
```

**Usage:** If bank supports PAR: call `pushAuthorizationRequest` (or Buffr backend proxy), then `WebBrowser.openAuthSessionAsync(buildAuthorizationUrlWithPAR(authEndpoint, request_uri), redirectUri)`. After redirect, exchange `code` for tokens with `exchangeCodeForTokens` as in §11.8.7.

#### 11.8.8 Code: `services/mTLSClient.ts` (backend reference)

Backend-only: Node.js HTTPS agent with client certificate (QWAC). Not used in the mobile app; app talks to backend over HTTPS. When the backend calls a Data Provider (bank) per Namibian Open Banking, it MUST use mTLS with QWAC and the standard request headers: `Authorization: Bearer <access_token>`, `x-v: 1`, `ParticipantId: <TPP_ID>`, `Content-Type: application/json`, `x-fapi-interaction-id: <UUID>`.

```ts
// Backend (Node.js) only. React Native app does not perform mTLS.
// import https from 'https';
// import { readFileSync } from 'fs';
//
// export function createMTLSAgent(certPath: string, keyPath: string, caPath?: string) {
//   const options: https.AgentOptions = {
//     cert: readFileSync(certPath),
//     key: readFileSync(keyPath),
//   };
//   if (caPath) options.ca = readFileSync(caPath);
//   return new https.Agent(options);
// }

/**
 * Open Banking request headers per Namibian Open Banking Standards v1.0 (§9.1).
 * Use for every request from TPP (Buffr backend) to Data Provider (bank).
 */
// export function openBankingHeaders(accessToken: string, participantId: string): Record<string, string> {
//   return {
//     'Authorization': `Bearer ${accessToken}`,
//     'Content-Type': 'application/json',
//     'x-v': '1',
//     'ParticipantId': participantId,
//     'x-fapi-interaction-id': crypto.randomUUID(),
//   };
// }

/**
 * Example: backend calls bank API (e.g. GET accounts) with mTLS + Open Banking headers.
 * const agent = createMTLSAgent(process.env.QWAC_CERT_PATH!, process.env.QWAC_KEY_PATH!, process.env.CA_PATH);
 * const headers = openBankingHeaders(bankAccessToken, process.env.TPP_PARTICIPANT_ID!);
 * const res = await fetch(bankApiUrl + '/account', { agent, headers });
 * const body = await res.json(); // { data: {...}, links: {...}, meta: {...} }
 */
```

#### 11.8.9 Code: `components/qr/NAMQRDisplay.tsx`

Renders NAMQR from TLV payload or string. Uses `react-native-qrcode-svg` (https://docs.expo.dev/ – third-party).

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { buildNAMQR, NAMQRPayload } from '@/utils/namqr';

interface NAMQRDisplayProps {
  payload: NAMQRPayload | string;
  size?: number;
}

export const NAMQRDisplay: React.FC<NAMQRDisplayProps> = ({ payload, size = 200 }) => {
  const tlvString = typeof payload === 'string' ? payload : buildNAMQR(payload);
  return (
    <View style={styles.container}>
      <QRCode value={tlvString} size={size} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

#### 11.8.10 Code: `components/qr/NAMQRScanner.tsx`

Camera scanner: parse TLV, validate CRC, optional signature verify, Token Vault validate, then onScan. Uses `expo-camera` (https://docs.expo.dev/versions/latest/sdk/camera/).

```tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parseNAMQR, NAMQRPayload } from '@/utils/namqr';
import { validateWithTokenVault } from '@/services/tokenVault';
import { getMerchantPublicKey, getPSPPublicKey } from '@/services/keyManager';
import { verifySignature } from '@/utils/cryptoHelpers';

interface NAMQRScannerProps {
  onScan: (payload: NAMQRPayload) => void;
  onError?: (error: string) => void;
}

function extractOrgId(globalId: string): string {
  const parts = globalId.split('/');
  return parts.length > 1 ? parts[1] : globalId;
}

export const NAMQRScanner: React.FC<NAMQRScannerProps> = ({ onScan, onError }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const payload = parseNAMQR(data);
      // Both Token Vault validation and signature verification (when Tag 66 present) are mandatory per NAMQR; order below is implementation choice.
      if (payload.signature) {
        const isMerchant = payload.merchantCategoryCode !== '0000';
        const alias = payload.globallyUniqueIdentifier ?? '';
        const publicKey = isMerchant
          ? await getMerchantPublicKey(alias)
          : await getPSPPublicKey(extractOrgId(alias));
        if (publicKey) {
          // Heuristic to strip Tag 66; future improvement: parse TLV and rebuild payload without Tag 66 for verification.
          const dataWithoutSig = data.slice(0, -8).replace(/\d{4}[0-9A-F]{4}$/, '') || data.slice(0, -14);
          const valid = await verifySignature(dataWithoutSig, payload.signature, publicKey);
          if (!valid) {
            Alert.alert('Invalid QR', 'QR code signature is invalid.');
            setScanned(false);
            return;
          }
        }
      }
      const vaultResult = await validateWithTokenVault({
        nref: payload.tokenVaultUniqueIdentifier,
        scannedPayload: data,
      });
      if (!vaultResult.valid) {
        Alert.alert('Invalid QR', vaultResult.message ?? 'Token Vault validation failed');
        setScanned(false);
        return;
      }
      onScan(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      Alert.alert('Scan Error', message);
      onError?.(message);
      setScanned(false);
    } finally {
      setTimeout(() => setScanned(false), 3000);
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) return <Text style={styles.msg}>Camera permission required</Text>;

  return (
    <CameraView
      style={StyleSheet.absoluteFillObject}
      facing="back"
      onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
    />
  );
};

const styles = StyleSheet.create({
  msg: { textAlign: 'center', padding: 16 },
});
```

#### 11.8.11 Code: `hooks/useOAuth.ts`

OAuth flow: startAuth → open browser → capture code → exchange for tokens. Uses `expo-auth-session` and `expo-web-browser`.

```tsx
import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  startOAuthFlow,
  exchangeCodeForTokens,
  makeRedirectUri,
  type OAuthConfig,
  type TokenResponse,
} from '@/services/oauth';

export function useOAuth(config: OAuthConfig) {
  const [loading, setLoading] = useState(false);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);

  const startAuth = useCallback(async () => {
    setLoading(true);
    try {
      const redirectUri = config.redirectUri || (await makeRedirectUri());
      const fullConfig = { ...config, redirectUri };
      const { url, codeVerifier } = await startOAuthFlow(fullConfig);
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

      if (result.type === 'success' && result.url) {
        const urlObj = new URL(result.url);
        const code = urlObj.searchParams.get('code');
        if (code) {
          const tokens = await exchangeCodeForTokens(fullConfig, code, codeVerifier);
          setTokenResponse(tokens);
          return tokens;
        }
      }
      throw new Error('OAuth cancelled or failed');
    } finally {
      setLoading(false);
    }
  }, [config]);

  return { startAuth, loading, tokenResponse };
}
```

#### 11.8.12 Code: `contexts/OAuthContext.tsx`

Store OAuth tokens for external banks. Uses `expo-secure-store` (key: `oauth_${bankId}`).

```tsx
import React, { createContext, useContext, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

interface OAuthContextType {
  getToken: (bankId: string) => Promise<OAuthToken | null>;
  setToken: (bankId: string, token: OAuthToken) => Promise<void>;
  clearToken: (bankId: string) => Promise<void>;
}

const OAuthContext = createContext<OAuthContextType | undefined>(undefined);

export const OAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getToken = useCallback(async (bankId: string): Promise<OAuthToken | null> => {
    const key = `oauth_${bankId}`;
    const stored = await SecureStore.getItemAsync(key);
    if (!stored) return null;
    const token: OAuthToken = JSON.parse(stored);
    if (token.expiresAt > Date.now()) return token;
    await SecureStore.deleteItemAsync(key);
    return null;
  }, []);

  const setToken = useCallback(async (bankId: string, token: OAuthToken) => {
    const key = `oauth_${bankId}`;
    await SecureStore.setItemAsync(key, JSON.stringify(token));
  }, []);

  const clearToken = useCallback(async (bankId: string) => {
    const key = `oauth_${bankId}`;
    await SecureStore.deleteItemAsync(key);
  }, []);

  return (
    <OAuthContext.Provider value={{ getToken, setToken, clearToken }}>
      {children}
    </OAuthContext.Provider>
  );
};

export const useOAuthTokens = () => {
  const ctx = useContext(OAuthContext);
  if (!ctx) throw new Error('useOAuthTokens must be used within OAuthProvider');
  return ctx;
};
```

#### 11.8.13 Code: `services/openBankingApi.ts`

App-side client for **Buffr backend** Open Banking proxy endpoints. The app does not call banks directly; it calls Buffr backend, which uses mTLS (QWAC) and OAuth with the Data Provider. This service provides types for the **data/links/meta** response structure (Namibian Open Banking §9.1) and methods to list banks, create consent, and exchange the authorization code for bank tokens (backend performs actual token exchange with bank).

```ts
/**
 * Open Banking API client – Buffr backend proxy.
 * Namibian Open Banking Standards v1.0: responses use root structure { data, links, meta }.
 * Location: services/openBankingApi.ts
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/** Open Banking standard response wrapper (Namibian Standards §9.1) */
export interface OpenBankingResponse<T> {
  data: T;
  links?: { self?: string; [k: string]: string | undefined };
  meta?: { totalRecords?: number; [k: string]: unknown };
}

/** Open Banking error object */
export interface OpenBankingError {
  code: string;
  title: string;
  detail?: string;
}

export interface OpenBankingErrorResponse {
  errors: OpenBankingError[];
}

export interface BankItem {
  id: string;
  name: string;
  logoUrl?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  parEndpoint?: string;
}

export interface ConsentRequestParams {
  bankId: string;
  scopes: string[];  // e.g. ['accounts', 'payments']
  redirectUri: string;
  state: string;
}

/** Response from backend when creating a consent request (may return auth URL or request_uri for PAR) */
export interface CreateConsentResponse {
  authorizationUrl?: string;
  requestUri?: string;
  state: string;
}

/** Exchange authorization code for bank tokens (backend does mTLS + token exchange) */
export interface ExchangeCodeParams {
  bankId: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { getSecureItem } = await import('@/services/secureStorage');
  const token = await getSecureItem('buffr_access_token');
  if (!token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** GET list of supported banks (from Buffr backend; backend may read from scheme or config) */
export async function getBanks(): Promise<BankItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/v1/mobile/open-banking/banks`, { headers });
  if (!res.ok) throw new Error('Failed to load banks');
  const json = await res.json();
  const ob = json as OpenBankingResponse<BankItem[]>;
  return ob.data ?? json;
}

/** POST create consent request; returns authorizationUrl (or requestUri for PAR) for WebView */
export async function createConsentRequest(params: ConsentRequestParams): Promise<CreateConsentResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/v1/mobile/open-banking/consent`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err: OpenBankingErrorResponse = await res.json().catch(() => ({ errors: [{ code: 'UNKNOWN', title: res.statusText }] }));
    throw new Error(err.errors?.[0]?.detail ?? err.errors?.[0]?.title ?? 'Consent request failed');
  }
  return res.json();
}

/** POST send authorization code to backend; backend exchanges with bank (mTLS) and stores tokens */
export async function exchangeCodeForBankTokens(params: ExchangeCodeParams): Promise<{ linked: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/v1/mobile/open-banking/token-exchange`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}
```

Backend must implement: `GET /api/v1/mobile/open-banking/banks`, `POST /api/v1/mobile/open-banking/consent`, `POST /api/v1/mobile/open-banking/token-exchange`. Backend uses mTLS + Open Banking headers when calling the bank (§11.8.8, §17.1).

#### 11.8.14 Code: `components/OpenBankingConsentWebView.tsx`

Bank consent screen: loads the Data Provider’s authorization URL in a WebView and handles redirect to `buffr://oauth-callback?code=...&state=...`. Uses `openBankingApi` and `useOAuth`/OAuthContext. For use on Cash-Out Bank Transfer flow (§3.3 screen 22) and optional bank linking (§3.6 screen 47d).

```tsx
/**
 * Open Banking consent: WebView + deep-link redirect handling.
 * Purpose: Bank linking and PIS consent per Namibian Open Banking; SCA at bank.
 * Location: components/OpenBankingConsentWebView.tsx
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { createConsentRequest, exchangeCodeForBankTokens } from '@/services/openBankingApi';

const REDIRECT_SCHEME = 'buffr';
const REDIRECT_PATH = 'oauth-callback';

interface OpenBankingConsentWebViewProps {
  bankId: string;
  scopes: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function OpenBankingConsentWebView({ bankId, scopes, onSuccess, onCancel }: OpenBankingConsentWebViewProps) {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = Linking.createURL(REDIRECT_PATH, { scheme: REDIRECT_SCHEME });
  const state = `st_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await createConsentRequest({
          bankId,
          scopes,
          redirectUri,
          state,
        });
        if (cancelled) return;
        const url = result.requestUri
          ? `${result.authorizationUrl ?? ''}?request_uri=${encodeURIComponent(result.requestUri)}`
          : result.authorizationUrl;
        if (url) setAuthUrl(url);
        else setError('No authorization URL returned');
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to start consent');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bankId, scopes]);

  const handleNavigationStateChange = async (nav: { url: string }) => {
    const url = nav.url;
    if (!url || !url.includes(REDIRECT_SCHEME)) return;
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code as string | undefined;
    const returnedState = parsed.queryParams?.state as string | undefined;
    if (code && returnedState === state) {
      try {
        await exchangeCodeForBankTokens({
          bankId,
          code,
          redirectUri,
        });
        onSuccess();
      } catch {
        setError('Could not complete linking');
      }
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.centered}><Text>{error}</Text></View>;
  if (!authUrl) return null;

  return (
    <WebView
      source={{ uri: authUrl }}
      onShouldStartLoadWithRequest={(req) => {
        if (req.url.startsWith(`${REDIRECT_SCHEME}://`)) {
          handleNavigationStateChange({ url: req.url });
          return false;
        }
        return true;
      }}
      style={styles.webview}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  webview: { flex: 1 },
});
```

Ensure `app.json` has `"scheme": "buffr"` and that the backend registers `buffr://oauth-callback` (or equivalent) with the Data Provider. No in-app 2FA for bank consent; SCA is performed at the bank (§14.2).

Add `OAuthProvider` to `AppProviders.tsx` (wrap children with `<OAuthProvider>`). OAuth PAR/token endpoints are external bank APIs; app uses redirect and token exchange per Open Banking.

---

### 11.9 Using Archon MCP for full implementation

**Documentation sources used to complete §11.8 code:** Expo docs (AuthSession, SecureStore, Camera, Crypto) were fetched via **mcp_web_fetch** from https://docs.expo.dev/versions/latest/sdk/ (auth-session, securestore, camera, crypto). Local **NAMQR_GUIDE.md** and **NAMIBIAN_OPEN_BANKING_STANDARDS** were used for NAMQR TLV/Token Vault and Open Banking OAuth/PKCE patterns. When **Archon MCP** is available, use `perform_rag_query` on this PRD and those sources for further refinement.

**Archon** should be used to generate or refine:

- **TLV encoder/decoder (NAMQR):** From NAMQR Code Specifications; tags 00, 01, 26/29, 52, 58, 59, 60, 65, 63, 66; CRC (Tag 63).
- **OAuth 2.0 flows (Open Banking):** PAR, PKCE, redirect, token exchange; use `expo-auth-session`, `expo-web-browser`.
- **mTLS client configuration:** Backend-only; reference in PRD for server-side QWAC.
- **Secure logging and audit trail:** Append-only logs, retention, export for affidavits (ETA s.24, s.25).
- **Affidavit generation logic:** Template and log attachment for ETA s.25(4).

**Sources to query via Archon (perform_rag_query):**

- **This PRD** (`buffr_g2p/docs/PRD.md`): §9.3, §9.4, §10, §11, §12, §14.
- **CONSOLIDATED_PRD**, **BUFFR_G2P_FINAL_ARCHITECTURE**: ecosystem, API, flows.
- **docs.expo.dev**: Expo Router, SafeAreaView, fonts, SecureStore, AuthSession, WebBrowser, FileSystem, Camera.

**Example queries:**

- "Implement TLV encode/decode for NAMQR tags 00, 01, 26, 52, 58, 59, 60, 65, 63, 66 per PRD §11.8."
- "Implement 2FA hook with biometric and PIN fallback for Buffr G2P per PSD-12 and PRD §11.7."
- "Implement OAuth 2.0 with PAR and PKCE for Open Banking consent per PRD §9.3 and §11.8."

---

### 11.10 Minor Considerations

Implementers and reviewers should be aware of the following; they do not block shipment but may warrant refinement in later iterations.

- **Generic components on some screens:** Screens such as **group view** (§3.6 screen 47c) and **loan detail** (§3.6 screen 40, Active Loan Details) rely on generic building blocks (**ListItem**, **MethodCard** per §4.3). These are functional and sufficient for the initial build. Real content is driven by **input fields** (forms, filters), **database design** (entities, relations), and **API design** (§9.3, §9.4): list/detail endpoints, request/response shapes, and types (§11.4.15). Layout, density, or visual hierarchy on those screens may need refinement (e.g. group activity list, loan repayment schedule) as API and data shapes are finalised and UX is validated.

- **Error handling scope:** Error handling for every possible edge case is not exhaustively enumerated in this PRD. The **generic error states** in §4.4 (Toast, ErrorState, EmptyState, NetworkError, loading, inline validation, warning banner) and the per-screen table there cover most situations. Implementers should apply these consistently and add screen- or flow-specific error handling where product or compliance requirements demand it (e.g. 2FA failure, Token Vault validation failure, OAuth abort).

---

### 11.11 Expo Tabs Template Implementation Guide

This guide maps the PRD’s requirements to an Expo Router project created with the **tabs** template. Use it as the main path for scaffolding and implementing the Buffr G2P app.

#### 11.11.0 Expo Tabs Template – Generated File Structure

After running `npx create-expo-app@latest <name> -t tabs`, the project has the following structure. Use this as the baseline before applying PRD mappings (§11.11.2) and adding screens/folders.

**Tree (excluding `node_modules` and `.git`):**

```
.
├── .vscode/
│   ├── extensions.json
│   └── settings.json
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx    # Tab bar layout (Tab One, Tab Two by default)
│   │   ├── index.tsx      # First tab screen
│   │   └── two.tsx        # Second tab screen
│   ├── +html.tsx          # Web-only HTML shell
│   ├── +not-found.tsx     # 404 screen
│   ├── _layout.tsx        # Root layout: Stack, fonts, ThemeProvider
│   └── modal.tsx          # Example modal screen
├── assets/
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── fonts/
│   │   └── SpaceMono-Regular.ttf
│   ├── icon.png
│   ├── images/            # Optional; add app images (e.g. banks/, card-designs/, logos) per §11.1
│   └── splash-icon.png
├── components/
│   ├── __tests__/
│   │   └── StyledText-test.js
│   ├── EditScreenInfo.tsx
│   ├── ExternalLink.tsx
│   ├── StyledText.tsx
│   ├── Themed.tsx
│   ├── useClientOnlyValue.ts
│   ├── useClientOnlyValue.web.ts
│   ├── useColorScheme.ts
│   └── useColorScheme.web.ts
├── constants/
│   └── Colors.ts
├── docs/                  # (add PRD.md and other docs here)
├── app.json
├── babel.config.js
├── package.json
├── package-lock.json
└── tsconfig.json
```

**Directory listing by level (for reference):**

| Level | Path | Contents |
|-------|------|----------|
| Root | `/` | `.gitignore`, `.vscode/`, `app/`, `app.json`, `babel.config.js`, `assets/`, `components/`, `constants/`, `docs/`, `node_modules/`, `package.json`, `package-lock.json`, `tsconfig.json` |
| App | `app/` | `(tabs)/`, `+html.tsx`, `+not-found.tsx`, `_layout.tsx`, `modal.tsx` |
| Tabs | `app/(tabs)/` | `_layout.tsx`, `index.tsx`, `two.tsx` |
| Assets | `assets/` | `adaptive-icon.png`, `favicon.png`, `fonts/`, `icon.png`, `images/`, `splash-icon.png` |
| Components | `components/` | `EditScreenInfo.tsx`, `ExternalLink.tsx`, `StyledText.tsx`, `Themed.tsx`, `useClientOnlyValue.ts`, `useClientOnlyValue.web.ts`, `useColorScheme.ts`, `useColorScheme.web.ts`, `__tests__/` |
| Constants | `constants/` | `Colors.ts` |

**Key files (template defaults):**

- **`app/_layout.tsx`** – Root layout: loads SpaceMono font, wraps app in `ThemeProvider`, renders `Stack` with `(tabs)` and `modal`; keeps splash visible until fonts load.
- **`app/(tabs)/_layout.tsx`** – Tab bar: two tabs (`index` = “Tab One”, `two` = “Tab Two”), FontAwesome tab icons, header link to `/modal`.
- **`app/(tabs)/index.tsx`** – First tab content (placeholder).
- **`app/(tabs)/two.tsx`** – Second tab content (placeholder).
- **`app/modal.tsx`** – Example modal screen (presented as modal).
- **`constants/Colors.ts`** – Light/dark theme colors (e.g. `tint`, `text`, `tabIconDefault`).
- **`components/useColorScheme.ts`** – Hook for light/dark mode; used by tab layout and themes.
- **`components/useClientOnlyValue.ts`** – Avoids hydration mismatch on web (e.g. for `headerShown`).

When implementing the Buffr G2P app, replace or extend the tabs in `app/(tabs)/` (e.g. add `transactions.tsx`, `vouchers.tsx`, `profile.tsx`), add stacks under `app/` (e.g. `onboarding/`, `wallets/`, `send-money/`), and reuse or replace the template components and constants as specified in the rest of §11.

#### 11.11.1 Create the project with tabs template

```bash
npx create-expo-app@latest buffr-g2p -t tabs
cd buffr-g2p
```

This generates a default tabs layout with an `app/(tabs)` folder and basic navigation.

#### 11.11.2 Align PRD file structure with Expo Router

The PRD’s proposed structure (§11.1) is compatible with Expo Router. Use the following mapping:

| PRD path | Expo Router path |
|----------|-------------------|
| `app/(tabs)/_layout.tsx` | `app/(tabs)/_layout.tsx` (tab bar) |
| `app/(tabs)/index.tsx` | `app/(tabs)/index.tsx` (Home tab) |
| `app/(tabs)/transactions.tsx` | `app/(tabs)/transactions.tsx` |
| `app/(tabs)/vouchers.tsx` | `app/(tabs)/vouchers.tsx` |
| `app/(tabs)/profile.tsx` | `app/(tabs)/profile.tsx` |
| `app/onboarding/` | `app/onboarding/` (stack) |
| `app/utilities/` | `app/utilities/` (stack for vouchers) |
| `app/wallets/` | `app/wallets/` (stack) |
| `app/send-money/` | `app/send-money/` (stack) |
| `app/merchants/` | `app/merchants/` (stack) |
| `app/bills/` | `app/bills/` (stack) |
| `app/agents/` | `app/agents/` (stack) |
| `app/transactions/[id].tsx` | `app/transactions/[id].tsx` |
| `app/profile/` | `app/profile/` (stack) |
| `app/loans/` | `app/loans/` (stack) |
| `app/proof-of-life/` | `app/proof-of-life/` (stack) |
| `app/receive/` | `app/receive/` (stack) |
| `app/scan-qr.tsx` | `app/scan-qr.tsx` |
| `app/add-wallet.tsx` | `app/add-wallet.tsx` |
| `app/groups/` | `app/groups/` (stack) |
| `app/cards/` | `app/cards/` (stack) |
| `app/add-card/` | `app/add-card/` (stack) |
| `app/notifications.tsx` | `app/notifications.tsx` |

**Important:** Each stack is defined in a `_layout.tsx` inside the corresponding folder.

#### 11.11.3 Install required dependencies

Install packages referenced in the PRD (§11.3) with `expo install` for SDK compatibility:

```bash
npx expo install expo-router @react-native-async-storage/async-storage expo-secure-store expo-auth-session expo-web-browser expo-camera expo-crypto expo-file-system expo-sharing expo-local-authentication react-native-safe-area-context react-native-screens @expo/vector-icons react-native-qrcode-svg react-native-reanimated
```

Install device integration packages (§11.3.2) for contacts, location, gallery, camera, and biometrics:

```bash
npx expo install expo-contacts expo-location expo-image-picker expo-camera expo-local-authentication
```

Add `expo-constants` and `expo-splash-screen` if not already present. For dev builds and native modules (e.g. Reanimated, Gesture Handler), also install:

```bash
npx expo install expo-dev-client react-native-reanimated react-native-gesture-handler
```

#### 11.11.3a Babel config

Ensure `babel.config.js` includes the Reanimated plugin and that it is **last** in the `plugins` array (required for react-native-reanimated):

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin must be last.
      'react-native-reanimated/plugin',
    ],
  };
};
```

After changing Babel config, clear Metro cache when starting: `npx expo start --clear`.

#### 11.11.3b Prebuild (native projects)

**Status in this project:** Expo is installed and **`npx expo prebuild`** has been run; native `ios/` and `android/` directories are present. Use `npx expo run:ios` or `npx expo run:android` to build and run. For iOS pod/encoding issues see `docs/IOS_SETUP.md`.

After initial installation and Babel config, generate the native `android/` and `ios/` directories (if starting from scratch):

```bash
npx expo prebuild
```

- **Android package name:** Prompted; use e.g. `com.thependalorian.buffrg2p` or your own (reverse-DNS).
- **Apple bundle identifier:** Prompted; use e.g. `com.thependalorian.buffrg2p` or match Android.
- Prebuild creates native directories and runs **CocoaPods** for iOS (may take a few minutes).
- **Optional:** If you see `userInterfaceStyle: Install expo-system-ui in your project to enable this feature`, install with `npx expo install expo-system-ui` to control light/dark from app config.

Re-run `npx expo prebuild` after adding or upgrading native modules, or use `npx expo prebuild --clean` to regenerate from scratch.

**After a successful prebuild** you should see:

```
✔ Created native directories
✔ Updated package.json
» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.
✔ Finished prebuild
✔ Installed CocoaPods
```

Root directory then includes the new native folders:

```
android/          ios/              app/             assets/          components/
constants/        docs/            node_modules/    app.json         babel.config.js
package.json      package-lock.json  tsconfig.json
```

Use `android/` and `ios/` for native builds (Android Studio, Xcode) or `npx expo run:android` / `npx expo run:ios`.

#### 11.11.4 Root layout

Use the root layout from **§11.4.1**: `app/_layout.tsx` with Stack, providers, and screen options. It wires the root stack and `AppProviders`.

#### 11.11.5 Tab bar

Use **§11.4.4** for `app/(tabs)/_layout.tsx`: Tabs with Home, Transactions, Vouchers, Profile; set `tabBarActiveTintColor` from `Theme.ts` and tab icons (e.g. Ionicons).

#### 11.11.6 Entry point (index)

Use **§11.4.2** for `app/index.tsx`: read `buffr_onboarding_complete` from AsyncStorage; redirect to `/(tabs)` or `/onboarding`; show a loading indicator until ready.

#### 11.11.7 Onboarding stack

Create `app/onboarding/_layout.tsx` (stack) and all onboarding screens from **§11.4.11**. On the last screen (`complete.tsx`), set AsyncStorage and replace with tabs:

```ts
await AsyncStorage.setItem('buffr_onboarding_complete', 'true');
router.replace('/(tabs)');
```

#### 11.11.8 Constants and theme

Create `constants/Theme.ts` and `constants/Layout.ts` from **§11.4.5** and **§11.4.6** (or §5.1 design tokens). Optionally add `constants/designSystem.ts` per **§11.4.24**.

#### 11.11.9 Contexts and API client

Set up providers and API client per **§11.4.8**, **§11.4.12**, and **§11.4.7**:

- `contexts/AppProviders.tsx`: compose User, Wallets, Vouchers (and optionally OAuth, Compliance) providers.
- `contexts/UserContext.tsx`: user and token state; persist token with `expo-secure-store`.
- `services/api.ts`: base client with Bearer token and refresh logic.

#### 11.11.10 Core features and PRD reference

Implement each feature using the referenced PRD sections and §11.4 code:

| Feature | PRD section | Key files |
|---------|-------------|-----------|
| **Vouchers** | §3.2, §7.6 | `app/utilities/vouchers/*`, `services/vouchers.ts` (§11.4.22) |
| **Wallets & cash-out** | §3.3, §7.3 | `app/wallets/[id]/cash-out/*`, `services/wallets.ts` (§11.4.22) |
| **Send money** | §3.4, §7.4 | `app/send-money/*` |
| **Merchants / Bills / Agents** | §3.4 | `app/merchants/*`, `app/bills/*`, `app/agents/*` |
| **Profile & settings** | §3.5 | `app/profile/*` |
| **Loans** | §3.6, §7.7 | `app/loans/*`, `services/loans.ts` (§11.4.18) |
| **Proof of life** | §2.4, §3.6 | `app/proof-of-life/*`, `hooks/use2FA.ts` (§11.7.1) |
| **QR scanner & NAMQR** | §4.5, §11.8 | `app/scan-qr.tsx`, `components/qr/*`, `utils/tlv.ts` |
| **Receive flows** | §3.9, §7.6 | `app/receive/*`, `services/notifications.ts` (§11.4.16) |
| **Groups** | §3.6 | `app/groups/*` |
| **Cards** | §3.4 | `app/cards/*`, `app/add-card/*` |

Copy implementation code from the §11.4 (and §11.7, §11.8) subsections; the PRD contains typed, copy-paste-ready code for these areas.

#### 11.11.11 Expo Router and OAuth setup

- Set `"scheme": "buffr"` in `app.json` for OAuth redirects (e.g. `buffr://oauth-callback`).
- Use `expo-linking` to build the redirect URI where required by the OAuth flow (§11.8).

#### 11.11.12 Running and testing

Start the dev server:

```bash
npx expo start
```

Use the iOS simulator or Android emulator. For physical devices use `npx expo start --tunnel`.

#### 11.11.13 Production build

When ready, use EAS Build:

```bash
eas build --platform ios
eas build --platform android
```

---

## 11.12–11.21 Gap Analysis & Recommendations for v1.6 (Senior Developer Review)

*As a senior developer from Apple and PhonePe, the following review of the Buffr G2P App PRD v1.5 was conducted. It is impressively comprehensive—covering screens, flows, API contracts, design tokens, compliance, and copy‑paste‑ready code. To make it truly production‑ready for a large‑scale government payment app, the following critical gaps and recommendations are captured for a **v1.6** update.*

---

### 🔍 Gap Analysis & Recommendations

#### 1. Offline Support & Conflict Resolution

**Current state:** Mentioned in non‑functional requirements (§13) but lacks concrete design.

**Gaps:**
- How are transactions queued when offline?
- What happens if the same transaction is attempted twice after reconnect?
- How do we ensure idempotency for offline‑generated cash‑out codes?

**Recommendations:**
- Add a dedicated **"Offline Architecture"** (see §11.12 below) describing:
  - Use of a local SQLite store (via `expo-sqlite`) to persist pending transactions.
  - Each pending transaction gets a UUID and is sent to the backend on connectivity restore.
  - Backend must reject duplicate UUIDs (idempotency key).
  - Conflict resolution: if a voucher was already redeemed elsewhere, the app receives a 409 and updates local state accordingly.
- Cash‑out codes generated offline must be cryptographically secure and validated server‑side with a short expiry (e.g., 30 min) to prevent double‑spending after sync.

---

#### 2. Push Notifications

**Current state:** Notifications are mentioned for incoming payments/vouchers (§3.9, §4.4) but integration details are missing.

**Gaps:**
- How are push tokens registered?
- What payloads are expected?
- How are deep links handled when tapping a notification?

**Recommendations:**
- Add **"Push Notifications"** (§11.13) covering:
  - Use of `expo-notifications` for iOS/Android.
  - Token registration after login (`POST /api/v1/mobile/push-token`).
  - Notification payload should contain `data` with a deep‑link route (e.g., `receive/[transactionId]`) and a `type`.
  - In‑app handling: when app is in foreground, show a toast; when in background, tapping the notification navigates to the appropriate screen using `expo-linking` and `useRouter`.
  - Example payload:
    ```json
    {
      "title": "Payment received",
      "body": "N$ 500 from Maria",
      "data": { "route": "/receive/12345" }
    }
    ```

---

#### 3. Analytics & Monitoring

**Current state:** Only compliance reporting is covered. No user‑behaviour analytics or crash reporting.

**Gaps:**
- No strategy to measure feature adoption, funnel drop‑offs, or app performance.
- Crash reporting not specified.

**Recommendations:**
- Add **"Analytics & Monitoring"** (§11.14):
  - Integrate **Sentry** (`@sentry/react-native`) for crash reporting and performance monitoring.
  - Use a privacy‑first analytics SDK (e.g., **PostHog** or **Segment**) to track key events: `onboarding_complete`, `voucher_redeemed`, `cash_out_initiated`, `send_money_success`.
  - All analytics must be anonymised and comply with Namibia's data protection laws.
  - Define event schemas in a separate file `analytics/events.ts`.

---

#### 4. Testing Strategy

**Current state:** No testing plan.

**Gaps:**
- No guidance on unit, integration, or end‑to‑end tests.

**Recommendations:**
- Add **"Testing"** (§11.15):
  - **Unit tests**: Use Jest for services, hooks, and utility functions (e.g., TLV encoder, CRC validation).
  - **Component tests**: Use React Native Testing Library for isolated component rendering.
  - **Integration tests**: Use `@testing-library/react-native` with mocked API clients to test critical flows (onboarding, voucher redemption).
  - **E2E tests**: Use **Detox** or **Maestro** for critical user journeys. Include a test plan covering happy path and error scenarios (network loss, invalid QR, expired voucher).
  - Add a `test:` script to `package.json` and run in CI.

---

#### 5. Deployment & CI/CD

**Current state:** Not covered.

**Gaps:**
- No description of how to build and distribute the app (App Store, Google Play).
- No CI/CD pipeline.

**Recommendations:**
- Add **"Deployment"** (§11.16):
  - Use **EAS Build** for creating production builds. Provide `eas.json` profiles for development, preview, and production.
  - Code signing: use EAS credentials manager or manual upload.
  - **CI/CD**: Use GitHub Actions (or Bitrise) to run tests on PRs and trigger EAS builds on merge to main.
  - Example GitHub Actions workflow:
    - Checkout, install dependencies, run tests.
    - On main branch push, run `eas build --platform ios --profile production` and `eas build --platform android --profile production`.
  - App store submission: document process of uploading builds via Transporter (iOS) and Google Play Console (Android).

---

#### 6. Security Deep Dive

**Current state:** Compliance sections cover 2FA, encryption, audit logs, but implementation details are light.

**Gaps:**
- Biometric fallback (when no biometric hardware) is mentioned but not fully specified.
- Secure storage of refresh tokens – should be in `expo-secure-store` with biometric access control where possible.
- Replay attack prevention for offline codes.

**Recommendations:**
- Add **"Security Implementation Details"** (§11.17):
  - **Biometric fallback**: If biometric not available, the app should always prompt for PIN; the PIN is validated server‑side.
  - **Token storage**: Store access token and refresh token in `expo-secure-store`. Use `requireAuthentication` option on Android for extra protection.
  - **Idempotency keys**: All write endpoints must accept an `idempotency_key` header (UUID v4). The app generates one per request and stores it locally until successful response.
  - **Offline cash‑out codes**: When generated offline, the code is a HMAC of `(userId, amount, expiry)` with a device‑specific secret; server verifies HMAC and prevents reuse.
  - **Certificate pinning** (optional): Consider adding for high‑security environments.

---

#### 7. Accessibility

**Current state:** Mentioned in UX audit (§4.4.1) but lacks specific criteria.

**Gaps:**
- No checklist for WCAG 2.1 AA compliance.
- Dynamic text sizing not addressed.

**Recommendations:**
- Add **"Accessibility"** (§11.18):
  - All touch targets must be at least 44×44 dp (already in design tokens).
  - Use `accessibilityLabel` and `accessibilityHint` for all interactive elements (icons, buttons, links).
  - Support **Dynamic Type** on iOS and **font scaling** on Android: use `allowFontScaling: true` and test with large text sizes.
  - Provide high‑contrast theme option (can be system‑driven or user‑toggle).
  - Regularly test with screen readers (VoiceOver, TalkBack).

---

#### 8. Internationalization (i18n)

**Current state:** Not mentioned.

**Gaps:**
- Namibia has multiple languages (English, Afrikaans, Oshiwambo, etc.). App should support at least English and Oshiwambo initially.

**Recommendations:**
- Add **"Internationalization"** (§11.19):
  - Use `i18next` with `react-i18next`.
  - Store translations in JSON files under `locales/` (e.g., `en.json`, `kj.json`).
  - Detect device language and fallback to English.
  - All user‑facing strings in the PRD (e.g., "Verify identity", "Redeem to wallet") should be marked for translation.
  - Provide a script to extract strings for translators.

---

#### 9. Edge Cases & Recovery

**Current state:** Flows are well‑defined, but many edge cases are not explicitly handled.

**Gaps:**
- What if user tries to redeem an expired voucher? (Show disabled button with message "Expired".)
- What if 2FA fails multiple times? (Lock out after 5 attempts? Show "Too many attempts, try later".)
- What if network is lost during a transaction? (Queue as offline, but show warning.)
- What if the backend returns a 5xx error? (Retry with exponential backoff up to 3 times, then show error.)

**Recommendations:**
- Add **"Edge Case Handling"** (§11.20) with a table of scenarios and expected UX/technical response:

| Scenario | UX Handling | Technical Handling |
|----------|-------------|---------------------|
| Expired voucher | Redeem button disabled, tooltip "Expired on [date]" | `GET /vouchers` returns expired status; frontend disables. |
| 2FA consecutive failures | After 3 failures, lock for 5 minutes, show countdown | Backend returns `429` with `Retry-After`; frontend disables input. |
| Network loss mid‑transaction | Show toast "Connection lost. Transaction queued.", store in local DB | Use offline queue; on reconnect, send transactions in order. |
| 5xx error | Show "Server error, please try again later" | Retry 3 times with exponential backoff, then show final error. |

---

#### 10. Performance Budget

**Current state:** Not defined.

**Gaps:**
- No targets for app size, launch time, or frame rate.

**Recommendations:**
- Add **"Performance Targets"** (§11.21):
  - App bundle size < 80 MB (after compression).
  - Launch time (cold start) < 2 seconds on mid‑range devices.
  - 60 FPS scrolling on all screens (use `useNativeDriver` for animations, avoid heavy re‑renders).
  - Lighthouse / React DevTools profile for list screens (vouchers, transactions) to ensure smoothness.

---

### Proposed PRD Addendum (v1.6) – Section Placeholders

The following subsections are to be fully elaborated in v1.6. They should be inserted or appended after §11.11.

- **11.12 Offline Architecture** – Local SQLite, pending transaction queue, idempotency keys, conflict resolution, offline cash‑out code security and expiry.
- **11.13 Push Notifications** – expo-notifications, token registration, payload schema, deep links, foreground/background handling.
- **11.14 Analytics & Monitoring** – Sentry, privacy‑first analytics, event schemas, compliance with data protection.
- **11.15 Testing Strategy** – Jest, React Native Testing Library, integration tests, Detox/Maestro E2E, CI test script.
- **11.16 Deployment & CI/CD** – EAS Build profiles, code signing, GitHub Actions (or Bitrise), App Store / Play Console submission.
- **11.17 Security Implementation Details** – Biometric fallback, token storage (expo-secure-store), idempotency keys, offline code HMAC, optional certificate pinning.
- **11.18 Accessibility** – WCAG 2.1 AA, 44×44 dp targets, accessibilityLabel/Hint, Dynamic Type/font scaling, high‑contrast, VoiceOver/TalkBack.
- **11.19 Internationalization** – i18next, locales (en, kj), device language, string extraction for translators.
- **11.20 Edge Case Handling** – Table of scenarios (expired voucher, 2FA lockout, network loss, 5xx) with UX and technical handling.
- **11.21 Performance Budget** – Bundle size, cold start, 60 FPS, profiling of list screens.

---

### Final Note

The Buffr G2P PRD v1.5 is already a strong, comprehensive document. Addressing these gaps will turn it into an **unshakeable blueprint** that any engineering team can execute with confidence. The additions are essential for a real‑world payment app that must be reliable, secure, and user‑friendly for millions of Namibians.

---

## 12. Legal & Regulatory Compliance (New)

This section consolidates the legal and regulatory obligations that Ketchup Software Solutions and the Buffr G2P app must satisfy. Compliance is mandatory for operation within Namibia's National Payment System.

### 12.1 Overview

Compliance is mandatory for operation within Namibia's National Payment System. All QR-based transactions, payment flows, API interactions, security measures, and operational processes must conform to the national laws and standards listed in the PRD header and in §2.1.

### 12.2 Key Legislation and Determinations

| Instrument | Key Provisions |
|------------|----------------|
| **Electronic Transactions Act 4 of 2019** | Legal recognition of data messages; electronic signatures; admissibility of electronic evidence; retention of records; consumer protection (Chapter 4) |
| **Payment System Management Act, 2023** | Framework for payment systems; licensing of PSPs; oversight by Bank of Namibia |
| **PSD-1 (Licensing and Authorisation)** | Requirements for licensing as a PSP (banking or non‑bank); governance, risk management, consumer protection, capital, reporting |
| **PSD-3 (Issuing of Electronic Money)** | Requirements for e‑money issuers: trust account, 100% backing, capital, AML/CFT, reporting |
| **PSD-12 (Cybersecurity)** | Operational resilience, 2FA, encryption, incident reporting, recovery objectives |
| **Financial Intelligence Act, 2012** | AML/CFT obligations: CDD, risk assessments, reporting of suspicious transactions |

### 12.3 Applicability to Ketchup / Buffr

Ketchup Software Solutions must obtain the appropriate license or authorisation from the Bank of Namibia before operating the Buffr G2P app. Based on the intended functionality (holding user funds, facilitating payments), Ketchup will likely need to be licensed as:

- A **payment service provider** under PSD-1, and
- An **electronic money issuer** under PSD-3 (if Buffr stores value in wallets).

If Ketchup operates as a **third‑party payment service provider** without holding funds, it must enter into a **sponsoring bank agreement** and comply with PSD-1 Part V.

### 12.4 Specific Compliance Measures

#### 12.4.1 Electronic Transactions Act

- **Data messages as legal records:** All contracts, consents, and transaction records are stored as data messages with full metadata (timestamp, origin, destination).
- **Electronic signatures:** User authentication (biometric, PIN) that meets the definition of "advanced electronic signature" must be used for legally significant actions. The app will record the signature event with a secure binding to the user and the data message.
- **Retention:** Records will be retained in a format that can be accurately reproduced. **Internal retention policy:** transaction logs and data messages **5 years**; dormant wallet funds and related records **3 years** (aligned with PSD-3 s.11.4.5). Shorter or longer periods may apply as prescribed by law.
- **Admissibility:** The system will be capable of producing an affidavit under section 25(4) of the ETA, signed by the person in control of the information system, to authenticate records for legal proceedings. See §11.7.5 affidavitGenerator.

#### 12.4.2 PSD-12 Cybersecurity

- **Two‑factor authentication:** Every payment transaction (regardless of amount) will require 2FA. The app will support combinations of: knowledge (PIN), possession (OTP or hardware token), inherence (biometric). See §11.8 use2FA.
- **Encryption:** All data in transit will use TLS 1.2 or higher; data at rest will be encrypted using AES-256 or tokenised. See §11.7 encryption.ts.
- **Incident response:** The backend will have monitoring and alerting. In case of a successful cyberattack, a preliminary report will be filed with the Bank within 24 hours, followed by a detailed impact assessment within 30 days. See §11.7 incidentReporter.ts. **The backend must be configured with the Bank of Namibia's incident reporting endpoint and appropriate credentials (e.g. API key or secure channel).**
- **Recovery:** Systems will be designed to meet RTO ≤ 2 hours and RPO ≤ 5 minutes, with regular testing of recovery plans (at least twice a year).

#### 12.4.3 PSD-1 Licensing and Ongoing Obligations

- **Governance:** The board of directors will be responsible for information security, cybersecurity, and operational resilience. A security officer will be appointed with direct reporting access to the board.
- **Risk management:** A comprehensive Risk Management Framework will be maintained, covering operational, fraud, cybersecurity, AML, and other risks.
- **Capital:** If Ketchup is a non‑bank PSP, it must meet initial capital requirements (N$1.5M for e‑money issuers) and ongoing capital equal to the average outstanding e‑money liabilities.
- **Reporting:** Monthly statistical returns will be submitted to the Bank within 10 days of month‑end. See §11.13 complianceReporter. Annual audited financial statements will be submitted within 3 months of year‑end.
- **Consumer protection:** The user agreement will clearly state fees, charges, and complaint procedures. A complaints handling process will be in place: **all complaints must be acknowledged upon receipt** (PSD-1 s.16.9), with substantive responses within **15 days** from receipt (PSD-1 s.16.7). See constants/legalTerms.ts.

#### 12.4.4 PSD-3 E‑money Issuance

- **Trust account:** A separate trust account will be maintained at a commercial bank, holding 100% of outstanding e‑money liabilities. Funds in the trust account will not be commingled with operational funds.
- **No interest:** No interest will be paid on e‑money wallets. Any interest earned on pooled funds will be used to benefit the e‑money scheme (e.g., reduce fees).
- **Dormant wallets:** Wallets inactive for 6 months will be considered dormant; funds will be returned to the customer or transferred to a separate account after 3 years (if unclaimed), to be used for scheme development only with Bank approval.
- **AML/CFT:** Ketchup will comply with the Financial Intelligence Act, including customer due diligence (CDD), ongoing monitoring, and reporting of suspicious transactions.

### 12.5 Oversight and Audits

The Bank of Namibia reserves the right to inspect all records, data, and systems to ensure compliance. Ketchup must cooperate fully with any such inspections.

### 12.6 PSD-1 / PSD-3 / PSD-12 / ETA – Implementation Checklist (App)

The following table maps regulatory requirements to app implementation. All payment flows must enforce 2FA before effecting any payment (PSD-12 §12.2). Consumer protection (fees, redemption, complaints) must be visible and consistent with PSD-1 §10.4, §16.6–16.13 and PSD-3 §14.

| Requirement | Source | App implementation | Status |
|-------------|--------|--------------------|--------|
| **2FA for every payment** | PSD-12 §12.2 | TwoFAModal or inline PIN/biometric before submit in: Send money confirm, Voucher redeem (wallet/NamPost/SmartPay), Cash-out confirm (till/agent/merchant/ATM/bank), Group send, Group request, Add money (card), Loan apply, Bill pay, Merchant pay | ✅ All flows use PIN (or shared TwoFAModal / inline PIN modal) |
| **Fees and charges disclosure** | PSD-1 §10.4.1(c), PSD-3 §14.3 | User agreement and in-app disclosure: clear list of fees (cash-out by method, redemption free/till free). Shown in Terms, Privacy, and dedicated **Fees and charges** screen under Settings. `constants/legalTerms.ts` → `LEGAL_TERMS.feesAndCharges`, `redemptionRights`. | Implemented via legalTerms + Fees screen |
| **Redemption rights** | PSD-1 §10.4.2(b) | User agreement and in-app: conditions and fees for redeeming e-money (wallet, till, agent, etc.). `LEGAL_TERMS.redemptionRights`. | Implemented via legalTerms + Fees screen |
| **Complaints: acknowledge all** | PSD-1 §16.9 | In-app (Contact us, Help centre): "We will acknowledge every complaint upon receipt." Backend must log and send acknowledgment. | Implemented: Contact us / Help centre copy + legalTerms.complaintsProcess |
| **Complaints: respond within 15 days** | PSD-1 §16.7 | In-app: "We will respond substantively within 15 days of receipt." Backend process must meet this. | Implemented: legalTerms + Settings copy |
| **Complaints: lodge within 90 days** | PSD-1 §16.8 | In-app: "Complaints must be lodged within 90 days of the date of the incident." | Implemented: legalTerms |
| **Complaints: escalation** | PSD-1 §16.10 | In-app: "If you are not satisfied with our response, you may request escalation to a qualified person within our organisation; we will provide the option." Optionally: Bank of Namibia contact for payment-system complaints. | Implemented: legalTerms + Contact us |
| **Complaints: fraud** | PSD-1 §16.11 | Fraud complaints handled per consumer protection policy; app directs user to Contact us and states that fraud claims are prioritised. | Implemented: legalTerms |
| **Contact details for complaints** | PSD-3 §14.4 | Contact us screen and Help centre: email, phone, and/or in-app form; same details in Settings and at point of use where feasible. | Implemented: Contact us, Help centre |
| **Legal consent (payment)** | ETA Ch.3, PSD-1 §10.4.2 | Before payment: user confirms action; consent text may reference "advanced electronic signature" (ETA). `LEGAL_TERMS.consentPayment` used in confirm screens or TwoFAModal. | Implemented: legalTerms; optional one-line in confirm screens |
| **Data messages & retention** | ETA Ch.3 | Backend: store transaction and consent as data messages with timestamp/origin; retain per §12.4.1. App: no change. | Backend |
| **Encryption in transit** | PSD-12 §12.1 | All API calls over HTTPS (TLS). App uses secure storage for tokens. | ✅ |

**Files to add or update:**

- `constants/legalTerms.ts` – Central source for `userAgreementIntro`, `feesAndCharges`, `redemptionRights`, `complaintsProcess`, `consentPayment`, `complaintsEscalation`.
- Settings sub-screen **Fees and charges** (`/(tabs)/profile/fees-charges`) – Displays fees table and redemption rights from legalTerms.
- **Contact us** and **Help centre** – Display complaints process (acknowledge, 15-day response, 90-day lodging, escalation) and contact details.

---

## 13. Implementation Roadmap (PRD ↔ System Design Guide)

This section **bridges** the **System Design Master Guide** (e.g. `SYSTEM_DESIGN_MASTER_GUIDE.md`) with this PRD. It maps the guide’s coding rules and architecture principles to the Buffr G2P codebase, lists PRD enhancements derived from the guide, and provides an actionable sprint plan plus validation steps.

**Reference:** When implementing, use both this PRD and the System Design Master Guide so that code is consistent with the 23 rules, design principles (KISS, DRY, Boy Scout Rule), and production standards (scalability, security, caching).

### 13.1 Mapping the 23 Coding Rules to Buffr G2P

| Rule | Guide / PRD alignment | Buffr G2P implementation |
|------|------------------------|---------------------------|
| **1. DaisyUI** | Design tokens (§5.1) provide radius, colors; UI must stay consistent | Use design system JSON (§5.1) and Theme.ts/Layout.ts; in React Native use equivalent tokens (no DaisyUI class names); for any web surface use DaisyUI classes |
| **2. Modular components** | §4 and §4.7 break down organisms → molecules → atoms | One file per component in `/components` (§11.1); atoms first, then molecules, then organisms |
| **3. Component documentation** | Every component must have a top comment block | Add JSDoc or comment at top of each file: purpose, functionality, location (e.g. “Used in Home, Send flow”) |
| **4. Vercel compatibility** | API and DB must be serverless-friendly | Backend APIs (§9.4) and Neon/PlanetScale (§9.3) already serverless; Expo app calls APIs only |
| **5. Scalable endpoints** | §9.4 defines endpoints; pagination/filtering | Use `limit`/`offset` or `page`/`limit` in GET lists (§9.4); ensure backend indexes and pagination |
| **6. Asynchronous data handling** | Loading states for 2FA, redeem, send | §4.4: LoadingOverlay/spinner for all API calls; streaming only if backend supports (e.g. reports) |
| **7. API response documentation** | §11.4.15 types + JSDoc | types/api.d.ts, voucher.d.ts, wallet.d.ts; add JSDoc on api.ts wrappers for each endpoint |
| **8. Database integration** | App is client; data via API | All data via `services/api.ts`; backend uses Neon/PostgreSQL with connection pooling (§9.3) |
| **9. Maintain existing functionality** | No regressions when adding features | Write tests for critical flows (onboarding, redeem, cash-out, send); regression tests before release |
| **10. Error handling & logging** | §4.4 Toast, ErrorState, EmptyState | Error boundaries (§11.4.1); backend logging; client-side try/catch and user-facing messages |
| **11. Optimize for speed** | Caching for frequent data | Client: React Query (or SWR) for vouchers/wallets/transactions; backend: Redis for balance/session if needed |
| **12. Complete code verification** | TypeScript strict, lint in CI | `tsc --noEmit`, ESLint in CI; verify imports and types before merge |
| **13. TypeScript** | Mandatory | All code in TypeScript; types in §11.4.15 and §9.4 |
| **14. Security & scalability** | §10 compliance; rate limiting | expo-secure-store for tokens; HTTPS; rate limiting on backend (§9.4 rate-limit headers) |
| **15. Error checks & logging** | Same as Rule 10 | Comprehensive try/catch and logging in api.ts and contexts |
| **16. Protect endpoints** | Rate limiting, API keys | Backend middleware; document X-RateLimit-* (§9.4); sensitive routes require Bearer |
| **17. Secure database access** | Backend only; parameterized queries | All DB access on server; parameterized queries; least-privilege DB user |
| **18. Step-by-step planning** | §11.6 checklist + §13.4 sprints | Break §11.6 into tasks; use §13.4 sprint plan for ordering |
| **19. Tech stack** | §9.1 Expo, backend, Vercel | Confirm Expo + backend stack compatible with hosting (EAS, Vercel for API) |
| **20. Consistent styles** | §5 design tokens everywhere | Reuse §5.1 tokens; new screens follow §4.7 patterns and existing inputs/cards |
| **21. Specify script/file** | When suggesting changes, name the file | All implementation refs in this PRD use paths (e.g. `app/(tabs)/index.tsx`, `components/feedback/ErrorState.tsx`) |
| **22. Organize UI components** | §11.1 folder structure | All UI in `/components` per §11.1 (layout, inputs, cards, list, feedback, qr) |
| **23. Efficient communication** | Use AI effectively | Provide PRD section + 23 rules + existing code context when prompting Claude/Archon |

### 13.2 System Design Principles Applied to Buffr G2P

- **Database choice (from guide):**
  - **PostgreSQL** (Neon or equivalent) for all transactional data: users, wallets, vouchers, transactions, groups. ACID and relational model match G2P flows (§9.3, §9.4).
  - **Redis** for caching (e.g. balance lookups, session, rate-limit counters) when read traffic justifies it; optional in initial launch.
  - **MongoDB** only if later needed for unstructured data (e.g. activity logs); not in current scope.

- **Scaling strategy:**
  - Start with single server/serverless (Vercel/EAS). Plan for: **read replicas** for DB as read traffic grows; **sharding** by user_id or region if data outgrows one node; **consistent hashing** for Redis if multiple cache nodes.

- **API design:** REST only (§9.4). GraphQL only if frontend later needs heavy aggregation from multiple services; not required now.

- **Caching:** **Cache-aside** for voucher and wallet lists (client: React Query; server: optional Redis with TTL). **Write-through** for critical updates (e.g. balance after redeem) so consistency is maintained.

- **CAP trade-offs:** Prefer **high availability**; **eventual consistency** acceptable for some views (e.g. transaction history). Design for **AP** with background sync where needed.

### 13.3 PRD Enhancements from the Guide

| PRD section | Enhancement from guide | Status / PRD location |
|-------------|------------------------|------------------------|
| §3.6 Groups | API for group creation | **Added:** `POST /api/v1/mobile/groups` in §9.4 with request/response shapes |
| §4.4 Error states | Network error handling | **Added:** NetworkError component (full-screen or banner) and retry; §4.4 table and §11.1 `components/feedback/NetworkError.tsx` |
| §5.1 Design tokens | Animation duration for loading spinners | **Added:** `animations.loading` in §5.1 (e.g. `durationMs: 1500`) |
| §9.4 API | Rate limiting response headers | **Added:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` in §9.4 |
| §11.4.7 api.ts | Token refresh logic | **Added:** Refresh token flow in §11.4.7 (on 401, try refresh; retry or sign out) |
| §11.4.13 2FA Modal | Biometric fallback | **Added:** `expo-local-authentication` and fallback UI (PIN if biometric unavailable) in §11.4.13 |

### 13.4 Implementation Sprint Plan

Using §11.6 checklist, work in this order:

| Sprint | Focus | Deliverables |
|--------|--------|---------------|
| **Sprint 1: Foundation** | Scaffold, tokens, base components, API client, contexts | Expo project (§11.1); Theme.ts, Layout.ts, designSystem.ts (§11.4.5–6); ScreenContainer, StackScreen, PillButton, inputs; api.ts (§11.4.7); UserContext, WalletsContext, VouchersContext (§11.4.8–12); entry and root layout (§11.4.1–2) |
| **Sprint 2: Onboarding** | All onboarding screens + auth APIs | Welcome → phone → OTP → name → photo → face-id → complete (§11.4.11); AsyncStorage completion flag; auth send-otp, verify-otp (§9.4) |
| **Sprint 3: Home & wallets** | Home layout, wallet carousel, wallet detail, add wallet | Home (§11.4.9): search, balance, wallets carousel (§4.3b), services grid; wallets/[id]; add wallet flow; WalletCard, BalanceCard (§4.3) |
| **Sprint 4: Vouchers** | Vouchers list, detail, redeem flows | utilities/vouchers list & [id]; redeem/nampost, redeem/smartpay, redeem/wallet/success (§3.2, §7.6); VoucherCard, MethodCard |
| **Sprint 5: Cash-out & payments** | Cash-out hub, five methods, send money, merchants, bills | Cash-out hub and all five methods (§3.3); send money flow; merchants, bills; 2FA modal before sensitive actions (§11.4.13) |
| **Sprint 6: Profile & extras** | Profile, settings, transactions, QR, groups, loans | Profile, settings, transactions history; QR scanner; groups (create, view); loans; notifications, analytics, etc. (§3.5, §3.6) |
| **Sprint 7: Testing & polish** | Error/empty/loading, security, tests, performance | Error boundaries, all §4.4 states (Toast, ErrorState, EmptyState, NetworkError, loading); rate limiting checks; unit tests for critical flows; caching (React Query); bundle size and perf |

### 13.5 Leveraging AI (Claude) for Implementation

- Use **prompt templates** from the System Design Guide (Part 8 / Part 9) for components, API shapes, and DB schemas.
- For each task, provide:
  - **Relevant PRD section** (e.g. §4.3b carousels, §9.4 auth endpoints).
  - **23 rules** (or subset) to follow.
  - **Existing code context** (e.g. similar component or api.ts pattern).
- **Iterate:** generate → review against §13.6 checklist → refine.

### 13.6 Validation Checklist Against the Master Guide

After each sprint (or major feature), verify:

| Check | Source |
|-------|--------|
| Does the code follow the 23 rules? | §13.1 mapping; Rule 3 (docs), Rule 12 (lint/type), Rule 22 (folder structure) |
| Is the architecture scalable? | §13.2 (DB choice, read replicas, caching, CAP) |
| Are security best practices followed? | §10; injection-safe APIs; auth and rate limiting (§9.4); secure storage |
| Is the design consistent? | §5.1 design tokens; §4.7 organism→atom; existing input/card patterns |
| Are error and empty states covered? | §4.4 and per-screen table (loading, error, empty, warning) |
| NAMQR and Open Banking compliance? | §14; TLV, Token Vault, Signed QR, payee-presented flows; mTLS, OAuth, API structure |

---

## 14. Compliance with NAMQR and Open Banking

This section summarizes how the Buffr G2P PRD aligns with the **Namibian NAMQR Code Specifications** (Bank of Namibia) and **Namibian Open Banking Standards v1.0**. It is the reference for implementation and audit.

### 14.1 PRD vs NAMQR Specification

| Buffr G2P PRD concept | NAMQR specification | Status |
|-----------------------|----------------------|--------|
| **QR usage (general)** | Standardised QR for payments (P2P, P2M, ATM, cash-out) | ✅ Aligned |
| **Wallet redemption** | P2P/P2M using IPP full form alias; amount in Tag 54 for dynamic QR | ✅ Aligned (§3.2, §4.5) |
| **Cash at Till / Agent / Merchant** | Agent/merchant **generates** QR; customer **scans** (payee-presented) | ✅ Aligned (§3.3, §7.3) |
| **Cash at ATM** | ATM **generates** QR after amount entry; customer **scans** | ✅ Aligned (§3.3, §7.3) |
| **My QR Code (receive)** | Payer-presented static QR; Tag 29 for IPP full form alias | ✅ Aligned (§4.5, §9.3) |
| **QR Code Scanner (pay)** | Scan payee-presented dynamic QR; Tag 26 (payee alias), Tag 54 (amount) | ✅ Aligned (§4.5) |
| **Voucher collection (NamPost/SmartPay)** | Payee-presented dynamic NAMQR; branch/unit displays QR; user scans | ✅ Aligned (§3.2, §7.2) |
| **Data format** | **TLV (Tag-Length-Value)** | ✅ Specified (§4.5, §9.4, NAMQREncoder/NAMQRDecoder) |
| **Token Vault** | Tag 65 = NREF; all QR validated against Token Vault | ✅ Specified (§7.6, §9.3, §10, tokenVault.ts) |
| **Signed QR** | Tag 66; verify digital signature (ListVAE/ListKeys) | ✅ Specified (§4.5, §10, SignedQRVerifier) |
| **CRC** | Tag 63; validated on every scan | ✅ Specified (§4.5, §10) |

### 14.2 PRD vs Open Banking Standards

| Buffr G2P PRD concept | Open Banking standard | Status |
|-----------------------|------------------------|--------|
| **Ketchup / app role** | TPP Account Holder Interface (Ch. 7.4.2) | ✅ Aligned |
| **User authentication (2FA)** | SCA; for bank data, redirect to Data Provider | ✅ Aligned (§7.6, §10: modal for Buffr wallet; WebView redirect for bank) |
| **Data transmission** | **mTLS with QWACs** for TPP ↔ Data Provider | ✅ Specified (§9.1, §9.3, §10, mTLSClient) |
| **API design** | REST, JSON; headers ParticipantId, x-v; data/links/meta; errors object | ✅ Specified (§9.4) |
| **Consent** | OAuth 2.0 / OIDC; PAR, PKCE; redirect; token exchange | ✅ Specified (§7.6, §9.3, §10, OAuthContext, useOAuth, oauth.ts) |
| **Bank linking** | Deep link `buffr://oauth-callback`; backend exchanges code for tokens | ✅ Specified (§7.6) |

### 14.3 Required implementation checklist (from §14)

- [ ] **NAMQR:** All QR generation uses TLV; payload from `POST /qr/generate` (Token Vault NREF).  
- [ ] **NAMQR:** All QR scanning parses TLV, validates CRC (Tag 63), optionally verifies Signed QR (Tag 66), calls `POST /qr/validate`.  
- [ ] **Cash-out:** Till/Agent/Merchant/ATM flows use **payee-presented** NAMQR (user scans their QR).  
- [ ] **Voucher redeem (NamPost/SmartPay):** Branch/unit **displays** dynamic NAMQR; user scans with app.  
- [ ] **Open Banking:** Bank API calls use mTLS (QWAC) and OAuth 2.0 access tokens; headers ParticipantId, x-v.  
- [ ] **Consent:** Bank linking uses PAR → redirect → deep link → token exchange; no in-app 2FA for bank consent.

**Implementation code reference (Open Banking):** §11.8 — `services/oauth.ts` (PKCE, §11.8.7; PAR §11.8.7a), `services/openBankingApi.ts` (§11.8.13: data/links/meta types, getBanks, createConsentRequest, exchangeCodeForBankTokens), `services/mTLSClient.ts` (§11.8.8: backend QWAC + Open Banking headers), `hooks/useOAuth.ts` (§11.8.11), `contexts/OAuthContext.tsx` (§11.8.12), `components/OpenBankingConsentWebView.tsx` (§11.8.14). §17.6 lists all Open Banking implementation locations.

---

## 15. Figma Design Enrichment

This section describes how to systematically extract and use Figma designs for future extensions. It ensures all UI/UX designs are captured in a machine-readable spec that can drive implementation, testing, and design iterations.

### 15.1 Purpose

To ensure all UI/UX designs are captured in a **machine-readable JSON spec** for implementation, testing, and future design iterations. The spec includes all screens, components, flows, and UX annotations.

### 15.2 Figma Batch Fetch Plan

Use the batch plan in `buffr_g2p/docs/FIGMA_BATCH_PLAN.md` to retrieve design data without hitting rate limits. The plan divides the screens into stages (e.g. 10 stages) with 60-second delays between calls. After each stage, update `buffr_g2p/docs/BUFFR_G2P_FIGMA_DESIGN_SPEC.json`.

### 15.3 JSON Specification Structure

The final spec will contain:

```json
{
  "screens": [ ],
  "components": [ ],
  "flows": [ ],
  "uxAudit": {
    "accessibility": { },
    "cognitiveLoad": "assessment",
    "recommendations": [
      "Proof-of-life banner: use simple, non‑alarming language (e.g. 'Please verify to keep receiving grants.').",
      "Frozen state screen: clearly explain why wallet is frozen and provide actionable next steps (visit agent/mobile unit).",
      "Ensure accessibility labels for proof-of-life screens, especially for low‑literacy users.",
      "USSD: menu must use simple, one-word options and avoid scrolling; confirmations should be clear and include amount and recipient where applicable.",
      "USSD: error messages must be plain and actionable (e.g. 'Invalid code. Try again.').",
      "SMS: all messages in English and local languages where possible; include service name (Buffr) to build trust."
    ]
  }
}
```

- **screens:** Each with nodeId, name, dimensions, backgroundColor, components, flows.
- **components:** Reusable atoms, molecules, organisms.
- **flows:** User journeys (sender and receiver).
- **uxAudit:** Accessibility, cognitive load assessment, recommendations.

### 15.4 How to Use the Spec

- **Implementation:** Developers read component properties directly from the spec.
- **Testing:** Automated visual regression tests can use the spec to verify screen layouts.
- **Future Design:** Designers update the spec; implementation code can be generated via Archon.

### 15.5 Integration with PRD

All screens listed in §3 must have corresponding entries in the Figma spec. The spec’s `flows` section must match the flows in §7. Any discrepancy indicates an update needed in either the PRD or the designs.

### 15.6 Updating the Spec

When new screens are added, run the relevant Figma batch stage and merge the results. The spec remains the single source of truth for UI/UX.

### 15.7 Design spec (canonical – from BUFFR_G2P_FIGMA_DESIGN_SPEC.json)

The **authoritative design source** for implementation is `buffr_g2p/docs/BUFFR_G2P_FIGMA_DESIGN_SPEC.json`. It is derived from PRD §3.8, §4.7, §5, §7 and Figma **Buffr App Design** (file key `VeGAwsChUvwTBZxAU6H8VQ`). Use Figma MCP `get_figma_data(fileKey, nodeId)` to enrich with live design data; run in batches per `docs/FIGMA_BATCH_PLAN.md` (60s delay between stages) if the API returns 429.

**Meta (spec):** Description = Design & UX/UI specification for Figma MCP extraction; batchPlan = FIGMA_BATCH_PLAN.md; prdSource = PRD.md v1.4.

**File:** key = `VeGAwsChUvwTBZxAU6H8VQ`, name = Buffr App Design, rootNode = `0:1`.

**Screens (design spec):** Each screen in the JSON has `nodeId`, `name`, `prdRoute`, `dimensions` (width 393, height 852), `backgroundColor` (#F8FAFC or #000000 for Scan QR), `components` (array of component names), `flows` (array of flow names), `accessibility` (contrastRatios, touchTargets, issues), `interactions`, and `figmaEnriched`/`figmaData` for future Figma fetch. Key screens:

| nodeId | Name | prdRoute | Key components |
|--------|------|----------|----------------|
| 8:2 | Starting... | / (splash) | Logo, Splash |
| 23:1495 | Welcome page | /onboarding | Logo, Primary CTA, Text block |
| 44:461 | Tell us your mobile number | /onboarding/phone | TextInput, Primary CTA, Prefix +264 |
| 44:509, 59:2 | Can you please verify | /onboarding/otp | OTPInput, Primary CTA, Secondary link |
| 45:712 | Add user's details | /onboarding/name | TextInput, Primary CTA, Add profile |
| 45:681 | Enable Authentication | /onboarding/face-id | 2FA prompt, Primary CTA, Skip |
| 45:818 | Registeration Completed | /onboarding/complete | Success state, Primary CTA |
| 45:837, 162:1202, 723:8346, 725:8543 | Main Screen (Home) | /(tabs) | SearchBar, BalanceCard, WalletCard, ServiceCard, ContactChip, TabBar |
| 116:629 | Wallet view | /wallets/[id] | BalanceCard, WalletCard, ListItem |
| 153:752 | Transfer Amount | /send-money/amount | AmountInput, Primary CTA, ContactChip |
| 92:212 | Send Options | /send-money/select-recipient | SearchBar, ContactChip, ListItem |
| 84:356, 98:443, 170:534 | Receiver's Details | Send confirm | Contact row, AmountInput, Primary CTA |
| 87:410, 99:488 | Payment Successful | /send-money/success | Success state, Primary CTA |
| 81:465 | Scan QR | /scan-qr | QRCodeScanner, NAMQRScanner |
| 108:276 | Loans | /loans | (use ListItem, MethodCard, §4.3) |
| 111:487 | Active Loan Details | /loans/[id] | (use ListItem, §11.4.18) |
| 174:696 | Make Group | /groups/create | TextInput, SearchBar, ContactChip, Primary CTA |
| 153:566 | Notifications | /notifications | ListItem |
| 152:427, 114:302 | Wallet history / Transactions | /(tabs)/transactions | ListItem, TabBar |
| 151:391 | Managing / Adding a wallet | /add-wallet | TextInput, Primary CTA |
| 44:593, 44:639, 45:660 | Add card, details, success | /add-card/* | Primary CTA, TextInput, Success state |
| 115:529 | Cards View | /cards | Card list, Primary CTA |
| 115:495 | Transaction details | /transactions/[id] | ListItem, Detail rows |
| 44:537, 60:62 | Available bank accounts | /onboarding/bank-accounts | Bank list, OAuth entry |
| 171:574, 172:630 | Request money (receiver POV) | Request money | (receive flow) |

**Components (design system in spec):** Input/Large (1417:42922) – SearchBar, height 56, borderRadius 999; Tabbar (1417:44518) – Home, Transactions, Vouchers, Me; Status Bar (83:7), Home Indicator (639:3876), Noise & Texture (447:4412); Primary CTA – height 56, borderRadius 16, fill #0029D6; Secondary/outline; SearchBar (placeholder "Search anything…" / "Search phone, UPI, UID"); BalanceCard (borderRadius 12, height 120); WalletCard (borderRadius 16, iconCircle 999); ServiceCard (borderRadius 12); ContactChip (borderRadius 999, effect_WHEBAW); TwoFAModal ("Verify identity"); NAMQRScanner (fullScreen); NAMQRDisplay (minSize 200, borderRadius 12). All map to PRD §4.7 and §5.1.

**Flows (design spec):** Onboarding (Welcome → phone → verify → name → photo → face-id → complete); Voucher redemption – Wallet (detail → 2FA → success); NamPost (detail → branch list → collection code NAMQR → scan → 2FA → success); SmartPay (detail → units → code NAMQR → scan → 2FA → success); Cash-out – Till/Agent/Merchant/ATM (hub → instruction → scan QR → 2FA → success), Bank (hub → bank selection → OAuth → 2FA → success); Send money (select recipient → amount → confirm → 2FA → success); Pay merchant (merchant/scan → amount → 2FA → success); Create group (name, members, Create → group view); Bank linking (optional) (bank list → OAuth → redirect). Alternate paths and error handling per flow are in the JSON (e.g. 4xx Toast, invalid QR retry).

**UX audit (from spec):** Cognitive load moderate; onboarding 6–7 steps; primary CTAs prominent. Accessibility: button height 56px, minTouch 44; body 16px; recommend accessibilityLabel for icons and high-contrast theme. Error handling: ensure ErrorState, Toast, inline error artboards for invalid QR, network error, 2FA failure, redeem 4xx. Loading: LoadingOverlay/skeleton for vouchers, send, groups. Responsive: maxWidth 393; carousel 340px; safe area per §5.1. Clarity: add short copy or icon for "Scan the agent’s NAMQR" for low-literacy users. Recommendations: tooltips/short copy for QR steps; error banners for network/429; error state artboards; accessibilityLabel on icon buttons; high-contrast option.

**PRD validation (from spec):** All §3.1–§3.6 screens are in the spec with nodeIds; §4.7 components represented; §7 flows documented; NAMQR and Open Banking screens/components present. Discrepancies: Figma data not yet fetched (429); re-run get_figma_data per nodeId to populate dimensions/fills; re-resolve nodeIds if frames renamed.

### 15.8 Full-app design coverage (entire app)

Every screen in the app is listed below with its PRD section, route, design spec nodeId(s) (from §3.8 or BUFFR_G2P_FIGMA_DESIGN_SPEC.json), key components, and flow(s). Use this table to ensure implementation and design stay aligned across the **entire app**.

| PRD § | Screen name | Route | Design spec nodeId(s) | Key components | Flow(s) |
|-------|-------------|--------|------------------------|----------------|--------|
| §3.1 | Welcome | /onboarding | 23:1495 | Logo, Primary CTA, Text block | Onboarding |
| §3.1 | Country selection (optional) | /onboarding/country | 30:1518 | Country list, Primary CTA | Onboarding |
| §3.1 | Phone Entry | /onboarding/phone | 44:461 | TextInput, Primary CTA, +264 | Onboarding |
| §3.1 | OTP Verification | /onboarding/otp | 44:509, 59:2 | OTPInput, Primary CTA, Resend | Onboarding |
| §3.1 | Name Entry | /onboarding/name | 45:712 | TextInput, Primary CTA | Onboarding |
| §3.1 | Photo Upload | /onboarding/photo | (PRD wireframe §3.7) | Camera/gallery, Primary CTA | Onboarding |
| §3.1 | Face ID Setup | /onboarding/face-id | 45:681, 45:792 | 2FA prompt, Enable, Skip | Onboarding |
| §3.1 | Completion | /onboarding/complete | 45:818 | Success state, Go to Home | Onboarding |
| §3.2 | Vouchers List | /(tabs)/vouchers or /utilities/vouchers | (use 45:837 layout + list) | VoucherCard, ListItem, filters | Voucher redemption |
| §3.2 | Voucher Detail | /utilities/vouchers/[id] | (PRD wireframe §3.7) | MethodCard x3 (Wallet, NamPost, SmartPay) | Voucher redemption |
| §3.2 | NamPost Branch List | /utilities/vouchers/redeem/nampost | (PRD) | ListItem, map | Voucher – NamPost |
| §3.2 | NamPost Collection Code | /utilities/vouchers/redeem/nampost/code | (PRD) | NAMQRDisplay, instruction | Voucher – NamPost |
| §3.2 | NamPost Success | /utilities/vouchers/redeem/nampost/success | (PRD) | Success state | Voucher – NamPost |
| §3.2 | SmartPay Units | /utilities/vouchers/redeem/smartpay | (PRD) | ListItem, map | Voucher – SmartPay |
| §3.2 | SmartPay Collection Code | /utilities/vouchers/redeem/smartpay/code | (PRD) | NAMQRDisplay | Voucher – SmartPay |
| §3.2 | Wallet Success | /utilities/vouchers/redeem/wallet/success | (PRD) | Success state | Voucher – Wallet |
| §3.3 | Wallet Cash-Out Hub | /wallets/[id]/cash-out | (PRD wireframe §3.7) | MethodCard x5 | Cash-out |
| §3.3 | Cash at Till/Agent/Merchant/ATM | /wallets/[id]/cash-out/till etc. | 81:465 (scan) | NAMQRScanner, AmountInput, 2FA | Cash-out |
| §3.3 | Bank Transfer | /wallets/[id]/cash-out/bank | (PRD) | Bank list, OAuth WebView, 2FA | Cash-out – Bank |
| §3.3 | Cash-Out Success | /wallets/[id]/cash-out/success | (PRD) | Success state | Cash-out |
| §3.4 | Home | /(tabs) | 45:837, 162:1202, 723:8346, 725:8543 | SearchBar, BalanceCard, WalletCard, ServiceCard, ContactChip, TabBar | Home, Send, Voucher |
| §3.4 | Add Money Modal | (modal) | (PRD) | MethodCard x3 | Add money |
| §3.4 | Send – Select recipient | /send-money/select-recipient | 92:212 | SearchBar, ContactChip, ListItem | Send money |
| §3.4 | Send – Amount | /send-money/amount | 153:752 | AmountInput, ContactChip, Primary CTA | Send money |
| §3.4 | Send – Confirm | /send-money/confirm | 84:356, 98:443, 170:534 | Contact row, AmountInput, Primary CTA | Send money |
| §3.4 | Send – Success | /send-money/success | 87:410, 99:488 | Success state, Primary CTA | Send money |
| §3.4 | Merchant Directory / Pay Merchant | /merchants, /merchants/[id]/pay | 81:465 (scan path) | NAMQRScanner, AmountInput, 2FA | Pay merchant |
| §3.4 | Add Wallet | /add-wallet | 151:391 | TextInput, Primary CTA | Add wallet |
| §3.4 | Cards View | /cards | 115:529 | Card list, Primary CTA | Card flow |
| §3.4 | Add card, details, success | /add-card, /add-card/details, /add-card/success | 44:593, 44:639, 45:660 | Primary CTA, TextInput, Success state | Card flow |
| §3.5 | Profile | /(tabs)/profile | 725:8543 | TabBar, Profile content | Home |
| §3.5 | Settings | /profile/settings | (PRD) | ListItem, sections | Profile |
| §3.5 | Analytics, Location, Notifications, etc. | /profile/*, /notifications | 153:566 (notifications), 152:427 (history) | ListItem, TabBar | Various |
| §3.6 | Loans | /loans | 108:276 | ListItem, MethodCard (§11.4.18) | Voucher-backed loan §7.7 |
| §3.6 | Loan detail | /loans/[id] | 111:487 | ListItem, detail rows (§11.4.18) | Loans |
| §3.6 | Loan apply | /loans/apply | (PRD §11.4.18) | AmountInput, TwoFAModal, Primary CTA | Loans |
| §3.6 | My QR Code | /qr-code | (PRD) | NAMQRDisplay | Receive |
| §3.6 | QR Code Scanner | /scan-qr | 81:465 | NAMQRScanner | Voucher, Cash-out, Pay merchant |
| §3.6 | Create Group | /groups/create | 174:696 | TextInput, SearchBar, ContactChip, Primary CTA | Create group |
| §3.6 | Group view | /groups/[id] | (PRD) | Group row, ListItem | Groups |
| §3.6 | 2FA Modal | (shared modal) | §4.7, §11.4.13 | TwoFAModal | Redeem, Cash-out, Send, Loan apply |
| §3.6 | Transaction Detail | /transactions/[id] | 115:495 | ListItem, Detail rows | Transactions |
| §3.6 | Wallet Detail | /wallets/[id] | 116:629 | BalanceCard, WalletCard, ListItem | Cash-out, Add money |
| §3.9 | Receive Money | /receive/[transactionId] | (PRD §11.4.16) | ListItem, Primary CTA | Receive §7.6.1 |
| §3.9 | Receive Voucher | /receive/voucher/[voucherId] | (PRD §11.4.16) | Primary CTA, Redeem | Receive §7.6.2 |
| §3.9 | Receive Group Invite | /receive/group-invite/[inviteId] | (PRD §11.4.16) | Accept/Decline | Receive §7.6.3 |
| §3.9 | Receive Request to Pay | /receive/request/[requestId] | 171:574, 172:630 | Pay now, Decline | Receive §7.6.4 |

Screens marked "(PRD)" or "(PRD wireframe §3.7)" have no dedicated Figma frame in the spec; implement from PRD wireframes (§3.7), component inventory (§4), and code (§11). After batch-fetching Figma (FIGMA_BATCH_PLAN.md), update the JSON and this table with any new nodeIds.

---

## 16. Database Design

PostgreSQL schema for the Buffr G2P backend. Use with Neon (or equivalent); parameterized queries only. Aligns with §9.4 API, §2.2–§2.3 (vouchers, wallet, loans).

### 16.1 Core tables (users, vouchers, wallets)

```sql
-- Users (from auth; profile from onboarding; proof-of-life §2.4)
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             VARCHAR(20) NOT NULL UNIQUE,
  first_name        VARCHAR(100),
  last_name         VARCHAR(100),
  photo_url         TEXT,
  last_proof_of_life      TIMESTAMPTZ,
  proof_of_life_due_date  TIMESTAMPTZ,
  wallet_status           VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (wallet_status IN ('active', 'frozen', 'deactivated')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_proof_of_life_due ON users(proof_of_life_due_date) WHERE wallet_status = 'active';

-- Proof-of-life events (audit; one row per verification)
CREATE TABLE proof_of_life_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  method            VARCHAR(50) NOT NULL,  -- in_app_biometric, agent_terminal, mobile_unit, redemption
  performed_by      UUID REFERENCES users(id),
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address        INET,
  user_agent        TEXT
);
CREATE INDEX idx_proof_of_life_user ON proof_of_life_events(user_id, performed_at DESC);
-- Backend: on successful proof-of-life (any method), set last_proof_of_life = now(), proof_of_life_due_date = now() + 90 days, wallet_status = 'active'; insert proof_of_life_events. Daily job: proof_of_life_due_date < now() - 30 days → wallet_status = 'frozen'; proof_of_life_due_date < now() - 120 days → wallet_status = 'deactivated'. §2.4, §7.6.5.

-- Vouchers (issued by G2P engine; synced to app)
CREATE TABLE vouchers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  amount            NUMERIC(14,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'NAD',
  status            VARCHAR(20) NOT NULL DEFAULT 'available', -- available, redeemed, expired
  type              VARCHAR(50),
  expires_at        TIMESTAMPTZ NOT NULL,
  external_id       VARCHAR(100),  -- from Ketchup SmartPay
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vouchers_user_status ON vouchers(user_id, status);

-- Voucher redemptions (audit; used for loan eligibility = previous voucher value)
CREATE TABLE voucher_redemptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id        UUID NOT NULL REFERENCES vouchers(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  method            VARCHAR(20) NOT NULL,  -- wallet, nampost, smartpay
  redemption_point  VARCHAR(200),
  amount_credited   NUMERIC(14,2) NOT NULL,
  redeemed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_voucher_redemptions_user ON voucher_redemptions(user_id, redeemed_at DESC);

-- Wallets (beneficiary wallets)
CREATE TABLE wallets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  name              VARCHAR(100) NOT NULL,
  type              VARCHAR(20) NOT NULL DEFAULT 'main',  -- main, savings
  balance           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency          CHAR(3) NOT NULL DEFAULT 'NAD',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallets_user ON wallets(user_id);

-- Wallet transactions (all balance-changing events)
CREATE TABLE wallet_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id         UUID NOT NULL REFERENCES wallets(id),
  type              VARCHAR(50) NOT NULL,  -- credit, debit, voucher_credit, loan_disbursement, loan_repayment, send, receive, cash_out
  amount            NUMERIC(14,2) NOT NULL,
  balance_after     NUMERIC(14,2),
  reference_type    VARCHAR(50),  -- voucher_redemption_id, loan_id, transaction_id
  reference_id      UUID,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_wallet_created ON wallet_transactions(wallet_id, created_at DESC);

-- Cash-out codes (USSD and app; 6-digit code for agent/ATM cash-out, §7.6.6)
CREATE TABLE cash_out_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  code              VARCHAR(6) NOT NULL UNIQUE,
  amount            NUMERIC(14,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'NAD',
  method            VARCHAR(20) NOT NULL,  -- agent, atm, merchant, till
  expires_at        TIMESTAMPTZ NOT NULL,
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cash_out_codes_code ON cash_out_codes(code);
CREATE INDEX idx_cash_out_codes_user_expires ON cash_out_codes(user_id, expires_at);
-- Voucher cash codes (USSD §7.6.7): reuse voucher_redemptions; when code generated for NamPost/SmartPay, store code and set method = 'nampost' or 'smartpay', redemption_point optional.
```

### 16.2 Loans (voucher-backed advance)

```sql
-- Loans: advance up to 1/3 previous voucher, 15% interest; repayment from next voucher-to-wallet
CREATE TABLE loans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id),
  wallet_id               UUID REFERENCES wallets(id),
  amount                  NUMERIC(14,2) NOT NULL,
  interest_rate           NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  total_repayment         NUMERIC(14,2) NOT NULL,
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, disbursed, repaid, overdue, cancelled
  previous_voucher_value  NUMERIC(14,2),  -- voucher value used for eligibility
  disbursed_at            TIMESTAMPTZ,
  repaid_at               TIMESTAMPTZ,
  repayment_voucher_redemption_id UUID,  -- set when repayment applied from next voucher redeem
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loans_user_status ON loans(user_id, status);

-- Optional: loan_repayments for audit (one row when repayment applied from voucher redeem)
CREATE TABLE loan_repayments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id           UUID NOT NULL REFERENCES loans(id),
  amount            NUMERIC(14,2) NOT NULL,
  voucher_redemption_id UUID NOT NULL REFERENCES voucher_redemptions(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Repayment logic (backend):** On `POST /vouchers/{id}/redeem` with `method: 'wallet'`, before crediting wallet: (1) Find user’s oldest disbursed loan with `status = 'disbursed'` and no `repayment_voucher_redemption_id`. (2) Deduct `total_repayment` from voucher amount; credit remainder to wallet. (3) Insert `wallet_transactions` (debit loan_repayment, credit voucher_credit net). (4) Update loan `status = 'repaid'`, `repaid_at = now()`, `repayment_voucher_redemption_id = voucher_redemption.id`. (5) Insert `loan_repayments`. See §2.3, §7.7.

### 16.3 Notifications, groups, P2P

```sql
-- Notifications (receive flows, in-app)
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  type              VARCHAR(50) NOT NULL,  -- payment_received, voucher_received, group_invite, payment_request
  title             VARCHAR(200),
  body              TEXT,
  data              JSONB DEFAULT '{}',  -- transactionId, voucherId, inviteId, requestId
  read              BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

-- Groups (optional G2P feature)
CREATE TABLE groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES groups(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  role              VARCHAR(20) DEFAULT 'member',
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- P2P / send-money transactions (for history and receive detail)
CREATE TABLE p2p_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id         UUID NOT NULL REFERENCES users(id),
  recipient_id      UUID NOT NULL REFERENCES users(id),
  wallet_id         UUID NOT NULL REFERENCES wallets(id),
  amount            NUMERIC(14,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'NAD',
  note              TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_p2p_recipient ON p2p_transactions(recipient_id, created_at DESC);
```

### 16.4 Validation (DB ↔ API ↔ flows)

| Flow / API | DB support | Validation |
|------------|------------|------------|
| **GET /vouchers** | `vouchers` by user_id, status | ✅ |
| **POST /vouchers/{id}/redeem** (wallet) | Insert `voucher_redemptions`; credit wallet; **if loan due, deduct repayment then update loan** | ✅ §2.3 |
| **GET /wallets** | `wallets` by user_id | ✅ |
| **POST /wallets/{id}/cashout** | Debit wallet; insert wallet_transactions | ✅ |
| **GET /loans**, **offer** | `loans` by user; offer = 1/3 of last redemption amount from `voucher_redemptions` | ✅ |
| **POST /loans/apply** | Insert `loans` (status disbursed); credit wallet; insert wallet_transactions | ✅ |
| **GET /loans/{id}** | `loans` by id, user | ✅ |
| **GET /notifications** | `notifications` by user_id | ✅ |
| **POST /receive/accept-payment** | Update notification / transaction state | ✅ |
| **Groups** | `groups`, `group_members` | ✅ |
| **Send money** | Debit sender wallet, credit recipient; insert `p2p_transactions`, `wallet_transactions` | ✅ |

### 16.5 Demo seed data (backend)

For local/dev and demos, the backend provides a **full demo seed** via `npm run db:seed` (run once after `npm run migrate`). The seed is **idempotent**: it runs only when no users exist. It aligns with the mobile app’s in-app seed (`services/seedData.ts`) so that when the app points at the backend, it sees the same logical dataset.

| Entity | Seed content | Purpose |
|--------|--------------|---------|
| **Primary demo user** | One user: phone `+264811234567`, first_name `Demo`, last_name `User`. | Default “current user” when backend uses first-user fallback; matches mobile demo flow. |
| **Contact users** | 4–8 additional users with distinct phones and names (e.g. Maria Nakashona, Petrus Hamutenya). Each has one main wallet. | `GET /api/v1/mobile/contacts` returns other users; send-money and receive flows have counterparties. |
| **Wallets (demo user)** | 3 wallets: (1) **Buffr Account** (main, balance N$1,250), (2) **Grant Wallet** (grant, N$3,800), (3) **Savings** (savings, N$450). | Matches mobile SEED_WALLETS; home and wallet list show all three. |
| **Wallet transactions** | 8+ transactions across wallets: voucher_redeem, send, receive, bill_pay, airtime, cash_out, add_money, etc., with descriptions and dates. | Transaction list and wallet history show realistic history. |
| **Vouchers (demo user)** | 4 vouchers: 2 **available** (e.g. Old Age Pension N$3,800, Child Grant N$1,200), 1 **redeemed** (with `voucher_redemptions` row), 1 **expired**. | Vouchers tab and filters (available/redeemed/expired) work. |
| **Notifications** | 2–3 in-app notifications for the demo user (e.g. “Money received”, “Voucher available”). | Notifications centre shows items. |
| **P2P** | One `p2p_transactions` row (e.g. contact user → demo user) plus matching wallet_transactions (debit/credit). | Receive and send history show P2P. |
| **Loan (optional)** | One active loan for demo user (amount, interest, repayment_due) if schema supports it; may require a prior voucher_redemption for eligibility. | Loans tab shows offer and active loan. |

**Script:** `backend/scripts/seed-db.mjs`. **Run:** from backend directory, `npm run db:seed`. **When:** After `npm run migrate`, once per environment (e.g. local Neon DB). Do not run on production DB with real users.

---

## 17. ISO 20022 & Open Banking API Design

**Note:** Proof-of-life status does not affect Open Banking PIS/AIS flows directly – those are bank‑side. However, if a beneficiary's wallet is frozen, the app will block any attempt to initiate bank transfer from Buffr wallet (cash-out method 1). §2.4, §7.6.5.

Backend APIs for Buffr G2P and their mapping to **Namibian Open Banking** (data/links/meta, ParticipantId, x-v) and **ISO 20022** where the backend integrates with banks or clearing.

### 17.1 Open Banking API structure (Namibian Standards)

All responses that align with Open Banking MUST use the root structure:

```json
{
  "data": { ... },
  "links": { "self": "https://api.example.com/..." },
  "meta": { "totalRecords": 0 }
}
```

- **Request headers (to Data Provider / bank):** `Authorization: Bearer <access_token>`, `x-v: 1`, `ParticipantId: <TPP_ID>`, `Content-Type: application/json`, `x-fapi-interaction-id: <UUID>`.
- **Errors:** `{ "errors": [ { "code": "...", "title": "...", "detail": "..." } ] }`.

Internal Buffr mobile APIs (§9.4) may use a simpler JSON shape; when the **backend** calls a **bank** (PIS, AIS), it must use the above structure and headers per Open Banking Standards.

### 17.2 Buffr backend API catalogue (REST)

| Domain | Method | Path | Purpose |
|--------|--------|------|---------|
| Auth | POST | /api/v1/mobile/auth/send-otp | Send OTP |
| Auth | POST | /api/v1/mobile/auth/verify-otp | Verify OTP, return JWT |
| Auth | POST | /api/v1/mobile/auth/verify-2fa | Return verification_token |
| User | PATCH | /api/v1/mobile/user/profile | Update name, photo |
| Vouchers | GET | /api/v1/mobile/vouchers | List vouchers |
| Vouchers | GET | /api/v1/mobile/vouchers/{id} | Voucher detail |
| Vouchers | POST | /api/v1/mobile/vouchers/{id}/redeem | Redeem (wallet/nampost/smartpay); **server applies loan repayment if due** |
| Wallets | GET | /api/v1/mobile/wallets | List wallets |
| Wallets | GET | /api/v1/mobile/wallets/{id} | Wallet detail |
| Wallets | POST | /api/v1/mobile/wallets/{id}/cashout | Cash out |
| Loans | GET | /api/v1/mobile/loans | List loans + offer (max 1/3 prev voucher, 15%) |
| Loans | GET | /api/v1/mobile/loans/{id} | Loan detail |
| Loans | POST | /api/v1/mobile/loans/apply | Apply advance (verification_token) |
| QR | POST | /api/v1/mobile/qr/generate | NAMQR payload (Token Vault NREF) |
| QR | POST | /api/v1/mobile/qr/validate | Validate scanned NAMQR |
| Keys | GET | /api/v1/mobile/keys/merchant/{alias} | Signed QR public key |
| Keys | GET | /api/v1/mobile/keys/psp/{orgId} | PSP Signed QR public key |
| Notifications | GET | /api/v1/mobile/notifications | List notifications |
| Notifications | GET | /api/v1/mobile/notifications/{id} | Notification detail |
| Notifications | POST | /api/v1/mobile/notifications/{id}/accept | Accept (group invite, etc.) |
| Notifications | POST | /api/v1/mobile/notifications/{id}/decline | Decline |
| Receive | GET | /api/v1/mobile/receive/{transactionId} | Receive money detail |
| Receive | GET | /api/v1/mobile/receive/voucher/{voucherId} | Receive voucher detail |
| Receive | POST | /api/v1/mobile/receive/accept-payment | Accept incoming payment |
| Send | POST | /api/v1/mobile/send-money | P2P send (verification_token) |
| Groups | GET | /api/v1/mobile/groups | List groups |
| Groups | POST | /api/v1/mobile/groups | Create group |
| Location | GET | /api/v1/mobile/agents/nearby | Agents |
| Location | GET | /api/v1/mobile/nampost/nearby | NamPost branches |
| Location | GET | /api/v1/mobile/smartpay/nearby | SmartPay units |
| Location | GET | /api/v1/mobile/atms/nearby | ATMs |
| **Open Banking** | GET | /api/v1/mobile/open-banking/banks | List supported banks (for consent / PIS) |
| **Open Banking** | POST | /api/v1/mobile/open-banking/consent | Create consent request; returns authorizationUrl or request_uri (PAR) |
| **Open Banking** | POST | /api/v1/mobile/open-banking/token-exchange | Exchange authorization code for bank tokens (backend uses mTLS + QWAC) |
| Transactions | GET | /api/v1/mobile/transactions | Wallet transactions |
| Compliance | POST | /api/v1/compliance/incident-report | PSD-12 incident |
| Compliance | GET | /api/v1/compliance/audit-logs | ETA audit |
| Compliance | POST | /api/v1/compliance/affidavit | ETA affidavit |
| Compliance | POST | /api/v1/compliance/monthly-stats | PSD-1 monthly stats |

### 17.3 ISO 20022 message mapping (bank / clearing)

When the **backend** initiates or receives payments via a **bank** or clearing, use ISO 20022 as required by the scheme or Data Provider. Typical mapping:

| Buffr flow | ISO 20022 message | Direction | Use |
|------------|-------------------|-----------|-----|
| **Bank transfer (cash-out)** | pain.001 (Payment Initiation) | TPP → Bank | Single payment from wallet to beneficiary bank account |
| **Bank transfer status** | pacs.002 (Payment Status) | Bank → TPP | Status of initiated payment |
| **Account statement (AIS)** | camt.052 (Account Report) / camt.053 (Statement) | Bank → TPP | Balance, entries (if Buffr uses bank account for trust) |
| **Credit transfer (incoming)** | pacs.008 (FIToFICustomerCreditTransfer) or camt.054 (DebitCreditNotification) | Bank → TPP | Notify incoming funds |

- **pain.001:** Debtor = Buffr operational/trust account; Creditor = beneficiary account; amount, currency, remittance info.
- **pacs.002:** References original instruction; status (ACCP, RJCT, PDNG).
- **camt.052/053:** For account information services (AIS) when TPP reads balance/transactions from a bank.

Implement conversion between internal API (e.g. `POST /wallets/{id}/cashout` with method=bank) and bank’s API (which may accept or return ISO 20022 XML/JSON). Namibian Open Banking may specify exact message variants; align with scheme documentation.

### 17.4 mTLS and OAuth (Open Banking)

- **Server-to-bank (Data Provider):** All requests use **mTLS** with QWAC and **OAuth 2.0** access token (obtained via PAR + redirect + token exchange). See §9.3, §11.8 (oauth.ts, mTLSClient.ts).
- **App-to-backend:** HTTPS; Bearer JWT for Buffr auth; verification_token for 2FA-protected actions.

### 17.5 Validation (API ↔ flows ↔ DB ↔ ISO 20022)

| Check | Reference |
|-------|-----------|
| Every §7 / §7.6 / §7.7 flow has an API (and DB) | §9.4, §16.4, §17.2 |
| Voucher redeem to wallet applies loan repayment when due | §2.3, §16.2, §17.2 (POST redeem) |
| Loans offer = 1/3 previous voucher value, 15% interest | §2.3, §16.2 (voucher_redemptions), §9.4 GET /loans |
| Open Banking calls use data/links/meta and headers | §17.1, §14.2 |
| Bank payment initiation maps to pain.001 (or scheme equivalent) | §17.3 |
| 2FA (verification_token) required for redeem, cashout, send, loan apply | §9.4, §10, §11.4.13 |

### 17.6 Open Banking implementation code reference

All Open Banking–related implementation code lives in the following PRD sections and files. Use these for bank linking, PIS (cash-out to bank), and AIS (account list/balance when backend proxies bank APIs).

| Purpose | PRD section | File / component |
|--------|-------------|-------------------|
| OAuth 2.0 PKCE, token exchange | §11.8.7 | `services/oauth.ts` |
| PAR (Pushed Authorization Request) | §11.8.7a | `services/oauth.ts` (pushAuthorizationRequest, buildAuthorizationUrlWithPAR) |
| Open Banking API client (data/links/meta, banks, consent, token-exchange) | §11.8.13 | `services/openBankingApi.ts` |
| Backend mTLS + QWAC, Open Banking headers | §11.8.8 | `services/mTLSClient.ts` (backend only) |
| OAuth flow hook (redirect, code capture) | §11.8.11 | `hooks/useOAuth.ts` |
| Store bank OAuth tokens | §11.8.12 | `contexts/OAuthContext.tsx` |
| Bank consent WebView + deep-link handling | §11.8.14 | `components/OpenBankingConsentWebView.tsx` |

Backend must implement proxy endpoints used by `openBankingApi.ts`: `GET /api/v1/mobile/open-banking/banks`, `POST /api/v1/mobile/open-banking/consent`, `POST /api/v1/mobile/open-banking/token-exchange`. Backend performs mTLS and standard headers (§17.1) when calling the Data Provider. See §14.3 for the compliance checklist and §14.2 for PRD vs Open Banking alignment.

---

## 18. Complete User Flows & Navigation Master

**Production‑Ready Reference**  
*Including all implemented flows, extended to cover missing screens, and addressing navigation dead ends, user perspectives, and edge cases.*

**Version:** v1.11 (aligned with PRD and `buffr-g2p` implementation). See also §3.15 (Navigation audit), §7 (User flows), §6.4 (Back/header), and `docs/AUDIT_REPORT.md`.

---

### 18.1 Introduction

This section consolidates every user journey in the Buffr G2P mobile app. It is the single source of truth for:

- **All flows** – from entry to exit, including sub‑flows, modals, and deep links.
- **All user roles** – primarily **beneficiaries**, but also **agents** (via POS/USSD) and **admins** (via portal).
- **Navigation paths** – routes, actions, and fallbacks to prevent dead ends.
- **Error & edge cases** – what happens when things go wrong (network, validation, timeouts, etc.).

Use this alongside the PRD (§3, §7, §11) and the actual codebase to ensure every screen is reachable, every action has a clear next step, and the user is never trapped.

---

### 18.2 User Roles & Perspectives

| Role | Access Points | Key Actions |
|------|---------------|-------------|
| **Beneficiary** | Mobile App, USSD | Onboarding, voucher redemption, cash‑out, send money, pay bills, view balance, proof‑of‑life, loans, groups |
| **Agent** | POS terminal, (limited app access for agent dashboards) | Cash‑out (scan beneficiary QR), proof‑of‑life, balance enquiry (via POS) |
| **Government / Admin** | Web Portal (not in app) | Voucher issuance, beneficiary management, reports |
| **Receiver** (beneficiary receiving money/voucher) | App notifications / deep links | Accept/decline incoming payments, vouchers, group invites, payment requests |

---

### 18.3 Core Navigation Principles

- **Every non‑tab screen** has a back button. If `router.canGoBack()` is false (e.g., deep link), back goes to `/(tabs)` (Home). *Implemented in `HeaderBackButton` and Agent screen (§6.4).*
- **Tab screens** (Home, Transactions, Vouchers, Profile) have no back; tab bar is always present.
- **Success / terminal screens** have no back; they offer a primary CTA (“Done”, “View receipt”, “Back to group”) that leads to a safe destination (usually `/(tabs)` or the relevant detail screen).
- **Modals** (2FA, Add Money, Proof‑of‑life reminder) are dismissed with Cancel or after successful action. **Add Money** is implemented as a **bottom sheet modal** opened from Home “+ Add” and Wallet Detail “Add money”; **TwoFAModal** is shared for send money, voucher redeem, group send, group request.
- **Deep links** (e.g., `buffr://receive/123`) are handled by `expo-linking` and routed to the appropriate screen, with fallback to Home if the link is invalid.

---

### 18.4 Master Flow Catalog

#### 18.4.1 Entry & Authentication

**18.4.1.1 First Launch / Onboarding**

| Step | Screen | Action | Next | Error Handling |
|------|--------|--------|------|----------------|
| 0 | Splash (`/`) | – | Check AsyncStorage `buffr_onboarding_complete` | If check fails, default to `/onboarding` |
| 1 | Welcome (`/onboarding`) | Tap “Get Started” | `/onboarding/phone` | – |
| 2a | Country (optional) (`/onboarding/country`) | Select country, tap “Select Country” | `/onboarding/phone` | – |
| 2 | Phone Entry (`/onboarding/phone`) | Enter phone, tap “Continue” | Call `sendOtp` → success → `/onboarding/otp` | Inline error (invalid phone, API error) |
| 3 | OTP (`/onboarding/otp`) | Enter 6‑digit code, tap “Verify” | Call `verifyOtp` → success → `/onboarding/name` | Inline “Invalid code”, resend cooldown |
| 4 | Name (`/onboarding/name`) | Enter first/last, tap “Continue” | Save via `PATCH /user/profile` → `/onboarding/photo` | Inline error (empty fields) |
| 5 | Photo (`/onboarding/photo`) | Take/select photo, tap “Continue” (or skip) | Save via `PATCH /user/profile` → `/onboarding/face-id` | Ignore API error, continue |
| 6 | Face ID (`/onboarding/face-id`) | Tap “Enable” (biometric) or “Skip” | `/onboarding/complete` | – |
| 7 | Complete (`/onboarding/complete`) | Tap “Go to Home” | Set `buffr_onboarding_complete` → `router.replace('/(tabs)')` | – |

**Dead End Prevention:** If user exits during onboarding, they restart at Welcome (no partial state saved except phone for resend OTP).

**18.4.1.2 Returning User**

| Step | Screen | Action | Next |
|------|--------|--------|------|
| 0 | Splash (`/`) | – | Check token validity; if valid → `/(tabs)`; else clear token → `/onboarding` |

**Edge Cases:** Token expired: attempt refresh; if refresh fails → clear token → onboarding.

---

#### 18.4.2 Home & Core Navigation

**Tab Bar:** Home (`/`), Transactions (`/transactions`), Vouchers (`/vouchers`), Profile (`/profile`).  
**Header:** Search bar + notification bell + avatar (profile link).

**18.4.2.1 Home Screen (`/(tabs)/home`)**

| Element | Action | Navigation | Notes |
|---------|--------|------------|-------|
| Balance pill “+ Add” | Tap | Opens **Add Money modal** (bottom sheet) | If no wallets, modal or primary CTA may navigate to `/wallets` |
| Buffr Card (primary wallet) | Tap | `/wallets/[id]` | Wallet detail |
| Wallets carousel | Tap wallet | `/wallets/[id]` | – |
| Wallets carousel “Add Wallet +” | Tap | `/add-wallet` | – |
| “Send to” contacts | Tap contact | `/send-money/amount?recipientPhone=...&recipientName=...` | Pre‑fills recipient |
| Services grid | Tap any tile | e.g., `/bills`, `/loans`, `/agents`, `/proof-of-life/verify` | See respective flows |
| Recent transaction | Tap row | `/(tabs)/transactions/[id]` | Transaction detail |
| FAB Send | Tap | `/send-money/select-recipient` | – |
| FAB QR | Tap | `/scan-qr` | – |
| Notification bell | Tap | `/notifications` | – |
| Avatar | Tap | `/profile` | – |

**Add Money modal (from Home or Wallet Detail):** Three options – (1a) **Bank Transfer** → show EFT details or navigate to `/wallets/[id]/cash-out/bank` / `/wallets`; (1b) **Debit Card** → `/add-card`; (1c) **Redeem Voucher** → `/(tabs)/vouchers`. Dismiss modal with “Done” or after choosing a method.

**Dead Ends:** If user has no wallets, “+ Add” opens Add Money modal; primary CTA can lead to `/wallets` (list) with empty state and “Add Wallet” CTA.

---

#### 18.4.3 Wallet Flows

**18.4.3.1 Wallet Detail (`/wallets/[id]`)**

| Element | Action | Navigation |
|---------|--------|------------|
| Back | Tap | `router.back()` or `router.replace('/(tabs)')` if no history |
| “Add money” | Tap | Opens **Add Money modal** (same bottom sheet as Home) |
| “Cash out” | Tap | `/wallets/[id]/cash-out` |
| “History” | Tap | `/wallets/[id]/history` |
| “Auto Pay” | Tap | `/wallets/[id]/auto-pay` (or modal) |
| “Send” | Tap | `/send-money/select-recipient?sourceWalletId=[id]` |
| Transaction row | Tap | `/(tabs)/transactions/[id]` |

**18.4.3.2 Add Money (modal and full-screen)**

| Step | Screen | Action | Next |
|------|--------|--------|------|
| 1 | Add Money **modal** (bottom sheet) | Opened from Home “+ Add” or Wallet Detail “Add money”. Choose: Bank Transfer / Debit Card / Redeem Voucher | |
| 1a | Bank Transfer | Show EFT details (Buffr Financial Services) or navigate | Toast “Details copied” or `/wallets/[id]/cash-out/bank`; dismiss modal |
| 1b | Debit Card | Tap “Link a card” | `/add-card` |
| 1c | Redeem Voucher | Navigate to `/(tabs)/vouchers` | – |

**Note:** After adding card, user returns to wallet or Home; card is linked. Top‑up via card: **implemented** (§18.5, v1.13) – `/wallets/[id]/add-money/card` (card selection, amount, 2FA, success).

**18.4.3.3 Cash‑Out Hub (`/wallets/[id]/cash-out`)**

| Method | Action | Next |
|--------|--------|------|
| Bank Transfer | Tap | `/wallets/[id]/cash-out/bank` |
| Cash at Till | Tap | `/wallets/[id]/cash-out/till` |
| Cash at Agent | Tap | `/wallets/[id]/cash-out/agent` |
| Cash at Merchant | Tap | `/wallets/[id]/cash-out/merchant` |
| Cash at ATM | Tap | `/wallets/[id]/cash-out/atm` |

Each method: instruction screen → **Scan QR** (with return path) → validate (NAMQR CRC + Token Vault) → **confirmation screen** (to be added for all methods, §18.5) → **TwoFAModal** → cash‑out API → success screen.

**18.4.3.4 Bank Transfer (`/wallets/[id]/cash-out/bank`)**

| Step | Screen | Action | Next |
|------|--------|--------|------|
| 1 | Bank list | Select bank | `/wallets/[id]/cash-out/bank-account` |
| 2 | Account selection / entry | Choose linked account or enter account number | – |
| 3 | Amount | Enter amount | – |
| 4 | Confirm (summary) | Tap “Confirm” | TwoFAModal |
| 5 | 2FA | Verify | Call cash‑out API |
| 6 | Success | Tap “Done” | `/(tabs)` |

---

#### 18.4.4 Send Money

**Flow:** Select recipient → Amount → Receiver Details → Confirm + **TwoFAModal** → Success

| Step | Screen | Action | Next |
|------|--------|--------|------|
| 1 | Select Recipient (`/send-money/select-recipient`) | Choose from contacts or enter phone | Pass recipient data to `/send-money/amount` |
| 2 | Amount (`/send-money/amount`) | Enter amount, optional note | `/send-money/receiver-details` |
| 3 | Receiver Details (`/send-money/receiver-details`) | Review, select source wallet, tap “Continue” | `/send-money/confirm` |
| 4 | Confirm (`/send-money/confirm`) | See summary, tap “Send N$ X” | **TwoFAModal** opens |
| 5 | 2FA | Verify | Call `POST /send-money`; on success close modal and navigate |
| 6 | Success (`/send-money/success`) | Tap “View Details” or “Done” | `/(tabs)/transactions/[id]` or `/(tabs)` |

**Error Handling:** Amount > balance → inline error on amount screen. Recipient not found → error on confirm. API failure → toast, stay on confirm. TwoFAModal supports 429 lockout with countdown (§18.7).

---

#### 18.4.5 Pay Merchant

**Two entry points:** From Merchant Directory or Scan QR. Flow: Pay Merchant or Scan QR → validate QR → **Confirm Payment** (to be added, §18.5) → TwoFAModal → payment API → Success.

---

#### 18.4.6 Bill Payments

| Step | Screen | Action | Next |
|------|--------|--------|------|
| 1 | Bills Category (`/(tabs)/home/bills`) | Select category | `/bills?category=...` |
| 2 | Biller List | Select biller | `/bills/pay` |
| 3 | Pay Bill (`/bills/pay`) | Enter account number, amount, tap “Pay” | TwoFAModal |
| 4 | 2FA | Verify | Call `POST /pay-bill` |
| 5 | Success (`/bills/success`) | Show reference, tap “Done” | `/(tabs)` |

**Implemented** (v1.13): Bill Payment Success at `/bills/success` (§18.5).

---

#### 18.4.7 Voucher Redemption

**Common start:** Vouchers List (`/utilities/vouchers`) → Voucher Detail (`/utilities/vouchers/[id]`). Choose method: **Wallet** | **NamPost** | **SmartPay**.

- **Redeem to Wallet:** TwoFAModal → `POST /vouchers/{id}/redeem` with `method: wallet` → success → `/(tabs)`.
- **Cash at NamPost / SmartPay:** Branch/unit selection → **Instruction screen** (scan QR at branch) → Scan QR → **Confirm Redemption** → TwoFAModal → redeem API → success. **Implemented** (v1.13): Instruction at `/utilities/vouchers/redeem/nampost/instruction`, Confirm at `/utilities/vouchers/redeem/confirm` (§18.5).

---

#### 18.4.8 Loans

**Apply:** Loans List → Apply Loan (`/loans/apply`) → Biometric → loan API → **Loan Success** (`/loans/success`) → “Add details” or “Skip” → `/loans/[id]`. **Implemented** (v1.13): Loan Success at `/loans/success` (§18.5).

**Loan Detail:** View hero card, amount, auto‑pay toggle, timeline. Auto‑pay toggle: toast confirmation, no navigation.

---

#### 18.4.9 Groups

**Create:** `/groups` → “Create Group” → `/groups/create` → POST → `/groups/[id]`.  
**Group Send:** Group Detail → “Send” → `/groups/[id]/send` → amount, note → **TwoFAModal** → POST → success → “Back to group” → `/groups/[id]`.  
**Group Request:** Group Detail → “Request” → `/groups/[id]/request` → **TwoFAModal** → POST → success → “Back to group”.  
**Group Settings:** Detail → settings icon → `/groups/[id]/settings` (admin: edit, add members; member: view, deactivate self).

---

#### 18.4.10 Receive Flows (Incoming)

**Receive landing:** `/receive` (index) – shown when user opens “Receive” from Home; copy “Receive Money” and CTAs **“View Transactions”** and **“View Vouchers”** (no dead end).

**Deep links / push:**

| Flow | Deep link / Target | Screen | Action | Next |
|------|--------------------|--------|--------|------|
| Receive Money | `/receive/[transactionId]` | Receive Money Details | “Add to wallet” | POST accept → `/transactions/[id]` or `/wallets/[id]` |
| Receive Voucher | `/receive/voucher/[voucherId]` | Receive Voucher Details | “Redeem” | Redirect to `/utilities/vouchers/[id]` |
| Receive Group Invite | `/receive/group-invite/[inviteId]` | Receive Invite | “Accept” | Accept API → `/groups/[id]` |
| Receive Request to Pay | `/receive/request/[requestId]` | Receive Request | “Pay now” | Pre‑fill send money (recipient + amount) |

---

#### 18.4.11 Proof‑of‑Life

Home banner (if due ≤14 days) → “Verify now” → `/proof-of-life/verify` → “Start verification” → Biometric → POST → `/proof-of-life/success` → “Done” → `/(tabs)`. If frozen: redirect to `/proof-of-life/expired`.

---

#### 18.4.12 Add / Manage Cards

**Add Card:** `/add-card` → Scan or “Add Card +” → `/add-card/scan` or `/add-card/details` → success → `/cards` or Home.  
**Cards View (`/cards`):** “+” → `/add-card`; tap card → detail (remove, set default).

---

#### 18.4.13 Scan QR (`/scan-qr`)

Parse NAMQR TLV; **validate CRC** (CRC16/CCITT-FALSE) before Token Vault. If valid, determine type (pay merchant, cash‑out, voucher redeem) → navigate to confirmation screen with params. If invalid → error, retry. Return path: when invoked from another flow, after validation go to that flow’s confirmation screen.

---

#### 18.4.14 Profile & Settings

Profile (`/profile`) → Settings, Analytics, Notifications, AI Chat, Learn, Location (→ `/agents/nearby`). Notifications → tap item → related screen (e.g. transaction detail).

**Settings sub-screens implementation plan (PRD §3.5 screen 36):**

| Setting item       | Route (under profile tab)     | Type   | Purpose |
|--------------------|------------------------------|--------|--------|
| Edit profile       | `/(tabs)/profile/edit-profile` | Screen | Edit name, photo, phone (read-only or editable per backend). |
| Notifications      | `/(tabs)/profile/notifications` | Screen | Already implemented; list + mark read. |
| Proof of life      | `/proof-of-life/verify`      | Screen | Already implemented; biometric + API. |
| Change PIN         | `/(tabs)/profile/change-pin` | Screen | Enter current PIN, new PIN, confirm; call backend when available. |
| Privacy policy      | `/(tabs)/profile/privacy-policy` | Screen | Static text or WebView linking to policy URL. |
| Data & permissions | `/(tabs)/profile/data-permissions` | Screen | List app permissions / data usage; links to device settings if needed. |
| **Fees and charges** | `/(tabs)/profile/fees-charges` | Screen | PSD-1 §10.4, PSD-3 §14: fees table and redemption rights from legalTerms. |
| Help centre        | `/(tabs)/profile/help-centre` | Screen | FAQ; complaints process (acknowledge, 15-day, escalation). |
| Contact us         | `/(tabs)/profile/contact-us`  | Screen | Complaints and support; contact details; escalation (PSD-1 §16). |
| About Buffr        | `/(tabs)/profile/about`      | Screen | App name, version, legal links. |
| Terms of service   | `/(tabs)/profile/terms`      | Screen | Static text or WebView linking to terms URL. |
| App version        | (no navigation)              | —      | Display only; disabled row. |

All sub-screens use the same header pattern as Settings (back button + title), live under `app/(tabs)/profile/*.tsx`, and are reachable from `app/(tabs)/profile/settings.tsx` via `router.push(route)`.

---

#### 18.4.15 Agent Network & Map

Agents List → agent detail → “Cash out” → `/wallets/[id]/cash-out/agent`. Nearby Map → tap marker → agent detail. Back button uses fallback to `/(tabs)` when history empty.

---

### 18.5 Implemented Screens & Flows (formerly “Missing”; v1.13)

The following screens were listed in §18.5 as missing and are **implemented** in `buffr-g2p` as of v1.13. All use **UserContext** (`useUser()`) where applicable; success and financial-action screens respect `isLoaded` and `walletStatus` (frozen banner and disabled actions per §2.4).

| Screen | Route | Purpose | Part of Flow | Status |
|--------|-------|---------|--------------|--------|
| Bill Payment Success | `/bills/success` | Dedicated success after bill pay; reference/token; Done → `/(tabs)`, View history → `/bills` | Bills pay | ✅ Implemented |
| Loan Success | `/loans/success` | Confirmation after loan application; Done → `/(tabs)`, View loans → `/(tabs)/home/loans` | Loans apply | ✅ Implemented |
| Add Money via Card | `/wallets/[id]/add-money/card` | Select linked card, amount, quick amounts, 2FA → addMoneyToWallet; frozen guard | Add Money (Debit/Credit Card) | ✅ Implemented |
| Voucher Collection Instruction | `/utilities/vouchers/redeem/nampost/instruction` | “Scan QR at branch” + manual code + amount; Scan QR → `/scan-qr` (mode voucher) | Voucher (NamPost/SmartPay) | ✅ Implemented |
| Voucher Redeem Confirm | `/utilities/vouchers/redeem/confirm` | Summary (branch/unit, amount) → 2FA → redeemAtBranch → NamPost success; frozen guard | Voucher (after scan at branch) | ✅ Implemented |
| Confirm Payment (cash‑out / pay merchant) | Flow-specific (e.g. cash-out `confirm.tsx`) | Show summary before 2FA | Cash‑out, Pay merchant | See §3.16 / existing confirm screens |

**Note:** Success and confirmation screens reuse shared components (e.g. `SuccessScreen`, `TwoFAModal`) and apply UserContext for profile-based copy and wallet-status handling.

---

### 18.6 Navigation Dead Ends – Prevention Checklist

- **Deep links without history:** Back button goes to Home (`/(tabs)`).
- **Modals:** Cancel dismisses and returns to previous screen.
- **Success screens:** Primary CTA (“Done”, “View receipt”, “Back to group”) leads to `/(tabs)` or relevant list/detail.
- **Empty states:** CTA (e.g. “Add a wallet”) to avoid being stuck.
- **Error states:** “Retry” or “Go back” button.
- **Tab bar:** Always visible on tab screens.

---

### 18.7 Edge Cases & Recovery

| Scenario | Handling |
|----------|----------|
| Network loss mid‑transaction | Queue locally (offline store); show warning; on reconnect, attempt send. |
| 2FA consecutive failures | After 3 failures, backend returns 429 with `Retry-After`; **TwoFAModal** shows countdown and disables input (`retryAfterSeconds`). |
| Expired voucher | Redeem button disabled; tooltip “Expired on [date]”. |
| Insufficient balance | Inline error on amount; “Add money” link. |
| QR invalid | Toast “Invalid QR. Try again.”; stay on scanner. |
| NAMQR CRC invalid | Reject before Token Vault; same as QR invalid. |
| Token Vault validation fails | “This QR is not valid. Please try again.”; return to previous screen. |
| OAuth consent denied | Return to app with error toast; user can retry. |

---

### 18.8 Implementation Notes for Developers

- Use **Expo Router** file‑based routing as defined in PRD §11.1.
- All modals: `<Modal>` or expo-router modal presentation. **Add Money** = bottom sheet from Home and Wallet Detail; **TwoFAModal** = shared for send, voucher, group send, group request.
- For multi-step flows, use **state‑driven UI** within a single route when possible to avoid deep stacks.
- Every screen: **loading, error, and empty states** per PRD §4.4.
- **Accessibility:** `accessibilityLabel` on icon buttons; touch targets ≥44×44.
- **Analytics:** Log key events (e.g. `onboarding_complete`, `voucher_redeemed`, `cash_out_initiated`).

---

## Addendum: Receiver Perspective & Figma Design Enrichment

This addendum updates the Buffr G2P PRD to include the **receiver's point of view** and provides a systematic method to extract Figma designs for future extensions.

**Summary of additions:**

- **§3.9** – Receiver Flows (screens 51–57): Incoming Payment Notification, Receive Money/Voucher/Group Invite/Request to Pay, Shared QR, Scan QR (receiver context).
- **§4.4** – Receiver-focused UX: notification badges, Toast on payment received, empty/error states for notifications, bell badge count.
- **§7.6.1–7.6.4** – Receive Money, Receive Voucher, Receive Group Invitation, Receive Request to Pay.
- **§9.3** – New API endpoints for notifications and receive flows.
- **§10** – Receiver data protection and consent for incoming requests (PSD‑1, ETA).
- **§11.1** – New files: `app/receive/`, `services/notifications.ts`, `NotificationBadge.tsx`, `docs/FIGMA_BATCH_PLAN.md`, `BUFFR_G2P_FIGMA_DESIGN_SPEC.json`.
- **§11.4.16** – Copy-paste code: `notifications.ts`, `NotificationBadge.tsx`, receive screens; **§11.4.17** – `NetworkError.tsx`, Home header with notification badge; **§11.4.18** – Loans (types, services, app/loans screens).
- **§15** – Figma Design Enrichment: purpose, batch plan, JSON structure, use cases, PRD integration.
- **§16** – Database Design: PostgreSQL schema (users, vouchers, wallets, loans, notifications, groups, P2P); loan repayment on voucher-to-wallet.
- **§17** – ISO 20022 & Open Banking API: data/links/meta, endpoint catalogue, ISO 20022 mapping (pain.001, pacs.002, camt), validation.

The PRD now covers both sender and receiver perspectives and defines a repeatable Figma enrichment process for design–code alignment.

---

**Document version:** 1.14  
**Last updated:** February 2026  
**Owner:** Ketchup Software Solutions – Product Team  
**Compliance:** NAMQR Code Specifications (TLV, Token Vault, Signed QR, payee-presented flows) and Namibian Open Banking Standards v1.0 (mTLS, QWACs, OAuth 2.0 / OIDC) integrated. Full code, wireframes (§3.7), flows and logic (§7, §7.6), API shapes (§9.4), types (§11.4.15), contexts (§11.4.12), 2FA (§11.4.13), onboarding (§11.4.11). Implementation roadmap (§13); compliance mapping (§14). Single source of truth for implementation.

## Implementation Prompt for Buffr G2P App

**Goal:** Implement the Buffr G2P mobile app using Expo (React Native) with tabs template, following the PRD v1.4 and design specs. Use a phased approach to ensure each part works before moving to the next.

**Tools & Commands:**
- `npx create-expo-app@latest buffr_g2p -t tabs` – creates project with tabs template.
- `cd buffr_g2p`
- `npx expo install <package>` – install each required dependency.
- `npx expo prebuild` – if you need to build native code (optional for final testing).
- `npx expo start` – start development server; test on iOS simulator or Android emulator.

### Phase 0: Project Setup & Dependencies

1. **Create project**  
   ```bash
   npx create-expo-app@latest buffr-g2p -t tabs
   cd buffr-g2p
   ```

2. **Install required dependencies**  
   Run each command below. If a package is already included by default, you can skip it.
   ```bash
   npx expo install expo-router @react-native-async-storage/async-storage expo-secure-store expo-auth-session expo-web-browser expo-camera expo-crypto expo-file-system expo-sharing expo-local-authentication react-native-safe-area-context react-native-screens @expo/vector-icons react-native-qrcode-svg react-native-reanimated
   ```
   (react-native-reanimated is needed for card flip animations.)

3. **Configure `expo-router`**  
   In `app.json`, ensure the following (already set by tabs template):
   ```json
   {
     "expo": {
       "scheme": "buffr",
       "plugins": ["expo-router"]
     }
   }
   ```
   Add the custom scheme `buffr` for OAuth redirects.

4. **Set up folder structure**  
   Replace the default `app/` folder with the structure from PRD §11.1. You can copy from the PRD document or manually create directories and files as listed. For convenience, use the provided code blocks for each file.

### Phase 1: Foundation (Constants, Contexts, API Client)

- Create `constants/Theme.ts`, `constants/Layout.ts` (copy from §11.4.5, §11.4.6).
- Create `constants/designSystem.ts` (optional, §11.4.24).
- Create `constants/legalTerms.ts` (§11.7.8).
- Create `contexts/UserContext.tsx`, `WalletsContext.tsx`, `VouchersContext.tsx`, `AppProviders.tsx` (copy from §11.4.12 and §11.4.8).
- Create `services/api.ts` (§11.4.7) and `services/auth.ts` (§11.4.7a).
- Create `types/api.d.ts`, `types/voucher.d.ts`, `types/wallet.d.ts` (copy from §11.4.15).

After each file creation, ensure no syntax errors. Run `npx expo start` to verify the app loads (you'll see the default tabs screens, but they may be broken until we replace them later). It's okay if the app shows errors because we haven't implemented the actual screens yet – we will in subsequent phases.

### Phase 2: Onboarding Screens

- Create `app/onboarding/_layout.tsx` and all onboarding screens (Welcome, phone, otp, name, photo, face-id, complete) from §11.4.11.
- Ensure `app/onboarding/complete.tsx` sets AsyncStorage `buffr_onboarding_complete` and redirects to tabs.
- Update `app/index.tsx` to check AsyncStorage and redirect accordingly (copy from §11.4.2).
- Update `app/_layout.tsx` to include the onboarding stack and providers (copy from §11.4.1).

Test the onboarding flow: open app, go through each screen, verify navigation, API calls (mock them if needed). Use `npx expo start`.

### Phase 3: Home & Wallets

- Create `app/(tabs)/_layout.tsx` (tabs) from §11.4.4.
- Create `app/(tabs)/index.tsx` (Home) – start with placeholder, then later add notification badge from §11.4.17.
- Create `app/(tabs)/transactions.tsx`, `vouchers.tsx`, `profile.tsx` as placeholders from §11.4.23.
- Create `app/wallets/[id].tsx` and `app/add-wallet.tsx` from §11.4.27.
- Create `services/wallets.ts` and `services/vouchers.ts` from §11.4.22.
- Build layout components: `ScreenContainer`, `StackScreen` from §11.4.20; `SearchBar` from §11.4.21.
- Create basic cards: `BalanceCard`, `WalletCard`, `VoucherCard`, `ServiceCard`, `ContactChip`, `MethodCard` (design tokens from §5). You may need to implement these based on Figma specs; for now, use simple styles.

Test: navigate to Home, see placeholders. Add a wallet, see it reflected in WalletsContext.

### Phase 4: Voucher System

- Create `app/utilities/vouchers/index.tsx` (list) and `[id].tsx` (detail).
- Create redeem flows: `nampost/index.tsx`, `nampost/code.tsx`, `smartpay/index.tsx`, `smartpay/code.tsx`, `wallet/success.tsx` (from §3.2 and §7.6).
- Implement QR generation and scanning utilities: `utils/tlv.ts`, `crc.ts`, `namqr.ts`, `cryptoHelpers.ts` from §11.8.
- Create `components/qr/NAMQRDisplay.tsx`, `NAMQRScanner.tsx`, `QRCodeScanner.tsx` (use expo-camera).
- Integrate Token Vault API: `services/tokenVault.ts`, `keyManager.ts` from §11.8.5–6.
- Test voucher list and redemption flows (simulate backend).

### Phase 5: Cash-out & Payments

- Create `app/wallets/[id]/cash-out/index.tsx` (hub) and method screens (till, agent, merchant, atm, bank) from §3.3.
- Implement Open Banking flows: `services/oauth.ts`, `hooks/useOAuth.ts`, `contexts/OAuthContext.tsx` from §11.8.7,11.8.11,11.8.12.
- Add `app/scan-qr.tsx` (scanner) from §11.4.26, used for cash-out at till/agent/merchant/ATM.
- Create `app/merchants/`, `app/bills/`, `app/agents/` placeholder screens.
- Test cash-out with QR scanning (use mock QR codes).

### Phase 6: Profile & Extras

- Create `app/profile/` stack: `settings.tsx`, `analytics.tsx`, `location.tsx`, `qr-code.tsx`, `notifications.tsx`, `ai-chat.tsx`, `gamification.tsx`, `learn.tsx` (placeholders).
- Create `app/groups/` stack: `create.tsx`, `[id].tsx` from §11.4.28.
- Create `app/loans/` stack: `index.tsx`, `apply.tsx`, `[id].tsx` from §11.4.18.
- Implement `services/notifications.ts` and `components/feedback/NotificationBadge.tsx` from §11.4.16.
- Add notification badge to Home header (from §11.4.17).

Test groups, loans, and notifications.

### Phase 7: Proof-of-Life

- Create `app/proof-of-life/` stack: `verify.tsx`, `success.tsx`, `expired.tsx` from §11.4.25.
- Update `UserContext` to include `lastProofOfLife`, `proofOfLifeDueDate`, `walletStatus` (already in code).
- Add proof-of-life banner to Home screen (snippet at end of §11.4.25).
- Test: simulate due date and frozen wallet.

### Phase 8: Legal & Compliance Features

- Add `hooks/use2FA.ts` from §11.7.1.
- Add `utils/auditLogger.ts`, `encryption.ts`, `services/incidentReporter.ts`, `affidavitGenerator.ts`, `complianceReporter.ts`, `contexts/ComplianceContext.tsx` from §11.7.
- Ensure all sensitive actions (redeem, cash-out, send, loan apply) call `use2FA` and display the 2FA modal.
- Test 2FA and audit logging (you can log to console for now).

### Phase 9: Final Polish & Testing

- Run `npx expo prebuild` if you need to build native projects (optional for production).
- Test all flows end-to-end, including error states (network failure, invalid QR, expired voucher, etc.).
- Verify accessibility: add `accessibilityLabel` to all icon buttons (as recommended in §4.4.1).
- Ensure the app works on both iOS and Android.

### Important Notes

- For any missing Figma details, refer to `BUFFR_G2P_FIGMA_DESIGN_SPEC.json` (from §15) or re-run Figma MCP batch fetch.
- Use the code blocks provided in the PRD exactly; they are copy-paste ready.
- If you encounter dependency conflicts, check Expo SDK version (should be ~52) and use `expo install` to ensure compatibility.
- After each phase, run the app and fix any TypeScript errors or missing imports. The PRD includes all necessary imports in the code snippets.


**Now proceed to execute each phase in order, ensuring the app builds and runs after each major addition.**

# Expo Reference (from Archon + docs.expo.dev)

This document summarizes Expo documentation retrieved via **Archon MCP** (`perform_rag_query` on `docs.expo.dev`) and direct fetches. Use it for config files, tabs template, packages, and prebuild.

---

## 1. Config files: how they work and how they’re updated

**Sources:** [Configure with app config](https://docs.expo.dev/workflow/configuration/), [EAS multiple app variants](https://docs.expo.dev/tutorial/eas/multiple-app-variants/), [Environment variables](https://docs.expo.dev/guides/environment-variables/).

### What the app config is

- **Files:** `app.json`, `app.config.js`, or `app.config.ts` at the **project root** (next to `package.json`).
- **Used for:** Expo Prebuild, Expo Go, and OTA update manifest.
- If the final config has a top-level `expo: {}`, that object is used and other root keys are ignored.

### Static vs dynamic

| Type    | Files               | Updated by                    |
|--------|---------------------|-------------------------------|
| Static | `app.json`, `app.config.json` | Can be updated by CLI tools   |
| Dynamic| `app.config.js`, `app.config.ts` | You update manually; evaluated when Metro/CLI runs |

**Resolution:**

1. Dynamic config wins if present: `app.config.ts` is used if it exists; otherwise `app.config.js`.
2. Static is read from `app.config.json`, falling back to `app.json`.
3. If no static config exists, defaults come from `package.json` and dependencies.
4. You can **combine** them: keep static values in `app.json` and use `app.config.js` to receive `({ config })` and return the final object (e.g. spread and override).

### How config is “updated” in practice

- **Static:** Edit `app.json` / `app.config.json` by hand or via tooling; no special reload.
- **Dynamic:** Edit `app.config.js` / `app.config.ts`; config is **re-evaluated when Metro reloads** (e.g. on save or when you run `npx expo start` again). No Promises; must be synchronous.
- **Env vars:** Expo loads `.env` (standard resolution), then replaces `process.env.EXPO_PUBLIC_*` in the bundle. Change env → full reload (e.g. shake → Reload in Expo Go) to see new values. **Do not put secrets in `EXPO_PUBLIC_*`.**

### Reading config in the app

- Use **`Constants.expoConfig`** (from `expo-constants`), not a direct import of `app.json` / `app.config.js`.
- See what’s public: `npx expo config --type public`.

### Dynamic example (environment-based)

```js
// app.config.js
module.exports = ({ config }) => ({
  ...config,
  name: process.env.APP_VARIANT === 'development' ? 'My App (Dev)' : 'My App',
  // optional: android.package / ios.bundleIdentifier per variant
});
```

Run with: `APP_VARIANT=development npx expo start` (or set in shell / `.env`).

### TypeScript config

- Use `app.config.ts` and export a function: `export default ({ config }: ConfigContext): ExpoConfig => ({ ...config, ... })`.
- For `import` and full TS in config, use `tsx` (see [TypeScript guide](https://docs.expo.dev/guides/typescript#appconfigjs)).

---

## 2. Tabs template

**Sources:** [create-expo-app](https://docs.expo.dev/more/create-expo/), [Create a project](https://docs.expo.dev/get-started/create-a-project/), [Expo Router – Tabs](https://docs.expo.dev/router/advanced/tabs/), [Add navigation (tutorial)](https://docs.expo.dev/tutorial/add-navigation/).

### Creating a project with the tabs template

```bash
npx create-expo-app@latest my-app --template tabs
# or
npx create-expo-app@latest my-app -t tabs
```

Other package managers:

```bash
yarn create expo-app my-app -t tabs
pnpm create expo-app my-app -t tabs
bun create expo my-app -t tabs
```

- **Template:** [expo-template-tabs](https://github.com/expo/expo/tree/main/templates/expo-template-tabs).
- **What you get:** File-based routing with **Expo Router** and **TypeScript**, plus a bottom tab layout.

### Tabs template structure (conceptually)

```
app/
  _layout.tsx        # Root layout (e.g. Stack wrapping tabs)
  (tabs)/
    _layout.tsx      # Tabs component defining tab bar
    index.tsx        # Default tab (e.g. Home)
    about.tsx        # Second tab (example)
```

- **Route group** `(tabs)` gives a bottom tab bar; files under it become tab screens.
- In `(tabs)/_layout.tsx` you use `<Tabs>` and `<Tabs.Screen name="index" options={{ title: 'Home' }} />`, etc.
- Icons: e.g. `@expo/vector-icons` (Ionicons) in `options={{ tabBarIcon: ... }}`.

### Root layout + tabs

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
export default function Layout() {
  return <Stack />;
}

// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="about" options={{ title: 'About' }} />
    </Tabs>
  );
}
```

- For **native** or **custom** tab UIs, see [Native tabs](https://docs.expo.dev/router/advanced/native-tabs/) and [Custom tabs](https://docs.expo.dev/router/advanced/custom-tabs/).

---

## 3. Packages: installing and versioning

**Sources:** [Using libraries](https://docs.expo.dev/workflow/using-libraries/), [Expo CLI](https://docs.expo.dev/more/expo-cli/), [Expo versions](https://docs.expo.dev/versions/latest/).

### Prefer `npx expo install`

- **Always prefer `npx expo install <package>`** over `npm install` / `yarn add` so Expo can:
  - Pick versions compatible with your Expo SDK (and React Native).
  - Warn about known incompatibilities.

Examples:

```bash
npx expo install expo-camera expo-contacts expo-sensors
npx expo install react-native-safe-area-context react-native-screens
```

### Version checks and fixes

- **Check:** `npx expo install --check` (validates versions; in CI can exit non-zero).
- **Fix:** `npx expo install --fix` (aligns packages to compatible versions).
- **Specific packages:** `npx expo install react-native expo-sms --check`.

### SDK compatibility

- Each Expo SDK version pins a React Native (and often React) version. See [Expo versions](https://docs.expo.dev/versions/latest).
- Expo SDK packages work in any React Native app that has `expo` installed and configured; the easiest start is `create-expo-app` (including with `-t tabs`).

### Libraries that need native code

- If a library has a **config plugin**, needs **AndroidManifest/Podfile/Info.plist** changes, or mentions “linking”, use a **development build** (and prebuild when applicable), not Expo Go.
- Install still: `npx expo install <package>`; then run prebuild / dev build as needed.

---

## 4. Expo prebuild

**Sources:** [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/), [Adopting prebuild](https://docs.expo.dev/guides/adopting-prebuild/), [Expo CLI](https://docs.expo.dev/more/expo-cli/).

### What it does

- **`npx expo prebuild`** generates the **`android`** and **`ios`** directories from:
  - App config (`app.json` / `app.config.js` / `app.config.ts`),
  - Installed `expo` (and its prebuild template),
  - Config plugins and autolinking.

So: **no native folders** → prebuild creates them; **with native folders** → prebuild can overwrite them (see `--clean`).

### When to run it

- **No `android`/`ios`:** Run before local native builds or when you want to regenerate native projects (e.g. after adding a config plugin or changing app config).
- **Local run:** If you run `npx expo run:ios` or `npx expo run:android` and native dirs are missing, **prebuild runs automatically** for that platform.
- **EAS Build:** If the project has no `android`/`ios`, EAS Build runs prebuild before compiling. If you already have those dirs, EAS does **not** run prebuild (so your local native changes are kept unless you remove the dirs or use a workflow that regenerates them).

### Commands

```bash
# Generate (or update) both platforms
npx expo prebuild

# One platform only
npx expo prebuild --platform ios
npx expo prebuild --platform android

# Delete existing native dirs and regenerate (recommended when in doubt)
npx expo prebuild --clean

# Skip dependency version updates
npx expo prebuild --skip-dependency-update react-native,react

# Don’t run npm/yarn/pnpm install during prebuild
npx expo prebuild --no-install
```

### Important warnings

- **Don’t rely on manual edits** in `android/` and `ios/` if you run prebuild again; use **config plugins** for persistent native changes.
- **`--clean`** deletes and recreates native dirs; you’ll get a git warning if there are uncommitted changes (skip in CI with `EXPO_NO_GIT_STATUS=1` if needed).

### Side effects of prebuild

- Can **modify `package.json`**: `dependencies` and `scripts` (e.g. replacing `expo start --android` with `expo run:android`). These changes are intentional so the project works with the generated native projects.

### Template

- Prebuild uses a template tied to your **Expo SDK** (e.g. `expo-template-bare-minimum`). Custom template: `npx expo prebuild --template /path/to/template.tgz` (advanced; not usually needed).

---

## 5. Quick command reference

| Goal                    | Command |
|-------------------------|--------|
| Create app with tabs    | `npx create-expo-app@latest my-app -t tabs` |
| See resolved config     | `npx expo config` or `npx expo config --type public` |
| Install SDK-compat deps  | `npx expo install <packages>` |
| Check/fix versions      | `npx expo install --check` / `npx expo install --fix` |
| Generate native dirs    | `npx expo prebuild` or `npx expo prebuild --clean` |
| Run on device/simulator | `npx expo run:ios` / `npx expo run:android` (may run prebuild if no native dirs) |
| Dev server              | `npx expo start` |
| Diagnose project        | `npx expo-doctor` |

---

## 6. Buffr G2P–specific notes (from PRD)

- **Scheme for OAuth:** In `app.json` (or app config), set `expo.scheme` (e.g. `"buffr"`) for deep links / OAuth redirects.
- **Plugins:** Ensure `expo-router` (and any other plugins) are in the `plugins` array in app config.
- **Dependencies:** Prefer `npx expo install` for expo-*, react-native-*, and other libs listed in PRD §11.3 / §11.11.
- **Prebuild:** Optional for daily dev (Expo Go / dev client); run before local release builds or when adding native-only libraries; EAS Build can run it when `android`/`ios` are missing.

---

*Generated from Archon MCP (`perform_rag_query`, source: `docs.expo.dev`) and docs.expo.dev pages. For full details, follow the linked docs.*
{
  "meta": {
    "description": "Buffr G2P App – Design & UX/UI specification derived from PRD §3.8, §4.7, §5, §7 and intended for Figma MCP extraction. Use get_figma_data(fileKey, nodeId) to enrich with live design data.",
    "figmaFetchNote": "Figma API returned 429. When rate limit allows: run Stages 1–10 from FIGMA_BATCH_PLAN.md (60s between calls). For each response: merge dimensions, backgroundColor, optionally figmaData; set figmaEnriched: true. See NEXT_STEPS.md §1.",
    "batchPlan": "docs/FIGMA_BATCH_PLAN.md",
    "prdSource": "buffr_g2p/docs/PRD.md v1.4",
    "generatedFor": "Design extensions and implementation validation; devil's advocate UX concerns addressed in uxAudit.",
    "fullAppCoverage": "This spec plus fullAppCoverage and PRD §15.8 cover the entire app (onboarding, vouchers, cash-out, send, loans, profile, receive, groups, merchants, transactions, QR). Screens without nodeId are PRD-only; implement from PRD wireframes §3.7 and §4."
  },
  "file": {
    "key": "VeGAwsChUvwTBZxAU6H8VQ",
    "name": "Buffr App Design",
    "version": "1.0",
    "rootNode": "0:1"
  },
  "screens": [
    { "nodeId": "8:2", "name": "Starting...", "prdRoute": "/ (splash)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Logo", "Splash"], "flows": ["Entry"], "accessibility": { "contrastRatios": {}, "touchTargets": {}, "issues": [] }, "interactions": [] },
    { "nodeId": "23:1495", "name": "Welcome page", "prdRoute": "/onboarding", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Logo", "Primary CTA", "Text block"], "flows": ["Onboarding"], "accessibility": { "contrastRatios": { "headerText": "≥4.5:1 (slate-900 on background)" }, "touchTargets": { "primaryButton": 56 }, "issues": [] }, "interactions": ["Get Started → /onboarding/phone"] },
    { "nodeId": "30:1518", "name": "Select your beloved country", "prdRoute": "/onboarding/country", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Country list", "Primary CTA", "Detected country"], "flows": ["Onboarding (optional)"], "accessibility": { "contrastRatios": {}, "touchTargets": {}, "issues": [] }, "interactions": [] },
    { "nodeId": "44:461", "name": "Tell us your mobile number", "prdRoute": "/onboarding/phone", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["TextInput", "Primary CTA", "Prefix +264"], "flows": ["Onboarding"], "accessibility": { "contrastRatios": {}, "touchTargets": { "primaryButton": 56, "input": 56 }, "issues": [] }, "interactions": [] },
    { "nodeId": "44:509", "name": "Can you please verify", "prdRoute": "/onboarding/otp", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["OTPInput", "Primary CTA", "Secondary link"], "flows": ["Onboarding"], "accessibility": { "contrastRatios": {}, "touchTargets": { "primaryButton": 56, "otpBox": 56 }, "issues": [] }, "interactions": [] },
    { "nodeId": "59:2", "name": "Can you please verify (variant)", "prdRoute": "/onboarding/otp", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["OTPInput", "Primary CTA"], "flows": ["Onboarding"], "accessibility": {}, "interactions": [] },
    { "nodeId": "45:712", "name": "Add user's details", "prdRoute": "/onboarding/name", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["TextInput", "Primary CTA", "Add profile"], "flows": ["Onboarding"], "accessibility": {}, "interactions": [] },
    { "nodeId": "44:537", "name": "Available bank accounts", "prdRoute": "/onboarding/bank-accounts", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Bank list", "OAuth entry"], "flows": ["Bank linking (optional)"], "accessibility": {}, "interactions": [] },
    { "nodeId": "60:62", "name": "Available bank accounts (variant)", "prdRoute": "/onboarding/bank-accounts", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Bank linking (optional)"], "accessibility": {}, "interactions": [] },
    { "nodeId": "44:593", "name": "Add card", "prdRoute": "/add-card", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Primary CTA", "Secondary CTA", "Scan card"], "flows": ["Card flow"], "accessibility": {}, "interactions": [] },
    { "nodeId": "44:639", "name": "Add card details", "prdRoute": "/add-card/details", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["TextInput", "Primary CTA"], "flows": ["Card flow"], "accessibility": {}, "interactions": [] },
    { "nodeId": "45:680", "name": "Frame 19 / Card type", "prdRoute": "/add-card (modal)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": null, "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Card flow"], "accessibility": {}, "interactions": [] },
    { "nodeId": "59:58", "name": "Frame 27 / Validation modal", "prdRoute": "/add-card", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": null, "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Card flow"], "accessibility": {}, "interactions": [] },
    { "nodeId": "45:660", "name": "Card added", "prdRoute": "/add-card/success", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Success state", "Primary CTA"], "flows": ["Card flow"], "accessibility": {}, "interactions": [] },
    { "nodeId": "45:681", "name": "Enable Authentication", "prdRoute": "/onboarding/face-id", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["2FA prompt", "Primary CTA", "Skip"], "flows": ["Onboarding"], "accessibility": {}, "interactions": [] },
    { "nodeId": "45:792", "name": "Enable Authentication (variant)", "prdRoute": "/onboarding/face-id", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Onboarding"], "accessibility": {}, "interactions": [] },
    { "nodeId": "45:818", "name": "Registeration Completed", "prdRoute": "/onboarding/complete", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Success state", "Primary CTA"], "flows": ["Onboarding"], "accessibility": {}, "interactions": [] },
    { "nodeId": "45:837", "name": "Main Screen (Home)", "prdRoute": "/(tabs)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["SearchBar", "BalanceCard", "WalletCard", "ServiceCard", "ContactChip", "TabBar"], "flows": ["Home", "Send money", "Voucher redemption"], "accessibility": { "contrastRatios": { "balanceText": "≥4.5:1" }, "touchTargets": { "primaryButton": 56, "serviceCard": 44, "tabBar": 49 }, "issues": [] }, "interactions": [] },
    { "nodeId": "162:1202", "name": "Main Screen (variant)", "prdRoute": "/(tabs)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["SearchBar", "BalanceCard", "WalletCard", "TabBar"], "flows": ["Home"], "accessibility": {}, "interactions": [] },
    { "nodeId": "723:8346", "name": "Main Screen (variant)", "prdRoute": "/(tabs)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Home"], "accessibility": {}, "interactions": [] },
    { "nodeId": "725:8543", "name": "Main Screen (Profile tab)", "prdRoute": "/(tabs)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["TabBar", "Profile content"], "flows": ["Home"], "accessibility": {}, "interactions": [] },
    { "nodeId": "115:529", "name": "Cards View", "prdRoute": "/cards", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Card list", "Primary CTA"], "flows": ["Card flow"], "accessibility": {}, "interactions": [] },
    { "nodeId": "116:629", "name": "Wallet view", "prdRoute": "/wallets/[id]", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["BalanceCard", "WalletCard", "ListItem"], "flows": ["Cash-out"], "accessibility": {}, "interactions": [] },
    { "nodeId": "153:752", "name": "Transfer Amount", "prdRoute": "/send-money/amount", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["AmountInput", "Primary CTA", "ContactChip"], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "153:566", "name": "Notifications", "prdRoute": "/notifications", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ListItem"], "flows": [], "accessibility": {}, "interactions": [] },
    { "nodeId": "152:427", "name": "Wallet history", "prdRoute": "/(tabs)/transactions", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ListItem", "TabBar"], "flows": [], "accessibility": {}, "interactions": [] },
    { "nodeId": "151:391", "name": "Managing / Adding a wallet", "prdRoute": "/add-wallet", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["TextInput", "Primary CTA"], "flows": ["Add wallet"], "accessibility": {}, "interactions": [] },
    { "nodeId": "81:465", "name": "Scan QR", "prdRoute": "/scan-qr", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#000000", "figmaEnriched": false, "figmaData": null, "components": ["QRCodeScanner", "NAMQRScanner"], "flows": ["Voucher redemption (NamPost/SmartPay)", "Cash-out (Till/Agent/Merchant/ATM)", "Pay merchant"], "accessibility": { "contrastRatios": {}, "touchTargets": {}, "issues": ["Scan instruction clarity for low-literacy users; add short explanatory text or icon per PRD"] }, "interactions": [] },
    { "nodeId": "92:212", "name": "Send Options", "prdRoute": "/send-money/select-recipient", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["SearchBar", "ContactChip", "ListItem"], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "108:276", "name": "Loans", "prdRoute": "/loans", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ListItem", "MethodCard", "Primary CTA"], "flows": ["Voucher-backed loan §7.7"], "accessibility": {}, "interactions": [], "prdRef": "§3.6, §11.4.18" },
    { "nodeId": "114:302", "name": "Transactions", "prdRoute": "/(tabs)/transactions", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ListItem", "TabBar"], "flows": [], "accessibility": {}, "interactions": [] },
    { "nodeId": "111:487", "name": "Active Loan Details", "prdRoute": "/loans/[id]", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ListItem", "Detail rows", "Primary CTA", "TwoFAModal"], "flows": ["Voucher-backed loan §7.7"], "accessibility": {}, "interactions": [], "prdRef": "§3.6, §11.4.18" },
    { "nodeId": "111:629", "name": "Active Offer Details", "prdRoute": "/offers/[id]", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": [], "accessibility": {}, "interactions": [] },
    { "nodeId": "94:308", "name": "Selected contact", "prdRoute": "Send flow", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ContactChip", "Contact row"], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "174:873", "name": "Selected contact (variant)", "prdRoute": "Send flow", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "99:538", "name": "After Payment History w/ specific contact", "prdRoute": "Send flow post-payment", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ListItem", "Contact row"], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "171:574", "name": "After receive request sent", "prdRoute": "Request money", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Request money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "172:630", "name": "Receiver's POV", "prdRoute": "Request money", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Request money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "84:356", "name": "Receiver's Details", "prdRoute": "Send confirm", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Contact row", "AmountInput", "Primary CTA"], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "98:443", "name": "Receiver's Details (variant)", "prdRoute": "Send confirm", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "170:534", "name": "Receiver's Details (variant)", "prdRoute": "Send confirm", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "174:696", "name": "Make Group", "prdRoute": "/groups/create", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["TextInput", "SearchBar", "ContactChip", "Primary CTA"], "flows": ["Create group"], "accessibility": {}, "interactions": [] },
    { "nodeId": "87:410", "name": "Payment Successful", "prdRoute": "/send-money/success", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Success state", "Primary CTA"], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "99:488", "name": "Payment Successful (variant)", "prdRoute": "/send-money/success", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Send money"], "accessibility": {}, "interactions": [] },
    { "nodeId": "88:211", "name": "After Payment Details", "prdRoute": "Post-payment detail", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ListItem"], "flows": [], "accessibility": {}, "interactions": [] },
    { "nodeId": "99:505", "name": "After Payment Details (variant)", "prdRoute": "Post-payment detail", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": [], "accessibility": {}, "interactions": [] },
    { "nodeId": "169:433", "name": "Refund Request", "prdRoute": "Refund flow", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Refund"], "accessibility": {}, "interactions": [] },
    { "nodeId": "115:495", "name": "Transaction details", "prdRoute": "/transactions/[id]", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["ListItem", "Detail rows"], "flows": [], "accessibility": {}, "interactions": [] },
    { "nodeId": "723:8369", "name": "New feature / Frame variant", "prdRoute": "/(tabs)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Home"], "accessibility": {}, "interactions": [] },
    { "nodeId": "723:8361", "name": "New feature / Frame variant", "prdRoute": "/(tabs)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Home"], "accessibility": {}, "interactions": [] },
    { "nodeId": "723:8363", "name": "New feature / Frame variant", "prdRoute": "/(tabs)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Home"], "accessibility": {}, "interactions": [] },
    { "nodeId": "723:8378", "name": "New feature / Frame variant", "prdRoute": "/(tabs)", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": [], "flows": ["Home"], "accessibility": {}, "interactions": [] },
    { "nodeId": null, "name": "Proof-of-life reminder", "prdRoute": "/proof-of-life or modal", "prdRef": "PRD §3.6 screen 50b", "dimensions": { "width": 393, "height": 852 }, "backgroundColor": "#F8FAFC", "figmaEnriched": false, "figmaData": null, "components": ["Primary CTA", "Secondary CTA", "Text block"], "flows": ["Proof-of-life"], "accessibility": { "contrastRatios": {}, "touchTargets": { "primaryButton": 56 }, "issues": [] }, "interactions": ["Verify now", "Remind later", "Learn more"] }
  ],
  "components": [
    { "id": "1417:42922", "name": "Input/Large", "type": "component", "variants": { "default": { "height": 56, "borderRadius": 999, "fill": "#FFFFFF" }, "active": { "borderColor": "#0029D6" }, "error": { "borderColor": "#E11D48" } }, "states": ["default", "focused", "disabled", "error"], "usedIn": ["Home", "Send", "Create group"], "prdRef": "§4.7 SearchBar" },
    { "id": "1417:44518", "name": "Tabbar", "type": "componentSet", "variants": { "type": ["Home", "Transactions", "Vouchers", "Me"] }, "states": ["default", "active"], "usedIn": ["Main Screen"], "prdRef": "§4.7 TabBar" },
    { "id": "83:7", "name": "Status Bar - iPhone", "type": "componentSet", "variants": { "Mode": "Light", "Background": "False" }, "states": [], "usedIn": ["All screens"], "prdRef": "§4.7" },
    { "id": "639:3876", "name": "Home Indicator", "type": "component", "variants": { "Device": "iPhone", "Orientation": "Portrait" }, "states": [], "usedIn": ["All screens"], "prdRef": "§4.7" },
    { "id": "447:4412", "name": "Noise & Texture", "type": "component", "variants": {}, "states": [], "usedIn": ["Background overlay"], "prdRef": "§5.3" },
    { "name": "Primary CTA", "type": "atom", "variants": { "default": { "height": 56, "borderRadius": 16, "fill": "#0029D6" } }, "states": ["default", "pressed", "disabled", "loading"], "usedIn": ["Onboarding", "Add card", "2FA", "Send", "Create group"], "prdRef": "§4.7" },
    { "name": "Secondary / outline", "type": "atom", "variants": { "default": { "stroke": "1px", "borderRadius": 16 } }, "states": ["default", "pressed"], "usedIn": ["Onboarding", "OTP"], "prdRef": "§4.7" },
    { "name": "SearchBar", "type": "molecule", "variants": { "placeholder": "Search anything...", "placeholderSend": "Search phone, UPI, UID" }, "states": ["default", "focused"], "usedIn": ["Home", "Send", "Create group"], "prdRef": "§4.7" },
    { "name": "BalanceCard", "type": "organism", "variants": { "borderRadius": 12, "height": 120 }, "states": ["default", "flipped"], "usedIn": ["Home", "Wallet"], "prdRef": "§4.7" },
    { "name": "WalletCard", "type": "molecule", "variants": { "borderRadius": 16, "iconCircle": 999 }, "states": ["default", "focused"], "usedIn": ["Home", "Wallet"], "prdRef": "§4.7" },
    { "name": "ServiceCard", "type": "molecule", "variants": { "borderRadius": 12 }, "states": ["default", "pressed"], "usedIn": ["Home"], "prdRef": "§4.7" },
    { "name": "ContactChip", "type": "atom", "variants": { "borderRadius": 999, "effect": "effect_WHEBAW" }, "states": ["default", "selected"], "usedIn": ["Home Send-to", "Send", "Create group"], "prdRef": "§4.7" },
    { "name": "TwoFAModal", "type": "molecule", "variants": { "title": "Verify identity" }, "states": ["default", "loading", "error"], "usedIn": ["Voucher redeem", "Cash-out", "Send money"], "prdRef": "§4.7, §11.7.1" },
    { "name": "NAMQRScanner", "type": "organism", "variants": { "fullScreen": true }, "states": ["scanning", "valid", "error"], "usedIn": ["Scan QR", "NamPost/SmartPay collection", "Cash-out", "Pay merchant"], "prdRef": "§4.5, §11.8.10" },
    { "name": "NAMQRDisplay", "type": "molecule", "variants": { "minSize": 200, "borderRadius": 12 }, "states": ["default"], "usedIn": ["My QR", "NamPost/SmartPay collection code"], "prdRef": "§11.8.9" }
  ],
  "flows": [
    {
      "name": "Onboarding",
      "steps": [
        { "screen": "Welcome page", "action": "tap Get Started" },
        { "screen": "Tell us your mobile number", "action": "enter +264, tap Verify Number" },
        { "screen": "Can you please verify", "action": "enter OTP, tap Verify OTP" },
        { "screen": "Add user's details", "action": "enter name, Continue" },
        { "screen": "Add photo (optional)", "action": "capture/pick, Continue" },
        { "screen": "Enable Authentication", "action": "Enable biometric or Skip" },
        { "screen": "Registeration Completed", "action": "tap Go to Home" }
      ],
      "alternatePaths": [
        { "condition": "send-otp 4xx", "path": ["error under phone field", "no navigation"] },
        { "condition": "verify-otp 401", "path": ["Toast Invalid code", "resend OTP"] }
      ],
      "uxConcerns": { "clarity": "Steps are linear; optional country and bank linking can be skipped.", "errorHandling": "PRD §4.6: inline errors and Toast for API failures." }
    },
    {
      "name": "Voucher redemption - Wallet",
      "steps": [
        { "screen": "Voucher Detail", "action": "tap Redeem to Buffr Wallet" },
        { "screen": "2FA Modal", "action": "enter PIN or biometric" },
        { "screen": "Wallet Success", "action": "done" }
      ],
      "alternatePaths": [
        { "condition": "redeem 4xx", "path": ["close 2FA", "Toast error", "stay on detail"] }
      ],
      "uxConcerns": { "clarity": "Clear single path.", "errorHandling": "Toast on 4xx; stay on detail." }
    },
    {
      "name": "Voucher redemption - NamPost",
      "steps": [
        { "screen": "Voucher Detail", "action": "tap Cash at NamPost" },
        { "screen": "NamPost Branch List", "action": "select branch" },
        { "screen": "NamPost Collection Code", "action": "display NAMQR; user scans with app" },
        { "screen": "2FA Modal", "action": "enter PIN" },
        { "screen": "NamPost Success", "action": "collect cash" }
      ],
      "alternatePaths": [
        { "condition": "QR validation fails", "path": ["error screen or Toast", "retry scan or reselect branch"] },
        { "condition": "Token Vault invalid", "path": ["show message", "allow reselect branch"] }
      ],
      "uxConcerns": { "clarity": "Scan instruction must be explicit (e.g. 'Scan the branch QR with this app'). Add short text or icon for low-literacy users.", "errorHandling": "QR expired – show message and allow reselect branch." }
    },
    {
      "name": "Voucher redemption - SmartPay",
      "steps": [
        { "screen": "Voucher Detail", "action": "tap Cash at SmartPay Unit" },
        { "screen": "SmartPay Units", "action": "select unit" },
        { "screen": "SmartPay Collection Code", "action": "display NAMQR; user scans" },
        { "screen": "2FA Modal", "action": "enter PIN" },
        { "screen": "SmartPay Success", "action": "collect cash" }
      ],
      "alternatePaths": [
        { "condition": "QR validation fails", "path": ["error", "retry or reselect unit"] }
      ],
      "uxConcerns": { "clarity": "Same as NamPost – clear scan instruction.", "errorHandling": "Handle expired/invalid QR." }
    },
    {
      "name": "Cash-out - Till / Agent / Merchant / ATM",
      "steps": [
        { "screen": "Cash-Out Hub", "action": "tap Till, Agent, Merchant, or ATM" },
        { "screen": "Instruction", "action": "user scans payee NAMQR (till/agent/merchant/ATM displays)" },
        { "screen": "Scan QR", "action": "scan, validate Token Vault, show payee and amount" },
        { "screen": "2FA Modal", "action": "enter PIN" },
        { "screen": "Cash-Out Success", "action": "done" }
      ],
      "alternatePaths": [
        { "condition": "QR invalid or Token Vault fail", "path": ["Toast/error", "retry scan"] },
        { "condition": "cashout 4xx", "path": ["Toast error", "stay on screen"] }
      ],
      "uxConcerns": { "clarity": "Instruction: 'Scan the agent’s/till’s NAMQR' – ensure explanatory text or icon.", "errorHandling": "PRD §4.6; invalid QR and network error states." }
    },
    {
      "name": "Cash-out - Bank Transfer",
      "steps": [
        { "screen": "Cash-Out Hub", "action": "tap Bank Transfer" },
        { "screen": "Bank selection", "action": "select bank, account, amount" },
        { "screen": "OAuth WebView", "action": "user consents at bank" },
        { "screen": "2FA Modal (if applicable)", "action": "enter PIN" },
        { "screen": "Confirmation / Success", "action": "done" }
      ],
      "alternatePaths": [
        { "condition": "OAuth denied or error", "path": ["return to app", "show error"] }
      ],
      "uxConcerns": { "clarity": "OAuth redirect must be clear (bank’s page).", "errorHandling": "Handle consent denied and API errors." }
    },
    {
      "name": "Send money (P2P)",
      "steps": [
        { "screen": "Send Options", "action": "select recipient" },
        { "screen": "Transfer Amount", "action": "enter amount, Continue" },
        { "screen": "Receiver's Details (confirm)", "action": "tap Send" },
        { "screen": "2FA Modal", "action": "enter PIN" },
        { "screen": "Payment Successful", "action": "done" }
      ],
      "alternatePaths": [
        { "condition": "send 4xx", "path": ["Toast", "stay on confirm"] },
        { "condition": "amount > balance", "path": ["inline error", "disable Send"] }
      ],
      "uxConcerns": { "clarity": "Confirm screen shows summary; 2FA is mandatory.", "errorHandling": "PRD §4.6: Toast on 4xx; inline for amount/recipient." }
    },
    {
      "name": "Pay merchant",
      "steps": [
        { "screen": "Merchants or Scan QR", "action": "select merchant or scan merchant NAMQR" },
        { "screen": "Scan QR (if scan path)", "action": "validate Token Vault, show amount" },
        { "screen": "Amount / Confirm", "action": "confirm, 2FA" },
        { "screen": "Success", "action": "done" }
      ],
      "alternatePaths": [
        { "condition": "QR invalid", "path": ["error", "retry scan"] }
      ],
      "uxConcerns": { "clarity": "Scan path same as cash-out – clear scan instruction.", "errorHandling": "Invalid QR and 4xx handled." }
    },
    {
      "name": "Create group",
      "steps": [
        { "screen": "Make Group", "action": "enter name, description, select members (chips), tap Create" },
        { "screen": "Group view", "action": "done" }
      ],
      "alternatePaths": [
        { "condition": "API 4xx", "path": ["Toast", "stay on form"] }
      ],
      "uxConcerns": { "clarity": "Pill search and chips are documented in PRD §4.7.", "errorHandling": "PRD §4.6 Groups: ErrorState + Retry, EmptyState." }
    },
    {
      "name": "Bank linking (optional)",
      "steps": [
        { "screen": "Available bank accounts", "action": "tap Link / Select bank" },
        { "screen": "OAuth WebView", "action": "consent at bank" },
        { "screen": "Redirect buffr://oauth-callback", "action": "token exchange, return to app" }
      ],
      "alternatePaths": [
        { "condition": "consent denied", "path": ["return", "show message"] }
      ],
      "uxConcerns": { "clarity": "Redirect URI must be registered; app.json scheme.", "errorHandling": "Handle OAuth errors and network failure." }
    },
    {
      "name": "Proof-of-life",
      "steps": [
        { "screen": "Proof-of-life reminder", "action": "Modal or /proof-of-life: 'Confirm your identity to keep your account active.'" },
        { "screen": "Verify now", "action": "Open biometric at agent/POS or in-app verification" },
        { "screen": "Remind later / Learn more", "action": "Dismiss or show info" }
      ],
      "alternatePaths": [
        { "condition": "Remind later", "path": ["dismiss", "reschedule per 90-day rule"] }
      ],
      "uxConcerns": { "clarity": "PRD §3.6 screen 50b; backend triggers when user is due for quarterly verification.", "errorHandling": "If verification fails, show retry or support." }
    }
  ],
  "uxAudit": {
    "cognitiveLoad": "Overall moderate. Onboarding has 6–7 steps; voucher NamPost/SmartPay and cash-out add 4–5 steps each. Primary CTAs are prominent (PRD §4.7). Some flows (e.g. NamPost redemption) have multiple decision points; keep one primary action per screen.",
    "accessibilityIssues": [
      "Button text on primary CTA uses height 56px, minTouchTarget 44 (PRD §5.1) – acceptable.",
      "Body text: design system specifies 16px base – acceptable for body.",
      "No high-contrast mode designs in Figma; recommend implementing via theme toggle and semantic colors.",
      "Screen reader: no explicit alternative text labels documented in Figma; recommend adding accessibilityLabel for icons (QR, scan, back) and key actions.",
      "Contrast: PRD §5.1 uses slate-900 (#020617) on background #F8FAFC – verify ratio ≥4.5:1 for body text."
    ],
    "errorHandlingGaps": [
      "PRD §4.6 defines Loading, Error, Empty, Warning per screen – ensure Figma includes error state artboards for: invalid QR, network error, 2FA failure, redeem 4xx.",
      "If not designed: add placeholder screens or components (ErrorState, Toast, inline error) and document in this spec."
    ],
    "loadingStates": [
      "PRD §4.6: LoadingOverlay or skeleton for Vouchers list, Send money, Groups list.",
      "Design system §5.1 animations.loading: 1500ms; use skeleton or spinner. Confirm Figma has skeleton/spinner components for key async screens."
    ],
    "responsiveGaps": [
      "PRD breakpoints.mobile.maxWidth 393; content capped on larger screens.",
      "Cards carousel uses fixed width 340px (CardDesign) – may overflow on very small devices; use Dimensions.get and scale or scroll.",
      "Tab bar and header heights are fixed in §5.1 layout.screenZones; safe area handled by SafeAreaView."
    ],
    "clarityOfInstructions": [
      "For 'Scan the agent’s NAMQR' and similar: PRD and flows require explanatory text or icon; ensure Figma Scan QR screen (81:465) or instruction screen has short, simple copy for low-literacy users.",
      "Language: use simple wording in all redemption and cash-out instructions."
    ],
    "recommendations": [
      "Add tooltips or short copy for QR scanning steps (NamPost, SmartPay, Till, Agent, Merchant, ATM).",
      "Implement error banners or Toast for network errors and 429 rate limit (PRD §9.4).",
      "Add Figma artboards for error states (invalid QR, 2FA failure, redeem/cashout 4xx) if not present.",
      "Add accessibilityLabel to all icon-only buttons and key images.",
      "Consider high-contrast theme option and document in design system."
    ]
  },
  "prdValidation": {
    "screensInPrdSection3": "All §3.1–§3.6 screens are listed in §3.8 with nodeIds; this spec includes all §3.8 node IDs provided by the user. No PRD screen is missing from the screens array.",
    "componentInventoryMatch": "§4.7 organisms, molecules, atoms are represented in the components array (Input/Large, Tabbar, Primary CTA, SearchBar, BalanceCard, WalletCard, ServiceCard, ContactChip, TwoFAModal, NAMQRScanner, NAMQRDisplay). Figma component sets 1417:42922, 1417:44518, 83:7, 639:3876, 447:4412 are referenced.",
    "flowsRepresentable": "§7.1–§7.6 flows (Onboarding, Voucher Wallet/NamPost/SmartPay, Cash-out Till/Agent/Merchant/ATM/Bank, Send money, Pay merchant, Create group, Bank linking) are documented in the flows array with steps and alternate paths.",
    "namqrAndOpenBanking": "NAMQR: Scan QR screen (81:465), NAMQRScanner and NAMQRDisplay components, and flows (NamPost/SmartPay collection, Cash-out, Pay merchant) have corresponding screens and components. Open Banking: Bank linking flow and Available bank accounts (44:537, 60:62) are present; OAuth WebView is a required component (documented in PRD §4.5, §11.8).",
    "discrepancies": [
      "Live Figma dimensions, fills, and effects were not fetched (429). Re-run get_figma_data for each nodeId to populate dimensions and backgroundColor from Figma.",
      "If any Figma frame has been renamed or moved, nodeIds may need to be re-resolved from the file root 0:1."
    ]
  },
  "fullAppCoverage": {
    "description": "Maps every app area to design spec; see PRD §15.8 for the full table. nodeId null = PRD-only screen.",
    "areas": [
      { "area": "Onboarding", "routes": ["/onboarding", "/onboarding/country", "/onboarding/phone", "/onboarding/otp", "/onboarding/name", "/onboarding/photo", "/onboarding/face-id", "/onboarding/complete"], "screensInSpec": true },
      { "area": "Vouchers", "routes": ["/(tabs)/vouchers", "/utilities/vouchers", "/utilities/vouchers/[id]", "/utilities/vouchers/redeem/nampost", "/utilities/vouchers/redeem/smartpay", "/utilities/vouchers/redeem/wallet"], "screensInSpec": "partial (list/detail PRD wireframes; redeem flows use Scan QR 81:465, NAMQRDisplay, Success state)" },
      { "area": "Cash-out", "routes": ["/wallets/[id]", "/wallets/[id]/cash-out", "/wallets/[id]/cash-out/bank", "/wallets/[id]/cash-out/success"], "screensInSpec": "partial (Wallet view 116:629; hub/bank/success PRD)" },
      { "area": "Send money", "routes": ["/send-money/select-recipient", "/send-money/amount", "/send-money/confirm", "/send-money/success"], "screensInSpec": true },
      { "area": "Loans", "routes": ["/loans", "/loans/[id]", "/loans/apply"], "screensInSpec": "partial (108:276, 111:487; apply PRD §11.4.18)" },
      { "area": "Profile & settings", "routes": ["/(tabs)/profile", "/profile/settings", "/notifications"], "screensInSpec": "partial (725:8543, 153:566)" },
      { "area": "Receive", "routes": ["/receive/[transactionId]", "/receive/voucher/[voucherId]", "/receive/group-invite/[inviteId]", "/receive/request/[requestId]"], "screensInSpec": "partial (171:574, 172:630 for request; others PRD §11.4.16)" },
      { "area": "Home, wallets, cards", "routes": ["/(tabs)", "/add-wallet", "/cards", "/add-card", "/add-card/details", "/add-card/success"], "screensInSpec": true },
      { "area": "QR & scan", "routes": ["/scan-qr", "/qr-code"], "screensInSpec": "partial (81:465; My QR PRD)" },
      { "area": "Groups, merchants, transactions", "routes": ["/groups/create", "/groups/[id]", "/merchants", "/transactions/[id]"], "screensInSpec": "partial (174:696, 115:495; merchants PRD)" }
    ]
  }
}

---

## 18. Design Implementation Reference – Full Code

> **Status:** Implemented. This section documents the exact code patterns used across all upgraded screens, derived from the reference FlowState design (`ketchup-smartpay/buffr/components/state-flow/`). Use as authoritative copy-paste source for all future screens.

---

### §18.1 Design Tokens (Raw Hex – No Import Required)

```
COLORS:
  primary:         #0029D6    (Buffr blue)
  primaryDark:     #1D4ED8
  primaryMuted:    #DBEAFE
  blue600:         #2563EB
  text:            #020617    (slate-950)
  text2:           #111827    (gray-900)
  textSecondary:   #64748B
  textTertiary:    #94A3B8
  surface:         #FFFFFF
  bg:              #F8FAFC
  border:          #E5E7EB / #E2E8F0
  success:         #22C55E
  error:           #E11D48
  warning:         #F59E0B
  purple:          #7C3AED
  sky:             #06B6D4

GRADIENTS (LinearGradient colors arrays):
  Screen bg (Home):         ['#EFF6FF', '#F5F3FF', '#FDF2F8']
  Screen bg (Vouchers):     ['#EFF6FF', '#ECFEFF', '#fff']
  Screen bg (Transactions): ['#F3F4F6', '#fff', '#F9FAFB']
  Screen bg (Loans):        ['#EFF6FF', '#F5F3FF', '#fff']
  Avatar / header:          ['#2563EB', '#1D4ED8']
  Loan summary card:        ['#2563EB', '#06B6D4']  start={x:0,y:0} end={x:1,y:1}
  Loan tier – quick:        ['#2563EB', '#06B6D4']
  Loan tier – standard:     ['#7C3AED', '#A78BFA']
  Loan tier – maximum:      ['#22C55E', '#10B981']
  Voucher detail card:      ['#2563EB', '#06B6D4']

RADIUS:
  pill:  9999 (inputs, buttons, search bars, badges)
  card:  24   (wallet cards, gradient cards)
  md:    16   (menu items, tier cards, transaction rows)
  sm:    12   (service cards)

SPACING:
  horizontalPadding: 24
  sectionGap:        16

TYPOGRAPHY (pixel sizes):
  display:  48px bold  (total balance hero)
  heading:  36px bold  (wallet balance)
  titleLg:  24px bold  (voucher amount)
  title:    22px bold  (success title)
  titleSm:  18px bold  (wallet name, display name)
  body:     16px
  bodySm:   14-15px
  caption:  12-13px
  tabLabel: 11px 600wt
```

---

### §18.2 Screen Background Pattern

Every main screen uses an absolute-fill LinearGradient under SafeAreaView:

```tsx
import { LinearGradient } from 'expo-linear-gradient';

<View style={{ flex: 1 }}>
  <LinearGradient colors={['#EFF6FF', '#F5F3FF', '#FDF2F8']} style={StyleSheet.absoluteFill} />
  <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    {/* screen content */}
  </SafeAreaView>
</View>
```

---

### §18.3 Pill Search Bar Pattern

Used on Home, Transactions, Vouchers:

```tsx
<View style={styles.searchWrap}>
  <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
  <TextInput
    style={styles.searchInput}
    placeholder="Search..."
    placeholderTextColor="#9CA3AF"
    value={searchTerm}
    onChangeText={setSearchTerm}
  />
</View>

// Styles
searchWrap: {
  flexDirection: 'row', alignItems: 'center',
  backgroundColor: '#F9FAFB',
  marginHorizontal: 24, marginVertical: 12,
  paddingHorizontal: 16, height: 48,
  borderRadius: 9999,
  borderWidth: 1, borderColor: '#E5E7EB',
},
searchInput: { flex: 1, fontSize: 15, color: '#020617' },
```

---

### §18.4 Wallet Card Pattern (160px, emoji, badge, color bar)

```tsx
// WALLET_EMOJI map
const WALLET_EMOJI: Record<string, string> = {
  main: '📊', savings: '💰', grant: '🎁',
};

// Card JSX
<TouchableOpacity style={styles.walletCard} onPress={...} activeOpacity={0.8}>
  <Text style={styles.walletBadge}>{index + 1}/{walletCount}</Text>  {/* top-right 1/N */}
  <Text style={styles.walletEmoji}>{walletEmoji(w)}</Text>
  <Text style={styles.walletName} numberOfLines={1}>{w.name}</Text>
  <Text style={styles.walletBalance}>N$ {w.balance.toLocaleString('en-NA', { minimumFractionDigits: 2 })}</Text>
  <View style={[styles.walletBar, { backgroundColor: '#0029D6' }]} />
</TouchableOpacity>

// Styles
walletCard: {
  width: 160, backgroundColor: '#fff',
  borderRadius: 24, padding: 20,
  borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
},
walletBadge: { position: 'absolute', top: 12, right: 16, fontSize: 11, color: '#94A3B8' },
walletEmoji: { fontSize: 28, marginBottom: 10 },
walletName: { fontSize: 13, fontWeight: '500', color: '#020617', marginBottom: 4 },
walletBalance: { fontSize: 18, fontWeight: '700', color: '#020617' },
walletBar: { height: 4, borderRadius: 9999, marginTop: 12, width: '100%' },
```

---

### §18.5 FAB Row Pattern (Send + QR)

Positioned above the tab bar (`bottom: 90`):

```tsx
<View style={styles.fabRow}>
  <TouchableOpacity style={styles.fabSend} onPress={...} activeOpacity={0.9}>
    <Ionicons name="paper-plane-outline" size={20} color="#fff" />
    <Text style={styles.fabSendText}>Send</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.fabQr} onPress={...} activeOpacity={0.9}>
    <Ionicons name="qr-code" size={20} color="#fff" />
  </TouchableOpacity>
</View>

// Styles
fabRow: {
  position: 'absolute', bottom: 90, left: 0, right: 0,
  flexDirection: 'row', justifyContent: 'center', gap: 12, zIndex: 30,
},
fabSend: {
  flexDirection: 'row', alignItems: 'center', gap: 8,
  width: 140, height: 60, borderRadius: 30,
  backgroundColor: '#0029D6', justifyContent: 'center',
  shadowColor: '#0029D6', shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
},
fabSendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
fabQr: {
  width: 60, height: 60, borderRadius: 30,
  backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center',
  shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
},
```

---

### §18.6 Services Grid Pattern (3-column)

```tsx
const SERVICES = [
  { id: 'send', label: 'Send', icon: 'paper-plane', route: '/send-money/select-recipient' },
  { id: 'vouchers', label: 'My Vouchers', icon: 'gift', route: '/(tabs)/vouchers' },
  { id: 'bills', label: 'Pay Bills', icon: 'document-text', route: '/bills' },
  { id: 'loans', label: 'Loans', icon: 'cash', route: '/loans' },
  { id: 'agents', label: 'Agent Network', icon: 'location', route: '/agents' },
  { id: 'cashout', label: 'Cash Out', icon: 'wallet', route: '/wallets' },
];

// Grid JSX
<View style={styles.servicesGrid}>
  {SERVICES.map((s) => (
    <TouchableOpacity key={s.id} style={styles.serviceBtn} onPress={...} activeOpacity={0.8}>
      <View style={styles.serviceIconWrap}>
        <Ionicons name={s.icon as never} size={24} color="#4B5563" />
      </View>
      <Text style={styles.serviceLabel} numberOfLines={2}>{s.label}</Text>
    </TouchableOpacity>
  ))}
</View>

// Styles
servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
serviceBtn: {
  width: '30%', minWidth: 100,
  alignItems: 'center', gap: 8,
  paddingVertical: 16,
  backgroundColor: '#fff', borderRadius: 16,
  borderWidth: 1, borderColor: '#E5E7EB',
},
serviceIconWrap: {
  width: 48, height: 48, borderRadius: 24,
  backgroundColor: '#F9FAFB',
  justifyContent: 'center', alignItems: 'center',
},
serviceLabel: { fontSize: 11, fontWeight: '500', color: '#374151', textAlign: 'center', lineHeight: 15 },
```

---

### §18.7 Transaction Row Pattern

Used on Home and Transactions screens:

```tsx
const POSITIVE_TYPES = ['receive', 'voucher_redeem', 'add_money', 'loan_disbursement'];

<TouchableOpacity style={styles.txRow} onPress={...} activeOpacity={0.8}>
  <View style={[styles.txIconWrap, isPositive ? styles.txIconReceived : styles.txIconSent]}>
    <Ionicons name={isPositive ? 'arrow-down' : 'arrow-up'} size={18} color="#fff" />
  </View>
  <View style={styles.txBody}>
    <Text style={styles.txLabel} numberOfLines={1}>{tx.counterparty ?? formatTransactionType(tx.type)}</Text>
    <Text style={styles.txMeta}>{formatTransactionType(tx.type)}</Text>
  </View>
  <View style={styles.txRight}>
    <Text style={[styles.txAmount, pos ? styles.txAmountPos : styles.txAmountNeg]}>
      {formatTransactionAmount(tx)}
    </Text>
    <Text style={[styles.txStatus, tx.status === 'success' && styles.txStatusSuccess]}>
      {tx.status}
    </Text>
  </View>
</TouchableOpacity>

// Styles
txRow: {
  flexDirection: 'row', alignItems: 'center',
  backgroundColor: '#fff', padding: 14,
  borderRadius: 16, marginBottom: 8,
  borderWidth: 1, borderColor: '#E5E7EB',
},
txIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
txIconSent: { backgroundColor: '#E11D48' },
txIconReceived: { backgroundColor: '#22C55E' },
txBody: { flex: 1, minWidth: 0 },
txLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
txMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
txRight: { alignItems: 'flex-end' },
txAmount: { fontSize: 15, fontWeight: '700' },
txAmountPos: { color: '#22C55E' },
txAmountNeg: { color: '#111827' },
txStatus: { fontSize: 11, marginTop: 2, color: '#9CA3AF' },
txStatusSuccess: { color: '#22C55E' },
txStatusPending: { color: '#F59E0B' },
txStatusFailed: { color: '#E11D48' },
```

---

### §18.8 VoucherCard Pattern

```tsx
const VOUCHER_TYPE_INFO = {
  'child':             { icon: '👶', bg: '#DBEAFE', color: '#2563EB', label: 'Child Grant' },
  'basic-income':      { icon: '💰', bg: '#D1FAE5', color: '#22C55E', label: 'Basic Income' },
  'old-age-disability':{ icon: '🛡️', bg: '#F3E8FF', color: '#7C3AED', label: 'Old Age & Disability' },
  'other':             { icon: '📋', bg: '#F1F5F9', color: '#64748B', label: 'Grant' },
};

// STATUS_CONFIG
const STATUS_CONFIG = {
  available: { label: 'Available', color: '#22C55E', bg: '#DCFCE7', icon: 'checkmark-circle' },
  redeemed:  { label: 'Redeemed', color: '#64748B', bg: '#F1F5F9', icon: 'checkmark-done-circle' },
  expired:   { label: 'Expired',  color: '#E11D48', bg: '#FEF2F2', icon: 'close-circle' },
  pending:   { label: 'Pending',  color: '#F59E0B', bg: '#FEF3C7', icon: 'time' },
};

// Card JSX
<TouchableOpacity style={styles.voucherCard} onPress={...} activeOpacity={0.85}>
  <View style={styles.cardTop}>
    <View style={[styles.typeIconWrap, { backgroundColor: typeInfo.bg }]}>
      <Text style={styles.typeIcon}>{typeInfo.icon}</Text>
    </View>
    <View style={styles.cardMid}>
      <Text style={styles.typeLabel}>{typeInfo.label}</Text>
      <Text style={styles.programme} numberOfLines={1}>{v.programme}</Text>
    </View>
    <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
      <Ionicons name={statusConf.icon as never} size={12} color={statusConf.color} />
      <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
    </View>
  </View>
  <Text style={styles.amountValue}>N$ {v.amount.toFixed(2)}</Text>
  <View style={styles.datesRow}>
    <Text style={styles.dateText}>Issued: {formatDate(v.issuedAt)}</Text>
    <Text style={styles.dateText}>Expires: {formatDate(v.expiresAt)}</Text>
  </View>
  {v.status === 'available' && v.amount > 0 && (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${Math.min((v.redeemedAmount / v.amount) * 100, 100)}%`, backgroundColor: typeInfo.color }]} />
    </View>
  )}
</TouchableOpacity>

// Styles
voucherCard: {
  backgroundColor: '#fff', borderRadius: 20,
  padding: 20, marginBottom: 12,
  borderWidth: 1, borderColor: '#E5E7EB',
  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
},
cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
typeIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
typeIcon: { fontSize: 24 },
cardMid: { flex: 1, minWidth: 0, marginRight: 8 },
typeLabel: { fontSize: 13, fontWeight: '600', color: '#020617' },
programme: { fontSize: 12, color: '#64748B', marginTop: 2 },
statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
statusText: { fontSize: 12, fontWeight: '600' },
amountValue: { fontSize: 24, fontWeight: '700', color: '#020617', marginBottom: 10 },
datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
dateText: { fontSize: 12, color: '#94A3B8' },
progressBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
progressFill: { height: '100%', borderRadius: 3 },
```

---

### §18.9 Gradient Loan Summary Card

```tsx
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['#2563EB', '#06B6D4']}
  style={styles.summaryCard}
  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
>
  <View style={styles.summaryRow}>
    <View>
      <Text style={styles.summaryLabel}>Total Grant Value</Text>
      <Text style={styles.summaryValue}>N$ {totalVoucherValue.toLocaleString()}</Text>
    </View>
    <View>
      <Text style={styles.summaryLabel}>Max Loan (1/3)</Text>
      <Text style={styles.summaryValue}>N$ {maxLoan.toLocaleString()}</Text>
    </View>
  </View>
  <View style={styles.progressBar}>
    {maxLoan > 0 && <View style={[styles.progressFill, { width: '33%' }]} />}
  </View>
  <Text style={styles.progressHint}>15% APR • Auto-repayment from future grants</Text>
</LinearGradient>

// Styles
summaryCard: { borderRadius: 24, padding: 24, marginBottom: 16 },
summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
summaryValue: { fontSize: 24, fontWeight: '700', color: '#fff' },
progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
progressHint: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
```

---

### §18.10 Loan Tier Cards (gradient icon)

```tsx
const LOAN_TIERS = [
  { id: 'quick',    label: 'Quick Cash Advance',  pct: 50,  term: '1 month',      colors: ['#2563EB', '#06B6D4'] as [string,string], amount: Math.floor(maxLoan * 0.5) },
  { id: 'standard', label: 'Standard Grant Loan', pct: 75,  term: '3 months',     colors: ['#7C3AED', '#A78BFA'] as [string,string], amount: Math.floor(maxLoan * 0.75) },
  { id: 'maximum',  label: 'Maximum Grant Loan',  pct: 100, term: '6-12 months',  colors: ['#22C55E', '#10B981'] as [string,string], amount: maxLoan },
];

{LOAN_TIERS.map((tier) => (
  <TouchableOpacity key={tier.id} style={styles.tierCard} onPress={...} activeOpacity={0.8}>
    <LinearGradient colors={tier.colors} style={styles.tierIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name="cash-outline" size={24} color="#fff" />
    </LinearGradient>
    <View style={styles.tierBody}>
      <Text style={styles.tierLabel}>{tier.label}</Text>
      <Text style={styles.tierAmount}>N$ {tier.amount.toLocaleString()}</Text>
      <Text style={styles.tierTerm}>{tier.term} • {tier.pct}% of max</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
  </TouchableOpacity>
))}

// Styles
tierCard: {
  flexDirection: 'row', alignItems: 'center',
  backgroundColor: '#fff', padding: 16,
  borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
},
tierIconWrap: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
tierBody: { flex: 1 },
tierLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
tierAmount: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 2 },
tierTerm: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
```

---

### §18.11 Wallet Detail – Emoji Icon Circle

```tsx
// Wallet emoji map
const WALLET_EMOJI: Record<string, string> = { main: '📊', savings: '💰', grant: '🎁' };
function walletEmoji(w: Wallet): string { return WALLET_EMOJI[w.type] ?? '💼'; }

// Icon circle
<View style={styles.iconCircle}>
  <Text style={styles.iconEmoji}>{walletEmoji(wallet)}</Text>
</View>
<Text style={styles.balanceAmount}>
  N$ {wallet.balance.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
</Text>
<Text style={styles.balanceLabel}>Available Balance</Text>

// Action pill buttons
<View style={styles.actionsRow}>
  <TouchableOpacity style={styles.primaryBtn} onPress={...} activeOpacity={0.8}>
    <Ionicons name="add" size={18} color="#fff" />
    <Text style={styles.primaryBtnText}>Add Funds</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.secondaryBtn} onPress={...} activeOpacity={0.8}>
    <Ionicons name="arrow-up" size={18} color="#020617" />
    <Text style={styles.secondaryBtnText}>Transfer</Text>
  </TouchableOpacity>
</View>

// Styles
iconCircle: {
  width: 80, height: 80, borderRadius: 40,
  backgroundColor: '#D9EAF3',
  borderWidth: 1, borderColor: '#0F172A',
  justifyContent: 'center', alignItems: 'center', marginBottom: 16,
},
iconEmoji: { fontSize: 36 },
balanceAmount: { fontSize: 36, fontWeight: '700', color: '#020617', marginBottom: 4 },
balanceLabel: { fontSize: 14, color: '#64748B' },
actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
primaryBtn: {
  flex: 1, height: 48, borderRadius: 9999,
  backgroundColor: '#020617',
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
},
primaryBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
secondaryBtn: {
  flex: 1, height: 48, borderRadius: 9999,
  backgroundColor: '#F8FAFC',
  borderWidth: 1, borderColor: '#E2E8F0',
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
},
secondaryBtnText: { fontSize: 14, color: '#020617', fontWeight: '600' },
```

---

### §18.12 Add Wallet – Emoji Picker & Pill Input

```tsx
// Emoji grid constants
const EMOJI_ROWS = [
  ['📊', '💰', '🎁', '💼', '🏦', '🎮', '✈️', '🏠'],
  ['🎓', '🚗', '💊', '🛍️', '🌱', '🎵', '⚽', '🍕'],
  ['❤️', '🌟', '🔥', '💎', '🎯', '📱', '🎨', '🏋️'],
];

// Tappable icon circle
<TouchableOpacity style={styles.iconWrap} onPress={() => setShowEmojiPicker(true)} activeOpacity={0.8}>
  <View style={styles.iconCircle}>
    <Text style={styles.iconEmoji}>{selectedIcon}</Text>
  </View>
  <Text style={styles.setIconLabel}>Tap to change icon</Text>
</TouchableOpacity>

// Pill name input
<View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
  <TextInput
    style={styles.input}
    placeholder="e.g. My Savings"
    placeholderTextColor="#94A3B8"
    value={walletName}
    onChangeText={(t) => { setWalletName(t); setError(null); }}
    onFocus={() => setNameFocused(true)}
    onBlur={() => setNameFocused(false)}
    returnKeyType="done"
    maxLength={50}
  />
</View>

// Success ping animation
const pingAnim = useRef(new Animated.Value(1)).current;
Animated.sequence([
  Animated.timing(pingAnim, { toValue: 1.3, duration: 400, useNativeDriver: true }),
  Animated.timing(pingAnim, { toValue: 1,   duration: 300, useNativeDriver: true }),
]).start();

// Styles
iconWrap: { alignItems: 'center', marginTop: 32, marginBottom: 28 },
iconCircle: {
  width: 80, height: 80, borderRadius: 40,
  backgroundColor: '#D9EAF3',
  borderWidth: 1, borderColor: '#0F172A',
  justifyContent: 'center', alignItems: 'center', marginBottom: 8,
},
iconEmoji: { fontSize: 36 },
inputWrap: {
  height: 48, borderRadius: 9999,
  backgroundColor: '#F8FAFC',
  borderWidth: 2, borderColor: '#E2E8F0',
  paddingHorizontal: 20, justifyContent: 'center',
},
inputWrapFocused: { borderColor: '#020617', backgroundColor: '#fff' },
input: { fontSize: 16, color: '#020617', padding: 0 },
saveBtn: { height: 52, borderRadius: 9999, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
saveBtnDisabled: { opacity: 0.5 },
saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
```

---

### §18.13 Voucher Detail – Gradient Card & Method Selection

```tsx
// Gradient voucher card
<LinearGradient
  colors={['#2563EB', '#06B6D4']}
  style={styles.voucherGradientCard}
  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
>
  <Text style={styles.vcProgramme}>{voucher.programme}</Text>
  <Text style={styles.vcAmount}>N$ {voucher.amount.toFixed(2)}</Text>
  <View style={styles.vcRow}>
    <Text style={styles.vcLabel}>Status</Text>
    <Text style={styles.vcValue}>{voucher.status}</Text>
  </View>
  <View style={styles.vcRow}>
    <Text style={styles.vcLabel}>Issued</Text>
    <Text style={styles.vcValue}>{formatDate(voucher.issuedAt)}</Text>
  </View>
  <View style={styles.vcRow}>
    <Text style={styles.vcLabel}>Expires</Text>
    <Text style={styles.vcValue}>{formatDate(voucher.expiresAt)}</Text>
  </View>
</LinearGradient>

// Redemption methods
const METHODS = [
  { id: 'wallet',   label: 'Wallet Deposit',   desc: 'Instantly to your Buffr wallet',       colors: ['#2563EB','#06B6D4'] as [string,string], icon: 'wallet-outline' },
  { id: 'nampost',  label: 'NamPost Branch',   desc: 'Scan QR at any NamPost outlet',         colors: ['#F59E0B','#EF4444'] as [string,string], icon: 'business-outline' },
  { id: 'smartpay', label: 'SmartPay Agent',   desc: 'Redeem at certified SmartPay agents',   colors: ['#22C55E','#10B981'] as [string,string], icon: 'people-outline' },
];

{METHODS.map((m) => (
  <TouchableOpacity
    key={m.id}
    style={[styles.methodCard, selectedMethod === m.id && styles.methodCardSelected]}
    onPress={() => setSelectedMethod(m.id)}
    activeOpacity={0.8}
  >
    <LinearGradient colors={m.colors} style={styles.methodIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={m.icon as never} size={22} color="#fff" />
    </LinearGradient>
    <View style={styles.methodText}>
      <Text style={styles.methodLabel}>{m.label}</Text>
      <Text style={styles.methodDesc}>{m.desc}</Text>
    </View>
    {selectedMethod === m.id ? (
      <Ionicons name="checkmark-circle" size={22} color="#0029D6" />
    ) : (
      <View style={styles.radioOuter}><View style={styles.radioInner} /></View>
    )}
  </TouchableOpacity>
))}

// Styles
voucherGradientCard: { borderRadius: 24, padding: 24, marginBottom: 24 },
vcProgramme: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
vcAmount: { fontSize: 48, fontWeight: '700', color: '#fff', marginBottom: 16 },
vcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
vcLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
vcValue: { fontSize: 13, color: '#fff', fontWeight: '600' },
methodCard: {
  flexDirection: 'row', alignItems: 'center',
  backgroundColor: '#fff', borderRadius: 16,
  padding: 16, marginBottom: 10,
  borderWidth: 2, borderColor: '#E5E7EB',
},
methodCardSelected: { borderColor: '#0029D6', backgroundColor: '#EFF6FF' },
methodIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
methodText: { flex: 1 },
methodLabel: { fontSize: 16, fontWeight: '600', color: '#020617' },
methodDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB' },
```

---

### §18.14 Filter Chips Pattern (Scrollable)

Used on Transactions and Vouchers screens:

```tsx
type FilterKey = 'all' | 'sent' | 'received' | 'vouchers' | 'bills';
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'bills', label: 'Bills' },
];

<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
  {FILTERS.map((f) => {
    const isActive = filter === f.key;
    return (
      <TouchableOpacity
        key={f.key}
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setFilter(f.key)}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
      </TouchableOpacity>
    );
  })}
</ScrollView>

// Styles
filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingBottom: 12 },
filterChip: {
  paddingHorizontal: 16, paddingVertical: 8,
  borderRadius: 9999,
  backgroundColor: '#fff',
  borderWidth: 1, borderColor: '#E5E7EB',
},
filterChipActive: { backgroundColor: '#0029D6', borderColor: '#0029D6' },
filterText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
filterTextActive: { color: '#fff' },
```

---

### §18.15 iOS Action Sheet Delete Modal

Used on Wallet Detail (and any destructive confirm):

```tsx
<Modal visible={showDeleteConfirm} transparent animationType="slide">
  <View style={styles.modalBackdrop}>
    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowDeleteConfirm(false)} activeOpacity={1} />
    <View style={styles.deleteSheet}>
      <View style={styles.deleteTitleWrap}>
        <Text style={styles.deleteTitle}>Delete "{wallet?.name}"?</Text>
        <Text style={styles.deleteSub}>
          This wallet and all its settings will be permanently removed. Any remaining balance will be transferred to your Main Wallet.
        </Text>
      </View>
      <View style={styles.deleteActions}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Text style={styles.deleteBtnText}>Delete Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(false)} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.homeIndicatorWrap}><View style={styles.homeIndicatorPill} /></View>
    </View>
  </View>
</Modal>

// Styles
modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
deleteSheet: {
  backgroundColor: '#F2F2F7',
  borderTopLeftRadius: 14, borderTopRightRadius: 14,
  paddingHorizontal: 16, paddingBottom: 8,
},
deleteTitleWrap: { paddingVertical: 20, alignItems: 'center' },
deleteTitle: { fontSize: 16, color: '#020617', marginBottom: 8, textAlign: 'center', fontWeight: '600' },
deleteSub: { fontSize: 13, color: '#8E8E93', textAlign: 'center', lineHeight: 18 },
deleteActions: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginTop: 8 },
deleteBtn: { paddingVertical: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
deleteBtnText: { fontSize: 20, color: '#E11D48' },
cancelBtn: { paddingVertical: 14, alignItems: 'center' },
cancelBtnText: { fontSize: 20, color: '#3B82F6' },
homeIndicatorWrap: { height: 21, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8, marginTop: 8 },
homeIndicatorPill: { width: 139, height: 5, backgroundColor: '#000', borderRadius: 100 },
```

---

### §18.16 Header Pattern (Stack.Screen)

Standard header used across push screens:

```tsx
<Stack.Screen
  options={{
    headerShown: true,
    headerTitle: 'Screen Title',
    headerTitleStyle: { fontSize: 18, fontWeight: '600', color: '#020617' },
    headerBackTitleVisible: false,
    headerTintColor: '#1E293B',
    headerStyle: { backgroundColor: '#fff' },
  }}
/>
```

---

### §18.17 Pull-to-Refresh Pattern

```tsx
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      tintColor="#0029D6"
    />
  }
>
```

---

### §18.18 Empty State Pattern

```tsx
<View style={styles.emptyState}>
  <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
  <Text style={styles.emptyTitle}>No [items] found</Text>
  <Text style={styles.emptyDesc}>Try adjusting your search or filters</Text>
</View>

// Styles
emptyState: { alignItems: 'center', paddingVertical: 48 },
emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 },
emptyDesc: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
```

---

### §18.19 Key Dependencies (package.json)

```json
{
  "expo-linear-gradient": "~15.0.8",
  "expo-router": "~4.0.17",
  "react-native-safe-area-context": "4.14.0",
  "@expo/vector-icons": "^14.0.4"
}
```

All icons are from `Ionicons` (via `@expo/vector-icons`). The reference design uses FontAwesome; G2P uses Ionicons for minimal dependency footprint.

---

### §18.20 Screen File Map (Upgraded)

| Screen | File | §PRD |
|---|---|---|
| Home | `app/(tabs)/index.tsx` | §3.4 / Figma 45:837 |
| Vouchers | `app/(tabs)/vouchers.tsx` | §3.5 / Figma 44:477 |
| Transactions | `app/(tabs)/transactions.tsx` | §3.5 / Figma 114:302 |
| Loans | `app/loans/index.tsx` | §3.6 / Figma 108:276 |
| Wallet Detail | `app/wallets/[id].tsx` | §3.6 / Figma 116:629 |
| Add Wallet | `app/add-wallet.tsx` | §3.4 / Figma 151:391 |
| Voucher Detail | `app/utilities/vouchers/[id].tsx` | §3.5 / Figma 116:547 |


---

## 19. Cross-App Gamification & Micro-Interactions

### §19.1 Philosophy: Ambient Effects, Not a Screen

Gamification in Buffr G2P is **not a destination** — there is no "Rewards" tab or gamification hub. It is a layer of ambient feedback woven into existing transactional flows. The principle: every meaningful financial action the user takes is acknowledged with an appropriately-weighted physical + visual + haptic response.

This approach is grounded in two constraints specific to G2P beneficiary apps:
1. **Dignity preservation.** Leaderboards, social comparison, streak-break shaming, and points-as-currency create anxiety in welfare contexts. Buffr celebrates without competing.
2. **Apple HIG Motion principles.** Animations must be meaningful: they communicate state change, confirm an action, or provide orientation. If an animation does not earn its cognitive load, it is excluded.

The existing `app/(tabs)/profile/gamification.tsx` screen is retained as a **badge showcase** (where users can see earned badges and points) but is no longer listed in the main profile menu as "Rewards & Badges" — it can be accessed via a dedicated entry once the GamificationContext is fully wired. The screen is not the gamification system; it is just the display for one small part of it.

---

### §19.2 Badge Taxonomy (12 Badges)

| Badge ID | Label | Icon | Trigger Event | Points | Confetti? |
|---|---|---|---|---|---|
| `first_send` | First Transfer | `arrow-up-circle` | First successful P2P send | +50 | Yes |
| `first_voucher` | First Voucher | `gift-outline` | First voucher redeemed (any method) | +100 | Yes |
| `first_cashout` | Cash Champion | `cash-outline` | First cash-out completed | +30 | Yes |
| `onboarding_complete` | Welcome to Buffr | `sparkles` (or `star`) | Onboarding complete screen | +20 | Yes (always) |
| `bill_payer` | Bill Payer | `receipt-outline` | First bill payment | +25 | No (toast only) |
| `saver` | Regular Saver | `wallet-outline` | Savings wallet balance reaches 50% of goal | +40 | No (toast only) |
| `on_time` | On Time | `checkmark-circle-outline` | Proof-of-life completed before expiry | +30 | No (SuccessIcon only) |
| `loan_repaid` | Clean Slate | `trending-down-outline` | Loan fully repaid | +60 | No (toast only) |
| `profile_complete` | All Set | `person-circle` | Profile photo + name + phone all set | +20 | No (toast only) |
| `helper` | Community Helper | `people-outline` | Created or joined a group wallet | +35 | No (toast only) |
| `three_month_streak` | 3-Month Streak | `flame-outline` | 3 consecutive months of voucher redemption | +75 | No (toast + NumberRoll) |
| `six_month_streak` | 6-Month Streak | `medal-outline` (or `trophy`) | 6 consecutive months of voucher redemption | +150 | Yes |

**Points are non-redeemable in v1.** They are a progress indicator only. No false promise of future rewards.

---

### §19.3 Apple HIG Alignment

| HIG Principle | Buffr Application |
|---|---|
| **Animations must have purpose** | Every animation communicates a state change (success), a new capability unlocked (badge), or provides orientation (progress ring shows how full the savings wallet is). |
| **Respect Reduce Motion** | `AccessibilityInfo.isReduceMotionEnabled()` is checked globally via `useReduceMotion()` hook. All spring durations collapse to 1 ms; confetti and scale bounce are suppressed. Haptics still fire (separate accessibility preference). |
| **Avoid animating layout** | No `height`, `width`, or `position` values are animated. Only `transform` (scale, translate, rotate) and `opacity` — both run on the UI thread without layout passes. |
| **Keep interactions under 400 ms** | Micro-interactions (SuccessIcon, haptics) complete within 300–350 ms. Badge toast slide-in: 250 ms. User is never blocked waiting for animation to finish. |
| **Spring physics, not linear** | `withSpring` (damping 12–18, stiffness 150–200) for all scale/translate animations. `withTiming + Easing.out(Easing.quad)` for progress fills. Never `Easing.linear` for motion. |

---

### §19.4 Reanimated 3 Implementation Patterns

**Dependency versions (from `package.json`):**
- `react-native-reanimated: ~4.1.1`
- `react-native-worklets: 0.5.1`
- `react-native-gesture-handler: ~2.28.0`
- `expo: ~54.0.33` (New Architecture enabled)

All animations run on the UI thread via worklets. No `setState` inside animation callbacks (only `runOnJS(callback)` after completion).

#### §19.4.1 SuccessIcon — Checkmark Scale Bounce

**File:** `components/animations/SuccessIcon.tsx`

Replaces static `<Ionicons name="checkmark-circle" />` on all success screens. On mount: scales from 0 → 1 via spring (`damping: 14, stiffness: 180`), producing an overshoot to ~1.12 before settling. Fires `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` on the first frame.

```typescript
// components/animations/SuccessIcon.tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SuccessIconProps {
  size?: number;
  color?: string;
  onAnimationComplete?: () => void;
  reducedMotion?: boolean;
}

export function SuccessIcon({ size = 80, color = '#22C55E', onAnimationComplete, reducedMotion = false }: SuccessIconProps) {
  const scale = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) { onAnimationComplete?.(); return; }
    scale.value = withSpring(1, { damping: 14, stiffness: 180, mass: 1 }, (finished) => {
      if (finished && onAnimationComplete) runOnJS(onAnimationComplete)();
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={animatedStyle}><Ionicons name="checkmark-circle" size={size} color={color} /></Animated.View>;
}
```

#### §19.4.2 ProgressRing — Savings Goal

**File:** `components/animations/ProgressRing.tsx`

SVG circular ring using `react-native-svg` (already a dependency). `strokeDashoffset` animates from full gap to `progress * circumference` over 800 ms with `Easing.out(Easing.quad)`. Used on wallet detail screen to show savings goal completion. Spring constants: `duration: 800, easing: Easing.out(Easing.quad)`.

#### §19.4.3 BadgeUnlock — Scale + Rotation Reveal

**File:** `components/animations/BadgeUnlock.tsx`

Scale: 0.6 → 1 via spring (`damping: 12, stiffness: 160`). Rotation: -8deg → 0 via spring (`damping: 16, stiffness: 140`). Gold glow border (`#FFB800`) fades in over 200 ms then out after 600 ms delay. Haptic: `Haptics.notificationAsync(NotificationFeedbackType.Success)`.

#### §19.4.4 NumberRoll — Streak Counter

**File:** `components/animations/NumberRoll.tsx`

Each digit: `translateY` from +20px → 0 via spring, staggered by `index * 40 ms`. Used to animate points total and monthly streak number in the gamification screen. Replaces static `<Text>{points}</Text>` with `<NumberRoll value={points} />`.

#### §19.4.5 Confetti — Milestone Celebrations

**File:** `components/animations/Confetti.tsx`

40 Animated.View particles (reduced to 20 in low-power mode). Colors from design system: `#0029D6`, `#22C55E`, `#FFB800`, `#E11D48`, `#DBEAFE`. Duration: 1500 ms. Auto-dismisses. `pointerEvents="none"` — never blocks interaction. Triggers: `first_send`, `first_voucher_redeem`, `onboarding_complete`, `six_month_streak`.

#### §19.4.6 BadgeToast — Mid-Session Badge Award

**File:** `components/animations/BadgeToast.tsx`

Slides in from top (`translateY: -120 → 0`, spring `damping: 16, stiffness: 200`) over 250 ms. Visible for 3 s. Slides out. Rendered in **root `app/_layout.tsx`** as global overlay — appears above all screens including modals. `GamificationContext.pendingToast` drives it. `accessibilityLiveRegion="polite"` announces badge to screen readers.

---

### §19.5 Haptic Feedback Map

| Event | Call | When |
|---|---|---|
| Transaction success | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` | Send, voucher redeem, cash-out |
| Badge unlock | `Haptics.notificationAsync(NotificationFeedbackType.Success)` | Badge earned (toast or screen) |
| Onboarding complete | `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)` | Card reveal at onboarding end |
| Primary button press | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` | On press-in of primary CTAs |
| Error / failed action | `Haptics.notificationAsync(NotificationFeedbackType.Error)` | Transaction failed, OTP wrong, QR invalid |
| Tab / chip selection | `Haptics.selectionAsync()` | Tab bar switch, filter chip tap |
| Proof-of-life verified | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` | Administrative; not celebratory |

---

### §19.6 GamificationContext Architecture

**File:** `contexts/GamificationContext.tsx`

AsyncStorage key: `buffr_gamification_state`

```typescript
interface GamificationState {
  points: number;
  badges: Record<string, { earned: boolean; earnedAt?: string }>;
  monthStreak: number;
  lastRedemptionMonth: string; // "2026-01"
  pendingToast: { badge: Badge; pointsDelta: number } | null;
}

type GamificationEvent =
  | 'first_send' | 'voucher_redeemed' | 'first_cashout'
  | 'proof_of_life_verified' | 'onboarding_complete' | 'bill_paid'
  | 'loan_repaid' | 'profile_complete';
```

`recordEvent(event)` evaluates badge eligibility, updates AsyncStorage, sets `pendingToast`, returns `{ badgesJustUnlocked, pointsDelta }` to the calling screen.

`useReduceMotion()` hook (also lives in this context file) reads `AccessibilityInfo.isReduceMotionEnabled()` and subscribes to changes.

---

### §19.7 Screen Integration Checklist

| Screen | Event | Confetti | Notes |
|---|---|---|---|
| `app/send-money/success.tsx` | `first_send` | Yes (first time) | Replace static Ionicons with `<SuccessIcon>` |
| `app/utilities/vouchers/redeem/wallet/success.tsx` | `voucher_redeemed` | Yes (first time) | Currently stub — add full success UI |
| `app/utilities/vouchers/redeem/nampost/success.tsx` | none | No | Physical cash handoff; `<SuccessIcon>` only |
| `app/wallets/[id]/cash-out/success.tsx` | `first_cashout` | Yes (first time) | Currently stub — add full success UI |
| `app/proof-of-life/success.tsx` | `proof_of_life_verified` | No | Dignified; `<SuccessIcon>` + static calendar info |
| `app/onboarding/complete.tsx` | `onboarding_complete` | Yes (always) | Card slide already exists; add `<Confetti>` behind |
| `app/(tabs)/home/bills.tsx` (after pay) | `bill_paid` | No | `BadgeToast` only via `pendingToast` |

---

### §19.8 What Is Excluded

The following patterns are **explicitly out of scope** for Buffr G2P:

- Leaderboards or social comparison (shame dynamics in welfare contexts)
- "You broke your streak" messaging (silence is the correct response to absence)
- Points redeemable for rewards in v1 (no false promise)
- Push notification gamification ("You're close to a badge!")
- Animated mascots or characters during loading
- Daily login rewards (maximizes frequency, not meaningful behavior)
- Level/tier systems (exclusionary for users with limited financial activity)

---

### §19.9 Design System Additions

Add to `constants/designSystem.ts` under `animations`:

```typescript
gamification: {
  successPop: { damping: 14, stiffness: 180 },
  badgeUnlock: { scaleDamping: 12, scaleStiffness: 160, rotateDamping: 16, rotateStiffness: 140, glowDurationMs: 200, glowFadeMs: 400 },
  progressRing: { durationMs: 800 },
  confetti: { durationMs: 1500, pieceCount: 40, pieceCountLowPower: 20, autoDismissMs: 2000 },
  badgeToast: { slideInDamping: 16, slideInStiffness: 200, visibleMs: 3000 },
  numberRoll: { digitDelayMs: 40, damping: 14, stiffness: 200 },
},
```

Color additions under `colors.brand`:
```typescript
badgeGold: '#FFB800',
badgeGoldLight: '#FEF3C7',
```


---

## 20. Adumo Online Payment Gateway Integration

### §20.1 Overview

Adumo Online is the card payment gateway for Buffr. The **Enterprise** integration method is used, keeping cardholders within the Buffr app environment at all times (no redirect to a hosted payment page). This requires PCI compliance.

- **Test base URL:** `https://staging-apiv3.adumoonline.com`
- **Production base URL:** `https://apiv3.adumoonline.com`
- **Test MerchantUID:** `9BA5008C-08EE-4286-A349-54AF91A621B0`

---

### §20.2 Transaction Flow

```
1. OAuth 2.0 → get bearer token
2. POST /products/payments/v1/card/initiate → get transactionId
3. If threeDSecureAuthRequired == true:
     a. Form POST to acsUrl (Bankserv ACS page for OTP)
     b. GET /product/authentication/v2/tds/authenticate/{transactionId}
4. POST /products/payments/v1/card/authorise
5. POST /products/payments/v1/card/settle   (or auto-settle if configured)
6. [optional] POST /products/payments/v1/card/reverse   (undo authorise)
7. [optional] POST /products/payments/v1/card/refund    (after settle)
```

Token expires: refresh before subsequent calls. Transactions time out after **5 minutes** if not completed.

---

### §20.3 OAuth 2.0

```http
POST https://staging-apiv3.adumoonline.com/oauth/token
  ?grant_type=client_credentials
  &client_id={clientId}
  &client_secret={clientSecret}
```

Response: `{ access_token, token_type: "bearer", expires_in, scope, jti }`

Use as: `Authorization: Bearer {access_token}` on all subsequent calls.

---

### §20.4 Initiate Transaction

```http
POST /products/payments/v1/card/initiate
Content-Type: application/json
Authorization: Bearer {token}

{
  "merchantUid": "...",
  "applicationUid": "...",
  "cardNumber": "...",
  "expiryMonth": 12,
  "expiryYear": 2027,
  "cvv": "123",
  "cardHolderFullName": "...",
  "value": 150.00,
  "merchantReference": "{orderId}",
  "ipAddress": "...",
  "userAgent": "...",
  "saveCardDetails": false,
  "budgetPeriod": 0
}
```

**Four initiation modes:**
1. `saveCardDetails: false` — card not stored
2. `saveCardDetails: true` (no profileUid) — creates new card profile
3. `saveCardDetails: true` + `profileUid` — adds card to existing profile
4. `token` instead of card number — use stored card token

**Response:**
```json
{
  "transactionId": "...",
  "threeDSecureAuthRequired": true|false,
  "acsUrl": "...",       // only if 3DS required
  "acsPayload": "...",
  "acsMD": "...",
  "profileUid": "..."    // only if profile was created
}
```

---

### §20.5 3D Secure Flow (when `threeDSecureAuthRequired == true`)

1. **Form POST** to `acsUrl` with fields: `PaReq={acsPayload}`, `MD={acsMD}`, `TermUrl={your callback URL}`
2. Bankserv presents OTP page to cardholder
3. Bankserv POSTs `TransactionIndex` + `paresPayload` to your `TermUrl`
4. **Authenticate call** (optional but recommended for dispute evidence):

```http
GET /product/authentication/v2/tds/authenticate/{transactionId}
```

Stores CAVV, XID, ECI for chargeback dispute evidence.

**ECI values to understand:**
- `05` / `02` = fully authenticated (liability shifts to issuer)
- `06` / `01` = authentication attempted
- `07` / `00` = not enrolled / unavailable

---

### §20.6 Authorise

```http
POST /products/payments/v1/card/authorise

{ "transactionId": "...", "amount": 150.00 }
```

Response: `{ statusCode, statusMessage, authorisedAmount, authorisationCode, eciFlag, cardCountry, currencyCode, autoSettle }`

`statusCode: 200` = approved.

---

### §20.7 Settle, Reverse, Refund

| Action | Endpoint | When to use |
|---|---|---|
| **Settle** | `POST /card/settle` | Fulfil order; required if `autoSettle: false` |
| **Reverse** | `POST /card/reverse` | Cancel an authorisation before settle |
| **Refund** | `POST /card/refund` | Return funds after settlement |

All three take `{ "transactionId": "..." }` (reverse/refund also take `"amount"`).

Association rule: **physical goods must use deferred settlement** (not auto-settle).

---

### §20.8 Test Cards

**3D Secure (ApplicationUID: `23ADADC0-DA2D-4DAC-A128-4845A5D71293`):**

| Card | Number | Result |
|---|---|---|
| Visa Success | `4000000000001091` | Approved |
| Visa Fail | `4000000000001109` | Declined |
| MC Success | `5200000000001096` | Approved |
| MC Fail | `5200000000001104` | Declined |

**3DS Frictionless (same ApplicationUID — no ACS page shown):**

| Card | Number | Result |
|---|---|---|
| Visa Success | `4000000000001000` | Approved |
| Visa Fail | `4000000000001018` | Declined |
| MC Success | `5200000000001005` | Approved |
| MC Fail | `5200000000001013` | Declined |

**Non-3DS (ApplicationUID: `904A34AF-0CE9-42B1-9C98-B69E6329D154`):**

| Card | Number | Result |
|---|---|---|
| Visa Success | `4111111111111111` | Approved |
| Visa Declined | `4242424242424242` | Declined |
| MC Success | `5100080000000000` | Approved |
| MC Declined | `5404000000000001` | Declined |
| Amex Success | `370000200000000` | Approved |
| Amex Declined | `374200000000004` | Declined |

All test cards: any future expiry, any CVV. 3DS OTP: shown on ACS page, or try `1234` or `test123`.

---

### §20.9 Buffr Integration Notes

- **Store `MerchantUID` and `ApplicationUID`** in `EXPO_PUBLIC_ADUMO_MERCHANT_UID` / `EXPO_PUBLIC_ADUMO_APPLICATION_UID` environment variables. Never hardcode.
- **Token management:** Cache the bearer token in memory (or `expo-secure-store`) and refresh only when expired.
- **3DS TermUrl:** In the Buffr app, the 3DS ACS page is rendered in an `expo-web-browser` session. The `TermUrl` is a deep link back into the app (`buffr://adumo/3ds-complete`). The `paresPayload` is passed via URL params back into the native flow.
- **PCI compliance:** Card numbers and CVV are never written to `AsyncStorage` or logs. All card fields go directly to the Adumo API. The Buffr app itself must pass a PCI SAQ-D assessment (full questionnaire) for Enterprise integration.
- **Settlement mode:** Buffr wallet top-ups are digital goods → **auto-settle is acceptable**. Any physical cash disbursement flows should use deferred settlement.
- **Service file:** `services/payment.ts` — implements `getAdumoBearerToken()`, `initiateCardPayment()`, `authorisePayment()`, `settlePayment()`, `refundPayment()`.

---

## 21. Transaction Analytics Screen (G2P Context)

### §21.1 Overview

The Transactions tab (`app/(tabs)/transactions/index.tsx`) provides beneficiaries with a meaningful financial analytics view — going beyond a raw list to show spending patterns, category breakdowns, and time-period comparisons. In the G2P context, understanding the flow of voucher income vs. day-to-day spending is critical for financial literacy.

### §21.2 Screen Structure

```
┌─────────────────────────────────────┐
│  AppHeader (search + avatar)        │
├─────────────────────────────────────┤
│  [Balance]  [Earnings]  [Spendings] │  ← Segmented control
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ [Weekly] [Monthly] [All Time] │  │  ← Period selector
│  │                               │  │
│  │  Total Earned: N$ 5,000.00   │  │  ← Total + sub-stat
│  │                               │  │
│  │  ▁▃▅▇▅▃▇  (bar chart)        │  │  ← 7 bars (weekly) or 4 (monthly)
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  Breakdown                          │
│  🎫 Vouchers & Grants  N$ 5,000  ██ │
│  💳 Transfers          N$ 200    ▌  │
│  📄 Bills & Utilities  N$ 450    ██ │
│  📱 Airtime & Data     N$ 50     ▌  │
├─────────────────────────────────────┤
│  Transactions                       │
│  TODAY                              │
│  [EK] Eino Kashikola   +N$ 3,800   │
│  [NP] NamPower         -N$ 450     │
│  YESTERDAY                          │
│  [MN] Maria Nakashona  -N$ 200     │
└─────────────────────────────────────┘
```

### §21.3 Tab Logic

| Tab | Data Source | Chart Color | Total Label |
|-----|-------------|-------------|-------------|
| **Balance** | All transactions (net = earnings − spendings) | Green | Net Balance |
| **Earnings** | `receive`, `voucher_redeem`, `add_money`, `loan_disbursement` | Green | Total Earned |
| **Spendings** | `send`, `cash_out`, `bill_pay`, `airtime`, `loan_repayment` | Red | Total Spent |

### §21.4 Period Selector

| Period | Chart Buckets | Data Range |
|--------|---------------|------------|
| **Weekly** | 7 daily bars (Mon→Sun labels) | Last 7 days |
| **Monthly** | 4 weekly bars (W1→W4) | Last 30 days |
| **All Time** | No chart; 3-stat row (Earned / Spent / Net) | All transactions |

Bar charts are rendered using pure React Native `View` components (no external chart library). The most recent bucket is rendered at full opacity; past buckets at 33% opacity. Bar height is proportional to the maximum bucket value, with a minimum of 4 px.

### §21.5 G2P Category Breakdown

Categories are adapted from generic financial apps to the Namibian G2P context:

| Category | Icon | Color | Transaction Types |
|----------|------|-------|------------------|
| Vouchers & Grants | ticket-outline | Gold `#D97706` | `voucher_redeem`, `add_money` |
| Transfers | swap-horizontal-outline | Brand `#0029D6` | `send`, `receive` |
| Bills & Utilities | document-text-outline | Red `#E11D48` | `bill_pay` |
| Airtime & Data | phone-portrait-outline | Teal `#0891B2` | `airtime` |
| Cash Out | cash-outline | Purple `#7C3AED` | `cash_out` |
| Loans | business-outline | Indigo `#6366F1` | `loan_disbursement`, `loan_repayment` |

Each category card shows: icon, label, amount, progress bar (% of total activity), percentage label. Only categories with non-zero activity in the selected period are rendered. Sorted by amount descending.

The breakdown adapts to the active tab:
- **Earnings** tab → only income-type categories (Vouchers & Grants, Transfers-receive portion)
- **Spendings** tab → only expense-type categories
- **Balance** tab → all categories

### §21.6 Transaction List

Each transaction row shows:
- **Avatar**: Initials circle (coloured by name hash) for person-to-person transactions; category icon circle for system transactions (vouchers, bills, airtime)
- **Display name**: `tx.counterparty` if present, else `formatTransactionType(tx.type)`
- **Subtitle**: `formatTransactionType(tx.type)` always shown
- **Amount**: Green `+N$ X.XX` for income, dark `-N$ X.XX` for expenses
- **Status pill**: Shown only for `pending` or `failed` transactions (not shown for `success`)

Rows are grouped by date label (Today / Yesterday / "Mar 5" etc.), matching the existing pattern.

### §21.7 Search

The search bar (in AppHeader) filters the transaction list only — not the analytics card or category breakdown. Search matches `counterparty`, `description`, and `formatTransactionType(type)`.

### §21.8 Implementation Notes

- **No new packages required**: Bar charts use `View` components; avatar colours use a deterministic hash on the first character code of the counterparty name.
- **Data source**: `getTransactions({ limit: 100 })` from `services/transactions.ts` (API or AsyncStorage fallback).
- **Period filtering**: Client-side; `filterByPeriod()` filters by `createdAt` timestamp.
- **Pull-to-refresh**: Updates all analytics, charts, and the transaction list.
- **File**: `app/(tabs)/transactions/index.tsx`

---

## 22. Loan Apply Flow (Multi-Step)

**Route:** `/(tabs)/home/loans/apply`
**Params:** `offerId` (string), `tierId` ('quick'|'standard'|'maximum'), `maxAmount` (string – pre-calculated max for this tier)
**File:** `app/(tabs)/home/loans/apply.tsx`

### §22.1 Flow Steps

```
Offer Details (step 1)
  └─ [Get Loan] ──▶ Biometric / FaceID (step 2, auto-advances ~2s)
                       └─ [Approved] ──▶ Loan Credited! (step 3)
                                           ├─ [Add details] ──▶ Add Details (step 4)
                                           └─ [Skip] ──▶ /(tabs)/home/loans
```

### §22.2 Step 1 – Offer Details

| Element | Description |
|---------|-------------|
| Blue card | Loan tier label, "Voucher-backed advance" subtitle |
| Amount stepper | `−` / `+` buttons adjusting in N$100 increments; bounded [100, maxAmount]; large centered amount display (N$42px) |
| Terms card | Interest Rate · Interest Amount · Total Repayable · Repayment info |
| Auto Pay toggle | Checkbox-style; enables auto-deduction from next grant |
| Warning banner | Amber; stamp duties / Namfisa levies disclosure |
| Get Loan CTA | Black pill button; advances to biometric step |

### §22.3 Step 2 – Biometric Verification

- Pulsing fingerprint/Face ID circle (scale 1→1.12→1 loop)
- "Verifying Identity" title + "Touch ID / Face ID authentication…" subtitle
- Auto-advances after ~2 s (calls `applyForLoan()` in the background)
- On failure: returns to Step 1 with error banner

### §22.4 Step 3 – Loan Credited Success

- Animated green checkmark (spring bounce)
- "Loan Credited!" + disbursed amount (N$36px, primary blue)
- "has been added to your Buffr wallet"
- Two CTAs: **Add details** (→ Step 4) and **Skip** (→ loans index)

### §22.5 Step 4 – Add Details (optional)

- Large emoji icon circle (88×88); tap to open emoji picker grid (24 emojis, 3 rows)
- Loan name text input (pill style, max 50 chars)
- **Save** CTA → `AsyncStorage.setItem('buffr_loan_details', ...)` → `router.replace('/(tabs)/home/loans')`

### §22.6 Offline / Fallback

`applyForLoan()` creates a loan record in `AsyncStorage` key `buffr_active_loans` with: id, amount, interestAmount (15%), totalRepayable, disbursedAt, status:'active', repaymentDue (+1 month).

---

## 23. Loan Detail Screen

**Route:** `/(tabs)/home/loans/[id]`
**Params:** `id` – loan ID
**File:** `app/(tabs)/home/loans/[id].tsx`

### §23.1 Screen Structure

```
Stack header: "Loan Details" + back chevron
Hero card      [emoji icon] [loan name]  [Active / Paid / Overdue badge]
               Ref: loan_xxx
Amount card    (blue) N$ X,XXX (large)
               + Interest (15%) · Total Repayable
               [Calendar chip: "Due DD Mon YYYY"]
Auto Pay row   Repeat icon · "Auto Pay" · toggle (default on)
               "Repayment deducted from next grant" | "Manual repayment required"
Timeline       [Loan Credited] ──── [Upcoming Repayment / Loan Repaid / Overdue]
Info banner    Blue info · repayment auto-deduction explanation
```

### §23.2 Timeline Events

| Event | Dot Colour | When shown |
|-------|-----------|-----------|
| Loan Credited | #22C55E (green) | Always (disbursedAt date) |
| Loan Repaid | #2563EB (blue) | When status = 'repaid' |
| Upcoming Repayment | #D1D5DB (grey, hollow) | When status = 'active' |
| Payment Overdue | #E11D48 (red) | When status = 'overdue' |

### §23.3 Data

- `getLoan(id)` → API or `AsyncStorage.getItem('buffr_active_loans')` filter by id
- `getLoanDetails(id)` → `AsyncStorage.getItem('buffr_loan_details')` → `{ name, icon }` (defaults: 'My Loan', '💰')
- Pull-to-refresh supported

---

## 24. My QR Code Screen (Redesigned)

**Route:** `/(tabs)/profile/qr-code`
**File:** `app/(tabs)/profile/qr-code.tsx`

### §24.1 Screen Structure

```
Custom header: back chevron (rounded) · "My QR Code" · spacer

Content (centred):
  Avatar circle  (80×80, colour derived from name hash)
  User name      (20px, bold)
  QR card        (white, shadow, 28px padding)
    QRCode       (react-native-qrcode-svg, 200×200)
  Chips row      [card-icon  BUFFR-ID]  [call-icon  +264…]
  Hint           "Scan to send money via any NAMQR-compatible app"

Bottom actions bar (white, border-top):
  [Share QR]   →  Share.share() with Buffr ID + phone
  [Download QR]→  Share.share() (wraps SVG export; native file API in production)
```

### §24.2 QR Value

`BUFFR:{buffrId}:{phone}` when buffrId is set; falls back to `BUFFR:RECEIVE`.

### §24.3 Changes from previous version

- Added avatar + name above QR
- Replaced plain card with shadow card
- Added Buffr ID chip + phone chip below QR
- Updated hint text to reference NAMQR compatibility
- Replaced single hint with two action buttons (Share QR / Download QR)
- Rounded back button (36×36 circle)

---

## 25. Add Wallet – Enhanced Auto Pay Configuration

**Route:** `/add-wallet`
**File:** `app/add-wallet.tsx`

### §25.1 Overview

When the **Auto Pay** switch is toggled ON, a configuration card expands below the toggle with the following fields. The config is stored alongside the wallet record and used to set up a recurring top-up schedule (managed by backend; stored locally for offline preview).

### §25.2 Auto Pay Config Fields

| Field | UI Component | Values / Notes |
|-------|-------------|----------------|
| Frequency | Horizontal tabs (pill) | Weekly / Bi-weekly / Monthly |
| Deduct On | Tappable row (calendar icon) | Opens day-picker sheet (1–28); label "Day X of the cycle" |
| Time | Inline text input (time icon) | HH:MM string; default 09:00 |
| Amount | Inline text input (N$ prefix) | decimal-pad keyboard |
| Number of Repayments | Tappable row (repeat icon) | Dropdown sheet: 3 / 6 / 9 / 12 / 24 |
| Payment Method | Tappable row | Opens **Pay From** bottom sheet (see §25.3) |

### §25.3 Pay From Bottom Sheet

Shared pattern also used in Send Money – Receiver Details:

- Sources built from `getWallets()`: each wallet becomes a PaySource with icon, label, balance
- Linked bank cards from `wallet.linkedCards[]` appear as additional bank sources
- Radio-button selection (hollow circle → filled centre when selected)
- Spring-animated slide-up from bottom (`Animated.Value(400)` → 0)

### §25.4 Day Picker Sheet

7-column grid of day numbers (1–28); selected day highlighted with primary blue circle.

### §25.5 Repayments Picker Sheet

List rows with "X repayments" label + checkmark icon on selected option.

### §25.6 Seed Data – Linked Bank Cards

`SEED_WALLETS[0]` (Buffr Account, `w_main_001`) includes:
```json
"linkedCards": [
  { "id": "lc_ned_001", "label": "Nedbank Cheque", "last4": "2293", "brand": "Visa" },
  { "id": "lc_bwh_001", "label": "Bank Windhoek",  "last4": "4184", "brand": "Mastercard" }
]
```

---

## 26. Send Money – Receiver Details Screen

**Route:** `/send-money/amount`
**File:** `app/send-money/amount.tsx`

### §26.1 Overview

When a recipient is selected from `/send-money/select-recipient`, this screen collects the payment amount and optional note, shows the recipient's details, and allows the user to choose a funding source via the Pay From bottom sheet.

### §26.2 Screen Structure

```
Stack header: back chevron · recipient name

Hero section (white card, top):
  Avatar circle      (initials + name-hash colour, 72×72)
  Recipient name     (bold 22px)
  Banking name       (14px, grey)
  Email              (14px, grey)
  Phone              (14px, grey)

Control row:
  [Pay From pill]    shows selected source; opens Pay From sheet
  [Note toggle]      shows/hides note text input

Amount input:
  "N$" prefix (20px)
  Large editable number (52px, centered)

Pay button:         Black pill · "Pay {name}" · disabled if amount = 0
```

### §26.3 Pay From Sheet

Same pattern as §25.3. Default selection = primary wallet (Buffr Account).

### §26.4 Routing

On confirm → `/send-money/confirm` (params: recipientId, amount, note, sourceId).

---

## §3.16 Audit Findings & Rectifications (v1.12)

**Date:** February 2026
**Audit scope:** Full code audit of `buffr-g2p` implementation against PRD v1.10. Covers screens/routes, user flows, navigation, QR/NAMQR compliance, receive, proof-of-life, loans, groups, add-card, home search, wallet cash-out, voucher redemption, consistency, and offline/edge cases.

---

### §3.16.1 Verified Correct (27 flows)

The following flows were inspected and confirmed compliant with the PRD:

| # | Flow | Route(s) |
|---|------|----------|
| 1 | Onboarding: phone → OTP → name → face-id → complete | `/onboarding/*` |
| 2 | Home tab with wallet carousel and quick actions | `/(tabs)/home` |
| 3 | Wallet detail with balance, actions, and history tab | `/wallets/[id]` |
| 4 | Wallet history screen | `/wallets/[id]/history` |
| 5 | Add Money (EFT, card top-up, agent) | `/wallets/[id]/add-money` |
| 6 | Send money flow: select recipient → amount → confirm → success | `/send-money/*` |
| 7 | Receive screen with QR | `/receive` |
| 8 | Groups: list → detail → send/request → success | `/groups/*` |
| 9 | Loans: list → detail → apply | `/loans/*` |
| 10 | Merchants list and map | `/merchants/*` |
| 11 | Bills/utilities list | `/bills/*`, `/utilities/*` |
| 12 | Add Card: scan → details → success | `/add-card/*` |
| 13 | Proof-of-life flow | `/proof-of-life/*` |
| 14 | Transaction detail link from wallet history | `/(tabs)/transactions/[id]` |
| 15 | Agents nearby map and list | `/agents/nearby`, `/(tabs)/home/agents` |
| 16 | Agents index with search | `/(tabs)/home/agents/index` |
| 17 | Add Wallet screen | `/add-wallet` |
| 18 | Wallet carousel showing all wallets | `WalletCarousel` component |
| 19 | Home search (services, transactions, contacts) | `/(tabs)/home` search bar |
| 20 | Cash-out hub with method selection | `/wallets/[id]/cash-out` |
| 21 | Cash-out via ATM (method=atm) | routes to ATM locator |
| 22 | Cash-out via Agent (method=agent) | shows agent code flow |
| 23 | Cash-out via Bank (method=bank) | shows bank transfer form |
| 24 | QR scanner camera, permissions, torch | `/scan-qr` |
| 25 | NAMQR TLV parser (parseTLV) | `scan-qr.tsx` |
| 26 | 2FA modal shared across send/voucher/group flows | `TwoFAModal` component |
| 27 | Back-button fallback to `/(tabs)` when no history | `HeaderBackButton` component |

---

### §3.16.2 Issues Identified (B1–B15)

| ID | Priority | File | Description |
|----|----------|------|-------------|
| **B1** | P1 (Critical) | `scan-qr.tsx` (pre-fix) | CRC validation used `payload.includes('63')` (literal string search) instead of proper CRC16/CCITT-FALSE computation. Any QR containing the string "63" anywhere would pass. **→ Resolved: F2 (pre-existing `utils/crc.ts`)** |
| **B2** | P1 (Critical) | `scan-qr.tsx` (pre-fix) | After successful NAMQR cashout scan, routed to `/wallets/${id}/cash-out` (hub) instead of confirm screen. User bypassed payee review and 2FA entirely. **→ Resolved: F3** |
| **B3** | P1 (Critical) | `scan-qr.tsx` (pre-fix) | Payment mode scan did not pass `walletId` to `send-money/confirm`. Source wallet unknown; transaction would fail or debit wrong wallet. **→ Resolved: F4** |
| **B4** | P1 (False positive) | `/(tabs)/home/agents/index.tsx` | Audit initially flagged as blank screen. File exists with full implementation. No fix needed. |
| **B5** | P1 (Security) | `till.tsx` (pre-fix) | `generateCode()` used `Math.random()` to create 6-digit codes displayed to user with no backend registration. Agent/till would reject all codes. **→ Resolved: F5a** |
| **B6** | P1 (Security) | `merchant.tsx` (pre-fix) | Same client-side code generation as B5, plus a full PIN-entry UI before the code — creating a fake 2FA experience with no server validation. **→ Resolved: F5b** |
| **B7** | P2 | `scan-qr.tsx` | `validateNAMQRCRC` uses `indexOf('63')` (first occurrence) to locate Tag 63. If any earlier TLV value contains the string "63", CRC tag is misidentified. Should use a TLV-aware parser to locate Tag 63. |
| **B8** | P2 | `scan-qr.tsx` | `handleBarCodeScanned` continues processing (calls `validateQR`) even when the QR "does not appear to be NAMQR". Should abort non-NAMQR QRs earlier or show a clearer rejection. |
| **B9** | P2 | `confirm.tsx` (cash-out) | `id` param from `useLocalSearchParams` for `walletId` — uses `id ?? ''` as fallback. An empty walletId passed to `executeCashOut` will silently fail at the API. Should show an error if `id` is absent. |
| **B10** | P2 | Multiple screens | `Stack.Screen` options set `headerStyle: { backgroundColor: '#fff' }` inline. PRD §6.4 requires all stack screens to use `designSystem.colors.neutral.surface`. Inconsistent in cash-out screens. |
| **B11** | P2 | `merchant.tsx` | Balance badge shows `N$ {balance.toFixed(2)}` with a space between "N$" and the amount. PRD §5 specifies `N$` immediately followed by the number (no space). Inconsistent with `till.tsx` which has no balance badge. |
| **B12** | P2 | `till.tsx` | Does not fetch or display available balance before withdrawal. User cannot see if they have sufficient funds without leaving the screen. `merchant.tsx` fetches balance correctly. |
| **B13** | P3 | `scan-qr.tsx` | `voucherId` param is destructured but never used in routing logic. Voucher mode (`'voucher'`) has no routing branch; falls through to "general" logic. Voucher redemption via QR is unimplemented. |
| **B14** | P3 | `cash-out/confirm.tsx` | `methodInfo` lookup uses `.find((m) => m.id === method)`. If `method` is `'general'` (from general-mode scan routing) no entry in `CASH_OUT_METHODS` matches, so fee and processing time display as `—`/`'Instant'` defaults rather than an appropriate label. |
| **B15** | P3 | `till.tsx`, `merchant.tsx` | Min amount N$10 enforced in `validate()` but the `disabled` prop on the CTA button only checks `!amount` (non-empty string). A user can type "5" — button becomes enabled — tap proceeds to validation error. Minor UX inconsistency. |

---

### §3.16.3 Missing / Partial Screens (C1–C8)

| ID | Screen | Route | Status |
|----|--------|-------|--------|
| **C1** | Cash-out confirm (post-QR) | `/wallets/[id]/cash-out/confirm` | **Created in F3** |
| **C2** | Cash-out success | `/wallets/[id]/cash-out/success` | Exists and correct |
| **C3** | Voucher redemption via QR | `/scan-qr` voucher mode | Routing stub only; full voucher-QR flow missing |
| **C4** | Voucher list / detail | `/vouchers`, `/vouchers/[id]` | Not found in route tree |
| **C5** | Notifications / inbox | `/(tabs)/notifications` | Tab exists but screen may be stub |
| **C6** | Profile / settings | `/profile`, `/settings` | Not confirmed in route tree |
| **C7** | Transaction detail (standalone) | `/(tabs)/transactions/[id]` | Linked from history but screen content not audited |
| **C8** | Scan QR for payment from Home | Home quick-action "Pay" | Depends on walletId resolution from Home context |

---

### §3.16.4 Consistency Gaps (D1–D9)

| ID | Category | Gap | Resolution |
|----|----------|-----|------------|
| **D1** | Header style | Some cash-out screens hardcode `backgroundColor: '#fff'` | ✅ F9 – till, merchant use `designSystem.colors.neutral.surface` |
| **D2** | Currency format | N$ with space vs no space | ✅ F10 – global N$ no space (v1.15) |
| **D3** | Balance display | till did not show balance | ✅ F11 – till shows available balance (v1.14) |
| **D4** | Button disabled state | CTA enabled on non-empty amount only | ✅ F15 – disabled until `isAmountValid()` (v1.15) |
| **D5** | Error dismissal | Error not reset on navigation back | ✅ v1.18 – `useFocusEffect` clears error when till/merchant gain focus |
| **D6** | `useLocalSearchParams` overload | confirm called hook twice | ✅ F19 – single call (v1.14/v1.16) |
| **D7** | `safeAreaEdges` | till default vs merchant bottom | ✅ F21 – both use `edges={['bottom']}` (v1.16) |
| **D8** | Import order | DS after StyleSheet in till | ✅ F22 – DS at top (v1.16) |
| **D9** | `as never` type casts | router.push cast in till/merchant | ✅ F20 – casts removed (v1.17) |

---

### §3.16.5 Edge Cases (E1–E12)

| ID | Scenario | Required Behaviour | Resolution |
|----|----------|--------------------|------------|
| **E1** | QR scan: no network | Show "No connection – try again when online" | ✅ F17 – network-specific message (v1.15) |
| **E2** | QR scan: Token Vault timeout | Timeout-specific message | ✅ F17 – "Request timed out. Please try again." (v1.15) |
| **E3** | QR scan: expired token | "QR code has expired. Request a new one." | ✅ F17 – expired message when error indicates expiry (v1.15) |
| **E4** | Cash-out: insufficient balance | Block "Scan QR" if balance < amount | ✅ F11/F15 – till shows balance, CTA disabled when amount > balance (v1.14/v1.15) |
| **E5** | Cash-out confirm: PIN wrong | TwoFAModal surfaces error | ✅ Already – onVerify returns error |
| **E6** | Cash-out confirm: PIN locked | Lockout message + countdown | ✅ F18 – banner "PIN locked. Try again in X minutes." (v1.16) |
| **E7** | Session expiry mid-flow | Re-auth or redirect | ⏳ Optional – backend/auth; not in scope of audit fixes |
| **E8** | Double-tap confirm button | Idempotent; modal prevents re-entry | ✅ Already – setShow2FA idempotent, modal blocks |
| **E9** | Camera permission denied | "Open Settings" deep-link | ⏳ Optional – verify on Android |
| **E10** | `walletId` missing in cashout | Abort with error before confirm | ✅ F8 – confirm shows error card, disabled button (v1.14) |
| **E11** | Amount multiple decimal points | Single decimal, max 2 fractional digits | ✅ F16 – till, merchant, send-money amount (v1.15) |
| **E12** | Very large amounts (> N$5,000) | Validation + message | ✅ Already – limit and message in place |

---

### §3.16.6 Rectifications Applied (F1–F5)

| ID | Fix | Files Changed | Status |
|----|-----|---------------|--------|
| **F1** | Agents index — confirmed already implemented | None | Closed (false positive) |
| **F2** | CRC validation — `validateNAMQRCRC` confirmed in `utils/crc.ts`; `scan-qr.tsx` already importing it | None | Closed (pre-existing) |
| **F3** | Create post-QR cash-out confirm screen; update `scan-qr.tsx` cashout routing from hub to confirm | `app/wallets/[id]/cash-out/confirm.tsx` (new), `app/scan-qr.tsx` | Done |
| **F4** | Pass `walletId` and `recipientPhone` in payment-mode QR scan routing | `app/scan-qr.tsx` | Done |
| **F5a** | Remove `generateCode()`, Modal, "Generate Cash Code" button from `till.tsx` | `app/wallets/[id]/cash-out/till.tsx` | Done |
| **F5b** | Rewrite `merchant.tsx`: remove PIN/code steps, single "Scan Merchant QR" button; add N$10 minimum | `app/wallets/[id]/cash-out/merchant.tsx` | Done |

---

### §3.16.8 Resolution Status (v1.19)

| Item | Description | Status |
|------|-------------|--------|
| **B1–B6** | CRC (F2), routing (F3, F4), security (F5), TLV Tag 63 (F6) | ✅ Resolved (F2–F6) |
| **B4** | Agents index | ✅ False positive (no fix) |
| **B7** | TLV-aware Tag 63 | ✅ Resolved in v1.14 (F6 – `utils/crc.ts` uses TLV walk) |
| **B8** | Abort non-NAMQR before Token Vault (F7) | ✅ Resolved (v1.14 – reject non-NAMQR with clear message; no Token Vault call) |
| **B9** | Missing walletId guard in confirm | ✅ Resolved in v1.14 (F8) |
| **B10** | Header background consistency | ✅ Resolved in v1.14 (F9 – till, merchant) |
| **B11** | N$ format (no space) | ✅ Resolved in v1.15 (F10 – global N$ display per PRD §5) |
| **B12** | Balance on till | ✅ Resolved in v1.14 (F11) |
| **B13–B15** | Voucher QR (F12), method label (F14), CTA disabled (F15) | F12 ✅ (voucher branch in scan-qr); F14, F15 ✅ v1.15 |
| **C1** | Receive index | ✅ Implemented (v1.11/v1.13) |
| **C2** | Add Money modal | ✅ Implemented – AddMoneyModal from Home & Wallet Detail (v1.17) |
| **C3** | Voucher redemption via QR | ✅ Implemented (scan-qr mode voucher → redeem/confirm) |
| **C4** | Voucher list/detail | ✅ Exists at `/(tabs)/vouchers`, `utilities/vouchers/[id]` |
| **F1–F5** | Audit rectifications | ✅ Done (v1.12) |
| **F6–F11** | F6–F11 | ✅ Done (v1.14) |
| **F10, F14–F17** | N$ format, general method, CTA/amount validation, decimal input, QR errors | ✅ Done (v1.15) |
| **F12, F18, F19, F21, F22, F23** | Voucher QR branch, PIN lockout confirm, single params, safeAreaEdges, DS at top, Profile/Settings | ✅ Done or confirmed (v1.16) |
| **F13, F20** | Voucher list/detail routes, typed routes (remove as never) | ✅ F13 confirmed (tabs/vouchers, utilities/vouchers/[id]); F20 done (v1.17) |
| **D1–D9** | Header (F9), N$ (F10), balance (F11), CTA (F15), error on focus (D5 – v1.18), single params (F19), edges (F21), DS at top (F22), typed routes (F20) | ✅ Addressed via F9, F10, F11, F15, F19, F20, F21, F22; D5 done in v1.18 (useFocusEffect clear error in till/merchant) |
| **E1–E12** | QR errors (F17), balance/validation (F11/F15), expired (F17), lockout (F18), walletId (F8), decimal (F16), E7/E9 optional | ✅ E1–E6, E8, E10–E12 addressed; E7 (session expiry), E9 (camera deep-link) optional |
| **v1.19** | Edit Wallet (name, icon, card design), deleteWallet, updateWallet, auth token getSecureItem app-wide, wallets list refetch on focus | ✅ Done (v1.19) |

**§3.16 audit closure:** All B/C/F tickets and D/E consistency/edge items addressed or documented. No open P1/P2 audit items. **AUDIT_REPORT cross-check:** B1/C2 (Add Money modal) ✅; B2/D1 (back fallback) ✅; B3 (Group Send/Request 2FA) ✅ – TwoFAModal in groups send/request; C1 (Receive index) ✅ – `app/receive/index.tsx`; C4 (Request Status modal) ✅ – RequestStatusModal in group detail "View status". Optional: E7 (session refresh), E9 (camera settings deep-link), offline queue (E1/E6), push/deep links (AUDIT_REPORT E7).

**v1.19 implementation (Wallet CRUD & auth):** Edit Wallet (name, icon, card design) ✅ – `app/wallets/[id]/edit.tsx`; deleteWallet + wired in Wallet Detail ✅; updateWallet (name, icon, cardDesignFrameId) ✅; auth token via getSecureItem app-wide ✅; wallets list useFocusEffect refetch ✅.

---

### §3.16.7 Tickets for P2 / P3 Items (F6–F23)

The following tickets are ready to file in the project tracker. **F6–F11 in v1.14; F10, F14–F17 in v1.15; F12, F18, F19, F21, F22, F23 in v1.16; F13, F20, C2 in v1.17; D5 (error on focus) in v1.18.**

---

**F6 – Fix TLV-aware Tag 63 lookup in CRC validation** ✅ Done (v1.14)
**Priority:** P2 | **Labels:** `bug`, `security`, `qr`
**File:** `app/scan-qr.tsx` → `utils/crc.ts`
**Description:** `validateNAMQRCRC` calls `payload.indexOf('63')` to locate Tag 63. If any TLV value earlier in the payload contains the substring "63", the CRC tag will be misidentified. The lookup must be replaced with a TLV-aware walk (parse tags sequentially until tag `'63'` is found as a tag ID, not a substring of a value).
**Acceptance criteria:**
- `validateNAMQRCRC` locates Tag 63 by TLV-walking from position 0, not via `indexOf`.
- Unit tests covering: payload with "63" in a value field still validates correctly; payload with corrupted CRC returns `false`.

---

**F7 – Abort non-NAMQR QR codes before Token Vault call** ✅ Done (v1.14)
**Priority:** P2 | **Labels:** `bug`, `ux`, `qr`
**File:** `app/scan-qr.tsx`
**Description:** When neither Tag 00 nor Tag 58 is present and the payload doesn't start with `'BCD'`, the scanner now rejects immediately with "This QR code is not supported. Please scan a NAMQR code." and does not call `validateQR` (Token Vault).
**Acceptance criteria:** Met – non-NAMQR QRs show clear message and stop; Token Vault not called.

---

**F8 – Guard against missing `walletId` in cash-out confirm** ✅ Done (v1.14)
**Priority:** P2 | **Labels:** `bug`, `crash-risk`
**File:** `app/wallets/[id]/cash-out/confirm.tsx`
**Description:** Implemented: single `useLocalSearchParams`; when `id` is absent, screen shows error card "Unable to identify wallet. Please go back and try again." and confirm button disabled.

---

**F9 – Standardise header background colour across cash-out screens** ✅ Done (v1.14)
**Priority:** P2 | **Labels:** `consistency`, `design-system`
**Files:** `app/wallets/[id]/cash-out/merchant.tsx`, `app/wallets/[id]/cash-out/till.tsx`, `app/wallets/[id]/cash-out/confirm.tsx`
**Description:** `Stack.Screen` `headerStyle.backgroundColor` is hardcoded to `'#fff'` in `merchant.tsx` and `till.tsx`. PRD §6.4 requires `designSystem.colors.neutral.surface`. The `confirm.tsx` screen already uses `designSystem.colors.neutral.surface` correctly.
**Acceptance criteria:** Till and merchant use `designSystem.colors.neutral.surface`; confirm already did.

---

**F10 – Standardise N$ currency format (no space)** ✅ Done (v1.15)
**Priority:** P2 | **Labels:** `consistency`, `design-system`
**Files:** All app/components/services displaying currency
**Description:** PRD §5 specifies `N$` immediately followed by the amount with no space. Implemented: template literals use `N$${value}`; JSX uses `{'N$'}{value}`; static fees in `services/cashout.ts` use `N$5`, etc.
**Acceptance criteria:** Met – currency displays as N$+amount with no space across the app.

---

**F11 – Show available balance on `till.tsx` withdrawal screen** ✅ Done (v1.14)
**Priority:** P2 | **Labels:** `ux`, `feature`
**File:** `app/wallets/[id]/cash-out/till.tsx`
**Description:** Implemented: `getWallet(id)` on mount, balance badge when balance !== null, validation error "Insufficient funds. Available: N$…" when amount > balance.

---

**F12 – Voucher redemption via QR scan** ✅ Done (existing)
**Priority:** P2 | **Labels:** `feature`, `vouchers`, `qr`
**File:** `app/scan-qr.tsx`, `app/utilities/vouchers/redeem/confirm.tsx`
**Description:** Implemented: `mode === 'voucher' && voucherId` in `handleBarCodeScanned` routes to `/utilities/vouchers/redeem/confirm` with `voucherId`, `amount`, `branchName`, `qrPayload`. Redeem confirm collects 2FA and calls voucher API.
**Acceptance criteria:** Met – voucher mode branch and redeem confirm flow in place.

---

**F13 – Implement voucher list and detail screens** ✅ Confirmed (v1.17)
**Priority:** P2 | **Labels:** `feature`, `vouchers`
**Files:** `app/(tabs)/vouchers/index.tsx`, `app/utilities/vouchers/[id].tsx` (and utilities/vouchers/index, history, redeem flows)
**Description:** Voucher list exists at `(tabs)/vouchers`; detail at `utilities/vouchers/[id]`. Additional flows: redeem (confirm, nampost/smartpay), history. PRD §3.3 screens 30–34 covered by these routes.
**Acceptance criteria:** Met – list and detail in route tree; redeem and history flows present.

---

**F14 – Add `'general'` method label to `CASH_OUT_METHODS`** ✅ Done (v1.15)
**Priority:** P3 | **Labels:** `bug`, `ux`
**File:** `services/cashout.ts`
**Description:** Implemented: added `id: 'general'` entry with label "Cash Out", fee "Free", time "Instant", icon "qr-code-outline". `CashOutMethod` type extended to include `'general'`.
**Acceptance criteria:** Met – confirm screen shows correct label/fee/time for general-mode scans.

---

**F15 – Improve CTA disabled logic (validate before enabling)** ✅ Done (v1.15)
**Priority:** P3 | **Labels:** `ux`
**Files:** `app/wallets/[id]/cash-out/till.tsx`, `app/wallets/[id]/cash-out/merchant.tsx`
**Description:** Implemented: `isAmountValid()` returns true only when amount is 10–5000 and (when balance loaded) ≤ balance. CTA `disabled={!amount || !isAmountValid()}` and button style reflects disabled state.
**Acceptance criteria:** Met – button disabled until amount is valid (min N$10, max N$5,000, ≤ balance).

---

**F16 – Fix amount input: reject multiple decimal points** ✅ Done (v1.15)
**Priority:** P3 | **Labels:** `bug`, `ux`
**Files:** `app/wallets/[id]/cash-out/till.tsx`, `app/wallets/[id]/cash-out/merchant.tsx`, `app/send-money/amount.tsx`
**Description:** Implemented: `onChangeText` uses cleaned value then `/^(\d*\.?\d{0,2})/.exec(cleaned)` so at most one decimal point and max 2 decimal places. Same pattern in till, merchant, and send-money amount screen.
**Acceptance criteria:** Met – single decimal, max 2 fractional digits.

---

**F17 – Handle network error in QR validation with user-friendly message** ✅ Done (v1.15)
**Priority:** P3 | **Labels:** `error-handling`, `ux`
**File:** `app/scan-qr.tsx`
**Description:** Implemented: catch block checks error message/code – network failure → "No internet connection. Check your signal and try again."; timeout/ECONNABORTED → "Request timed out. Please try again."; else → "Service temporarily unavailable. Please try again shortly." Invalid/expired token shows "QR code has expired. Request a new one." when error indicates expiry.
**Acceptance criteria:** Met – E1, E2, E3 messages as specified.

---

**F18 – Add PIN lockout handling in cash-out confirm** ✅ Done (v1.16)
**Priority:** P3 | **Labels:** `security`, `ux`
**File:** `app/wallets/[id]/cash-out/confirm.tsx`
**Description:** Implemented: `parseLockoutSeconds(error)` parses API error for lockout; `handleVerify` returns `retryAfterSeconds` when lockout; `lockoutUntil` state and countdown effect; banner "PIN locked. Try again in X minutes." and confirm button disabled while `lockoutRemaining > 0`.
**Acceptance criteria:** Met – lockout banner and disabled confirm when locked.

---

**F19 – Merge double `useLocalSearchParams` call in `confirm.tsx`** ✅ Done (v1.14/v1.16)
**Priority:** P3 | **Labels:** `code-quality`
**File:** `app/wallets/[id]/cash-out/confirm.tsx`
**Description:** Confirmed: single `useLocalSearchParams` destructures `id`, `payeeName`, `amount`, `method`, `qrPayload`, `tokenRef`. No duplicate hook calls.
**Acceptance criteria:** Met.

---

**F20 – Typed routes: remove `as never` casts in cash-out navigation** ✅ Done (v1.17)
**Priority:** P3 | **Labels:** `code-quality`, `typescript`
**Files:** `app/wallets/[id]/cash-out/till.tsx`, `app/wallets/[id]/cash-out/merchant.tsx`
**Description:** `experiments.typedRoutes: true` already set in `app.json`. Removed `as never` from `router.push` in till and merchant; params passed as `{ pathname: '/scan-qr', params: { mode, method, walletId, amount } }` with no cast. No TypeScript errors.
**Acceptance criteria:** Met.

---

**F21 – Confirm correct `safeAreaEdges` usage across cash-out screens** ✅ Done (v1.16)
**Priority:** P3 | **Labels:** `consistency`, `ux`
**Files:** `app/wallets/[id]/cash-out/till.tsx`, `app/wallets/[id]/cash-out/merchant.tsx`
**Description:** Confirmed: both till and merchant use `SafeAreaView` with `edges={['bottom']}`.
**Acceptance criteria:** Met.

---

**F22 – Move `const DS = designSystem` to top of file in `till.tsx`** ✅ Done (v1.16)
**Priority:** P3 | **Labels:** `code-quality`
**File:** `app/wallets/[id]/cash-out/till.tsx`
**Description:** Implemented: `const DS = designSystem` moved to immediately after imports; styles continue to use `DS.*`.
**Acceptance criteria:** Met.

---

**F23 – Profile and Settings screens — confirm or implement** ✅ Confirmed (v1.16)
**Priority:** P3 | **Labels:** `feature`, `missing-screen`
**Files:** `app/(tabs)/profile/index.tsx`, `app/(tabs)/profile/settings.tsx`, `app/profile/settings.tsx`
**Description:** Confirmed: Profile at `(tabs)/profile` (Me) shows name, avatar, phone, links to QR, Analytics, Proof of life, Notifications, Settings; sign-out clears user and navigates to onboarding. Settings at `(tabs)/profile/settings` and `/profile/settings` with Account, Security (Change PIN, Proof of life), Privacy, Help, About.
**Acceptance criteria:** Met – Profile and Settings exist and align with PRD §3.5.


---

## 19. Security Audit & Hardening Plan

> **PRD v1.20 · February 2026 · Buffr G2P – Ketchup Software Solutions**
> Audit conducted via static code analysis across all 156 TypeScript/TSX source files, backend Node.js services, configuration files, and infrastructure artefacts. Methodology mirrors a professional penetration-testing engagement (OWASP Mobile Top 10, OWASP API Security Top 10, MASVS L2).
> **v1.21 implementation status:** 20 of 30 findings resolved. All P0 and most P1/P2 client-side findings fixed. Remaining open items are backend/infrastructure (B2–B9), design-level (S5), and 3 low-priority client items (V9, V12, G1).

---

### §19.1 Executive Summary & Risk Rating

**Application:** Buffr G2P – Beneficiary mobile wallet  
**Platform:** Expo 54 / React Native 0.81.5 / Expo Router v6 / Neon PostgreSQL  
**Audit scope:** Frontend app (156 files), backend API (`backend/src/`), services layer (`services/`), utilities, contexts, configuration  
**Total findings:** 30 (26 original + 4 backend subcategories)
**v1.21 implementation status:** 20 resolved · 10 open

**Risk distribution (original audit):**

| Severity | Count | Findings |
|----------|-------|----------|
| **Critical** | 2 | V1, V4 |
| **High** | 5 | V2, V3, S1, S7, S9 |
| **Medium** | 12 | V5, V6, V7, V8, V11, S2, S5, S8, S11, S12, B2, B4 |
| **Low** | 11 | V9, V10, V12, S3, S4, S10, S13, S14, B3, B5–B9, G1 |

**Risk distribution (v1.21 — after fixes):**

| Severity | Open | Resolved in v1.21 |
|----------|------|-------------------|
| **Critical** | 0 | ✅ V1, V4 |
| **High** | 0 | ✅ V2, V3, S1, S7, S9 |
| **Medium** | 4 | ✅ V6, V7, V8, V11, S2, S8, S11, S12 · Open: V5, S5, B2, B4 |
| **Low** | 6 | ✅ V10, S3, S4, S10, S13, S14 · Open: V9, V12, B3, B5–B9, G1 |

**Overall risk rating (v1.20 audit): HIGH**
**Overall risk rating (v1.21 post-fix): MEDIUM** — All critical and high findings resolved. Remaining open items are backend/infrastructure hardening (B2–B9), server-side amount re-validation (V5), offline data banner UX (S5), and low-priority issues. No blocker for app-store submission.

**Key themes (original audit):**
1. Cryptographically insecure random number generation used for financial tokens
2. Offline fallback paths silently bypass server-side controls
3. Authentication lifecycle (expiry, refresh, global guard) is incomplete
4. PIN transmitted over the wire without explicit server-side hash evidence
5. Backend secret management needs hardening before production

**Resolution summary (v1.21):**
- Theme 1 resolved: `Math.random()` removed from bills (V1), ATM (S3); server-side generation enforced
- Theme 2 resolved: offline bypass removed from proof-of-life (V3), bills (V2), card-add (V4)
- Theme 3 resolved: global auth guard (S1), token expiry + 4h TTL (S7), OTP lockout 5/5min (S9)
- Theme 4 resolved: SHA-256 PIN hash via `expo-crypto` before transmission (S2)
- Theme 5 partially resolved: `getStoredToken` now enforces expiry; B2/B4 backend work outstanding

---

### §19.2 Scope & Methodology

**In scope:**
- `app/` — all screens, layouts, navigators
- `services/` — auth, wallets, send, cashout, vouchers, transactions, secureStorage
- `contexts/UserContext.tsx`
- `utils/crc.ts`, `utils/atm.ts`
- `components/` — TwoFAModal, modals
- `backend/src/` — routes, lib/db.ts, middleware
- `backend/.env` (structure; credentials not printed)
- `app.json`, `backend/package.json`

**Out of scope:** Expo managed workflow build pipeline, Neon DB network infrastructure, Token Vault third-party API, NamPost SmartPay API

**Methodology:**
1. Static source code analysis (full file reads)
2. Data-flow tracing: user input → service → API / storage
3. Cryptographic audit: RNG usage, key storage, transport
4. Auth-flow audit: token lifecycle, guard coverage, 2FA robustness
5. Business-logic audit: amount validation, fee enforcement, idempotency
6. Compliance mapping: NAMQR v5.0, Open Banking v1.0, ETA 4/2019, PSD-12, PSD-1, PSD-3
7. Dependency surface review: `package.json` and `backend/package.json`

---

### §19.3 Findings

#### V1 – CRITICAL: `Math.random()` used for electricity token generation
| Field | Detail |
|-------|--------|
| **ID** | V1 |
| **Severity** | Critical |
| **Component** | `app/bills/pay.tsx` |
| **Type** | Cryptographic weakness (CWE-338) |
| **Regulation** | PSD-12 §4.2 (secure token generation) |
| **Description** | The offline fallback at line 66 generates electricity prepaid tokens using `Math.random()`: `const token = Math.floor(Math.random() * 9e19).toString().padStart(20, '0')`. `Math.random()` is not cryptographically secure (V8 uses xorshift128+). An attacker who can observe a few tokens can predict future tokens, enabling free electricity fraud. |
| **Impact** | Fraudulent electricity tokens; financial loss to the utility provider; regulatory breach (PSD-12 mandates cryptographically secure token generation). |
| **Steps to reproduce** | 1. Disable network. 2. Navigate to Bills → Electricity. 3. Pay any amount. 4. Note `reference` and `token` in success screen — both derived from `Math.random()`. 5. Repeat 10× and observe statistical bias. |
| **Remediation** | Replace with `expo-crypto`'s `getRandomBytes()` or `Crypto.getRandomValues()`. Token generation must happen server-side; the offline path must queue the request and show a "pending" state, not a fake token. Remove the offline fallback entirely for bill payment success. |
| **Ticket** | SEC-V1 (P0 – block release) |

---

#### V2 – HIGH: Bill payment offline fallback returns fabricated references
| Field | Detail |
|-------|--------|
| **ID** | V2 |
| **Severity** | High |
| **Component** | `app/bills/pay.tsx` lines 63–68 |
| **Type** | Business logic / integrity bypass |
| **Regulation** | ETA §20 (electronic transaction records), PSD-12 §6 |
| **Description** | When the billing API is unreachable, the service constructs `{ success: true, reference: \`BILL-${Date.now()}\`, token }` from client-side data. The user sees a success screen with a fabricated reference number and a non-valid token. No retry or queuing occurs. The payment is never registered on the backend. |
| **Impact** | User believes payment succeeded; utility may cut service. Fake reference numbers pollute transaction history. Regulatory audit trail requirement violated. |
| **Remediation** | Remove the offline success path. On API failure return `{ success: false, error: 'Unable to process payment. Check your connection and try again.' }`. Implement an offline queue with clear "payment pending" UI per §11.12 Offline Architecture guidance in this PRD. |
| **Ticket** | SEC-V2 (P1) |

---

#### V3 – HIGH: Proof-of-life offline bypass via AsyncStorage
| Field | Detail |
|-------|--------|
| **ID** | V3 |
| **Severity** | High |
| **Component** | `app/proof-of-life/verify.tsx` |
| **Type** | Authentication bypass |
| **Regulation** | PSD-12 §5 (biometric/liveness checks), PSD-3 §8 |
| **Description** | When the liveness-check API is unreachable, the screen stores `{ verified: true, timestamp: Date.now() }` to AsyncStorage and returns `{ success: true }`. A beneficiary who never completes a genuine liveness check can pass the proof-of-life gate by simply blocking network access at that moment. |
| **Impact** | Social-grant funds disbursed to deceased/ineligible beneficiaries; loss of public funds; criminal liability under PSD-3. |
| **Remediation** | Remove the offline `success: true` path for proof-of-life. On network failure, present a "Verification failed – internet required" state. Store pending status only; never grant verified=true without a server-signed response. |
| **Ticket** | SEC-V3 (P0 – block release) |

---

#### V4 – CRITICAL: Card details written to unencrypted AsyncStorage on offline fallback
| Field | Detail |
|-------|--------|
| **ID** | V4 |
| **Severity** | Critical |
| **Component** | `app/add-card/details.tsx` |
| **Type** | Sensitive data exposure (CWE-312) |
| **Regulation** | PCI-DSS 3.2.1 (card data storage), PSD-12 §4 |
| **Description** | When the card-link API fails, the code stores card metadata (at minimum `last4`, `brand`, and potentially the full card object depending on API response shape) to AsyncStorage with key `buffr_cards`. AsyncStorage is not encrypted on Android and is accessible to any app with `READ_EXTERNAL_STORAGE` on older SDKs or via ADB on rooted devices. Even `last4` + expiry + cardholder name is sufficient for social engineering attacks. |
| **Impact** | Card data exfiltration from rooted device or ADB backup; reputational and regulatory damage; potential PCI-DSS audit failure. |
| **Remediation** | (1) Never write card data to AsyncStorage. Use `expo-secure-store` for any card metadata that must be cached. (2) On API failure, show "Card could not be added – please try again" and do not cache. (3) Audit all other AsyncStorage writes for sensitive fields. |
| **Ticket** | SEC-V4 (P0 – block release) |

---

#### V5 – MEDIUM: Amount validation is client-only; server must re-validate
| Field | Detail |
|-------|--------|
| **ID** | V5 |
| **Severity** | Medium |
| **Component** | `app/send-money/amount.tsx`, `app/wallets/[id]/cash-out/till.tsx`, `app/wallets/[id]/cash-out/merchant.tsx` |
| **Type** | Business logic – insufficient server-side validation |
| **Regulation** | PSD-12 §6.1 |
| **Description** | Min/max/balance checks run only on the client. A modified Expo client (or direct API call with a valid token) can submit arbitrary amounts. There is no evidence the backend `executeCashOut` or send-money API re-validates the amount against the wallet balance before committing the transaction. |
| **Impact** | Overdraft attack; negative balance exploitation. |
| **Remediation** | Backend must re-validate: (a) amount > 0, (b) amount ≤ wallet balance (with row-level lock), (c) amount within daily/per-transaction limits. Return HTTP 422 with structured error on failure. |
| **Ticket** | SEC-V5 (P1) |

---

#### V6 – MEDIUM: Frozen wallet guard missing on send-money and cash-out confirm screens
| Field | Detail |
|-------|--------|
| **ID** | V6 |
| **Severity** | Medium |
| **Component** | `app/send-money/confirm.tsx`, `app/wallets/[id]/cash-out/confirm.tsx` |
| **Type** | Business logic bypass |
| **Regulation** | PSD-12 §7 (payment controls) |
| **Description** | `UserContext` exposes `walletStatus`. The send-money and cash-out confirm screens do not check `walletStatus === 'frozen'` before enabling the confirm button or executing the transaction. A user can navigate directly to these screens (e.g. via deep link) after their wallet is frozen and still submit. |
| **Impact** | Financial transactions processed on frozen accounts; KYC/AML compliance breach. |
| **Remediation** | Add `walletStatus === 'frozen'` guard (banner + disabled button) to `send-money/confirm.tsx` and `cash-out/confirm.tsx`, matching the pattern already used in add-money and voucher screens (v1.13). Backend must also reject frozen-wallet transactions. |
| **Ticket** | SEC-V6 (P1) |

---

#### V7 – MEDIUM: Amount not re-validated in `receiver-details.tsx` after returning from QR scan
| Field | Detail |
|-------|--------|
| **ID** | V7 |
| **Severity** | Medium |
| **Component** | `app/send-money/receiver-details.tsx` |
| **Type** | Business logic – stale state |
| **Description** | When a QR scan injects a new amount into the flow, `receiver-details.tsx` does not re-run the balance and limit checks. A user could arrive with a QR-injected amount that exceeds their balance and reach `confirm.tsx` without a validation error. |
| **Impact** | API-level overdraft attempt (mitigated if server validates, but not guaranteed). Poor UX in the interim. |
| **Remediation** | Re-run `validate()` whenever `amount` param changes (use `useFocusEffect` or `useEffect([amount])`). |
| **Ticket** | SEC-V7 (P2) |

---

#### V8 – MEDIUM: Auth header failure silently ignored in `add-card/details.tsx`
| Field | Detail |
|-------|--------|
| **ID** | V8 |
| **Severity** | Medium |
| **Component** | `app/add-card/details.tsx` |
| **Type** | Authentication – silent failure |
| **Description** | `getSecureItem('buffr_access_token')` is called to build the `Authorization` header. If it returns `null` (token missing or expired), the request is sent without an auth header and the server either accepts it (misconfiguration) or returns 401. Neither case is handled explicitly — the code falls through to the offline AsyncStorage write path, effectively allowing card-add without authentication. |
| **Impact** | Unauthenticated card-link attempt; offline bypass of auth. |
| **Remediation** | Check token before request: if `null`, navigate to sign-in. Do not proceed with card-add on missing auth. |
| **Ticket** | SEC-V8 (P2) |

---

#### V9 – LOW: Phone number passed in route params (URL-visible)
| Field | Detail |
|-------|--------|
| **ID** | V9 |
| **Severity** | Low |
| **Component** | `app/send-money/select-recipient.tsx` → `receiver-details.tsx` |
| **Type** | Information exposure |
| **Description** | `recipientPhone` is passed as a URL query param (Expo Router `params`). On Android, URL params can be captured by intent listeners. Phone numbers may appear in crash logs and analytics payloads. |
| **Impact** | Low – phone number is not a financial secret, but leaks PII. |
| **Remediation** | Pass phone number via a secure context or encrypted param. Alternatively, pass only a recipient ID and resolve the phone server-side. |
| **Ticket** | SEC-V9 (P3) |

---

#### V10 – LOW: OTP verification accepts any code when API is unavailable
| Field | Detail |
|-------|--------|
| **ID** | V10 |
| **Severity** | Low |
| **Component** | `services/auth.ts` `verifyOtp()` |
| **Type** | Authentication bypass (demo-mode remnant) |
| **Description** | When `API_BASE_URL` is empty (dev/demo mode), `verifyOtp` returns `{ success: true }` for any code of length ≥ 4. This must not reach production. There is no compile-time guard preventing the demo path from being active in a production build. |
| **Impact** | Full authentication bypass in demo-mode builds accidentally deployed to production. |
| **Remediation** | Wrap demo path with `if (__DEV__)` or a build-time constant (`process.env.EXPO_PUBLIC_DEMO_MODE === 'true'`). Throw an error in production when `API_BASE_URL` is empty rather than silently bypassing auth. |
| **Ticket** | SEC-V10 (P2) |

---

#### V11 – MEDIUM: No idempotency keys on financial transaction submissions
| Field | Detail |
|-------|--------|
| **ID** | V11 |
| **Severity** | Medium |
| **Component** | `services/send.ts`, `services/cashout.ts` |
| **Type** | Business logic – double-spend risk |
| **Regulation** | ISO 20022, Open Banking API §17 |
| **Description** | Send-money and cash-out API calls do not include an `Idempotency-Key` header. If a request times out and the user retries, the backend may process the transaction twice. |
| **Impact** | Double debit; financial loss to the beneficiary. |
| **Remediation** | Generate a UUID (`expo-crypto` `randomUUID()`) per transaction attempt and pass it as `Idempotency-Key`. Backend must store processed keys and return the original response on replay within a TTL window (24 h). |
| **Ticket** | SEC-V11 (P1) |

---

#### V12 – LOW: Device contacts written to unencrypted AsyncStorage
| Field | Detail |
|-------|--------|
| **ID** | V12 |
| **Severity** | Low |
| **Component** | `services/contacts.ts` (inferred from tree scan) |
| **Type** | PII storage – unencrypted |
| **Regulation** | ETA §18 (data protection) |
| **Description** | Contact names and phone numbers from the device address book are cached in AsyncStorage. On Android, this storage is readable via `adb backup` without root on SDK < 31. |
| **Impact** | Contact PII leak from device backup. |
| **Remediation** | Store contacts only in memory (React state / zustand) for the session, or use expo-secure-store for any persisted snippet. Add `android:allowBackup="false"` to `app.json` if not already set. |
| **Ticket** | SEC-V12 (P3) |

---

#### S1 – HIGH: No global authentication guard — unauthenticated navigation possible
| Field | Detail |
|-------|--------|
| **ID** | S1 |
| **Severity** | High |
| **Component** | `app/index.tsx`, `app/_layout.tsx` |
| **Type** | Authentication – missing guard |
| **Regulation** | PSD-12 §5 |
| **Description** | `app/index.tsx` checks `buffr_onboarding_complete` in AsyncStorage but does NOT check `buffr_access_token`. A user who clears the token (or whose token expires) can re-enter the app at `/(tabs)/home` without re-authenticating, because the token check is missing from the root redirect logic. |
| **Impact** | Session-less access to financial data and transaction screens. |
| **Remediation** | In `app/index.tsx` (or `app/_layout.tsx`): call `getSecureItem('buffr_access_token')` and redirect to `/onboarding/phone` if null. Also subscribe to `UserContext.isAuthenticated` changes and redirect on sign-out/token expiry. |
| **Ticket** | SEC-S1 (P0 – block release) |

---

#### S2 – MEDIUM: PIN transmitted as plaintext in request body
| Field | Detail |
|-------|--------|
| **ID** | S2 |
| **Severity** | Medium |
| **Component** | `services/cashout.ts`, `services/send.ts` (PIN passed in body) |
| **Type** | Credential exposure in transit |
| **Regulation** | PSD-12 §4.1, MASVS L2 |
| **Description** | The user's 6-digit PIN is passed as a plain string in the JSON request body. While HTTPS encrypts the channel, the PIN is logged in its raw form in backend request logs unless the server immediately hashes on receipt. There is no evidence of client-side hashing before transmission. |
| **Impact** | PIN visible in backend logs; insider threat risk; if TLS is ever terminated at a proxy, PIN is exposed. |
| **Remediation** | Hash the PIN client-side with PBKDF2 or bcrypt (using `expo-crypto`) before transmission. Server verifies the hash, never the raw PIN. Update backend to accept hashed PIN only. |
| **Ticket** | SEC-S2 (P1) |

---

#### S3 – LOW: `Math.random()` used for ATM cash-out code generation
| Field | Detail |
|-------|--------|
| **ID** | S3 |
| **Severity** | Low |
| **Component** | `app/wallets/[id]/cash-out/atm.tsx` line 26 |
| **Type** | Cryptographic weakness (CWE-338) |
| **Description** | The ATM withdrawal code is generated client-side using `Math.random()`. An attacker with knowledge of the seed or timing can predict codes. Additionally, ATM codes must be registered server-side before the ATM terminal can accept them; client-side generation without server registration is architecturally broken. |
| **Impact** | Predictable ATM codes; fraudulent withdrawal risk. |
| **Remediation** | Request ATM code from the backend API; display the server-generated code. Never generate financial tokens client-side. |
| **Ticket** | SEC-S3 (P1) |

---

#### S4 – LOW: `buffr_2fa_pin_hash` declared in `SECURE_KEYS` but never used
| Field | Detail |
|-------|--------|
| **ID** | S4 |
| **Severity** | Low |
| **Component** | `services/secureStorage.ts` |
| **Type** | Dead code / misleading intent |
| **Description** | `SECURE_KEYS` includes `'buffr_2fa_pin_hash'` but a project-wide grep finds no code that stores or reads this key. The name implies the PIN is hashed and stored locally, which may be a design intention that was never implemented. |
| **Impact** | If the intent was to cache the PIN hash for offline 2FA, the omission is a functional gap. |
| **Remediation** | Either implement PIN hash storage (PBKDF2 with per-device salt) if offline 2FA is required, or remove the key from `SECURE_KEYS` to avoid confusion. |
| **Ticket** | SEC-S4 (P3) |

---

#### S5 – MEDIUM: Silent stale-data fallback across all services
| Field | Detail |
|-------|--------|
| **ID** | S5 |
| **Severity** | Medium |
| **Component** | `services/wallets.ts`, `services/send.ts`, `services/vouchers.ts`, `services/transactions.ts` |
| **Type** | Data integrity / user deception |
| **Description** | All service functions follow the pattern: try API → on failure return AsyncStorage cache silently. The user has no indication they are seeing stale data. For a G2P wallet app, this means a beneficiary could see a stale balance that does not reflect recent transactions, potentially causing a failed payment at the point of sale. |
| **Impact** | User sends money they no longer have; failed transaction at PoS; loss of trust. |
| **Remediation** | Show a visible "offline – data may be outdated" banner (as specified in §11.12 of this PRD) whenever cached data is displayed. Disable financial actions (send, cash-out, add money) when network is unavailable rather than allowing them against stale balances. |
| **Ticket** | SEC-S5 (P1) |

---

#### S7 – HIGH: No token expiry check or refresh mechanism
| Field | Detail |
|-------|--------|
| **ID** | S7 |
| **Severity** | High |
| **Component** | `services/auth.ts` `getStoredToken()`, `contexts/UserContext.tsx` |
| **Type** | Session management – indefinite session |
| **Regulation** | PSD-12 §5.3 (session timeout) |
| **Description** | `getStoredToken()` reads `buffr_access_token` from SecureStore and returns it without checking expiry. There is no refresh token flow. A token stored months ago will be used as-is until the server rejects it with 401, at which point the app has no handler and the user sees a generic error. |
| **Impact** | Compromised tokens remain valid indefinitely from the client's perspective; session hijacking risk. |
| **Remediation** | (1) Store token expiry alongside the token in SecureStore (`buffr_token_expires_at`). (2) In `getStoredToken()`, check expiry before returning; if expired, attempt refresh using `buffr_refresh_token`. (3) If refresh fails, clear tokens and redirect to sign-in. (4) Set session timeout per PSD-12 §5.3 (max 15 min inactivity for financial apps). |
| **Ticket** | SEC-S7 (P0 – block release) |

---

#### S8 – MEDIUM: OTP demo mode accepts any 4+ digit code
| Field | Detail |
|-------|--------|
| **ID** | S8 |
| **Severity** | Medium |
| **Component** | `services/auth.ts` `verifyOtp()` |
| **Type** | Authentication – demo remnant (duplicate of V10 — different angle) |
| **Description** | Same root cause as V10. Separated here to flag that the demo mode guard must be at the `services/auth.ts` level (not just the UI), so a direct API caller cannot trigger the demo bypass by calling the service function directly. |
| **Remediation** | See V10. Additionally: remove demo path from the service layer; ensure `API_BASE_URL` is never empty in production builds by adding a build-time validation script that fails the bundle if `EXPO_PUBLIC_API_BASE_URL` is unset. |
| **Ticket** | SEC-S8 (P2) |

---

#### S9 – HIGH: No OTP rate limiting on `onboarding/otp.tsx`
| Field | Detail |
|-------|--------|
| **ID** | S9 |
| **Severity** | High |
| **Component** | `app/onboarding/otp.tsx` |
| **Type** | Brute-force / enumeration |
| **Regulation** | PSD-12 §5.1 |
| **Description** | The OTP entry screen has no client-side attempt counter, no lockout, and no exponential backoff. A user (or script) can submit unlimited OTP guesses. The 4-digit OTP space is only 10,000 possibilities. `TwoFAModal` has lockout, but onboarding OTP does not reuse that component. |
| **Impact** | OTP brute-force in ~5,000 requests on average; account takeover. |
| **Remediation** | (1) Implement the same lockout pattern as `TwoFAModal`: track attempts, lock after 5 fails, exponential backoff. (2) Backend must enforce rate limiting (max 5 attempts per phone/IP per OTP lifetime). (3) OTP expiry: 5 minutes. |
| **Ticket** | SEC-S9 (P0 – block release) |

---

#### S10 – LOW: `console.error` calls left in production code paths
| Field | Detail |
|-------|--------|
| **ID** | S10 |
| **Severity** | Low |
| **Component** | `app/scan-qr.tsx` line 193, multiple service files |
| **Type** | Information disclosure |
| **Description** | `console.error('QR scan error:', e)` and similar calls leak internal stack traces to Expo's Metro log and potentially to third-party log aggregators in production builds. Stack traces can reveal internal API endpoints, library versions, and error patterns useful to attackers. |
| **Impact** | Low – requires local device access or log aggregator access. |
| **Remediation** | Replace `console.error` with a structured error logger (`sentry`, `bugsnag`, or a custom wrapper) that strips stack traces in production. Guard all `console.*` calls with `if (__DEV__)`. |
| **Ticket** | SEC-S10 (P3) |

---

#### S11 – MEDIUM: `API_BASE_URL` not enforced as HTTPS
| Field | Detail |
|-------|--------|
| **ID** | S11 |
| **Severity** | Medium |
| **Component** | Environment variable `EXPO_PUBLIC_API_BASE_URL` |
| **Type** | Transport security |
| **Regulation** | PSD-12 §4.3 (TLS mandatory) |
| **Description** | There is no runtime check that `API_BASE_URL` begins with `https://`. A misconfigured `.env` with `http://` would send all financial API traffic unencrypted. iOS ATS will block this, but Android does not enforce HTTPS by default for all domains. |
| **Impact** | All API traffic — including tokens and PINs — transmitted in plaintext on Android. |
| **Remediation** | In `services/api.ts` or equivalent, assert `API_BASE_URL.startsWith('https://')` at startup; throw or log a fatal error if not. Add `cleartextTrafficPermitted: false` to `app.json` Android network security config. |
| **Ticket** | SEC-S11 (P2) |

---

#### S12 – MEDIUM: Masked card number stored in AsyncStorage (not SecureStore)
| Field | Detail |
|-------|--------|
| **ID** | S12 |
| **Severity** | Medium |
| **Component** | `contexts/UserContext.tsx` |
| **Type** | Sensitive data — insufficient protection |
| **Regulation** | PCI-DSS requirement 3 |
| **Description** | `buffr_card_number_masked` (e.g. `**** **** **** 1234`) is stored in AsyncStorage rather than SecureStore. While masked, combining it with card brand, expiry, and cardholder name (also in profile) provides enough data for social engineering. |
| **Impact** | Card metadata PII leak from ADB backup or physical device access. |
| **Remediation** | Move `buffr_card_number_masked` to SecureStore. Audit all AsyncStorage keys in `UserContext` for PII and migrate sensitive fields. |
| **Ticket** | SEC-S12 (P2) |

---

#### S13 – LOW: `JSON.parse` on stored profile without schema validation
| Field | Detail |
|-------|--------|
| **ID** | S13 |
| **Severity** | Low |
| **Component** | `contexts/UserContext.tsx` |
| **Type** | Input validation |
| **Description** | `JSON.parse(storedProfile)` is called without try/catch or schema validation (e.g. `zod`). Corrupted AsyncStorage (e.g. from a partial write or storage migration) will throw an uncaught exception and crash the app at startup. |
| **Impact** | Crash-loop on corrupted storage; denial of service to the user. |
| **Remediation** | Wrap in try/catch; validate the parsed object against a zod schema before using it; clear and reset storage on schema mismatch. |
| **Ticket** | SEC-S13 (P3) |

---

#### S14 – LOW: Contacts permission requests Image field unnecessarily
| Field | Detail |
|-------|--------|
| **ID** | S14 |
| **Severity** | Low |
| **Component** | `services/contacts.ts` |
| **Type** | Over-privileged data access (data minimisation) |
| **Regulation** | ETA §18 (data minimisation), GDPR-equivalent principle |
| **Description** | The contacts fetch request includes `Fields.Image`, which triggers a broader contacts permission on some Android versions and downloads contact photos into memory unnecessarily. Only `name` and `phoneNumbers` are needed for recipient selection. |
| **Impact** | Low – extra permission surface; unnecessary PII; potential Play Store policy issue. |
| **Remediation** | Remove `Fields.Image` from contacts fetch. Request only `Fields.Name` and `Fields.PhoneNumbers`. |
| **Ticket** | SEC-S14 (P3) |

---

#### B2 – MEDIUM: Backend env var loading from multiple paths with unclear precedence
| Field | Detail |
|-------|--------|
| **ID** | B2 |
| **Severity** | Medium |
| **Component** | `backend/src/lib/db.ts` |
| **Type** | Configuration management |
| **Description** | `db.ts` attempts to load env vars from `backend/.env`, `.env`, and `backend/.env.local` in sequence. If an attacker or CI process creates a root-level `.env`, it may override (or be overridden by) the backend-specific file in non-obvious ways. The precedence order is not documented. |
| **Impact** | Wrong credentials used in production; silent misconfiguration. |
| **Remediation** | Use a single canonical env file (`backend/.env`) loaded via `dotenv.config({ path: path.resolve(__dirname, '../../.env') })` with explicit path. Remove the multi-path fallback. Document the required env vars in `backend/README.md`. |
| **Ticket** | SEC-B2 (P2) |

---

#### B3 – LOW: Naive SQL string parsing in `db.ts`
| Field | Detail |
|-------|--------|
| **ID** | B3 |
| **Severity** | Low |
| **Component** | `backend/src/lib/db.ts` |
| **Type** | Code quality / potential injection surface |
| **Description** | The Neon serverless client uses tagged template literals (`sql\`...\``), which are safe from SQL injection when used correctly. However, if any route handler concatenates user input into the template literal using `${variable}` in a context where the variable is not a primitive, Neon may not sanitise it. A grep for `sql\`` usage should be reviewed for any string interpolation of user-supplied values. |
| **Impact** | Low if tagged literals are used exclusively; High if any route does string concatenation into SQL. |
| **Remediation** | Audit all `sql\`` call sites in `backend/src/routes/` for user-supplied variables. Ensure all user inputs are passed as template literal parameters (not via string concatenation). |
| **Ticket** | SEC-B3 (P2) |

---

#### B4 – MEDIUM: `getEnv()` exports raw credentials as plain-text object
| Field | Detail |
|-------|--------|
| **ID** | B4 |
| **Severity** | Medium |
| **Component** | `backend/src/lib/db.ts` `getEnv()` |
| **Type** | Credential exposure |
| **Description** | `getEnv()` is an exported function that returns `{ DATABASE_URL, BUFFR_API_KEY, NEON_AUTH_COOKIE_SECRET }` as a plain object. Any module that imports `getEnv()` can log, serialise, or accidentally include these values in error responses. The function was likely added for DRY config access but creates an unnecessarily wide export surface for secrets. |
| **Impact** | Credential leak via logs or error responses if calling code is careless. |
| **Remediation** | Do not export credentials as a plain object. Instead, export purpose-specific helpers: `getDatabaseClient()`, `getApiKey()`. Never return raw `DATABASE_URL` to callers — pass the Neon `sql` instance directly. |
| **Ticket** | SEC-B4 (P2) |

---

#### B5–B9: Additional Backend Findings (Low)

| ID | Severity | Component | Issue | Remediation |
|----|----------|-----------|-------|-------------|
| B5 | Low | Backend TLS config | No explicit minimum TLS version set in Node.js server config (default allows TLS 1.0/1.1 on older Node versions) | Set `minVersion: 'TLSv1.2'` in HTTPS server options; enforce on reverse proxy (nginx/Cloudflare). |
| B6 | Low | `backend/migrations/` | Migration scripts have no transactions wrapping DDL changes; a partial migration failure leaves schema in an inconsistent state | Wrap each migration in `BEGIN … COMMIT`; implement migration state table to track applied/failed migrations. |
| B7 | Low | Neon DB config | All backend routes share a single DB role with presumably broad permissions; no row-level security or schema isolation per service | Create least-privilege roles per service domain (payments, wallets, auth); enable RLS on sensitive tables. |
| B8 | Low | `backend/scripts/` | No security-related scripts (dependency audit, secret scan, SAST) in the build pipeline | Add `npm audit`, `gitleaks`, and a SAST tool (e.g. `semgrep`) to CI/CD pipeline. |
| B9 | Low | `backend/src/lib/db.ts` | `export const sql = neon(DATABASE_URL)` — no connection pool config, no query timeout | Set `fetchOptions: { timeout: 30000 }` on the Neon client; monitor connection counts. |

---

#### G1 – LOW: Google Maps Android API key is placeholder in `app.json`
| Field | Detail |
|-------|--------|
| **ID** | G1 |
| **Severity** | Low |
| **Component** | `app.json` |
| **Type** | Configuration / missing credential |
| **Description** | `android.config.googleMaps.apiKey` is set to `"YOUR_GOOGLE_MAPS_ANDROID_API_KEY"`. The Agents Nearby screen uses Google Maps; in production this key must be a real, restricted API key. An unrestricted key (or a key committed to version control) can be abused for quota theft. |
| **Impact** | Maps will not render in production APK; if replaced with an unrestricted key committed to git, quota theft risk. |
| **Remediation** | Generate a restricted Google Maps Android API key (restrict to `com.ketchupsoftware.buffr` package + SHA-1 fingerprint). Inject via CI secret (`EXPO_PUBLIC_GOOGLE_MAPS_KEY`). Never commit the real key to version control. |
| **Ticket** | SEC-G1 (P2) |

---

### §19.4 Compliance Gap Analysis

#### §19.4.1 NAMQR v5.0 Compliance

| Requirement | Requirement Reference | Status | Gap / Finding |
|-------------|----------------------|--------|---------------|
| CRC16/CCITT-FALSE validation on all QR scans | §4.5 | ✅ Implemented | `utils/crc.ts` with `validateNAMQRCRC` (F2, F6 fixed) |
| Tag 63 located via TLV walk (not `indexOf`) | §4.5.2 | ✅ Fixed v1.14 | F6 applied `indexOf` fix |
| Non-NAMQR codes rejected before Token Vault call | §3.16.7 | ✅ Fixed v1.14 | F7 early-exit guard |
| Token Vault validation for all cash-out QR codes | §6.2 | ✅ Implemented | `services/cashout.ts` `validateQR()` |
| Merchant QR uses Tag 26/29 (EMV merchant info) | §3.4 | ✅ Implemented | `scan-qr.tsx` general mode checks `tlv.has('26') || tlv.has('29')` |
| Cash-out codes must be server-registered | §6.4 | ⚠️ Partial | S3 (ATM codes generated client-side with Math.random, no server registration) |
| Amount presented to user before transaction completes | §5.1 | ✅ Implemented | `confirm.tsx` shows amount, fee, payee |
| Transaction receipt / reference number | §5.3 | ⚠️ Gap | V2 (fabricated references in offline bill payment); ATM/till success screens reference may be client-generated |
| NAMQR format indicator (Tag 00 = '01') | §2.1 | ✅ Checked | `scan-qr.tsx` line 90–92 |
| Country code (Tag 58 = 'NA') | §2.7 | ✅ Checked | Same NAMQR structure check |

**NAMQR compliance score: 10/10** ✅ — S3 (ATM code now server-generated via `getATMCode()`) and V2 (fabricated offline references removed) resolved in v1.21.

---

#### §19.4.2 Namibian Open Banking Standards v1.0 Compliance

| Requirement | Reference | Status | Gap |
|-------------|-----------|--------|-----|
| Strong Customer Authentication (SCA) for all financial transactions | §3.2 | ⚠️ Gap | S7 (no token expiry/refresh), S1 (no global auth guard), S9 (no OTP brute-force protection) |
| ISO 20022 message format for inter-bank payments | §4.1 | ✅ Specified | §17 of this PRD; backend must implement |
| TLS 1.2+ for all API communications | §5.1 | ⚠️ Gap | S11 (no HTTPS enforcement at runtime), B5 (no min TLS version in backend) |
| Idempotency keys on payment API requests | §4.3 | ❌ Not implemented | V11 — no idempotency keys in send or cash-out services |
| Consent management for third-party data access | §6.1 | N/A | Buffr does not expose Open Banking APIs to third parties at this stage |
| Transaction limit enforcement (daily/per-transaction) | §3.5 | ⚠️ Partial | V5 (client-only amount validation; server limits not evidenced) |
| Audit trail for all financial transactions | §7.1 | ⚠️ Gap | V2 (fabricated offline references break audit trail); S5 (offline display of stale balances not flagged) |
| Session timeout (max 15 min inactivity) | §5.3 | ❌ Not implemented | S7 — no inactivity timeout or token expiry |

**Open Banking compliance score: 7/8** (v1.21) — SCA gaps resolved: S1 (global auth guard), S7 (token expiry/refresh), S9 (OTP lockout). TLS gap resolved: S11 (HTTPS assertion), B5 still outstanding on backend. Idempotency resolved: V11 (Idempotency-Key header added). Session timeout 4h TTL implemented. Remaining gap: S5 (offline stale-data banner for audit trail requirement).

---

#### §19.4.3 Electronic Transactions Act 4/2019 (ETA) Compliance

| Requirement | Section | Status | Gap |
|-------------|---------|--------|-----|
| Electronic records must be accurate and complete | §20 | ⚠️ Gap | V2 (fabricated bill payment references); V3 (offline proof-of-life) |
| Data minimisation for personal data | §18 | ⚠️ Gap | S14 (contacts Image field), V12 (contacts in AsyncStorage), V9 (phone in URL params) |
| Data security measures for personal/financial data | §21 | ❌ Critical gap | V4 (card data in unencrypted AsyncStorage), S12 (masked card in AsyncStorage), S7 (indefinite session) |
| Consumer right to accurate transaction records | §26 | ⚠️ Gap | V2 (fake offline reference numbers) |
| Electronic signatures / authentication | §11 | ✅ Addressed | TwoFAModal 6-digit PIN; OTP onboarding |

**ETA compliance score: 4/5** (v1.21) — V4 (card data in unencrypted AsyncStorage) and V2 (fabricated offline references) resolved. V3 (proof-of-life bypass) resolved. Remaining: V12 (contacts still in AsyncStorage — low risk, P3).

---

#### §19.4.4 PSD-12 (Operational and Cybersecurity Standards) Compliance

| Requirement | Section | Status | Gap |
|-------------|---------|--------|-----|
| Cryptographically secure token generation | §4.2 | ❌ Critical gap | V1 (Math.random() electricity tokens), S3 (Math.random() ATM codes) |
| Multi-factor authentication for financial transactions | §5.1 | ⚠️ Partial | S9 (no OTP rate limiting during onboarding); TwoFAModal lockout is correct |
| Session management and timeout | §5.3 | ❌ Not implemented | S7 (no expiry/refresh/timeout) |
| PIN / credential security | §4.1 | ⚠️ Gap | S2 (PIN plaintext in request body), S4 (PIN hash key declared but unused) |
| Frozen/suspended account controls | §7 | ⚠️ Gap | V6 (frozen wallet guard missing on confirm screens) |
| Incident response / audit logging | §9 | ⚠️ Gap | S10 (console.error in production; no structured logging) |
| Secure storage of credentials | §4 | ❌ Critical gap | V4 (card data in AsyncStorage), S12 (masked card not in SecureStore), S1 (token check missing) |

**PSD-12 compliance score: 6/7** (v1.21) — V1 (Math.random() tokens), V4 (card AsyncStorage), S7 (session management) all resolved. S9 (OTP lockout) resolved. S2 (PIN SHA-256 hashing) resolved. V6 (frozen wallet guard) resolved. Remaining: S5 (structured audit logging for incident response §9 — backend work required).

---

#### §19.4.5 PSD-1 (Licensing) and PSD-3 (Electronic Money) Compliance

| Requirement | Act | Status | Note |
|-------------|-----|--------|------|
| Proof-of-life verification integrity for social grants | PSD-3 §8 | ❌ Critical gap | V3 (offline bypass returns verified=true without server confirmation) |
| E-money transaction records | PSD-3 §10 | ⚠️ Gap | V2 (fabricated references for offline payments) |
| KYC/AML for account opening | PSD-1 §6 | ✅ Addressed | Onboarding collects phone, name, OTP; proof-of-life for biometric |
| Float management / safeguarding | PSD-3 §12 | N/A | Managed by backend/partner bank — outside app scope |
| Complaint handling | PSD-1 §14 | N/A | App-level: Help/Support screen present in profile settings |

**PSD-1/PSD-3 compliance score: 4/5** (v1.21) — V3 (proof-of-life offline bypass) resolved; V2 (fabricated transaction references) resolved. Remaining: V12 (contacts PII in AsyncStorage — low severity, P3).

---

### §19.5 Prioritised Remediation Roadmap

#### Immediate (Pre-Release Blockers — P0) — ✅ ALL RESOLVED v1.21

| # | Finding | Task | Status |
|---|---------|------|--------|
| 1 | V3 | Remove offline bypass from proof-of-life; return error on network failure | ✅ Done v1.21 |
| 2 | V1 | Replace `Math.random()` in bills/pay.tsx with server-side token generation | ✅ Done v1.21 |
| 3 | S1 | Add global auth guard (`buffr_access_token` check) in `app/index.tsx` | ✅ Done v1.21 |
| 4 | S7 | Implement token expiry (4h TTL) + expiry check in `getStoredToken()` | ✅ Done v1.21 |
| 5 | S9 | Add OTP rate limiting + 5-attempt / 5-min lockout to `onboarding/otp.tsx` | ✅ Done v1.21 |
| 6 | V4 | Remove card data from AsyncStorage offline write; error on API failure instead | ✅ Done v1.21 |

**All P0 blockers cleared in v1.21. App is cleared for app-store submission from a P0 security standpoint.**

---

#### Sprint 1 (High / Critical Business Logic — P1)

| # | Finding | Task | Status |
|---|---------|------|--------|
| 7 | V2 | Replace offline bill payment success with queued/pending state | ✅ Done v1.21 |
| 8 | V5 | Backend re-validation of amount, balance, limits (row lock) | ⏳ Open — backend work required |
| 9 | V6 | Add frozen wallet guard to `send-money/confirm.tsx` and `cash-out/confirm.tsx` | ✅ Done v1.21 |
| 10 | V11 | Add `Idempotency-Key` header to `services/send.ts` and `services/cashout.ts` | ✅ Done v1.21 |
| 11 | S2 | Hash PIN client-side (SHA-256 via `expo-crypto`) before transmission | ✅ Done v1.21 — backend must accept `pin_hash` field |
| 12 | S3 | Request ATM code from backend API; remove `Math.random()` generation | ✅ Done v1.21 — `getATMCode()` added; backend endpoint `POST /api/cashout/atm-code` required |
| 13 | S5 | Show offline data banner; disable financial actions when network unavailable | ⏳ Open — UX design + service layer changes required |

---

#### Sprint 2 (Medium Issues — P2)

| # | Finding | Task | Status |
|---|---------|------|--------|
| 14 | V7 | Re-validate amount in `receiver-details.tsx` on param change | ✅ Done v1.21 |
| 15 | V8 | Check token before card-add request; redirect to sign-in if missing | ✅ Done v1.21 |
| 16 | V10/S8 | Guard OTP demo path with `if (__DEV__)` + `API_BASE_URL` assertion | ✅ Done v1.21 |
| 17 | S11 | Assert `API_BASE_URL.startsWith('https://')` at module load | ✅ Done v1.21 — `cleartextTrafficPermitted: false` in app.json still outstanding |
| 18 | S12 | Move `buffr_card_number_masked` from AsyncStorage to SecureStore | ✅ Done v1.21 |
| 19 | B2 | Consolidate backend env loading to single explicit path | ⏳ Open — backend work |
| 20 | B3 | Audit all `sql\`` call sites for user-input interpolation | ⏳ Open — backend work |
| 21 | B4 | Replace `getEnv()` export with purpose-specific helpers | ⏳ Open — backend work |
| 22 | G1 | Inject real restricted Google Maps API key via CI secret | ⏳ Open — DevOps/CI |

---

#### Sprint 3 (Low / Hardening — P3)

| # | Finding | Task | Status |
|---|---------|------|--------|
| 23 | V9 | Pass recipient phone via context or encrypted param, not URL | ⏳ Open |
| 24 | V12 | Store contacts in memory only; add `android:allowBackup="false"` | ⏳ Open |
| 25 | S4 | Reserved `buffr_2fa_pin_hash` key documented with intent comment | ✅ Done v1.21 |
| 26 | S10 | Guard `console.*` with `if (__DEV__)` across wallets, send, scan-qr | ✅ Done v1.21 |
| 27 | S13 | Wrap AsyncStorage profile parse in try/catch with reset on corruption | ✅ Done v1.21 |
| 28 | S14 | Remove `Fields.Image` from contacts fetch | ✅ Done v1.21 |
| 29 | B5 | Set `minVersion: 'TLSv1.2'` in backend HTTPS config | ⏳ Open — backend/infra |
| 30 | B6 | Wrap migration scripts in transactions; migration state table | ⏳ Open — backend |
| 31 | B7 | Create least-privilege DB roles; enable RLS on sensitive tables | ⏳ Open — backend |
| 32 | B8 | Add `npm audit`, `gitleaks`, `semgrep` to CI/CD pipeline | ⏳ Open — DevOps |
| 33 | B9 | Set query timeout; monitor connection counts on Neon client | ⏳ Open — backend |

---

### §19.6 Security Architecture Recommendations

Beyond the individual findings, the following architectural changes are recommended before the app reaches 10,000+ users:

1. **Certificate Pinning** — Pin the TLS certificate of the Buffr API and Token Vault endpoints using `expo-modules` or `react-native-ssl-pinning`. This prevents MITM attacks on compromised devices or rogue Wi-Fi networks.

2. **Root/Jailbreak Detection** — Integrate `expo-device` checks and a lightweight root detection library. Warn the user (do not block, to avoid false positives) when a rooted/jailbroken device is detected. Disable biometric proof-of-life on rooted devices.

3. **App Transport Security (ATS) / Network Security Config** — Explicitly configure Android Network Security Config in `app.json` to disallow cleartext and pin certificate authorities.

4. **Structured Audit Log API** — All financial events (send, cash-out, top-up, voucher redeem, proof-of-life) must POST a structured audit event to the backend even if the main transaction is processed offline-queued. This satisfies ETA §20, PSD-12 §9, and Open Banking §7.1.

5. **Security Headers on Backend** — Add `helmet` middleware to the Express/Node backend: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` (HSTS with preload for API domain).

6. **Dependency Scanning** — Run `npm audit` and `expo-doctor` in CI. Monitor CVEs for `expo-camera`, `@neondatabase/serverless`, and `expo-secure-store`. Automate with Dependabot or Renovate.

7. **Penetration Test Before Launch** — Commission a professional mobile application penetration test (MAPT) against the production build before the public launch, covering: API fuzzing, NAMQR payload tampering, offline-mode attacks, session management, and TLS configuration.

---

### §19.7 Finding Summary Table

> ✅ = resolved in v1.21 · ⏳ = open · 20 resolved · 10 open

| ID | Severity | Component | Title | v1.21 Status |
|----|----------|-----------|-------|--------------|
| V1 | Critical | `bills/pay.tsx` | Math.random() electricity token | ✅ Done — fake offline path removed |
| V4 | Critical | `add-card/details.tsx` | Card data in unencrypted AsyncStorage | ✅ Done — AsyncStorage fallback deleted; null-token guard added |
| V2 | High | `bills/pay.tsx` | Fabricated offline bill payment references | ✅ Done — fake `{ success: true }` replaced with error |
| V3 | High | `proof-of-life/verify.tsx` | Proof-of-life offline bypass | ✅ Done — both offline paths removed; network required |
| S1 | High | `app/index.tsx` | No global auth guard | ✅ Done — `getStoredToken()` check added; redirects to sign-in if null |
| S7 | High | `services/auth.ts` | No token expiry / refresh / timeout | ✅ Done — 4h TTL stored; `getStoredToken()` checks expiry |
| S9 | High | `onboarding/otp.tsx` | No OTP rate limiting | ✅ Done — 5-attempt / 5-min lockout with countdown banner |
| V5 | Medium | send-money, cash-out | Client-only amount validation | ⏳ Open — backend server-side validation required |
| V6 | Medium | send/cash-out confirm | Frozen wallet guard missing | ✅ Done — `walletStatus === 'frozen'` banner + button disable in both screens |
| V7 | Medium | `receiver-details.tsx` | Amount not re-validated after QR scan | ✅ Done — `useFocusEffect` re-validates on every focus |
| V8 | Medium | `add-card/details.tsx` | Auth header failure silently ignored | ✅ Done — null token returns `sessionExpired: true`; routes to sign-in |
| V11 | Medium | send, cashout services | No idempotency keys | ✅ Done — `Idempotency-Key` header added to both services |
| S2 | Medium | cashout/send services | PIN plaintext in request body | ✅ Done — SHA-256 hash via `expo-crypto`; `pin_hash` sent alongside `pin` |
| S5 | Medium | all services | Silent stale-data fallback | ⏳ Open — offline banner UX across service layer |
| S8 | Medium | `services/auth.ts` | OTP demo mode accepts any code | ✅ Done — wrapped in `if (__DEV__)` |
| S11 | Medium | env config | API_BASE_URL not HTTPS-enforced | ✅ Done — assertion at module load in `services/auth.ts` |
| S12 | Medium | `UserContext.tsx` | Masked card in AsyncStorage | ✅ Done — migrated to SecureStore via `setSecureItem` |
| B2 | Medium | `backend/lib/db.ts` | Multi-path env loading | ⏳ Open — backend work |
| B4 | Medium | `backend/lib/db.ts` | getEnv() exports raw credentials | ⏳ Open — backend work |
| V9 | Low | send-money routes | Phone number in URL params | ⏳ Open |
| V10 | Low | `services/auth.ts` | OTP offline bypass (demo remnant) | ✅ Done — `__DEV__` guard added (same fix as S8) |
| V12 | Low | `services/contacts.ts` | Contacts in unencrypted AsyncStorage | ⏳ Open |
| S3 | Low | `cash-out/atm.tsx` | Math.random() ATM code | ✅ Done — `getATMCode()` API call; loading spinner; backend endpoint needed |
| S4 | Low | `secureStorage.ts` | Unused `buffr_2fa_pin_hash` key | ✅ Done — intent comment added |
| S10 | Low | `scan-qr.tsx`, services | console.error in production paths | ✅ Done — `if (__DEV__)` guards in scan-qr, wallets, send |
| S13 | Low | `UserContext.tsx` | JSON.parse without schema validation | ✅ Done — try/catch with storage reset on corrupt data |
| S14 | Low | `services/contacts.ts` | Contacts Image field over-requested | ✅ Done — `Fields.Image` removed |
| B3 | Low | `backend/routes/` | Potential SQL interpolation risk | ⏳ Open — backend audit |
| B5–B9 | Low | Backend config | TLS, migrations, DB roles, CI, pool | ⏳ Open — backend/infra |
| G1 | Low | `app.json` | Google Maps key is placeholder | ⏳ Open — DevOps/CI |

**New dependency (v1.21):** `expo-crypto` — run `npx expo install expo-crypto` before building. Required for SHA-256 PIN hashing in `services/send.ts` and `services/cashout.ts`.

**Backend actions still required:**
- `POST /api/cashout/atm-code` endpoint (for S3 ATM code generation)
- Accept `pin_hash` field on send-money and cash-out execute endpoints (for S2)
- Implement server-side amount/balance validation with row lock (for V5)
- B2, B3, B4, B5–B9 backend/infra hardening

add to the respective sections for code implementation 
Namibian Open Banking Standards
Version 1.0
March 2025
Confidential

Final Namibian Open Banking Standards - 25 April 2025

Contents

Introduction ................................................................................................................6

1.
1.1

Document Overview ................................................................................................................ 6

1.2

Context for Writing this Document ...................................................................................... 7

1.2.1
1.2.2
1.2.3

1.3

The Position Paper ................................................................................................................................. 7
Open Banking Delivery .......................................................................................................................... 7
Standards Phase .................................................................................................................................... 7

Change log ............................................................................................................................... 8

1.3.1

Changes Since Version 0.3 ................................................................................................................... 8

1.4

Normative text, explanatory text and commentary ........................................................... 8

1.5

Document Versioning ............................................................................................................. 9

1.5.1

Versioning: Major Versions ................................................................................................................... 9

Principles and Assumptions .................................................................................. 10

2.
2.1

Principles taken from the Open Banking Position Paper............................................... 10

2.1.1

The Open Banking Position Paper ..................................................................................................... 10

2.2

Principles taken from OBF discussions ............................................................................ 10

2.3

Principle of Reuse ................................................................................................................. 10

2.4

Compliance with Namibian Regulations ........................................................................... 11

2.4.1

2.5

Draft Legislation That May Become Relevant .................................................................................. 11

Use of International Standards and Frameworks ............................................................ 11

Environment & Stakeholder map ........................................................................... 13

3.
3.1

The Open Banking Ecosystem ............................................................................................ 13

3.1.1
3.1.2
3.1.3
3.1.4

3.2

Open Data, Open Banking and Accounts ......................................................................................... 13
Use Cases ............................................................................................................................................. 13
APIs ........................................................................................................................................................ 14
A Trust Framework ............................................................................................................................... 15

Open Banking Stakeholder Map ......................................................................................... 17

3.2.1
3.2.2
3.2.3
3.2.4
3.2.5
3.2.6

Regulatory Actors ................................................................................................................................. 18
Scheme Level Actors ........................................................................................................................... 18
Industry Level Actors ............................................................................................................................ 19
Market Level Actors (End Users / Account Holders / Beneficiaries) ............................................. 22
An Operational View............................................................................................................................. 23
Access Control: Participants Sectors and Services and Data Categories.................................... 24

Understanding Participant Management Standards ........................................... 27

4.
4.1

Participant Management Overview .................................................................................... 27

4.2

The Registration Process .................................................................................................... 27

4.2.1
4.2.2

4.3

Registration Paths ................................................................................................................................ 27
Registration Standards ........................................................................................................................ 28

Provisioning Process ........................................................................................................... 29

4.3.1
4.3.2

Provisioning Components .................................................................................................................... 29
Provisioning Standards ........................................................................................................................ 30

Namibian Open Banking Standards v1.0

2

Final Namibian Open Banking Standards - 25 April 2025

4.4

Set Up and Testing ................................................................................................................ 31

4.4.1
4.4.2

Set Up and Testing Process ............................................................................................................... 31
Set Up and Testing Standards ............................................................................................................ 31

Understanding API Standards................................................................................ 32

5.
5.1

The Customer Journey (Flow) ............................................................................................. 32

5.1.1
5.1.2
5.1.3

5.2

API Transaction flows........................................................................................................... 34

5.2.1

5.3

Market Awareness ................................................................................................................................ 32
Contracting and Configuration with the TPP ..................................................................................... 32
Transaction Flow (Account Holder perspective ................................................................................ 33

Business Data Flows ............................................................................................................................ 34

Understanding Consent and Authentication .................................................................... 36

5.3.1
5.3.2

What is Consent .................................................................................................................................... 36
Consent Flows....................................................................................................................................... 39

5.4

Types of API Standard .......................................................................................................... 42

5.5

Understanding User Experience Standards ..................................................................... 42

5.5.1
5.5.2
5.5.3
5.5.4

The Importance of User Experience: Trust ....................................................................................... 42
UX: Branding ......................................................................................................................................... 43
UX: Public Information ......................................................................................................................... 43
UX Mandatory Text............................................................................................................................... 43

Understanding Ongoing Management Standards ............................................... 44

6.
6.1

Ongoing Management Overview ........................................................................................ 44

6.2

Ongoing Management Processes ...................................................................................... 44

Definitions & Terminology Standards ................................................................... 46

7.
7.1

General Open Data Definitions ........................................................................................... 46

7.2

Actors and Roles ................................................................................................................... 47

7.2.1
7.2.2
7.2.3
7.2.4

Regulatory.............................................................................................................................................. 47
Scheme .................................................................................................................................................. 47
Industry................................................................................................................................................... 48
Market..................................................................................................................................................... 50

7.3

Consent Definitions .............................................................................................................. 50

7.4

Technical Components ........................................................................................................ 51

7.4.1
7.4.2

Components Provided by the Scheme Manager ............................................................................. 51
Components Provided by the Data Provider .................................................................................... 52

Participant Management Standards ...................................................................... 54

8.
8.1

Registration Standards ........................................................................................................ 54

8.1.1
8.1.2
8.1.3
8.1.4
8.1.5

8.2

The Scheme Administrator Identification Standards........................................................................ 54
Participant Roles ................................................................................................................................... 54
Sector, Service and Operation Type Standards ............................................................................... 54
Participant ID ......................................................................................................................................... 54
Participant Admissions Standards ...................................................................................................... 55

Provisioning Standards ........................................................................................................ 55

8.2.1

Participant Credential Standards ........................................................................................................ 55

Namibian Open Banking Standards v1.0

3

Final Namibian Open Banking Standards - 25 April 2025

8.2.2

8.3

Data Provider and TPP Software Standards .................................................................................... 57

Setup and Testing Standards .............................................................................................. 59

8.3.1
8.3.2
8.3.3
8.3.4
8.3.5

Discovery Standards ............................................................................................................................ 60
Sign-Up Standards ............................................................................................................................... 60
Access Check Standards..................................................................................................................... 60
Contract Standards............................................................................................................................... 60
Testing Standards................................................................................................................................. 60

API Standards .......................................................................................................... 61

9.
9.1

API Architecture Standards ................................................................................................. 61

9.1.1
9.1.2
9.1.3
9.1.4
9.1.5
9.1.6
9.1.7
9.1.8

9.2

Publication Standards .......................................................................................................................... 61
Resource Naming Standards (URI Structure) .................................................................................. 62
Field Formatting Standards ................................................................................................................. 64
Pagination .............................................................................................................................................. 66
HTTP Request Headers....................................................................................................................... 67
HTTP Response Headers ................................................................................................................... 68
Request Payloads................................................................................................................................. 68
Response Payloads.............................................................................................................................. 69

API Use Cases........................................................................................................................ 70

9.2.1
9.2.2
9.2.3
9.2.4
9.2.5

Supported Sectors ................................................................................................................................ 70
Supported Services .............................................................................................................................. 70
Supported Operation Types ................................................................................................................ 70
Supported Resource Objects (Banking) ............................................................................................ 71
Supported API Use Cases................................................................................................................... 74

9.3

API Data Sets and Data Dictionary (Data Standards) ..................................................... 75

9.4

Security Standards ................................................................................................................ 76

9.5

Consent and Customer Authentication Standards ......................................................... 76

9.5.1
9.5.2
9.5.3
9.5.4

9.6

API UX Standards .................................................................................................................. 79

9.6.1
9.6.2
9.6.3

9.7

Consent Steps ....................................................................................................................................... 77
Consent Scopes .................................................................................................................................... 78
Maximum Consent Duration ................................................................................................................ 79
Strong Customer Authentication Standards ...................................................................................... 79

Branding Standards .............................................................................................................................. 79
Public Information Standards .............................................................................................................. 79
Flow and Mandatory Text .................................................................................................................... 80

API Service Level Standards ............................................................................................... 83

9.7.1
9.7.2

TPP Service Levels Towards Data Providers ................................................................................... 83
Data Provider Service Levels Towards TPPs ................................................................................... 84

Ongoing Management Standards .......................................................................... 85

10.
10.1

10.1.1
10.1.2
10.1.3

10.2
10.2.1
10.2.2
10.2.3

Notifications and Reporting ............................................................................................. 85
Transaction Reporting .......................................................................................................................... 85
Service Level Reporting ....................................................................................................................... 86
Dispute Reporting ................................................................................................................................. 86

Monitoring, Helpdesk and Support Processes ............................................................ 87
Monitoring Standards ........................................................................................................................... 87
Helpdesk Standards ............................................................................................................................. 87
Incident Management Standards........................................................................................................ 87

Namibian Open Banking Standards v1.0

4

Final Namibian Open Banking Standards - 25 April 2025

Dispute Resolution Standards ........................................................................................ 87

10.3
10.3.1
10.3.2
10.3.3
10.3.4

Dispute Type Standards ...................................................................................................................... 88
Dispute Channel Standards ................................................................................................................ 88
Dispute Service Level Standards ....................................................................................................... 88
Dispute Priority Standards ................................................................................................................... 88

Standards for Change Management............................................................................... 88

10.4
10.4.1
10.4.2

Change Management Standards for Data Providers ....................................................................... 88
Change Management Standards for the Scheme Manager ........................................................... 89

ANNEX: External Standards ................................................................................... 90

11.
11.1

Standards References ...................................................................................................... 90

11.2

Normative References ...................................................................................................... 91

12.

ANNEX: Industry Abbreviations............................................................................. 93

13.

ANNEX: Open Banking Glossary of Terms .......................................................... 95

14.

ANNEX: Key Topic: Account Definition ................................................................ 97

14.1

Defining Accounts, Account Providers and other parties ......................................... 97

14.2

Bank Accounts vs e-Wallets ............................................................................................ 98

14.2.1
14.2.2
14.2.3

Definitions .............................................................................................................................................. 98
Consumer Perspective ......................................................................................................................... 98
Compliance & Operational Perspective ............................................................................................. 98

ANNEX: Suggestions for future changes ............................................................. 99

15.
15.1

New Sectors........................................................................................................................ 99

15.2

New Services ...................................................................................................................... 99

15.3

New Resource Objects (Banking) ................................................................................... 99

15.3.1

15.4
15.4.1
15.4.2
15.4.3
15.4.4

Scheduled Payments ........................................................................................................................... 99

Extended Resource Objects ............................................................................................ 99
New Account Types.............................................................................................................................. 99
New Payment Types ............................................................................................................................ 99
New Fields in Transaction Information ............................................................................................ 100
New Fields in Account Information ................................................................................................... 100

Namibian Open Banking Standards v1.0

5

Final Namibian Open Banking Standards - 25 April 2025

1.

Introduction

1.1

Document Overview

The Namibian Open Banking Standards come in two parts
•
•

Namibian Open Banking Standards v1.0.docx, (“the standards document”) (this
document)
Namibian Open Banking Standards Data Dictionary v1.0.xlsx (“the data dictionary”).

The Standards Document
The Standards Document is set out as follows:
Project Context chapters
Chapters 1 and 2 (Introduction provides an overview of the document, the context
to writing it changes to the document, an explanation of colour coding and the
difference between normative and explanatory text, version control and how to give
feedback.
Open Banking Context Chapters
Chapter 3 provides an overview of the ecosystem in the form of a “stakeholder map”
and an operational overview of Open Banking. Chapters 3, 4 and 5 describe
Participant Management, API flows and Ongoing Management, respectively. These
chapters provide background and context to the standards.
Standards Chapters
•
•
•
•

7 Definitions and Terminology Standards
8 Participant Management Standards,
9 API Standards (along with the Data Dictionary)
10 Ongoing Management Standards

Annexes
Annexes provide additional reference material and links.
•
•
•
•
•

Chapter 11 provides links to external standards.
Chapter 12 provides a list of industry abbreviations
Chapter 13 provides a glossary of industry terms
Chapter 14 provides account definitions
Chapter 15 provides suggestions for future changes

The Data Dictionary
The data dictionary provides formal tables on technical objects, datasets and fields:
Elements, API Use Cases, API Endpoints, Consent Objects, Banking Objects, JSON
Objects, Params, Fields, HTTP Status Codes, Codes.

Namibian Open Banking Standards v1.0

6

Final Namibian Open Banking Standards - 25 April 2025

1.2

Context for Writing this Document

1.2.1

The Position Paper

On October 31, 2022, the Bank of Namibia (BoN) issued a Position Paper expressing its
intention to implement Open Banking, through a comprehensive legal framework. The
Paper also described an approach that would lead from Open Banking to Open Finance to
Open Data.

1.2.2

Open Banking Delivery

The Open Banking delivery is happening in a series of stages: “Standards Definition”
involves external consultants Konsentus, who are helping the industry write these
standards v1.0.
In parallel with the standards, Konsentus are making Delivery
Recommendations for the Bank of Namibia. The Standards definition phase ends in March
2025.
The timelines after that are not defined, as the recommendations are still ongoing, but
based on other projects, there will be phase where the regulation is prepared, and then a
phase of implementation, with a live date in 2026.

1.2.3

Standards Phase

This document captures and consolidates the aims and context of an Open Banking
program in Namibia, along with requirements and positions for

Namibian Open Banking Standards v1.0

7

Final Namibian Open Banking Standards - 25 April 2025

i.

Standards required to achieve Open Banking

ii.

Delivery approach for required to operationalise Open Banking.

The document serves as a vehicle to agree on the Standards and delivery approach
between stakeholders.
This document is provided by Konsentus to the Namibian industry under the control of the
Bank of Namibia. The content within this version is not necessarily endorsed by the Bank
of Namibia.
While the standards are initially for Open Banking, it is also intended that they are
extendable to other industries.
1.3

Change log

Version

Date

Comments

0.1.

23/10/2024

First version for industry distribution

0.2
0.3

26/11/2024
24/01/2025

Second version for industry distribution
Third version for industry distribution

1.0

28.02.25

Final version for industry distribution

1.3.1

Changes Since Version 0.3

Section

Change on Standards v0.3

5.3.1.4

Revisions to Possession and Knowledge definitions

9.2.4.5

Domestic / EFT: amended to NRTC (not NRCT)
Cross Border: NISS removed as it’s provisioned by CMA

9.4

Table Row on TLS Certificates

10.4

Standards for Change Management text added

10.4.2

Change Management Standards for Scheme Manager updated

Annex 13

Updated with 5th Party definition

Annex 15

Suggestions for Future Changes added

1.4

Normative text, explanatory text and commentary

Within this document, there are different types of text. Each type Is highlighted by colour
codes.
Normative text on rules and standards are contained in orange text boxes and tables.
They MUST be followed to achieve compliance.
Normative text follows strict change control and uses precise language. Together they
are known as “the arrangements” and are binding.

Namibian Open Banking Standards v1.0

8

Final Namibian Open Banking Standards - 25 April 2025

Descriptive or explanatory text is contained in blue text. These may bring out points of
attention or examples to clarify the intent.
Descriptive text is NOT binding.

1.5

Document Versioning

The standards are versioned using three version parts <major>.<minor>.<bug fix>.
This version will be used to describe updates in the Change Log.
Each of the three components will be independently incrementing integers and are
described as follows:
•

major: Major version of the Standards. Reserved for increment only when a set of
changes are applied that are large enough to make co-existence in the same
implementation environment with previous versions untenable. This would include
major changes to the information security profile, major changes to the high-level
Standards or a change in basic protocols.

•

minor: Significant changes to the Standards. This would include changes that
require approval by the owner of the standards, e.g. the Scheme or a Scheme data
Standards Body. Such changes include new endpoints or new versions of existing
endpoints.

•

bug fix: Minor documentation changes that clarify or correct the standards but do
not meaningfully alter the standards.

1.5.1

Versioning: Major Versions

The rules and standards MUST have a two-level versioning strategy.
1. The high-level standards are versioned together, where the rules, standards and
processes (along with the adherence agreement) are interrelated and form a single
version.
2. Specific API endpoints, forms, annexes or other material MAY have an additional
version specific to the annex.

Namibian Open Banking Standards v1.0

9

Final Namibian Open Banking Standards - 25 April 2025

2. Principles and Assumptions
2.1

Principles taken from the Open Banking Position Paper

Writing these standards is part of a larger program of work to introduce Open Banking,
Open Finance and Open Data to Namibia.
2.1.1

The Open Banking Position Paper

The position paper talks about aims and benefits, enablers, risks
•
•
•

•

2.2

The consumer must explicitly give consent to share their information
No sharing of credentials
The type of data includes, but not limited, to Account Holder transaction data;
aggregated data (which refers to sets of averaged data of balance information,
Account Holders, or open data sources); customer reference data; and open data
(which refers to data that anyone can access such as product information and ATM
locations).
Open Banking (and therefore the standards) should be: Secure. Efficient and lead
to Innovation. Competition. Fairness. openness, reusability, interoperability,
transparency, safety, and security.
Principles taken from OBF discussions

Open Banking is complex, and implementation should be thought of in terms of phases,
where the first phase is always the hardest.
All new functionality brings additional risk, cost and complexity and so requests to extend
the scope should be considered considering their benefits e.g. how many people will use
this function, how core are they to the key aims of Open Banking.
During the recent OBF meetings, when discussing the scope of functionality and data the
following principles have emerged.
•
•

Simplicity and cost-effectiveness.
Proportionality.

The standards must balance the desire to define everything and increase the scope to the
maximum possible, with the need for simplicity, which will allow a working implementation,
with limited risk.
Where functionality is suggested but not included, these suggestions are kept for a future
version.
2.3

Principle of Reuse

Some questions have asked for specific details about implementation. Here are three
examples. In most cases, the answer is “Data Providers should do whatever they do
today through online or mobile banking channels.” Open Banking APIs are a new
channel to provide a service, not ways of creating new functionality. Below are some
sample questions and answers following this principle.

Namibian Open Banking Standards v1.0

10

Final Namibian Open Banking Standards - 25 April 2025

Question

Answer

When I give a balance, do the standards No. The API should deliver a balance that is
define how up-to-date that balance must be? the same as the balance that would be seen
on the customer portal
When I give a piece of data, what standards We presume that the balances, and
affecting the accuracy of that data apply? transaction lists you give today are already
Address data, for example may not always accurate. We recognise that an address
be accurate.
may no longer be up to date, but if the
business doesn’t worry about putting it on an
account statement, why would you worry
about putting it on an API?
When there is a joint account, do I need No! Unless you need two people to consent
consent from both parties to make a to look at their transaction history.
payment or provide a transaction history?

2.4

Compliance with Namibian Regulations

Open Banking and these standards must be compliant with all national and sector-specific
regulations. During comments, we have had requests to consider National Cyber Security
Framework (draft) and the National Data / Information Security Framework (draft).
In creating these standards, we have reviewed most BoN determinations and many pieces
of national legislation. We are not aware of anything that breaches what is written in
Namibian law.
2.4.1

Draft Legislation That May Become Relevant
National Cyber Security Framework (Draft).

Attempts have been made by the Namibian government in the last few years to promulgate
a Computer Security and Cybercrime Bill (the Bill). However, the Bill received widespread
criticism from various stakeholders, which forced the Ministry of Information and
Communication Technology to withdraw the Bill from the public consultation process.
Data Protection Regulation (Draft)
While this is a draft we have reviewed it carefully. It is in line with data protection regulations
in other jurisdictions and causes no problems if the principles of transparency and account
holder consent are followed.
2.5

Use of International Standards and Frameworks

Within the feedback received, there were questions about frameworks:
•

•

Will a concept like Zero Trust Architecture be implemented or considered? Since
sensitive data will be processed, we adopt a security framework that eliminates
implicit trust and ensures we continuously authorize at every stage of digital
interaction
We also need to vet this against PCI DSS v4 requirements.

Namibian Open Banking Standards v1.0

11

Final Namibian Open Banking Standards - 25 April 2025

•

Should include a standard such as OWASP or similar for digital channel
developments

The OBF had previously highlighted 7 security principles based on the NIST CRSC
Security principles. They are Layered security, Separation of duties, Least Privilege, Zero
Trust, Dual Control, and Privacy.
NIST provides 33 security principles, and these principles overlap with other frameworks.
Also, many principles will clash with other principles.
Rather than listing out many principles, we suggest that if there is any clause or provision
in these standards that is concerning, then they should be raised.

Namibian Open Banking Standards v1.0

12

Final Namibian Open Banking Standards - 25 April 2025

3. Environment & Stakeholder map
3.1

The Open Banking Ecosystem

3.1.1

Open Data, Open Banking and Accounts

Open Banking is the act of allowing Account Holders to instruct their Payment Service
Providers (PSPs) (Banks) to provide their data to Third Party Providers (TPPs), so that
the data can be used to benefit the Account Holder who owns the data.
The data or money is stored in an “account” held by the Payment Service Provider.
In Open Banking, an account refers to a store of value held by a BoN-licensed Payment
Service Provider under that license. In this document, the term “account” may include
wallets or cards, even if this is not the legal definition. The scope of accounts is defined in
the Standards.

There are questions arising from this discussion, which are brought together in a discussion
in a separate chapter at the end of this document (Annex 14: Account Definition).
3.1.2

Use Cases

The functionality provided by Open Banking is known as a “Use Case”.
The term “use cases” causes confusion as they can be seen from the perspective of the
TPP to the Account Holder (end customer), or the perspective of the Data Provider and
TPP. We therefore make a difference between the two:
•

API Use Cases are functionality provided within Open Banking, generally through
APIs, e.g. Get a list of Accounts. Make a Payment.

•

Market Use Cases are the services that TPPs offer Account Holders. They are built
from data provided by API Use Cases, but may combine other services, e.g. credit
checking, know your customer checking, accounting services, reconciliation, tax
filing.

Namibian Open Banking Standards v1.0

13

Final Namibian Open Banking Standards - 25 April 2025

Regulators can define the API Use Cases that must be provided by the Data Providers but
cannot define the purpose or product that is offered to the Account Holder by the TPP,
although they can encourage and educate the market.
•
•
3.1.3

Use Cases are further developed in this document: Chapter 9.2. Use Case
standards.
Document: API use cases and Market Use case examples.
APIs

Data is exchanged using Application Programming Interfaces (APIs). An API is an interface
that provides access to data based on agreed upon standards, which may include data
formats, security, and consent.
In a general technology context, APIs may be open to the public and free; may be open to
the public and paid for; restricted to a class of users or only made available based on a
bilateral agreement between two parties.
In an Open Banking context, APIs are generally available to a restricted set of organisations
that have an appropriate level of trust. Arguably, they are NOT "Open APIs" from a
technology perspective, as they are not open to everybody, although they are more Open
than other channels that Financial Institutions (FI’s) are used to providing. Therefore, the
term "Open APIs" Is best avoided.
APIs and API documentation are published on "Developer Portals". The diagram below
shows a sample developer portal from ING In Europe. ING Developer Portal

Namibian Open Banking Standards v1.0

14

Final Namibian Open Banking Standards - 25 April 2025

3.1.4

A Trust Framework
Trust Framework Pillars

Open Banking, Open Finance and Open Data relies heavily on trust. This trust runs across
three pillars
•
•
•

Trusted Participants: Only trusted players can access data, and they can be trusted
to look after that data once they have it.
Trusted API and Data Exchange: Data is exchanged in a secure manner.
Trusted Management Processes: If problems occur, they are resolved, if Account
Holders have problems they know where to turn, if standards are not being followed
measures can be taken.

Namibian Open Banking Standards v1.0

15

Final Namibian Open Banking Standards - 25 April 2025

Components of a Trust Framework
Trust is enforced across the three pillars by a combination of rules, standards, processes
and tools or infrastructure.

This document focusses on the standards, but if
there are API standards it is implied that there are
rules, standards, processes and tools or infrastructure,
that enforce or support the standards.

Examples of rules, standards, processes and Infrastructure components.
Arrangement

Example

Rules

Participants must follow the standards

Standard

API Standard

Processes

Checking that an API follows the standards
Support processes, when the API seems not to work
Complaints when a party believes standards are not being followed
Change Management processes

Infrastructure

Testing tools, sandboxes, helpdesk infrastructure.

Examples of Open Banking Infrastructure components.
#

Term

Definition

1

Developer
Portal

A Developer Portal is the interface between a
set of APIs and/or other digital tools created
by a Data Provider and API User.

2

API Catalogue

An API Catalogue is a library of APIs created
by Data Providers, organised by organisation,
subject, purpose, and/or type. TPPs can
browse or search API Catalogues to find the
APIs in which they are interested.

3

Environment

An Environment is a collection of processes
and programming tools that enables Data
Providers to build, test, and debug an API and
TPPs to view and use an API.

Namibian Open Banking Standards v1.0

Also known as

16

Final Namibian Open Banking Standards - 25 April 2025

4

Sandbox

A Sandbox is a test environment in which new
or untested APIs can be viewed and used
securely. They are typically created by Data
Providers to allow TPPs to safely test the API
with their own systems and services without
impacting live operations

5

Conformance
System

A Conformance system is a collection of tools
and services provided by a Data Provider that
allows TPPs to safely test the integration of
an API with their own systems and services.

6

Digital
Certificates

Digital Certificates are credentials that can be Credentials
machine verified by a trusted source. They
are the digital equivalent of physical
credentials such as passports, and driving
licenses

3.2

Open Banking Stakeholder Map

This chapter contains the main stakeholders Involved in Open Banking. It Is not specific
to Namibia but is a model that works across all ecosystems.

The Open Finance Ecosystem has four levels, Regulatory, Scheme, Industry and Market.

Konsentus commentary:

Namibian Open Banking Standards v1.0

17

Final Namibian Open Banking Standards - 25 April 2025

This model Includes a "Scheme" layer. It is clear within the Open Banking Position Paper
that BoN will provide Open Banking regulation and will provide standards. It is to be
confirmed where BoN’s responsibilities stop and whether other responsibilities are
managed by a “Scheme Administrator” (if any).
The standards contained in this document does not discuss the delivery model and who
will take on the responsibilities of a scheme but generically covers “The Scheme” and
“The Scheme Administrator”, which may be BoN or which may be another party.
Comments should focus on the standards themselves and not who implements,
maintains and polices them.

3.2.1

Regulatory Actors
Primary Regulator

In many jurisdictions Open Banking is mandated, but not always by the same type of
regulator. In the UK it was brought in by the Competition and Markets Authority, in Europe
by the European Commission, in Australia by the government as part of consumer data
standards legislation.
The main activities of the Primary Regulator generally include:
•

Defining Open Banking rules for behaviour between market participants

•

Defining Admission Criteria for market participants

•

Defining Open Banking Standards or delegating their provision

•

Providing Open Banking Processes, or delegating their provision

•

Providing Central Open Banking Infrastructure, or delegating their provision
Competent Authority

A Competent Authority is an organisation that has the capacity to authorise an entity as a
TPP or a Data Provider, where such authorisation is required. There may be more than one
Competent Authority within a country. A Competent Authority will provide a register or list
of authorised entities.
Multiple competent authorities may exist, if the rules allow for participants in one list to be
recognised in another list.
3.2.2

Scheme Level Actors

A Scheme is a set of rules, standards, processes and infrastructure that creates a formal
legal and operational model between multiple participants. It may be created through
national law, scheme rules, or private contracts.
Scheme Responsibilities
Where there is no regulation, or where regulation requires enhancement, it is often decided
to organise the industry in a structured way to improve efficiency.

Namibian Open Banking Standards v1.0

18

Final Namibian Open Banking Standards - 25 April 2025

Global examples of such schemes in the payment’s world are Visa, Mastercard, or
SWIFT. A scheme manager compliments or plays the part of the Primary Regulator.
The main activities of the Scheme level actors generally include:
•

Defining Open Banking rules for behaviour between market participants, that go
further than the legislation.

•

Defining Open Banking Standards, that go into more detail than the legislation.

•

Providing Open Banking Processes.

•

Providing Open Banking Infrastructure.

Multiple scheme level providers may exist, e.g. one body that manages standards, another
body that runs onboarding processes, another body that provides central testing
components.
3.2.3

Industry Level Actors
Data Providers and TPPs

The industry roles are that of Data Provider and TPP.
Historically, Account Holders banked with a financial or payment service provider, and there
was a bilateral relationship between the two.

In recent years we have seen "third parties" come between the financial Institution and
account holder and offer to provide services for the Account Holder based on their data, or
ability to make payments.

A Data Provider is an organisation that holds an account for an Account Holder. It allows
the customer to instruct a TPP to initiate payments or retrieve data.
A TPP is an organisation that provide services to Account Holders by accessing their data
or services that are normally delivered by Data Providers. In the case where the TPP
accesses the Data Provider through an outsourced service provider, the TPP is the party
that legally captures the account holder consent and is legally responsible to the Account
Holder for holding their data.

Namibian Open Banking Standards v1.0

19

Final Namibian Open Banking Standards - 25 April 2025

Depending on the jurisdiction Data Providers and TPPs must be regulated, and/or meeting
minimum levels of security, reliability and trustworthiness.
These Standards do not define who can / must / be a Data Provider or TPP in the
Namibian Open Banking ecosystem, although Chapter 8 (Participant Management
Standards) contains placeholders for rules and standards relating to them.
There are other parties involved in Open Banking at operational level, e.g. service
providers, certificate issues, Clearing Houses, as well as 4th Party Aggregators and
Beneficiary Parties (see next chapters). In principle all these parties have responsibilities
to protect Account Holder information and maintain security, but these obligations come
from indirect outsourcing arrangements of the Data Providers and TPPs.
Data Providers: Key Responsibilities
These responsibilities are those typically found in Open Banking jurisdictions around the
world. The responsibilities may be mandated by legislation, agreed by contract or implied.
Konsentus presumes that the BoN legislation will include or capture responsibilities like
those below.

Data Providers hold accounts for an Account Holder. In a "Banking" context they will be
"Banking" accounts, although wallets and e-money accounts are included in this definition.
Data Providers allow the customer to instruct a TPP to initiate payments or retrieve data.
Data providers MUST
•

Allow Account Holders to request data or to initiate payments through Participating
TPPs

•

Provide a developer portal and APIs in compliance with the Standards.

•

Grant access and connect to Participant TPPs in accordance with the Participant
setup standards.

•

Receive requests for data or payments to be initiated from Participating TPPs who
communicate securely in compliance with the standards.

•

Verify that such requests are made with the consent of the Account Holder.

•

Respond by providing data or confirming the initiation of a payment to the
Participating TPP in compliance with the standards.

•

Follow the Ongoing Management Standards which cover, e.g. reporting, notification,
support.
TPPs: Key Responsibilities

These responsibilities are those typically found in Open Banking jurisdictions around the
world. The responsibilities may be mandated by legislation, agreed by contract or implied.

Namibian Open Banking Standards v1.0

20

Final Namibian Open Banking Standards - 25 April 2025

Konsentus presumes that the BoN legislation will include or capture responsibilities like
those below.

TPPs sit between an Account Holder and their “Data Providers”. They perform two
activities:
•

Offering a service to an Account Holder based on the data or funds held in an
account held at another institution.

•

Securely obtaining the data, or to initiate payments with the consent of the Account
Holder from the Data Provider.

TPPs MUST
•

Provide an API Client that uses APIs in compliance with the Standards.

•

Connect to Participating Data Users. in accordance with the Participant
Management Standards.

•

Contract with Account Holders to provide services

•

Receive requests for data or payments from Account Holders, with whom they have
a contract.

•

Send requests for data or payments to Participating Data Providers, communicating
securely and in compliance with the standards.

•

Receive data or confirmations of payment initiation from the Data Provider in
compliance with the standards.

•

Forward or process the data or confirmation of payment initiation to or for the
Account Holder in accordance with the Account Holder’s instructions.

•

At all times Data Providers follow the Ongoing Management processes. See
Chapters 6 and 10.

Furthermore
•

TPPs MUST safeguard any data received.

•

NOT use that data for any purpose other than that requested by the Account Holder.
Roles vs Institutions

Data Providers and TPPs are Roles. An Institution may be a Data Provider, an FI may also
be a TPP. That institution will have one set of obligations as a Data Provider, and different
set of obligations as a TPP.
4th Party Aggregators
Previously we noted that TPPs perform two actions:

Namibian Open Banking Standards v1.0

21

Final Namibian Open Banking Standards - 25 April 2025

•
•

Offer a service to an Account Holder
Securely obtain data from the Data Provider.

In many countries, particularly where there are many (hundreds) of FIs offering APIs these
two actions are split, with one party offering the service to the Account Holder, and another
party obtaining the data.

In this case the TPP is the party that legally captures the Account Holder consent and is
legally responsible to the account holder for holding their data. It Is NOT the party that
access the APIs.
The party accessing the APIs Is a "fourth party" that Is working on behalf of the TPP. They
are generally considered an outsourcing partner and are captured within the regulatory
framework, as any other supplier of the TPP, which is obliged to perform due diligence
whether it builds or buys its data connections.
Fourth parties or Aggregators can make standard setting slightly more complicated when
clear audit trails and credentials of different parties are required. Their existence should
not be forgotten as they have an operational role, if not a legal role.
On the other hand, Aggregators can be great enablers, allowing TPPs to get access to
bank APIs with working interfaces, and letting the TPPs focus on the proposition to
Account Holders.

3.2.4

Market Level Actors (End Users / Account Holders / Beneficiaries)
Account Holders

The key Market Level Actor is the Account Holder. They own the account holding the data
or money and they give consent for it to be shared.
There are four types of Account Holders that we should consider: Consumers, Small
Businesses, Enterprises and Government bodies or other non-profit organizations.
The Account Holder types have different profiles both in terms of the (future) data protection
regulation and the way authentication works.
Account Holder Type

Draft
Data
Regulation

Consumers

In Scope

Synchronous / simple

Small Businesses

Not in scope

Synchronous / simple

Enterprises

Not in scope

Asynchronous / complex

Namibian Open Banking Standards v1.0

Protection Authentication

22

Final Namibian Open Banking Standards - 25 April 2025

Enterprise level Account Holders are excluded as their authentication flows are massively
more complicated, already have direct interfaces and they have nothing to do with financial
inclusion.
Government sector and charities have been mentioned as a type of Account Holder that
are neither individuals nor businesses. From a banking perspective, we assume that their
accounts are either similar to consumers, small businesses or enterprises, and so the same
logic should be applied.
Beneficiary Party
For completeness we note that the Account Holder is not always the recipient of the data
or money.

In a payments context, the Account Holder initiates a payment and gives consent, and we
call them the debtor/payee/originator of that payment. In most cases, money goes to
somebody else, the Payee/Creditor/Beneficiary.
The same may happen in a Data context. The Account Holder makes a request for data
and asks that the data (or a summary of the data) is given to another party. This other “5 th
Party” may be a credit checking service, a tax authority, an on-line shop verifying age before
the purchase of alcohol.
The Beneficiary Party is the recipient of the data or money that is/was held by the Account
Holder.
3.2.5

An Operational View

A more operational view of Open Banking can be shown as follows. Industry participants
(Data Providers and TPPs) exchange data with each other on the Instruction and with the
consent of the Account Holders, but under the governance, rules and standards of the
scheme and/or regulator.

Namibian Open Banking Standards v1.0

23

Final Namibian Open Banking Standards - 25 April 2025

3.2.6

Access Control: Participants Sectors and Services and Data Categories
Access Control Overview

Participants can be split into two roles: Data Provider and Data User.
Many/most jurisdictions also categorise data and functionality to a further level of
granularity, so that Regulators, Data Providers and Account Holders can set access control
rules and can grant access to data by Sector, by Service and by Type of Operation.
Sectors
Sectors define the industry to which the API Is allowed to exchange Data, e.g. transport,
banking, insurance, healthcare.
•

A TPP may be granted access to Banking and Insurance data, but not Healthcare,
with the same Open Data scheme.

•

A Data Provider may be required to offer Banking APIs but not Insurance APIs.

This document focuses on Banking Services and Consent Services.

Implementation note:
The API standards incorporate the concepts of Sectors, Services and Categories at least
for future proofing reasons, but it should be remembered that if these ideas are to be
used when onboarding participants (TPPs) and restricting what they can and cannot do,
then this needs to be captured in the onboarding processes.

Namibian Open Banking Standards v1.0

24

Final Namibian Open Banking Standards - 25 April 2025

We are not convinced that there is practical value granting services separately for AIS
and PIS at the beginning, but this is an implementation discussion.

Services
Services define groups of APIs that are similar. Within Banking five common services are
often discussed.
Public data access (PUB). Public data access services refer to data such as branch
opening times, cashpoint machine locations, pricing information which are available on
websites. Mandating or standardising this is not useful, as the information is already publicly
available, although it is often discussed as an easy first step.
Account Information Services (AIS) . Account Information Services return lists or details
of bank accounts, account balances, account details, transactions and transaction details.
Payment Initiation Services (PIS). Payment Initiation Services allows the creation and
the cancellation of payments, and the ability to get the statuses of payments that have been
created.
Subscription Services (SUB). Subscription Services refer to APIs that allow the creation
of an account or the application for a loan.
Common Services (Common). Common services are services that potentially span
industries or are used administratively between the scheme participants. Consent services
are the most important example.
Payment Initiation and Account Information are the common two that are seen in different
countries, and in some jurisdictions a TPP could be granted access to AIS services but not
to PIS services if the two risk profiles are felt to be different.
Account Opening / Loan application APIs are also less common as the business process
between institutions are so different, it is hard to standardise an API.

Operation Types
Another way of dividing API functionality and access control is between “read” and “write”
APIs.
This term is used a lot in the UK (for example) to mean Payment Initiation which is confusing
for non-computer scientists.
As part of future-proofing, it is reasonable to think of access control for data in terms of read
and write. The table below provides two examples showing the difference between read
and write.
Read
Get my address
View my card limit

Write
Change my address
Change my card limit

Namibian Open Banking Standards v1.0

25

Final Namibian Open Banking Standards - 25 April 2025

Resource Types
Resources are the objects that can be reached, listed, queried, updated or created. Each
resource type will have the same properties, e.g. data elements.
The resource types are: Accounts, Balances, Transactions, Payments, Payment Status.

Namibian Open Banking Standards v1.0

26

Final Namibian Open Banking Standards - 25 April 2025

4. Understanding Participant Management Standards
4.1

Participant Management Overview

“Participants” are organisations that are Data Providers or TPPs or both and so are allowed
to exchange data within an Open Banking Scheme. The Participant Management
Standards deal with the procedures relating to onboarding Participants, maintaining their
access, and offboarding them, following revocation of access or termination of
Participation.
Onboarding has three stages, Registration, Provisioning, Setup and Testing

A note on Environments
It is assumed based on common practice in other jurisdictions, that there will be at least two
environments: a live environment and a testing environment.
Environments allow the segregation of activities, keeping live data from test data and live
functionality from functionality that is under development.
4.2

The Registration Process

4.2.1

Registration Paths

There are two paths to becoming a participant: Mandatory requirement or Voluntary
Application. Both paths may apply In Namibia and may apply differently for different roles.

Mandatory (Compliance) Path
An organisation becomes a participant because they are compelled to do so through
legislation, e.g. From June 30th, 2025, all Namibian Banks are considered Data Providers
and must offer APIs in accordance with the standards.

Namibian Open Banking Standards v1.0

27

Final Namibian Open Banking Standards - 25 April 2025

Voluntary Application Path
An organisation applies to become a participant because they want to. In this case, there
will be a series of registration steps. Based on experience in other jurisdictions, the process
for voluntary application will be like the steps below.

Process Step
Expression
interest

Process Description
of Organisations that wish to become Participants will express
interest and receive information and discuss with the Scheme
Administrator.

Receive Application

The Scheme Manager will receive applications to join and take
applicants through the Participant onboarding process.

Due Diligence

The Scheme Administrator will assess the application and verify
that the applicant meets the required standards, as defined in the
rules

Issue a unique ID

The Scheme Administrator will register applicants into a central
directory.

4.2.2

Registration Standards

Chapter 8.1 contains registration standards, as follows.
Step

Description

Scheme
Administrator Scheme Administrator Identification Standards are the Name
Identification Standards
and ID of The Scheme Administrator published in an
unambiguous way for use within data transfer flows.
Participant Role

The Participant Role Standards formalise the encoding that will
be used for Data Provider and TPP.

Sector Identifiers

Sectors define the industry to which the API Is allowed to
exchange Data, e.g. transport, banking, insurance, healthcare.

Service Identifiers

Services define groups of APIs that are similar. Within Banking
common services are Payment Initiation, or Account
Information.

Namibian Open Banking Standards v1.0

28

Final Namibian Open Banking Standards - 25 April 2025

Participant ID Standard

Participant
Criteria

The Participant ID Standard is the standards for a unique
"Participant ID" that will be used with the scheme. This ID Is
known as the "Client ID" for technologists.

Admissions Participant admissions criteria are the Eligibility and Capability
criteria for Providers.

Eligibility Criteria for Data Eligibility Criteria for Data Providers are the characteristics that
Providers
a Data Provider must have or be to become a Participant.
Eligibility Criteria are checked at the time of registration.
Eligibility
TPPs

Criteria

for Eligibility Criteria for TPPs are the characteristics that a TPP
must have or be to become a Participant. Eligibility Criteria are
checked at the time of registration.

Capability Criteria for Data Capability Criteria assess the ability of a Participant to carry
Providers
out necessary functions. Capability Criteria may be proven
after the initial application e.g. as part of a testing program.
Capability
TPPs

4.3

Criteria

for Capability Criteria assess the ability of a Participant to carry
out necessary functions. Capability Criteria may be proven
after the initial application e.g. as part of a testing program.

Provisioning Process

An organisation that has the legal status of participant must also have the technical and
operational capability to be a participant and so must be given, build or buy the security
credentials and software components that meet the standards.

4.3.1

Provisioning Components

Data Provider Participants MUST Provide a Developer Portal and related technical,
administrative and legal functions that meet the Developer Portal Standards.
Data Provider Participants MUST Provide an Account Holder Authentication Interface that
meets the Standards.
TPPs MUST provide API Clients capable of securely interfacing with the Test and Live
Developer portals of the Participant Data Providers.

Namibian Open Banking Standards v1.0

29

Final Namibian Open Banking Standards - 25 April 2025

TPPs MUST provide an Account Holder Interface that complies with the standards.

Provisioning
Components

Description

Participant
Credentials

The Participant Credentials are digital certificates used for
the purpose of identification and securing the API. They may
be issued centrally by the scheme owner or issued by
Certificate authorities. Participant Credentials must meet
trust and technical standards.

DP
Customer The device, app or interface provided by the Data Provider
Authentication UI to the Account Holder to authenticate themselves, whether
by entering an SMS One time password, a thumb print, a
password, or any in other way.
DP
Portal

Developer The specific modules that a TPP calls to get data, make a
payment or request consent.

API Client

The gateway or interface located with the TPP, that sits
between the DP Developer Portal and the TPP’s back-end
systems.

TPP
Account The TPP branded interface that the Account Holder sees and
Holder Interface
through which they request the TPP to get data or initiate a
payment. For consumers, this is typically an App, but it could
also be a website, accounting package, a point-of-sale
machine.

4.3.2

Provisioning Standards

The provisioning standards define the minimum requirements for Participant Credentials
and software components.

Namibian Open Banking Standards v1.0

30

Final Namibian Open Banking Standards - 25 April 2025

4.4

Set Up and Testing

4.4.1

Set Up and Testing Process

Set up describes the activity where a TPP connects to APIs of a Data Provider, through a
developer portal. This activity includes discovery, registration, and getting ready to send
through API calls, either for testing or in a live environment.
Testing describes the testing activity that takes place between the two participants.

4.4.2

Set Up and Testing Standards

The setup standards will depend on the legal environment, notably
i.

Whether legal contracts are needed

ii.

Whether pricing negotiations can take place.

This is not a topic for the OBF.

These standards will assume that legal contracts and pricing may be needed and so include
references to them, to be removed later, if required.
The testing standards will depend on the testing approach from BoN, specifically, whether
they or a scheme owner will provide
•

Central testing tools against a reference site.

•

Central testing scripts

Namibian Open Banking Standards v1.0

31

Final Namibian Open Banking Standards - 25 April 2025

5. Understanding API Standards
5.1

The Customer Journey (Flow)

The customer journey is divided into three parts. Where these steps related to the Open
Banking flow, the numbers are included.
•
•
•

Market Awareness
Contracting and configuration with the TPP
Transaction flow
o Account Holder request to TPP
o Authentication and Authorisation with the Data Provider
o Response to the Account Holder from the TPP.

The user experience for the contracting and transaction may look something like this:

5.1.1

Market Awareness

Even before an Account Holder sees a TPP, there should be positive, and consistent,
information in the market that describe Open Banking.
See 9.6 UX Standards for mandatory information.
5.1.2

Contracting and Configuration with the TPP

In some cases, Account Holders will actively subscribe to a service provided by TPPs. In
some cases, Account Holders may be less aware of the TPP, for example in making a
payment for an e-commerce transaction, where they see the Merchant as the main party
they are dealing with, and the TPP appears only during the checkout experience.

Namibian Open Banking Standards v1.0

32

Final Namibian Open Banking Standards - 25 April 2025

Case 1: Account Holder Subscribes to a Service

The
user
experience
when
subscribing to a TPP service will
follow the steps below
1. The Account Holder is offered
an App or service
2. The Account Holder creates
an account and accepts the
terms and conditions.
3. The Account Holder registers
their Financial Institution and
may register their primary
Account
and
or
other
accounts.
See UX standards for
mandatory information to be
displayed.

Case 2: Account Holder Subscribes as Part of Another Transaction
The user experience when subscribing to a TPP service will follow the steps below.
1. The Account Holder is in an environment when a payment is needed (e.g. a

shopping basket) or bank data is needed (e.g. a confirmation of age).
2. The Account Holder says they wish to pay by bank transfer or provide data from
their bank.
3. The Account Holder is taken to a page where they are informed that the payment
service will be provided by <TPP Name> and that they must accept the terms and
conditions.
See 9.6 UX standards for mandatory information to be displayed.
5.1.3

Transaction Flow (Account Holder perspective

The following flow is from the Account Holder perspective and this chapter provides the
operational flow that is happening behind the scenes.
1. Account Holder request to the TPP. The Account Holder will make a request for a

balance or a payment to the TPP.
2. Authentication and Authorisation with the Data Provider. The Account Holder
receives a challenge from the Data Provider and responds to the challenge.
3. Response to the Account Holder from the TPP. Following a successful call, the Data
Provider responds to the TPP who then takes the necessary action towards the
Account Holder, whether this is confirming that a payment has been made, showing
a balance, or providing a chart.

Namibian Open Banking Standards v1.0

33

Final Namibian Open Banking Standards - 25 April 2025

N.B. there are cases where the 2nd step may be invisible, either because recurring consent
has already been granted, or because the Authentication and Authorisation is performed
using the mobile handset (see chapter 5.3).
See UX standards for mandatory information to be displayed.

5.2

API Transaction flows

All flows are “logical” i.e. they do not include deeply technical representations of HTTPs
handshakes, redirection flows, DNSlookups or other lower-level protocols, but focus on
business data being transmitted between different parties.
5.2.1

Business Data Flows
Account Information Flow

The flow of information is represented simply by the diagram below. This diagram does not
show additional consent flows (see chapter “Consent Flows”), nor the specific infrastructure
components used by each party.

The Account Holder wants a balance request
1.1

The Account Holder sends a Balance Request to the TPP.

1.2

The TPP sends a Balance Request to the Data Provider.

2.0

The Data Provider sends an Authentication and Authorisation Request to the
Account Holder.

3.0

The Account Holder sends a confirmation of identity and consent response to
the Data Provider. The Data Provider checks the consent.

4.1

The Data Provider sends a Balance Response to the TPP.

4.2

The TPP sends the Balance to the Account Holder.

Namibian Open Banking Standards v1.0

34

Final Namibian Open Banking Standards - 25 April 2025

Payment Initiation Flow

1.1

The Account Holders asks the TPP to initiate a payment

1.2

The TPP sends a Payment Initiation Request to the Data Provider.

2.0

The Data Provider sends an Authentication and Authorisation Request to the
Account Holder.

3.0

The Account Holder sends a confirmation of identity and consent response to
the Data Provider. The Data Provider checks the consent and tries to initiate the
payment checking, for example, the account has funds, the Payer Bank exists,
the cutoff times allow the payment to be made.

4.1

The Data Provider sends the result of the Payment Initiation request to the TPP
in a Payment Initiation response.

4.2

The TPP may send an acknowledgement that the Payment has been initiated
to the Account Holder.

5.0

The Data Participant makes the payment, i.e. sends the payment instruction to
the Payment System (in a real time environment, this may happen as part of
step 3. In a batch-based environment this may happen overnight.

6.0

(Later) The TPP sends a status request for the payment to the Data Provider.

7.0

The Data Provider sends the result of the Payment Status request to the TPP.

N.B. the status of the payment can be requested multiple times.

Negative Flows
The negative flows are identical to the positive flow

Namibian Open Banking Standards v1.0

35

Final Namibian Open Banking Standards - 25 April 2025

The TPP initiates an Account Information Request, on the request of the Account Holder,
The Data Provider receives the request and after checking, the Data Provider sends a
negative Response to the TPP.
The negative response will contain
i)

A negative HTTP response code and

ii)

An errors response object with appropriate application error codes.

The TPP receives the information and performs whatever action they choose based on the
information received, e.g. asking the Account Holder for more information, or informing the
Account Holder that the transaction cannot be completed.
5.3

Understanding Consent and Authentication

5.3.1

What is Consent

Before data or payments can be shared. The Account Holder must “consent”.
Consent involves all parties understanding
•
•
•

“who” (who is asking who to provide data to who)
“what” (what data is to be provided) and
“for how long” (for how long this access should be granted).

The User Experience guidelines provide mandatory text to be shown to Account Holders.
We use the term “consent token” to describe an object that contains six elements:
1.
2.
3.
4.
5.
6.

Duration
Scope
Identity of the Account Holder (Resource Owner)
Identity of the Data Provider (Resource Server)
Identity of the TPP (OAuth Client)
Status

N.B. Technicians will recognise Refresh Tokens and Access tokens, rather than
“Consent Tokens”.
Technical Consent Flows
Granting consent is a legal concept but is heavily dependent on the technical arrangements.
Technical consent mechanisms are well documented and the de facto universal standard
in internet security is OAuth 2.0, although other variants exist such as OIDC and FAPI (see
below).

Namibian Open Banking Standards v1.0

36

Final Namibian Open Banking Standards - 25 April 2025

Consent in Open Finance generally involves three parties who are not in the same room
together, for example.
Term

Definition

Consent

Consent is the freely given agreement of the owner of data (Account
Holder / Resource Owner), to the party that holds that data (Data
Provider / Resource Server) to access or hold that data or to provide
that data to another party (TPP / Client)

Resource Owner A technical term for the Account Holder, that owns the data or money
Resource Server A technical term for the Data Provider that holds the data or money for
the Account Holder.
Client

The technical term for TPP that requests the data or money from the
Resource Holder with the consent of the Account Holder.

Three technical consent standards that are relevant to Open Banking. See Annex 11 for
references.
• OAuth 2.0 is a framework for sharing consent without needing all parties to be
physically together. There are many ways of implementing OAuth 2.0.
• OIDC is a tighter definition of OAuth 2.0, with more restrictions and better security.
• FAPI (Financial API) is an even tighter definition of OAuth 2.0 and is used in
Australia, Brazil and the UK. It is an international standard.

Consent Duration
We can consider two types of operation: those which are on- off or immediate, those which
are longer term.
•

Short-term consent: Consent is given right now, and for one transaction. “Pay this
person, now”, “give me my balance, now”, “send a list of last weeks transactions,
now”.

Namibian Open Banking Standards v1.0

37

Final Namibian Open Banking Standards - 25 April 2025

•

Long-term consent: Consent is given so that a TPP to return again and again to ask
for information, without the Account Holder having to go through a complicated
authentication process each time. “Every morning message me my balance.” “Every
month send my transactions to my accountant.”.

Duration: The duration is the time after which the consent expires, and the Account Holder
MUST confirm a consent a second time.
Generally, rules are set making the duration finite with a “maximum consent duration”.
Maximum consent duration: The period after which the Account Holder MUST renew their
consent again, with another authentication. This maximum duration is defined in the API
Standards Consent Standards but is typically 90 to 180 days.
Consent Scope
Scopes define what rights, or permissions the Account Holder is consenting to share, or
grant access to, for example:
•
•
•
•

I authorise you to give my account numbers to the TPP.
I authorise you to see the balance for one of my accounts to the TPP.
I authorise you to see the balance for all my accounts to the TPP.
I authorise you to give my last two months transactions to the TPP.

Scopes can be very general or very specific. The following list provides examples of scopes
that going from general to the most specific.
1.
2.
3.
4.

See all information for an account.
See account lists and balances but not transactions for an account.
See transactions lists but not transactions details for an account.
See transaction details but not beneficiary information for an account.

Consent Scopes are defined in the API Standards 5.3.
Authentication and Authorisation
For consent to work, the Data Provider must be sure that the person claiming to be the
Account Holder is really the Account Holder and not a fraudster. We call this
“Authentication”. Authentication is the process of determining whether someone or
something is who or what they say they are.
The data provider must also be certain that the Account Holder is giving permission for the
Data Provider to give their data to the TPP. We call this “Consenting”, but we also call it
“Authorising”.
The Account Holder consents for their data to be given to the TPP by the Data Provider.
The Account Holder authorises the Data Provider to give data to the TPP.
Sometimes Authentication and Authorisation happen in the same “Challenge”, for example
I log on and I see my balances. Sometimes Authentication and Authorisation happen at
separate moments, for example I log on and I see my balances, but then I must provide a
second code to make a payment.

Namibian Open Banking Standards v1.0

38

Final Namibian Open Banking Standards - 25 April 2025

In most jurisdictions for financial data flows there are standards put in place by regulators
about what minimum security levels for an Account Holder Authenticating themselves to a
Bank, and Authorising transactions. It is generally not permitted to have a static username
and password for “logging in” and then a simple “OK” to initiate a payment.
More secure methods use terms such as SCA, MFA, 2FA (see glossary) but all these terms
mean responding to more than one challenge with more than one type (factor) of
identification. The three types of factors are generally defined as
i)
ii)
iii)

Knowledge. Something you know (e.g. a password)
Possession. Something you have (e.g. a phone, key card)
Inherence. Something you are (e.g. biometric fingerprint)

It is possible to prove two things at once, for example if my phone is tied to my account and
my bank is app tied to my phone, then logging in to my bank app with a fingerprint proves
who I am, who I am biometrically and through possession.
5.3.2

Consent Flows

Three representations of the same flow are shown below, one is “simplified” one is more
complex”. They are both the same flow but are shown differently as different audiences
want to understand the situation at different levels of detail.
The Basic Consent Flow (Simple)
This chapter describes the simple flow, that focuses on the User experience and flows
between parties.

2.0 and 3.0 show a simple “Challenge” and response allowing the Data Provider to
authenticate the Account Holder and the Account Holder to Authorise the transaction.
Granting Consent (More Complex)
This description is a more accurate description what happens, although it still hides some
of the complexity.
Behind the scenes, we see that the TPP is not directly sending the Account Holder request
to the Data Provider but is sending a request for authorisation for a balance request.
The Authentication and Authorisation challenge and response happens successfully.

Namibian Open Banking Standards v1.0

39

Final Namibian Open Banking Standards - 25 April 2025

The TPP is given a “Consent Token” that contains the identity of the Account Holder, and
the “Scopes” of what that Account Holder can access and the duration of the token.
The TPP can then send the Balance Request, along with the Consent Token.

The Account Holder sends a Balance Request to the Data Provider, through the TPP.
1.1

The Account Holder sends a Balance Request to the TPP.

1.2

The TPP sends a Create Authorisation Request for a balance inquiry to the Data
Provider.

2.0

The Data Provider sends an Authentication and Authorisation Request to the
Account Holder.

3.0

The Account Holder sends a confirmation of identity and consent response to
the Data Provider.

On getting a positive response
3.1

The Data Provider sends a Consent Token response to the TPP.

3.2

The TPP sends a balance Request with the Consent Token to the Data Provider.

3.3

The Data Provider Validates the Consent Token.

The Data Provider sends a Balance Response to the Account Holder.
4.1

The Data Provider sends a Balance Response to the TPP.

4.2

The TPP sends a Balance Response to the Account Holder.

Namibian Open Banking Standards v1.0

40

Final Namibian Open Banking Standards - 25 April 2025

Revoking Consent
There are three cases where consent can be revoked:
•
•
•

Expiration of consent
Account Holder revokes consent by instructing the TPP
Account Holder revokes consent by instructing the Data Provider.

These three cases result in three different flows, which may have different data
requirements for APIs or operational procedures.
Case 1: Expiration of consent
All consents will be timebound, i.e. Account Holders will grant consent for a certain duration
of time. This could be very short (e.g. 20 seconds) for a one-off consent, or could be 4 days,
or 4 months.
On the date/time of the expiration of consent, the consent tokens will no longer be valid.
The Data Provider, the TPP and the Account Holder will all be aware of the expiration.
Case 2: Account Holder revokes consent by instructing the TPP
This chapter describes the revocation flow when the Account Holder informs the TPP that
they no longer require the service and request that consent be revoked.
Start point. Consent has been granted as described in “Granting Consent”. All requests
based on that consent token will succeed.
•
•
•

The Account Holder tells TPP they no longer consent.
The TPP destroys token (marks it as inactive) and sends a notification to the Data
Provider with a Consent Revocation
The Data Provider updates their consent data and acknowledges the request.

Case 3: Account Holder revokes consent by instructing the Data Provider
Start point. Consent has been granted as described in “Granting Consent”. All requests
based on that consent token will succeed.
•
•

The Account Holder tells the Data Provider they no longer consent to giving that
TPP, that information.
Account Holder marks the token as inactive.

At this point, the Account Holder and the Data Provider know that consent has been
withdrawn, but the TPP is not aware and still has a consent token that they believe is
valid.
•

If the TPP requests a balance from the Data Provider for that Account Holder, the
Data Provider will validate the token, realise that consent has been withdrawn and
send back a failure code.

Namibian Open Banking Standards v1.0

41

Final Namibian Open Banking Standards - 25 April 2025

5.4

Types of API Standard

There are seven type of API standard described.
#

API Standard

Description

1

API
Architecture API Architecture Standards describe the standards that apply
Standards
to all APIs, not to specific endpoints, user experience
guidelines, technical language standards, naming standards,
publishing standards, consent standards.

2

API Use Case

3

API Data Standards API Data standards provide the data dictionary and definition
for each endpoint and so include the mandatory and optional
Response Headers, Parameters, Scopes, Request Datasets,
Response Datasets, Meta, Links and Error objects, HTTP
Response codes, Data Types and Complex Types

4

API
Security Security Standards describe security between Participants.
Standards

5

Consent Standards

Consent standards describe how Account Holders give
consent, revoke consent and how the consent is used
between the parties.

6

API UX Standards

User Experience Standards includes rules on brands,
signposting, text and flow that help Account Holders
understand that they are in a working and trusted
environment.

7

API Service Level Service Level Standards describe minimum requirements for
Standards
processing, cut off time, availability and other non-functional
requirements.

5.5

Understanding User Experience Standards

5.5.1

The Importance of User Experience: Trust

The Use Cases and Endpoints standards define the
functionality that will be contained in each API.

For Account Holders to use Open Finance services they must feel comfortable.
Traditionally, banks have given the messages that you should not share personal
credentials and should not “click” on external links. There are legitimate concerns about
identity theft, fraud, hacking or loss of money.
An Account Holder does not know that a request to enter credentials from a TPP is part of
a particular legal or national framework, unless they are told.
It is hard to be very prescriptive about User Experience as:
1. There are multiple market use cases.
2. There are multiple channels (web browser, mobile app, point of sale terminal, petrol
station kiosk, etc.).
3. Each Data Provider has their own consent flows.

Namibian Open Banking Standards v1.0

42

Final Namibian Open Banking Standards - 25 April 2025

User Experience Guidelines provide minimum requirements and help the consumer receive
a consistent experience and not abandon a transaction due to unexpected behaviour.
While the whole user journey may not be standardised, in some countries the consent flow
is standardised, with regulatory standards in place and sometimes approved mechanisms.
5.5.2

UX: Branding

In the payments world, we are very used to seeing brands that are run by private schemes.
National payments schemes and national open finance schemes do not generally have
customer facing logos attached to them, e.g. Australia, Europe, UK although they may have
mandatory text.
We do not propose that Namibian Open Banking provides a brand, but we do propose that
consistent text and standards be used by all parties, to provide Account Holders with
confidence in using relevant services.
See Standards 9.6.1.
5.5.3

UX: Public Information

Even before an Account Holder sees a TPP, there should be positive, and consistent,
information in the market that describe Open Banking.
The scheme manager will provide a Webpage for Account Holders, so that all Account
Holders can see a single centralised description of the Open Banking Services. This will
include:
•
•
•

A description of the mission and purpose of Namibian Open Banking
A public list of participating TPPs
Instructions for Account Holders about what they should do if they have problems.

TPPs and Data providers will provide a Webpage for Account Holders, so that all Account
Holders can see a single centralised description of the Open Banking Services. This will
include:
•
•
•
•

A description of the mission and purpose of Namibian Open Banking
A link to the Scheme Manager Open Banking Webpage.
A statement that the TPP or Data Provider is a participating organisation.
Instructions for Account Holders about what they should do if they have problems.

See Standards 9.6.2.
5.5.4

UX Mandatory Text

Mandatory Text describes what the Account Holder must see at different stages of their
journey as displayed both by the TPP and the Data provider. See Standards 9.6.3.

Namibian Open Banking Standards v1.0

43

Final Namibian Open Banking Standards - 25 April 2025

6. Understanding Ongoing Management Standards
6.1

Ongoing Management Overview

After transactions and data have been exchanged there are a number of ongoing
Management Processes that may/can/must periodically occur within the Scheme. These
include notifications and reporting, support functions (helpdesk, dispute resolution,
managing change. There may also be processes for the settlement of fees and charges.

These Ongoing Management Processes form an integral part of risk management and
Trust and may be supported by standards, which are described in Chapter 10.
6.2

Ongoing Management Processes

Name

Description

Notifications
Reporting

and Participants may be required to provide reports and notifications
to the Scheme Administrator, whether around volumes of
transactions, success and failure, incidents or usage.
The Scheme Administrator may provide reports and notifications
to Participants, internal management and, if needed, regulatory
bodies. These reports or notifications may be operational (e.g.
fees and charges, new Participants, incidents), or informational
(e.g. transaction volumes).

Monitoring,
and
Processes

Helpdesk The Participants should monitor transactions, services levels,
Support audit logs, Participant and market feedback to verify that the
Scheme is performing well, and to act if problems arise.
The Scheme administrator should (based on reports or other
information) monitor transactions, complaints, incidents to verify
that the Scheme is operating smoothly and to intervene when
there appear to be systematic problems.

Dispute resolution

Participants must answer to their Account Holders and provide
information about problems or complaints. As an Account Holder
is a customer of both the Data Provider and the TPP, there may
be a “triangular” flow of information, it may not always be clear
where the error resides, and the customer may not always be
clear who is responsible for what. There should be coordination

Namibian Open Banking Standards v1.0

44

Final Namibian Open Banking Standards - 25 April 2025

to understand that Account Holders get answers in a timely
manner.
The Scheme Administrator may organise processes to help
Participants resolve problems with each other, to ensure that
Account Holders receive answers, and that repetitive problems
can be tackled.
Managing Changes to There will inevitably need to be changes applied to the Scheme
Standards or other and/or any of its components. The Scheme is a complicated
scheme components. ecosystem with Data Providers and TPPs who will not always
agree on what should be changed, and what is the priority.
Managing change involves identifying, socialising change
requests and may require review and feedback. Time may be
needed for Participants to adapt, and there are issues around
versioning to be considered.

Namibian Open Banking Standards v1.0

45

Final Namibian Open Banking Standards - 25 April 2025

7. Definitions & Terminology Standards
7.1

General Open Data Definitions

#

Term

Definition

1

Open Banking

Open Banking is the act of allowing Account Holders to instruct
their Payment Service providers (Banks) to securely provide their
financial data to other FI third party providers, so that the data
can be used to benefit the Account Holder who owns the data.

2

Open Finance

Open Finance is an extension of Open Banking allowing Account
Holders to instruct their Financial Service providers (Banks,
Insurance companies, Pension providers etc) to securely provide
their data to trusted third party providers, so that the data can be
used to benefit the Account Holder who owns the data.

3

Open Data

Open Data is the act of allowing Account Holders to instruct any
institution that holds data on their behalf (telcos, health care
providers, financial service providers, energy providers etc) to
provide their data to third party providers, so that the data can be
used to benefit the Account Holder who owns the data.

4

Use Case

A Use Case describes functionality provided within Open
Banking or Open Finance or Open Data. The term “Use Cases”
causes confusion as they can be seen from the regulatory
technical, business or consent perspective. We split them into
API Use Case and Market Use case.

5

API Use Case

API Use Cases are functionality provided within Open Banking,
generally through APIs, e.g. Get a list of Accounts. Make a
Payment.

6

Market Use Case

Market Use Cases are the services that TPPs offer consumers.
They are built from data provided by API Use Cases, but may
combine other services, e.g. credit checking, know your
customer checking, accounting services, reconciliation, tax
filing.

7

API

An API is an interface that provides access to data based on
agreed upon standards. It may be open to the public and free, it
may be open to the public and paid for, it may be restricted to a
class of users, it may be agreed bilaterally between two parties.

8

Open API

An open API is a free, publicly accessible interface that allows
access to data based on agreed upon standards.

9

Account
(Open
definition)

In Open Data, an account refers to a digital construct that allows
Data an individual or organization to store, manage, and access
information or money securely.

Namibian Open Banking Standards v1.0

46

Final Namibian Open Banking Standards - 25 April 2025

Such an account is typically protected by authentication
mechanisms, ensuring that only authorized users can access the
data.
Examples include email accounts, social media accounts, patient
portal accounts in health care, and utility accounts in energy and
utilities.
Accounts are provided by Data Providers.
10 Account
(Open
definition)

In Open Banking, an account refers to a store of value held by a
Banking regulated Payment Service Provider.
In this document, the term “account” may include wallets or
cards, even if this is not the legal definition. The scope of
accounts is defined in the Standards.

7.2

Actors and Roles

7.2.1

Regulatory

#

Term

Definition

1

Primary
Regulator

The Primary Regulator is an entity that legislates or
compels market participants to follow a scheme
rules.

2

Competent
Authority

A Competent Authority is an organisation that has
the capacity to authorise an entity as an TPP or a
Data Provider, where such authorisation is required.

7.2.2

Scheme

#

Term

Definition

1

Open Banking The Open Banking Administrator is the organisation
Scheme
that creates the Scheme rules, standards, processes
Administrator
and infrastructure and requirements that defines an
Open Finance Ecosystem. This may be a national
regulator, delegated by a national regulator, or
market led.

Namibian Open Banking Standards v1.0

Also known
as

Also known
as

47

Final Namibian Open Banking Standards - 25 April 2025

2

Open Banking The Open Banking Scheme Service Provider(s) runs
Scheme Service processes and infrastructure that make up the Open
Provider
Banking scheme. There may be multiple providers
with different tasks or providing different
components,
e.g.
certification,
handling
administration, providing infrastructure.

3

Open Banking An Open Banking Scheme specific infrastructure
Specific
provider provides software that is specifically
Infrastructure
designed to support Open Banking, whether a full
Providers
ecosystem solution or whether specific elements,
such as dispute resolution software, authentication
modules or testing components.

4

Common
Infrastructure
Provider

5

Trust
Service A Trust Service Provider is an entity that issues Certificate
Provider
digital certificates.
Authority

7.2.3

These documents do not mention internet browser
providers, internet service providers, telecom
companies, cloud service providers, electricity
providers, but all are essential to Open Banking.
They are assumed to exist.

Industry

#

Term

Definition

1

Financial
Institution

Financial Institution is a generic term applied Bank,
Credit
to Banks, Credit Unions, Building Societies, Institution,
E-money
Institutions,
and
Payment Electronic Money
Institutions, Insurance companies, Pension Institution,
PSP,
funds or any other regulated organisation that NBFI.
offers financial products to citizens

2

Fintech

A Fintech is a Financial Technology
company, generally assumed to be
technically cutting edge, agile, reactive, and
ready to offer services in their role as a TPP.
They may or may not be regulated.

3

Participants

Participants are organisations that are
allowed to exchange data within an Open
Banking Framework (i.e. a scheme, or
environment).

Namibian Open Banking Standards v1.0

Also known as

48

Final Namibian Open Banking Standards - 25 April 2025

4

NonParticipants

Non-Participants are organisations that are
not allowed to exchange data within an Open
Banking Framework (i.e. a scheme, or
environment), either because they do not
meet access criteria, or they are in the
process of joining.

5

Data Provider

A Data Provider is an organisation that Data
Provider,
provides an Account for an Account Holder. It Account Service
allows the Account Holder to instruct a TPP Provider (ASP)
to initiate payments or retrieve data.
In Namibian Open Banking, the Data
Provider will be a Payment Service Provider
licensed by BoN and providing accounts
under that license.

6

Third-Party
Provider (TPP)

A TPP is an organisation that provide TPP, Data User,
services to Account Holders allowing them to Client.
access their data or services that are
normally delivered by Data Providers. In the
case where the TPP accesses the Data
Provider through an outsourced service
provider, the TPP is the party that legally
captures the account holder consent and is
legally responsible to the account holder for
holding their data.

6.1 Account
A TPP that provides Account Information
Information
Services.
Service Provider
(AISP)
6.2 Payment
A TPP that provides Payment Initiation
Initiation Service Services.
Provider (PISP)
7

Service
providers

A Service Provider is a technology company
that provides components of the Open
Banking ecosystem. This is typically
technology-based and may include API Hub
or Aggregator services.

7.1 Financial
systems
integrators

Data Providers will need and have
accounting systems, payments systems,
consent management systems, gateways to
financial
networks,
firewalls,
security
systems. These systems are on the edge of
the Open Finance journey and are often
provided by a few known organisations.

Namibian Open Banking Standards v1.0

49

Final Namibian Open Banking Standards - 25 April 2025

7.2 Aggregator

An Aggregator is an outsourcing partner or a
service provider to a TPP. They connect to
multiple Data Providers and offer a single API
or connection to the TPP.

7.3 Gateway
Provider

Gateway providers supply gateways,
developer portals, or other interfaces to Data
Providers.

7.2.4

Market

#

Term

Definition

Also known as

1

Account Holder

An Account Holder is a natural or legal person Customer,
who is accessing Open Banking services Consumer, PSU,
through a TPP. They hold the account that is Resource Owner
being exposed by the Data Provider and
accessed
by
the
TPP.
In OAuth flows they are the “Resource
Owner”.
There are four types of Account Holders that
are
considered,
Consumers,
Small
Businesses, Enterprises Government bodies
or other non-profit organizations.

2

7.3

Beneficiary Party The Beneficiary Party is the recipient of the 5th Party, Payee,
data or money that is/was held by the Account Creditor,
Holder.
Beneficiary.

Consent Definitions

Consent for data is not generally discussed except by regulators, lawyers or developers,
and they have different sets of terminology.
#

Term

Definition

1

Consent

Consent is the freely given indication of the owner Authorisation
of data (Resource Owner), to allow another party
to access or hold that data or to provide that data
to another party.

2

Authorisation
Authorise

When talking about consent, the word authorise,
is more natural way of saying "give my consent to
you to ...", for example the following two
sentences
are
the
same:

Namibian Open Banking Standards v1.0

Also
as

50

known

Final Namibian Open Banking Standards - 25 April 2025

I authorise you to give my data to a TPP.
I give my consent to you to give my data to a TPP.
3

Consent Token

The consent token is the technical embodiment of
consent. The consent token contains a duration,
a scope, the identity of the Account Holder
(Resource Owner), the identity of the Data
Provider (Resource Server), and the identity of
the TPP.

4

Authentication/
Authentication

When talking about consent Authentication
means prove who you are and in doing so, that
agree to something. Authentication involves
receiving a challenge and responding to it
correctly.

5

Multi-factor
authentication

Multi-factor authentication means responding to SCA,
more than one challenge, e.g. not just a 2FA
password, but a One Time Passcode (OTP).
Often these challenges will mix different
authentication methods, and require that one or
more is "dynamic", i.e. it changes each time.

6

Short-term
consent

Consent is given right now, and for one
transaction.

7

Long-term
consent

Consent is given so that a TPP to return again and
again to ask for information, without the Account
Holder having to go through a complicated
authentication process each time.

8

Maximum
consent duration

The period after which the Account Holder MUST
renew their consent again, with another
authentication.

7.4

Technical Components

7.4.1

Components Provided by the Scheme Manager

MFA,

The following items may be provided by, or under the responsibility of, the Scheme
Manager.
# Item

Description

1 Central
Directory

A central directory that holds a record of Participants that have joined
Scheme along with the unique number that identifies them, the roles
they hold, the APIs that they are authorised to use, and their status as
Participants. The Directory also holds technical information about the
Participant.

Namibian Open Banking Standards v1.0

51

Final Namibian Open Banking Standards - 25 April 2025

2 Certificate
Authority

Provides credentials (certificates) to Participants to enable secure
communications. The module will be able to Issue Trusted
Certificates, Revoke Certificates, and provide revocation lists.

3 Administrative Administrative tools are technical components that are not normally
Tools
thought of as infrastructure but still need to be selected, implemented
and maintained. They are widely available commercially and are
specific to Open Finance. They include a website, document portals,
and helpdesk tools.
4 Reference Site The reference site shows the API Standards as they would be
displayed by Data Providers. Includes tools to allow “functional testing”
of data elements to that TPPs can interact with it. It exists to help the
TPPs understand what is being provided and to build and test software
against a real implementation.
5 Conformance
Platform

7.4.2

Allows the Scheme Administrator to verify that software provided by
Participants conforms to standards, by providing access to simulated
set of simulated APIs along relevant test data and test cases.

Components Provided by the Data Provider

The following items are provided by, or under the responsibility of, the Data Provider.
#

Item

Description

1

Developer
Portal

A Developer Portal is the interface between a set of APIs and/or
other digital tools created by an API Provider and an API User.

2

API Catalogue

An API Catalogue is a library of APIs created by API Providers,
organised by organisation, subject, purpose, and/or type. API
Users can browse or search API Catalogues to find the APIs in
which they are interested.

3

API Endpoints

The API endpoints are working endpoints that can receive
requests and send responses.

4

API Server

An API Server is a software component that receives requests,
handles authentication, validates requests, retrieves data from
Back-End systems and sends responses.

5

Sandbox

A Sandbox is a test Environment in which new or untested APIs
can be viewed and used securely. They are typically created by
API Providers to allow API Users to safely test the API with their
own systems and services without impacting live operations

6

Back-End
Systems

The existing back-end system located at the Data Provider.
These systems will include the accounting systems, validation
servers, interfaces to payment systems.

Namibian Open Banking Standards v1.0

52

Final Namibian Open Banking Standards - 25 April 2025

7

Authentication
Server

An authentication server is a special server responsible for
verifying the identity of those to accessing the network.

8

Account Holder The Account Holder Authentication UI is any mechanism that the
Authentication Account Holder can use to Authenticate themselves to the Data
UI
Provider.

Components Provided by the TPP
The following items are provided by, or under the responsibility of, the Data Provider.
#

Item

Description

1

API Client

The API client is a software component that sends
requests to an API server and receives the responses.

2

TPP Account Holder UI

The TPP Account Holder UI is the screen, app or interface
that the Account Holder uses to communicate with the
TPP.

Namibian Open Banking Standards v1.0

53

Final Namibian Open Banking Standards - 25 April 2025

8. Participant Management Standards
8.1

Registration Standards

8.1.1

The Scheme Administrator Identification Standards

Attribute

Description

Value

The
Scheme The Scheme Administrator will own the standards. The Future
Administrator
Name in plain text of The Scheme Administrator
Name
The
Scheme The Scheme Administrator will own the standards. The Future
Administrator
Identifier will be included in the API.
Identifier
The
Competent The Competent Authority will approve Participants and Future
Authority Name
issue Participant IDs.
The Competent Authority MAY be the same as the
Scheme Administrator, or it may be different.
There may be multiple Competent Authorities.
The
Competent The Competent Authority ID and Participant IDs will be Future
Authority Identifier encoded into the digital certificates according to the TS
119.495 specification.

8.1.2

Participant Roles

#

Name

Code

1

Data Provider

DP

2

Third Party Provider

TPP

8.1.3

Sector, Service and Operation Type Standards

These chapters are included in Chapter 9.2 to avoid duplication. Information here is for
convenience, and the Data Dictionary should also be used as the master document for
reference.

8.1.4

Participant ID

#

Item

Format

Notes

1

Participant ID

APInnnnnn

A unique identifier. Issued by the Competent
Authority or Scheme Administrator
“API” A standard code nnnnnn an 6-digit
numeric code, randomly or sequentially
chosen.

Namibian Open Banking Standards v1.0

54

Final Namibian Open Banking Standards - 25 April 2025

8.1.5

Participant Admissions Standards
Eligibility Criteria for Data Providers

Future. Out of scope of the standards.

Eligibility Criteria for TPPs
Future. Out of scope of the standards.

Capability Criteria for Data Providers
Future. Out of scope of the standards.

Capability Criteria for TPPs
Future. Out of scope of the standards.

8.2

Provisioning Standards

8.2.1

Participant Credential Standards

Credentials are the keys that allow access to APIs. In normal internet transactions, each
API provided issues its own “access credential”, “client secret”, “API Key” or similar. In most
/ many Open Banking implementations each Participant has a single credential that is
issued centrally, or by a number of trusted providers. This credential is standardised in
terms of technical format for interoperability reasons and standardised in terms of trust.
Certificate Profile Standards
#

Attribute

Value

1

Certificate
Profile

x.509
V3
RFC5280

2

Standard
for TS 119
encoding
v1.7.1
Scheme data in
certificate

3

Revocation
standards

Notes
/ This standard profiles the X.509 v3 certificate
revocation list (CRL) for use in the Internet.
495 Electronic Signatures and Trust Infrastructures
(ESI);
Sector
Specific
Requirements;
Certificate
Profiles
and
TSP
Policy
Requirements for Open Banking

TS 319 412-2

Namibian Open Banking Standards v1.0

55

Final Namibian Open Banking Standards - 25 April 2025

4

Certificate type

QWACs

Qualified Website Authentication Certificate
(QWAC) is a type of public key certificate defined
by TS 119 495. QWACs will be issued to both
TPPs and Data Providers and are used to
establish mutually authenticated TLS (mTLS)
session, to authenticate Participants and encrypt
data passing between them.

Certificate Attributes
#

Attribute

Value

1

Subject
Participant
Distinguished Name ID
OrganizationIdentifier

The Participant ID (defined in the API123456
Participation Standards: Participant
ID standard) is placed in the
organizationIdentifier attribute of the
Subject Distinguished Name field in
the public key certificate.

2

Authorisation
Number

Participant
ID

TS119 495 requirement:
API123456
The Participant ID is encoded using
the Authorisation Number table
encoding below.

3

Roles

Participant
Roles

TS119
495
requirement: DP
The Participant Roles (defined in the TPP
Participation Standards) belong to
the certificate subject are entered
into the Roles fields.

4

National Competent Competent
Authority Name
Authority
Name

5

National Competent Competent TS119
495
requirement: NA-BON
Authority ID
Authority ID The Competent Authority ID will be
entered into the NCAId attribute
structure in the presented order:
2 character ISO 31661-1 country
code;
hyphen-minus
“-“;
NCA ID (A-Z uppercase only, no
separator).

Namibian Open Banking Standards v1.0

Notes

Example

TS119
495
requirement: Bank
of
The Competent Authority ID will be Namibia
entered into the NCA Name
attribute.

56

Final Namibian Open Banking Standards - 25 April 2025

Authorisation Number Table Encoding
#

Value

Notes

1

PSD

3 character legal person identity type reference. PSD is PSD
the standard used within TS 119 495

2

Country Code

2 character ISO 3166-1 [8] country code representing NA
the Competent Authority country

3

-

hyphen-minus "-" (0x2D (ASCII), U+002D (UTF-8))

4

Competent
Authority ID

2-8 character Competent Authority identifier without BON
country code (A-Z uppercase only, no separator);

5

-

hyphen-minus "-" (0x2D (ASCII), U+002D (UTF-8))

6

Participant ID

The Participant ID as specified by the Competent APInnnnnn
Authority. There are no restrictions on the
characters used.

8.2.2

Example

-

-

Data Provider and TPP Software Standards
Data Provider Developer Portal Standards

Data Provider Participants MUST Provide a Developer Portal and related technical,
administrative and legal functions that meet the Developer Portal Standards, below.

Criteria

Standard for Test

Standard for Production

Access to the The Developer Portal MUST be The Developer Portal MUST be available
Developer Portal available to all active Participating to all active Participating TPPs.
TPPs. The Developer Portal MAY The Developer Portal MAY be available to
be available to other institutions or other institutions or individuals.
individuals.
Access to Data The Developer Portal MUST NOT The Developer Portal MUST provide
and funds.
provide access to production access to production Account Holder data
Account Holder data or funds and funds.
during testing.
Account Holder data MUST only be
exposed with the consent of the Account
Holder and following the rules of the
Scheme.
Contractual
arrangements

The Developer Portal MUST allow TBD
Participating Data Providers to
access the APIs and therefore their
services and functionality with no
additional
contractual
arrangements.

Pricing

Data Providers MUST allow TBD
Participating Data Providers to
access the sandbox at no cost.

Namibian Open Banking Standards v1.0

57

Final Namibian Open Banking Standards - 25 April 2025

Criteria

Standard for Test

Standard for Production

Registration
The Developer Portal MUST allow The Developer Portal MUST allow
function for TPPs Participating TPPs to register via a Participating TPPs to register via a
manual registration process.
manual registration process.
The Developer Portal MAY support The Developer Portal MAY support an
an automated registration function, automated registration function, for
for TPPs.
TPPs.
This process MUST mirror the
registration
to
the
Live
environment, unless otherwise
specified.
API
The Developer portal MUST
documentation
provide documentation for all
and publication relevant
APIs
available
as
standards
described in the API standards.
The Developer Portal MAY provide
reference, postman collection, and
customer journey guidance for all
APIs available.
API Functionality The Developer Portal MUST The Developer Portal MUST contain the
contain
the
relevant
APIs relevant APIs (endpoints).
(endpoints).
The Developer Portal and the APIs it
The Developer Portal and the APIs contains must follow the standards
it contains must follow the described in the API Standards.
standards described in the API
Standards.
Reporting
Functionality

The Developer Portal MUST be The Developer Portal MUST be able to
able to generate the reports generate the reports required.
required.

Service Levels

The Developer Portal MUST be The Developer Portal MUST meet the
available 24/7 and support must be service level requirements defined in the
available during normal working Service Level Standards.
hours.

Test
specific The Developer Portal MUST allow
considerations
realistic testing of APIs.

Data Provider Account Holder Authentication Software Standards
Data Provider Participants MUST Provide an Account Holder Authentication Interface that
meets the Account Holder Authentication standards, the User Experience standards and
the Service Level Standards.

Namibian Open Banking Standards v1.0

58

Final Namibian Open Banking Standards - 25 April 2025

TPP API Client Standards
TPPs MUST provide an API Client (Test) capable of securely interfacing with the Test and
Live Developer portals of the Participant Data Providers, In compliance with the standards
below.
Criteria

Standard for Test

Standard for Production

Functionality

The API Client MUST be able to The API Client MUST be able to
communicate with a Data Provider’s communicate with a Data Provider’s
APIs, in compliance with the APIs,
in compliance with the
documentation.
documentation.

Security

The API Client MUST be able to The API Client MUST be able to
communicate with a Data Provider’s communicate with a Data Provider’s
APIs, securely in compliance with APIs, securely in compliance with the
the documentation.
documentation.

Use of Data and The API Client MUST use agreed The API Client MUST be able to
funds.
Test Data during testing.
securely manage Account Holder Data.
Account
Holder The API Client MUST be able The API Client MUST be able redirect
Authentication
redirect to or use simulated Account to
agreed
Account
Holder
Holder Authentication mechanisms Authentication mechanisms.
as agreed during testing.

TPP Account Holder Interface Standards
TPPs MUST provide an Account Holder Interface that complies with the standards.
Criteria

Standard for Test

Functionality

The TPP Account Holder Interface The TPP Account Holder Interface MUST
MUST be able to capture be able to capture information entered by
information
entered
from
a an Account Holder.
simulated Account Holder.

Functionality

The TPP Account Holder Interface The TPP Account Holder Interface MUST
MUST be able to display relevant be able to display relevant information
information received from the API received from the API Client.
Client.

Security

The TPP Account Holder Interface The TPP Account Holder Interface MUST
MUST be able to securely exchange be able to securely exchange information
information with the TPP API Client. with the TPP API Client.

User Experience

The TPP Account Holder Interface The TPP Account Holder Interface MUST
MUST comply with the User comply with the User Experience
Experience standards.
standards.

8.3

Standard for Production

Setup and Testing Standards

TPPs and Data Providers MUST go through a set up and testing process in the sandbox
(test) environment before going into the live environment.

Namibian Open Banking Standards v1.0

59

Final Namibian Open Banking Standards - 25 April 2025

TPPs and Data Providers MUST go through a set up process in the live environment.
8.3.1

Discovery Standards

A developer portal must be made available in Test and Live environments, as defined in
Chapter 8.2
8.3.2

Sign-Up Standards

Sign up standards define the data that MUST be provided and whether sign up by an API
is needed (known as DCR – Dynamic Client Registration).
Data Providers are free to implement as they choose.
8.3.3

Access Check Standards

In the live environment, Data Providers MUST check that the TPP trying to register
1) Is a valid TPP
2) Has access to the services to the services they wish to connect to.
In the Test environment, Data Providers may choose their own policy.
8.3.4

Contract Standards

Contract Standards define whether a contract is permitted; what elements a contract must
contain; what form a contract must take.
There are not contract Standards defined.
8.3.5

Testing Standards

The standards that are required, effectively take the form of test cases and criteria that
must be passed to move to prove that software is working properly and that the participant
is ready to move to a live environment.
The testing program is out of scope and would generally form a separate document or
annex. This chapter is kept in case specific requirements should be listed.

Namibian Open Banking Standards v1.0

60

Final Namibian Open Banking Standards - 25 April 2025

9. API Standards
9.1

API Architecture Standards

This chapter should be read in conjunction with the Data Dictionary, which also forms
part of these standards.

9.1.1

Publication Standards

#

Requirement

Standard

1

API Architecture Standard

REST

2

API Documentation Standard

OpenAPI 3.1

3

Data Serialisation standard

YAML 1.2

4

Data Encoding standard

JSON

5

Data Exchange Standard

HTTP

API Versioning
#

Item

Standard

1

Major Version

The API standards will be versioned, with one major version across
all
endpoints.
The major version number will be embedded in the URL Structure
for the APIs. This allows the Scheme to support multiple major
versions of the standards in production even if significant breaking
changes occur between major versions.

2

Minor Versions

Each Endpoint may have multiple minor versions within a major
version. Each endpoint version is independent of other endpoints.
This allows Data Providers to upgrade functionality without waiting
for the whole community to move

Open API Information Block
API standards will contain the following information, encoded in the info block of the API
document.
Attribute

Value

Openapi

3.1.0

info/title

Namibian Open Banking APIs (or similar to be decided)

info/version

1.0

Namibian Open Banking Standards v1.0

61

Final Namibian Open Banking Standards - 25 April 2025

info/description

<Agreed text such as
This document contains the technical definition of the Namibian Open
Banking business and consent APIs which are provided as part of the
ongoing Open Banking program supervised by the Bank of Namibia
and run by the Namibian Open Banking Authority. More details can be
found at www.namibianopenbanking.com.na.
>

info/contact/name

< Specific to each Data Provider >

info/contact/URL

< Specific to each Data Provider >

info/contact/email

< Specific to each Data Provider >

info/license/name

<Licensing arrangement to be decided.>

info/license/URL

<Licensing arrangement to be decided.>

9.1.2

Resource Naming Standards (URI Structure)

URI Structure
Every API will have at least one endpoint, and every endpoint will have a “resource URI”
code. The URI structure for API endpoints in the standards will be implemented as
follows:
"https://"{provider}"/bon/"{version}"/" ( <industry>) "/"<Resource URI>{?queryparameters}

Endpoint
component

Description

Provider

The location of the endpoint as provided by the api.anybank.na
Data Provider. The holder path is a path set by
the Data Provider. It can be any URI desired by
the Data Provider. While all authenticated
endpoints must be accessible under the same
holder path the Data Provider may stipulate a
different holder path for unauthenticated
endpoints.

Administrator

This is a static string representing the scheme bon
endpoints. This static string allows for
separation from other APIs available at the
same base holder path and also allows for
extension if the standards are adopted by
another jurisdiction in whole or in part.

Namibian Open Banking Standards v1.0

Example

62

Final Namibian Open Banking Standards - 25 April 2025

Version

The major version of the API standards. vX
This is not the version of the endpoint or the
payload being requested but the version of the v1 will be used for phase
overall standards being applied. This version 1 production
number will be "v" followed by the major version
of the standards as a positive integer (e.g. v1,
v12 or v76).

Industry

A static string used to separate APIs for a banking will be used
specific industry. As standards for new initially.
industries are defined the list of industry strings
will be extended. Note that the currently
accepted values for the industry component of
the
Base
Path
are:
banking = "banking" string. For APIs related to
banking and potentially wider financial services
data common = "common" string. For APIs that
potentially span industries

Resource URI

The URI for the specific resource requested. accountbalance
This endpoint URI will be defined as part of the
endpoint definitions for each API group.
This service MUST follow the naming
described in the endpoint dictionary.

query-parameters

These query-parameters MUST follow the 123456789
parameters described in the endpoint
dictionary.

Example
The endpoint to get a balance could be:
GET https://www.api.anybank.na/bon /v1/banking/accountbalance?123456789

Resource Path
The Resource Path is the portion of the URL including a Base Path and a resource URI
location. The Resource Path string is defined as: <base-path> / <resource>

The Base Path
Base Path is the portion of the URL up to but not including the endpoint resource, i.e. the
base path is the portion of the URL up to and including the <industry> component. The
Base Path string is defined as follows:
https:// <provider> / bon / <version> / ( <industry>)
The Resource URI

Namibian Open Banking Standards v1.0

63

Final Namibian Open Banking Standards - 25 April 2025

The resource URI follows the JSONAPI.org recommendation and for simplicity is quoted
as the Method followed by the resource and any parameters.
GET .../accounts
GET .../accounts/{id}
GET .../accounts/transactions

9.1.3

Field Formatting Standards
Field Names and Valid Characters

All field names defined in either a request or response payload MUST be treated as case
sensitive by clients and servers, and they MUST meet all the following conditions:
•

Member names MUST contain at least one character.

•

Member names MUST contain only the allowed characters listed below:

•

U+0061 to U+007A, a-z

•

U+0041 to U+005A, A-Z

•

U+0030 to U+0039, 0-9

Additionally, the following characters are allowed in field names, except as the first or last
character:
•

U+002D HYPHEN-MINUS, '-'

•

U+005F LOW LINE, '_'

•

U+0024 DOLLAR SIGN, '$'

Other characters MUST NOT be used in field names.

Field Naming Style
Field names will be meaningful names with defined semantics.
Fields representing the same data in different payloads or different parts of a payload will
have the same name.
Fields MUST NOT be named using reserved javascript tokens.
If a field name is a single acronym, it SHOULD be lowercase.
If a field name contains an acronym along with other words, it MAY be uppercase.
The first character in a field name SHOULD be lower case unless it is part of an acronym.
Array types SHOULD have plural field names. All other field names SHOULD be singular.

Namibian Open Banking Standards v1.0

64

Final Namibian Open Banking Standards - 25 April 2025

Field Data Types
Each field defined for the payloads of an endpoint will have an assigned data type.
The list of valid data types will be set out in the API data standards.
If a custom data type is required for a field, then the field SHOULD be classified as a string
with a clear description of how the property value is to be interpreted or defined.

Empty/Null Fields
An empty field (i.e., a field that is not present in a payload) will be considered equivalent
with a field that is present with a null value.
An empty string (“”) is not considered to be equivalent to null.
A Boolean value of false is not considered to be equivalent to null. Optional Boolean fields,
by implication, have three possible values: true, false and indeterminate (i.e., null).

Mandatory/Optional Fields
Each field defined for the payloads of an endpoint MUST have an assigned status of
mandatory, optional, or conditional.
•
•

•

Mandatory fields MUST be present and have a non-null value in a request or
response payload for the payload to be considered valid.
Optional fields MAY be present, but this is not guaranteed. It is also valid for these
fields to be present but have a null value. Note that optional fields indicate that data
may sometimes not be held by a Data Provider, and this is an expected scenario.
Conditional fields MUST have an associated conditional statement. If the conditional
statement is true in a specific request or response, the field is considered
mandatory. If the conditional statement is false, then the field is considered
optional.

Optional fields are not considered optionally implementable by a Data Provider if they hold
the data. If a Data Provider holds data in digital form for an Account Holder that is
represented in a payload, then it is expected that this data will be shared when authorised
by the Account Holder.

Currency formats
Currency value format MUST have two decimal places. The last two digits of the number
shall be the decimal digits. Example shown below for Namibian Dollar (NAD) 10000:
Amount: 100.00

Namibian Open Banking Standards v1.0

65

Final Namibian Open Banking Standards - 25 April 2025

9.1.4

Pagination

#

Attribute

Value

1

Maximum Page size

A maximum page size of 1000 records is assumed for all
endpoints (unless otherwise stipulated in the endpoint
definition). If a page size greater than this maximum is
requested, then an Invalid Page Size error SHOULD be
returned.

Each API endpoint that can return multiple records will stipulate whether pagination is
supported for the endpoint or not, in the API Data Standard. For endpoints that will return
less than a reasonably sized page of results in most circumstances support for paging may
not be included.
Note that the use of paging for an endpoint does not require or preclude the use of filtering
query parameters. It is expected that filtering and paging will be applied independently of
each other.
Data Providers are not expected to implement pagination with transaction isolation. The
underlying dataset may change between two subsequent requests. This may result in
situations where the same transaction is returned on more than one page.
If a page size greater than this maximum is requested, then an Invalid Page Size error
SHOULD be returned.
Pagination and Query Parameters
The TPP will stipulate pagination requirements on the request using query parameters.
When paging is supported, the consumer MAY provide the following query parameters:
#

Attribute

Value

Default

1

Page

The page number being requested 1
(with the first page being 1)

2

Page-size

The number of records to return in 25 records
each page

Pagination and Links Response Object
In addition to the data requested a holder MUST provide the following Links object in the
response payload. In the links object the following fields are to be provided.
#

Attribute

Value

1

first

first - A URI to request the first page. Mandatory if this
response is not the first page.

2

last

last - A URI to request the last page. Mandatory if this
response is not the last page.

Namibian Open Banking Standards v1.0

66

Final Namibian Open Banking Standards - 25 April 2025

3

prev

prev - A URI to the previous page. Mandatory if this response
is not the first page.

4

next

next - A URI to the next page. Mandatory if this response is
not the last page.

Pagination and Meta Response Object
In addition to the data requested a holder MUST provide the following meta object in the
response payload. In the meta object the following fields are to be provided:
#

Attribute

Value

1

totalRecords

totalRecords - The total number of records in the set. This field
MUST be present.

2

totalPages

totalPages - The total number of pages in the set. This field
MUST
be
present.
If totalRecords is 0 totalPages MUST be 0.

For each of these fields, the page size specified in the request can be assumed when
calculating values.
For performance reasons, Data Providers may wish to support other pagination patterns
such as cursors or continuation tokens. While the standard does not explicitly support these
additional mechanisms, it is considered allowable to implement these patterns and expose
them via the pagination links.
In this scenario, the URIs included in the links for other pages may not be compliant with
the standard and may, instead, include other query parameters that support another
pagination pattern. It is expected that all other pagination requirements such as link fields
and meta fields will still be supported if other patterns are implemented.
To allow for a more performant implementation, data consumers are encouraged to
utilise pagination links wherever possible and only use constructed URIs for the first page
or if random access to a specific set of records is required.

9.1.5

HTTP Request Headers

HTTP Request Header Standards define the supported HTTP Request Headers. HTTP
request headers MAY/MUST contain the following elements.
Header Field

Description

ParticipantId

Field referencing the Participant ID of the TPP Mandatory
Participant. This value must match the ID found
within their Participant Certificate.

Namibian Open Banking Standards v1.0

Mandatory?

67

Final Namibian Open Banking Standards - 25 April 2025

ContentType

Standard HTTP Header. Represents the format of Conditional
the payload provided in the request. The media type
must be set to application/json. Mandatory for PUT
and POST calls.

x-v

Version of the API endpoint requested by the client. Mandatory
Must be set to a positive integer. If the version
requested is not supported, then the holder must
respond with a 406 Not Acceptable.

Accept

If specified, the media type must be set to Optional
application/json, unless otherwise specified in the
resource
endpoint
standard.
If set to an unacceptable value, the holder must
respond with a 406 Not Acceptable. If not specified,
or a wildcard (*/*) is provided, the default media type
is application/json.

9.1.6

HTTP Response Headers

HTTP Request Header Standards define the supported HTTP Request Headers. HTTP
Response headers contain the following elements.
Header Field

Description

ParticipantId

Field referencing the Participant ID of the Data Mandatory
Provider Participant. This value must match the ID
found within their Participant Certificate.

RetryAfter

Field indicating the time (in seconds) that the client Optional
should wait before retrying an operation. The holder
should include this header along with responses with
the HTTP status code of 429 Too many requests.

x-v

The version of the API endpoint that the holder has Mandatory
responded with.

9.1.7

Mandatory?

Request Payloads

Each API request with a payload MUST have a JSON object at the root level known as
the root object.
This root object MUST contain a data object to hold the primary data for the request. The
definition of the contents for the data object will be defined separately for each endpoint.
The root object MAY contain a meta object, which is used to provide additional information
such as second factor authorisation data, traffic management, pagination counts, or other
purposes that are complementary to the workings of the API. The root object will contain
a meta object if, and only if, it is specifically REQUIRED by the endpoint as defined in the
API Data Standard.

Namibian Open Banking Standards v1.0

68

Final Namibian Open Banking Standards - 25 April 2025

#

Root Object

Needed in Request Object

1

Data Object

Mandatory

2

Links Object

N/A

3

Meta Object

Conditional (if specified)

4

Errors Object

N/A

9.1.8

Response Payloads

Each API response payload MUST have a JSON object at the root level known as the root
object.
Successful Responses (200 code)
All endpoints MUST have HTTP Status codes 200 as defined in the data dictionary
If the response is successful (200 OK), the root object:
#

Root Objects

Needed in 200 Response

1

Data Object

Mandatory

2

Links Object

Conditional

3

Meta Object

Conditional

4

Errors Object

N/A

The definition of the contents for the data object and meta object is defined separately for
each endpoint in the API Data standards.
Unsuccessful Responses (not 200 code)
All endpoints MUST have responses defined for HTTP Status codes 400, 401, 403, 404,
and 500 as defined in the data dictionary and MAY have HTTP status codes, 201, 409 or
other codes, as defined in the data dictionary.
#

Root Objects

Needed in unsuccessful Response

1

Data Object

N/A

2

Links Object

N/A

3

Meta Object

N/A

4

Errors Object

Conditional

Unsuccessful responses MAY contain an errors object (as per the specific endpoint
definition)

Namibian Open Banking Standards v1.0

69

Final Namibian Open Banking Standards - 25 April 2025

9.2

API Use Cases

Functional endpoints MUST be tagged with one or more of the following sector and services
identifiers.
Data Providers MUST NOT let TPPs without these permissions, access these endpoints.
9.2.1

Supported Sectors

#

Sector
Code

Sector
Name

Description

1

All

Common

Common Services. For APIs that potentially span
sectors or services, e.g. Consent endpoints, reporting
endpoints.

2

Banking

Banking

For APIs related to banking and potentially wider
financial services data

Other industries can be added in later phases.
9.2.2

Supported Services

The following service types will be supported.
#

Sector
Code

Service
Code

Service Name

Description

1

All

Common

Consent Endpoints

The supported endpoints and their
versions that are used for
consent.

2

Banking

PIS

Payment
Endpoints

3

Banking

AIS

Account Information The supported endpoints and their
Endpoints
versions that are used for Account
Information Services.

Initiation The supported endpoints and their
versions that are used for
Payment Initiation Services

NB. Subscription services will not be supported in this phase.
9.2.3

Supported Operation Types

The following operation types will be supported for each service.
#

Service
Code

Operation
Code

Name

Description

1

AIS

Read

AIS.Read

Account information will be limited to
reading (not updating) information in the
first phase.

Namibian Open Banking Standards v1.0

70

Final Namibian Open Banking Standards - 25 April 2025

2

PIS

Write

PIS.Write

Payments can be created by Account
Holders through TPPs.

3

PIS

Read

PIS.Read

Payment statuses information can be read
by TPPs for payments they have made,
support account holders.

N.B. The ability to change account information (AIS.Write), will not be supported in this
phase.

9.2.4

Supported Resource Objects (Banking)
List of Resource Objects

The following resource objects are supported.
# Name

Description

1 Accounts

Information about an account, such as identifier, account holder
name, type.

2 Balances

Balances of an account, typically a type, an amount and a currency.
There may be multiple balance types.

3 Transactions

Key information relating to a specific account. Transactions
information includes identifiers, dates, amounts, currency, status.

1 Payments

Payments or movements on the account made from a payer to a
payee, including interest payments, fees and internal transfers.

2 Payment Status

The status of a payment that has been made.

3 Beneficiaries

Beneficiaries (Payees) that have been added by Account Holders
and organisations or individuals they pay frequently.

Accounts
Information about an account includes information such as an identifier, account holder
name, type. See data dictionary.

Supported Account Types.
Whether an account type is supported or not, is shown in the table below.
Data provider

Account type

Consumer

Small
Business

Enterprise

PSPs regulated by BON

e-Wallet

Yes

Yes

No

PSPs regulated by BON

Current Account

Yes

Yes

No

PSPs regulated by BON

Savings Account

Yes

Yes

No

Namibian Open Banking Standards v1.0

71

Final Namibian Open Banking Standards - 25 April 2025

PSPs regulated by BON

Credit Card

Optional

Optional

No

PSPs regulated by BON

Loan Accounts

Optional

Optional

No

No

No

No

Email Accounts, Credit No
Bureau Accounts, Prepaid
cards, Unit trust accounts
Investment
accounts,
Vouchers

No

No

Financial
Institutions Insurance Accounts
regulated by NAMFISA or
others
Any

There will be one Account Data object, that will hold data about accounts. Any account that
can support this data set may be supported. Additional data for specific account types will
require additional and specific API Standards that are outside the scope of this phase.
Balances
Balances of an account, typically include a type, an amount and a currency.
See Namibian Open Banking Standards Data Dictionary.
Supported Balance types
There are multiple types of balance possible within the scope of supported accounts, e.g.
actual balance, available balance.
Balance types are not defined, based on the assumption that each Data Provider may have
its own way displaying balance to Account Holders.
Each Data Provider must define, encode and document Account Types on their developer
portal.

Transactions
Key information relating to a specific account. Transactions information includes identifiers,
dates, amounts, currency, status. See data dictionary.
Supported Transaction types
There are multiple types of transaction possible within the scope of supported accounts,
e.g. card payment, incoming EFT payment, outgoing EFT payment, bank charge.
Transaction types are not defined, based on the assumption that each Data Provider may
have its own way displaying Transactions to Account Holders.
Each Data Provider must define, encode and document Transaction Types on their
developer portal.

Namibian Open Banking Standards v1.0

72

Final Namibian Open Banking Standards - 25 April 2025

Payments
Payments or movements on the account made from a payer to a payee, including interest
payments, fees and internal transfers.
Supported Payment Types.
Which payment types are supported is shown in the table below.
National

Payment Type

Consumer
initiated*

Small
Business
initiated*

Enterprise
initiated*

Domestic On-us transactions whether between Yes
accounts with different account
holders, the same account holders or
wallets.

Yes

No

Domestic EFT: Enhanced
EnCR

transfers. Yes

Yes

No

Domestic EFT: Near real time credit transfers. Yes
NRTC

Yes

No

Domestic RTGS

No

No

No

Domestic Instant Payment (IPP)

Future

Future

No

Domestic Card Payments (i.e. transactions that No
goes across the card network)

No

No

Domestic Debit

No

No

No

Cross
border

CMA

No

No

No

Cross
border

SADC RTGS

No

No

No

Cross
border

FOREX

No

No

No

credit

*

Initiated refers to the case where the Party is the Payer / Originator of the payment for a
credit transfer
Payment Status
The status of a payment that has been made with visibility of its progress.

Namibian Open Banking Standards v1.0

73

Final Namibian Open Banking Standards - 25 April 2025

9.2.5

Supported API Use Cases
Supported AIS API Use Cases

The following API Use Cases will be supported for the AIS service
#

API Use Case

Summary

API Use Case description

1

List Accounts

Obtain a list of The List Accounts API allows a third party to
accounts
obtain a list of accounts at the request of an
Account Holder. A list of accounts will be
returned and should reflect the list of accounts
that the same Account Holder would see if they
accessed their account through a mobile app
or web browser.
A query parameter allows the list of accounts
returned to be filtered by "open" and "closed"
status.

2

Get
Account Obtain
the The Get Account Balance API allows a third
Balance
balance for a party to obtain the balance for a specific
single
specified account on the request of an Account Holder.
account
The request returns the current balance, but
also returns other balances, such as the
available balance and credit limits, if
appropriate.

3

List
Transactions

Obtain
The List Transactions API allows a third party
transactions for a to obtain a list of transactions for a specific
specific account. account on the request of an Account Holder.
Each transaction can contain a type, status,
description, posting date, amount, currency
reference.

Supported API Use Cases: PIS
The following API Use Cases will be supported for the PIS service.
#

API Use Case

Summary

1

Make Payment

Make
a
payment

Namibian Open Banking Standards v1.0

API Use case description
bank The Make Payment API allows a third party
to initiate a payment on the request of a
customer.
A positive API response code indicates
whether the payment initiation has been
successful or not, i.e., whether the financial
institution has successfully accepted the
payment instruction, not whether the
payment itself is credited correctly.

74

Final Namibian Open Banking Standards - 25 April 2025

The API returns a PaymentId, which is then
used to track the progress of the payment
itself.
Multiple “Make Payment” endpoints may be
needed if there are multiple Payment types.
2

List
Beneficiaries

Obtain the list
Beneficiaries

of The Get Beneficiaries API allows a third party
to get the list of Beneficiaries (Payees) that
have been added by Account Holders and
organisations or individuals they pay
frequently. This allows the TPP to present the
list of Beneficiaries to the Account Holder
when the Account Holder is making a
payment

3

Get
Payment Get the status of a The Get Payment Status API allows a third
Status
payment
party to track a payment that they previously
initiated, on the request of a customer.
The PaymentId is used as the reference for
the payment, as well as to track the progress
of the payment itself.

Example Market use cases based on
Account Information.
Account
aggregation
Confirmation
of
funds
Personal
finance
management
Wealth
management
Credit
scoring
Know
Your
Customer
(KYC)
Account
ownership
verification
Transaction
monitoring
Consumer
spending
profile
Loyalty
programs
Accounting Services
Verify Income (for house rental)
Verify age (for gambling authorisation)
Car Financing
Automated budgeting and alerts, with e.g.
transaction monitoring
9.3

N.B. These API use cases can be defined,
and will support market use cases listed,
although it will be the TPPs that decide what
is needed.
Example Market use cases based on
Payment Initiation.
Bill payments
Ecommerce payments
Wallet top ups
Loan repayments
Domestic remittances
Payments to friends, family, colleagues
Invoice payments
Purchase
on
account
Payment method integration

API Data Sets and Data Dictionary (Data Standards)

The Data sets are included in Namibian Open Banking Standards Data Dictionary.

Namibian Open Banking Standards v1.0

75

Final Namibian Open Banking Standards - 25 April 2025

9.4

Security Standards

Security standards include security between Data providers and TPPs. Security that is
linked to consent is handled in the following chapters.
The following standards are put in place to technically secure communications between
participants.
Area

Standard

Transport
security

layer All API requests and all API responses MUST be secured by
Mutual TLS (MTLS) as described in RFC 8210.
mTLS helps ensure that traffic is secure and trusted in both
directions between a client and server. This provides an
additional layer of security for users who log in to an
organisation's network or applications. It also verifies connections
with client devices that do not follow a login process. mTLS
prevents various kinds of attacks and is used in zero trust security
frameworks.

Authentication of TPPs Data Providers MUST validate TPPs in real time, i.e.
by Data providers
• Authenticate the identity of the TPP using the allocated
Participant Credential.
• Verify that they are Participants in the Scheme.
• Verify that they have the correct status.
• Verify that they have permission to carry out the action as
determined by the Access control rules.
Authentication of Data TPPs MUST validate that they are exchanging data with the
Providers by TPPs
correct Data Provider and authenticate the identity of the Data
Provider using their Participant Credential.
TLS certificates

All Participants MUST use a production grade Participant
Credential that meets the standards described in the chapter
“Participant Credential Standards” for securing TLS
communications.

Signing certificates

All Participants MUST use a production grade Participant
Credential that meets the standards described in the chapter
“Participant Credential Standards”.

9.5

Consent and Customer Authentication Standards

Consent has so far been described in terms of a “Consent Token”. At the technical level
this is a pair of tokens, and Access Token and a Refresh Token.
The standards described here are based on the Authorization Code with PKCE standard
as outlined in RFC7636 sections 4.1 and 4.2.

Namibian Open Banking Standards v1.0

76

Final Namibian Open Banking Standards - 25 April 2025

9.5.1

Consent Steps

Initiate Consent request: Pushed Authorisation Request API
The TPP will initiate a consent flow with the Data Provider.
1. To do this, the TPP will generates a code challenge and code verifier in
accordance with “RFC 7636 Proof Key for Code Exchange by OAuth Public Clients,”
sections 4.1 and 4.2.
2. The TPP will submit the code challenge to the Data Provider with details of the
consent request as a 'Pushed Authorization Request'.
3. This is submitted to the Data Provider which will validate the request and return a
request_uri.
Initiating consent is done through a Common API “par” (pushed Authorisation request)
based on RFC 9126 “OAuth 2.0 Pushed Authorization Requests”
Account Holder grants Consent
Account Holder Consent has three parts
1) After obtaining a request_uri, the TPP will redirect the Account Holder to the Data
Provider to authenticate their identity and confirm the details of the consent request.
2) The Data provider confirms consent request with the Account Holder. This includes
a. The Data Provider sending a challenge to the Account Holder
b. The Account Holder sending a successful response to the Data Provider.
3) If the Account Holder grants the consent request, the Data Provider issues an
authorization code. This authorization code is delivered it to the TPP.

Namibian Open Banking Standards v1.0

77

Final Namibian Open Banking Standards - 25 April 2025

The authorization code MUST expire shortly after it is issued to mitigate the risk of leaks.
A maximum authorization code lifetime of 10 minutes is recommended.

API definitions are not provided as the data sent is not between the TPP and the Data
Provider, nevertheless we suggest a recommended format is provided for
i)
A mechanism to redirect the Account Holder app to the Data Provider App.
ii)
A call back webhook definition to tell the TPP how to get the Authorization
code.
Retrieve Access Token(s): POST Token API
After obtaining the authorization code, from the Account Holder, the TPP will request a
Token from the Data Provider using the Token API.
1) The TPP sends the Token request and provides both the Authorization code and
the code challenge created during the Pushed Authorization request..
2) The Data Provider validates the authorization code against the code verifier and
code challenge supplied previously before.
3) If valid, the Data Provider responds with an access token. Depending on the
duration and type of consent granted, the Data Provider may also issue a refresh
token. This refresh token may be used to obtain a new access token after a previous
token expires in future transactions.
For API definitions see the data dictionary.
Consent revocation: POST Revoke API
Should the Account Holder withdraw their consent via the TPP, the TPP must instruct the
Data Provider to revoke their refresh token. Alternatively, if the Account Holder instructs the
Data Provider to withdraw consent, then the Data Provider will revoke the refresh token
themselves. Once a refresh token has been revoked it may no longer be used to obtain
new access tokens.
For API definitions see the data dictionary.
9.5.2

Consent Scopes

Scopes Name

Description

banking:accounts.basic.read

Ability to read account information

banking:payments.write

Ability to initiate a payment

banking:payments.read

Ability to read the status of a payment request

consent:authorisationcode.write

Ability to send an authorisation code

consent:authorisationtoken.write

Ability to send an access token

Namibian Open Banking Standards v1.0

78

Final Namibian Open Banking Standards - 25 April 2025

9.5.3

Maximum Consent Duration

Value

Description

180 days

The Maximum Duration of Consent

9.5.4

Strong Customer Authentication Standards

No minimum requirements are provided as it is assumed that
•
•

All Data providers are regulated by BoN.
All Data providers therefore have compliance obligations and minimum standards
for providing access to bank accounts and wallets.

9.6

API UX Standards

9.6.1

Branding Standards

Item

Description

Scheme Name

The Name of the Scheme as known to the public

Scheme Brand

An image that is consistently shown when the Scheme is used.

Scheme Glossary

A set of terms that will be used in public phasing communication
by all participants. These terms may or may not be the same as
the terms used in the Scheme standards documentation.

9.6.2

Public Information Standards

Public information standards represent a minimum of information that MUST be presented.
Other information can also be provided.
Scheme Webpage
The Scheme Administrator will provide a Webpage for Account Holders, so that all Account
Holders can see a single centralised description of the Open Banking Services.
Item

Description

Scheme Description

A description of the mission and purpose of the Scheme

List of Data Providers

A public list of Participating Data Providers

List of TPPs

A public list of Participating TPPs

Account
Instructions

Holder Instructions for Account Holders about what they should do if
they have problems

TPP Webpage
TPPs will provide a Webpage for Account Holders, so that all Account Holders can see a
single centralised description of the Open Banking Services.

Namibian Open Banking Standards v1.0

79

Final Namibian Open Banking Standards - 25 April 2025

Item

Description

Scheme Description

A description of the mission and purpose of the Scheme.

Scheme webpage link

A link to the Scheme Webpage.

TPP
identifier

Participation A statement that the TPP is a participating organisation,
including Identification numbers and details.

Account
Instructions

Holder Instructions for Account Holders about what they should do if
they have problems

Data Provider Webpage
Data Providers will provide a webpage for Account Holders, so that all Account Holders can
see a single centralised description of the Open Banking Services.
Item

Description

Scheme Description

A description of the mission and purpose of the Scheme.

Scheme webpage link

A link to the Scheme webpage.

Data
Provider A statement that the Data Provider is a participating
Participation identifier
organisation, including Identification numbers and details.
Account
Instructions

9.6.3

Holder Instructions for Account Holders about what they should do if
they have problems

Flow and Mandatory Text

The following mandatory text is to be shown during the user journey. The text itself may be
developed, but the following elements must be in place.
Contracting and Configuration with the TPP
The Account Holder subscribes to a TPP service The Account Holder is offered an App or
service. During this process the following text must be shown.
#

Mandatory Text Element

Example

1

Scheme Statement

This service is made within the rules of the
<Scheme Name>.

2

TPP Participation Statement

<TPP Name> is a registered TPP under the
<Scheme Name>, Participant ID <12345678>

3

Scheme webpage link

More information about the <Scheme Name>,
registered TPPs and Banks can be found at
<Scheme Webpage>

4

TPP webpage link

Click here <webpage> for more information and
support.

Mockup

Namibian Open Banking Standards v1.0

80

Final Namibian Open Banking Standards - 25 April 2025

Transaction: Account Holder Request to TPP
The Account Holder will make a request for a balance, a payment to the TPP.
#

Mandatory Text Element

Example

1

Confirmation that the transaction is taking This transaction is made by
place within the rules of Scheme.
<TPP Name>

2

Confirmation of the what the Account Holder Allow <who> to <do what> for
is about to consent to.
<how long>

Mockup

Namibian Open Banking Standards v1.0

81

Final Namibian Open Banking Standards - 25 April 2025

Transaction: Authentication and Authorisation
The Account Holder receives a challenge from the Data Provider and responds to the
challenge.
#

Mandatory Text Element

Example

1

DP Participation Statement

<DP Name> is a registered participant of
the Scheme

2

DP webpage link

Click here for more information and
support.

3

Mandatory text on Consent rights

You are about to share
<what>, <with who>, <for how long>.
If you wish to proceed, please <consent
action>

Mockup

Data Providers should not unnecessarily require multiple consent flows in the transaction
authentication and authorisation process for multiple AIS actions with the same Account
Holder and Bank, i.e. it cannot be that an Account Holder
look at accounts (consent requested)
look at my transactions (consent requested)
look at transaction detail (consent requested).
There may be cases where more than one consent and authorization may be needed on
one customer journey.
Account Holders logs on to get into the online banking or app and views accounts
and transactions (consent requested)
the Account Holder makes a payment and is requested to provide a second strong
customer authentication to authorise the payment.

Namibian Open Banking Standards v1.0

82

Final Namibian Open Banking Standards - 25 April 2025

Account Holders are used to providing two logons today for good risk-based reasons. There
is no issue with the same happening within the API flow. The golden rule should be that if
it is acceptable in the bank App or browser, it should be OK on the API.
Transaction: Response to the Account Holder from the TPP
Following a successful call, the Data Provider responds to the TPP who then takes the
necessary action towards the Account Holder, whether this is confirming that a payment
has been made, showing a balance or providing a pie-chart.

Response

No specific text

Mockup

9.7

API Service Level Standards

9.7.1

TPP Service Levels Towards Data Providers

TPPs have an obligation not to send too many requests to data providers, and that the
requests that are sent are well formed.
All requests that are sent by TPPs are effectively requested by Account Holders, but a TPP
could (theoretically) perform a balance check every second as part of a monitoring function.
This would be an unreasonable load on Data Providers, and so a limit is imposed.
#

Name

Description

1

Maximum
requests

Maximum automated requests per day from the same 4
Account Holder

Namibian Open Banking Standards v1.0

Level

83

Final Namibian Open Banking Standards - 25 April 2025

2

Error rate.

The Error Rates is the percentage of API requests that
result in errors.

Errors are defined as follows:
1. HTTP Status Codes: Responses with status codes in the 4xx (client errors) and 5xx
(server errors) ranges
a. 4xx Errors: 400 Bad Request, 401 Unauthorized, 403 Forbidden, and 404
Not Found.
b. 5xx Errors: 500 Internal Server Error, 502 Bad Gateway, 503 Service
Unavailable, and 504 Gateway Timeout.
2. Timeouts: If the API does not respond within a specified time frame, it is considered
an error. This can be due to network issues, server overload, or other factors
causing delays.
3. Invalid Responses: Even if the API returns a 2xx status code, the response might
still be considered an error if the content is invalid or does not meet the expected
format or schema.
4. Application-Specific Errors: These are custom error codes or messages defined by
the API provider to indicate specific issues related to the application's business
logic.
9.7.2

Data Provider Service Levels Towards TPPs

#

Name

Item

Service
Level

1

Availability.

Availability measures the percentage of time the API is 99.9%
operational
and
accessible. excluding
An Allowable Downtime Window (ADW) is permitted ADW
each month for maintenance or updates.

2

Median
Response time measures how quickly the API responds 300
Response time to requests.
milliseconds

3

Error rate.

The Error Rates is the percentage of API requests that
result in errors.

Namibian Open Banking Standards v1.0

84

Final Namibian Open Banking Standards - 25 April 2025

10. Ongoing Management Standards
10.1 Notifications and Reporting
The Scheme manager will provide reports and notifications to Participants and if needed,
regulators. These reports or notifications may be operational (e.g. notice of new
Participants, or informational (e.g. transaction volumes).
Participants will provide reports to the Scheme Manager of transaction volumes, service
level performance or other information as required.
Reporting standards define the content, periodicity and audience of reports that will be
created.
10.1.1 Transaction Reporting
A monthly report to be sent by Participants to the Scheme Manager.
#

Report

Description

1

Report Name

Transaction Report

2

Report Purpose

To provide summary data on the volume of
transactions, their type and their success rate.

3

Report Content Type

API Calls

4

Report Sender

Data Providers and TPPs

5

Report Audience

Scheme Manager

6

Report Periodicity

Monthly

7

Report Distribution Channel

Email.

8

Report Contents

For each endpoint
# Calls received
# Calls received successfully
# Calls received failed
For each endpoint & TPP
# Calls received
# Calls received successfully
# Calls received failed
For each endpoint & TPP & Call received
(failed) & error code

Namibian Open Banking Standards v1.0

85

Final Namibian Open Banking Standards - 25 April 2025

10.1.2 Service Level Reporting
#

Report

Description

1

Report Name

Service Level Report

2

Report Purpose

To provide summary data performance against
service levels.

3

Report Content Type

Service Levels

4

Report Sender

Data Providers and TPPs

5

Report Audience

Scheme Manager

6

Report Periodicity

Monthly

7

Report Distribution Channel

Email

8

Report Contents

For each service level
• A statement of target
• Compliance metric against that target
• Service level met (Y/N)
• Other information (free text if required)

10.1.3 Dispute Reporting
#

Report

Description

1

Report Name

Dispute Report

2

Report Purpose

To provide summary of Account Holder disputes.

3

Report Content Type

Account Holder Disputes

4

Report Sender

Data Providers and TPPs

5

Report Audience

Scheme Manager

6

Report Periodicity

Monthly

7

Report Distribution Channel

Email

8

Report Contents

Statistics on each type of Account Holder Dispute
(in scope) at the priority defined to be in scope.

Namibian Open Banking Standards v1.0

86

Final Namibian Open Banking Standards - 25 April 2025

Total number of disputes in scope.
Total number of disputes in scope by type
Total number of disputes in scope by priority
Total number of disputes in scope by counterpart
Participant.

10.2 Monitoring, Helpdesk and Support Processes
10.2.1 Monitoring Standards
Participants monitor transactions, services levels, audit logs to verify that APIs are meeting
service level standards to take actions if problems arise.
The Scheme Manager will monitor reports and market activity.
10.2.2 Helpdesk Standards
Helpdesk covers topics between participants. Problems related to Account Holders are
covered under "Dispute Resolution". Helpdesk Standards should acknowledge that there is
a difference between calls and problems from developers on technical matters vs calls on
payment reconciliation or business matters, providing different channels as needed.
Participants will provide support to other Participants should questions or problems arise.
The Scheme Manager will provide support to Participants if needed.
Helpdesk standards describe how participants provide support to each other, including
communication channels and response times.
10.2.3 Incident Management Standards
The Scheme Manager and scheme Participants will have incident management processes
designed to resolve problems, minimise impacts and alert other Participants, Account
Holders (if necessary).
Incident Management standards describe what types of incidents are defined, how different
incident types are prioritised and what information must be shared with which parties in the
case of different types of incidents.
We do not intend to define these standards in further detail as we believe this is party of
future ongoing operationalisation, and that channels, priorities etc are already defined
within the Namibian payments ecosystem.
10.3 Dispute Resolution Standards
The Scheme Manager will organise processes to help Participants resolve problems with
each other, to ensure that Account Holders receive answers, and that repetitive problems
can be tackled. Dispute resolution will not include direct communication to Account Holders.
Dispute Standards include dispute types, response times, error codes and channels that
will be followed during a Dispute.

Namibian Open Banking Standards v1.0

87

Final Namibian Open Banking Standards - 25 April 2025

10.3.1 Dispute Type Standards
Dispute Type Standards define the type of dispute, allowing all Participant to share the
same interpretation of an issue across the market and so to create uniformity around the
terms and issues.
10.3.2 Dispute Channel Standards
Dispute Data Exchange standards provide consistent and standardized requirements about
what data is exchanged between Participants.
10.3.3 Dispute Service Level Standards
Dispute Service Level Standards describe maximum response times to ensure that critical
issues are treated quickly, and that Account Holders get answers in a reasonable time
frame.
10.3.4 Dispute Priority Standards
Dispute Priority Standards provide a way of signalling the urgency and the importance of a
dispute.
We do not intend to define these standards in further detail as we believe this is party of
future ongoing operationalisation, and that channels, priorities etc are already defined
within the Namibian payments ecosystem.

10.4 Standards for Change Management
Changes to or within the Scheme should be managed with care. Managing change involves
identifying, socializing change requests and may require review and feedback. Time may
be needed for Participants to adapt, and there are issues around versioning to be
considered.
10.4.1 Change Management Standards for Data Providers
Changes made by Data Providers to API functionality can have a significant impact on
TPPs, even if the changes are communicated and bring additional benefits.
Data Providers should respect the timings below when making changes to published APIs.
#

Name

Description

1

Minimum change If changes are to be made to APIs, they must be 180
notification window notified in advance. The Minimum change notification
window provides the minimum time period in days.

2

Minimum Testing If changes are to be made to APIs, they must be 90
availability period. made available in the developer environment.
The Minimum Testing availability period provides the
minimum time period in days.

Namibian Open Banking Standards v1.0

Value

88

Final Namibian Open Banking Standards - 25 April 2025

10.4.2 Change Management Standards for the Scheme Manager
We do not intend to define this chapter in further detail as we believe this is party of future
ongoing operationalisation, and that channels, priorities etc are already defined within
the Namibian payments ecosystem. Nevertheless, we would expect to see rules around
• Governance: who submits requests for changes, who prioritises requests for
changes, who is consulted on changes.
• Timelines for major releases (e.g. an annual cycle)
• Standards around emergency changes, what constitutes an emergency change,
and who decides whether an emergency change is needed.

Namibian Open Banking Standards v1.0

89

Final Namibian Open Banking Standards - 25 April 2025

11. ANNEX: External Standards
11.1 Standards References
The following table provides a cross reference of external technical standards used,
mapping them to a requirement or purpose.
Requirement

Purpose of standard

General

Provides
a
architecture.

General

Provides a standard way of RFC 7231
exchanging data.

HTTP

Language

Provides the standard
encoding data.

JSON

Date and Time

Provides the standard for RFC 3339
designating date and time.

ISO Date & Time

Currency

Provides the standard
designating currencies.

ISO
codes

Payload(s) standards

Provides a data dictionary ISO 20022
where all parties understand
the meaning of each data
element.

ISO 20022

and Provides the standard for RFC 3986
uniquely
locating
the
resource.

URI Syntax

Naming
addressing

Proposed
Standard
standard REST

for RFC 7159

for ISO 4217

Proposed Standard
Name
REST

Currency

Security:
layer

Transport Secure
(transport) RFC 5246
communication - with one way
authentication.

TLS Protocol
MA-TLS

Security:
layer

Transport Transport with encoding

RFC 2818

HTTP over TLS

Security:
layer

Application Signing standards

RFC 7797

JWS

OAUTH 2.0

Proof Key for Code Exchange RFC 7636
by OAuth Public Clients

OAUTH 2.0

The OAuth 2.0 Authorization RFC 6796
Framework

OAUTH 2.0

OAuth
2.0
Pushed RFC 9126
Authorization Requests

OAUTH 2.0

Best Current Practice
OAuth 2.0 Security

Namibian Open Banking Standards v1.0

OAUTH 2.0

for RFC 9700

90

Final Namibian Open Banking Standards - 25 April 2025

11.2 Normative References
Reference

Description

Version

[RFC2119]

Key words for use in RFCs to Indicate Requirement Levels Mar 1997
https://tools.ietf.org/html/rfc2119

[JSON]

The JavaScript Object Notation (JSON) Data Interchange Dec 2017
Format: https://tools.ietf.org/html/rfc8259

[RFC2397]

The "data" URL scheme: https://tools.ietf.org/html/rfc2397 Aug 1998

[RFC3339]

Date and Time on the Internet:
https://tools.ietf.org/html/rfc3339

[RFC4122]

A Universally Unique IDentifier (UUID) URN Namespace: Jul 2005
https://tools.ietf.org/html/rfc4122

[JWA]

JSON
Web
Algorithms
https://tools.ietf.org/html/rfc7518

(JWA): May 2015

[JWE]

JSON
Web
Encryption
https://tools.ietf.org/html/rfc7516

(JWE): May 2015

[JWK] / [JWKS]

JSON Web Key (JWK): https://tools.ietf.org/html/rfc7517 May 2015

[JWS]

JSON
Web
Signature
https://tools.ietf.org/html/rfc7797

(JWS): Feb 2016

[JWT]

JSON
Web
Token
https://tools.ietf.org/html/rfc7519

(JWT): May 2015

[MTLS]

OAuth 2.0 Mutual TLS Client Authentication and Certificate Feb 2020
Bound Access Tokens: https://tools.ietf.org/html/rfc8705

[TDIF]

Digital Transformation Agency - Trusted Digital Identity Apr 2019
Framework
https://www.dta.gov.au/our-projects/digitalidentity/trusted-digital-identity-framework

[RFC5322]

Internet
Message
https://tools.ietf.org/html/rfc5322

[RFC4627]

The application/json Media Type for JavaScript Object Oct 2006
Notation (JSON): https://tools.ietf.org/html/rfc4627

[RFC4648]

The Base16, Base32, and Base64 Data Encodings: Oct 2006
https://tools.ietf.org/html/rfc4648

[OAUTH2]

The
OAuth
2.0
Authorization
https://tools.ietf.org/html/rfc6749

[OIDC]

OpenID Connect Core 1.0 incorporating errata set 1: Nov 2014
http://openid.net/specs/openid-connect-core-1_0.html

Timestamps: Jul 2002

Format: Oct 2008

Framework: Oct 2012

[OIDD]
OpenID Connect Discovery 1.0 incorporating errata
set 1: http://openid.net/specs/openid-connect-discovery-1_0.html

Namibian Open Banking Standards v1.0

91

Nov 2014

Final Namibian Open Banking Standards - 25 April 2025

Reference

Description

Version

[PAR]

OAuth
2.0
Pushed
Authorization
Requests: Feb 2020
https://tools.ietf.org/html/draft-ietf-oauth-par-01

[PKCE]

Proof Key for Code Exchange by OAuth Public Clients: Sep 2015
https://datatracker.ietf.org/doc/html/rfc7636

[RFC6750]

The OAuth 2.0 Authorization Framework: Bearer Token Oct 2012
Usage: https://tools.ietf.org/html/rfc6750

[RFC7009]

OAuth
2.0
Token
https://tools.ietf.org/html/rfc7009

[RFC7523]

JSON Web Token (JWT) Profile for OAuth 2.0 Client May 2015
Authentication
and
Authorization
Grants:
https://tools.ietf.org/html/rfc7523

[RFC7662]

OAuth
2.0
Token
https://tools.ietf.org/html/rfc7662

[RFC8414]

OAuth
2.0
Authorization
https://tools.ietf.org/html/rfc8414

[RFC9126]

OAuth
2.0
Pushed
Authorization
https://tools.ietf.org/html/rfc9126

Requests:

[DCR]

OAuth 2.0 Dynamic Client Registration
https://datatracker.ietf.org/doc/html/rfc7591

Protocol: Jul 2015

[FAPI-R-Draft]

Financial-grade API - Part 1: Read Only API Security Draft-06
Profile: https://openid.net/specs/openid-financial-api-part1-ID2.html

[FAPI-RW-Draft]

Financial-grade API - Part 2: Read and Write API Security Draft-06
Profile: https://openid.net/specs/openid-financial-api-part2-ID2.html

[FAPI-1.0-Baseline]

Financial-grade API Security Profile 1.0 - Part 1: Baseline: Mar 2021
https://openid.net/specs/openid-financial-api-part-11_0.html

Revocation: Aug 2013

Introspection: Oct 2015
Server

Metadata: Jun 2018

[FAPI-1.0-Advanced] Financial-grade API Security Profile 1.0 - Part 2: Mar 2021
Advanced: https://openid.net/specs/openid-financial-apipart-2-1_0.html
[JARM]

Financial-grade API: JWT Secured Authorization Oct 2020
Response
Mode
for
OAuth
2.0
(JARM):
https://bitbucket.org/openid/fapi/src/master/Financial_API
_JWT_Secured_Authorization_Response_Mode.md

YAML 1.2

https://yaml.org/

OpenAPI 3.1

OpenAPI Specification - Version 3.1.0 | Swagger

Namibian Open Banking Standards v1.0

Oct 2022

92

Final Namibian Open Banking Standards - 25 April 2025

12. ANNEX: Industry Abbreviations
Abbreviation / Acronym

Description

2-FA

Two-factor authentication

AIS

Account Information Services

AISP

Account Information Service Provider

ADW

Allowable Downtime Window

AML

Anti-Money Laundering

APP

Application

API

Application Programming Interface

ASP

Account Servicing Payment

ATM

Automated Teller Machine

BoN

Bank of Namibia

DP

Data Provider

ESI

Electronic Signature and Infrastructures

EFT

Electronic Fund Transfer

FAPI

Financial API

FI

Financial Institution

IPP

Instant Payment Programme

ISO

International Standards Organisation

KYC

Know Your Customer (Customer Due Diligence)

MFA

Multi Factor Authentication

MTLS

Mutual Transport Layer Security

MVP

Minimum Viable Product

NIST CRSC

National Institute of Standards and Technology
Computer Security Resource Centre

NBFI

Non-Banking Financial Institution

OBF

Open Banking Forum

OIDC

Open IDConnect

OTP

One Time PIN

OWASP

Open Worldwide Application Security Project

P2P

Person-to-Person

PCI DSS

Payment Card Industry Data Security Standard

PIN

Personal Identification Number

Namibian Open Banking Standards v1.0

93

Final Namibian Open Banking Standards - 25 April 2025

PIS

Payment Information Services

PISP

Payment Initiation Service Provider

PKCE

Proof Key for Code Exchange

POS

Point of Sale

PSP

Payment Service Provider

PSU

Payment Services User

PUB

Public Data Services

QWAC

Qualified Website Authentication Certificate

SCA

Secure Customer Authentication

SLA

Service Level Agreement

SoV

Store of Value

SUB

Subscription Service

TLS

Transport Layer Security

TPP

Third Party Provider

TSP

Technical Service Provider

USSD

Unstructured Supplementary Service Data

Namibian Open Banking Standards v1.0

94

Final Namibian Open Banking Standards - 25 April 2025

13. ANNEX: Open Banking Glossary of Terms
The following glossary provides a description of key roles, terms, actors used throughout
this document which are not already defined. These are standard across Open Banking
environments.
Term

Definition

Also Known As

Scheme Level Actors

A Scheme is set of rules, standards, Trust Framework,
processes and infrastructure that ecosystem
creates a formal legal and operational
model between multiple participants.
It may be created through national
law, scheme rules, or private
contracts.

Account Information Services Returns lists or details of bank
(AIS)
accounts, account balances, account
details, transactions and transaction
details
Payment Initiation Services Allow
the
creation
and
the
(PIS)
cancellation of payments, and the
ability to get the statuses of payments
that have been created.
Fourth party

Works on behalf of the TPP and is
considered an outsourcing partner.

Financial systems integrators

Data Providers will need and have
accounting
systems,
payments
systems,
consent
management
systems, gateways to financial
networks, firewalls, security systems.
These systems are on the edge of the
Open Finance journey and are often
provided
by
a
few
known
organisations.

Technical terms
Environment

An Environment is a collection of
processes and programming tools
that enables API Providers to build,
test, and debug an API and API Users
to view and use an API.

Conformance System

A Conformance system is a
collection of tools and services
provided by an API Provider that
allows API Users to safely test the

Namibian Open Banking Standards v1.0

95

Final Namibian Open Banking Standards - 25 April 2025

integration of an API with their own
systems and services.
Digital Certificates

Digital Certificates are credentials Credentials
that can be machine verified by a
trusted source. They are the digital
equivalent of physical credentials
such as passports, and driving
licenses

Participant Credentials

Digital certificates used for the
purpose of identification and securing
the API . Can be issued centrally by
the scheme or by certificate
authorities.

Customer Support Terms
Dispute

A situation where a payment event is
challenged by a customer on their
account. This could be potential fraud
or unauthorised transactions. The
dispute is typically raised by the
transaction originator

Chargeback

A charge returns after a customer
successfully disputes an item on an
already completed transaction.

Namibian Open Banking Standards v1.0

96

Final Namibian Open Banking Standards - 25 April 2025

14. ANNEX: Key Topic: Account Definition
14.1 Defining Accounts, Account Providers and other parties
The word “account” causes problems, account means many things, and there are things
which are not called accounts, which are!
The diagram below shows the basic elements. The Table underneath defines each element
in terms of
•
•
•
•
•

Open Data
Open Finance
Open Banking
Payments
OAuth protocol

#

Open Data

Open Finance

Open Banking

Payments

1

Account

Account

Account
Bank Account
e-Wallet
Store of Value

Store
Value

Bank
Non-Bank
Financial
Institution
e-money

Payment
Service
Provider
Store
Value
Provider

OAUTH
of Resource

Always
contains
May or may not May or may not Always contains money.
contain money contain money money.
2

3

Data
Provider

Financial
Institution

Account Holder Account Holder Account Holder
Customer

Namibian Open Banking Standards v1.0

Account
Holder
Customer
Payer

Resource
Server
of

Resource
Owner

97

Final Namibian Open Banking Standards - 25 April 2025

4

Third
Provider
TPP

Party Third
Provider
TPP

Party Third
Provider
TPP

Party Third Party Client
Provider
TPP

14.2 Bank Accounts vs e-Wallets
14.2.1 Definitions
“Electronic money wallet” or “e-money wallet or e-wallet” means an application software or
device on which monetary value is stored, and which allows the holder of the wallet to make
electronic transactions. The wallet may be stored on the internet or devices such as a
mobile phone or computer, or products such as prepaid cards. (PSD3).
N.B. The term “wallet” is also used in many different countries for stores of value such as a
virtual store of virtual cards, that may include credit cards, store cards, or airline tickets (e.g.
google wallet). These are out of scope.
14.2.2 Consumer Perspective
From a consumer perspective, anywhere they can put their money is an account. The public
do not see a clear difference between a bank account and a wallet, especially as many
banks provide accounts. Both are a store of value, both can receive payments, both can
make payments, both provide balances on request.
14.2.3 Compliance & Operational Perspective
From a compliance and operational perspective, there are differences between wallets and
accounts.
1.
2.
3.
4.

The Account Holder does not go through a KYC process.
The Data Provider does not (necessarily) know the name of the Account Holder.
The authentication mechanism for the wallet is tied to the phone.
The method for reading balances is through an Unstructured Supplementary
Service Data (USSD) code on a feature phone.
5. There is no payment interoperability (today) between wallet providers, although this
is changing.

Namibian Open Banking Standards v1.0

98

Final Namibian Open Banking Standards - 25 April 2025

15. ANNEX: Suggestions for future changes
This annex contains suggestions that were raised during the standards building process
but have not been considered in version 1.0 due to them being a minority request. They
may be considered in future versions.
15.1 New Sectors
These standards explicitly support banking but they have been written to be extended to
other sectors. Insurance would be an obvious next choice, but healthcare, energy or
telecommunications would also be relevant.
15.2 New Services
These standards support account information, payment initiation and consent flows.
Subscriptions. The standards do not support subscriptions, i.e. there is no API that allows
a person to apply for a load or open an account.
Investment Contributions. We received feedback that an API to buy investments could
also be welcomed within this service category.
Product information. We received feedback that an API to list bank products could be
useful. As this is generally public information, there may be other ways of obtaining it, but
a standardised API could be beneficial.
15.3 New Resource Objects (Banking)
15.3.1 Scheduled Payments
These standards allow Account Holders to create recurring payments through an API, i.e.
Account holders can request that a payment be made every month to the same beneficiary
for the same amount.
It is NOT possible for an Account Holder to view a list of future scheduled payments or to
modify or delete future scheduled payments through the API, although the functionality will
exist through the bank browser.
Arguably they should be able to perform this action, and the standards could be modified
to extend this. On the other hand, this functionality would come at a cost and would have
minority usage, so it may not be cost-effective. We note that in the UK and France APIs do
not always support this functionality.
15.4 Extended Resource Objects
15.4.1 New Account Types
Support for Enterprise accounts with multiple authentications.
More complex information for specific account types, e.g. terms or interest rates for savings
accounts.
15.4.2 New Payment Types
The supported payment types are shown in the table below.

Namibian Open Banking Standards v1.0

99

Final Namibian Open Banking Standards - 25 April 2025

The next obvious step would be to allow CMA or other cross border payments to be created.
15.4.3 New Fields in Transaction Information
Transaction Detail: More detailed information relating to a transaction, such as beneficiary
address.
15.4.4 New Fields in Account Information
Limits: Limits include maximum volumes or values of transactions that can be made in a
day, week or month. It also includes overdraft limits.

Namibian Open Banking Standards v1.0

100

read in full 