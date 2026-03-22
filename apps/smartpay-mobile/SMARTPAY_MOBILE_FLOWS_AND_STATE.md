# Smartpay Mobile: Flows & State Lifecycles

This file consolidates the “flows + steps” patterns from `ketchup-smartpay/buffr_g2p/assets/docs/DESIGN_TO_CODE.md` and maps them to the existing Smartpay Mobile (Expo Router) routes under `fintech/apps/smartpay-mobile/app`.

**Related engineering docs (paths from repo root):**

| Topic | Location |
|--------|-----------|
| **Full ecosystem** (v4.6→v5.0 split, AIS vs portal, OIDC/PAR, Ketchup DNS, **two SDKs**, duplication note, deployment) | `FULL_ECOSYSTEM_INTEGRATION_2026-03-22.md` (repo root) |
| Production DNS, `*.ketchup.cc`, per-bank AIS hosts, redirect/webhook env matrix | `ketchup-smartpay/ketchup-portals/docs/DNS_AND_REDIRECTS.md` |
| Buffr Connect TPP OAuth (PKCE), AIS base `/api/v1`, simulator URLs | `buffr-connect/buffrconnect/docs/guides/OAUTH_QUICK_START.md` |
| Buffr AIS Platform (standalone Next app, OIDC + AIS routes) | `buffr-connect/BUFFR_AIS_PLATFORM_GUIDE.md` |
| Buffr Connect product / hostname table §7.4.1 | `buffr-connect/buffrconnect/PRD.md` |
| G2P product PRD (OAuth §7.6 alignment, NAMQR) | `ketchup-smartpay/buffr_g2p/docs/PRD.md` |
| Ketchup Portals DNS §18 / env | `ketchup-smartpay/ketchup-portals/KETCHUP_PORTALS_PRD.md` |
| Bank simulator branding (P0–P2) — UX reference only; not a substitute for AIS Platform | `buffr-connect/buffrconnect/BANK_BRANDING_SUMMARY.md` |

**Regulatory:** Namibia **Open Banking Standards v1.0** (2025) — use **official / compliance** copies for obligations; this repo’s compliance markdown is **not** edited as part of product docs.

Use this as the implementation checklist:
- For each flow, follow the shared action lifecycle (loading -> success/error -> refresh relevant state -> navigate).
- For each screen, ensure error handling + state updates match the flow contract.
- If a designed route does not exist yet in this repo, mark it `TBD` (do not invent endpoints/routes).

## Shared action lifecycle (state flow contract)

When a user submits a “mutating action” (send money, redeem, add wallet, transfer, confirm cash-out, etc.), follow this lifecycle:

1. Enter “busy” UI
   - Disable the primary CTA(s).
   - For “blocking” moments, use the screen’s existing loading UI or `components/ui/LoadingState.tsx`.
   - If the action is modal-based (PIN/biometric), keep the modal open and block double-submits. In this repo that’s handled by `components/modals/TwoFAModal.tsx` (it owns `loading` and `error` state).
2. Perform the API call (await)
   - Validate locally first (e.g., amount > 0, amount <= balance, OTP/PIN length, required fields present).
   - Use the relevant service function (see `fintech/apps/smartpay-mobile/services/*`).
3. On success (200-ish)
   - Prefer existing success UX pattern for the flow:
     - Dedicated success screens for richer receipt journeys (send money, cash-out, pay-merchant).
     - Reusable result modal for lightweight flows (voucher code redemption).
   - Refresh wallets/balances when the flow mutates wallet balances:
     - P2P (`app/send-money/confirm.tsx`) calls `await refresh()` from `contexts/WalletsContext.tsx`.
     - Cash-out QR-based confirm (`app/(authenticated)/cash-out/confirm.tsx`) calls `await refresh()`.
     - Merchant payment confirm (`app/(authenticated)/pay-merchant/confirm.tsx`) calls `await refresh()`.
4. On error (non-2xx or thrown)
   - Show error UI:
     - Prefer `components/ui/ErrorState.tsx` for full-screen failures.
     - Prefer inline error messaging when the user should correct input (amount/OTP/PIN).
   - Keep the user on the current screen unless the flow explicitly has a “go to error page” step.
   - Ensure the user can retry without restarting the entire flow.

## State management reference (where to refresh)

Smartpay Mobile uses multiple layers of state. Before implementing a “refresh after mutation”, confirm the relevant source of truth:
- Global user/auth: `contexts/UserContext.tsx`
- Wallets and balances: `contexts/WalletsContext.tsx` (plus any Zustand/MMKV stores under `store/`)
- Notifications (if applicable): `contexts/NotificationsContext.tsx`
- Copilot state: `contexts/CopilotContext.tsx`

Audit/notes: `AUDIT_DATA_FLOW_STATE_MANAGEMENT.md`

## Figma design spec reference (Smartpay)

Smartpay Mobile shares the same Figma design file as the Buffr G2P spec. Use this section to align screens and components with the design system.

**Source:** `ketchup-smartpay/buffr_g2p/docs/BUFFR_G2P_FIGMA_DESIGN_SPEC.json`  
**Figma file:** key `VeGAwsChUvwTBZxAU6H8VQ`, name "Buffr App Design" (also set in `constants/designSystem.ts` as `figmaFileKey`).  
**Canvas:** 393×852 (mobile portrait). **Background:** `#F8FAFC` (slate-50).

### Screen → Figma nodeId mapping (Smartpay routes)

| Smartpay route / screen | Figma screen name | nodeId | Notes |
|--------------------------|-------------------|--------|--------|
| Splash / entry | Starting... | 8:2 | |
| `app/(onboarding)/index.tsx` (welcome) | Welcome page | 23:1495 | Get Started → /onboarding/phone |
| `app/onboarding/phone.tsx` | Tell us your mobile number | 44:461 | Prefix +264 |
| `app/onboarding/otp.tsx` | Can you please verify | 44:509, 59:2 | OTPInput, Primary CTA |
| `app/onboarding/name.tsx` | Add user's details | 45:712 | |
| `app/onboarding/face-id` (FaceID) | Enable Authentication | 45:681, 45:792 | 2FA prompt, Skip |
| `app/onboarding/complete.tsx` | Registeration Completed | 45:818 | Success state, Go to Home |
| **`app/(authenticated)/(tabs)/index.tsx`** (Home) | **Main Screen (Home)** | **45:837** | SearchBar, BalanceCard, WalletCard, ServiceCard, ContactChip, TabBar |
| Home (variants) | Main Screen (variant) | 162:1202, 723:8346 | |
| Profile tab | Main Screen (Profile tab) | 725:8543 | TabBar, Profile content |
| `app/(authenticated)/wallets/[id]/index.tsx` | Wallet view | 116:629 | BalanceCard, WalletCard, ListItem |
| `app/send-money/amount.tsx` | Transfer Amount | 153:752 | AmountInput, Primary CTA, ContactChip |
| `app/send-money/select-recipient.tsx` | Send Options | 92:212 | SearchBar, ContactChip, ListItem |
| `app/send-money/confirm.tsx` (receiver + amount) | Receiver's Details | 84:356, 98:443, 170:534 | Contact row, AmountInput, Primary CTA |
| `app/send-money/success.tsx` | Payment Successful | 87:410, 99:488 | Success state, Primary CTA |
| `app/(authenticated)/scan-qr/index.tsx` | Scan QR | 81:465 | NAMQRScanner; flows: Voucher, Cash-out, Pay merchant |
| `app/(authenticated)/cash-out/*` (hub/confirm/success) | Cash-Out Hub + Instruction + 2FA + Success | (see flows) | Till/Agent/Merchant/ATM + Bank |
| `app/(authenticated)/groups/create.tsx` | Make Group | 174:696 | TextInput, SearchBar, ContactChip, Primary CTA |
| `app/loans/*` | Loans, Active Loan Details | 108:276, 111:487 | ListItem, MethodCard, Primary CTA |
| `app/(authenticated)/(tabs)/transfers` / activity | Transactions history, categorized spendings/earnings | 152:427, 114:302 | ListItem, TabBar, segmented filters |
| `app/(authenticated)/wallets/add.tsx` | Managing / Adding a wallet | 151:391 | TextInput, Primary CTA |
| Transaction detail | Transaction details | 115:495 | ListItem, Detail rows |
| Proof-of-life reminder | Proof-of-life reminder (PRD §3.6) | (nodeId null) | Modal or /proof-of-life; Verify now / Remind later |
| Bank linking | Available bank accounts | 44:537, 60:62 | OAuth entry |
| `app/onboarding/country` (optional) | Select your beloved country | 30:1518 | Country list, Detected country |
| Add card flow (if used) | Add card, Add card details, Card type, Validation modal, Card added | 44:593, 44:639, 45:680, 59:58, 45:660 | Card flow; Smartpay may use wallets only |
| Send flow (selected recipient) | Selected contact, Selected contact (variant) | 94:308, 174:873 | ContactChip, Contact row |
| Send flow (post-payment) | After Payment History w/ specific contact | 99:538 | ListItem, Contact row |
| Post-payment transaction detail | After Payment Details, After Payment Details (variant) | 88:211, 99:505 | ListItem |
| Refund flow (TBD) | Refund Request | 169:433 | Refund flow |
| Offers (if used) | Active Offer Details | 111:629 | prdRoute /offers/[id] |
| Cards list (if used) | Cards View | 115:529 | Card list, Primary CTA |
| New feature / home variants | New feature / Frame variant | 723:8369, 723:8361, 723:8363, 723:8378 | Home tab variants |

### Key components (spec → Smartpay implementation)

| Figma component | Spec usage | Smartpay implementation |
|-----------------|------------|--------------------------|
| Primary CTA | height 56, pill radius (999), fill #0029D6 | designSystem; form CTAs and confirm screens |
| SearchBar | placeholder "Search anything..." / "Search phone, UPI, UID" | Home (if present), Send select-recipient, Create group |
| BalanceCard | borderRadius 12, height 120 | `components/home/BalanceCard.tsx`, BalanceStrip |
| WalletCard | borderRadius 16, iconCircle 999 | `components/home/WalletCard.tsx`, WalletCarousel |
| ServiceCard | borderRadius 12 | `components/home/ServiceTile.tsx`, ServicesGrid (3×3) |
| ContactChip | borderRadius 999 | RecentContactsCarousel, Send recipient chips |
| TwoFAModal | title "Verify identity" | `components/modals/TwoFAModal.tsx` (Send, Cash-out, Voucher, Pay merchant) |
| NAMQRScanner | fullScreen | `app/(authenticated)/scan-qr/index.tsx` |
| NAMQRDisplay | minSize 200, borderRadius 12 | Receive QR, NamPost/SmartPay collection code |
| Input/Large | height 56, borderRadius 999 | Phone, OTP, Name, Add wallet |
| Tabbar | Home, Transactions, Vouchers, Me | `app/(authenticated)/(tabs)/_layout.tsx` (tab bar) |

### Flows from spec (aligned to this doc)

- **Onboarding:** Welcome → Phone → OTP → Name → (Photo) → FaceID → Complete. Matches §1.
- **Send money (P2P):** Send Options → Transfer Amount → Receiver's Details → 2FA → Payment Successful. Matches §3.
- **Voucher redemption:** Wallet / NamPost / SmartPay paths; 2FA; success. Wallet path now wired by 12-digit code in `app/voucher/index.tsx`; NamPost/SmartPay method screens remain pending.
- **Cash-out:** Till / Agent / Merchant / ATM (scan NAMQR → 2FA → Success); Bank (OAuth → 2FA → Success). Matches §5.
- **Pay merchant:** Merchants or Scan QR → Amount/Confirm → 2FA → Success. Matches §6.
- **Create group:** Make Group → Group view. Matches §7.
- **Bank linking (optional):** Available bank accounts → OAuth WebView → oauth-callback. Matches §14.
- **Proof-of-life:** Reminder → Verify now / Remind later / Learn more. Matches §12.

### UX / accessibility (from spec, apply to Smartpay)

- **Touch targets:** Primary CTA min 56px with pill radius; service cards ≥44px; tab bar 49px. designSystem and ServiceTile/WalletCard already follow.
- **Contrast:** Body text slate-900 on #F8FAFC ≥4.5:1 (PRD §5.1). Use designSystem semantic colors.
- **Scan QR (81:465):** Add short explanatory text or icon for low-literacy users ("Scan the agent's NAMQR").
- **Error states:** Use ErrorState, Toast, inline errors for invalid QR, network error, 2FA failure, 4xx (PRD §4.6).
- **Loading:** Skeleton or spinner for Vouchers list, Send money, Groups list (animations.loading 1500ms).
- **Responsive:** Content capped at 393px; carousels use Dimensions.get + scroll; SafeAreaView for safe areas.

### Full app coverage (Smartpay areas)

| Area | Smartpay routes | In Figma spec |
|------|------------------|----------------|
| Onboarding | /onboarding, /onboarding/phone, otp, name, face-id, complete | Yes (screens + flow) |
| Home | /(tabs), BalanceStrip, ServicesGrid, WalletCarousel, RecentContacts | Yes (45:837) |
| Wallets | /wallets, /wallets/add, /wallets/[id] | Yes (116:629, 151:391) |
| Send money | /send-money/select-recipient, amount, confirm, success | Yes (92:212, 153:752, 84:356, 87:410) |
| Cash-out | /cash-out, till, bank, atm, confirm, success | Partial (hub/success PRD; scan 81:465) |
| Pay merchant | /pay-merchant/confirm, success | Via Scan QR + confirm flow |
| Vouchers | /voucher, redeem paths | Partial (Scan QR, NAMQRDisplay, Success) |
| Groups | /groups, /groups/create, /groups/[id], split | Yes (174:696); detail/split PRD |
| Loans | /loans, /loans/[id] | Yes (108:276, 111:487) |
| Receive | /receive, /receive/qr | Partial (171:574, 172:630 request POV) |
| Profile & settings | /profile, /profile/settings, edit-profile, `/notifications`, `/notifications-settings` | Partial (725:8543, 153:566) |
| Proof-of-life | /proof-of-life/intro, /proof-of-life | PRD-only screen (nodeId null) |
| Banking (OBS) | /banking/link-bank, consent-review, oauth-callback, linked-accounts | Yes (44:537, 60:62) |
| Scan QR | /scan-qr | Yes (81:465) |

## Services used by flows (function-level mapping)

This section is a quick “what do we call?” reference so flow implementations stay consistent.

### Auth / onboarding
- `services/auth.ts`
  - `requestOtp(phone, email?, channel?)` (OTP send)
  - `verifyOtp(phone, code, email?)` (OTP verify)
  - `getDevPrefillOtp(phone)` (dev-only onboarding prefill)

### Send money (P2P)
- `services/send.ts`
  - `getContacts()` (used by `app/send-money/select-recipient.tsx`)
  - `sendMoney({ amount, recipientPhone/beneficiaryPhone, recipientId?, walletId/sourceWalletId?, pin? ... })` (called by `app/send-money/confirm.tsx` after PIN/biometric)

### Wallet refresh after send/confirm
- `contexts/WalletsContext.tsx`
  - `refresh()` (used by `app/send-money/confirm.tsx` after `sendMoney(...)` succeeds)
  - Internally calls `services/wallets.ts -> getWallets()`

### Notifications inbox
- `contexts/NotificationsContext.tsx`
  - `refreshNotifications({ silent? })` — merges `services/notifications.ts -> getNotifications()` with device/AsyncStorage items; syncs badge from unread count
  - `markAsRead`, `markAllAsRead`, `deleteNotification`, `clearAll` — local + API when id is a server UUID
- `services/notificationMapping.ts` — `mapApiNotificationToData()`, `isServerNotificationId()`
- `services/notifications.ts` — `getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, plus `expo-notifications` helpers (`setupChannels`, `scheduleLocal`, etc.)
- UI: `app/(authenticated)/notifications.tsx` (focus refresh), `app/notifications-settings.tsx` (preferences)

### Cash out (wallet balance impact)
- Cash-out hub:
  - `app/(authenticated)/cash-out/index.tsx` -> `services/wallets.ts -> getWallets()` (to compute “Available Balance”)
- QR-backed cash-out confirm:
  - `app/(authenticated)/cash-out/confirm.tsx`
    - `services/cashOut.ts -> cashOutAtAgent(...)`
    - `services/cashOut.ts -> cashOutAtTill(...)`
    - on success: `await contexts/WalletsContext.refresh()`
- Merchant POS (paid via cashOut backend endpoints):
  - `app/(authenticated)/pay-merchant/confirm.tsx`
    - `services/cashOut.ts -> cashOutAtMerchant(...)`
    - on success: `await contexts/WalletsContext.refresh()`
- Bank cash-out (Open Banking):
  - `app/(authenticated)/cash-out/bank.tsx`
    - `services/openBanking.ts -> getLinkedAccounts()` (linked bank accounts from SecureStore)
    - `services/wallets.ts -> getWallets()` (wallet selection / max amount checks)
    - `services/cashOut.ts -> cashOutToBank(...)` (triggered inside `TwoFAModal`)
- ATM / Till screens in this snapshot:
  - `app/(authenticated)/cash-out/atm.tsx`, `app/(authenticated)/cash-out/till.tsx` currently use simulated “success” navigation in this snapshot (do not call `services/cashOut.ts` in the code we inspected).

### Voucher redemption (G2P)
- Voucher UI entry:
  - `app/voucher/index.tsx` (has code input + “Redeem Voucher” button, but redemption `onPress` is `TBD` in this snapshot)
- Redemption services (available for wiring):
  - `services/vouchers.ts`
    - `getVouchers()`
    - `getVoucherById(voucherId)`
    - `redeemVoucherToWallet(voucherId)` (generic wallet credit)
    - `redeemVoucherAtNamPost(voucherId, location?)`
    - `redeemVoucherAtSmartPay(voucherId, agentCode?)`

### Wallets / transactions screens
- `services/wallets.ts`
  - `getWallets()`
  - `getWalletById(walletId)`
  - `createWallet(params)`
  - `updateWallet(walletId, params)`
  - `deleteWallet(walletId)`
- `services/transactions.ts`
  - `getTransactions({ limit?, offset?, walletId?, startDate?, endDate? })`
  - `getTransactionSummary()` → `GET /api/v1/transactions/summary`
  - `getTransactionById(id)`

### Groups / splits (if/when wired to UI)
- `services/groups.ts`
  - `getGroups()`, `getGroupById(groupId)`
  - `createGroup(...)`, `inviteMember(groupId, params)`
  - `createSplit(...)`, `paySplit(...)`, `remindSplit(...)`
  - `getGroupSplits(groupId)`

## Screen step -> service -> API endpoint

This is the “tight traceability” layer: for each flow screen step, it points to the service function it calls and the backend endpoint it hits.

### Onboarding (OTP)

| Screen route | Step trigger | Service function | API endpoint |
|---|---|---|---|
| `app/onboarding/phone.tsx` | user taps continue to request OTP | `services/auth.ts -> requestOtp(phone, email?, channel?)` | `POST /api/v1/auth/request-otp` |
| `app/onboarding/otp.tsx` | user taps “Resend code” | `services/auth.ts -> requestOtp(phone, email?, channel?)` | `POST /api/v1/auth/request-otp` |
| `app/onboarding/otp.tsx` | user submits OTP to verify | `services/auth.ts -> verifyOtp(phone, code, email?)` | `POST /api/v1/auth/verify-otp` |
| `app/onboarding/otp.tsx` (dev only) | dev-only OTP prefill | `services/auth.ts -> getDevPrefillOtp(phone)` | No API (local/dev-only) |

### Send money (P2P)

| Screen route | Step trigger | Service function | API endpoint |
|---|---|---|---|
| `app/send-money/select-recipient.tsx` | screen mount (load contacts) | `services/send.ts -> getContacts()` | None (returns mock contacts in this snapshot) |
| `app/send-money/amount.tsx` | user taps `Continue` | None (client-side validation) | None |
| `app/send-money/confirm.tsx` | user verifies PIN/biometric | `services/send.ts -> sendMoney(...)` | `POST /api/v1/send-money` |
| `app/send-money/confirm.tsx` | after successful send | `contexts/WalletsContext.tsx -> refresh()` | `GET /api/v1/wallets` (via `services/wallets.ts -> getWallets()`) |
| `app/send-money/success.tsx` | user taps `Done` or `Share` | None (share is local) | None |

### Send money via NAMQR scan (routing entry)

| Screen route | Step trigger | Service function | API endpoint |
|---|---|---|---|
| `app/(authenticated)/scan-qr/index.tsx` | NAMQR `case 'namqr'` | None (parsing only) | None (routes only) |

### Cash out

| Screen route | Step trigger | Service function | API endpoint |
|---|---|---|---|
| `app/(authenticated)/cash-out/index.tsx` | screen mount (balance) | `services/wallets.ts -> getWallets()` | `GET /api/v1/wallets` |
| `app/(authenticated)/cash-out/confirm.tsx` | PIN/2FA verify (agent QR path) | `services/cashOut.ts -> cashOutAtAgent(...)` | `POST /api/v1/cash-out/agent` |
| `app/(authenticated)/cash-out/confirm.tsx` | PIN/2FA verify (till QR path) | `services/cashOut.ts -> cashOutAtTill(...)` | `POST /api/v1/cash-out/till` |
| `app/(authenticated)/cash-out/confirm.tsx` | after successful cash-out | `contexts/WalletsContext.tsx -> refresh()` | `GET /api/v1/wallets` |
| `app/(authenticated)/cash-out/bank.tsx` | load wallets | `services/wallets.ts -> getWallets()` | `GET /api/v1/wallets` |
| `app/(authenticated)/cash-out/bank.tsx` | load linked bank accounts | `services/openBanking.ts -> getLinkedAccounts()` | None (reads `SecureStore`) |
| `app/(authenticated)/cash-out/bank.tsx` | PIN/2FA verify (cash-out request) | `services/cashOut.ts -> cashOutToBank(...)` | `POST /api/v1/cash-out/bank` |
| `app/(authenticated)/cash-out/atm.tsx`, `app/(authenticated)/cash-out/till.tsx` | continue flow in this snapshot | None (simulated) | None |

### Pay merchant (POS)

| Screen route | Step trigger | Service function | API endpoint |
|---|---|---|---|
| `app/(authenticated)/pay-merchant/confirm.tsx` | PIN/2FA verify | `services/cashOut.ts -> cashOutAtMerchant(...)` | `POST /api/v1/cash-out/merchant` |
| `app/(authenticated)/pay-merchant/confirm.tsx` | after successful payment | `contexts/WalletsContext.tsx -> refresh()` | `GET /api/v1/wallets` |
| `app/(authenticated)/pay-merchant/success.tsx` | user taps `Done` or `Share` | None (share is local) | None |

### Voucher redemption (G2P) - wallet-by-code implemented

| Intended voucher service step | Service function | API endpoint | Current UI state |
|---|---|---|---|
| Redeem voucher into wallet by code (screen flow) | `services/vouchers.ts -> redeemVoucherCodeToWallet(voucherCode)` | `POST /api/v1/vouchers/redeem` | Implemented in `app/voucher/index.tsx` with strict 12-digit validation + wallet refresh on success |
| Redeem voucher into wallet by id (existing API path) | `services/vouchers.ts -> redeemVoucherToWallet(voucherId)` | `POST /api/v1/vouchers/:id/redeem` | Available for list/detail based flows |
| Redeem voucher at NamPost branch | `services/vouchers.ts -> redeemVoucherAtNamPost(voucherId, location?)` | `POST /api/v1/vouchers/:id/redeem-nampost` | `TBD` |
| Redeem voucher at SmartPay agent | `services/vouchers.ts -> redeemVoucherAtSmartPay(voucherId, agentCode?)` | `POST /api/v1/vouchers/:id/redeem-smartpay` | `TBD` |

### Groups & split bills

| Screen route | Step trigger | Service function | API endpoint |
|---|---|---|---|
| `app/(authenticated)/groups/index.tsx` | screen mount / pull-to-refresh | `services/groups.ts -> getGroups()` | `GET /api/v1/groups` |
| `app/(authenticated)/groups/create.tsx` | user taps Create Group | `services/groups.ts -> createGroup(...)` | `POST /api/v1/groups` (then invites via `POST /api/v1/groups/:groupId/members`) |
| `app/(authenticated)/groups/[id]/index.tsx` | screen mount | `services/groups.ts -> getGroup(groupId)` | `GET /api/v1/groups/:groupId` |
| `app/(authenticated)/groups/[id]/index.tsx` | user taps Leave (self) | `services/groups.ts -> leaveGroup(groupId, memberId)` | `DELETE /api/v1/groups/:groupId/members/:memberId` |
| `app/(authenticated)/groups/[id]/index.tsx` | user taps “Pay split share” | `services/groups.ts -> paySplitShare(groupId, splitId, sourceWalletId)` | `POST /api/v1/groups/:groupId/splits/:splitId/pay` |
| `app/(authenticated)/groups/[id]/index.tsx` | user taps “Remind” | `services/groups.ts -> remindGroupMembers(groupId, splitId)` | `POST /api/v1/groups/:groupId/splits/:splitId/remind` |
| `app/(authenticated)/groups/[id]/split.tsx` | user taps Create Split | `services/groups.ts -> createSplit(groupId, params)` | `POST /api/v1/groups/:groupId/split` |

### Invite / referral

| Screen route | Step trigger | Service function | API endpoint |
|---|---|---|---|
| `app/(authenticated)/invite/index.tsx` | deep link `?code=XXX` present -> validate | `services/invite.ts -> validateInviteCode(code)` | `GET /api/v1/invite/validate?code=XXX` |
| `app/onboarding/otp.tsx` | after OTP verify succeeds -> register attribution | `services/invite.ts -> registerWithInviteCode({ phone, inviteCode })` | `POST /api/v1/invite/register` |
| `onboarding` | start onboarding from invite -> store pending code (local) | None (AsyncStorage) | None |
| `invite` screen (planned) | show referral stats | `services/invite.ts -> getReferralStats()` | `GET /api/v1/invite/referrals` |
| `invite` screen (planned) | show leaderboard | `services/invite.ts -> getReferralLeaderboard()` | `GET /api/v1/invite/leaderboard` |

## 0) Home screen (Wallets carousel + state-flow alignment)

Why it matters:
- Home is the main authenticated landing screen; the Wallets carousel should reflect `WalletsContext` quickly and consistently after refresh/mutations.

Design flow steps (G2P alignment):
Home loads → BalanceCard (main wallet + total) → Wallets carousel (horizontal cards) → Services grid → Recent contacts row.

Actual routes/components in this snapshot:
- Home tab: `app/(authenticated)/(tabs)/index.tsx`
- Balance card UI: `components/home/BalanceCard.tsx`
- Wallets carousel UI: `components/home/WalletCarousel.tsx` + `components/home/WalletCard.tsx`
- Wallet data source (intended): `contexts/WalletsContext.tsx` (loads wallets via `services/wallets.ts -> getWallets()`)

Wallet card layout (g2p):
- Wallets row uses horizontal scrolling with card gaps (intended to match state-flow spacing rules in `ketchup-smartpay/buffr_g2p/assets/docs/STATE_FLOW_DESIGN_ALIGNMENT.md`)
- WalletCard dimensions are driven by `designSystem` constants (Figma spec: 164×140) and rendered as fixed-width cards

Home wallet/balance wiring (implemented):
- `BalanceCard` receives total balance + primary wallet name from `useWallets()` (WalletsContext).
- `BalanceCard` also shows account holder name + SmartpayID to reinforce identity ownership.
- Unauthorized/empty states should be shown in-card (not as generic placeholders).
- `BalanceCard` identity row uses `SmartpayID:` label (no duplicate "Main Wallet" chip in the ID row).
- QR action on the balance card is icon-only (no "My QR" text) and remains fully housed inside card bounds.
- SmartpayID baseline is vertically nudged to align with the centerline of the QR action for cleaner visual rhythm.
- `WalletCarousel` receives `wallets` from `useWallets()` (WalletsContext) and renders wallet cards.
- “Add Wallet” card is shown; `onAddWallet` navigates to `app/(authenticated)/wallets/add`.
- `onWalletPress` navigates to `app/(authenticated)/wallets/[id]` for the tapped wallet.
- Pull-to-refresh calls `refresh()` from WalletsContext (no direct `getWallets` import on home).
- **Figma:** Main Screen (Home) nodeId `45:837` (BalanceCard, WalletCard, ServiceCard, ContactChip, TabBar).

### Main wallet identity contract (UPI-like proxy model)
The "main wallet" is identity-linked to the account's SmartpayID and should be treated as a proxy address model (similar to UPI handle resolution).

Identity + proxy linkage:
- SmartpayID is produced during OTP verification and onboarding identity setup.
- SmartpayID is derived from the phone identity path (last-8-digit normalization pattern is used in auth code paths for deterministic ID generation).
- The user's default/main wallet should resolve through this identity key and remain discoverable through SmartpayID/phone lookup flows.

QR + proxy resolution requirements:
- Receive QR generation must encode the SmartpayID (NAMQR payload), so payer scans resolve recipient identity first, then wallet/payment path.
- QR validation and direct send/cash-out scan paths should resolve recipient/payee by SmartpayID (or fallback extraction of SmartpayID from QR/deeplink).
- Backend lookup supports proxy-style resolution by SmartpayID or phone query in user lookup route.
- Home BalanceCard should expose a prominent QR action (larger hit target) to support offline presentation/scanning.

Offline + physical-card considerations (product requirement):
- Users may request a physical card, but offline interoperability should still work via printed/displayed Smartpay QR tied to SmartpayID.
- The card UI should prioritize QR discoverability over simulated PAN-style suffix rows (remove `card ---- 0001` style metadata on Home).
- Minimum QR action touch target: >=56px; recommended visual emphasis for low-connectivity scenarios.
- For agent/merchant offline flows, scanning QR should resolve SmartpayID proxy even when ancillary profile data is delayed.
- Keep owner name visible on the balance card to reduce identity ambiguity during assisted/offline transactions.

Implementation references (current snapshot):
- Mobile auth + SmartpayID generation/propagation: `services/auth.ts`, `app/onboarding/otp.tsx`, `contexts/UserContext.tsx`.
- Receive/QR generation and validation: `services/receive.ts`, `utils/namqr.ts`, `app/(authenticated)/receive/index.tsx`, `app/(authenticated)/scan-qr/index.tsx`.
- Backend auth verify + SmartpayID return and user lookup: `apps/smartpay-backend/src/routes/auth.ts`, `apps/smartpay-backend/src/routes/mobile/users.ts`.

Guardrails:
- Do not model SmartpayID as UI-only metadata; it is a routing identifier.
- Main wallet UI should always present identity context (SmartpayID/linked owner semantics), even when wallet balance is unavailable.
- Home card should not depend on network-only wallet metadata to render core identity block (owner + SmartpayID + QR CTA).

Screen step -> service -> API endpoint (Home):
| Screen route | Step trigger | Service function | API endpoint |
|---|---|---|---|
| `contexts/WalletsContext.tsx` (initial load) | provider mounts | `services/wallets.ts -> getWallets()` | `GET /api/v1/wallets` |
| `app/(authenticated)/(tabs)/index.tsx` (pull-to-refresh) | user refreshes home | `WalletsContext.refresh()` | `GET /api/v1/wallets` |
| `components/home/WalletCarousel.tsx` (tap wallet) | user selects wallet card | None (navigation) | None → `/(authenticated)/wallets/[id]` |
| `components/home/WalletCarousel.tsx` (tap Add Wallet) | user taps Add Wallet card | None (navigation) | None → `/(authenticated)/wallets/add` |

## POV user journeys (Sender vs Recipient)

### 0A) Referral invite POV (sender invites, recipient registers attribution)

**Figma:** No dedicated invite screen in spec; use Main Screen (Profile tab) 725:8543 or list/chip patterns (ContactChip, ListItem) for share UI.

Sender journey:
- Screen: `app/(authenticated)/invite/index.tsx`
- Action: share/copy invite link (client-only)

Recipient journey (expected):
- Deep link should route into onboarding with `inviteCode` (TBD for unauthenticated routing)
- On OTP verify success (`app/onboarding/otp.tsx`):
  - calls `services/invite.ts -> registerWithInviteCode(...)`
  - endpoint: `POST /api/v1/invite/register`

Status:
- `Implemented`: OTP-side attribution registration
- `TBD`: unauthenticated deep-link routing into onboarding with `inviteCode`

### 0B) Group invitation POV (group creator invites by phone; recipient joins)

**Figma:** Make Group 174:696 (invite members via ContactChip, SearchBar). Recipient join/detail: group view PRD wireframes; use ListItem, Primary CTA.

Sender journey:
- Screen: `app/(authenticated)/groups/create.tsx`
- Backend calls:
  - `POST /api/v1/groups`
  - `POST /api/v1/groups/:groupId/members` (one per phone)

Recipient journey (expected):
- Should have a “pending group invitations” UI to accept join:
  - endpoint: `POST /api/v1/groups/:groupId/join`
- No verified mobile invitation inbox / join UI exists in this snapshot (TBD).

Status:
- `Implemented (backend contract)`: join endpoint + `services/groups.ts -> joinGroup()`
- `TBD`: pending-invite UI + navigation wiring

## 1) Onboarding flow (welcome -> phone -> OTP -> name -> photo -> pin -> faceid -> complete)

**Figma:** Welcome 23:1495 → Phone 44:461 → OTP 44:509/59:2 → Name 45:712 → (Photo PRD) → FaceID 45:681/45:792 → Complete 45:818. Optional: Country 30:1518; Bank linking 44:537/60:62.

Design flow steps:
welcome → phone → otp → name → photo → pin → faceid → complete

Existing routes (confirm in repo):
- Welcome (new welcome slides): `app/(onboarding)/index.tsx`
- Phone entry: `app/onboarding/phone.tsx` (Step 2)
- OTP verification: `app/onboarding/otp.tsx` (Step 3)
- Name entry: `app/onboarding/name.tsx`
- Photo: `app/onboarding/photo.tsx`
- PIN: `app/onboarding/pin.tsx`
- FaceID: `app/onboarding/faceid.tsx`
- Complete: `app/onboarding/complete.tsx`

Shared lifecycle expectations:
- For OTP/PIN verification, errors should be inline first; if the backend returns an auth-specific error, show an alert/notification pattern used by the screen.
- For OTP resend, the backend may enforce rate limiting (`429 Too Many Requests`). The `requestOtp()` client surfaces `retryAfterSeconds`, and `app/onboarding/otp.tsx` syncs the resend countdown from that value to prevent repeated OTP spam.
- After successful verification, persist the needed identifiers into `UserContext` via `setProfile` / relevant setters, then navigate forward.

## 2) Voucher redemption (G2P)

**Figma:** Voucher list/detail PRD wireframes; redemption uses Scan QR 81:465 (NAMQRScanner), TwoFAModal, Success state. Flows: Wallet redeem, NamPost (branch list → NAMQRDisplay → 2FA), SmartPay (unit list → NAMQRDisplay → 2FA).

Design flow steps:
Voucher list → Detail → Choose redemption method → 2FA → Success

Implementation mapping (current repo status):
- Voucher entry/screen: `app/voucher/index.tsx` (exists)
  - Current UI enforces **digits-only, exact 12-digit** voucher code before enabling redeem CTA.
  - Input contract:
    - `keyboardType="number-pad"`
    - `maxLength={12}`
    - normalize input to digits only (`\D` stripped on change)
    - inline error + reusable result modal on invalid submit
  - Redeem action is wired end-to-end:
    - Calls `services/vouchers.ts -> redeemVoucherCodeToWallet(voucherCode)`.
    - Backend validates code shape and redeems via `POST /api/v1/vouchers/redeem`.
    - On success, refreshes wallet state via `WalletsContext.refresh()` and opens `components/feedback/OperationResultModal.tsx` with receipt details + share action.
- Voucher “method” selection, 2FA, and success steps:
  - `TBD` (no method-specific redemption screens found in this snapshot).

Success/error requirements:
- Wallet-by-code flow refreshes wallets and shows `OperationResultModal` success receipt.
- Error states remain on the entry screen and show consistent result modal feedback (no partial navigation).

## 3) Send money

**Figma:** Send Options 92:212 → Transfer Amount 153:752 → Receiver's Details 84:356/98:443/170:534 → 2FA (TwoFAModal) → Payment Successful 87:410/99:488. Related: Selected contact 94:308/174:873; After Payment History 99:538; After Payment Details 88:211/99:505.

Design flow steps:
Select recipient → Enter amount → Confirm → 2FA (overlay) → Success

Existing routes:
- Entry / routing: `app/send-money/index.tsx` (immediate redirect to `select-recipient.tsx`)
- Select recipient: `app/send-money/select-recipient.tsx`
- Enter amount: `app/send-money/amount.tsx`
- Confirm: `app/send-money/confirm.tsx`
- Scan QR (recipient parsing): `app/send-money/scan-qr.tsx`
- Success: `app/send-money/success.tsx`

Integration note (NAMQR scan entry):
- `app/(authenticated)/scan-qr/index.tsx` routes NAMQR (`case 'namqr'`) into `/send-money/amount` with only `recipientId` + `prefilledAmount`.
- The send-money amount/confirm flow currently expects recipient params like `recipientName` and `recipientPhone` (used for the confirm header and for `sendMoney({ recipientPhone: params.recipientPhone, ... })`).
- Treat this as `TBD`: either enrich the params passed from `scan-qr`, or update the send-money flow to accept a “recipientId-only prefill” mode safely.

State expectations:
- Recipient selection must carry required params into the next screen (recipient id/name/phone + avatar when available).
- Amount screen must validate:
  - amount > 0
  - amount <= selected wallet balance
- Confirm screen must compute:
  - fee using `TRANSACTION_FEE_PERCENTAGE = 0.015`
  - total = amount + fee
  - newBalance = walletBalance - total
- Two-factor modal:
  - Block double submissions (owned by `components/modals/TwoFAModal.tsx`)
  - On verified 2FA success, call `sendMoney(...)`, then navigate to success
- After success:
  - `app/send-money/confirm.tsx` does `await refresh()` (WalletsContext), then `router.replace('/send-money/success', ...)`
  - Transaction history refresh for the affected wallet is deferred to screens that load history from the API (e.g., wallet detail loads transactions).

Reference (implementation summary exists):
- `app/send-money/README.md`
- `app/send-money/FLOW_DIAGRAM.txt`

## 4) Transactions tab + Request money

**Figma:** After receive request sent 171:574; Receiver's POV 172:630 (Request money flow). No dedicated request-money screens in spec; implement from PRD wireframes if needed.

Design flow steps (current implementation):
Transactions tab entry → Select period filter (chips: 7D/30D/90D) → Select segment (Spendings/Earnings) → Review summary strip (Balance/Spendings/Earnings) → Trend line chart (current solid vs previous dashed) → Categorized spending (Spendings segment) → Recent transactions list

Repo status:
- No `app/request-money/*` route group exists in this snapshot.
- `app/(authenticated)/(tabs)/transfers.tsx` is now a clean Transactions hub:
  - No Copilot / action card on this tab (history + analytics first, SVG-aligned).
  - Period chips (`7D`, `30D`, `90D`) are housed inside the line chart card header (to free vertical chart space).
  - Segmented filter: `Spendings`, `Earnings` (Balance is shown only in the summary strip).
  - Summary strip: `Balance`, `Spendings`, `Earnings` for selected period context.
  - Line chart:
    - Previous period trend line is dashed.
    - Current period trend line is solid.
  - Spendings view includes lightweight categorized spending pills (top categories) to align with transaction analytics intent.
  - Recent transactions list below (minimal, clean rows with icon, date, and signed amount).
  - Network failures in tab data loading are now caught and rendered gracefully (no uncaught promise crash path).
- Request-money dedicated route remains `TBD` and should be added as a guided flow when product confirms it.

## 5) Agent cash-out (standalone)

**Figma:** Cash-out hub/success PRD; Scan QR 81:465 (Till/Agent/Merchant/ATM); Wallet view 116:629 (balance/cash-out entry). Bank path: Available bank accounts 44:537/60:62 → OAuth. TwoFAModal for confirm step.

Design flow steps:
Nearby agents → Select agent → Generate code / QR → 2FA → Agent confirms → Cash received

In this repo snapshot, cash-out is implemented via two patterns:

### 5A) Cash-out method hub (step-based within screens)
- Hub entry (method selection): `app/(authenticated)/cash-out/index.tsx`
  - Shows balance and navigates to:
    - `app/(authenticated)/cash-out/till.tsx` at:
      - `/cash-out/till`
      - `/cash-out/till?type=agent`
      - `/cash-out/till?type=merchant`
      - Internally uses `step: scan → amount → confirm`
      - Uses simulated scanning + simulated API delay, then `router.replace('/cash-out/success', ...)`
    - `app/(authenticated)/cash-out/atm.tsx` at `/cash-out/atm`
      - Internally uses `step: input → amount → confirm`
      - Uses simulated QR input + simulated API delay, then `router.replace('/cash-out/success', ...)`
    - `app/(authenticated)/cash-out/bank.tsx` at `/cash-out/bank`
      - Uses real service calls:
        - selection: linked bank accounts
        - verify: `cashOutToBank(...)` inside `TwoFAModal`
      - On success: `router.replace('/cash-out/success', ...)`

### 5B) Cash-out QR confirm (NAMQR-driven, 2FA + backend call)
- QR scanner entry: `app/(authenticated)/scan-qr/index.tsx`
  - For QR types `agent` and `till`, it navigates to `app/(authenticated)/cash-out/confirm.tsx` with:
    - `agentId` or `tillId`
    - `amount`
    - destination name via `merchantName`
- Confirm screen (2FA + backend):
  - `app/(authenticated)/cash-out/confirm.tsx`
  - Uses `CASH_OUT_FEE_PERCENTAGE = 0.02`, validates wallet balance, and calls:
    - `cashOutAtAgent(...)` or `cashOutAtTill(...)`
  - On success:
    - `await refresh()`
    - `router.replace('/(authenticated)/cash-out/success', ...)`

Shared success screen:
- `app/(authenticated)/cash-out/success.tsx` (shows receipt, share, done -> `/(authenticated)/(tabs)`).

State expectations:
- For QR-based cash-out confirm, keep user on the confirmation screen on validation/network errors (it uses `Alert.alert(...)` and hides the TwoFAModal).
- For backend-backed flows, refresh wallet balances via `WalletsContext.refresh()` as described above.

## 6) Bill pay / merchant payment

**Figma:** Pay merchant flow: Scan QR 81:465 (scan merchant NAMQR) → Amount/Confirm → TwoFAModal → Success. Bills dashboard/categories/scheduled/history are PRD wireframes only.

Design flow steps (from design doc section):
Bills dashboard → Categories → Pay bill → Scheduled → History

Repo status (mapped):
- This snapshot has a merchant payment confirmation flow (QR-driven), but no bills dashboard/categories UI confirmed here.
- Merchant payment confirm:
  - `app/(authenticated)/pay-merchant/confirm.tsx`
- Merchant payment success:
  - `app/(authenticated)/pay-merchant/success.tsx`
- Route entry from scan:
  - `app/(authenticated)/scan-qr/index.tsx` navigates to `/(authenticated)/pay-merchant/confirm` when QR type is `merchant`.

Shared lifecycle expectations:
- Confirm screen computes:
  - `MERCHANT_FEE_PERCENTAGE = 0.01`
  - total = amount + fee, and new balance = walletBalance - total
- Two-factor modal:
  - On verify, calls `cashOutAtMerchant(...)`
  - On success: `await refresh()` then `router.replace('/(authenticated)/pay-merchant/success', ...)`

## 7) Groups & split bill

**Figma:** Make Group 174:696 (TextInput, SearchBar, ContactChip, Primary CTA). Group detail, invite, split create, pay split, remind are PRD wireframes; use same components (ListItem, Detail rows, Primary CTA, TwoFAModal per spec).

Design flow steps:
Create group → Group detail → Invite/add members → Split bill create → Pay split shares → Remind members

Existing routes:
- Groups list: `app/(authenticated)/groups/index.tsx`
- Create group: `app/(authenticated)/groups/create.tsx`
- Group detail: `app/(authenticated)/groups/[id]/index.tsx`
- Split: `app/(authenticated)/groups/[id]/split.tsx`

State expectations:
- Group list/detail refresh:
  - `Groups` list calls `services/groups.ts -> getGroups()`
  - `Group detail` calls `services/groups.ts -> getGroup(groupId)`
  - After successful mutations, screens should invalidate the relevant React Query keys (the current snapshot does this for create split and pay split).
- Implemented backend calls (from `services/groups.ts`):
  - `createGroup(...)` -> `POST /api/v1/groups`
  - `createSplit(...)` -> `POST /api/v1/groups/:groupId/split`
  - `paySplit(...)` / `paySplitShare(...)` -> `POST /api/v1/groups/:groupId/splits/:splitId/pay`
  - `remindSplit(...)` / `remindGroupMembers(...)` -> `POST /api/v1/groups/:groupId/splits/:splitId/remind`
- Known gaps / placeholders in this snapshot:
  - `Group detail` currently uses a hardcoded `currentUserId` for admin checks (should come from `UserContext` in production).
  - Member management is placeholder:
    - “Manage” opens an `Alert` (“Manage members”)
    - “Settings” opens an `Alert` (“coming soon”)
    - “Contribute” / “Pay from Group” are `Alert` placeholders (no group wallet funding flow wired yet).
  - Leaving a group is wired end-to-end:
    - `GroupDetailScreen` passes the authenticated `memberId` from `UserContext`
    - `services/groups.ts -> leaveGroup(...)` calls `DELETE /api/v1/groups/:groupId/members/:memberId` (self-leave)

## 8) Wallets (detail -> add money -> transfer -> history -> settings -> autopay)

**Figma:** Wallet view 116:629 (BalanceCard, WalletCard, ListItem); Managing / Adding a wallet 151:391; Wallet history 152:427, Transactions 114:302; Transaction details 115:495. Wallet Settings + Auto Pay modal sequence from SVGs: `Wallet Settings.svg`, `Select Method.svg`, `Select Pay From.svg`, `Select Number Of Payments.svg`, `Set Date.svg`, `Set Time.svg`, `Setting up Icon.svg`.

### 🎨 Design Philosophy (Critical)
**Wallets DO NOT have predefined types!** Users define wallet purpose by naming them (e.g., "Groceries", "Trip to Cape Town", "Emergency Fund"). The wallet `type` field exists ONLY for internal backend classification and defaults to 'custom'. Never expose type selection to users.

### Design flow steps
1. **Add Wallet:** Name (free-form) → Select Icon (emoji keyboard) → Auto Pay toggle (optional) → Auto Pay modal flow (if enabled) → Save
2. **Wallet Detail:** View balance → History (tabs: Added/Spendings) → Quick actions (Add Money, Send, Settings)
3. **Wallet Settings:** Edit name/icon → Configure Auto Pay (modal) → Save
4. **Auto Pay Config modal:** Select Method → Select Pay From → Select Number Of Payments → Set Date → Set Time → Review → Save
5. **Wallet History:** Filter by transaction type (Added vs Spendings tabs) → View transaction details

Existing routes:
- Wallet list / picker: `app/(authenticated)/wallets/index.tsx`
  - Includes “Add Wallet” CTA.
- Wallet create/add: `app/(authenticated)/wallets/add.tsx`
- Wallet settings: `app/(authenticated)/wallets/[id]/settings.tsx`
- Wallet detail: `app/(authenticated)/wallets/[id]/index.tsx`
  - Loads wallet + transaction list via `services/wallets` and `services/transactions`
  - “Add Money” is currently `coming soon` in this screen (it shows `Alert.alert(...)` placeholder).
- Send money entry from a wallet:
  - `WalletDetailScreen` uses `router.push('/send-money?fromWalletId=${id}')`
  - Note: the existing send-money flow entry at `app/send-money/index.tsx` redirects immediately to `/send-money/select-recipient` and does not consume `fromWalletId` (so the wallet-prefill behavior is currently `TBD`).

State expectations:
- Any wallet mutation must end with a balance refresh so wallet detail UI is correct immediately.
- Use a single “refresh target” per mutation to avoid stale UI.

### ⚠️ WALLET IMPLEMENTATION UPDATE (March 2026)

**What Changed:**
- ✅ Removed user-visible wallet type classification from wallet creation/editing flows.
- ✅ Added emoji keyboard selection flow for wallet icon setup (`Setting up Icon.svg` intent).
- ✅ Added `app/(authenticated)/wallets/[id]/settings.tsx` and wired wallet detail Settings action to it.
- ✅ Added Auto Pay toggle on wallet add flow to mirror SVG behavior.
- ✅ Added guided step-by-step Auto Pay modal flow matching the SVG sequence.
- ✅ Removed Copilot wallet-type selector export to enforce no-classification in wallet UI flows.

**UI consistency contract (implemented):**
- Form CTAs use pill shape (`borderRadiusPill`) with 56px height.
- Major form inputs use pill shape (`components.input.borderRadius`).
- Groups and Loans CTAs use brand primary (`colors.brand.primary`) instead of legacy dark primary, including empty-state/create/apply buttons.
- Banking empty-state/action CTAs also use brand primary + pill radius (e.g., `cash-out/bank` and `banking/linked-accounts` "Link Bank Account").
- Receipt success screens now share reusable primitives in `components/receipts/*` (`SuccessHero`, `ReceiptCard`, `ReceiptShareButton`) to reduce duplication.
  - Bottom success actions are standardized via `components/receipts/SuccessActionFooter.tsx` (shared spacing, border, and CTA stack).
  - Applied across:
    - `app/send-money/success.tsx`
    - `app/(authenticated)/pay-merchant/success.tsx`
    - `app/(authenticated)/cash-out/success.tsx`
- This tokenized pattern is now applied in Wallet Add/Settings and rolled into shared `components/ui/Button.tsx` for reuse across forms/screens.

**Backend Endpoints Needed (normalized, no `/mobile/`):**

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/wallets/:id` | PATCH | Update wallet name/icon/color | ✅ Available |
| `/api/v1/wallets/:id/autopay` | POST | Enable/create Auto Pay config | 🚫 Contract added; server wiring pending |
| `/api/v1/wallets/:id/autopay` | GET | Fetch Auto Pay config | 🚫 Contract added; server wiring pending |
| `/api/v1/wallets/:id/autopay` | PATCH | Update Auto Pay config | 🚫 Contract added; server wiring pending |
| `/api/v1/wallets/:id/autopay` | DELETE | Disable Auto Pay | 🚫 Contract added; server wiring pending |
| `/api/v1/transactions` | GET | Filter with `walletId` and `type=credit|debit` | ⚠️ Partial (client filters in wallet history screen) |

**Auto Pay route contract (request/response):**
- `POST /api/v1/wallets/:id/autopay` body:
  - `method`: `'monthly' | 'biweekly' | 'weekly'`
  - `payFromId`: `string` (linked bank account id)
  - `numberOfPayments`: `number` (>=1)
  - `debitDate`: `YYYY-MM-DD`
  - `debitTime`: `HH:mm` (24-hour)
- Response (POST/PATCH/GET):
  - `{ enabled: boolean, config?: { method, payFromId, numberOfPayments, debitDate, debitTime } }`
- `DELETE` response:
  - `{ enabled: false }`

**Modal-to-contract mapping (SVG -> payload):**
- `Select Method.svg` -> `method`
- `Select Pay From.svg` -> `payFromId`
- `Select Number Of Payments.svg` -> `numberOfPayments`
- `Set Date.svg` -> `debitDate`
- `Set Time.svg` -> `debitTime`

**Wallet Type Philosophy:**
- `wallet.type` is internal-only (backend classification for analytics)
- **Never show type selection to users**
- Users name wallets freely (e.g., "Groceries", "Trip Fund")
- Backend auto-defaults `type` to 'custom'

---

## Implementation notes (to prevent regressions)

1. No silent state divergence:
   - If both Context and store exist for the same data, choose one source of truth for refresh in each flow.
2. Always keep user on the screen on errors:
   - Inputs should be correctable without restarting the flow.
3. Never assume client-side success:
   - Only navigate forward after API confirms success.
4. Keep success screens/overlays consistent:
   - For actions that already have a success screen, prefer navigation over replacing the current screen content.
 
## 9) App-complete coverage (flows + screen states)

**Figma:** Full mapping in "Figma design spec reference (Smartpay)" above; Screen → nodeId table and Full app coverage table. All spec screens (50+) map to Smartpay routes or PRD wireframes.

This section extends the earlier flow-focused documentation into an app-wide “coverage contract” (what exists today, what is `coming soon`, and what is `TBD`).

### Status code legend (used throughout this document)
- `✅ Implemented` = production-ready in this snapshot.
- `⚠️ Partial` = present but incomplete (missing states, missing wiring, or only mock/hardcoded logic).
- `🚫 Stub` = explicit TODO / not implemented UI.
- `TBD` = not implemented or endpoints exist but UI/wiring is missing.
- `coming soon` = UX is expected but not yet delivered (placeholders, navigation stubs, or “Alert placeholder” behavior).

### App-wide screen completeness matrix
Source: `SCREEN_AUDIT_REPORT.md` (Section 5).

| Screen | Status |
|--------|--------|
| Home (authenticated) | **Good** |
| Send Money Flow | **Excellent** |
| Cash Out Confirm | **Stub** |
| Pay Merchant Confirm | **Stub** |
| KYC Flow | **Good** |
| Proof of Life | **Good** |
| Banking Integration | **Good** |
| Groups | **Excellent** |
| Wallets | **Excellent** |
| Activity | **Good** |
| Profile | **Fair** |
| Notifications | **Good** |
| Loans | **Fair** |
| Agents | **Fair** |
| Voucher | **Fair** |

### Endpoint normalization note
This doc intentionally uses the API format you requested: remove `/mobile/` after `/v1/` (example: `/api/v1/groups`).

### 9A) POV user journeys (Sender vs Recipient) - app-wide addendum
#### Recipient POV: Receive money via NAMQR
- Recipient opens `app/(authenticated)/receive/index.tsx` and sees their NAMQR + SmartpayID.
- Recipient optionally shares/copies SmartpayID.
- Sender scans NAMQR and uses the Send Money flow (already covered in the flow sections).
- Recipient receives the outcome via `Notifications` (push/local storage) and/or by seeing the updated `Activity` timeline.
- Known gap: recipient-side deep-link attribution for payment results depends on deep link handling (see `SCREEN_AUDIT_REPORT.md` deep-link gaps).

#### Sender POV: Request money (not yet delivered end-to-end)
- Sender should create a payment request and share a request deep link/QR.
- Recipient should accept/pay the request and trigger a completion state + notification.
- Current snapshot: UI for `request-money` is missing, even though `services/receive.ts` contains `generatePaymentRequest(...)`.

## 10) Receive money (QR display + optional payment request)

**Figma:** Request money POV: After receive request sent 171:574; Receiver's POV 172:630. Receive/My QR use NAMQRDisplay (minSize 200, borderRadius 12); no dedicated receive screen nodeId in spec—implement from PRD.

### Routes
- Receive main: `app/(authenticated)/receive/index.tsx`
- Receive full-screen QR: `app/(authenticated)/receive/qr.tsx`

### What is “wired” in this snapshot
- QR generation is client-side using NAMQR (`generateNAMQR`) plus a SmartpayID sourced from `UserContext` in the screen.
- Backend endpoints are not used for NAMQR generation inside the `receive` screen routes.

### Screen step -> service -> API endpoint (Receive)
| Screen step | Service/function | API endpoint (normalized) |
|------------|-------------------|-----------------------------|
| Show SmartpayID | `UserContext` (screen uses `user?.smartpayId`) | (Context fetch; see Profile section) |
| Generate NAMQR | `generateNAMQR(...)` (client utility) | n/a |

### Payment request (Request Money) support already exists as a service
- Service: `services/receive.ts`
- Functions:
  - `generatePaymentRequest(...)` -> **creates** a payment request in backend.
  - `POST /api/v1/payment-requests`

Known gap / TBD:
- There is no `request-money` UI flow screen set in this snapshot.
- `validateReceiveQR(...)` and `generatePaymentRequest(...)` are currently not connected to any screen actions in the app.

## 11) Copilot (agentic assistant + tool calling)

**Figma:** No dedicated Copilot screen in spec; chat UI uses same design tokens (Primary CTA, Input/Large, ListItem). New feature / Frame variants 723:8369, 723:8361, 723:8363, 723:8378 may be used for future home integrations.

### Route
- Copilot tab UI: `app/(authenticated)/(tabs)/copilot/index.tsx`
- It renders `CopilotProvider` + `CopilotChatSurface`.

### Chat transport and environment wiring
- Canonical chat path from mobile is `POST /api/v1/copilot` through `services/api.ts` (inherits bearer token + retry/error handling).
- Optional direct override is supported via `EXPO_PUBLIC_COPILOT_API_URL` in `components/copilot/CopilotChatSurface.tsx`:
  - First attempts `POST {COPILOT_API_URL}/api/v1/copilot`
  - Falls back to `POST {COPILOT_API_URL}/api/v1/copilot/chat` if needed.
- Environment variables:
  - `EXPO_PUBLIC_API_BASE_URL` (required)
  - `EXPO_PUBLIC_COPILOT_API_URL` (optional override)
  - `EXPO_PUBLIC_AI_API_BASE_URL` (optional for direct AI integrations)

### Tool functions -> key backend endpoints
Tools are defined in `services/copilotTools.ts` (`copilotTools = { ... }`).

| Copilot tool/function | Purpose | API endpoint (normalized) |
|-----------------------|---------|------------------------------|
| `get_recent_activity` | summarize recent transactions | `GET /api/v1/transactions/summary` |
| `initiate_send_money` | send money initiation | `POST /api/v1/send-money` |
| `initiate_cashout` | cash-out initiation by method | `POST /api/v1/cash-out/:method` |
| `redeem_voucher` | voucher redemption | `POST /api/v1/vouchers/:voucherId/redeem*` |
| `get_proof_of_life_status` | PoL status + due date | `GET /api/v1/user/profile` |
| `start_proof_of_life` | initiate PoL verification | `POST /api/v1/user/proof-of-life` |
| `get_loan_offer` | voucher-backed loan eligibility | `GET /api/v1/loans/eligibility` |
| `apply_for_loan` | apply for loan | `POST /api/v1/loans/apply` |

Known gaps / TBD:
- PoL completion endpoint exists in `services/profile.ts` (`POST /api/v1/user/proof-of-life/verify`) but is not explicitly wired into Copilot tool calling in this snapshot.

## 12) Proof of Life (PoL)

**Figma:** Proof-of-life reminder (nodeId null)—PRD §3.6 screen 50b; components: Primary CTA, Secondary CTA, Text block; interactions: Verify now, Remind later, Learn more. Touch target primaryButton 56px.

### Routes
- Status/CTA intro: `app/(authenticated)/proof-of-life/intro.tsx`
- “Verification Required” screen: `app/proof-of-life/index.tsx` (simple UI)

### Screen step -> service -> API endpoint (PoL)
| Screen step | Service/function | API endpoint (normalized) |
|------------|-------------------|------------------------------|
| Load current PoL status card | `services/profile.fetchProfile()` | `GET /api/v1/user/profile` |
| “Verify Now” CTA | routes user to Copilot | n/a |
| Copilot PoL status tool | `copilotTools.get_proof_of_life_status` | `GET /api/v1/user/profile` |
| Copilot PoL initiation tool | `copilotTools.start_proof_of_life` | `POST /api/v1/user/proof-of-life` |

Known gap / TBD:
- PoL verification completion should call `services/profile.completeProofOfLife(...)` -> `POST /api/v1/user/proof-of-life/verify`.
- Current snapshot does not show a dedicated “complete PoL” screen or explicit Copilot tool for completion.

## 13) KYC
**Figma:** KYC uses standard Input/Large + Primary CTA patterns, followed by a guided “Upload documents + selfie video” step.
Selfie video is required for OpenCV liveness detection (blink/movement analysis) before documents move into the “review” stage.

### Routes
- KYC intro/tiers: `app/(authenticated)/kyc/intro.tsx`
- KYC submission + document upload: `app/(authenticated)/kyc.tsx`

### Screen step -> service -> API endpoint (KYC)
| Screen step | Service/function | API endpoint (normalized) |
|------------|-------------------|------------------------------|
| Load current tier/limits | `services/profile.fetchProfile()` | `GET /api/v1/user/profile` |
| Check KYC status | `services/kyc.getKycStatus()` | `GET /api/v1/kyc/status` |
| Enter identity + upload docs + selfie video (before review) | `services/kyc.submitKyc(...); services/kyc.uploadKycDocuments(...)` | `POST /api/v1/kyc/submit` then `POST /api/v1/kyc/upload-documents` |

Liveness detection contract (backend):
- `POST /api/v1/kyc/upload-documents` stores `id_document_front`, `id_document_back` (optional), `proof_of_residence`, `business_certificate` (optional), and required `selfie_video`.
- The backend then calls the recognition service liveness endpoint for OpenCV/MediaPipe analysis:
  - `POST /api/v1/liveness/video`
- On liveness pass, backend transitions `kyc_submissions.status` to `pending_documents`.
- On liveness fail, backend transitions `kyc_submissions.status` to `liveness_failed` and mobile shows retry UX.

UX feedback (implemented in `app/(authenticated)/kyc.tsx`):
- Users first complete identity inputs + upload the required documents and selfie video, then tap a single “Submit for verification” CTA.
- The app immediately calls `POST /api/v1/kyc/submit` and then `POST /api/v1/kyc/upload-documents` in sequence; the status card appears only after the full upload step is attempted.
- If liveness fails during `upload-documents`, the screen shows an error modal and keeps the upload step visible for retry (identity inputs are locked during the upload retry stage).
- If a user enters the KYC screen and `kycVerified=true`, they see a “KYC verified” completion modal once.

Notifications:
- Push/local notifications for KYC completion are not wired yet; users see status via the KYC status card + the submission/completion modal.

Known gap / TBD:
- Server-side liveness detection depends on the liveness recognition service being reachable from the backend runtime.

## 14) Banking & Open Banking (OBS / OAuth)

**Figma:** Available bank accounts 44:537, 60:62 (Bank list, OAuth entry). Flow: Bank selection → OAuth WebView → redirect `buffr://oauth-callback` (app scheme for Smartpay; register the same scheme + path in bank AS / TPP redirect allowlists for each environment).

### Production alignment (engineering)

- **Ecosystem summary:** Keep this section aligned with [`FULL_ECOSYSTEM_INTEGRATION_2026-03-22.md`](../../../FULL_ECOSYSTEM_INTEGRATION_2026-03-22.md) (v5.0 split, OAuth on **Buffr AIS Platform**, canonical **`/api/v1/*`**, Ketchup vs Buffr hostnames, deployment checklist).
- **Two SDKs (do not conflate):** **`@buffr/connect-sdk`** is the **external** TPP client; its `baseUrl` must target **`buffr-ais-platform`** (or your gateway). The monorepo also ships an **internal** **`@buffr/sdk`** for first-party apps (including SmartPay mobile patterns) — it may call the SmartPay backend and other internal bases; wire env vars accordingly. See ecosystem doc *SDK Architecture*.
- **Buffr stack (TPP / AIS hub):** **`buffr-connect/buffr-ais-platform`** is the **standalone** OIDC + AIS API surface. Browser login, **`/consent`**, PAR, authorize, and token exchange for that deployment are on the **AIS platform origin** — not `buffrconnect` (portal / TPP UI). Details: [`BUFFR_AIS_PLATFORM_GUIDE.md`](../../../buffr-connect/BUFFR_AIS_PLATFORM_GUIDE.md), Buffr PRD §7.4.1.
- **Code duplication (engineering debt):** Ecosystem analysis flags **heavy overlap** between `buffrconnect` and `buffr-ais-platform` (~75% / ~2.2k lines cited in the integration guide). Mobile and backend features that touch AIS should treat **AIS Platform** as the canonical integration surface and expect **consolidation** over time — avoid hard-coding portal-only paths for production AIS.
- **Per-bank Ketchup hosts:** Bank authorization / AIS UIs are **not** ketchup-portals routes; use separate deploys per bank (e.g. `fnb.ketchup.cc`, …). See [`DNS_AND_REDIRECTS.md`](../../../ketchup-smartpay/ketchup-portals/docs/DNS_AND_REDIRECTS.md).
- **Public API base (Ketchup layout):** Prefer **one** canonical backend URL per environment (e.g. **`https://api.ketchup.cc`** for `BUFFR_API_URL` / mobile→backend) to avoid split-brain callbacks and webhooks — see DNS doc and ecosystem guide.
- **TPP / token exchange:** Mobile talks to SmartPay backend for OBS confirm; bank OAuth endpoints come from provider config. Align redirect URIs and simulator URLs with [`OAUTH_QUICK_START.md`](../../../buffr-connect/buffrconnect/docs/guides/OAUTH_QUICK_START.md) when using Buffr Connect simulators.
- **OIDC nuance:** If integrating strictly as an OIDC Relying Party against `buffr-ais-platform`, note the token endpoint currently returns **OAuth2-style** tokens (`access_token`, `refresh_token`, …); an **`id_token`** may be absent despite `openid` in discovery — see ecosystem doc *Implementation notes — OIDC & API paths*.
- **Env (typical):** `EXPO_PUBLIC_API_BASE_URL` → SmartPay backend; any `EXPO_PUBLIC_*` open-banking or Copilot overrides must match the DNS matrix in `DNS_AND_REDIRECTS` + backend `BUFFR_CONNECT_URL` / `OPEN_BANKING_*` (see backend `.env.example`).
- **Build / QA (March 2026 sessions):** Run **`npm run build`** on **`buffr-ais-platform`** and on each **bank simulator** you rely on before release; recent work touched Next.js 15, dynamic route exports, and ESLint/`require()` patterns — simulators may fail build until aligned. Branding P0–P2 for bank UIs is documented under `buffr-connect/buffrconnect/BANK_BRANDING_*.md` and does not replace production AIS hosting.

### Routes
- Bank selection: `app/(authenticated)/banking/link-bank.tsx`
- Consent review: `app/(authenticated)/banking/consent-review.tsx`
- OAuth callback: `app/(authenticated)/banking/oauth-callback.tsx`
- Linked accounts list: `app/(authenticated)/banking/linked-accounts.tsx`
- Account details: `app/(authenticated)/banking/account-details/[id].tsx`

### Screen step -> service -> API endpoint (Banking)
| Screen step | Service/function | API endpoint (normalized) |
|------------|-------------------|------------------------------|
| Select a bank and start consent | `services/openBanking.initiateConsent(...)` | client-side OAuth; backend sync later |
| Approve/reject consent (OBS layer) | `consent-review.tsx` direct fetch | `POST /api/v1/obs/v1/authorize/confirm` |
| Handle OAuth redirect | `services/openBanking.handleOAuthCallback(...)` | token exchange is to the bank; accounts stored locally (`SecureStore`) |
| Sync linked accounts to Smartpay | n/a | No backend sync API for local OAuth-linked accounts |
| Disconnect linked account | `openBanking.disconnectBank(...)` | Bank token revoke + local `SecureStore` update (no SmartPay `/banking/*` API) |
| Load linked accounts | `openBanking.getLinkedAccounts()` | stored in SecureStore (no backend call in this snapshot) |

Known gaps / TBD (per audit):
- Re-linking expired accounts
- Bank transaction sync status / “last sync” UX

## 15) Agents & location finder

**Figma:** No dedicated Agents list screen in spec; Scan QR 81:465 used for agent/till/merchant/ATM cash-out. Use ListItem, MethodCard, Primary CTA (as in Loans 108:276) for agent list/detail.

### Routes
- Canonical finder route: `app/(authenticated)/location-finder/index.tsx`
- Backward-compatible alias route: `app/(authenticated)/location-finder-example.tsx` -> redirects to canonical route
- Legacy entry alias: `app/agents/index.tsx` -> redirects to canonical route

### What is wired today
- A single production map finder screen handles agents, ATMs, and NamPost tabs.
- Home Services now routes to this unified map entry (`Map` tile).
- Deep-link params supported: `tab=agents|atms|nampost`, `service=cashout|voucher|ewallet|namqr|all`, `query=<nampost search>`.

### Backing service (exists, not wired to this snapshot UI)
Service: `services/agents.ts`

| Service/function | API endpoint (normalized) |
|-------------------|------------------------------|
| `getNearestAgents(...)` | `GET /api/v1/agents/nearest` |
| `getAgentByCode(...)` | `GET /api/v1/agents/:agentCode` |
| `getAgentsByRegion(...)` | `GET /api/v1/agents/region/:region` |

Copilot / map flows also use `services/copilot/locationService.ts`:
| `findNearbyAgents(...)` | `GET /api/v1/agents/nearest` |
| `findNearbyATMs(...)` | `GET /api/v1/atms/nearby` (alias of nearest with `type=atm`) |
| `findNampostOffices(...)` | `GET /api/v1/locations/nampost` (alias of nearest with `type=nampost`) |

Known gap / TBD:
- Improve regional NamPost query defaults (currently defaults to `Windhoek` when no query is provided).

## 16) Loans

**Figma:** Loans 108:276 (ListItem, MethodCard, Primary CTA); Active Loan Details 111:487 (ListItem, Detail rows, Primary CTA, TwoFAModal). Active Offer Details 111:629 for /offers/[id] if used.

### Route
- `app/loans/index.tsx`

### What is wired today
- The screen currently renders a hardcoded list of loan offers.

### Backing service (exists, not wired to this snapshot UI)
Service: `services/loans.ts`

| Service/function | API endpoint (normalized) |
|-------------------|------------------------------|
| `checkLoanEligibility()` | `GET /api/v1/loans/eligibility` |
| `applyForLoan(...)` | `POST /api/v1/loans/apply` |
| `getLoans()` | `GET /api/v1/loans` |
| `getLoanById(...)` | `GET /api/v1/loans/:id` |

Known gaps / TBD:
- Loan offers + apply should be connected to real backend data.
- Loan history/detail UX is not represented in this snapshot.

## 17) Notifications (Activity removed)

**Figma:** Wallet history 152:427, Transactions 114:302 (ListItem, TabBar); Notifications 153:566 (ListItem). Same list/detail patterns as Transaction details 115:495.

Notes on Activity:
- The `Activity` tab has been removed from the bottom navigation to avoid duplicating the Transactions UX.
- The `app/(authenticated)/(tabs)/activity.tsx` route file has been removed; transaction history is handled in the `Transactions` tab.

Since Activity is removed, transaction history rendering should be handled in `TransfersScreen` (Transactions tab).

### Notifications routes & entry points
- **Inbox (authenticated):** `app/(authenticated)/notifications.tsx` — list, pull-to-refresh, mark read / clear, link to preferences. **URL:** `/notifications` (Expo Router omits the `(authenticated)` group segment).
- **Preferences (canonical):** `app/notifications-settings.tsx` — toggles + permission copy (pairs with inbox), accessed from Profile/Account Settings.
- **Home header:** `app/(authenticated)/(tabs)/_layout.tsx` — bell uses `router.push('/notifications')`, `notificationBadge` when `unreadCount > 0`.
- **Profile:** `app/(authenticated)/profile/index.tsx` — “Notification Preferences” → `/notifications-settings`.

### State & services
- **Context:** `contexts/NotificationsContext.tsx`
  - On startup and on screen focus (`useFocusEffect` in inbox), calls `getNotifications()` and **merges** API rows with any device-only items still in AsyncStorage (same `id` dedupes).
  - **Unread badge** is derived from `notifications` (`useMemo`); `expo-notifications` badge is synced in a `useEffect`.
  - **markAsRead / delete / mark-all / clear-all:** updates local cache; for PostgreSQL UUID ids, also calls REST (`PATCH` / `DELETE` / `POST mark-all-read`). **clear-all** deletes server rows in chunks, then clears local storage.
- **API mapping:** `services/notificationMapping.ts` — maps backend rows to `NotificationData`; unknown `type` → `system_announcement`.
- **Expo:** `services/notifications.ts` — channels, local schedule, push token cache, payload parse / deep link (`expo-notifications`; **Expo Go SDK 53+** has limited push — use a dev build for full remote push).

**Database:** `fintech/database/migrations/043_user_notifications.sql` creates `notifications` (apply before relying on inbox APIs in non-dev DBs).

Server endpoints (`services/notifications.ts`):
| Service/function | API endpoint (normalized) |
|-------------------|------------------------------|
| `getNotifications(...)` | `GET /api/v1/notifications` |
| `markNotificationAsRead(...)` | `PATCH /api/v1/notifications/:id/read` |
| `markAllNotificationsAsRead()` | `POST /api/v1/notifications/mark-all-read` |
| `deleteNotification(...)` | `DELETE /api/v1/notifications/:id` |

### Backend degraded-mode consistency (empty-state first load)
- To avoid noisy first-load failures when PostgreSQL is transiently unavailable, list endpoints now return empty-state payloads (HTTP 200) instead of hard 500s for timeout/connection-reset class errors.
- `GET /api/v1/groups` -> `{ success: true, data: { groups: [], count: 0 }, meta: { degraded: true, reason: 'temporary_database_unavailable' } }`
- `GET /api/v1/notifications` -> `{ notifications: [], unreadCount: 0, total: 0, meta: { degraded: true, reason: 'temporary_database_unavailable' } }`
- `GET /api/v1/wallets` -> `[]`
- Mobile remains functional for first-time users (no groups/wallets/notifications yet) and can recover automatically on next refresh.

### Regulatory / product notes (Namibia-aligned)
- **Consent:** Inbox shows a banner when push permission is off; full explanation + device settings live in `NotificationPermissionPrompt` / settings screen (customer communications should be **opt-in** where required).
- **Data minimization:** Push and list copy should avoid unnecessary PII in titles/bodies (align with PSD-style cybersecurity and customer communication practice — details belong in-app behind auth).
- **Audit / traceability:** Server-backed notifications support evidence of “customer informed” for KYC, proof-of-life, and payment events when the backend inserts rows into `notifications`.
- **Open banking (OBS):** Consent and account notifications remain governed by the banking consent flows; do not use marketing push for account data without explicit preference toggles.

### Known follow-ups (optional)
- Register Expo push tokens with SmartPay backend when an endpoint exists (token currently cached locally only).
- Bulk `DELETE` API if “clear all” should be one round-trip instead of chunked deletes.

## 18) Profile & Settings

**Figma:** Main Screen (Profile tab) 725:8543 (TabBar, Profile content). Settings, Edit profile, security/language toggles: use Input/Large, ListItem, Primary CTA from design system; no dedicated nodeIds in spec.

### Routes
- Profile: `app/(authenticated)/profile/index.tsx`
- Settings: `app/(authenticated)/profile/settings.tsx`
- Edit profile: `app/(authenticated)/profile/edit-profile.tsx` (route exists; service wiring to confirm)
- Help Center entry (from profile): redirects to Copilot tab `/(authenticated)/(tabs)/copilot` for support conversations and escalation.

Profile service:
- `services/profile.fetchProfile()` -> `GET /api/v1/user/profile`

Settings screen (snapshot behavior):
- `profile/settings.tsx` currently manages toggles and navigation routes locally (it does not call backend endpoints in this snapshot).
- Copilot escalation support exists via tool `create_incident_report` (`services/copilotTools.ts`), which posts to `POST /api/v1/incidents`.

Known gaps / TBD (per audit recommendations):
- Security settings screen(s) (change PIN, biometric toggle, 2FA changes)
- Language settings screen(s)

## 19) Lock (re-auth gate)

**Figma:** No dedicated Lock screen in spec; use same TwoFAModal ("Verify identity") and OTPInput/PIN patterns as onboarding (44:509, 45:681). Status Bar 83:7, Home Indicator 639:3876 on all screens.

### Route
- `app/(authenticated)/(modals)/lock.tsx`

Snapshot behavior:
- Local biometric prompt and/or PIN entry unlocks the session.
- It clears inactivity timer via `services/inactivityStorage.clearInactivityTime()`.

Known gap / TBD:
- If the backend requires re-auth tokens (SCA gating), there is no explicit server re-auth endpoint shown in this snapshot. If needed, add a backend-backed unlock API later.

## 20) Integration tests (vouchers & Buffr webhooks)

**Purpose:** End-to-end checks against a real Postgres + running SmartPay backend (not run in default `npm test`).

| Script | Command |
|--------|---------|
| Unit (default) | `npm test` — excludes `real-*` integration specs and `integration/setup/` (mocked `copilot-flows` still runs) |
| Integration | `npm run test:integration` — `real-*.integration.test.ts` |

**Environment:**
- `TEST_DATABASE_URL` or `DATABASE_URL` — same database the backend uses for voucher rows.
- `BUFFR_WEBHOOK_SECRET` — must match the backend process when testing `POST /api/buffr/webhooks`.
- `TEST_BACKEND_PORT` (optional) — backend port; default `4000` → `http://localhost:4000`.

**Schema:** Apply `fintech/database/migrations/044_vouchers_portal_columns.sql` (or full migrate) so `vouchers` includes `voucher_code`, `redemption_method_allowed`, etc.

**Primary test file:** `__tests__/integration/real-voucher-flow.integration.test.ts` (webhook `voucher.issued`, redemption, idempotency).

**Server:** Start the backend separately (`apps/smartpay-backend`, `npm run dev`) with matching `DATABASE_URL` and `BUFFR_WEBHOOK_SECRET` before running integration tests, unless you extend the suite to spawn the server (see `__tests__/integration/setup/test-servers.ts`).

