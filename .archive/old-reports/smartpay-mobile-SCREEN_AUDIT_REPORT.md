# Screen & Navigation Audit Report
**Project:** SmartPay Mobile  
**Date:** March 18, 2026  
**Conducted by:** AI Agent  

---

## Executive Summary

This audit reviewed **87 route files** across the SmartPay mobile app to assess screen completeness, navigation structure, and user flow coverage. The app shows a **dual navigation structure** (legacy and new authenticated architecture) with **several incomplete screens** and **missing critical user flows**.

**Key Findings:**
- ✅ **Core flows** (Send Money, Cash Out, KYC, Proof of Life) are **mostly complete**
- ⚠️ **2 stub screens** with explicit TODOs requiring implementation
- 🚫 **Missing screens**: Bills, Transaction Details, Request Money, Recurring Payments, Help/Support
- 🔀 **Dual navigation systems** causing potential routing confusion
- 📱 **Inconsistent screen states** (loading, error, empty) across routes

---

## 1. Route Structure Overview

### Route Tree
```
app/
├── index.tsx                          [Entry point - routing logic]
├── _layout.tsx                        [Root layout with providers]
│
├── (auth)/                            [Auth group - NEW STRUCTURE]
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── sign-in.tsx                    ✅ Complete
│   └── sign-up.tsx                    ✅ Complete
│
├── (onboarding)/                      [Onboarding group - NEW]
│   ├── _layout.tsx
│   └── index.tsx                      ✅ Complete (welcome slides)
│
├── (authenticated)/                   [Main authenticated app - NEW]
│   ├── _layout.tsx                    ✅ Syncs profile, providers
│   │
│   ├── (tabs)/                        [Tab navigation - 4 tabs]
│   │   ├── _layout.tsx
│   │   ├── index.tsx                  ✅ Home dashboard
│   │   ├── copilot/                   ✅ Copilot chat
│   │   ├── transfers.tsx              ⚠️  Redirects to Copilot (stub)
│   │   ├── activity.tsx               ✅ Transaction list
│   │   └── invest.tsx                 ⚠️  Placeholder (coming soon)
│   │
│   ├── (modals)/                      [Modal routes]
│   │   ├── _layout.tsx
│   │   ├── account.tsx                ✅ Account modal
│   │   ├── biometric-settings.tsx    ✅ Biometric settings
│   │   └── lock.tsx                   ✅ Lock screen
│   │
│   ├── profile/
│   │   ├── index.tsx                  ✅ Profile view
│   │   ├── edit-profile.tsx           ✅ Edit profile
│   │   └── settings.tsx               ✅ Settings
│   │
│   ├── wallets/
│   │   ├── index.tsx                  ✅ Wallet list
│   │   ├── add.tsx                    ✅ Add wallet
│   │   └── [id]/index.tsx             ✅ Wallet detail
│   │
│   ├── cash-out/
│   │   ├── index.tsx                  ✅ Method selection hub
│   │   ├── atm.tsx                    ✅ ATM withdrawal
│   │   ├── bank.tsx                   ✅ Bank transfer
│   │   ├── till.tsx                   ✅ Till cash-out
│   │   ├── confirm.tsx                🚫 TODO: Stub screen
│   │   └── success.tsx                ✅ Success screen
│   │
│   ├── banking/
│   │   ├── link-bank.tsx              ✅ Bank selection
│   │   ├── consent-review.tsx         ✅ Consent flow
│   │   ├── oauth-callback.tsx         ✅ OAuth redirect
│   │   ├── linked-accounts.tsx        ✅ Linked accounts list
│   │   └── account-details/[id].tsx   ✅ Bank account detail
│   │
│   ├── groups/
│   │   ├── index.tsx                  ✅ Groups list
│   │   ├── create.tsx                 ✅ Create group
│   │   ├── [id]/index.tsx             ✅ Group detail
│   │   └── [id]/split.tsx             ✅ Split expense
│   │
│   ├── kyc.tsx                        ✅ KYC submission
│   ├── kyc/intro.tsx                  ✅ KYC intro
│   ├── proof-of-life/intro.tsx        ✅ Proof of Life intro
│   ├── scan-qr/index.tsx              ✅ QR scanner
│   ├── qr-code/index.tsx              ✅ Show QR code
│   ├── receive/index.tsx              ✅ Receive money
│   ├── receive/qr.tsx                 ✅ Receive via QR
│   ├── invite/index.tsx               ✅ Invite friends
│   ├── pay-merchant/confirm.tsx       🚫 TODO: Stub screen
│   └── location-finder-example.tsx    ⚠️  Example/demo file
│
├── (tabs)/                            [OLD TAB STRUCTURE - LEGACY]
│   ├── _layout.tsx                    ⚠️  Different tab config
│   ├── home/index.tsx                 ✅ Old home screen
│   ├── activity/index.tsx             ✅ Old activity screen
│   ├── copilot/                       ✅ Old copilot
│   ├── transactions.tsx               ⚠️  Hidden tab
│   ├── wallets.tsx                    ⚠️  Hidden tab
│   └── profile.tsx                    ⚠️  Hidden tab
│
├── onboarding/                        [OLD ONBOARDING FLOW]
│   ├── index.tsx                      ⚠️  Legacy onboarding
│   ├── phone.tsx                      ✅ Phone entry
│   ├── otp.tsx                        ✅ OTP verification
│   ├── pin.tsx                        ✅ PIN setup
│   ├── name.tsx                       ✅ Name entry
│   ├── photo.tsx                      ✅ Photo upload
│   ├── faceid.tsx                     ✅ Face ID setup
│   └── complete.tsx                   ✅ Onboarding complete
│
├── send-money/                        [SEND MONEY FLOW - OUTSIDE AUTH]
│   ├── _layout.tsx
│   ├── index.tsx                      → Redirects to select-recipient
│   ├── select-recipient.tsx           ✅ Recipient selection
│   ├── amount.tsx                     ✅ Amount entry
│   ├── confirm.tsx                    ✅ Confirm & 2FA
│   ├── success.tsx                    ✅ Success screen
│   └── scan-qr.tsx                    ✅ QR scanning
│
├── agents/index.tsx                   ✅ Agent finder
├── loans/index.tsx                    ✅ Loan offers
├── voucher/index.tsx                  ✅ Voucher redemption
├── cash-out/index.tsx                 ✅ Legacy cash-out
├── notifications.tsx                  ✅ Notifications list
├── notifications-settings.tsx         ✅ Notification settings
├── login.tsx                          ⚠️  Legacy login
├── signup.tsx                         ⚠️  Legacy signup
├── verify/[phone].tsx                 ✅ Phone verification
├── lock.tsx                           ✅ Lock screen
├── proof-of-life/index.tsx            ✅ Proof of Life
├── modal.tsx                          ⚠️  Generic modal
├── modals/copilot-confirm.tsx         ✅ Copilot confirmation
├── +html.tsx                          ✅ HTML template
└── +not-found.tsx                     ✅ 404 page
```

---

## 2. Stub/Incomplete Screens

### 🚫 Screens with Explicit TODOs

| File | Status | Issue | Priority |
|------|--------|-------|----------|
| `(authenticated)/cash-out/confirm.tsx` | **Stub** | TODO: Implement confirmation flow for cash-out at agents/tills | **HIGH** |
| `(authenticated)/pay-merchant/confirm.tsx` | **Stub** | TODO: Implement confirmation flow for merchant payments | **HIGH** |

### ⚠️ Placeholder/Coming Soon Screens

| File | Status | Description | Priority |
|------|--------|-------------|----------|
| `(authenticated)/(tabs)/invest.tsx` | **Placeholder** | "Savings and investment options coming soon" | **MEDIUM** |
| `(authenticated)/(tabs)/transfers.tsx` | **Redirect** | Redirects to Copilot (no standalone UI) | **LOW** |

### ⚠️ Screens with Mock/Hardcoded Data

| File | Issue | Priority |
|------|-------|----------|
| `agents/index.tsx` | Hardcoded agent list (not fetching from API) | **MEDIUM** |
| `loans/index.tsx` | Hardcoded loan offers (not fetching from API) | **MEDIUM** |

---

## 3. Missing Screens (High Priority)

Based on fintech best practices and user flow analysis:

### 🚫 Critical Missing Screens

| Screen | Description | User Need | Priority |
|--------|-------------|-----------|----------|
| **Transaction Detail** | Individual transaction view with receipt | View transaction history details | **CRITICAL** |
| **Bill Payments** | Pay utilities (electricity, water, internet) | Essential fintech feature | **HIGH** |
| **Request Money** | Request payment from another user | Complete P2P flow | **HIGH** |
| **Recurring Payments** | Set up scheduled/recurring transfers | Convenience for regular payments | **MEDIUM** |
| **Airtime/Data Purchase** | Buy airtime or data bundles | Common use case in Namibia | **HIGH** |
| **Card Management** | View/manage virtual or physical cards | If cards are issued | **MEDIUM** |
| **Payment History by Category** | Filter transactions by type/category | Better financial tracking | **MEDIUM** |
| **Help & Support** | FAQ, contact support, live chat | User assistance | **HIGH** |
| **Terms & Conditions** | Legal documents | Compliance requirement | **MEDIUM** |
| **Privacy Policy** | Privacy policy document | Compliance requirement | **MEDIUM** |
| **Split Payment Request** | Request split payment from group members | Group payments feature | **LOW** |
| **Security Settings** | Change PIN, security preferences | Account security | **HIGH** |
| **Language Settings** | Change app language (English, Oshiwambo, etc.) | Accessibility | **MEDIUM** |
| **Export Statement** | Download transaction history | Financial record keeping | **LOW** |
| **Proof of Life FAQ** | Detailed PoL information | User education | **LOW** |

---

## 4. Navigation Issues

### 🔀 Dual Navigation Systems

**Problem:** Two parallel tab structures exist:
1. **New:** `(authenticated)/(tabs)/` - 4 tabs (Home, Copilot, Transfers, Activity, Invest)
2. **Old:** `(tabs)/` - 3 visible tabs (Home, Activity, Copilot) + 3 hidden

**Impact:**
- Routing confusion
- Potential dead code
- Inconsistent user experience
- Maintenance overhead

**Recommendation:** Remove legacy `(tabs)/` structure after confirming all functionality is migrated to `(authenticated)/(tabs)/`.

---

### 🔗 Orphaned Routes (Not Linked)

Routes that exist but may not be accessible via navigation:

| Route | Issue | Action |
|-------|-------|--------|
| `(authenticated)/(modals)/account.tsx` | Modal - unclear trigger | Verify modal trigger |
| `(authenticated)/location-finder-example.tsx` | Example/demo file | Remove if not used |
| `lock.tsx` (root level) | Duplicate of modal lock? | Consolidate |
| `login.tsx`, `signup.tsx` (root level) | Legacy auth screens | Remove if deprecated |

---

### 📱 Deep Linking Gaps

Missing or incomplete deep link handlers for:
- Transaction receipts (share via link)
- Group payment requests
- Voucher redemption links
- Agent location links
- Profile sharing

---

## 5. Screen Completeness Matrix

| Screen | Layout | Loading | Error | Empty | Nav | A11y | Status |
|--------|--------|---------|-------|-------|-----|------|--------|
| Home (authenticated) | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ | **Good** |
| Send Money Flow | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | **Excellent** |
| Cash Out Confirm | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ❌ | **Stub** |
| Pay Merchant Confirm | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ❌ | **Stub** |
| KYC Flow | ✅ | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | **Good** |
| Proof of Life | ✅ | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | **Good** |
| Banking Integration | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ | **Good** |
| Groups | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | **Excellent** |
| Wallets | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | **Excellent** |
| Activity | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | **Good** |
| Profile | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ⚠️ | **Fair** |
| Notifications | ✅ | ❌ | ⚠️ | ✅ | ✅ | ⚠️ | **Good** |
| Loans | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | **Fair** |
| Agents | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | **Fair** |
| Voucher | ✅ | ❌ | ⚠️ | ❌ | ✅ | ⚠️ | **Fair** |

**Legend:**
- ✅ Complete & Production-ready
- ⚠️ Partial implementation
- ❌ Missing or not implemented

---

## 6. User Flow Gaps

### Onboarding Flow
**Status:** ✅ **Complete**
- Welcome slides → Phone verification → OTP → PIN setup → Name → Photo → Face ID → Complete

**Issues:**
- Two onboarding implementations (old & new)
- Inconsistent navigation after completion

---

### Authentication Flow
**Status:** ✅ **Complete**
- Sign in → 2FA → Home
- Sign up → Phone verification → OTP → PIN → Home

**Issues:**
- Legacy login/signup screens still exist

---

### Send Money Flow
**Status:** ✅ **Complete**
- Select recipient → Enter amount → Confirm → 2FA → Success

**Missing:**
- Transaction receipt (shareable)
- Recent recipient quick action

---

### Cash Out Flow
**Status:** ⚠️ **Incomplete**
- Method selection → [Method-specific screen] → Confirm → Success

**Missing:**
- `confirm.tsx` implementation (stub)
- Error handling for failed cash-out
- Receipt screen

---

### Pay Merchant Flow
**Status:** 🚫 **Stub**
- QR scan → Confirm → Success

**Missing:**
- `confirm.tsx` implementation (stub)
- Merchant payment history
- Receipt screen

---

### KYC Flow
**Status:** ✅ **Complete**
- Intro → Form submission → Status check

**Missing:**
- Document upload screen (if required)
- Rejection flow with resubmission

---

### Proof of Life Flow
**Status:** ✅ **Complete**
- Intro → Copilot verification → Success

**Missing:**
- Manual verification option (non-Copilot)
- PoL history/timeline

---

### Group Payment Flow
**Status:** ✅ **Complete**
- Groups list → Create/Join group → Group detail → Split expense → Success

**Missing:**
- Payment request flow
- Group payment history by member

---

### Banking Integration Flow
**Status:** ✅ **Complete**
- Link bank → Consent review → OAuth → Linked accounts → Account details

**Missing:**
- Re-linking expired accounts
- Bank transaction sync status

---

### Wallet Management Flow
**Status:** ✅ **Complete**
- Wallet list → Add wallet → Wallet detail → Transactions

**Missing:**
- Wallet-to-wallet transfer
- Wallet archiving/deletion

---

## 7. Recommendations (Priority Order)

### 🚨 Critical (Week 1)

1. **Implement Cash-Out Confirmation Screen**
   - File: `(authenticated)/cash-out/confirm.tsx`
   - Requirements: Agent/till info display, amount confirmation, PIN/2FA, success flow
   - Estimate: 8-12 hours

2. **Implement Pay-Merchant Confirmation Screen**
   - File: `(authenticated)/pay-merchant/confirm.tsx`
   - Requirements: Merchant info display, amount confirmation, PIN/2FA, success flow
   - Estimate: 8-12 hours

3. **Add Transaction Detail Screen**
   - File: `(authenticated)/transactions/[id]/index.tsx` (new)
   - Requirements: Transaction details, receipt view, share receipt, support contact
   - Estimate: 12-16 hours

4. **Add Security Settings Screen**
   - File: `(authenticated)/profile/security.tsx` (new)
   - Requirements: Change PIN, biometric toggle, session management
   - Estimate: 8-12 hours

---

### ⚠️ High Priority (Week 2-3)

5. **Build Bill Payments Flow**
   - Files: `(authenticated)/bills/` (new directory)
   - Requirements: Biller selection, account entry, amount, confirmation, history
   - Estimate: 24-32 hours

6. **Build Request Money Flow**
   - Files: `(authenticated)/request-money/` (new directory)
   - Requirements: Recipient selection, amount, request sent, request received, payment
   - Estimate: 16-24 hours

7. **Add Help & Support Section**
   - File: `(authenticated)/support/index.tsx` (new)
   - Requirements: FAQ, contact forms, live chat integration, ticket history
   - Estimate: 16-20 hours

8. **Implement Airtime/Data Purchase**
   - File: `(authenticated)/airtime/index.tsx` (new)
   - Requirements: Provider selection, number entry, package selection, confirmation
   - Estimate: 12-16 hours

9. **Remove Duplicate/Legacy Routes**
   - Action: Clean up old `(tabs)/`, `onboarding/`, `login.tsx`, `signup.tsx`
   - Requirements: Migrate any missing functionality, update routing
   - Estimate: 8-12 hours

---

### 📋 Medium Priority (Week 4-6)

10. **Add Recurring Payments**
    - File: `(authenticated)/recurring/index.tsx` (new)
    - Requirements: Schedule setup, frequency selection, payment management
    - Estimate: 20-24 hours

11. **Improve Error States Across All Screens**
    - Action: Add error boundaries, retry logic, user-friendly error messages
    - Requirements: Design system error components, error tracking
    - Estimate: 16-20 hours

12. **Add Empty States Where Missing**
    - Action: Review all list screens, add empty state designs
    - Estimate: 8-12 hours

13. **Build Card Management (if applicable)**
    - File: `(authenticated)/cards/index.tsx` (new)
    - Requirements: Card list, card details, freeze/unfreeze, limits
    - Estimate: 16-24 hours

14. **Add Terms, Privacy Policy, Legal Screens**
    - Files: `(authenticated)/legal/` (new directory)
    - Requirements: Markdown/HTML rendering, versioning, user acceptance tracking
    - Estimate: 8-12 hours

15. **Implement Export Statement Feature**
    - File: Integration into existing screens
    - Requirements: Date range selection, format selection (PDF/CSV), download
    - Estimate: 12-16 hours

---

### 🔧 Low Priority (Backlog)

16. **Add Language Settings**
    - File: `(authenticated)/profile/language.tsx` (new)
    - Requirements: Language selection, i18n integration
    - Estimate: 16-24 hours (includes i18n setup)

17. **Add Proof of Life FAQ**
    - File: `(authenticated)/proof-of-life/faq.tsx` (new)
    - Requirements: FAQ content, collapsible sections
    - Estimate: 4-6 hours

18. **Build Investment/Savings Feature**
    - File: `(authenticated)/(tabs)/invest.tsx` (replace stub)
    - Requirements: Product research, investment options, tracking
    - Estimate: 40+ hours

19. **Improve Accessibility (A11y)**
    - Action: Add screen reader labels, keyboard navigation, contrast checks
    - Estimate: 20-30 hours

20. **Add Deep Linking for All Major Flows**
    - Action: Configure deep link handlers, test all flows
    - Estimate: 12-16 hours

---

## 8. Architecture Recommendations

### Navigation Cleanup
- **Remove legacy `(tabs)/` structure** after confirming feature parity
- **Consolidate onboarding flows** (remove old `onboarding/` directory)
- **Remove duplicate auth screens** (`login.tsx`, `signup.tsx` at root)
- **Standardize layout patterns** across all authenticated screens

### Screen State Management
- **Create reusable state components**: LoadingState, ErrorState, EmptyState
- **Implement error boundaries** at route group level
- **Add retry logic** for failed API calls
- **Standardize loading indicators** using design system

### Component Library
- **Extract common patterns** (confirmation screens, success screens, form layouts)
- **Build reusable templates** for list screens, detail screens, form screens
- **Create screen-level HOCs** for auth checking, feature flags, analytics

### Testing & Quality
- **Add E2E tests** for critical user flows (send money, cash out, KYC)
- **Implement screen snapshots** for visual regression testing
- **Add navigation tests** to catch broken links/routing issues
- **Monitor screen performance** (render times, bundle sizes)

---

## 9. Security Concerns

### Unprotected Routes
- ✅ All authenticated routes properly wrapped in `(authenticated)/` group
- ⚠️ Check if `lock.tsx` at root level is secure

### Missing Security Features
- 🚫 No session timeout implementation visible
- 🚫 No suspicious activity detection
- 🚫 No device management screen

---

## 10. Performance Concerns

### Large Screens
Screens with 500+ lines of code may need refactoring:
- `(authenticated)/banking/consent-review.tsx` (538 lines)
- `(authenticated)/cash-out/bank.tsx` (553 lines)
- `(authenticated)/(modals)/biometric-settings.tsx` (586 lines)

**Recommendation:** Extract components, split into smaller modules.

---

## Appendix A: Route Categories

### By Feature
- **Auth:** 4 screens (sign-in, sign-up, verify, lock)
- **Onboarding:** 8 screens (2 flows: old & new)
- **Home/Dashboard:** 2 screens (old & new)
- **Send Money:** 5 screens (complete flow)
- **Cash Out:** 6 screens (1 stub)
- **Banking:** 5 screens (complete)
- **Groups:** 4 screens (complete)
- **Wallets:** 3 screens (complete)
- **Profile:** 3 screens (complete)
- **KYC:** 2 screens (complete)
- **Proof of Life:** 1 screen (complete)
- **Notifications:** 2 screens (complete)
- **Other:** 12 screens (loans, agents, vouchers, etc.)

### By Completeness
- ✅ **Production-ready:** ~52 screens (60%)
- ⚠️ **Partial/Fair:** ~23 screens (26%)
- 🚫 **Stub/Missing:** ~12 screens (14%)

---

## Appendix B: File Organization Issues

### Inconsistencies
1. Some flows are in `app/` root (e.g., `send-money/`)
2. Others are in `(authenticated)/` (e.g., `cash-out/`, `groups/`)
3. No clear pattern for when to use authenticated vs root level

**Recommendation:** Move all authenticated flows inside `(authenticated)/` for consistency.

---

## Conclusion

The SmartPay mobile app has a **solid foundation** with most core flows implemented. However, there are **critical gaps** that need immediate attention:

1. **Implement stub screens** (cash-out confirm, pay-merchant confirm)
2. **Add missing critical screens** (transaction detail, bills, request money, help)
3. **Clean up navigation** (remove legacy routes, consolidate flows)
4. **Improve screen states** (error, loading, empty) across all routes
5. **Enhance accessibility** and performance

**Estimated Total Work:** ~200-300 hours to complete all high and medium priority items.

**Recommended Team:** 2-3 developers over 4-6 weeks to complete critical and high-priority items.

---

**Next Steps:**
1. Review and prioritize recommendations with product team
2. Create detailed tickets for stub screen implementations
3. Design missing screens (bills, transaction detail, request money)
4. Plan navigation cleanup sprint
5. Set up E2E tests for critical flows

