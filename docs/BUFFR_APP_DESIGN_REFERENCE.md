# Buffr App Design Reference

**Source:** `Downloads/BuffrCrew/Buffr App Design` (SVG exports)  
**Purpose:** Single list of design assets, navigation steps, and screen groupings so we extend the app consistently to future screens.

---

## 1. Design asset location

- **Folder:** `BuffrCrew/Buffr App Design/` (and `Buffr Card Design/` for card visuals)
- **Format:** SVG screens and components
- **Use:** Reference for layout, copy, and flow when implementing or adding screens; align route names and step order with these names.

---

## 2. Screens and flows (by feature)

### 2.1 Entry & onboarding

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Starting screen | Welcome / entry | `/` or `/onboarding` |
| After Setting Up Name | Name entry done | `/onboarding/name` → next |
| Entering OTP, Vetify OTP, Vetifying OTP | OTP verification | `/onboarding/otp` |
| Photo added, Upload from gallery, Photo selected | Photo upload | `/onboarding/photo` |
| Verify FaceID, Verify FaceID-1, Verify FaceID-2, Verify Yourself | Biometric setup | `/onboarding/face-id` |
| Onboarding completed | Completion | `/onboarding/complete` |
| After clicking Verify CTA | Post-verify state | — |

### 2.2 Home

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Home screen, Home screen (Total Balance Visible/Hidden), Home screen (Wallet Added) | Main home | `/(tabs)` or `/(tabs)/home` |
| Home screen w/popups, Home screen w/1 popup | Home with overlays | — |
| Added Bank Account Home | Home after bank linked | — |

**Home 3×3 services grid (per Buffr app design):** Proof of Life, Receive, Cash Out, Vouchers, Airtime, Pay Bills, Loans, Groups, Find Agent. **Send** is reached via the primary FAB on Home (not a grid tile). Create group and request funds: Home → **Groups** → Create Group or open group → **Request**. **Groups and wallets:** No predetermined types; users name their groups and wallets (name + optional purpose/icon).

### 2.3 Send money & receiver details

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Contact View, Contact View-1, Contact View-2 | Select recipient / contact | `/send-money/select-recipient` |
| Add Amount, Add Amount (Wallet), Entered Amount, Entered Amount-1..4, Number entered | Amount entry | `/send-money/amount` |
| Receiver's Details, Receiver's Details-1..7 | Receiver details (before 2FA) | `/send-money/receiver-details` |
| Select Pay From, Pay From Clicked, Pay From Selected | Pay-from selector | Sheet or inline |
| Transfer, Transfer Amount (Wallet) | Confirm / transfer | `/send-money/confirm` |
| After Making Transaction, Receipt, Receipt-1..8 | Success / receipt | `/send-money/success` |
| Payment via, Payment via-1, Payment via-2, Payment profile changed | Payment method | — |
| Added Note, Added Note-1..3, Entered notes and amount | Note entry | — |

**Send flow order:** Select recipient → Amount → **Receiver details** → Pay from → 2FA → Success (PRD §3.4, §3.12.2).

### 2.4 Request money (receiver POV and requester POV)

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Request Details | Request detail view | `/receive/request/[requestId]` (receiver) or request flow |
| Request Status (pending), Request Status (Collected), Request Status (paid 3/4) | Request status | Group or P2P request status |
| Requested Amount Collected | Request fulfilled | — |
| Elias Matheus See Pay Via Request, Elias Matheus See Pay Via Request-1 | Receiver sees “Pay via request” | Receive request screen |
| Eino will see after payment | Sender sees after paying | — |
| After Making Request | After sending request | — |

**Request flow entry:** From **Groups** → Group detail → **Request** (request funds from group). Optional: P2P “Request” from Home or contacts.

### 2.5 Wallets & add money

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Wallet View, Wallet View-1 | Wallet detail | `/wallets/[id]` |
| Adding A Wallet, Adding A Wallet-1 | Add wallet | `/add-wallet` |
| Wallet Name, Setting up Icon | Wallet name / icon | Add wallet step |
| Add Money, Add Money-1, Add Money (Changed  Method) | Add money methods | AddMoneyModal (Bank, Card, Voucher) |
| Select Method, Changed Method | Method selection | — |
| Auto Pay Toggle On, Auto Pay Enabled Wallet View | Auto Pay config | `/wallets/[id]/auto-pay` or modal |
| Set Date, Set Time, Date Has Been Set, Time Has Been Set, Number Of Payments Selected | Auto Pay date/time/repayments | Edit Auto Pay screen |
| Wallet History (Added), Wallet History (Spendings), Wallet History (Added)-1, Wallet History (Spendings)-1 | Wallet history | Wallet detail or transactions |
| Wallet Settings | Wallet settings | `/wallets/[id]/settings` |
| Back to Buffr Account | Back to main account | — |

### 2.6 Cards

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Add Card, Add details, Add details-1..5, Details Added | Add card flow | `/add-card`, `/add-card/details` |
| Card View, Card View-1, Card View-2, Bank Card View | Cards view | `/cards` |
| Card Number | Card number entry | — |

### 2.7 Groups (create, view, send, request, settings)

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Create Group, Create Group-1 | Create group | `/groups/create` |
| Group View, Group View-1, Group View (request sent) | Group detail | `/groups/[id]` |
| Other member (group view), Other member (after pay view), Other member view Group View | Other member’s view of group | — |
| Group Send, Group Send-1 | Send to group | `/groups/[id]/send` |
| Group Request | Request from group | `/groups/[id]/request` |
| Group Settings, Group Remove | Group settings / remove | `/groups/[id]/settings` |
| Notified in the group | Group notification | — |
| Member is deactivated | Deactivated member state | — |
| Requested Amount (paid 3/4) | Group request progress | — |
| Requested Amount Collected | Group request collected | — |
| Shilunga View, _-- Elias Matheus view | User/view variants | — |

**Groups navigation steps:**  
Home → **Groups** (list) → **Create Group** or tap group → **Group detail** → **Send** | **Request** | **Settings**.

### 2.8 Loans

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Loans, Loans-1, Loans-2, Loans (Paid) | Loans list | `/loans` or `/(tabs)/home/loans` |
| Loan Offer Details, Loan Offer Details-1..3 | Loan offer detail | `/loans/offers/[id]` or apply |
| Loan Details, Loan Details-1, Loan Details-2, Loan Details (Paid) | Active loan detail | `/loans/[id]` |
| Loan Credited, Loan Credited-1 | Loan credited | — |
| Loan Pay | Loan payment | — |
| Loan Cases | Loan cases / list | — |

### 2.9 Notifications & settings

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Notifications, Notifications Received, Notifications Not Available | Notification center | `/notifications` |
| Notification Settings | Notification settings | `/settings` or profile |
| Settings, Settings-1, Profile Settings | Settings / profile | `/settings`, `/(tabs)/profile` |
| Bank Accounts, Available Bank Accounts, Available Bank Accounts-1, Available Bank Accounts-2 | Bank linking | `/onboarding/bank-accounts` or settings |

### 2.10 QR & scan

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Your QR Code, Your QR Code-1, Your QR Code-2 | My QR code | `/qr-code` |
| QR Scan | QR scanner | `/scan-qr` |

### 2.11 Transactions & receipts

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Transactions (Balance), Transactions (Earnings), Transactions (Spendings) + -1 variants | Transactions / analytics | `/(tabs)/transactions`, `/analytics` |
| Receipt, Receipt-1..8 | Receipt view | `/transactions/[id]` or success |

### 2.12 Refund & error states

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Refund Screen, How Refunt Works_ | Refund flow | — |
| Error States | Error state component | Global |

### 2.13 Loading & processing

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Loading, Loading-1..17, Loading..., Loading...-1..3 | Loading states | Shared |
| Processing..., Processing...-1, Processing...-2 | Processing | — |
| Load | Load state | — |

### 2.14 Animations & misc

| Design file(s) | Step / screen | App route / note |
|----------------|---------------|-------------------|
| Animation, Animation-1..32 | Micro-interactions / animations | Use for transitions, success, etc. |
| Enter number | Phone/number entry | Onboarding or send |
| Variation Screens, Blank, Section 1, iOS Menu | Variants / system | — |
| Vector 573, 625–639, etc. | Icons / vectors | Assets |

---

## 3. Navigation and entry-point rules (extend consistently)

1. **Home is the hub:** Every primary feature (Send, Receive, Cash Out, Vouchers, Bills, Loans, Agents, **Groups**) has one entry from Home (tile or FAB).
2. **Groups:** One **Groups** tile on Home → **Groups list** (`/groups`) → **Create Group** button → `/groups/create`; list row → **Group detail** (`/groups/[id]`) → **Send** | **Request** | **Settings**.
3. **Request funds:** Entry = **Groups** → open a group → **Request** (request from group members). Optionally a separate “Request” tile for P2P request later.
4. **Flow order:** Match PRD §3.12.2 (e.g. Send: Select recipient → Amount → Receiver details → 2FA → Success). New flows: define steps in this doc and in PRD §3.12.
5. **New screens:** Add to the correct subsection above; add route under §2; add step to §3 if it’s a new flow; update UX Master Checklist (§3.12) in the PRD.

---

## 4. File count summary

- **Buffr App Design:** 250+ SVG files (screens, variants, animations, loading, error states).
- **Buffr Card Design:** Separate folder for card visuals; reference for CardFrame and card designs.

---

## 5. Cross-reference

- **PRD:** `docs/PRD.md` §3 (Screen Inventory), §3.12 (UX Master Checklist), §7 (User Flows).
- **App routes:** `app/` directory; groups under `app/groups/`, receive under `app/receive/`.
