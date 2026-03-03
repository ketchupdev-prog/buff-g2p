# Buffr G2P App – Complete Flow & Design Reference

**Last Updated:** March 2026  
**Platform:** Mobile-first (393×852 viewport), React Native (Expo) + Tailwind CSS  
**Target Region:** Namibia (N$ currency, NamPost branding)  
**Authentication:** OTP via SMS **or email** (user selects during onboarding)

---

## 1. Architecture Overview

```
App.tsx (root)
  +-- ThemeProvider          (dark/light mode)
  +-- UserProvider           (global user state)
      +-- AppContent         (screen router + state management)
          +-- OnboardingFlow (10-step wizard)
          +-- HomeScreen     (central hub)
          +-- 31 other screens (conditional rendering)
          +-- NotificationCenter (overlay)
```

- **Routing:** State-based screen switching via `useState<Screen>` in `AppContent`. No React Router; a single `navigateTo(screen, data?)` function manages all transitions.
- **Screen Type Union:** 33 registered screen keys (see §3).

---

## 2. Global State & UserContext

| Field | Type | Set During |
|---|---|---|
| `firstName` | `string` | Onboarding (Step 5) |
| `lastName` | `string` | Onboarding (Step 5) |
| `phoneNumber` | `string` | Onboarding (Step 3) |
| `email` | `string` | Onboarding (Step 3) – new field for email OTP |
| `profilePicture` | `string \| null` | Onboarding (Step 6) |
| `buffrId` | `string` | Onboarding completion (`BFR` + 7 digits) |
| `cardNumber` | `string` | Onboarding completion (dynamic) |
| `createdAt` | `string` | Onboarding completion |

**Wallets Array** (`Wallet[]`): fields `id`, `name`, `icon`, `balance`, `autoPayEnabled`, `autoPayConfig`, `createdAt`.  
**Linked Accounts Array** (`LinkedAccount[]`): bank account details.

**Default wallet:** `main-wallet` with N$ 12,345.67 balance.  
**Default linkaccount:** Nedbank cheque account (X0293).

**ThemeContext:** Provides `theme` (`light` \| `dark`) and `toggleTheme()`.

---

## 3. Screen Registry (33 Screens)

All screens listed with keys and components.

| Screen Key | Component | Purpose | Route |
|---|---|---|---|
| `onboarding` | `OnboardingFlow` | 10-step wizard | `/onboarding/*` |
| `home` | `HomeScreen` | Central hub | `/(tabs)/home` |
| `transactions` | `TransactionsBalance` | Transaction history | `/(tabs)/transactions` |
| `loans` | `LoansScreen` | Voucher-backed loans | `/loans` |
| `qr-code` | `YourQrCode` | Display user's QR | `/profile/qr-code` |
| `send-money` | `SendMoneyFlow` | P2P send | `/send-money/*` |
| `ai-chat` | `AIChatScreen` | Financial assistant | `/profile/ai-chat` |
| `bill-payments` | `BillPaymentsScreen` | Pay bills | `/bills` |
| `vouchers` | `VouchersScreen` | List vouchers | `/(tabs)/vouchers` |
| `voucher-detail` | `VoucherDetailScreen` | Voucher details | `/utilities/vouchers/[id]` |
| `add-wallet` | `AddWallet` | Create new wallet | `/add-wallet` |
| `agent-network` | `AgentNetworkScreen` | Find agents | `/agents` |
| `cash-out-agent` | `CashOutAtAgent` | Cash out at agent | `/wallets/[id]/cash-out/agent` |
| `merchants` | `MerchantsScreen` | Browse merchants | `/(tabs)/merchants` |
| `pay-merchant` | `PayMerchant` | Pay merchant | `/merchants/[id]/pay` |
| `nampost` | `NamPostScreen` | NamPost branches | `/utilities/vouchers/redeem/nampost` |
| `cashback-till` | `CashbackTillScreen` | Cashback at till | `/wallets/[id]/cash-out/till` |
| `smartpay-units` | `SmartPayUnitsScreen` | SmartPay units | `/utilities/vouchers/redeem/smartpay` |
| `wallet-cash-out` | `WalletCashOutScreen` | Cash-out method hub | `/wallets/[id]/cash-out` |
| `profile` | `ProfileScreen` | User profile | `/(tabs)/profile` |
| `settings` | `SettingsScreen` | App settings | `/profile/settings` |
| `analytics` | `AnalyticsScreen` | Spending analytics | `/profile/analytics` |
| `location-services` | `LocationServicesScreen` | Map of agents | `/profile/location` |
| `groups` | `GroupsScreen` | List groups | `/groups` |
| `create-group` | `CreateGroupScreen` | Create group | `/groups/create` |
| `group-view` | `GroupViewScreen` | Group detail | `/groups/[id]` |
| `group-send` | `GroupSendScreen` | Send to group | `/groups/[id]/send` |
| `group-payment-success` | `GroupPaymentSuccess` | Success screen | `/groups/[id]/send/success` |
| `group-request` | `GroupRequestScreen` | Request from group | `/groups/[id]/request` |
| `group-request-success` | `GroupRequestSuccess` | Request success | `/groups/[id]/request/success` |
| `group-settings` | `GroupSettingsScreen` | Edit group | `/groups/[id]/settings` |
| `send-to` | `SendToScreen` | Select recipient | `/send-money/select-recipient` |
| `receiver-details` | `ReceiverDetailsScreen` | Enter amount/note | `/send-money/receiver-details` |
| `payment-success` | `PaymentSuccess` | Generic success | `/send-money/success` |
| `card-view` | `CardViewScreen` | View cards | `/cards` |
| `add-card` | `AddCardScreen` | Add payment card | `/add-card` |
| `wallet-detail` | `WalletDetailScreen` | Wallet details | `/wallets/[id]` |
| `link-account` | `LinkAccountScreen` | Link bank account | `/profile/link-account` |
| `edit-auto-pay` | `EditAutoPayScreen` | Configure auto-pay | `/wallets/[id]/auto-pay` |

---

## 4. Onboarding Flow (10 Steps) – Including Email OTP

**Component:** `OnboardingFlow` (`/components/OnboardingFlow.tsx`)

Internal step machine with `Step` type:

| Step | Screen | Description |
|---|---|---|
| 1 | `load` | Splash screen, auto-advances 2s |
| 2 | `start` | Welcome screen with "Get Started" |
| 3 | `enter-credential` | **Phone or Email input** – user can choose to receive OTP via SMS or email via a segmented control. Input field changes accordingly. |
| 4 | `verify-otp` | 6-digit OTP entry (sent via SMS or email). Auto-detect OTP from clipboard if possible. |
| 5 | `enter-name` | First name + last name |
| 6 | `upload-photo` | Profile picture (camera/gallery) |
| 7 | `verifying` | Processing animation (2s) |
| 8 | `animation` | Transition effect (1.5s) |
| 9 | `completed` | Account created success |
| 10 | `faceid` | Face ID / biometric setup (optional) |

**Step Transitions:**

```
load (2s) --> start --> enter-credential --> verify-otp --> enter-name --> upload-photo --> verifying (2s) --> animation (1.5s) --> completed --> onFinish() --> home
```

**Email OTP Implementation:**
- In `enter-credential` screen, user selects between "Phone" and "Email" via segmented control.
- Input field changes accordingly (phone keyboard or email keyboard).
- On submit, call `POST /api/v1/mobile/auth/send-otp` with `{ phone?: string, email?: string }`. Backend sends OTP to the provided contact.
- OTP verification screen works the same for both channels.

---

## 5. Home Screen & Hub Navigation

**Component:** `HomeScreen` (`/components/HomeScreen.tsx`)

**Header Section:**
- Profile avatar (tap → `profile`)
- Welcome message with user's first name
- Search bar (filters services, transactions, contacts)
- Notification bell (opens `NotificationCenter` overlay)

**Buffr Card Section:**
- `BuffrCard` component (NamPost branded, shows user name + card number)
- Tap card → `card-view`
- "Add Money" button → opens `AddMoneyModal`

**Wallets Section:**
- Scrollable wallet cards via `WalletCard` component
- Each wallet tap → `wallet-detail` (with `walletId`)
- "+" button → `add-wallet`

**Quick Actions Grid (6 items):**
- Send Money → `send-money`
- Groups → `groups`
- Vouchers → `vouchers`
- Bill Payments → `bill-payments`
- Merchants → `merchants`
- Agent Network → `agent-network`

**Recent Contacts Row:**
- Contact avatars for quick P2P send

**Bottom Tab Bar:**
- Home (active) → `home`
- Send → `send-money`
- QR Code → `qr-code`
- Transactions → `transactions`
- Loans → `loans`

---

## 6. Wallet Management

### Screens & Components

| Screen | Description |
|---|---|
| `AddWallet` | Create new wallet with emoji picker, name, auto-pay config |
| `WalletDetailScreen` | View balance, transactions, auto-pay settings |
| `EditAutoPayScreen` | Full-screen auto-pay config editor |
| `WalletCard` | Wallet card component (used on Home) |
| `AddMoneyModal` | Bottom sheet with 3 methods |
| `WalletCashOutScreen` | Cash-out method selection hub |

### Add Wallet Flow

```
home --[+ button]--> add-wallet
  - Set emoji icon (emoji picker modal, 12 emojis grid)
  - Enter wallet name
  - Toggle Auto Pay (optional):
      - Configure: frequency (weekly/bi-weekly/monthly)
      - Deduct date/time (iOS-style rollers)
      - Amount
      - Number of repayments
      - Payment method (bank cards, wallets)
  - Save → success animation → home
```

### Add Money Modal (`AddMoneyModal.tsx`)

- **Trigger:** Home "Add Money" button or Wallet Detail "Add Funds"
- **Content:** Bottom sheet with amount input (N$) and quick amount pills (N$100–5000)
- **3 methods:**
  1. **Bank Transfer** – Shows EFT details (Buffr Financial Services) or navigates to bank transfer flow
  2. **Debit/Credit Card** – Navigates to `/add-card` to link a card
  3. **Redeem Voucher** – Navigates to `/vouchers` to select a voucher
- **Design:** Gradient cards for each method, checkmark selection, continue button.

---

## 7. Card Management

### Screens

| Screen | Description |
|---|---|
| `CardViewScreen` | View Buffr Card and linked cards |
| `AddCardScreen` | Add/edit linked payment card |
| `BuffrCard` | The Buffr/NamPost card visual |

### Flow

```
home --[tap Buffr Card]--> card-view
  - View main Buffr Card (NamPost branding, user name, card number)
  - View linked cards
  - "Add Card" → add-card
  - "Edit" linked card → add-card (with editCard data)
  - Back → home
```

**Add Card Flow:**
- Step 1: `add-card` – "Scan your card" or "Add Card +"
- Step 2 (if scan): `add-card/scan` – camera scan (optional)
- Step 3: `add-card/details` – enter card number, expiry, CVV, cardholder name
- Step 4: `add-card/success` – success state

---

## 8. P2P Flow

### Two Parallel Flows

**Flow A: SendMoneyFlow** (legacy multi-step wizard)

| Step | Component |
|---|---|
| 1. Select Recipient | `SelectRecipient` |
| 2. Enter Amount | `EnterAmount` |
| 3. Select Method | `SelectMethod` |
| 4. Receiver Details | `ReceiverDetails` |
| 5. Payment Success | `PaymentSuccess` |

**Flow B: SendToScreen + ReceiverDetailsScreen** (newer)

```
home -> send-to
  - Search/select contact (via device contacts or manual entry)
  - If person -> receiver-details
      - Enter amount, select pay-from account (wallet or linked card), add note
      - "Pay" -> TwoFactorVerification -> processing -> payment-success
  - If group -> group-view
```

**Payment Success:** Animated green checkmark, receipt card, "Back to Home" button.

---

## 9. Groups & Group Payments

### Screens

| Screen | Description |
|---|---|
| `GroupsScreen` | List all groups (My Groups / Activity tabs) |
| `CreateGroupScreen` | Name group, add members from contacts |
| `GroupViewScreen` | Chat-like group view with message bubbles, Send/Request tabs |
| `GroupSendScreen` | Send money to group members |
| `GroupPaymentSuccess` | Group payment confirmation |
| `GroupRequestScreen` | Request money from group members |
| `GroupRequestSuccess` | Request confirmation with status progress |
| `GroupSettingsScreen` | Group settings, member management |

### Full Navigation Flow

```
home -> groups
  - List groups → tap group → group-view
  - "+" → create-group → group-view

group-view:
  - Chat-like messages with request bubbles
  - Overlapping member photos, gradient divider
  - Glassmorphism tab bar:
      - "Send" → group-send
      - "Request" → group-request
  - Header settings icon → group-settings

group-send:
  - Select account, add note, enter amount
  - "Send" → TwoFactorVerification → group-payment-success
  - Back → group-view

group-payment-success:
  - "Back to Home" → home
  - "View Group" → groups

group-request:
  - Heart icon, overlapping member photos
  - Note input, amount pill
  - "Request" → TwoFactorVerification → group-request-success
  - Back → group-view

group-request-success:
  - Status modal with progress bar and member payment list
  - "View Group" → group-view
  - "Home" → home

group-settings:
  - Group name, photo, member list
  - Admin: edit name, add members, deactivate others, Save
  - Member: read-only, deactivate self
  - Back → group-view
```

---

## 10. Voucher Redemption

### 3 Redemption Methods

1. **Direct to Wallet** – Instant credit to Buffr wallet
2. **NamPost Branches** – Cash at NamPost branches
3. **SmartPay Units** – Convert to prepaid units (mobile units)

### Screens

| Screen | Description |
|---|---|
| `VouchersScreen` | List of vouchers with filters |
| `VoucherDetailScreen` | Voucher details + 3 method selection |
| `NamPostScreen` | Branch list → branch detail → booking code + QR |
| `CashbackTillScreen` | Retailer select → amount → till code |
| `SmartPayUnitsScreen` | Mobile units list → unit detail → collection code |

### Flow

```
home -> vouchers
  - Active vouchers tab / Redeemed tab / History
  - Tap voucher → voucher-detail
      - View amount, expiry, status
      - Select redemption method
      - "Redeem" →
          Method 1 (Wallet): TwoFactorVerification → wallet success → home
          Method 2 (NamPost): branch list → select branch → branch detail (QR displayed) → TwoFactorVerification → success
          Method 3 (SmartPay): unit list → select unit → collection code → TwoFactorVerification → success
  - Back → vouchers
```

---

## 11. Cash-Out Methods (5 Methods)

### Hub Screen

`WalletCashOutScreen` – Selection of 5 methods with fees and times.

| Method | Screen Key |
|---|---|
| Bank Transfer | `wallet-cash-out/bank` |
| Cash at Till | `cashback-till` |
| Cash at Agent | `cash-out-agent` |
| Cash at Merchant | `pay-merchant` |
| Cash at ATM | `smartpay-units` |

### Cash-Out Navigation

```
wallet-cash-out
  - "Cashback at Till" -> cashback-till (retailer selection -> amount -> till code)
  - "Agent Cash-Out" -> agent-network -> select agent -> cash-out-agent (amount -> code/QR)
  - "Cash at Merchant" -> merchants -> select merchant -> pay-merchant (amount -> 2FA)
  - "NamPost" -> nampost (branch selection -> PIN entry)
  - "SmartPay Units" -> smartpay-units (unit selection -> code)
```

---

## 12. Merchant Payments

### Screens

| Screen | Description |
|---|---|
| `MerchantsScreen` | Browse/search merchants with category chips |
| `PayMerchant` | Pay a specific merchant |

### Flow

```
home -> merchants
  - Browse categories, search merchants
  - Tap merchant -> pay-merchant
      - Enter amount, select payment source (wallet)
      - "Pay" -> TwoFactorVerification -> processing -> success
  - Back -> home or merchants
```

---

## 13. Bill Payments

**Component:** `BillPaymentsScreen`

### Screens

| Screen | Description |
|---|---|
| `BillPaymentsScreen` | 3 tabs: Pay / Scheduled / History |
| `BillCard` | Biller card with amount, due date |
| `PaymentModal` | Confirmation modal |

### Flow

```
home -> bill-payments
  - Select category (Electricity, Water, Internet, etc.)
  - Select biller (e.g., NamPower, MTC, City of Windhoek)
  - Enter account number, amount
  - Confirm → PaymentModal (2FA if required) → success
  - Back → home
```

---

## 14. Loans (Voucher-Backed)

**Component:** `LoansScreen`

### Screens

| Screen | Description |
|---|---|
| `LoansScreen` | List of loan offers and active loans |
| `VoucherBackedLoanCard` | Loan tier card with gradient |
| `LoanDetailScreen` | Active loan details with timeline |

### Flow

```
home -> loans
  - View total grant value, max loan (1/3 of vouchers)
  - Three tiers: Quick Cash (50%, 1mo), Standard (75%, 3mo), Maximum (100%, 6-12mo)
  - Tap a tier → apply (amount up to max)
  - TwoFactorVerification → loan disbursed to wallet
  - Active loan appears in list
  - Tap active loan → loan detail (timeline, auto-pay toggle)
```

---

## 15. AI Chat

**Component:** `AIChatScreen`

### Features

- Chat interface with message bubbles (user / AI)
- Quick question chips (spending, savings, budget, credit)
- AI generates responses based on keyword matching
- Typing indicator, microphone button, send button

### Flow

```
home -> ai-chat
  - User types question or taps a quick chip
  - AI responds after 1.5s delay
  - Can ask about spending analysis, savings plans, budget advice, credit score
  - Back → home
```

---

## 16. Profile & Settings

### Profile Screen (`ProfileScreen.tsx`)

- User avatar, name, Buffr ID, phone
- KYC level badge (Level 2)
- Stats grid (wallets, vouchers, groups)
- Linked banks
- Recent activity
- Links: Settings, QR Code, Transactions, etc.

### Settings Screen (`SettingsScreen.tsx`)

- Sections:
  - Profile (edit name, photo)
  - Security (change PIN, 2FA, biometric)
  - Notifications (toggle preferences)
  - Privacy (data sharing)
  - Help & Support (FAQ, contact)
  - About (version, legal)
- Logout / Delete account with confirmation

### Linked Account Screen (`LinkAccountScreen.tsx`)

- Add bank accounts (Nedbank, FNB, Bank Windhoek, Standard Bank)
- Account type selection (savings, cheque, credit)
- Stores in `linkedAccounts` in UserContext

### QR Code Screen (`YourQrCode`)

- Displays user's static NAMQR for receiving money
- Share button, download button

---

## 17. Shared / Utility Components

| Component | Purpose |
|---|---|
| `StatusBar` | iOS-style status bar |
| `HomeIndicator` | iOS-style bottom home indicator bar |
| `MobileContainer` | 393px container wrapper with safe area |
| `ThemeToggle` | Dark/light mode toggle button |
| `NotificationCenter` | Slide-down notification panel overlay |
| `TwoFactorVerification` | 2FA modal for payment confirmation |
| `BuffrCard` | NamPost-branded card visual |
| `WalletCard` | Individual wallet card |
| `VoucherCard` | Individual voucher card |
| `AddMoneyModal` | Bottom sheet for adding funds |
| `PaymentSuccess` | Generic payment success screen |
| `QRScannerScreen` | QR code scanner |
| `TransactionsScreen` | Full transactions list |
| `FeatureShowcase` | Feature highlight carousel |

---

## 18. Navigation Map

```
onboarding -> home
home -> transactions | loans | qr-code | send-money | ai-chat
       | bill-payments | vouchers | add-wallet | merchants
       | agent-network | groups | profile | settings
       | analytics | location-services
vouchers -> voucher-detail -> nampost | smartpay-units | home (wallet redeem)
agent-network -> cash-out-agent
merchants -> pay-merchant
groups -> create-group | group-view -> group-send -> group-payment-success
                                    -> group-request -> group-request-success
                                    -> group-settings
send-money -> select-recipient -> enter-amount -> select-method -> receiver-details -> payment-success
profile -> settings
wallet-cash-out -> cashback-till | agent-network | merchants | location-services
```

---

## 19. Design System

- **Colors:** Primary `#0029D6`, Secondary `#E11D48`, Accent `#FFB800`, Surface `#FFFFFF`, Background `#F8FAFC`, Text `#020617`, Text Secondary `#64748B`.
- **Radius:** `sm: 12px`, `md: 16px`, `lg: 24px`, `xl: 32px`, `pill: 9999px`.
- **Typography:** SF Pro / system fonts; sizes: caption 12px, body 14–16px, title 18–24px, display 36–48px.
- **Shadows:** Standard Tailwind shadow classes with opacity.
- **Animations:** Card flip (600ms), carousel snap (400ms), button press scale (0.98), success ping.

---

## 20. Implementation Notes

- All components are built with React Native (Expo), mobile-first (393px max-width).
- State management via React Context (`UserContext`, `ThemeContext`).
- Navigation via state-based router in `App.tsx` with `navigateTo` function.
- All sensitive actions (payments, redemptions) use the shared `TwoFactorVerification` modal.
- Onboarding supports both phone and email (user selects at step 3).
- **Gamification and Financial Literacy screens are EXCLUDED** as requested.

---

## 21. Excluded Features

The following features are explicitly **NOT** part of this implementation:

1. **Gamification** - Effects only (badges, points, toasts); no dedicated screen
2. **Financial Literacy** - No `/learn` screen

---

This comprehensive reference serves as a blueprint for the Buffr G2P mobile app implementation.
