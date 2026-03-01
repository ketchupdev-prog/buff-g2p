# Buffr G2P App – Flows, Navigation & UX Consistency Audit

**Reference:** PRD v1.10 (or latest)  
**Audit date:** February 2026  
**Objective:** Verify every flow, navigation, action, screen, and user interaction is correctly implemented, leads to the intended destination, and delivers a consistent user experience. Identify missing screens/modals/steps and propose a fix plan.

## Scope (PRD as single source of truth)

| Area | PRD Reference | Audited |
|------|----------------|--------|
| All screens & routes | §3 (Complete Screen Inventory) | Yes |
| All user flows (step-by-step) | §3.12.2, §7 | Yes |
| Tab bar, stack headers, modals, back navigation | §6.4 | Yes |
| Actions & CTAs (buttons, pills, links) | §4.2, §4.7 | Yes |
| Error & empty states | §4.4, per-screen table | Yes |
| QR & NAMQR compliance | §4.5, §11.8 | Yes |
| Receiver flows | §3.9, §7.6.1–7.6.4 | Yes |
| Proof-of-life | §2.4, §3.6 screens 50b/58–61, §7.6.5 | Yes |
| Loans | §2.3, §3.6 screen 40, §7.7, §11.4.18 | Yes |
| Groups | §3.6 screens 47b–47c-vii, §7.6.3, §11.4.28 | Yes |
| Add Card Flow | §3.14.1, §3.12.2 | Yes |
| Home Search | §3.14.1 | Yes |
| Wallet Cash-Out (5 methods) | §3.3, §7.3, §7.6 | Yes |
| Voucher Redemption (3 methods) | §3.2, §7.2, §7.6 | Yes |
| Consistency (success screens, 2FA, error toasts) | §5.1, §18.2–18.20 | Yes |
| Offline & edge cases | §11.12–11.21, §11.20 | Yes |
| Implementation status & improvement areas | §3.13.1, §3.13.2 | Yes |
| Flow-to-Design Alignment | §3.14 | Yes |

*Audit method: code and PRD cross-reference. In-device “walk the app” (simulator) recommended for final CTA/back verification.*

---

## A. Correctly Implemented Flows

| Flow | PRD ref | Implementation | Notes |
|------|--------|----------------|-------|
| **Onboarding** | §3.12.2 | `/onboarding` (phone → OTP → name → photo → face-id → complete) → `router.replace('/(tabs)')` | Full sequence; completion replaces to Home. |
| **Send Money (P2P)** | §3.12.2 | Select recipient (27) → Amount (28) → Receiver details (27b) → Confirm + 2FA (29) → Success (30) | Receiver details and 2FA (inline PIN) before send; success uses SuccessIcon. |
| **Add Card** | §3.12.2, §3.14 | `/add-card` → Scan / Add Card + → `/add-card/scan` or `/add-card/details` → `/add-card/success` | Design-aligned; "Enter manually instead" from scan → details. |
| **Home – balance & search** | §3.14.1 | "+ Add" pill → add-money or wallets; search filters Services, Recent transactions, Recent contacts | Pill label and search behaviour per PRD. |
| **Voucher – Redeem to Wallet** | §3.12.2 | Voucher list → Detail (9) → 2FA modal → Wallet success | 2FA modal on voucher detail; redeem to wallet success. |
| **Voucher – NamPost / SmartPay** | §3.12.2 | Detail → NamPost/SmartPay → branch/unit → Collection code (NAMQR) → 2FA → Success | NAMQR display and flow present. |
| **Cash-out (Till/Agent/Merchant/ATM)** | §3.12.2 | Wallet/Cash-out hub → method screen → scan payee NAMQR → 2FA → Success | Token Vault `validateQR` used in scan-qr; cash-out success screen. |
| **Cash-out – Bank Transfer** | §3.12.2 | Cash-out hub → Bank (22) → 2FA → Success | Bank transfer route and success. |
| **Proof-of-Life** | §3.6, §3.12.2 | Banner on Home (58) when due ≤14 days → Verify (59) → Success (60) / Expired (61) | Banner, verify, success, expired routes; frozen redirect to expired. |
| **Receiver – Transaction receipt** | §3.9 | `/receive/[transactionId]` – receipt, share, Back to Home | Deep-linkable receipt. |
| **Receiver – Voucher / Request / Group invite** | §3.9 | `/receive/voucher/[voucherId]`, `/receive/request/[requestId]`, `/receive/group-invite/[inviteId]` | Parameterised receive screens. |
| **Transaction detail consistency** | §3.15 | Wallet detail & Wallet History link to `/(tabs)/transactions/[id]` | Single transaction-detail route. |
| **QR Scanner** | §4.5, §11.8 | TLV parse, Tag 63 presence check, Token Vault `validateQR`; error toast on invalid/CRC failure | NAMQR path and API validation in place. |

---

## B. Issues & Discrepancies

| # | Location (screen/route, flow step) | PRD Reference | Observed Behaviour | Expected Behaviour | Severity | Suggested Fix |
|---|-----------------------------------|---------------|--------------------|--------------------|----------|---------------|
| B1 | Home → +Add / Wallet Detail → Add funds | §3.4 screen 26, §3.6, §3.11 | Tapping "+ Add" or "Add Money" navigates to full screen `/wallets/[id]/add-money` | Should open **bottom sheet modal** with 3 methods: Bank Transfer, Debit Card, Redeem Voucher (from Home or Wallet Detail) | High | Implement `AddMoneyModal` (bottom sheet); wire from Home pill and Wallet nav; keep full-screen add-money as one method or redirect from modal. |
| B2 | Agent Network, Receive, stack entry screens (back button) | §6.4 | `HeaderBackButton` and many headers use only `router.back()` | When history is empty (e.g. deep link), back should `router.replace('/(tabs)')` so user reaches Home | Medium | In `HeaderBackButton`: `onPress` = `router.canGoBack() ? router.back() : router.replace('/(tabs)')`. Apply same to Agent Network `onBackPress`. |
| B3 | Group Send / Group Request (before success) | §3.12.2 steps 3–4 | No 2FA step before group send or request | Flow should include "2FA Modal | 48" before Group Payment Success / Group Request Success | High | Add 2FA (PIN modal or inline) before calling group send/request API; on success navigate to existing success screens. |
| B4 | Loan Apply | §3.12.2 | Loan apply uses biometric step; no explicit "2FA Modal (48)" | PRD lists "2FA Modal | 48" in Loan – Apply flow | Low | Confirm with product: biometric (Face ID) counts as 2FA; if not, add PIN step before API submit. |
| B5 | Voucher detail – expired | §11.20 | When expired, app shows "Voucher Expired" state (no Redeem button) | PRD suggests "Redeem button disabled, tooltip 'Expired on [date]'" | Low | Optional: add tooltip/accessibility hint with expiry date; or keep current UX and document in PRD. |
| B6 | QR Scanner – CRC | §4.5, §11.8 | Client checks only for presence of Tag 63 in payload | Full NAMQR CRC (Tag 63) byte-level verification where specified | Medium | Implement client-side CRC16/CCITT-FALSE over payload up to Tag 63, or rely on server and document; show clear error on server CRC failure. |
| B7 | Success screens – Confetti | §5.1, consistency | Send success and voucher redeem wallet use Confetti; others use SuccessIcon only | PRD suggests confetti only for "first time" or consistent pattern per §5.1 | Low | Standardise: SuccessIcon everywhere; confetti only on first-time completion per flow (requires persistence). |

---

## C. Missing Screens / Sub-screens

| # | Screen / route | PRD ref | Notes |
|---|----------------|---------|--------|
| C1 | **Receive landing / index** | §3.9, §7.6.1 | Home "Receive" tile links to `/receive`. There is no `app/receive/index.tsx`. Receive stack has only parameterised routes (`[transactionId]`, `voucher/[voucherId]`, etc.). User tapping Receive may see blank or undefined behaviour. | **Add** `receive/index.tsx`: e.g. "Receive Money" landing with short copy and link to transactions/vouchers, or redirect to a default (e.g. transactions) until deep links drive specific receive screens. |
| C2 | **Add Money Modal** (as modal) | §3.4 screen 26, §3.11 | PRD explicitly requires Add Money as **bottom sheet** with 3 methods. Currently only full-screen add-money exists. | Implement modal (see B1). |
| C3 | **Proof-of-life reminder modal (50b)** | §3.6, §3.12.1 | PRD lists modal 50b (Proof-of-life reminder). In-app flow uses inline banner (58) and verify/success/expired screens. | If 50b is an additional reminder (e.g. modal when app opens and due soon), add it; otherwise document that 58 banner covers the reminder. |
| C4 | **Request Status modal (47c-vii)** | §3.13.1 | PRD §3.13.1 says "Request Status modal (47c-vii) – Modal from Group detail". | Verify `RequestStatusModal` is wired from group detail "View status" on request cards; if not, connect it. |

---

## D. Consistency Gaps

| # | Gap | Details |
|---|-----|--------|
| D1 | **Back navigation** | Screens using `HeaderBackButton` or custom `router.back()` do not implement "when history empty → replace to (tabs)". Agent Network and other entry points should use `router.canGoBack() ? router.back() : router.replace('/(tabs)')`. |
| D2 | **2FA pattern** | Send money uses **inline** PIN on confirm screen; voucher detail uses **modal** PIN. Group send/request have **no** 2FA. Standardise: introduce shared TwoFAModal (or reuse voucher-style modal) and use it for send, voucher, group send, group request, cash-out, merchant pay, loan apply where required. |
| D3 | **Success screens** | SuccessIcon used consistently; Confetti only on some success screens. Decide one pattern (e.g. SuccessIcon + optional Confetti for first-time only) and apply everywhere. |
| D4 | **Error / empty components** | PRD §4.4 references error and empty states. Codebase has `ErrorWithRetry`, `OfflineBanner`; no shared `ErrorState` / `EmptyState` / `LoadingOverlay` by those names. Consider naming and reusing these for list/detail empty and error states. |

---

## E. Edge Cases Not Handled

| # | Scenario | PRD ref | Current state | Recommendation |
|---|----------|---------|---------------|----------------|
| E1 | **Network loss mid-transaction** | §11.20 | No offline queue; no "Transaction queued" toast or local DB for pending tx | Implement offline queue and idempotency keys (§11.12); show toast and retry on reconnect. |
| E2 | **2FA consecutive failures** | §11.20 | No lockout or countdown after 3 wrong PINs | Backend should return 429 + Retry-After; frontend should disable PIN input and show countdown. |
| E3 | **Expired voucher – redeem button** | §11.20 | Expired vouchers show "Voucher Expired" state (no button). PRD suggests disabled button + tooltip | Either add disabled Redeem + tooltip "Expired on [date]" or keep current and document. |
| E4 | **QR scan – invalid or expired** | §4.5 | Scanner shows error toast and allows retry | Implemented. Ensure Token Vault failure message is clear. |
| E5 | **Token Vault / API unavailable** | – | `validateQR` returns error; no offline fallback for QR validation | Document; consider user-facing message: "Validation unavailable. Try again later." |
| E6 | **Offline architecture** | §11.12 | No formal offline-first model, local SQLite, or pending queue | Plan per §3.13.2: offline architecture, sync strategy, idempotency keys. |
| E7 | **Push notifications & deep links** | §11.13 | No push token registration or deep-link handling documented in code | Implement expo-notifications, token registration, and route incoming payment/voucher/request to `/receive/...` screens. |
| E8 | **Deep link → back with no history** | §6.4 | Navigating to a screen via deep link then tapping back uses `router.back()` only; no history → user may see blank or stay on same screen | Back should fall back to Home: `router.canGoBack() ? router.back() : router.replace('/(tabs)')` (same fix as B2/D1). |

---

## F. Proposed Fix Plan

| Priority | Item | Effort (S/M/L) | Dependencies | Assigned To |
|----------|------|----------------|--------------|-------------|
| 1 | Add Money as bottom sheet modal (B1, C2) | M | None | – |
| 1 | Group Send / Group Request 2FA (B3) | S | None | – |
| 1 | Receive index/landing screen (C1) | S | None | – |
| 2 | Back navigation fallback to Home (B2, D1) | S | None | – |
| 2 | Shared TwoFAModal and use in all flows (B3, D2) | M | None | – |
| 2 | QR CRC verification (B6) – client or document server-only | S | NAMQR spec | – |
| 3 | 2FA lockout (429 + countdown) (E2) | M | Backend 429 + Retry-After | Backend + App |
| 3 | Offline queue + idempotency (E1, E6) | L | Backend idempotency support | – |
| 3 | Request Status modal wired from group detail (C4) | S | None | – |
| 3 | Push notifications + deep links (E7) | L | Backend payload schema | – |
| 3 | Standardise success (Confetti/SuccessIcon) (B7, D3) | S | None | – |
| 3 | Expired voucher tooltip (B5, E3) | S | None | – |

**Priority legend:** 1 = must fix (blocks release or core functionality); 2 = should fix (important but not blocking); 3 = nice to have. **Effort:** S = small, M = medium, L = large.

---

## Summary

- **Correctly implemented:** Onboarding, Send Money (with receiver details + 2FA), Add Card, Home balance/search, Voucher (3 methods), Cash-out (5 methods), Proof-of-life (banner, verify, success, expired), Receiver parameterised screens, transaction detail routing, QR scanner with Token Vault.
- **High-impact gaps:** Add Money as modal; Group Send/Request 2FA; Receive index screen.
- **Consistency:** Back fallback to Home; shared 2FA modal; success screen pattern.
- **Edge cases:** Offline queue, 2FA lockout, push/deep links, and §3.13.2 (offline, push, analytics, testing, CI/CD, security, a11y, i18n, performance) remain as per PRD gap analysis.

---

## After Audit

- **Update the PRD** with any necessary clarifications (e.g. screen 50b vs banner 58; Loan Apply 2FA = biometric vs PIN). PRD §3.15.11 and §3.15.12 reference this audit and the report location.
- **Create tickets** in the project tracker (Jira/GitHub Issues) for each Priority 1 and Priority 2 fix from section F.
- **Schedule a follow-up audit** after fixes are applied; re-run this audit prompt and update `AUDIT_REPORT.md` and PRD §3.15 accordingly.
