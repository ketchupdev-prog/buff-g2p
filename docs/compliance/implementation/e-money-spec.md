# Complete E-Money Implementation Specification
## Namibia Bank of Namibia (PSD-3) Compliance

**Document Version:** 1.0  
**Effective Date:** March 17, 2026  
**Regulatory References:** 
- PSD-3: Determination on Issuing of Electronic Money in Namibia (November 2019)
- Payment System Notice No. 2 (June 2025)

---

## 1. E-MONEY DEFINITION (PSD-3 Section 3.6)

E-money MUST satisfy ALL FOUR characteristics simultaneously:

1. **Stored electronically** - Value stored in digital/electronic format
2. **Issued on receipt of funds** - E-money only created when physical/bank funds received
3. **Accepted as means of payment** - Can be used for payments beyond just the issuer
4. **Redeemable upon demand for cash** - Must be convertible back to Namibia Dollar at par value

### Implementation Requirements:
- E-money wallets must be denominated in **Namibia Dollar (N$)** only
- E-money balances redeemed at **par value** (1:1 with N$)
- **NO interest** paid to customers on e-money wallet balances
- Loyalty/reward points **cannot** be converted to cash or e-money
- Customer funds treated as **"accounts payable"** (NOT deposits)
- **NO credit facilities** or intermediation of customer funds allowed

---

## 2. TRUST ACCOUNT REQUIREMENTS (PSD-3 Section 11.2)

### 2.1 Trust Account Establishment

**Requirement:** E-money issuer MUST open and maintain a trust account with a licensed banking institution.

**Qualified Banking Institutions:**
- Public companies authorized under Banking Institutions Act, 1998 (Act No. 2 of 1998)
- Must be a **licensed banking institution** in Namibia
- Trust account and capital/liquid assets MUST be at **different banking institutions**

### 2.2 Trust Account Characteristics

```sql
-- Trust account must have these properties:
1. Separate from issuer's operational accounts
2. Cannot form part of issuer's assets or liabilities
3. Cannot be used to meet issuer's debt obligations
4. Cannot be comingled with funds of any other person
5. Must equal at least 100% of outstanding e-money liabilities at ALL times
```

### 2.3 Reconciliation Procedures

#### **DAILY Reconciliation (Section 11.2.4)**
- **Frequency:** Every business day
- **Requirement:** Aggregate trust account balance ≥ 100% of total outstanding e-money liabilities
- **Deficiency Resolution:** Within **1 business day**
- **Formula:**
  ```
  Trust_Account_Balance ≥ Sum(All_Wallet_Balances + All_Agent_Float_Balances)
  ```

#### **Monthly Reconciliation**
- Submit monthly statistical reports to Bank of Namibia
- Include:
  - Total interest accrued on trust account
  - Attestation that pooled funds ≥ outstanding liabilities
  - Number and value of dormant wallets
  - Number and value of terminated wallets

#### **Annual Reconciliation (Section 11.2.6)**
- **Deadline:** Within 30 days of next calendar year
- **Requirement:** Furnish Bank of Namibia with proof of compliance
- **Includes:**
  - Annual audited financial statements (3 months after financial year-end)
  - Signed by reputable independent auditor
  - Comprehensive trust account reconciliation report

### 2.4 Handling Discrepancies

**When Trust Account < Outstanding Liabilities:**

1. **Immediate Actions (Within 1 Business Day):**
   - Freeze all new e-money issuance
   - Calculate exact deficiency amount
   - Transfer funds from issuer's operational account to trust account
   - Document the incident with:
     - Timestamp of discovery
     - Deficiency amount
     - Root cause analysis
     - Remediation actions taken

2. **Notification to Bank of Namibia:**
   - Report any deficiency exceeding 0.5% of total liabilities
   - Submit incident report within 24 hours
   - Provide corrective action plan

3. **Penalties for Non-Compliance:**
   - Administrative penalties under Payment System Management Act
   - Potential suspension of authorization (Section 17)
   - Possible cancellation of authorization (Section 18)

### 2.5 Interest on Trust Account (Section 11.3)

**Interest Earned:**
- E-money issuer MAY earn interest on pooled funds
- Interest can only be withdrawn if remaining balance still ≥ 100% of liabilities
- Interest MUST be used to benefit the e-money scheme
- Interest should ensure fees/charges are in the public interest

---

## 3. KYC TIER SYSTEM (Payment System Notice 2025, Section 5 & Table 4)

### 3.1 Tier Structure

#### **Tier 1: Lite KYC (Basic)**

| Parameter | Individual | Business |
|-----------|-----------|----------|
| **Max Single Transaction** | N$10,000 | N$10,000 |
| **Daily Transaction Limit** | N$10,000 | N$10,000 |
| **Monthly Balance Limit** | N$10,000 | N$10,000 |
| **Cumulative Monthly Limit** | N$10,000 | N$10,000 |

**Required Information:**
- Full Name
- Nationality
- National Identity Number OR Passport Number
- Company Registration Number (business only)

**Verification Method:**
- Self-declaration via mobile app
- Basic validation against national ID database (if available)
- No physical document upload required

---

#### **Tier 2: Full KYC (Standard)**

| Parameter | Individual | Business |
|-----------|-----------|----------|
| **Max Single Transaction** | N$20,000 | N$50,000 |
| **Daily Transaction Limit** | N$20,000 | N$50,000 |
| **Monthly Balance Limit** | N$50,000 | N$100,000 |
| **Cumulative Monthly Limit** | N$50,000 | N$100,000 |

**Required Information:**
- Full Name
- Nationality
- National Identity Number OR Passport Number
- **Residential Address** (both Namibians & Non-Citizens)
- **Contact Information:**
  - Telephone number
  - Mobile number
  - Email address
- Company Registration Number (business only)
- **Nature & Location of Business Activity** (business only)

**Verification Method:**
- Physical document upload (ID/Passport photo)
- Proof of residence (utility bill, bank statement, lease agreement)
- Selfie with ID for biometric verification
- Business registration certificate (for businesses)
- Manual review and approval by compliance team

---

### 3.2 Transaction Validation Rules

#### **Validation Sequence (Execute in Order):**

```typescript
// Transaction validation hierarchy
1. Check wallet tier level
2. Validate single transaction amount
3. Check daily cumulative transactions
4. Verify monthly balance limit
5. Confirm monthly cumulative transactions
6. Validate trust account sufficiency
7. Execute transaction
```

#### **When User Exceeds Limit:**

**Scenario 1: Single Transaction Exceeds Limit**
```
User Action: Attempts to send N$15,000
Current Tier: Lite KYC (N$10,000 limit)

System Response:
- Block transaction
- Display: "Transaction limit exceeded. Your current limit is N$10,000."
- Show prompt: "Upgrade to Full KYC to increase your limit to N$20,000"
- Provide "Upgrade Now" button
```

**Scenario 2: Daily Cumulative Limit Reached**
```
User Action: Attempts 3rd transaction of N$5,000 (total: N$15,000 today)
Current Tier: Lite KYC (N$10,000 daily limit)

System Response:
- Block transaction
- Display: "Daily transaction limit reached (N$10,000/N$10,000)"
- Show prompt: "Upgrade to Full KYC for N$20,000 daily limit"
- Display time until limit resets: "Resets in 8 hours 23 minutes"
```

**Scenario 3: Monthly Balance Limit Approached**
```
User Action: Receives N$3,000 (current balance: N$8,500)
Current Tier: Lite KYC (N$10,000 balance limit)

System Response:
- Allow transaction but warn
- Display: "Warning: You're approaching your balance limit (N$11,500/N$10,000)"
- Auto-prompt: "Upgrade to Full KYC to hold up to N$50,000"
```

### 3.3 KYC Document Verification Process

#### **Lite KYC Verification:**
1. User enters National ID/Passport number
2. System validates format (e.g., 13 digits for Namibian ID)
3. Cross-reference with national database (if API available)
4. Approve instantly if validation passes
5. Manual review if inconsistencies detected

#### **Full KYC Verification:**
1. **Document Upload:**
   - Accept: JPEG, PNG, PDF (max 5MB per file)
   - Required uploads:
     - Front of National ID/Passport
     - Back of National ID (if applicable)
     - Proof of residence (dated within 3 months)
     - Selfie holding ID
     - Business certificate (for businesses)

2. **Automated Checks:**
   - OCR extraction of ID details
   - Face matching (selfie vs ID photo)
   - Document authenticity checks
   - Address validation against proof of residence

3. **Manual Review (if needed):**
   - Compliance officer reviews flagged applications
   - Response time: Within 24 hours
   - Approval/rejection with reason

4. **Biometric Verification (Optional Enhancement):**
   - Liveness detection
   - Facial recognition against government database

---

## 4. CAPITAL REQUIREMENTS (PSD-3 Section 11.5 & PSN 2025 Section 2.2)

### 4.1 Non-Bank E-Money Issuer Requirements

| Requirement Type | Amount | Form |
|-----------------|--------|------|
| **Initial Capital** (at licensing) | N$1,500,000 | Cash, capital assets, systems |
| **Ongoing Capital** (operational) | Average of outstanding e-money liabilities over previous 6 months | Cash or liquid assets |

### 4.2 Micro E-Money Issuer Requirements

| Requirement Type | Amount | Form |
|-----------------|--------|------|
| **Initial Capital** | N$500,000 | Cash, capital assets, systems |
| **Ongoing Capital** | Not specified | N/A |

### 4.3 Ongoing Capital Calculation

```typescript
// Calculated monthly based on previous 6 months
const calculateOngoingCapital = (monthlyLiabilities: number[]): number => {
  // Take last 6 months of outstanding e-money liabilities
  const last6Months = monthlyLiabilities.slice(-6);
  
  // Calculate average
  const average = last6Months.reduce((sum, val) => sum + val, 0) / 6;
  
  // This is the minimum ongoing capital required
  return average;
};

// Example:
// Month 1: N$5,000,000
// Month 2: N$6,000,000
// Month 3: N$5,500,000
// Month 4: N$7,000,000
// Month 5: N$6,500,000
// Month 6: N$6,000,000
// Average = N$6,000,000
// Required ongoing capital = N$6,000,000
```

### 4.4 Liquid Assets Definition (Section 11.5.4)

**Acceptable Forms:**
1. Cash balances at banking institutions (NOT where trust account is held)
2. Recognized financial instruments at banking institutions
3. Highly liquid assets:
   - Short-term Government financial instruments
   - Bank of Namibia instruments
   - Other assets approved by Bank of Namibia

**Requirements:**
- Must remain **unencumbered** (not pledged as collateral)
- Must be at a **different banking institution** than trust account
- Must be readily convertible to cash

### 4.5 Capital Adequacy Reporting

**Monthly Report to Bank of Namibia:**
- Current ongoing capital held
- Average outstanding liabilities (6-month rolling)
- Breakdown of liquid assets
- Confirmation of capital adequacy

**Consequences of Capital Deficiency:**
- Must apply in writing to Bank of Namibia for temporary waiver
- May restrict new customer onboarding
- Potential suspension of operations

---

## 5. E-MONEY LIFECYCLE

### 5.1 Issuance (User Loads Wallet)

**Process Flow:**
```
1. User initiates load via:
   - Bank transfer to trust account
   - Cash deposit at agent
   - Card payment

2. Payment confirmation received

3. Validation checks:
   - Verify user KYC tier
   - Check if load would exceed balance limit
   - Validate trust account sufficiency

4. Create transaction record (status: pending)

5. Credit e-money wallet atomically

6. Update trust account reconciliation

7. Send confirmation to user

8. Real-time wallet balance update
```

**Database Transaction:**
```sql
BEGIN TRANSACTION;

-- Record the load transaction
INSERT INTO transactions (
  user_id, type, amount, status, 
  payment_method, trust_account_ref, created_at
) VALUES (
  @user_id, 'LOAD', @amount, 'COMPLETED',
  @payment_method, @trust_ref, NOW()
);

-- Update wallet balance
UPDATE wallets 
SET balance = balance + @amount,
    updated_at = NOW()
WHERE user_id = @user_id;

-- Record trust account movement
INSERT INTO trust_account_movements (
  type, amount, transaction_id, created_at
) VALUES (
  'CREDIT', @amount, LAST_INSERT_ID(), NOW()
);

COMMIT;
```

### 5.2 Storage (In Wallet)

**Security Requirements:**
- Encrypted at rest (AES-256)
- Access controls (user authentication required)
- Audit logging of all balance queries
- No interest accrual
- Monitor for dormancy (6 months inactivity)

**Dormant Wallet Rules (PSD-3 Section 11.4):**
- **Dormant Threshold:** 6 consecutive months with no transactions
- **Pre-notification:** 1 month before 6-month threshold
- **No Fees:** Cannot charge fees on dormant wallets
- **Funds Treatment:**
  a) If user has banking account with issuer → return to primary account
  b) If KYC known but no bank account → contact user, return funds, or include in estate if deceased
  c) If sender known but recipient not → return to sender
  d) If neither known → deposit in separate bank account for 3 years, then use for scheme development

### 5.3 Transfer (P2P, P2M, P2B)

#### **Person-to-Person (P2P)**
```
Sender → Recipient (both have e-money wallets)

Validation:
1. Sender has sufficient balance
2. Transaction within sender's daily/monthly limits
3. Recipient balance won't exceed their limit
4. Trust account has sufficient funds

Execution:
- Atomic debit/credit (ACID transaction)
- Real-time settlement
- Immediate notification to both parties
```

#### **Person-to-Merchant (P2M)**
```
Customer → Merchant (merchant has business wallet)

Validation:
1. Customer has sufficient balance
2. Transaction within limits
3. Merchant wallet can accept (business tier limits)

Execution:
- QR code or merchant ID
- Real-time settlement
- Receipt generation
- Merchant notification
```

**Transfer Database Transaction:**
```sql
BEGIN TRANSACTION;

-- Create transfer record
INSERT INTO transactions (
  sender_id, recipient_id, amount, type, 
  status, created_at
) VALUES (
  @sender_id, @recipient_id, @amount, 'TRANSFER',
  'COMPLETED', NOW()
);

-- Debit sender
UPDATE wallets 
SET balance = balance - @amount,
    updated_at = NOW()
WHERE user_id = @sender_id
AND balance >= @amount; -- Ensures sufficient funds

-- Credit recipient
UPDATE wallets 
SET balance = balance + @amount,
    updated_at = NOW()
WHERE user_id = @recipient_id;

-- Verify trust account neutrality (no net change)
-- Record audit trail
INSERT INTO transaction_audit_log (
  transaction_id, sender_balance_before, sender_balance_after,
  recipient_balance_before, recipient_balance_after
) VALUES (...);

COMMIT;
```

### 5.4 Redemption (Cash-Out, Withdrawal)

**Process Flow:**
```
1. User requests cash-out

2. Validation:
   - Sufficient e-money balance
   - Redemption method available (agent, bank transfer)
   - KYC tier validated

3. Debit e-money wallet

4. Process payment:
   - Cash from agent (agent float debited)
   - Bank transfer from trust account

5. Update trust account reconciliation

6. Generate receipt

7. Transaction confirmation
```

**Redemption Database Transaction:**
```sql
BEGIN TRANSACTION;

-- Record redemption
INSERT INTO transactions (
  user_id, type, amount, status,
  redemption_method, created_at
) VALUES (
  @user_id, 'CASHOUT', @amount, 'COMPLETED',
  @method, NOW()
);

-- Debit e-money wallet
UPDATE wallets 
SET balance = balance - @amount,
    updated_at = NOW()
WHERE user_id = @user_id
AND balance >= @amount;

-- Record trust account movement (debit)
INSERT INTO trust_account_movements (
  type, amount, transaction_id, created_at
) VALUES (
  'DEBIT', @amount, LAST_INSERT_ID(), NOW()
);

-- If agent redemption, update agent float
UPDATE agent_floats
SET balance = balance - @amount
WHERE agent_id = @agent_id;

COMMIT;
```

---

## 6. INTEROPERABILITY REQUIREMENTS (PSD-3 Section 15.2)

**Bank of Namibia Position:**
- Bank will consider **mandating interoperability** through regulation
- E-money issuers must be prepared for technical compatibility
- Different payment systems must be able to connect

**Technical Requirements:**
- Standard APIs for inter-scheme transfers
- Common message formats
- Real-time settlement between schemes
- Unified dispute resolution

**Implementation Readiness:**
```
1. API endpoints for external scheme integration
2. Support for ISO 20022 messaging standards
3. Webhook notifications for incoming transfers
4. Reconciliation with partner schemes
```

---

## 7. CONSUMER PROTECTION REQUIREMENTS (PSD-3 Section 14)

### 7.1 Transparency (Section 14.3)
- All fees and charges displayed:
  - In mobile app (before transaction)
  - At agent locations (visible signage)
  - On website
- No hidden or bundled fees
- Customers pay exactly the publicly displayed price

### 7.2 Dispute Resolution (Section 14.4)
- Display dispute contact information:
  - At all premises (issuer and agents)
  - In mobile app (Help section)
  - On website
- Provide multiple contact methods:
  - Phone hotline
  - Email support
  - In-app chat
  - USSD for basic phones
- **Expeditious resolution** required (recommend 48-hour response SLA)

### 7.3 Customer Understanding (Section 14.1)
- Educational materials on:
  - How e-money works
  - Security best practices
  - Transaction limits by tier
  - Fees and charges
  - Rights and responsibilities
- Available in multiple languages
- Simple, clear language (avoid jargon)

### 7.4 Fraud Protection
- Real-time fraud monitoring
- Transaction alerts (SMS/push notifications)
- User-controlled transaction limits
- Two-factor authentication for high-value transactions
- Chargeback mechanisms for unauthorized transactions

---

## 8. REPORTING TO BANK OF NAMIBIA (PSD-3 Section 16)

### 8.1 Monthly Reports
**Due Date:** By 7th business day of following month

**Contents:**
- Total e-money issued (volume and value)
- Total e-money redeemed (volume and value)
- Outstanding e-money liabilities (end of month)
- Trust account balance (end of month)
- Interest accrued on trust account
- Attestation: Trust account ≥ 100% liabilities
- Number of active wallets (by tier)
- Number of dormant wallets and total value
- Number of terminated wallets
- Transaction statistics (P2P, P2M, loads, cashouts)
- Agent network statistics

### 8.2 Annual Reports
**Due Date:** Within 3 months of financial year-end

**Contents:**
- Audited financial statements (signed by independent auditor)
- Annual trust account reconciliation
- Proof of compliance with Section 11.2
- Capital adequacy report
- AML/CFT compliance report
- Customer complaints summary and resolution

### 8.3 Ad-Hoc Reporting
**Immediate Notification Required For:**
- Trust account deficiencies exceeding 0.5%
- Security breaches affecting customer data
- Significant system outages (>4 hours)
- AML/CFT suspicious activity
- Appointment of new agents
- Significant changes to e-money services (60 days advance notice)

---

## NEXT SECTION: Database Schemas, APIs, and Implementation Code
