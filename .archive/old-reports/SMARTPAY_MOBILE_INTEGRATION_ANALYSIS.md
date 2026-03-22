# SmartPay Mobile App Integration Analysis

**Analysis Date:** March 21, 2026  
**App Location:** `/fintech/apps/smartpay-mobile/`  
**Framework:** React Native (Expo) with Expo Router

---

## Executive Summary

SmartPay Mobile is a comprehensive fintech mobile application built with React Native/Expo that provides P2P transfers, wallet management, government voucher redemption, loans, group payments, and open banking integration. The app **partially integrates** with Buffr Connect (Ketchup Portals) through Supabase authentication and has infrastructure for open banking consent flows.

---

## 1. App Architecture Overview

### Technology Stack
- **Framework:** React Native 0.81.5 with Expo ~54.0.0
- **Router:** Expo Router (file-based routing)
- **Language:** TypeScript 5.9.2
- **State Management:** 
  - React Context API (UserContext, WalletsContext, NetworkContext)
  - Zustand (for complex state)
  - React Native MMKV (persistent storage)
- **Authentication:** Supabase Auth + Custom OTP system
- **API Client:** Axios with interceptors
- **UI Components:** Custom design system (no external UI library)

### Design System
- **Figma File:** `VeGAwsChUvwTBZxAU6H8VQ` ("Buffr App Design")
- **Design System:** Centralized in `constants/designSystem.ts`
- **Color Palette:** Slate-based with Buffr amber accents
- **Canvas:** 393×852 (mobile portrait)

### Project Structure
```
smartpay-mobile/
├── app/                    # Expo Router pages
│   ├── (authenticated)/    # Protected routes (tabs, wallets, groups, etc.)
│   ├── (onboarding)/       # Onboarding flow
│   ├── send-money/         # P2P transfer flow
│   ├── voucher/            # Voucher redemption
│   ├── cash-out/           # Cash withdrawal
│   └── loans/              # Loan management
├── components/             # Reusable UI components
├── contexts/               # React Context providers
├── services/               # API integration layer
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript definitions
├── lib/                    # Utilities (supabase client)
└── src/
    ├── features/           # Feature modules
    └── integrations/       # External integrations
        └── buffr/          # Buffr Connect integration
```

---

## 2. Backend Integration Points

### 2.1 Primary API Backend
**Base URL:** `http://localhost:4000` (configurable via `EXPO_PUBLIC_API_BASE_URL`)

**API Client:** `services/api.ts`
- Centralized Axios instance with interceptors
- Automatic JWT token refresh
- Retry logic with exponential backoff
- Network error handling
- Rate limit detection (429 responses)

**Endpoints Called:**
```typescript
// Auth
POST /api/v1/auth/request-otp
POST /api/v1/auth/verify-otp
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

// Vouchers
GET /api/v1/vouchers
GET /api/v1/vouchers/:id
POST /api/v1/vouchers/redeem              // 12-digit code redemption
POST /api/v1/vouchers/:id/redeem          // Wallet redemption
POST /api/v1/vouchers/:id/redeem-nampost  // NamPost branch
POST /api/v1/vouchers/:id/redeem-smartpay // SmartPay agent

// Wallets
GET /api/v1/wallets
POST /api/v1/wallets
PATCH /api/v1/wallets/:id
DELETE /api/v1/wallets/:id

// Transactions
GET /api/v1/transactions
GET /api/v1/transactions/:id

// Send Money (P2P)
POST /api/v1/send

// Cash Out
POST /api/v1/cash-out/bank
POST /api/v1/cash-out/till
POST /api/v1/cash-out/agent
POST /api/v1/cash-out/merchant
POST /api/v1/cash-out/atm

// Loans
GET /api/v1/loans/eligibility
GET /api/v1/loans
POST /api/v1/loans/apply
POST /api/v1/loans/:id/repay

// Groups
GET /api/v1/groups
POST /api/v1/groups
GET /api/v1/groups/:id
POST /api/v1/groups/:id/invite
POST /api/v1/groups/:id/split

// Open Banking (sync)
POST /api/v1/banking/sync
POST /api/v1/banking/disconnect

// Profile
GET /api/v1/profile
PATCH /api/v1/profile

// KYC
GET /api/v1/kyc/status
POST /api/v1/kyc/submit

// Proof of Life
POST /api/v1/proof-of-life/start
POST /api/v1/proof-of-life/complete
```

### 2.2 Buffr Connect Integration (Ketchup Portals)

**Configuration:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_BUFFR_CONNECT_URL=http://localhost:3000
```

**Integration Status:** ✅ **Partial Integration**

**What's Integrated:**
1. **Supabase Authentication** (`lib/supabase.ts`)
   - Shared Supabase project with Buffr Connect
   - Session management via secure storage
   - Auth context provider (`contexts/SupabaseAuthContext.tsx`)

2. **Buffr Client Wrapper** (`src/integrations/buffr/`)
   - `client.ts`: Wrapper for open banking consent flows
   - `session.ts`: Bearer token extraction from Supabase session
   - `consent-flow.ts`: Orchestration for bank linking

3. **Open Banking Integration** (`services/openBanking.ts`)
   - OAuth 2.0 with PKCE implementation
   - Bank configurations for Namibian banks:
     - FNB Namibia
     - Bank Windhoek
     - Standard Bank Namibia
     - Nedbank Namibia
     - NamPost Savings Bank
   - Account Information Service (AIS)
   - Consent management
   - Token refresh logic
   - Secure token storage

**Integration Flow:**
```
User → Bank Selection Screen
  ↓
startBankConsent(bankId) [buffr/client.ts]
  ↓
initiateConsent(bankId) [services/openBanking.ts]
  ↓
OAuth WebView (Bank Authorization)
  ↓
OAuth Callback (smartpay://oauth-callback)
  ↓
handleOAuthCallback(url)
  ↓
Token Exchange & Account Fetch
  ↓
syncLinkedAccountsWithBackend()
  ↓
POST /api/v1/banking/sync (Node.js backend)
```

### 2.3 AI Backend (Python)
**Base URL:** `http://localhost:8000` (configurable via `EXPO_PUBLIC_AI_API_BASE_URL`)

**Services:**
- AI Copilot with 6 specialized agents
- RAG with bge-m3 embeddings (semantic search)
- 5 ML models (fraud detection, credit scoring)
- Real-time streaming via Server-Sent Events (SSE)
- Location services for agent finder

---

## 3. Voucher Functionality

### 3.1 Voucher Display & Management

**Service:** `services/vouchers.ts`

**Functions:**
```typescript
getVouchers(): Promise<Voucher[]>
getVoucherById(voucherId: string): Promise<Voucher | null>
```

**Voucher Type Definition:**
```typescript
interface Voucher {
  id: string;
  voucher_code: string;
  amount: number;
  currency: string;
  status: 'pending' | 'redeemed' | 'expired' | 'pending_collection' | 'expected';
  voucher_type: string;
  issuer: string;
  issued_at?: string | Date;
  expires_at?: string | Date;
  redeemed_at?: string | Date;
  expected_date?: string | Date;
  redemption_method_allowed?: string[];
  metadata?: Record<string, unknown>;
}
```

### 3.2 Voucher Redemption UI

**Screen:** `app/voucher/index.tsx`

**Features:**
- 12-digit voucher code input
- Real-time validation (exactly 12 digits)
- One-tap redemption
- Loading states
- Success/error modal with receipt details
- Automatic wallet balance refresh

**User Flow:**
```
1. User navigates to /voucher
2. Enters 12-digit government voucher code
3. App validates format (12 digits)
4. User taps "Redeem Voucher"
5. API call: redeemVoucherCodeToWallet(code)
6. On success:
   - Show success modal with receipt
   - Refresh wallet balances
   - Clear input field
7. On error:
   - Show error modal with message
   - Keep user on screen for retry
```

### 3.3 Voucher Redemption Methods

**Available Methods:**

1. **Wallet Redemption** (Direct to wallet)
   ```typescript
   redeemVoucherToWallet(voucherId: string)
   // POST /api/v1/vouchers/:id/redeem
   ```

2. **Code-Based Redemption** (12-digit code)
   ```typescript
   redeemVoucherCodeToWallet(voucherCode: string)
   // POST /api/v1/vouchers/redeem
   // Body: { voucherCode: "123456789012" }
   ```

3. **NamPost Branch Redemption**
   ```typescript
   redeemVoucherAtNamPost(voucherId: string, location?: string)
   // POST /api/v1/vouchers/:id/redeem-nampost
   ```

4. **SmartPay Agent Redemption**
   ```typescript
   redeemVoucherAtSmartPay(voucherId: string, agentCode?: string)
   // POST /api/v1/vouchers/:id/redeem-smartpay
   ```

**Response Structure:**
```typescript
{
  success: boolean;
  data?: {
    transactionId: string;
    voucherCode: string;
    amount: number;
    currency: string;
    walletId?: string;
    newBalance?: number;
    collectionCode?: string;  // For NamPost/Agent pickup
    expiresAt?: string;
    instructions?: string;
    redeemedAt?: string;
  };
  error?: { code: string; message: string; }
}
```

---

## 4. Authentication Mechanism

### 4.1 Dual Authentication System

**Primary Auth:** OTP-based (Phone Number)
- Service: `services/auth.ts`
- Flow: Phone → OTP → Verify → Session Token
- Development mode: Test phone with auto-fill OTP (`123456`)
- Rate limiting support (429 detection with retry-after)

**Secondary Auth:** Supabase (Email + Password)
- Service: `lib/supabase.ts`
- Context: `contexts/SupabaseAuthContext.tsx`
- Used for Buffr Connect integration
- Session persistence in secure storage

### 4.2 Token Management

**Storage:** Expo SecureStore
- Access tokens: `smartpay_access_token` (or Supabase session key)
- Refresh tokens: `smartpay_refresh_token`
- Token expiry: `smartpay_token_expires_at`

**Token Refresh Flow:**
```
API Request (with expired token)
  ↓
401 Unauthorized intercepted
  ↓
Retrieve refresh token
  ↓
POST /api/v1/auth/refresh { refreshToken }
  ↓
Store new access token
  ↓
Retry original request
  ↓
If refresh fails:
  - Clear session
  - Redirect to login
```

### 4.3 Request Authentication

**Axios Interceptor:**
```typescript
// services/api.ts (lines 69-96)
apiClient.interceptors.request.use(async (config) => {
  const token = await getSecureItem(getAccessTokenKey());
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 5. Integration with Ketchup Portals

### 5.1 Current Integration Status

**✅ Integrated Components:**
1. **Shared Supabase Project**
   - Same authentication database
   - Session token compatibility
   - User profile synchronization

2. **Open Banking Infrastructure**
   - OAuth 2.0 consent flow wrappers
   - Bank configuration registry
   - Token management for bank accounts

3. **Design System Alignment**
   - Shared Figma design file
   - Buffr branding elements
   - Ketchup logo assets

**❌ Missing Integrations:**
1. **Direct Portal API Calls**
   - No direct calls to Buffr Connect `/api/` endpoints
   - Missing consent creation via portals
   - No consent status polling

2. **Open Banking Provider API Calls**
   - Bank OAuth endpoints configured but not actively called
   - Test mode fallback for all banks
   - Missing real bank API integration

3. **Voucher Portal Integration**
   - Vouchers fetched from Node.js backend only
   - No integration with government voucher portal
   - Missing real-time voucher status updates

4. **Transaction Syncing**
   - No two-way sync with portal transactions
   - Bank account transactions stored locally only

### 5.2 Portal Integration Architecture (Recommended)

**Proposed Integration Points:**

```typescript
// services/portalIntegration.ts (NEW)

// 1. Consent Creation via Portal
async function createConsentViaPortal(bankId: string) {
  const response = await fetch(
    `${BUFFR_CONNECT_URL}/api/oidc/par`,
    {
      method: 'POST',
      headers: await getAuthHeader(),
      body: JSON.stringify({
        provider: bankId,
        permissions: ['accounts', 'balances', 'transactions'],
        expirationDateTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
  );
  return response.json();
}

// 2. Fetch Consents from Portal
async function getConsentsFromPortal() {
  const response = await fetch(
    `${BUFFR_CONNECT_URL}/api/consents`,
    {
      headers: await getAuthHeader()
    }
  );
  return response.json();
}

// 3. Fetch Account Data via Portal
async function getAccountsViaPortal(consentId: string) {
  const response = await fetch(
    `${BUFFR_CONNECT_URL}/api/ais/accounts`,
    {
      headers: {
        ...await getAuthHeader(),
        'X-Consent-Id': consentId
      }
    }
  );
  return response.json();
}

// 4. Fetch Transactions via Portal
async function getTransactionsViaPortal(consentId: string, accountId: string) {
  const response = await fetch(
    `${BUFFR_CONNECT_URL}/api/ais/transactions/${accountId}`,
    {
      headers: {
        ...await getAuthHeader(),
        'X-Consent-Id': consentId
      }
    }
  );
  return response.json();
}
```

### 5.3 Integration Gaps Analysis

| Feature | Current State | Required for Portal Integration |
|---------|---------------|----------------------------------|
| **User Authentication** | ✅ Shared Supabase | No changes needed |
| **Consent Creation** | ❌ Not implemented | Add portal PAR endpoint call |
| **Consent Management** | ⚠️ Local only | Add portal consent API calls |
| **Bank Account Linking** | ⚠️ Infrastructure exists | Connect to portal OAuth flow |
| **Transaction Fetching** | ⚠️ Direct bank API (unused) | Route through portal AIS API |
| **Balance Checking** | ⚠️ Direct bank API (unused) | Route through portal AIS API |
| **Voucher Listing** | ❌ Node.js backend only | Add government portal integration |
| **Voucher Redemption** | ✅ Backend API | Add portal voucher API calls |
| **Provider Registry** | ⚠️ Local config | Fetch from portal `/api/providers` |

---

## 6. Data Flow & State Management

### 6.1 Context Providers

**UserContext** (`contexts/UserContext.tsx`)
```typescript
interface UserContextValue {
  profile: UserProfile | null;
  smartpayId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (updates: UpdateProfileRequest) => Promise<void>;
}
```

**WalletsContext** (`contexts/WalletsContext.tsx`)
```typescript
interface WalletsContextValue {
  wallets: Wallet[];
  totalBalance: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createWallet: (wallet: CreateWalletRequest) => Promise<void>;
  updateWallet: (id: string, updates: UpdateWalletRequest) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
}
```

**NetworkContext** (`contexts/NetworkContext.tsx`)
- Online/offline status monitoring
- Auto-retry on reconnection
- Offline-first queue (pending implementation)

### 6.2 State Update Flow

**Transaction Lifecycle:**
```
1. User initiates action (Send Money)
   ↓
2. UI enters loading state
   ↓
3. API call via service layer
   ↓
4. On success:
   - Update local state (Context/Zustand)
   - Refresh wallet balances
   - Navigate to success screen
   ↓
5. On error:
   - Show error UI
   - Keep user on current screen
   - Allow retry
```

**Wallet Balance Refresh Triggers:**
- After P2P transfer (`send-money/confirm.tsx`)
- After voucher redemption (`voucher/index.tsx`)
- After cash-out confirmation (`cash-out/confirm.tsx`)
- After merchant payment (`pay-merchant/confirm.tsx`)
- Pull-to-refresh on home screen
- App foreground event

---

## 7. Key User Journeys

### 7.1 Onboarding Flow
```
Welcome Screen
  ↓ (Get Started)
Phone Entry Screen (+264 prefix)
  ↓ (Request OTP)
OTP Verification Screen (6 digits)
  ↓ (Verify)
Name Collection Screen
  ↓ (Continue)
Face ID Setup (Optional)
  ↓ (Enable/Skip)
Onboarding Complete
  ↓ (Go to Home)
Home Screen (Authenticated)
```

### 7.2 Send Money Flow
```
Home Screen
  ↓ (Send Money Service)
Select Recipient Screen
  ↓ (Choose contact or enter phone)
Amount Entry Screen
  ↓ (Enter amount)
Confirm Details Screen
  ↓ (Confirm)
2FA Modal (PIN/Biometric)
  ↓ (Authenticate)
API: POST /api/v1/send
  ↓ (Success)
Refresh Wallets (WalletsContext)
  ↓
Payment Success Screen
  ↓ (Done)
Home Screen
```

### 7.3 Voucher Redemption Flow
```
Home Screen / Voucher List
  ↓ (Redeem Voucher)
Voucher Code Entry Screen
  ↓ (Enter 12-digit code)
Validation (local)
  ↓ (Valid format)
API: POST /api/v1/vouchers/redeem
  ↓ (Success)
Refresh Wallets (WalletsContext)
  ↓
Success Modal (with receipt)
  ↓ (Close)
Home Screen (updated balance)
```

### 7.4 Bank Account Linking Flow
```
Banking Screen
  ↓ (Link Bank Account)
Bank Selection Screen
  ↓ (Select Bank - e.g., FNB)
initiateConsent(bankId)
  ↓
OAuth Authorization (WebView)
  ↓ (User approves)
OAuth Callback (smartpay://oauth-callback)
  ↓
handleOAuthCallback(url)
  ↓
Token Exchange with Bank
  ↓
Fetch Accounts from Bank
  ↓
Save to SecureStore
  ↓
Sync with Backend: POST /api/v1/banking/sync
  ↓
Linked Accounts Screen
```

---

## 8. Missing Portal Integrations

### 8.1 High Priority

1. **Consent Creation via Portal PAR**
   - Current: Direct OAuth to banks (unused)
   - Needed: `POST /api/oidc/par` to create consent
   - Location: `services/openBanking.ts` → `initiateConsent()`

2. **Consent Status Polling**
   - Current: No consent management
   - Needed: `GET /api/consents` to list consents
   - Needed: `GET /api/consents/:id` for status

3. **Account Data via Portal AIS**
   - Current: Direct bank API calls (unused)
   - Needed: `GET /api/ais/accounts` with consent ID
   - Location: `services/openBanking.ts` → `fetchAccountsFromBank()`

4. **Transaction Data via Portal**
   - Current: Direct bank API calls (unused)
   - Needed: `GET /api/ais/transactions/:accountId` with consent ID
   - Location: `services/openBanking.ts` → `getAccountTransactions()`

### 8.2 Medium Priority

5. **Government Voucher Portal Integration**
   - Current: Vouchers from Node.js backend only
   - Needed: Real-time voucher status from government portal
   - Needed: Voucher eligibility checks

6. **Provider Registry from Portal**
   - Current: Hardcoded bank configs
   - Needed: `GET /api/providers` for dynamic provider list
   - Location: `services/openBanking.ts` → `NAMIBIAN_BANKS`

7. **Transaction Sync**
   - Current: One-way from mobile to backend
   - Needed: Two-way sync with portal transactions
   - Needed: Conflict resolution for duplicate transactions

### 8.3 Low Priority

8. **Complaint Management**
   - Current: Basic complaint submission
   - Needed: Portal complaint tracking integration

9. **Fee Transparency**
   - Current: Fee data from Node.js backend
   - Needed: Real-time fee quotes from portal

10. **Webhook Support**
    - Current: No webhooks
    - Needed: Push notifications for consent status changes
    - Needed: Real-time transaction updates

---

## 9. Recommendations

### 9.1 Immediate Actions

1. **Implement Portal PAR Integration**
   ```typescript
   // services/portalIntegration.ts
   export async function createConsentViaPortal(
     provider: string,
     permissions: string[]
   ) {
     const response = await fetch(`${BUFFR_CONNECT_URL}/api/oidc/par`, {
       method: 'POST',
       headers: {
         ...await getAuthHeader(),
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         provider,
         permissions,
         expirationDateTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
       })
     });
     return response.json();
   }
   ```

2. **Route Bank Account Data through Portal**
   - Modify `services/openBanking.ts` to use portal AIS APIs
   - Add consent ID to all AIS requests
   - Implement consent expiry handling

3. **Add Consent Management UI**
   - Screen: `app/(authenticated)/banking/consents.tsx`
   - List active consents with status
   - Allow consent revocation
   - Show consent expiry dates

### 9.2 Architecture Improvements

1. **Create Portal Integration Layer**
   ```
   services/
   ├── api.ts              # Internal API (Node.js)
   ├── portalClient.ts     # Portal API (Buffr Connect) [NEW]
   ├── openBanking.ts      # Updated to use portalClient
   └── vouchers.ts         # Updated to use portalClient
   ```

2. **Implement Retry Logic for Portal Calls**
   - Network failures → retry with backoff
   - 5xx errors → retry
   - 4xx errors → fail fast
   - Consent expired → refresh consent flow

3. **Add Portal Health Monitoring**
   - Portal connectivity check on app start
   - Fallback to direct bank APIs if portal down
   - User notification of degraded service

### 9.3 Testing Recommendations

1. **Portal Integration Tests**
   - Test consent creation flow
   - Test consent expiry handling
   - Test account data fetching via portal
   - Test transaction sync

2. **Offline Testing**
   - Ensure graceful degradation
   - Queue failed requests for retry
   - Local cache for critical data

3. **Error Scenario Testing**
   - Portal API failures
   - Bank API failures
   - Network timeouts
   - Invalid consent states

---

## 10. Code Quality Observations

### 10.1 Strengths
- ✅ Comprehensive TypeScript types
- ✅ Centralized API client with interceptors
- ✅ Consistent error handling patterns
- ✅ Secure token storage (Expo SecureStore)
- ✅ Modular service layer
- ✅ Clean separation of concerns
- ✅ Detailed inline documentation

### 10.2 Areas for Improvement
- ⚠️ Inconsistent response unwrapping (double-wrapped data)
- ⚠️ Missing error boundary components
- ⚠️ Limited offline support (infrastructure exists but incomplete)
- ⚠️ Hardcoded backend URLs (should be dynamic)
- ⚠️ Test coverage appears limited

---

## 11. Security Considerations

### 11.1 Current Security Measures
- ✅ JWT-based authentication
- ✅ Automatic token refresh
- ✅ Secure storage for sensitive data
- ✅ PIN/biometric authentication for transactions
- ✅ PKCE for OAuth 2.0 flows
- ✅ Request ID tracking for audit logs
- ✅ Rate limiting detection

### 11.2 Security Gaps
- ⚠️ Bank OAuth client IDs in code (should be server-side)
- ⚠️ Test mode fallbacks for all banks (need real bank integration)
- ⚠️ No certificate pinning mentioned
- ⚠️ Missing request signing for sensitive operations

---

## 12. Integration Priority Matrix

| Integration | Priority | Complexity | Impact | Effort |
|-------------|----------|------------|--------|--------|
| Portal PAR (Consent Creation) | HIGH | Medium | High | 2-3 days |
| Portal AIS (Account Data) | HIGH | Medium | High | 2-3 days |
| Consent Management UI | HIGH | Low | Medium | 1-2 days |
| Transaction Sync | MEDIUM | High | High | 5-7 days |
| Provider Registry | MEDIUM | Low | Medium | 1 day |
| Voucher Portal Integration | MEDIUM | Medium | High | 3-5 days |
| Complaint Portal | LOW | Low | Low | 1-2 days |
| Fee Transparency | LOW | Medium | Medium | 2-3 days |

**Total Estimated Effort for High Priority Items:** ~5-8 days

---

## 13. Conclusion

SmartPay Mobile is a well-architected React Native application with **partial integration** to Buffr Connect (Ketchup Portals). The app has:

**✅ Strong Foundation:**
- Shared Supabase authentication
- Open Banking infrastructure (OAuth 2.0, consent flows)
- Comprehensive voucher redemption system
- Clean API service layer
- Secure token management

**❌ Missing Critical Integrations:**
- No direct portal API calls (PAR, AIS, consent management)
- Bank OAuth configured but unused (test mode only)
- No government voucher portal integration
- Limited two-way transaction syncing

**🎯 Primary Recommendation:**
Implement portal PAR (Pushed Authorization Request) integration as the first step to enable real open banking flows. This will unblock account linking, transaction fetching, and consent management features.

---

## Appendix A: Key Files Reference

| File Path | Purpose |
|-----------|---------|
| `services/api.ts` | Axios client with interceptors, auth, retry logic |
| `services/openBanking.ts` | OAuth 2.0, bank configs, AIS implementation |
| `services/vouchers.ts` | Voucher listing and redemption |
| `services/auth.ts` | OTP authentication flow |
| `src/integrations/buffr/client.ts` | Buffr Connect wrapper functions |
| `src/integrations/buffr/session.ts` | Session token extraction |
| `lib/supabase.ts` | Supabase client configuration |
| `contexts/SupabaseAuthContext.tsx` | Supabase auth provider |
| `app/voucher/index.tsx` | Voucher redemption UI |
| `types/api.ts` | Complete TypeScript API types |
| `.env.example` | Environment variable template |

---

## Appendix B: Environment Variables

```bash
# Supabase (Buffr Connect)
EXPO_PUBLIC_SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_AUTH_URL=https://cjmtcxfpwjbpbctjseex.supabase.co/auth/v1

# Portal Integration
EXPO_PUBLIC_BUFFR_CONNECT_URL=http://localhost:3000

# Node.js Backend
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000

# App Configuration
APP_NAME=SmartPay
APP_VERSION=1.0.0
APP_ENV=development

# Features
EXPO_PUBLIC_ENABLE_BIOMETRICS=true
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true

# Test User (Development)
EXPO_PUBLIC_TEST_USER_PHONE=+264811234567
EXPO_PUBLIC_TEST_USER_FIRST_NAME=Test
EXPO_PUBLIC_TEST_USER_LAST_NAME=User

# Bank OAuth Client IDs (Production)
EXPO_PUBLIC_FNB_CLIENT_ID=
EXPO_PUBLIC_BANK_WINDHOEK_CLIENT_ID=
EXPO_PUBLIC_STANDARD_BANK_CLIENT_ID=
EXPO_PUBLIC_NEDBANK_CLIENT_ID=
EXPO_PUBLIC_NAMPOST_CLIENT_ID=
```

---

**Analysis Completed:** March 21, 2026  
**Analyst:** AI Agent (Claude Sonnet 4.5)  
**Report Version:** 1.0
