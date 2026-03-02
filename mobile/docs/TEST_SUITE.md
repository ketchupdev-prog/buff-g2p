# Buffr G2P – Full Test Suite (Test Engineer Reference)

**Source:** PRD (§2–§3, §7, §10–§11.14, §14, §18–§19) + test-engineer best practices for mobile fintech / G2P apps.  
**Purpose:** Single reference for all tests to run for the application (unit, component, integration, E2E, security, compliance, accessibility).

---

## 1. Test Pyramid & Tools

| Layer        | Target % | Tool(s) | Run environment |
|-------------|----------|---------|------------------|
| **Unit**    | ~70%     | Jest (ts-jest) | Node (no simulator) |
| **Component** | ~20%   | React Native Testing Library | Node (jsdom-like) |
| **Integration** | ~10% | RNTL + mocked API / storage | Node or simulator |
| **E2E**     | Critical paths only | Maestro or Detox | iOS Simulator / Android Emulator |

**Current state (from PRD §11.14):** Unit tests exist for `walletDisplay` (6 tests). No formal component, integration, or E2E plan. This document defines the full suite.

---

## 2. Unit Tests (Jest)

**Scope:** Pure logic, utils, services, hooks. No UI. Fast, run in CI on every commit.

### 2.1 Utilities (must pass before release)

| Area | File / module | What to test |
|------|----------------|--------------|
| **TLV** | `utils/tlv.ts` | Encode/decode TLV; mandatory tags 00, 01, 26/29, 52, 58, 59, 60, 65, 63; malformed payloads; tag 66 (signed QR) presence |
| **CRC** | `utils/crc.ts` | CRC calculation for Tag 63; TLV-aware Tag 63 lookup (§3.16 F6); validate NAMQR CRC before Token Vault call |
| **NAMQR** | `utils/namqr.ts` | Parse NAMQR payload; extract payee, amount, NREF; reject non-NAMQR before Token Vault (§3.16 F7) |
| **Wallet display** | `utils/walletDisplay.ts` | ✅ Already: `getWalletIcon`, `getWalletProgress` (null, progress, cap 100%) |
| **Formatters** | Any `utils/*` formatters | N$ format no space (§5, §3.16 F10); date/currency per locale |
| **Crypto helpers** | `utils/cryptoHelpers.ts` | SHA-256 PIN hashing (§19); no raw PIN in logs |

### 2.2 Services (with mocked fetch / SecureStore)

| Service | Key tests |
|---------|-----------|
| `services/api.ts` | Base URL, auth header from `getSecureItem('buffr_access_token')`, 401 handling, timeout/retry |
| `services/auth.ts` | Login/logout, token refresh, secure storage read/write |
| `services/wallets.ts` | `getWallets`, `getWallet(id)`, `updateWallet`, `deleteWallet`; AsyncStorage fallback when API fails |
| `services/vouchers.ts` | List vouchers, get voucher by id, redeem to wallet (mock 2FA token) |
| `services/transactions.ts` | List by wallet, filters; auth header present |
| `services/tokenVault.ts` | Validate QR via `POST .../qr/validate`; abort non-NAMQR before call (§3.16 F7) |
| Send / cash-out / bills / loans | Request shape, idempotency key, error parsing (e.g. PIN lockout message §3.16 F18) |

### 2.3 Hooks

| Hook | Tests |
|------|--------|
| `useUser` / UserContext | Initial state, `isLoaded`, `profile`, `walletStatus === 'frozen'` disables financial actions |
| `use2FA` | PIN hash sent to backend; no plain PIN in payload; lockout countdown |
| `useOAuth` | PKCE flow, state, redirect URI (when Open Banking used) |

### 2.4 Backend (if tests exist)

- **Type-check:** `npm run type-check` (tsc --noEmit) – must pass.
- **API route tests:** Request/response shapes (§9.4), validation, 401/404/422.

---

## 3. Component Tests (React Native Testing Library)

**Scope:** Isolated components; mocked navigation and context. Verify labels, disabled states, and callbacks.

### 3.1 Core UI

| Component | What to test |
|-----------|--------------|
| **TwoFAModal** | Renders PIN input; Submit disabled until PIN length valid; onSuccess/onCancel called; no PIN in DOM text |
| **AddMoneyModal** | Three methods visible (Bank Transfer, Debit Card, Redeem Voucher); Link a card navigates to `/add-card` |
| **WalletCard** | Balance, name, icon (from walletDisplay); "Add money" / "Cash out" fire correct nav |
| **BalanceDisplay** | N$ format without space; visibility toggle if applicable |
| **SearchBar** | Placeholder "Search anything…"; onChangeText filters (mock) |
| **ScreenContainer / StackScreen** | Safe area, header back button; back fallback to `/(tabs)` when `!router.canGoBack()` (§6.4) |

### 3.2 Forms & validation

| Screen / component | Tests |
|--------------------|--------|
| Till / Merchant amount | Single decimal, max 2 decimal places (§3.16 F16); CTA disabled until amount valid (§3.16 F15); error cleared on focus (§3.16 D5) |
| Send money amount | Same amount rules; receiver details step receives amount/note |
| Add wallet | Name required; type main/savings; icon picker; optional card design |

### 3.3 Feedback & a11y

| Component | Tests |
|-----------|--------|
| **ErrorBoundary / ErrorState** | Renders message; retry callback |
| **EmptyState** | Copy per context (vouchers, transactions, contacts) |
| **Accessibility** | `accessibilityLabel` / `accessibilityHint` on buttons and icons; touch targets ≥44dp (§11.18) |

---

## 4. Integration Tests

**Scope:** Multi-screen flows with mocked API and (optionally) mocked SecureStore. No real network.

### 4.1 Critical flows (mock API + navigation)

| Flow | Steps to assert |
|------|------------------|
| **Onboarding** | Welcome → Phone → OTP → Name → Photo → Face ID (skip) → Complete → redirect to `/(tabs)`; `buffr_onboarding_complete` set |
| **Voucher redeem to wallet** | Vouchers list → Voucher detail → "Redeem to Buffr Wallet" → 2FA modal (mock success) → Wallet success |
| **Send money** | Select recipient → Amount → Receiver details (pay from, note) → Confirm → 2FA → Success; transaction created (mock) |
| **Cash-out (Till)** | Wallet → Cash-out hub → Till → amount input → Scan QR (mock scan) → 2FA → Success |
| **Add wallet** | Wallets list or Home carousel → Add wallet → name, type, icon → Create → list refetch on focus |
| **Add card** | Add card → Scan or manual → Details → Success; navigation to `/cards` or Home |
| **Proof-of-life** | Home banner when due → Verify screen → (mock biometric) → Success; banner gone |

### 4.2 Storage & context

- **AsyncStorage:** Groups members, group txs/requests (§3.13.1); onboarding flag; notification prefs.
- **UserContext:** After "login", profile and wallets available; `walletStatus === 'frozen'` hides financial CTAs and shows banner.

### 4.3 Error paths

- Network error: show NetworkError component; retry or "Go home".
- Invalid QR: message "Not a valid NAMQR" or similar; no Token Vault call (§3.16 F7).
- Expired voucher / session: clear message; no crash.
- PIN lockout: banner "PIN locked. Try again in X minutes."; confirm disabled (§3.16 F18).

---

## 5. End-to-End Tests (Maestro or Detox)

**Scope:** Critical user journeys on simulator/emulator. Real or stubbed backend.

### 5.1 Happy paths (priority)

| Flow | Steps (E2E) |
|------|-------------|
| **Onboarding** | Launch app → Welcome → enter phone → OTP (test code) → name → skip photo / face ID → Complete → Home visible |
| **Send money** | Home → Send → select contact → amount → receiver details → confirm → 2FA (test PIN) → Success; transaction in list |
| **Voucher redeem to wallet** | Vouchers tab → tap voucher → Redeem to wallet → 2FA → Success; balance updated |
| **Cash-out at till** | Wallet → Cash out → Till → amount → (mock or test QR) → 2FA → Success |
| **Add money (modal)** | Home "+ Add" → Add Money modal → choose method (e.g. Redeem Voucher) → navigate to voucher list |
| **Wallet history** | Wallet detail → History → Earnings / Added tabs; tap transaction → detail screen |

### 5.2 Error & edge scenarios

- No network: show error state; retry brings back content.
- Invalid QR: scan screen shows error; no crash.
- Expired voucher: detail shows expired; redeem disabled.
- Back from deep screen: back button goes to previous; if no history, fallback to `/(tabs)` (§6.4).

### 5.3 Navigation consistency

- Every stack screen: back or Home; Agent/entry screens fallback to Home when history empty (§6.4).
- Transaction detail: from Wallet detail or History → same `/(tabs)/transactions/[id]` (§3.15.4).

---

## 6. Security & Compliance Tests

**Aligned with PRD §10, §12, §14, §19.**

### 6.1 Authentication & 2FA

- 2FA required for: send money, voucher redeem, cash-out, group send/request, bill pay, loan apply.
- PIN never sent in plain text; client-side hash (e.g. SHA-256) per §19.
- Auth header: `getSecureItem('buffr_access_token')` (not AsyncStorage) in all API calls (§3.16 v1.19).
- Lockout: after N failed PIN attempts, show countdown; confirm disabled until expiry.

### 6.2 NAMQR & Token Vault

- All scanned QR: validate CRC (Tag 63) before any API call; reject invalid CRC with clear message (§4.5, §11.8).
- Non-NAMQR: abort before Token Vault; do not call validate API (§3.16 F7).
- Token Vault: every payee-presented QR validated via `POST .../qr/validate` before 2FA (§10).
- Signed QR (Tag 66): if present, verify with public key; reject on failure (§10).

### 6.3 Data & storage

- Tokens in `expo-secure-store` only; no access token in AsyncStorage or logs.
- No raw voucher codes or secrets in UI or logs (§10).
- Audit: sensitive actions (redeem, cash-out, send) logged server-side with verification_token.

### 6.4 Compliance checklist (manual / automated where possible)

- **PSD-12:** 2FA for every payment; encryption in transit (TLS 1.2+); incident reporting (backend).
- **PSD-1 / PSD-3:** Fees and charges visible; complaints process; terms and privacy links.
- **ETA:** Electronic signatures (biometric/PIN) for auth; data retention and admissibility (backend).
- **NAMQR v5.0:** TLV structure; mandatory tags; CRC; Token Vault; no client-side cash code generation (§3.16 F5).
- **Open Banking:** OAuth + PKCE for PIS/AIS; no user credentials to TPP; mTLS (backend).

---

## 7. QR Code & Payment-Specific Tests

**From G2P/payment and QR payment best practices.**

### 7.1 QR validation

- Multiple NAMQR samples: correct payee, amount, currency; NREF present.
- Invalid/expired QR: user-facing message; no crash; no Token Vault call.
- Tampered payload: CRC fail → reject.
- Wrong QR type (e.g. static receive vs dynamic pay): clear "Wrong QR type" message.

### 7.2 Payment flows

- Amount: single decimal, max 2 decimals; N$ format consistent (no space).
- Idempotency: duplicate submit (same idempotency key) returns same result; no double debit.
- Receipt: after success, receipt view and share; transaction id and amount correct.

### 7.3 Cash-out methods

- Till, Agent, Merchant, ATM: scan payee NAMQR → validate → show payee + amount → 2FA → success.
- Bank transfer: OAuth redirect (stub in E2E); return to app → 2FA → confirmation.
- Missing `walletId` in cash-out confirm: guard; no API call with undefined walletId (§3.16 F8).

---

## 8. Accessibility Tests

**PRD §11.17–§11.18.**

- Touch targets: minimum 44×44 dp for primary actions.
- Labels: every interactive element has `accessibilityLabel` (and `accessibilityHint` where helpful).
- Focus order: logical tab order on forms and modals.
- Dynamic Type / font scaling: `allowFontScaling: true`; test at large text sizes.
- Screen reader: VoiceOver (iOS) and TalkBack (Android) on onboarding, send money, voucher redeem, 2FA modal.
- Contrast: WCAG 2.1 AA for text and UI (design tokens §5).

---

## 9. Performance & Regression

- **Performance budget (§11.21):** Bundle size, frame rate, time-to-interactive; measure in CI if possible.
- **No regression:** Existing unit tests (e.g. `walletDisplay`) must stay green; type-check and lint must pass.
- **Critical path E2E:** At least onboarding, send money, voucher redeem, cash-out till – run on every PR or nightly.

---

## 10. Test Execution Summary

| Suite | Command / trigger | When |
|-------|-------------------|------|
| Unit | `npm run test` (Jest) | Every commit; CI |
| Type-check | `npm run type-check` (backend) | Every commit; CI |
| Component | `npm run test` (same Jest; add RNTL tests) | Every commit; CI |
| Integration | `npm run test:integration` (if added) | PR; CI |
| E2E | Maestro CLI or Detox | PR or nightly; pre-release |
| Security / compliance | Manual + automated checks above | Sprint; pre-release |
| Accessibility | Manual + automated (a11y matchers) | Sprint; pre-release |

---

## 11. Recommended CI Pipeline (from PRD §11.15)

- **On every PR:** Install deps → `npm run type-check` (backend) → `npm run test` (mobile Jest).
- **On merge to main:** Optional E2E run; trigger EAS Build for iOS/Android.
- **Before release:** Full E2E critical paths; security checklist (§19); accessibility spot-check.

---

## 12. Traceability to PRD

| PRD section | Test coverage |
|-------------|----------------|
| §2 Buffr G2P scope | All flows in §4–§5, §7 |
| §3 Screen inventory & flows | Component + integration + E2E per §3.12.1 / §3.12.2 |
| §6.4 Back navigation | Integration + E2E: fallback to `/(tabs)` when `!canGoBack()` |
| §7 User flows | Integration (§4) + E2E (§5) |
| §9.4 API shapes | Unit tests for services; integration with mocked responses |
| §10 Compliance & security | §6 Security & compliance tests |
| §11.14 Testing strategy | This document |
| §14 NAMQR & Open Banking | §6.2, §7.1 |
| §18 Complete user flows | E2E (§5) + integration (§4) |
| §19 Security audit | §6.1–§6.4 |

This suite, when implemented and run regularly, supports **100% success** of automated tests and confidence for release. Prioritise unit and integration tests for the flows and utils listed; add E2E for the critical paths in §5; then expand component and security tests as needed.
