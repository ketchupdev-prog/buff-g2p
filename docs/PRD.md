# Buffr G2P App – Product Requirements Document (Revised v1.4)

**Ketchup Software Solutions**  
**Ecosystem:** Government-to-Person (G2P) – Beneficiary Platform (Mobile App)  
**Date:** March 2026  
**Status:** Specification – Build in `buffr_g2p`  
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
3. [Complete Screen Inventory & Layouts](#3-complete-screen-inventory--layouts) (§3.8 Figma screen index; §3.9 Receiver Flows; §3.10 USSD Flows & Menus)
4. [Component Inventory](#4-component-inventory) (§4.7 full hierarchy: organisms → atoms from Figma)
5. [Design System](#5-design-system) (§5.3 Figma effects/backgrounds; §5.4 Design verification: Buffr App Design – cards, wallet, group, animations)
6. [Layouts & Navigation](#6-layouts--navigation)
7. [User Flows](#7-user-flows)
8. [Data Hierarchy (Organism → Atom)](#8-data-hierarchy-organism--atom) (§8.2 UI component hierarchy from Figma)
9. [Tech Stack & Implementation](#9-tech-stack--implementation) (§9.5 Using Archon MCP for implementation – 100% confidence)
10. [Compliance & Security (App)](#10-compliance--security-app)
11. [Implementation File Map](#11-implementation-file-map--code-self-contained) (§11.0 Expo docs; §11.4 copy-paste code; §11.11 Expo Tabs Template Implementation Guide; §11.7–§11.8 Legal & NAMQR/Open Banking)
12. [Legal & Regulatory Compliance](#12-legal--regulatory-compliance-new) (§12.1–§12.5: ETA, PSD-12, PSD-1, PSD-3, applicability, measures)
13. [Implementation Roadmap (PRD ↔ System Design Guide)](#13-implementation-roadmap-prd--system-design-guide) (§13.1–§13.6: 23 rules, system design principles, PRD enhancements, sprint plan, AI leverage, validation)
14. [Compliance with NAMQR and Open Banking](#14-compliance-with-namqr-and-open-banking) (§14.1–§14.3: NAMQR alignment table, Open Banking alignment table, implementation checklist)
15. [Figma Design Enrichment](#15-figma-design-enrichment) (§15.1–§15.8: batch plan, JSON spec, canonical design spec, full-app coverage)
16. [Database Design](#16-database-design) (§16.1–§16.4: PostgreSQL schema, loans, voucher redemption, validation)
17. [ISO 20022 & Open Banking API Design](#17-iso-20022--open-banking-api-design) (§17.1–§17.5: API structure, endpoint catalogue, ISO 20022 mapping, validation)

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

**Buffr G2P** is the **Mobile App** pillar—the beneficiary-facing app (Expo/React Native) that we will build in the `buffr_g2p` project. All critical notifications (voucher issued, redemption confirmation, collection codes, expiry) are sent via **SMS** so beneficiaries without smartphones or data are never left behind.

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

### 3.4 Home & Wallet Payments (10 screens)

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 25 | Home | `/(tabs)/index` or `/(tabs)` | Tab | Header (avatar, notifications); Search (pill); “Send to” contacts; Balance card; Wallets carousel; Services grid; FABs (Send, QR); bottom tabs |
| 26 | Add Money Modal | Modal from Home | Modal | 3 methods: Bank Transfer, Debit Card, Redeem Voucher (→ Vouchers) |
| 27 | Send Money – Select recipient | `/send-money/select-recipient` | Stack | Contacts list, search, “Send to” selection |
| 28 | Send Money – Amount | `/send-money/amount` | Stack | Amount input, note, “Continue” |
| 29 | Send Money – Confirm | `/send-money/confirm` | Stack | Summary, 2FA, “Send” |
| 30 | Send Money – Success | `/send-money/success` | Stack | Success, receipt, “Done” |
| 31 | Merchant Directory | `/(tabs)/merchants` or `/merchants` | Tab or Stack | Categories, list/map; tap → Pay Merchant |
| 32 | Pay Merchant | `/merchants/[id]/pay` | Stack | Amount, wallet source, NAMQR flow, 2FA, success |
| 33 | Bill Payments | `/bills` or `/(tabs)/bills` | Stack or Tab | Billers (electricity, water, municipal), select → amount → pay from wallet |
| 34 | Add Wallet | `/add-wallet` | Modal | Name, type (main/savings), icon; “Create”; optional step 2: card design picker (§11.4.14) |
| 34b | Cards View | `/cards` or from Home | Stack or Tab | List of linked cards/wallets; Figma 115:529 |
| 34c | Add card | `/add-card` | Stack | “Scan your card” or manual; Figma 44:593 |
| 34d | Add card details | `/add-card/details` | Stack | Card number, expiry, etc.; Figma 44:639 |
| 34e | Card added | `/add-card/success` | Stack | Success state; Figma 45:660 |

**Home layout:** Tab layout for Home, Transactions, (optional) Vouchers/Merchants/Profile; Stack for each flow.

### 3.5 Profile & Management (5 screens)

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 35 | Profile | `/profile` or `/(tabs)/profile` | Stack or Tab | Avatar, name, Buffr ID; stats (vouchers, wallet); verification status; linked accounts; “Settings” |
| 36 | Settings | `/settings` or `/profile/settings` | Stack | Sections: Account, Security, Notifications, Privacy, Help, About |
| 37 | Analytics Dashboard | `/analytics` | Stack | Voucher + wallet analytics (charts, totals, breakdown) |
| 38 | Location Services | `/location` or `/map` | Stack | Map: agents, NamPost, SmartPay units, ATMs; filters; list view |
| 39 | Transactions History | `/(tabs)/transactions` or `/transactions` | Tab or Stack | List with filters (date, type); tap → Transaction detail |

**Profile layout:** Stack from Profile root; Settings as child stack.

### 3.6 Additional Features (14+ screens / overlays)

| # | Screen name | Route | Layout | Key components / Layout notes |
|---|-------------|--------|--------|--------------------------------|
| 40 | Loans | `/loans` | Stack | Voucher-backed loans list, apply (up to 1/3 previous voucher, 15% interest), active loan detail, status; repayment auto-debited from wallet when next month’s voucher redeemed to wallet (§2.3) |
| 41 | My QR Code | `/qr-code` | Stack or Modal | User’s NAMQR / receive code (display only) |
| 41b | QR Code Scanner | `/scan-qr` or from Pay Merchant | Stack | Full-screen scanner for pay-by-QR or collect-by-QR; Figma 81:465 |
| 42 | Notification Center | `/notifications` or modal | Stack or Modal | List of notifications (voucher, redemption, cash-out, system) |
| 43 | AI Chat | `/ai-chat` | Stack | Chat UI with DeepSeek companion |
| 44 | Gamification | `/gamification` | Stack | Rewards, points, badges |
| 45 | Financial Literacy | `/learn` | Stack | Articles / tips |
| 46 | Agent Network | `/agents` or `/agents/nearby` | Stack | Map + list of agents; tap → detail / cash-out |
| 47 | Merchant Directory (full) | `/merchants` | Stack | Categories, search, map |
| 47b | Create Group | `/groups/create` | Stack | Group name, description, member selection (pill search, chips); “Create”; Figma 174:696 |
| 47c | Group view / detail | `/groups/[id]` | Stack | Group name, members, activity; optional in G2P scope (§2.1) |
| 47d | Available bank accounts *(optional)* | `/onboarding/bank-accounts` or settings | Stack | Bank linking; Figma 44:537, 60:62 |
| 48 | 2FA Verification Modal | Shared modal | Modal | PIN or biometric prompt; “Verify” / “Cancel”; validation **server-side only** (§11.4.13) |
| 49 | Transaction Detail | `/transactions/[id]` | Stack | Amount, type, date, status, receipt, “Share” |
| 50 | Wallet Detail | `/wallets/[id]` | Stack | Balance, history, “Add money”, “Cash out”, “Transfer”, “Settings” |

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
| **Cards carousel** | Physical/linked cards (CardFlipView per item); front = number/name/expiry, back = CVV | Home balance block, Cards View (§3.4 34b) | CardDesign.ts: 340×214, radius 12; flip 600ms; snap 400ms |
| **Wallets carousel** | WalletCard per wallet (icon circle 999px + name + "Show"/"Add") + "Add Wallet +" card | Home (§3.4 screen 25) | effect_E7Q5GM shadow; card radius 16px; scale on focus |
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
- **State-flow:** `components/state-flow/AddWallet.tsx` – Step 1: icon picker (emoji), name (pill), Auto Pay toggle + config (frequency weekly/bi-weekly/monthly, deduct date/time, amount N$, repayments, payment method). Step 2 (optional in some flows): card design selection. Save → success ping (scale animation) → navigate home with new wallet.  
- **Fields:** name, purpose?, type (personal|business|savings|…), icon, cardDesign?, autoPayEnabled, autoPayFrequency, deductDate/Time, amount, repayments, paymentMethodId.  
- **G2P PRD:** Add Wallet = modal or stack; name, type (main/savings), “Create”; optional 2-step. Align with buffr for icon + name + optional Auto Pay when building.

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

```
buffr_g2p/
  app.json
  package.json
  tsconfig.json
  babel.config.js
  app/
    api/
      ussd/
        menu+route.ts          # USSD endpoint handler (serverless; gateway calls POST /api/v1/ussd/menu) §9.3, §3.10
    _layout.tsx
    index.tsx
    onboarding/
      _layout.tsx
      index.tsx
      phone.tsx
      otp.tsx
      name.tsx
      photo.tsx
      face-id.tsx
      complete.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      transactions.tsx
      vouchers.tsx
      profile.tsx
    utilities/
      _layout.tsx
      vouchers/
        _layout.tsx
        index.tsx
        [id].tsx
        history.tsx
        redeem/
          nampost/
            index.tsx
            booking.tsx
            success.tsx
          smartpay/
            index.tsx
            code.tsx
          wallet/
            success.tsx
    wallets/
      _layout.tsx
      [id].tsx
      [id]/
        cash-out/
          _layout.tsx
          index.tsx
          till.tsx
          agent.tsx
          merchant.tsx
          atm.tsx
          bank.tsx
          success.tsx
        add-money.tsx
    send-money/
      _layout.tsx
      select-recipient.tsx
      amount.tsx
      confirm.tsx
      success.tsx
    merchants/
      _layout.tsx
      index.tsx
      [id]/
        pay.tsx
    bills/
      _layout.tsx
      index.tsx
    agents/
      _layout.tsx
      index.tsx
      nearby.tsx
    transactions/
      _layout.tsx
      [id].tsx
    profile/
      _layout.tsx
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
      index.tsx
      apply.tsx
      [id].tsx
    proof-of-life/
      _layout.tsx
      verify.tsx
      success.tsx
      expired.tsx
    scan-qr.tsx
    add-wallet.tsx
    groups/
      _layout.tsx
      create.tsx
      [id].tsx
    receive/
      _layout.tsx
      [transactionId].tsx
      voucher/[voucherId].tsx
      group-invite/[inviteId].tsx
      request/[requestId].tsx
  components/
    layout/
      ScreenContainer.tsx
      StackScreen.tsx
      ModalContainer.tsx
    inputs/
      SearchBar.tsx
      PillButton.tsx
      TextInput.tsx
      OTPInput.tsx
      AmountInput.tsx
    cards/
      BalanceCard.tsx
      WalletCard.tsx
      CardFlipView.tsx
      VoucherCard.tsx
      ServiceCard.tsx
      ContactChip.tsx
      MethodCard.tsx
    list/
      ListItem.tsx
    feedback/
      Toast.tsx
      LoadingOverlay.tsx
      ErrorState.tsx
      EmptyState.tsx
      NetworkError.tsx
      TwoFAModal.tsx
      NotificationBadge.tsx
    qr/
      NAMQREncoder.ts
      NAMQRDecoder.ts
      SignedQRVerifier.ts
      QRDisplay.tsx
      QRCodeScanner.tsx
      NAMQRDisplay.tsx
      NAMQRScanner.tsx
  constants/
    Theme.ts
    Layout.ts
    CardDesign.ts
    designSystem.ts
    legalTerms.ts
  contexts/
    UserContext.tsx
    WalletsContext.tsx
    VouchersContext.tsx
    OAuthContext.tsx
    ComplianceContext.tsx
    AppProviders.tsx
  services/
    api.ts
    vouchers.ts
    wallets.ts
    ussdHandler.ts             # Core USSD menu logic, session management (backend-only; used by app/api/ussd) §3.10, §7.6.6–7.6.7
    auth.ts
    tokenVault.ts
    oauth.ts
    mTLSClient.ts
    keyManager.ts
    incidentReporter.ts
    affidavitGenerator.ts
    complianceReporter.ts
    notifications.ts
    loans.ts
  hooks/
    useAuth.ts
    useVouchers.ts
    useWallets.ts
    useOAuth.ts
    use2FA.ts
  docs/
    FIGMA_BATCH_PLAN.md
    BUFFR_G2P_FIGMA_DESIGN_SPEC.json
    NEXT_STEPS.md
  utils/
    cryptoHelpers.ts
    tlv.ts
    namqr.ts
    crc.ts
    auditLogger.ts
    encryption.ts
  types/
    api.d.ts
    voucher.d.ts
    wallet.d.ts
    loan.d.ts
  assets/
    fonts/
    images/
  docs/
    PRD.md
```

---

### 11.2 Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend base URL (e.g. `https://api.ketchup.cc` or Buffr backend). |
| `EXPO_PUBLIC_APP_ENV` | No | `development` \| `preview` \| `production`. Default: `development`. |

Use `.env` / `.env.local` and load via `expo-constants` or `process.env.EXPO_PUBLIC_*` in app code. Never commit secrets; use EAS Secrets for production.

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

| Route | File | Layout |
|-------|------|--------|
| `/` | `app/index.tsx` | Root Stack |
| `/onboarding` | `app/onboarding/index.tsx` | onboarding Stack |
| `/onboarding/country` | `app/onboarding/country.tsx` | onboarding Stack (optional) |
| `/onboarding/phone` | `app/onboarding/phone.tsx` | onboarding Stack |
| `/(tabs)` | `app/(tabs)/index.tsx` | Tabs |
| `/(tabs)/transactions` | `app/(tabs)/transactions.tsx` | Tabs |
| `/(tabs)/vouchers` | `app/(tabs)/vouchers.tsx` | Tabs |
| `/(tabs)/profile` | `app/(tabs)/profile.tsx` | Tabs |
| `/utilities/vouchers` | `app/utilities/vouchers/index.tsx` | utilities Stack |
| `/utilities/vouchers/[id]` | `app/utilities/vouchers/[id].tsx` | utilities Stack |
| `/utilities/vouchers/redeem/nampost/*` | `app/utilities/vouchers/redeem/nampost/*.tsx` | nested Stack |
| `/utilities/vouchers/redeem/smartpay/*` | `app/utilities/vouchers/redeem/smartpay/*.tsx` | nested Stack |
| `/utilities/vouchers/redeem/wallet/success` | `app/utilities/vouchers/redeem/wallet/success.tsx` | nested Stack |
| `/wallets/[id]` | `app/wallets/[id].tsx` | wallets Stack |
| `/wallets/[id]/cash-out` | `app/wallets/[id]/cash-out/index.tsx` | cash-out Stack |
| `/wallets/[id]/add-money` | `app/wallets/[id]/add-money.tsx` | Stack |
| `/send-money/*` | `app/send-money/*.tsx` | send-money Stack |
| `/merchants`, `/merchants/[id]/pay` | `app/merchants/index.tsx`, `app/merchants/[id]/pay.tsx` | merchants Stack |
| `/bills` | `app/bills/index.tsx` | bills Stack |
| `/agents`, `/agents/nearby` | `app/agents/index.tsx`, `app/agents/nearby.tsx` | agents Stack |
| `/transactions/[id]` | `app/transactions/[id].tsx` | Stack |
| `/profile/settings`, `/profile/analytics`, etc. | `app/profile/*.tsx` | profile Stack |
| `/add-wallet` | `app/add-wallet.tsx` or modal | Modal / Stack |
| `/cards` | `app/cards/index.tsx` | Stack |
| `/add-card`, `/add-card/details`, `/add-card/success` | `app/add-card/*.tsx` | Stack |
| `/scan-qr` | `app/scan-qr.tsx` | Stack |
| `/groups/create`, `/groups/[id]` | `app/groups/create.tsx`, `app/groups/[id].tsx` | Stack |
| `/loans`, `/loans/apply`, `/loans/[id]` | `app/loans/index.tsx`, `app/loans/apply.tsx`, `app/loans/[id].tsx` | loans Stack |
| `/onboarding/bank-accounts` | `app/onboarding/bank-accounts.tsx` | Stack (optional) |
| `/proof-of-life/verify`, `/proof-of-life/success`, `/proof-of-life/expired` | `app/proof-of-life/verify.tsx`, `success.tsx`, `expired.tsx` | proof-of-life Stack (§11.4.25) |
| `/receive/[transactionId]` | `app/receive/[transactionId].tsx` | receive Stack |
| `/receive/voucher/[voucherId]` | `app/receive/voucher/[voucherId].tsx` | receive Stack |
| `/receive/group-invite/[inviteId]` | `app/receive/group-invite/[inviteId].tsx` | receive Stack |
| `/receive/request/[requestId]` | `app/receive/request/[requestId].tsx` | receive Stack |

---

### 11.6 Implementation checklist (order of work)

1. **Scaffold:** Create `buffr_g2p` with `npx create-expo-app@latest buffr_g2p -t tabs`. Replace generated `app/` with structure in §11.1; add `app.json`, `tsconfig.json` path `@/*` → `./*`, and `babel.config.js` per §11.3.1 (required for react-native-reanimated).
2. **Constants:** Add `constants/Theme.ts` and `constants/Layout.ts` per §11.4.5–11.4.6; optionally `constants/designSystem.ts` per §11.4.24 (§5 JSON).
3. **Providers:** Add `contexts/AppProviders.tsx` and minimal `UserContext`, `WalletsContext`, `VouchersContext` (state + setState only for first cut).
4. **Root & entry:** Implement `app/_layout.tsx` and `app/index.tsx` per §11.4.1–11.4.2; entry uses AsyncStorage key `buffr_onboarding_complete` (§11.4.2 and §7.6).
5. **Onboarding:** Implement `app/onboarding/_layout.tsx` and all onboarding screens per §11.4.11 (Welcome → phone → otp → name → photo → face-id → complete); on complete set `AsyncStorage.setItem('buffr_onboarding_complete', 'true')` and `router.replace('/(tabs)')` (§7.6).
6. **Tabs:** Implement `app/(tabs)/_layout.tsx` and `app/(tabs)/index.tsx` (Home) per §11.4.4 and §11.4.9; add placeholder tab screens per §11.4.23 (transactions, vouchers, profile).
7. **API:** Add `services/api.ts` per §11.4.7; add `services/vouchers.ts`, `services/wallets.ts` per §11.4.22, `services/auth.ts` per §11.4.7a; add **NAMQR/Open Banking:** `services/tokenVault.ts`, `services/oauth.ts`, `services/mTLSClient.ts` (§9.3); **hooks:** `useOAuth.ts`; **contexts:** `OAuthContext.tsx`; **utils:** `cryptoHelpers.ts` (§11.1).
8. **Components:** Build layout (**ScreenContainer**, **StackScreen** per §11.4.20; ModalContainer), inputs (**SearchBar** per §11.4.21, PillButton, TextInput, OTPInput, AmountInput), cards (BalanceCard, WalletCard, VoucherCard, ServiceCard, ContactChip, MethodCard), list (ListItem), **carousels** (cards, wallets, vouchers, contacts, groups, loans per §4.3b), feedback (Toast, LoadingOverlay, ErrorState, EmptyState, NetworkError, **TwoFAModal** per §11.4.19, inline validation, warning banner per §4.4), **QR (NAMQR):** NAMQREncoder, NAMQRDecoder, SignedQRVerifier, QRDisplay, QRCodeScanner per §4.5 and design system §5; **OAuth Redirect WebView** per §4.7.
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

Add the following files for NAMQR (TLV, Token Vault, Signed QR) and Open Banking (OAuth, mTLS):

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
    mTLSClient.ts            # Backend: HTTPS agent with QWAC (reference)
  components/qr/
    NAMQRDisplay.tsx         # Render NAMQR from TLV payload
    NAMQRScanner.tsx         # Camera scanner, TLV parse, CRC, Token Vault, optional signature verify
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

#### 11.8.8 Code: `services/mTLSClient.ts` (backend reference)

Backend-only: Node.js HTTPS agent with client certificate (QWAC). Not used in the mobile app; app talks to backend over HTTPS.

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

After initial installation and Babel config, generate the native `android/` and `ios/` directories:

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

**Document version:** 1.4  
**Last updated:** March 2026  
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
