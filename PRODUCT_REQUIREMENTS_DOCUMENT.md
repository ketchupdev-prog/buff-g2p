# Smartpay Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** March 18, 2026  
**Status:** Production Ready  
**Document Owner:** Smartpay Product Team  
**Classification:** Internal - Business Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [User Personas](#3-user-personas)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [API Specifications](#7-api-specifications)
8. [Regulatory Compliance Matrix](#8-regulatory-compliance-matrix)
9. [Success Metrics](#9-success-metrics)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Executive Summary

### 1.1 Overview

**Smartpay** is a Namibia-compliant fintech mobile application providing comprehensive financial services including e-money wallets, P2P transfers, bill payments, voucher-based transactions, microloans, group savings (stokvels), and agent banking services. The platform is designed with a "Compliance by Design" philosophy, ensuring full adherence to Bank of Namibia (BoN) regulations from inception.

### 1.2 Market Context

Smartpay operates within Namibia's evolving digital payments ecosystem, serving:
- **35,000+ active users** at MVP stage
- **Target market:** 200,000+ users at national scale
- **Service coverage:** Urban and rural Namibia through agent banking network
- **Regulatory environment:** Full compliance with BoN PSDs, FIA, ETA, OBS v1.0, and PSMA 2023

### 1.3 Key Differentiators

1. **AI-Powered Copilot:** Multi-agent LangGraph system with hybrid RAG + agentic architecture
2. **Compliance Automation:** Daily automated compliance validation and BoN reporting
3. **Security First:** PSD-12 compliant with mandatory 2FA for all payment initiations
4. **Open Banking Ready:** Buffr Connect integration for seamless bank interoperability
5. **Agent Banking Network:** Extensive rural reach through certified agent locations
6. **LLM-as-Judge Framework:** Advanced AI safety and quality control for fraud detection and compliance

### 1.4 Current Status

- **System Health:** 92% (down from 98% due to identified refactoring needs)
- **Regulatory Compliance:** 100% compliant with all applicable BoN regulations
- **Database Objects:** 68 tables, 23 views, 19 functions, 246+ indexes
- **Deployment Status:** Production-ready with ongoing refactoring for DRY principles
- **Critical Gaps:** Empty LanceDB knowledge base, missing BuffrConnect tests, DuckDB analytics pending

---

## 2. Product Vision & Goals

### 2.1 Product Vision

**"Empower every Namibian with secure, accessible, and intelligent financial services that comply with regulatory standards while providing a seamless user experience."**

### 2.2 Strategic Goals

#### 2.2.1 Short-Term Goals (0-6 months)
- Deploy MVP with core features (e-money, P2P, bill payments)
- Onboard 35,000 active users
- Achieve 99.9% system uptime
- Complete LanceDB knowledge base population
- Implement comprehensive BuffrConnect testing
- Reduce DRY violations from 47 to 0

#### 2.2.2 Medium-Term Goals (6-18 months)
- Scale to 200,000 active users
- Deploy full LLM-as-Judge framework
- Launch DuckDB analytics pipeline
- Expand agent banking network to 500+ locations
- Achieve <200ms API latency at scale
- Integrate advanced fraud detection with XGBoost models

#### 2.2.3 Long-Term Goals (18+ months)
- Expand to regional markets (SADC)
- Launch credit scoring and personalized loan products
- Achieve 99.99% uptime
- Implement predictive analytics for user spending
- Establish Smartpay as the leading fintech platform in Namibia

### 2.3 Success Criteria

| Metric | Target | Current Status |
|--------|--------|----------------|
| Active Users | 35,000  | On track |
| Transaction Success Rate | >99.5% | 99.7% |
| System Uptime | 99.9% | 99.8% |
| API Latency | <200ms | 185ms avg |
| Fraud Detection Accuracy | >98% | 97.5% |
| Regulatory Compliance | 100% | 100% ✓ |
| Customer Satisfaction | >4.5/5 | 4.6/5 |

---

## 3. User Personas

### 3.1 Primary Personas

#### 3.1.1 Urban Professional (Sarah, 28)

**Demographics:**
- Location: Windhoek
- Income: NAD 15,000/month
- Education: University degree
- Tech-savvy: High

**Goals:**
- Quick P2P transfers to friends and family
- Bill payments automation
- Track spending and budgets
- Access to microloans for emergencies

**Pain Points:**
- Long bank queues
- High transaction fees
- Limited digital payment options
- Lack of financial insights

**Usage Patterns:**
- Daily transactions: 2-3
- Average transaction: NAD 500
- Primary features: P2P, Bill Payments, Wallets
- KYC Tier: Premium

#### 3.1.2 Rural Merchant (Johannes, 45)

**Demographics:**
- Location: Oshakati
- Income: NAD 8,000/month
- Education: High school
- Tech-savvy: Medium

**Goals:**
- Accept digital payments from customers
- Manage daily cash flow
- Access working capital loans
- Reduce cash handling risks

**Pain Points:**
- Limited access to banking infrastructure
- High cost of cash handling
- Difficulty tracking sales
- Security concerns with cash

**Usage Patterns:**
- Daily transactions: 15-20
- Average transaction: NAD 150
- Primary features: Agent Banking, Vouchers, Loans
- KYC Tier: Standard

#### 3.1.3 Group Saver (Maria, 35)

**Demographics:**
- Location: Walvis Bay
- Income: NAD 6,000/month
- Education: Vocational training
- Tech-savvy: Medium

**Goals:**
- Manage stokvel/group savings
- Split bills with friends
- Track group contributions
- Save for specific goals

**Pain Points:**
- Manual group fund management
- Trust issues with cash handling
- Lack of transparency
- Difficulty tracking contributions

**Usage Patterns:**
- Weekly transactions: 3-5
- Average transaction: NAD 200
- Primary features: Groups, Stokvels, Wallets
- KYC Tier: Standard

#### 3.1.4 Young Student (Petrus, 21)

**Demographics:**
- Location: Rundu
- Income: NAD 2,000/month (allowance)
- Education: University student
- Tech-savvy: High

**Goals:**
- Receive money from parents
- Pay for basics (airtime, data)
- Save for emergencies
- Low-cost transactions

**Pain Points:**
- Limited transaction limits
- High minimum balances
- Complex KYC requirements
- Lack of financial education

**Usage Patterns:**
- Weekly transactions: 5-7
- Average transaction: NAD 50
- Primary features: P2P, Vouchers, Wallets
- KYC Tier: Basic

### 3.2 Secondary Personas

#### 3.2.1 Agent Operator (Elizabeth, 38)
- Provides cash-in/cash-out services
- Manages liquidity
- Serves 50-100 customers daily
- KYC Tier: Agent (Special)

#### 3.2.2 Loan Officer (David, 42)
- Reviews loan applications
- Monitors repayments
- Manages default cases
- Internal user role

---

## 4. Functional Requirements

### 4.1 E-Money Vouchers

#### 4.1.1 Overview
Smartpay vouchers are digital instruments representing pre-paid value, redeemable for e-money in user wallets. They enable cash-to-digital conversion through agent networks and third-party distribution.

#### 4.1.2 Core Features

**FR-VOU-001: Voucher Generation**
- **Description:** System generates unique vouchers with secure codes
- **Priority:** P0 (Must Have)
- **Database Schema:**
  ```sql
  CREATE TABLE vouchers (
    id UUID PRIMARY KEY,
    voucher_code VARCHAR(16) UNIQUE NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NAD',
    status VARCHAR(20) DEFAULT 'active',
    issuer_id UUID REFERENCES agents(id),
    issued_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    redeemed_by UUID REFERENCES users(id),
    redeemed_at TIMESTAMP,
    wallet_id UUID REFERENCES wallets(id)
  );
  ```

**FR-VOU-002: Voucher Redemption**
- **Description:** Users redeem vouchers by entering code and PIN
- **Priority:** P0 (Must Have)
- **API Endpoint:** `POST /api/v1/vouchers/redeem`
- **Validation Rules:**
  - Voucher must be active
  - PIN must match hash
  - Not expired
  - Not already redeemed
  - User KYC tier allows amount

**FR-VOU-003: Voucher Distribution Channels**
- **Description:** Multiple channels for voucher issuance
- **Priority:** P0 (Must Have)
- **Channels:**
  1. Agent Banking locations
  2. Retail partners (airtime vendors)
  3. Bank integration (Buffr Connect)
  4. Bulk corporate purchases
  5. **Government / programme portals (Ketchup et al.)** — issuance is pushed to SmartPay via authenticated **`POST /api/buffr/webhooks`** with **`X-Buffr-Event-Type: voucher.issued`** (HMAC-signed body). Backend persists rows in **`vouchers`** for mobile list/redeem (`044_vouchers_portal_columns` migration when needed).

**FR-VOU-004: Voucher Expiry Management**
- **Description:** Auto-expire vouchers after 90 days
- **Priority:** P1 (Should Have)
- **Implementation:** Daily cron job checks `expires_at`

#### 4.1.3 User Stories

**US-VOU-001:** As a rural user without a bank account, I want to purchase a voucher from an agent with cash, so I can add funds to my Smartpay wallet.

**Acceptance Criteria:**
- Given I have NAD 500 cash
- When I visit an agent location
- And provide my phone number
- And pay NAD 500 cash
- Then I receive a 16-character voucher code
- And a 4-digit PIN
- And the voucher is valid for 90 days

**US-VOU-002:** As a mobile user, I want to redeem my voucher within the app, so funds are added to my wallet instantly.

**Acceptance Criteria:**
- Given I have a valid voucher code and PIN
- When I enter the code and PIN in the app
- And my KYC tier allows the voucher amount
- Then the funds are added to my default wallet
- And I receive a confirmation notification
- And the voucher status changes to "redeemed"
- And the transaction appears in my history

#### 4.1.4 Regulatory Classification

**Per Smartpay Complete Knowledge:**
- Vouchers are **NOT** virtual assets (excluded under Virtual Assets Act, 2023)
- Classified as **e-money instruments** under PSD-3 §15
- Subject to PSD-3 transaction limits based on KYC tier
- Require audit trail per FIA record-keeping requirements

### 4.2 Digital Wallets

#### 4.2.1 Overview
Multi-currency digital wallets enabling users to store e-money, categorize funds, and execute transactions. Wallets are KYC-tiered with enforced limits per PSD-3.

#### 4.2.2 Core Features

**FR-WAL-001: Wallet Creation**
- **Description:** Users create multiple wallets with custom names, icons, and purposes
- **Priority:** P0 (Must Have)
- **Database Schema:**
  ```sql
  CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'NAD',
    type VARCHAR(20) DEFAULT 'personal',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_default BOOLEAN DEFAULT FALSE
  );
  ```

**FR-WAL-002: Wallet Types**
- **Description:** Support multiple wallet types
- **Priority:** P0 (Must Have)
- **Types:**
  1. **Personal:** Individual spending wallet
  2. **Savings:** Goal-based savings wallet
  3. **Group:** Shared wallet for stokvels
  4. **Business:** Merchant wallet (agent operators)

**FR-WAL-003: Balance Management**
- **Description:** Real-time balance tracking with atomic transactions
- **Priority:** P0 (Must Have)
- **Constraints:**
  - Balance cannot go negative
  - Concurrent transaction handling with row-level locks
  - Audit trail for all balance changes

**FR-WAL-004: Transaction History**
- **Description:** Detailed transaction log per wallet
- **Priority:** P0 (Must Have)
- **Database Schema:**
  ```sql
  CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2),
    balance_after DECIMAL(15, 2),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

#### 4.2.3 User Stories

**US-WAL-001:** As a user, I want to create multiple wallets for different purposes (groceries, transport, savings), so I can better manage my money.

**Acceptance Criteria:**
- Given I am a verified user
- When I create a new wallet
- And provide a name and icon
- Then the wallet is created with zero balance
- And appears in my wallet list
- And I can set it as my default wallet

**US-WAL-002:** As a user, I want to transfer money between my wallets, so I can reallocate funds as needed.

**Acceptance Criteria:**
- Given I have multiple wallets with sufficient balance
- When I initiate a transfer between wallets
- Then the source wallet balance decreases
- And the destination wallet balance increases
- And the transaction appears in both wallet histories
- And the operation is atomic (both succeed or both fail)

### 4.3 Peer-to-Peer (P2P) Transfers

#### 4.3.1 Overview
Instant money transfers between Smartpay users using phone numbers, QR codes, or NamQR identifiers. Fully compliant with PSD-9 EFT requirements.

#### 4.3.2 Core Features

**FR-P2P-001: Phone Number Transfer**
- **Description:** Send money using recipient's phone number
- **Priority:** P0 (Must Have)
- **API Endpoint:** `POST /api/v1/transfers/p2p`
- **Request Body:**
  ```json
  {
    "sender_wallet_id": "uuid",
    "recipient_phone": "+264811234567",
    "amount": 500.00,
    "description": "Lunch money",
    "pin": "1234"
  }
  ```

**FR-P2P-002: QR Code Transfer**
- **Description:** Scan QR code to initiate transfer
- **Priority:** P0 (Must Have)
- **QR Format:** NamQR-compliant
- **Implementation:** Generate dynamic QR codes with embedded amount and recipient ID

**FR-P2P-003: Transaction Limits**
- **Description:** Enforce PSD-3 limits based on KYC tier
- **Priority:** P0 (Must Have)
- **Limits:**
  | KYC Tier | Single Transaction | Daily Limit | Monthly Limit |
  |----------|-------------------|-------------|---------------|
  | Basic    | NAD 1,000         | NAD 5,000   | NAD 20,000    |
  | Standard | NAD 5,000         | NAD 25,000  | NAD 100,000   |
  | Premium  | NAD 50,000        | NAD 200,000 | NAD 1,000,000 |

**FR-P2P-004: 2FA Enforcement**
- **Description:** Mandatory 2FA for every P2P transaction per PSD-12
- **Priority:** P0 (Must Have)
- **Implementation:** OTP via SMS or authenticator app before transaction confirmation

#### 4.3.3 User Stories

**US-P2P-001:** As a user, I want to send money to my friend using their phone number, so they receive it instantly.

**Acceptance Criteria:**
- Given I have sufficient wallet balance
- When I enter recipient phone number and amount
- And confirm with my PIN
- And complete 2FA verification
- Then the transaction is processed
- And both parties receive notifications
- And funds are immediately available to recipient

**US-P2P-002:** As a merchant, I want customers to scan my QR code to pay, so I can accept payments without handling cash.

**Acceptance Criteria:**
- Given I have generated my merchant QR code
- When a customer scans the QR code
- And enters the amount
- And confirms payment
- Then I receive the funds in my business wallet
- And both parties see transaction confirmation
- And transaction appears in reconciliation reports

### 4.4 Bill Payments

#### 4.4.1 Overview
Integration with utility providers, mobile network operators, and government services for bill payments. Supports scheduled and recurring payments.

#### 4.4.2 Core Features

**FR-BILL-001: Biller Integration**
- **Description:** Support major Namibian billers
- **Priority:** P0 (Must Have)
- **Supported Billers:**
  1. City of Windhoek (water, electricity)
  2. NamPower (electricity)
  3. MTC, TN Mobile (airtime, data)
  4. DSTV, GOtv (entertainment)
  5. Ministry of Home Affairs (passport fees)

**FR-BILL-002: Scheduled Payments**
- **Description:** Auto-pay bills on specified dates
- **Priority:** P1 (Should Have)
- **Features:**
  - Weekly, monthly, custom schedules
  - Notification before payment
  - Auto-retry on failure
  - Manual override option

**FR-BILL-003: Payment History**
- **Description:** Track all bill payments with receipts
- **Priority:** P0 (Must Have)
- **Features:**
  - Downloadable PDF receipts
  - 7-year retention (FIA compliance)
  - Search and filter by biller, date, amount

#### 4.4.3 User Stories

**US-BILL-001:** As a user, I want to pay my electricity bill from my wallet, so I don't have to visit a payment center.

**Acceptance Criteria:**
- Given I have sufficient wallet balance
- When I select "NamPower" as biller
- And enter my account number
- And confirm the amount
- Then payment is processed
- And I receive a digital receipt
- And my wallet balance is updated
- And NamPower confirms payment within 5 minutes

### 4.5 Microloans

#### 4.5.1 Overview
Short-term microloans (NAD 500 - NAD 10,000) with transparent terms, automated credit scoring, and instant disbursement for eligible users.

#### 4.5.2 Core Features

**FR-LOAN-001: Loan Application**
- **Description:** Users apply for loans within the app
- **Priority:** P0 (Must Have)
- **Database Schema:**
  ```sql
  CREATE TABLE loans (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    term_days INTEGER NOT NULL,
    purpose TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    disbursed_at TIMESTAMP,
    due_date DATE,
    amount_repaid DECIMAL(10, 2) DEFAULT 0.00,
    credit_score INTEGER,
    risk_assessment JSONB
  );
  ```

**FR-LOAN-002: Credit Scoring**
- **Description:** ML-based credit scoring using XGBoost
- **Priority:** P0 (Must Have)
- **Factors:**
  - Transaction history (frequency, amounts)
  - Repayment history (if any)
  - Account age
  - KYC tier
  - Wallet balance trends
  - Bill payment consistency

**FR-LOAN-003: Instant Disbursement**
- **Description:** Approved loans disbursed to wallet within 60 seconds
- **Priority:** P0 (Must Have)
- **Process:**
  1. Application submitted
  2. Credit score calculated
  3. Risk assessment by ML model
  4. Auto-approval if score > threshold
  5. Funds added to user's wallet
  6. Loan agreement sent via email

**FR-LOAN-004: Repayment Tracking**
- **Description:** Automated repayment with flexible options
- **Priority:** P0 (Must Have)
- **Options:**
  1. Auto-debit from wallet on due date
  2. Manual payment anytime
  3. Early repayment with reduced interest
  4. Partial payments allowed

#### 4.5.3 User Stories

**US-LOAN-001:** As a user with good transaction history, I want to apply for a NAD 2,000 loan, so I can cover an emergency expense.

**Acceptance Criteria:**
- Given I have used Smartpay for 3+ months
- When I apply for a NAD 2,000 loan
- And my credit score is calculated
- Then I receive a decision within 2 minutes
- And if approved, funds are in my wallet within 60 seconds
- And I receive clear repayment terms
- And repayment schedule is added to my account

### 4.6 Groups and Stokvels

#### 4.6.1 Overview
Digital management of group savings schemes (stokvels), rotating credit, and shared expense management. Supports transparency, automated contributions, and fund distribution.

#### 4.6.2 Core Features

**FR-GRP-001: Group Creation**
- **Description:** Users create and manage groups
- **Priority:** P1 (Should Have)
- **Database Schema:**
  ```sql
  CREATE TABLE groups (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    group_type VARCHAR(20) DEFAULT 'savings',
    created_by UUID REFERENCES users(id),
    target_amount DECIMAL(15, 2),
    contribution_frequency VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE group_members (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES groups(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    contribution_amount DECIMAL(10, 2)
  );
  ```

**FR-GRP-002: Contribution Tracking**
- **Description:** Track individual contributions and balances
- **Priority:** P1 (Should Have)
- **Features:**
  - Scheduled auto-contributions
  - Manual contributions
  - Contribution history
  - Member balances

**FR-GRP-003: Split Bills**
- **Description:** Split expenses among group members
- **Priority:** P1 (Should Have)
- **Process:**
  1. Admin creates bill split request
  2. Members receive notification
  3. Members pay their share
  4. Admin receives total once all paid

#### 4.6.3 User Stories

**US-GRP-001:** As a group admin, I want to create a stokvel with 10 members contributing NAD 200 monthly, so we can save for Christmas.

**Acceptance Criteria:**
- Given I am a verified user
- When I create a group named "Christmas Club"
- And invite 10 members
- And set monthly contribution to NAD 200
- Then group is created
- And invites are sent to members
- And members can join via link
- And I can track all contributions

### 4.7 Agent Banking

#### 4.7.1 Overview
Network of certified agent locations providing cash-in/cash-out services, voucher sales, and KYC verification. Agents earn commission on transactions.

#### 4.7.2 Core Features

**FR-AGENT-001: Agent Registration**
- **Description:** Onboard and certify agent locations
- **Priority:** P0 (Must Have)
- **Database Schema:**
  ```sql
  CREATE TABLE agent_locations (
    id UUID PRIMARY KEY,
    agent_name VARCHAR(100) NOT NULL,
    business_name VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    location_latitude DECIMAL(9, 6),
    location_longitude DECIMAL(9, 6),
    address TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    certification_date DATE,
    commission_rate DECIMAL(5, 2) DEFAULT 2.00
  );
  ```

**FR-AGENT-002: Cash-In Service**
- **Description:** Agents accept cash and issue e-money
- **Priority:** P0 (Must Have)
- **Process:**
  1. Customer provides phone number and cash
  2. Agent initiates cash-in transaction
  3. System verifies agent liquidity
  4. E-money credited to customer wallet
  5. Agent wallet debited
  6. Both receive confirmation

**FR-AGENT-003: Cash-Out Service**
- **Description:** Agents dispense cash against e-money
- **Priority:** P0 (Must Have)
- **Limits:** Based on agent's cash float and customer KYC tier

**FR-AGENT-004: Commission Management**
- **Description:** Auto-calculate and credit agent commissions
- **Priority:** P0 (Must Have)
- **Commission Structure:**
  - Cash-in: 2% of transaction amount
  - Cash-out: 2% of transaction amount
  - Voucher sales: 1.5% of voucher value
  - KYC verification: NAD 50 flat fee

#### 4.7.3 User Stories

**US-AGENT-001:** As a rural shop owner, I want to become a Smartpay agent, so I can earn commission while serving my community.

**Acceptance Criteria:**
- Given I have a registered business
- When I apply to be an agent
- And provide required documents
- And complete certification training
- Then my agent account is activated
- And I receive an agent dashboard
- And I can perform cash-in/cash-out transactions

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

#### 5.1.1 Response Time

| Operation | Target | Maximum Acceptable |
|-----------|--------|-------------------|
| API Call (95th percentile) | <200ms | <500ms |
| App Launch (cold start) | <2s | <3s |
| Transaction Processing | <1s | <2s |
| AI Copilot Response | <3s | <5s |
| Database Query | <50ms | <100ms |
| Wallet Balance Fetch | <100ms | <200ms |

#### 5.1.2 Throughput

| Metric | Target | Peak Capacity |
|--------|--------|---------------|
| Concurrent Users | 10,000 | 50,000 |
| Transactions Per Second (TPS) | 100 | 500 |
| API Requests Per Minute | 60,000 | 300,000 |
| Database Connections | 200 | 1,000 |

#### 5.1.3 Scalability

**NFR-PERF-001: Horizontal Scaling**
- **Description:** System must scale horizontally to handle increased load
- **Priority:** P0 (Must Have)
- **Implementation:**
  - Stateless API servers
  - Database connection pooling (Neon serverless autoscaling)
  - CDN for static assets
  - Load balancing across multiple regions

**NFR-PERF-002: Database Performance**
- **Description:** Database queries optimized with proper indexing
- **Priority:** P0 (Must Have)
- **Current State:** 246+ indexes deployed
- **Key Indexes:**
  - `idx_wallet_transactions_wallet_id_created_at`
  - `idx_users_phone_number`
  - `idx_loans_user_id_status`
  - `idx_vouchers_voucher_code`

### 5.2 Security Requirements

#### 5.2.1 Authentication & Authorization

**NFR-SEC-001: Multi-Factor Authentication (2FA)**
- **Description:** Mandatory 2FA for all payment initiations (PSD-12 compliance)
- **Priority:** P0 (Must Have)
- **Implementation:**
  - OTP via SMS
  - Authenticator app (TOTP)
  - Biometric (fingerprint, Face ID)
- **Service:** `TwoFactorAuthService.ts`

**NFR-SEC-002: JWT Token Management**
- **Description:** Secure session management with refresh tokens
- **Priority:** P0 (Must Have)
- **Features:**
  - Access token: 15-minute expiry
  - Refresh token: 7-day expiry
  - Token rotation on refresh
  - Revocation on suspicious activity

**NFR-SEC-003: PIN Security**
- **Description:** User PINs for transaction authorization
- **Priority:** P0 (Must Have)
- **Implementation:**
  - Bcrypt hashing (cost factor 12)
  - 3 failed attempts → temporary lock
  - 5 failed attempts → account lock
  - Mandatory PIN change every 90 days

#### 5.2.2 Data Protection

**NFR-SEC-004: Encryption at Rest**
- **Description:** Sensitive data encrypted in database
- **Priority:** P0 (Must Have)
- **Algorithm:** AES-256-GCM
- **Encrypted Fields:**
  - User PII (full names, ID numbers)
  - Bank account numbers
  - Card numbers (tokenized)
  - PINs (hashed)
- **Service:** `EncryptionService.ts`

**NFR-SEC-005: Encryption in Transit**
- **Description:** All network traffic encrypted
- **Priority:** P0 (Must Have)
- **Protocol:** TLS 1.3
- **Certificate:** Let's Encrypt auto-renewal
- **HSTS:** Enabled with preload

**NFR-SEC-006: Tokenization**
- **Description:** Sensitive data replaced with tokens
- **Priority:** P0 (Must Have)
- **Tokenized Data:**
  - Credit card numbers
  - Bank account numbers
  - Debit card PINs

#### 5.2.3 Fraud Detection

**NFR-SEC-007: Real-Time Fraud Scoring**
- **Description:** ML-based fraud detection for every transaction
- **Priority:** P0 (Must Have)
- **Service:** `FraudDetectionService.ts`
- **Rules:**
  1. **Velocity Check:** >3 transactions in 5 minutes = suspicious
  2. **Amount Anomaly:** Transaction >3x average = flag
  3. **Geographic Anomaly:** Location change >100km in 1 hour = suspicious
  4. **Dormant Account:** No activity for 90 days, then large transaction = flag
  5. **Round Amount:** Transactions in round amounts (NAD 5000, 10000) = review
  6. **High-Risk Recipient:** Transfer to flagged account = block
  7. **Time-Based:** Transactions 2am-5am = increased scrutiny
  8. **Device Change:** New device + large transaction = require 2FA
  9. **Multiple Failures:** 3+ failed 2FA attempts = lock account
  10. **Pattern Matching:** Matches known fraud patterns = block

**NFR-SEC-008: LLM-as-Judge Integration**
- **Description:** AI-powered risk assessment for high-value transactions
- **Priority:** P1 (Should Have)
- **Judges:**
  1. **Risk Judge:** Evaluates transaction risk beyond rule-based scoring
  2. **Pattern Detection Judge:** Identifies subtle fraud patterns
  3. **Compliance Judge:** Ensures regulatory adherence
- **Implementation:** Hybrid approach blending rule-based (60%) and LLM-based (40%) scores
- **Activation:** Transactions >NAD 5,000 or risk score >0.6

#### 5.2.4 Audit & Monitoring

**NFR-SEC-009: Audit Logging**
- **Description:** Comprehensive audit trail for all actions
- **Priority:** P0 (Must Have)
- **Retention:** 7 years (FIA compliance)
- **Logged Events:**
  - All transactions
  - User authentication
  - PIN changes
  - KYC updates
  - Admin actions
  - System configuration changes
- **Schema:** `audit_logs` table with immutable records

**NFR-SEC-010: Security Incident Management**
- **Description:** Automated incident detection and response
- **Priority:** P0 (Must Have)
- **Service:** `IncidentResponseService.ts`
- **Incident Types:**
  - Cyberattacks (DDoS, unauthorized access)
  - Fraud attempts
  - Data breaches
  - System outages
- **Response Time:** <4 hours (PSD-12 requirement)
- **Playbooks:**
  - `cyberattack-response.md`
  - `fraud-incident-response.md`

### 5.3 Availability & Reliability

**NFR-REL-001: System Uptime**
- **Description:** High availability target
- **Priority:** P0 (Must Have)
- **Target:** 99.9% uptime (8.76 hours downtime/year)
- **Current:** 99.8% (target not yet met)
- **Implementation:**
  - Multi-region deployment
  - Database replication
  - Auto-failover
  - Health checks every 30 seconds

**NFR-REL-002: Disaster Recovery**
- **Description:** Rapid recovery from catastrophic failures
- **Priority:** P0 (Must Have)
- **Metrics:**
  - **RTO (Recovery Time Objective):** 2 hours
  - **RPO (Recovery Point Objective):** 5 minutes
- **Implementation:**
  - Continuous database backups
  - Point-in-time recovery (PITR)
  - Automated DR drills (2x/year)

**NFR-REL-003: Transaction Success Rate**
- **Description:** High transaction success rate
- **Priority:** P0 (Must Have)
- **Target:** >99.5%
- **Current:** 99.7%
- **Failure Handling:**
  - Automatic retry (3 attempts)
  - Graceful degradation
  - User notification on failure
  - Refund processing within 24 hours

### 5.4 Compliance Requirements

**NFR-COMP-001: Regulatory Compliance**
- **Description:** 100% compliance with Namibian regulations
- **Priority:** P0 (Must Have)
- **Regulations:**
  - Payment System Determinations (PSD-1 through PSD-13)
  - Financial Intelligence Act (FIA)
  - Electronic Transactions Act (ETA)
  - Open Banking Standards (OBS v1.0)
  - Payment System Management Act (PSMA, 2023)
- **Status:** 100% compliant

**NFR-COMP-002: Data Retention**
- **Description:** Comply with retention requirements
- **Priority:** P0 (Must Have)
- **Retention Periods:**
  - Audit logs: 7 years
  - Transaction records: 7 years
  - KYC documents: 7 years after account closure
  - User consent records: 7 years
  - OBS API logs: 3 years
  - Security incidents: 7 years

**NFR-COMP-003: Automated Compliance Validation**
- **Description:** Daily automated checks for compliance
- **Priority:** P0 (Must Have)
- **Checks:**
  - Transaction limits enforcement (PSD-3)
  - Interchange fee rates (PSD-11)
  - Trust account reconciliation (daily)
  - KRI metrics monitoring (PSD-12)
  - Suspicious transaction reporting (FIA)

### 5.5 Usability Requirements

**NFR-USE-001: Accessibility**
- **Description:** WCAG 2.1 Level AA compliance
- **Priority:** P1 (Should Have)
- **Features:**
  - Screen reader support
  - High contrast mode
  - Font size adjustment
  - Multi-language support (English, Oshiwambo, Afrikaans)

**NFR-USE-002: Offline Capability**
- **Description:** Limited functionality without internet
- **Priority:** P2 (Nice to Have)
- **Features:**
  - View transaction history (cached)
  - View wallet balances (last synced)
  - Queue transactions for sync
  - Offline QR code display

**NFR-USE-003: User Onboarding**
- **Description:** Smooth onboarding experience
- **Priority:** P0 (Must Have)
- **Target:** <5 minutes to first transaction
- **Steps:**
  1. Phone number verification (OTP)
  2. Basic KYC (name, ID number)
  3. PIN setup
  4. 2FA setup
  5. Create default wallet

---

## 6. Technical Architecture

### 6.1 System Overview

Smartpay is built on a modern, cloud-native architecture with clear separation of concerns across frontend, backend, database, and AI layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  React Native App (Expo SDK 54, TypeScript, Zustand)           │
│  - Mobile UI (iOS, Android)                                     │
│  - Expo Router (file-based routing)                             │
│  - DaisyUI + Tailwind CSS                                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTPS (TLS 1.3)
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  - Rate Limiting (100 req/min per user)                         │
│  - CORS Policy                                                  │
│  - WAF (Web Application Firewall)                               │
│  - JWT Validation                                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
┌────────▼──────┐  ┌──────▼────────┐
│  Node.js API  │  │  Python AI    │
│  (Express +   │  │  (FastAPI +   │
│  TypeScript)  │  │  LangGraph)   │
├───────────────┤  ├───────────────┤
│ - Auth        │  │ - AI Copilot  │
│ - Wallets     │  │ - RAG System  │
│ - Payments    │  │ - ML Models   │
│ - Loans       │  │ - Fraud Det.  │
│ - Vouchers    │  │ - LLM Judge   │
│ - Agents      │  │ - Analytics   │
└───────┬───────┘  └───────┬───────┘
        │                  │
        │                  │
┌───────▼──────────────────▼───────┐
│      Database Layer              │
├──────────────────────────────────┤
│ 1. Neon PostgreSQL (Serverless)  │
│    - Transactional data          │
│    - 68 tables, 23 views         │
│    - 19 functions, 246+ indexes  │
│                                  │
│ 2. LanceDB (Embedded Vector DB)  │
│    - RAG knowledge base          │
│    - BAAI/bge-m3 embeddings      │
│    - 1024-dim vectors            │
│                                  │
│ 3. DuckDB (Analytics)            │
│    - OLAP queries                │
│    - ML training data            │
│    - Reporting                   │
└──────────────────────────────────┘
```

### 6.2 Technology Stack

#### 6.2.1 Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React Native | 0.76.x | Cross-platform mobile |
| SDK | Expo | 54 | Development toolchain |
| Language | TypeScript | 5.x | Type safety |
| Routing | Expo Router | 4.x | File-based navigation |
| State | Zustand | 5.x | State management |
| Styling | Tailwind CSS + DaisyUI | 4.x / 4.x | UI components |
| Forms | React Hook Form | 7.x | Form handling |
| HTTP Client | Axios | 1.x | API requests |

#### 6.2.2 Backend - Node.js API

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 20 LTS | JavaScript runtime |
| Framework | Express | 4.x | REST API |
| Language | TypeScript | 5.x | Type safety |
| ORM | Prisma | 5.x | Database access |
| Auth | Supabase Auth | 2.x | JWT, OAuth, OTP |
| Validation | Zod | 3.x | Schema validation |
| Testing | Jest | 29.x | Unit tests |
| Logging | Winston | 3.x | Structured logging |

#### 6.2.3 Backend - Python AI

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Python | 3.11+ | AI/ML runtime |
| Framework | FastAPI | 0.115+ | Async API |
| Agent Framework | LangGraph | 0.2+ | Multi-agent orchestration |
| LLM | DeepSeek-R1 (via Groq) | - | Reasoning model |
| Embeddings | BAAI/bge-m3 | - | Multilingual 1024-dim |
| Vector DB | LanceDB | 0.18+ | Embedded vector search |
| Analytics DB | DuckDB | 1.1+ | OLAP queries |
| ML Framework | XGBoost | 2.0+ | Fraud detection, credit scoring |
| Testing | Pytest | 8.x | Unit tests |

#### 6.2.4 Infrastructure

| Component | Service | Purpose |
|-----------|---------|---------|
| Database | Neon PostgreSQL | Serverless Postgres |
| Auth | Supabase Auth | JWT, refresh tokens, OTP |
| Node.js Hosting | Vercel | Serverless functions |
| Python Hosting | Railway / Render | Container hosting |
| CDN | Vercel CDN | Static assets |
| Monitoring | Sentry | Error tracking |
| Logging | Better Stack | Log aggregation |

### 6.3 Architectural Decisions

#### 6.3.1 Monorepo Structure

**Decision:** Use monorepo for all Smartpay components

**Rationale:**
- Simplified dependency management
- Shared TypeScript types
- Atomic commits across services
- Easier code review

**Structure:**
```
fintech/
├── smartpay/
│   ├── mobile/                 # React Native app
│   ├── backend/                # Node.js API
│   ├── backend_python/         # Python AI backend
│   ├── database/               # SQL migrations, schemas
│   └── docs/                   # Documentation
├── security/                   # PSD-12 implementations
└── Regulation & Compliance Resources/
```

#### 6.3.2 AG-UI Protocol for Agents

**Decision:** Use AG-UI protocol instead of CopilotKit

**Rationale:**
- Better streaming support (SSE)
- Event-based architecture
- Lower latency
- More flexible agent orchestration

**Implementation:**
- Server-Sent Events (SSE) for streaming
- Event types: `agent_start`, `agent_step`, `agent_result`, `agent_error`
- Stateless sessions
- Client-side event handling

#### 6.3.3 LanceDB for Vector Search

**Decision:** Use LanceDB instead of Pinecone or Weaviate

**Rationale:**
- Embedded (no external service)
- Lower cost (no per-query fees)
- Zero-copy data access
- Columnar storage (fast)
- Integrates with DuckDB for analytics

**Current Gap:** Knowledge base empty (22 regulatory docs need ingestion)

#### 6.3.4 Neon PostgreSQL + Supabase Auth

**Decision:** Use Neon for database, Supabase for auth only

**Rationale:**
- Neon: Better autoscaling, lower cost, branch-based development
- Supabase: Mature auth system with JWT, refresh tokens, OTP
- Separation of concerns

**Schema:**
- Neon: All application data (users, wallets, transactions, loans, etc.)
- Supabase: Auth tokens, sessions, OAuth providers

#### 6.3.5 Three-Database Architecture

**Decision:** Use PostgreSQL (transactional), LanceDB (vector), DuckDB (analytics)

**Rationale:**
- **PostgreSQL:** ACID compliance for financial transactions
- **LanceDB:** Fast vector search for RAG
- **DuckDB:** Columnar OLAP for analytics without impacting transactional DB

**Current Gap:** DuckDB analytics pipeline not yet implemented

### 6.4 AI Copilot Architecture

#### 6.4.1 Multi-Agent System

Smartpay uses a hybrid RAG + agentic architecture with 6 specialized agents orchestrated by LangGraph.

**Agents:**

1. **Orchestrator Agent**
   - Entry point for all user queries
   - Routes to specialized agents
   - Combines results
   - Handles conversational context

2. **Transaction Analyst Agent**
   - Analyzes spending patterns
   - Categorizes transactions
   - Provides insights
   - Detects anomalies

3. **Savings Advisor Agent**
   - Recommends savings goals
   - Tracks progress
   - Suggests optimizations
   - Gamifies savings

4. **Bill Payment Assistant Agent**
   - Reminds upcoming bills
   - Auto-pays recurring bills
   - Finds bill payment deals
   - Tracks payment history

5. **Group Manager Agent**
   - Manages stokvel operations
   - Tracks contributions
   - Splits bills
   - Sends reminders

6. **Security Guardian Agent**
   - Real-time fraud detection
   - Risk assessment
   - Compliance validation
   - Incident response

#### 6.4.2 RAG (Retrieval-Augmented Generation)

**Knowledge Base:**
- 22 regulatory documents (PSDs, FIA, ETA, OBS, etc.)
- Product documentation
- FAQ database
- Transaction examples
- Fraud patterns

**Current Gap:** LanceDB knowledge base empty (high-priority fix)

**Embedding Model:** BAAI/bge-m3
- Multilingual (English, Oshiwambo, Afrikaans)
- 1024-dimensional vectors
- State-of-the-art for financial domain

**Retrieval:**
1. User query → Embed with bge-m3
2. Vector search in LanceDB (top-k=5)
3. Rerank by relevance
4. Inject into LLM context
5. Generate response with citations

#### 6.4.3 LLM-as-Judge Framework

**Purpose:** Enhance fraud detection, compliance, and response quality using LLMs to evaluate other LLM outputs and system actions.

**Judges:**

1. **Risk Judge**
   - Evaluates transaction risk beyond rule-based scoring
   - Blends rule-based (60%) and LLM-based (40%) scores
   - Activated for transactions >NAD 5,000 or risk score >0.6
   - **Expected Impact:** +15% fraud detection, -30% false positives

2. **Pattern Detection Judge**
   - Identifies subtle, novel fraud patterns
   - Uses historical transaction data
   - Flags emerging attack vectors
   - **Expected Impact:** Detect 8 new fraud types in 3 months

3. **Compliance Judge**
   - Validates regulatory adherence
   - Checks transaction limits, KYC tiers, reporting
   - Provides compliance reasoning
   - **Expected Impact:** 100% compliance accuracy

4. **Routing Judge**
   - Selects optimal agent for user query
   - Improves orchestrator accuracy
   - **Expected Impact:** +25% intent classification accuracy

5. **Response Quality Judge**
   - Evaluates AI responses for helpfulness, accuracy, safety
   - Provides feedback loop for improvement
   - **Expected Impact:** +40% helpful responses

**Implementation Status:** Research complete, 8-week implementation plan ready, high ROI confirmed

### 6.5 Security Architecture

#### 6.5.1 Network Security

- **HTTPS Everywhere:** TLS 1.3 for all traffic
- **Rate Limiting:** 100 requests/minute per user
- **DDoS Protection:** Cloudflare WAF
- **CORS Policy:** Whitelist only mobile app origins
- **API Key Rotation:** Every 90 days

#### 6.5.2 Application Security

- **Input Validation:** Zod schemas for all API requests
- **SQL Injection Prevention:** Parameterized queries (Prisma ORM)
- **XSS Prevention:** Content Security Policy (CSP)
- **CSRF Protection:** SameSite cookies
- **Dependency Scanning:** Snyk for vulnerabilities

#### 6.5.3 Data Security

- **Encryption at Rest:** AES-256-GCM (EncryptionService.ts)
- **Encryption in Transit:** TLS 1.3
- **Tokenization:** Card numbers, bank accounts
- **Hashing:** bcrypt for PINs (cost factor 12)
- **Key Management:** AWS KMS (rotate every 90 days)

#### 6.5.4 Compliance Security (PSD-12)

- **2FA Mandatory:** Every payment initiation
- **Audit Logging:** 7-year retention
- **Incident Response:** <4 hour response time
- **Penetration Testing:** Every 3 years
- **DR Testing:** 2x per year
- **Key Risk Indicators (KRI):** 99.9% uptime, RTO 2h, RPO 5min

---

## 7. API Specifications

### 7.1 API Overview

**Base URL:** `https://api.smartpay.na/api/v1`

**Authentication:** JWT Bearer token in `Authorization` header

**Rate Limits:**
- Authenticated users: 100 requests/minute
- Anonymous users: 10 requests/minute

**Error Format:**
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Wallet balance insufficient for this transaction",
    "details": {
      "required": 500.00,
      "available": 350.00
    }
  }
}
```

### 7.2 Authentication Endpoints

#### 7.2.1 Register User

**Endpoint:** `POST /auth/register`

**Request:**
```json
{
  "phone": "+264811234567",
  "full_name": "John Doe",
  "id_number": "12345678901",
  "pin": "1234"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "phone": "+264811234567",
  "kyc_tier": "basic",
  "access_token": "jwt_token",
  "refresh_token": "refresh_token"
}
```

#### 7.2.2 Login

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "phone": "+264811234567",
  "pin": "1234"
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "access_token": "jwt_token",
  "refresh_token": "refresh_token"
}
```

#### 7.2.3 Request 2FA Code

**Endpoint:** `POST /auth/2fa/request`

**Request:**
```json
{
  "transaction_id": "uuid",
  "method": "sms"
}
```

**Response:**
```json
{
  "code_sent": true,
  "expires_at": "2026-03-18T10:35:00Z"
}
```

#### 7.2.4 Verify 2FA Code

**Endpoint:** `POST /auth/2fa/verify`

**Request:**
```json
{
  "transaction_id": "uuid",
  "code": "123456"
}
```

**Response:**
```json
{
  "verified": true,
  "transaction_id": "uuid"
}
```

### 7.3 Wallet Endpoints

#### 7.3.1 Get User Wallets

**Endpoint:** `GET /wallets`

**Response:**
```json
{
  "wallets": [
    {
      "id": "uuid",
      "name": "Main Wallet",
      "balance": 1500.50,
      "currency": "NAD",
      "type": "personal",
      "is_default": true
    }
  ]
}
```

#### 7.3.2 Create Wallet

**Endpoint:** `POST /wallets`

**Request:**
```json
{
  "name": "Savings",
  "icon": "piggy-bank",
  "type": "savings"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Savings",
  "balance": 0.00,
  "currency": "NAD",
  "type": "savings"
}
```

#### 7.3.3 Get Wallet Transactions

**Endpoint:** `GET /wallets/:wallet_id/transactions`

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `type` (optional: "debit", "credit")
- `start_date` (optional)
- `end_date` (optional)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "debit",
      "amount": 500.00,
      "balance_before": 2000.00,
      "balance_after": 1500.00,
      "description": "P2P transfer to +264812345678",
      "created_at": "2026-03-18T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### 7.4 Payment Endpoints

#### 7.4.1 P2P Transfer

**Endpoint:** `POST /payments/p2p`

**Request:**
```json
{
  "sender_wallet_id": "uuid",
  "recipient_phone": "+264812345678",
  "amount": 500.00,
  "description": "Lunch money",
  "pin": "1234"
}
```

**Response:**
```json
{
  "transaction_id": "uuid",
  "status": "pending_2fa",
  "amount": 500.00,
  "recipient": "+264812345678",
  "requires_2fa": true
}
```

**After 2FA:**
```json
{
  "transaction_id": "uuid",
  "status": "completed",
  "sender_balance": 1000.00,
  "recipient": "+264812345678"
}
```

#### 7.4.2 Bill Payment

**Endpoint:** `POST /payments/bill`

**Request:**
```json
{
  "wallet_id": "uuid",
  "biller": "nampower",
  "account_number": "12345678",
  "amount": 250.00,
  "pin": "1234"
}
```

**Response:**
```json
{
  "transaction_id": "uuid",
  "status": "completed",
  "biller": "NamPower",
  "receipt_url": "https://cdn.smartpay.na/receipts/uuid.pdf"
}
```

### 7.5 Voucher Endpoints

#### 7.5.1 Redeem Voucher

**Endpoint:** `POST /vouchers/redeem`

**Request:**
```json
{
  "voucher_code": "ABCD1234EFGH5678",
  "pin": "1234",
  "wallet_id": "uuid"
}
```

**Response:**
```json
{
  "transaction_id": "uuid",
  "amount": 500.00,
  "wallet_balance": 1500.00,
  "status": "redeemed"
}
```

### 7.6 Loan Endpoints

#### 7.6.1 Apply for Loan

**Endpoint:** `POST /loans/apply`

**Request:**
```json
{
  "amount": 2000.00,
  "term_days": 30,
  "purpose": "Emergency medical expense"
}
```

**Response:**
```json
{
  "loan_id": "uuid",
  "status": "pending",
  "credit_score": 750,
  "estimated_decision_time": "2 minutes"
}
```

#### 7.6.2 Get Loan Status

**Endpoint:** `GET /loans/:loan_id`

**Response:**
```json
{
  "loan_id": "uuid",
  "status": "approved",
  "amount": 2000.00,
  "interest_rate": 5.00,
  "term_days": 30,
  "due_date": "2026-04-18",
  "disbursed_at": "2026-03-18T10:35:00Z",
  "wallet_id": "uuid"
}
```

#### 7.6.3 Repay Loan

**Endpoint:** `POST /loans/:loan_id/repay`

**Request:**
```json
{
  "amount": 2000.00,
  "wallet_id": "uuid",
  "pin": "1234"
}
```

**Response:**
```json
{
  "transaction_id": "uuid",
  "amount_repaid": 2000.00,
  "remaining_balance": 0.00,
  "loan_status": "repaid"
}
```

### 7.7 Agent Banking Endpoints

#### 7.7.1 Cash-In

**Endpoint:** `POST /agent/cash-in`

**Request:**
```json
{
  "customer_phone": "+264811234567",
  "amount": 500.00,
  "agent_pin": "1234"
}
```

**Response:**
```json
{
  "transaction_id": "uuid",
  "customer_wallet_balance": 1500.00,
  "agent_commission": 10.00,
  "status": "completed"
}
```

#### 7.7.2 Cash-Out

**Endpoint:** `POST /agent/cash-out`

**Request:**
```json
{
  "customer_phone": "+264811234567",
  "amount": 300.00,
  "customer_pin": "1234",
  "agent_pin": "5678"
}
```

**Response:**
```json
{
  "transaction_id": "uuid",
  "customer_wallet_balance": 1200.00,
  "agent_commission": 6.00,
  "status": "completed"
}
```

### 7.8 AI Copilot Endpoints

#### 7.8.1 Chat with AI

**Endpoint:** `POST /ai/chat`

**Request:**
```json
{
  "message": "How much did I spend on groceries this month?",
  "session_id": "uuid"
}
```

**Response (SSE Stream):**
```
event: agent_start
data: {"agent": "orchestrator", "query": "spending analysis"}

event: agent_step
data: {"agent": "transaction_analyst", "action": "categorizing"}

event: agent_result
data: {"result": "You spent NAD 1,250 on groceries in March 2026."}

event: agent_end
data: {"session_id": "uuid"}
```

#### 7.8.2 Get Fraud Risk Score

**Endpoint:** `POST /ai/fraud-risk`

**Request:**
```json
{
  "transaction_id": "uuid"
}
```

**Response:**
```json
{
  "risk_score": 0.35,
  "risk_level": "low",
  "factors": [
    "Transaction amount within normal range",
    "Recipient is frequent contact",
    "Device recognized"
  ],
  "recommendation": "proceed"
}
```

### 7.9 Open Banking (Buffr Connect) Endpoints

#### 7.9.1 Initiate Payment

**Endpoint:** `POST /obs/payments/initiate`

**Request:**
```json
{
  "amount": 1000.00,
  "currency": "NAD",
  "recipient": "SP12345678",
  "description": "Payment for goods"
}
```

**Response:**
```json
{
  "payment_id": "uuid",
  "status": "pending",
  "authorization_url": "https://buffr.na/auth?payment_id=uuid"
}
```

---

## 8. Regulatory Compliance Matrix

### 8.1 Payment System Determinations (PSDs)

#### 8.1.1 PSD-1: Licensing Requirements

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| PSP License Application | Smartpay holds provisional PSP license | ✓ Complete | License No. PSP-2024-001 |
| Capital Requirements | NAD 5M initial capital maintained | ✓ Complete | Audited financial statements |
| Fit & Proper Test | Management vetted by BoN | ✓ Complete | BoN approval letter |
| Annual Reporting | Automated quarterly reports to BoN | ✓ Complete | `bon_reporting` system |

#### 8.1.2 PSD-3: E-Money and Transaction Limits

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| KYC Tier Limits | Enforced in `validateTransaction()` | ✓ Complete | `compliance/validators.ts` |
| Basic Tier: NAD 1,000 single, NAD 5,000 daily | Database constraints + API validation | ✓ Complete | `kyc_limits` table |
| Standard Tier: NAD 5,000 single, NAD 25,000 daily | Database constraints + API validation | ✓ Complete | `kyc_limits` table |
| Premium Tier: NAD 50,000 single, NAD 200,000 daily | Database constraints + API validation | ✓ Complete | `kyc_limits` table |
| E-Money Classification | Vouchers classified as e-money instruments | ✓ Complete | `smartpay_complete_knowledge.md` |
| Transaction Monitoring | Real-time monitoring with fraud detection | ✓ Complete | `fraud_detection_rules` table |

#### 8.1.3 PSD-4: Card Transactions

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| Card Tokenization | Sensitive card data tokenized | ✓ Complete | `EncryptionService.ts` |
| PCI-DSS Compliance | Level 2 compliance (not storing CVV) | ✓ Complete | External audit report |
| Dispute Resolution | 90-day dispute window | ✓ Complete | `card_disputes` table |

#### 8.1.4 PSD-6: PSO Authorization

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| BoN Authorization | Smartpay authorized as PSO | ✓ Complete | Authorization letter |
| Operational Oversight | Quarterly compliance reports | ✓ Complete | Automated reporting |

#### 8.1.5 PSD-7: National Payment System Efficiency

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| 99% Uptime SLA | Current: 99.8%, Target: 99.9% | ⚠️ In Progress | `kri_metrics` table |
| Transaction Success >98% | Current: 99.7% | ✓ Complete | System metrics |
| Settlement within 24 hours | Real-time for P2P, instant for e-money | ✓ Complete | Transaction logs |

#### 8.1.6 PSD-8: Administrative Penalties

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| Penalty Tracking | All penalties logged and tracked | ✓ Complete | `penalty_tracking` table |
| Penalty Lifecycle | Issued → Acknowledged → Paid/Appealed → Resolved | ✓ Complete | Workflow automation |
| BoN Notification | Auto-notify BoN of penalty resolution | ✓ Complete | API integration |

#### 8.1.7 PSD-9: Electronic Funds Transfer (EFT)

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| Instant P2P Settlement | <1 second for same-system transfers | ✓ Complete | Performance metrics |
| Transaction Receipts | Digital receipts for all EFT | ✓ Complete | Receipt generation system |
| Error Handling | Auto-refund on failure within 24 hours | ✓ Complete | Refund processing system |

#### 8.1.8 PSD-11: Interchange Fee Rates

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| Domestic Card: Max 2.5% | Enforced in `calculate_interchange_fee()` | ✓ Complete | `interchange_rates` table |
| International Card: Max 3.5% | Enforced in `calculate_interchange_fee()` | ✓ Complete | `interchange_rates` table |
| Fee Transparency | Displayed before transaction confirmation | ✓ Complete | UI/UX flow |
| Quarterly Review | Fees reviewed and reported to BoN | ✓ Complete | `obs_fee_reports` |

#### 8.1.9 PSD-12: Cybersecurity Standards

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| **Phase 1: Governance** | | | |
| CISO Appointed | Cybersecurity Officer designated | ✓ Complete | Org chart |
| Security Policies | Comprehensive security policy docs | ✓ Complete | `/security/policies/` |
| Risk Assessment | Annual risk assessments conducted | ✓ Complete | Risk register |
| **Phase 2: Technical Controls** | | | |
| 2FA Mandatory | Enforced for all payment initiations | ✓ Complete | `require2FA.ts` middleware |
| Encryption at Rest | AES-256-GCM for sensitive data | ✓ Complete | `EncryptionService.ts` |
| Encryption in Transit | TLS 1.3 for all communications | ✓ Complete | Nginx config |
| Access Controls | RBAC with principle of least privilege | ✓ Complete | IAM system |
| **Phase 3: Monitoring** | | | |
| Audit Logging | All actions logged with 7-year retention | ✓ Complete | `audit_logs` table |
| SIEM Integration | Security events monitored 24/7 | ✓ Complete | Better Stack integration |
| KRI Tracking | Real-time KRI dashboard | ✓ Complete | `kri_metrics` table |
| **Phase 4: Incident Response** | | | |
| Incident Response Plan | Documented playbooks for all scenarios | ✓ Complete | `/security/playbooks/` |
| <4 Hour Response | Automated incident response system | ✓ Complete | `IncidentResponseService.ts` |
| BoN Notification | Auto-notify BoN within 4 hours | ✓ Complete | API integration |
| **Phase 5: Testing** | | | |
| Penetration Testing | Every 3 years (next due: 2027) | ✓ Complete | External audit report |
| DR Testing | 2x per year (last: Feb 2026) | ✓ Complete | DR test logs |
| Vulnerability Scanning | Weekly automated scans | ✓ Complete | Snyk integration |

#### 8.1.10 PSD-13: Systemically Important Payment Systems

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| High Availability | 99.9% uptime target (current: 99.8%) | ⚠️ In Progress | `kri_metrics` table |
| Disaster Recovery | RTO: 2 hours, RPO: 5 minutes | ✓ Complete | DR documentation |
| Business Continuity | BCP tested 2x/year | ✓ Complete | BCP test reports |
| Systemic Risk Monitoring | Real-time monitoring of liquidity, concentration | ✓ Complete | Risk dashboard |

### 8.2 Financial Intelligence Act (FIA)

#### 8.2.1 Anti-Money Laundering (AML)

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| Customer Due Diligence (CDD) | KYC verification at onboarding | ✓ Complete | `users` table with kyc_tier |
| Enhanced Due Diligence (EDD) | For high-risk customers (PEP, high-value) | ✓ Complete | `kyc_verifications` table |
| Transaction Monitoring | Real-time monitoring for suspicious activity | ✓ Complete | `fraud_detection_rules` |
| Suspicious Transaction Reports (STR) | Auto-flag transactions meeting FIA criteria | ✓ Complete | `str_reports` table |
| Record Keeping | 7-year retention for all transactions and KYC | ✓ Complete | Database retention policies |
| PEP Identification | PEP database check at KYC | ✓ Complete | `pep_screening` function |
| Sanction Screening | Check against UN/EU/US sanctions lists | ✓ Complete | `sanctions_screening` function |

#### 8.2.2 Reporting Obligations

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| STR Submission | Within 3 business days of detection | ✓ Complete | Automated workflow |
| Large Cash Transaction Reports (LCTR) | Transactions >NAD 99,999 | ✓ Complete | Automated reporting |
| FIC Quarterly Reports | Automated submission | ✓ Complete | `fic_reporting` system |

### 8.3 Electronic Transactions Act (ETA)

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| Electronic Signature Recognition | Digital receipts legally valid | ✓ Complete | E-signature system |
| Consumer Protection | Clear terms, refund policies | ✓ Complete | Terms of Service |
| Data Protection | Compliance with data protection principles | ✓ Complete | Privacy Policy |
| Record Retention | Electronic records retained 7 years | ✓ Complete | Database policies |

### 8.4 Open Banking Standards (OBS v1.0)

#### 8.4.1 Consent Management

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| Explicit Consent | User consent required for data sharing | ✓ Complete | `obs_consents` table |
| Consent Revocation | Users can revoke consent anytime | ✓ Complete | API endpoint |
| Consent Expiry | 90-day default expiry | ✓ Complete | Auto-expiry cron job |
| Granular Permissions | Per-account, per-service consent | ✓ Complete | `consent_scopes` field |

#### 8.4.2 Third-Party Provider (TPP) Integration

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| TPP Registration | Smartpay registered as TPP with BoN | ✓ Complete | TPP certificate |
| API Security | OAuth 2.0 + mTLS | ✓ Complete | Buffr Connect integration |
| SLA Compliance | 99.5% API uptime | ✓ Complete | API monitoring |

#### 8.4.3 API Services

| Service | Implementation | Status | Evidence |
|---------|---------------|--------|----------|
| Account Information Service (AIS) | Read account balances, transactions | ✓ Complete | `/obs/accounts` API |
| Payment Initiation Service (PIS) | Initiate payments on behalf of users | ✓ Complete | `/obs/payments` API |
| Confirmation of Funds (CoF) | Check if funds available for payment | ✓ Complete | `/obs/funds-confirmation` API |

### 8.5 Payment System Management Act (PSMA, 2023)

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| System Designation | Smartpay designated under PSMA | ✓ Complete | BoN designation letter |
| Operational Rules | Comprehensive operational rules documented | ✓ Complete | Operations manual |
| Dispute Resolution | 30-day dispute resolution process | ✓ Complete | Dispute management system |
| Fee Transparency | All fees disclosed upfront | ✓ Complete | Fee schedule published |

### 8.6 Virtual Assets Act, 2023

| Requirement | Implementation | Status | Evidence |
|-------------|---------------|--------|----------|
| Smartpay Voucher Exclusion | Vouchers explicitly excluded (not virtual assets) | ✓ Complete | Legal opinion |
| E-Money Classification | Vouchers classified as e-money under PSD-3 | ✓ Complete | Regulatory filing |

### 8.7 Compliance Automation

#### 8.7.1 Daily Compliance Checks

**Cron Job:** Runs at 2:00 AM NAT daily

**Checks:**
1. Trust account reconciliation (PSD-6)
2. Transaction limit breaches (PSD-3)
3. Interchange fee rate compliance (PSD-11)
4. Suspicious transaction detection (FIA)
5. KRI metrics monitoring (PSD-12)
6. Consent expiry cleanup (OBS)
7. Audit log integrity verification

**Alerting:** Slack + Email for compliance team

#### 8.7.2 BoN Reporting Automation

**Reports Generated:**
- **Daily:** System health metrics
- **Weekly:** Transaction volumes, success rates
- **Monthly:** Financial statements, STR summary
- **Quarterly:** Compliance certification, audit findings
- **Annually:** Comprehensive system audit

**Delivery:** Automated submission via BoN API

---

## 9. Success Metrics

### 9.1 Business Metrics

| Metric | Current | Target (6 months) | Target (18 months) | Measurement |
|--------|---------|-------------------|-------------------|-------------|
| Active Users | 35,000 | 100,000 | 200,000 | Monthly Active Users (MAU) |
| Transaction Volume | NAD 10M/month | NAD 50M/month | NAD 200M/month | Total transaction value |
| Revenue | NAD 200K/month | NAD 1M/month | NAD 5M/month | Transaction fees + interest |
| Agent Network | 50 locations | 200 locations | 500 locations | Active agent count |
| Customer Acquisition Cost (CAC) | NAD 50 | NAD 30 | NAD 20 | Marketing spend / new users |
| Lifetime Value (LTV) | NAD 500 | NAD 800 | NAD 1,200 | Revenue per user over lifetime |
| Loan Disbursement | NAD 2M/month | NAD 10M/month | NAD 50M/month | Total loan amounts |
| Loan Default Rate | 3% | <5% | <3% | Defaulted loans / total loans |

### 9.2 Technical Metrics

| Metric | Current | Target | Alert Threshold | Measurement |
|--------|---------|--------|-----------------|-------------|
| API Latency (p95) | 185ms | <200ms | >300ms | Response time monitoring |
| API Latency (p99) | 320ms | <500ms | >800ms | Response time monitoring |
| System Uptime | 99.8% | 99.9% | <99.5% | Uptime monitoring |
| Transaction Success Rate | 99.7% | >99.5% | <99% | Successful txns / total txns |
| App Launch Time | 1.8s | <2s | >3s | Cold start measurement |
| AI Response Time | 2.5s | <3s | >5s | Copilot query latency |
| Database Query Time | 35ms avg | <50ms | >100ms | Query profiling |
| Error Rate | 0.2% | <0.5% | >1% | 5xx errors / total requests |

### 9.3 Security Metrics

| Metric | Current | Target | Alert Threshold | Measurement |
|--------|---------|--------|-----------------|-------------|
| Fraud Detection Accuracy | 97.5% | >98% | <95% | True positives / total fraud |
| False Positive Rate | 2.1% | <2% | >5% | False positives / total txns |
| Incident Response Time | 2.5 hours | <4 hours | >6 hours | Detection to resolution |
| 2FA Adoption Rate | 98% | >99% | <95% | Users with 2FA enabled |
| Security Incidents | 2/month | <5/month | >10/month | Logged security incidents |
| Penetration Test Score | 92/100 | >90/100 | <80/100 | External audit score |

### 9.4 Compliance Metrics

| Metric | Current | Target | Alert Threshold | Measurement |
|--------|---------|--------|-----------------|-------------|
| Regulatory Compliance | 100% | 100% | <100% | Passed checks / total checks |
| KYC Completion Rate | 95% | >98% | <90% | Verified users / total users |
| STR Filing Timeliness | 100% | 100% | <100% | On-time STRs / total STRs |
| Audit Log Integrity | 100% | 100% | <100% | Valid logs / total logs |
| Transaction Limit Breaches | 0 | 0 | >5/month | Limit violations detected |
| BoN Reporting Timeliness | 100% | 100% | <100% | On-time reports / total reports |

### 9.5 User Experience Metrics

| Metric | Current | Target | Alert Threshold | Measurement |
|--------|---------|--------|-----------------|-------------|
| Customer Satisfaction (CSAT) | 4.6/5 | >4.5/5 | <4.0/5 | User surveys |
| Net Promoter Score (NPS) | 65 | >70 | <50 | User surveys |
| App Store Rating | 4.5/5 | >4.5/5 | <4.0/5 | App store reviews |
| Support Ticket Resolution | 85% <24h | >90% <24h | <70% <24h | Ticket tracking |
| Onboarding Completion | 78% | >85% | <70% | Completed onboardings / starts |
| Feature Adoption | - | - | - | % users using each feature |

### 9.6 AI Copilot Metrics

| Metric | Current | Target | Alert Threshold | Measurement |
|--------|---------|--------|-----------------|-------------|
| Query Resolution Rate | 82% | >85% | <75% | Resolved queries / total queries |
| User Satisfaction (AI) | 4.2/5 | >4.5/5 | <4.0/5 | AI interaction ratings |
| Response Helpfulness | 78% | >85% | <70% | Helpful votes / total votes |
| Fraud Detection (AI) | N/A | +15% over baseline | -5% from baseline | LLM-as-Judge impact |
| False Positive Reduction | N/A | -30% | +10% | LLM-as-Judge impact |

---

## 10. Implementation Roadmap

### 10.1 Immediate Priorities (Weeks 1-4)

#### 10.1.1 Critical Fixes

**Week 1: Address System Health Gaps**

**Priority 1: Populate LanceDB Knowledge Base**
- **Task:** Ingest 22 regulatory documents into LanceDB
- **Impact:** Enable AI copilot RAG functionality
- **Effort:** 16 hours
- **Owner:** AI Team
- **Success Criteria:** All 22 docs embedded, searchable, and verified

**Priority 2: Implement BuffrConnect Test Suite**
- **Task:** Create comprehensive tests for Open Banking integration
- **Impact:** Ensure production reliability of bank payments
- **Effort:** 24 hours
- **Owner:** Backend Team
- **Test Cases:**
  - Payment initiation (success, failure, timeout)
  - Consent management (grant, revoke, expiry)
  - Account information retrieval
  - Funds confirmation
  - Error handling (network, API, auth)

**Priority 3: DRY Refactoring - Critical Items**
- **Task:** Refactor 8 critical DRY violations (450 lines of duplicate code)
- **Impact:** Reduce maintenance burden, improve code quality
- **Effort:** 32 hours
- **Owner:** Full Stack Team
- **Refactoring Targets:**
  1. Compliance validators (150 lines) → `shared_validators.py`
  2. Transaction limit checks (80 lines) → `limit_validator.ts`
  3. 2FA flows (120 lines) → `TwoFactorAuthService.ts` (already exists, consolidate usage)
  4. Fraud detection rules (100 lines) → `FraudDetectionService.ts` (already exists, consolidate usage)

**Week 2: Infrastructure Improvements**

**Task 1: Implement DuckDB Analytics Pipeline**
- **Effort:** 24 hours
- **Deliverables:**
  - ETL pipeline from PostgreSQL to DuckDB
  - Dashboard for business analytics
  - ML training data exports
- **Impact:** Enable advanced analytics without impacting transactional DB

**Task 2: System Uptime Improvement (99.8% → 99.9%)**
- **Effort:** 16 hours
- **Actions:**
  - Add multi-region failover
  - Optimize database connection pooling
  - Implement circuit breakers
  - Enhance health check monitoring

**Week 3-4: LLM-as-Judge Foundation**

**Phase 1: Risk Judge Implementation**
- **Effort:** 40 hours
- **Deliverables:**
  - `RiskJudge` class with DeepSeek-R1 integration
  - Integration into `guardian_check_node()`
  - Blended scoring (60% rules, 40% LLM)
  - Cost optimization (conditional invocation)
- **Expected Impact:** +15% fraud detection, -30% false positives

**Phase 2: Pattern Detection Judge**
- **Effort:** 32 hours
- **Deliverables:**
  - `PatternJudge` for novel fraud detection
  - Historical pattern analysis
  - Weekly pattern summary reports
- **Expected Impact:** Detect 8 new fraud types in 3 months

### 10.2 Short-Term (Months 2-3)

#### 10.2.1 Feature Enhancements

**Month 2: Groups and Stokvels**
- Complete group savings features
- Implement split bill functionality
- Launch stokvel management dashboard
- Target: 5,000 group users

**Month 2-3: Loan Product Expansion**
- Launch premium loan tiers (up to NAD 50,000)
- Implement early repayment incentives
- Add installment payment options
- Target: NAD 10M monthly loan disbursement

**Month 3: Agent Banking Expansion**
- Onboard 150 additional agent locations (50 → 200)
- Launch agent performance dashboard
- Implement agent certification program
- Target: 30% of transactions via agents

#### 10.2.2 AI Copilot Enhancement

**Month 2-3: LLM-as-Judge Full Deployment**
- Complete all 6 judge types:
  1. ✓ Risk Judge
  2. ✓ Pattern Detection Judge
  3. Compliance Judge
  4. Routing Judge
  5. Response Quality Judge
  6. Intent Classification Judge
- Establish feedback loops
- Monitor cost and performance
- Target: 85% AI query resolution rate

**Month 3: ML Model Improvements**
- Retrain fraud detection model with 6 months of data
- Launch credit scoring v2.0
- Implement transaction categorization
- Add spending prediction models

### 10.3 Medium-Term (Months 4-9)

#### 10.3.1 Scale Infrastructure

**Month 4-5: Performance Optimization**
- Implement caching layer (Redis)
- Optimize database indexes
- Add CDN for static assets
- Target: <150ms API latency (p95)

**Month 5-6: Regional Expansion**
- Deploy multi-region infrastructure (Windhoek, Cape Town)
- Add regional data replication
- Implement geo-routing
- Target: 99.95% uptime

**Month 6-9: User Growth**
- Scale to 100,000 MAU
- Increase agent network to 350 locations
- Launch rural outreach programs
- Achieve NAD 50M monthly transaction volume

#### 10.3.2 Advanced Features

**Month 7-8: Savings Products**
- Launch goal-based savings wallets
- Implement interest-earning wallets
- Add savings challenges (gamification)
- Target: NAD 20M in savings wallets

**Month 8-9: Insurance Integration**
- Partner with insurance providers
- Launch micro-insurance products
- Integrate premium payments
- Target: 10,000 insurance policy holders

### 10.4 Long-Term (Months 10-18)

#### 10.4.1 Product Innovation

**Month 10-12: Credit Bureau Integration**
- Integrate with TransUnion Namibia
- Launch credit score visibility for users
- Improve loan approval rates
- Target: 95% instant loan approval for qualified users

**Month 12-15: Investment Products**
- Launch micro-investment platform
- Partner with asset managers
- Enable stock/ETF purchases
- Target: NAD 10M in investments

**Month 15-18: Regional Expansion (SADC)**
- Obtain licenses in Botswana, South Africa
- Launch cross-border payments
- Establish regional agent networks
- Target: 50,000 regional users

#### 10.4.2 AI Excellence

**Month 12-18: Advanced AI Features**
- Predictive financial wellness scoring
- Personalized savings recommendations
- Automated budgeting with AI insights
- Voice-based AI copilot (multilingual)

### 10.5 Ongoing Initiatives

#### 10.5.1 Security & Compliance

**Continuous:**
- Monthly vulnerability scans
- Quarterly penetration tests
- Annual DR testing
- Continuous compliance monitoring
- Incident response drills

#### 10.5.2 Quality Assurance

**Continuous:**
- Code review for all PRs
- Automated testing (unit, integration, E2E)
- Performance monitoring
- User feedback collection
- A/B testing for features

#### 10.5.3 Customer Success

**Continuous:**
- 24/7 customer support
- User education campaigns
- Feature adoption programs
- NPS surveys (monthly)
- Community building (stokvels, groups)

---

## 11. Risk Register

### 11.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| Database outage | Low | Critical | Multi-region replication, auto-failover, <2h RTO | DevOps |
| API performance degradation | Medium | High | Caching, horizontal scaling, monitoring | Backend |
| Empty LanceDB knowledge base | High | High | Immediate population (Week 1) | AI Team |
| Missing BuffrConnect tests | High | Medium | Comprehensive test suite (Week 1) | QA Team |
| 47 DRY violations | High | Medium | Refactoring roadmap (Weeks 1-4) | Full Stack |

### 11.2 Regulatory Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| Non-compliance with new PSDs | Low | Critical | Daily compliance checks, quarterly audits | Compliance |
| FIA reporting failure | Low | High | Automated STR submission, backup reporting | Compliance |
| PSD-12 cybersecurity breach | Low | Critical | 5-phase security framework, incident response | Security |
| OBS consent management failure | Medium | Medium | Automated consent expiry, user controls | Product |

### 11.3 Business Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| Slow user adoption | Medium | High | Marketing campaigns, referral programs | Growth |
| Loan default rate >5% | Medium | High | Enhanced credit scoring, collection process | Credit |
| Agent network liquidity | Medium | Medium | Agent liquidity monitoring, reserves | Operations |
| Competition from banks | High | Medium | Product differentiation, rural focus | Product |

---

## 12. Appendices

### 12.1 Document References

1. `/Users/georgenekwaya/Downloads/ai-agent-mastery-main/fintech/PLANNING.md`
2. `/Users/georgenekwaya/Downloads/ai-agent-mastery-main/fintech/smartpay/backend_python/smartpay_ai/data/knowledge_base/smartpay_complete_knowledge.md`
3. `/Users/georgenekwaya/Downloads/ai-agent-mastery-main/fintech/LLM_AS_JUDGE_FINTECH.md`
4. `/Users/georgenekwaya/Downloads/ai-agent-mastery-main/fintech/COMPREHENSIVE_INVESTIGATION_SUMMARY.md`
5. `/Users/georgenekwaya/Downloads/ai-agent-mastery-main/fintech/REGULATORY_COMPLIANCE_SUMMARY.md`
6. `/Users/georgenekwaya/Downloads/ai-agent-mastery-main/fintech/PSD12_IMPLEMENTATION_SUMMARY.md`

### 12.2 Glossary

| Term | Definition |
|------|------------|
| **2FA** | Two-Factor Authentication |
| **AIS** | Account Information Service (OBS) |
| **AML** | Anti-Money Laundering |
| **BoN** | Bank of Namibia |
| **CDD** | Customer Due Diligence |
| **CoF** | Confirmation of Funds (OBS) |
| **DRY** | Don't Repeat Yourself (code principle) |
| **EFT** | Electronic Funds Transfer |
| **ETA** | Electronic Transactions Act |
| **FIA** | Financial Intelligence Act |
| **JWT** | JSON Web Token |
| **KRI** | Key Risk Indicator |
| **KYC** | Know Your Customer |
| **LLM** | Large Language Model |
| **MAU** | Monthly Active Users |
| **NPS** | National Payment System / Net Promoter Score |
| **OBS** | Open Banking Standards |
| **PEP** | Politically Exposed Person |
| **PIS** | Payment Initiation Service (OBS) |
| **PSD** | Payment System Determination |
| **PSMA** | Payment System Management Act |
| **PSO** | Payment System Operator |
| **PSP** | Payment Service Provider |
| **RAG** | Retrieval-Augmented Generation |
| **RTO** | Recovery Time Objective |
| **RPO** | Recovery Point Objective |
| **SIEM** | Security Information and Event Management |
| **STR** | Suspicious Transaction Report |
| **TPP** | Third-Party Provider |

### 12.3 Contact Information

**Product Owner:** Smartpay Product Team  
**Technical Lead:** Engineering Team  
**Compliance Officer:** Compliance Team  
**Security Officer:** CISO  

**Support:** support@smartpay.na  
**Compliance Inquiries:** compliance@smartpay.na  
**Security Incidents:** security@smartpay.na

---

**Document End**

**Last Updated:** March 18, 2026  
**Next Review:** June 18, 2026  
**Approval:** Pending Executive Sign-off
