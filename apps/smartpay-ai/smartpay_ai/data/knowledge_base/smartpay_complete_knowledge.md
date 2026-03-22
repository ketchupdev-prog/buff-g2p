# Smartpay Knowledge Base

**Version:** 2.0  
**Last Updated:** March 18, 2026  
**Purpose:** AI RAG knowledge base for SmartPay Copilot agents  
**Optimized For:** LanceDB vector ingestion with bge-m3 embeddings

---

## What's in This Knowledge Base

This knowledge base contains **AI-specific content** for RAG (Retrieval Augmented Generation) ingestion:

✅ **Digital Financial Literacy**: Teaching principles and delivery patterns  
✅ **Namibia Ecosystem**: Trusted partners and referral channels  
✅ **Transaction Workflows**: Technical implementation flows  
✅ **AI Backend Capabilities**: Agent architecture, ML models, RAG system  
✅ **Quick Reference Tables**: Essential lookups for agents  
✅ **Glossary**: Domain-specific terminology

### What's NOT in This Knowledge Base

To reduce duplication and maintain single source of truth:

📄 **Product Features** → See `/docs/guides/features/` (comprehensive feature documentation)  
📄 **Regulations** → See `/docs/compliance/namibian-regulations-reference.md` (1,786 lines of regulatory details)  
📄 **Security** → See `/docs/guides/security/security-implementation.md` (PSD-12 compliance guide)

The AI agents can still access this content via references, but we avoid storing redundant copies.

---

# Smartpay Knowledge Base

**Version:** 1.0  
**Last Updated:** March 18, 2026  
**Purpose:** Comprehensive knowledge base for RAG ingestion into LanceDB

---

## Digital Financial Literacy (DFL) Program (Namibia)

This section adapts the **GSMA Digital Financial Literacy Toolkit** to Smartpay’s Namibia context. It is designed to help:
- Smartpay Copilot answer *“how should we teach this?”* questions (not only *“what is this?”*)
- Product and operations teams ship DFL improvements without duplicating docs

### Target segments (practical)

| Segment | Typical constraints | Best channels | What to emphasize |
|---|---|---|---|
| Rural / limited internet | Feature phone, shared devices, low data | USSD + SMS tips + agents | PIN safety, fees, receipts, how to cash-out safely |
| Women (low confidence / social norms) | Lower access + lower confidence | Female agents + community groups + WhatsApp audio | Safe usage, rights, fraud prevention, budgeting |
| Youth | Fast adoption, high social exposure | In-app micro-lessons + social media | Scam awareness, budgeting, responsible credit |
| Elderly | Low digital confidence | Agents + radio + in-person | Simple steps, trust, recourse, “slow down and verify” |
| Persons with disabilities | Accessibility needs | Multiple formats + community partners | Accessible support, step-by-step guidance, rights |

### Delivery principles (behavior change)

Use these patterns repeatedly in Copilot responses and in-app education:
- **Teachable moments:** show a “safety tip” right before risky actions (cash-out, new payee, high amount).
- **Learning by doing:** short guided steps, then confirm understanding (e.g., “show me where you see the fee”).
- **Rules of thumb:** simple habits users remember (never share OTP; verify agent license; keep receipts).
- **Nudges/reminders:** periodic prompts to review history, update verification tier, enable 2FA for large payments.

### Monitoring & evaluation (M&E) starter kit

Keep M&E lightweight and practical:
- **Baseline questions (pre):** What are digital payments? Name 3 uses. Name 3 benefits. Name 3 risks.
- **After questions (post):** Repeat baseline + “what is the most important thing you learned?” + “what should we add?”
- **KPIs:** reduction in fraud incidents per active user, fewer support tickets for “how to” issues, more self-serve success (cash-out, verification upgrades), increased repeat usage in rural segments.

---

## Namibia ecosystem (for referrals and trust)

Smartpay exists inside a broader financial inclusion ecosystem. When users need help beyond Smartpay, Copilot should guide them to trusted channels rather than guessing.

### Common partners / institutions (examples)

- **Bank of Namibia (BoN):** regulator, consumer protection expectations, national payment standards (e.g., PSD-3 limits).
- **Financial Literacy Initiative (FLI Namibia):** financial literacy programs and awareness.
- **NamPost / PostFin:** physical presence useful for rural access and collections (where integrated).
- **Commercial banks & DFIs (e.g., Bank Windhoek, Letshego, DBN):** education content and formal banking services.

**Copilot behavior:** If a user reports fraud, suspected SIM swap, or coercion, instruct them to freeze the Smartpay account, report in-app, and contact their mobile network operator if SIM swap is suspected.

---


---

## Transaction Workflows

### P2P (Person-to-Person) Transfer

**Endpoint:** `POST /api/v1/send-money` or `POST /api/v1/transactions/send`

**Workflow:**
1. **Input Validation**
   - Recipient identifier (wallet number, phone, or user ID)
   - Amount (must be > 0)
   - Description (optional)

2. **Pre-Transaction Validation**
   - Sender wallet exists and is 'active'
   - Recipient wallet exists and is 'active'
   - Amount > 0
   - Sender balance sufficient (including fees)

3. **Limit Checks**
   - Check sender's daily transaction limit (based on KYC tier)
   - Check sender's daily usage (sum of today's outgoing transactions)
   - Check recipient's monthly balance limit (wallet + incoming amount)

4. **AML/CFT Checks**
   - If amount ≥ N$100,000: Create compliance alert for review
   - Check transaction velocity (>10 transactions/hour = anomaly)
   - Check sender/recipient PEP status

5. **Transaction Execution (Atomic)**
   - BEGIN transaction
   - Lock sender wallet (`SELECT ... FOR UPDATE`)
   - Lock recipient wallet (`SELECT ... FOR UPDATE`)
   - Debit sender wallet
   - Credit recipient wallet
   - Create transaction records for both parties
   - Update daily transaction totals
   - COMMIT transaction
   - If any step fails: ROLLBACK

6. **Post-Transaction**
   - Send notifications to sender and recipient
   - Update transaction status to 'completed'
   - Record audit log

**Fee Structure:** Per PSD-11, P2P transfers have **zero interchange fee**

**Transaction Types:**
- `transfer_out` - Sender's transaction record
- `transfer_in` - Recipient's transaction record

---

### Voucher to Wallet Redemption

**Endpoint:** `POST /api/v1/vouchers/:id/redeem` (method='wallet')

**Workflow:**
1. **Validation**
   - Voucher exists
   - Voucher belongs to user
   - Voucher status is 'available' (not already redeemed)
   - Voucher not expired (`expires_at > NOW()`)
   - Target wallet exists and is 'active'

2. **Atomic Redemption Transaction**
   - BEGIN transaction
   - Lock voucher record (`SELECT ... FOR UPDATE`)
   - Lock wallet record (`SELECT ... FOR UPDATE`)
   - Update voucher status to 'redeemed'
   - Credit wallet with voucher amount
   - Create `voucher_redemptions` record (method='wallet')
   - Create `wallet_transaction` record (type='redemption')
   - COMMIT transaction
   - If any step fails: ROLLBACK entire operation

3. **Real-Time Processing**
   - Per PSD-3 Section 13.3: Real-time processing required
   - Funds available in wallet immediately
   - User receives instant confirmation

4. **Post-Redemption**
   - SMS notification to user
   - Update voucher statistics
   - Audit log entry

**No Fees:** Voucher redemption has no transaction fees (G2P benefit)

---

### Loan Application and Disbursement

**Loan Application Endpoint:** `POST /api/v1/loans/apply`

**Workflow:**
1. **Eligibility Check**
   - Query total redeemed voucher value: `SELECT SUM(amount) FROM voucher_redemptions WHERE user_id = ?`
   - Calculate max loan: `maxLoan = totalRedeemed * 0.5`
   - Check requested amount ≤ maxLoan
   - Verify no existing 'pending' or 'active' loans

2. **Risk Assessment**
   - Get user's KYC tier for interest rate determination
   - Check credit_score (if available)
   - Calculate account age

3. **Interest Rate Assignment**
   - Enhanced KYC: 3%
   - Standard KYC: 5%
   - Basic KYC: 7%
   - Default: 15%

4. **Loan Creation**
   - Calculate total repayment: `amount * (1 + interest/100)`
   - Create loan record with status='pending'
   - Loan requires approval before disbursement

**Loan Disbursement Endpoint:** `POST /api/v1/loans/:id/disburse`

**Workflow:**
1. Verify loan exists and status='pending'
2. Verify loan belongs to user
3. Atomic transaction:
   - Update loan status to 'active'
   - Set `disbursed_at` timestamp
   - Credit user's wallet with loan amount
   - Create wallet_transaction (type='loan_disbursement')
4. Send confirmation to user

**Loan Repayment Endpoint:** `POST /api/v1/loans/:id/repay`

**Workflow:**
1. **Validation**
   - Loan exists and status='active'
   - Loan belongs to user
   - Payment amount ≥ total_repayment (full repayment only)
   - User wallet has sufficient balance

2. **Atomic Repayment Transaction**
   - BEGIN transaction
   - Lock wallet (`SELECT ... FOR UPDATE`)
   - Debit wallet with repayment amount
   - Update loan status to 'repaid'
   - Set `repaid_at` timestamp
   - Create wallet_transaction (type='loan_repayment')
   - COMMIT transaction
   - If any step fails: ROLLBACK

3. **Post-Repayment**
   - User notified of successful repayment
   - User now eligible for new loan

---

### Group Split Bill Payment

**Create Split Endpoint:** `POST /api/v1/groups/:groupId/split`

**Workflow:**
1. **Validation**
   - User is active group member
   - Total amount: N$1 - N$100,000
   - Title: 3-200 characters
   - Split type: 'equal' or 'custom'

2. **Share Calculation**
   - **Equal Split:** `shareAmount = totalAmount / activeMemberCount`
   - **Custom Split:** Validate sum of shares = total amount (tolerance 0.01)

3. **Split Creation (Atomic)**
   - Create split_request record (status='pending')
   - Create split_shares for each member
   - All shares start with status='pending'

**Pay Split Share Endpoint:** `POST /api/v1/groups/:groupId/splits/:splitId/pay`

**Workflow:**
1. **Validation**
   - User has unpaid share in this split
   - Share status='pending' (not already 'paid')
   - Source wallet exists, is active, has sufficient balance
   - Currency matches (NAD)

2. **Payment Execution (Atomic)**
   - BEGIN transaction
   - Lock source wallet
   - Lock group wallet
   - Debit member's wallet with share amount
   - Credit group wallet with share amount
   - Create transaction record (type='split_payment')
   - Update share status to 'paid' with timestamp
   - Check if all shares paid:
     - If yes: Update split_request status to 'completed'
     - If no: Split remains 'pending'
   - COMMIT transaction

3. **Notifications**
   - Payer receives payment confirmation
   - Group admin receives progress update
   - If split completed: All members notified

**Reminder Endpoint:** `POST /api/v1/groups/:groupId/splits/:splitId/remind`
- Only split creator or group admin can send reminders
- Queries unpaid shares
- Sends notifications to members with pending shares

---


---

## AI Backend Capabilities

### Overview
**Technology Stack:** Pydantic AI, LangGraph, FastAPI, DeepSeek LLM, PostgreSQL (Neon), LanceDB, DuckDB  
**Purpose:** Intelligent AI Copilot system with 6 specialized agents, 5 ML models, RAG, and analytics

### AI Agents

#### 1. Orchestrator Agent (Pydantic AI)
- Routes user queries to appropriate specialist agent
- Coordinates multi-agent workflows
- Human-in-the-Loop (HITL) for critical decisions
- LangGraph state management

#### 2. Transaction Analyst Agent
- Analyzes spending patterns and trends
- Categorizes transactions automatically
- Detects anomalies and unusual activity
- Budget tracking and recommendations

#### 3. Savings Advisor Agent
- Goal-based savings recommendations
- Optimal savings strategies
- Compares wallet performance
- Nudges for savings contributions

#### 4. Bill Payment Assistant Agent
- Tracks upcoming bill payments
- Sends payment reminders
- Suggests payment scheduling
- Detects duplicate bills

#### 5. Group Manager Agent
- Helps create and manage group savings circles
- Split bill coordination
- Member contribution tracking
- Stokvel management

#### 6. Security Guardian Agent
- Real-time fraud detection
- Suspicious transaction alerts
- Security best practices guidance
- Compliance monitoring

### Machine Learning Models

#### 1. Fraud Detection Model
- Algorithm: XGBoost classifier
- Features: Transaction amount, velocity, time, location, merchant category
- Training data: Historical fraud cases from DuckDB
- Real-time scoring: <100ms per transaction
- Output: Fraud probability (0-1), risk score, flagged features

#### 2. Credit Scoring Model
- Algorithm: Random Forest
- Features: Voucher redemption history, transaction patterns, wallet balance, KYC tier
- Determines loan eligibility and interest rate
- Trained on loan repayment outcomes

#### 3. Transaction Categorization Model
- Algorithm: Scikit-learn text classification
- Features: Transaction description, merchant name, amount
- Categories: Groceries, Transport, Utilities, Healthcare, Education, Entertainment, etc.
- Accuracy: ~92% on test set

#### 4. Spending Prediction Model
- Algorithm: Time series forecasting (Prophet/ARIMA)
- Predicts future spending by category
- Helps users budget and plan
- Trained on transaction history

#### 5. Savings Recommendation Model
- Algorithm: Collaborative filtering + rules engine
- Suggests optimal savings amount based on income and expenses
- Considers user's financial goals
- Personalized recommendations

### RAG (Retrieval Augmented Generation)

**Vector Database:** LanceDB  
**Embeddings Model:** bge-m3 (1024-dimensional vectors)  
**Search Performance:** <50ms semantic search

**Knowledge Sources:**
1. Namibian regulations (PSDs 1-13, FIA, ETA)
2. Product features documentation
3. Transaction workflows
4. Fraud patterns
5. Compliance requirements
6. User FAQs and support articles

**RAG Workflow:**
1. User query → bge-m3 embedding
2. Vector similarity search in LanceDB
3. Retrieve top-k relevant documents (k=5 typically)
4. Context provided to DeepSeek LLM
5. LLM generates response grounded in retrieved documents
6. Response includes source citations

### Three-Database Architecture

**1. PostgreSQL (Neon) - Primary Transactional Database**
- User accounts, wallets, transactions
- Vouchers, loans, groups
- Real-time OLTP workload
- Atomic transactions with ACID guarantees

**2. LanceDB - Vector Database**
- Stores bge-m3 embeddings (1024-dim)
- Semantic search for RAG
- Knowledge base vectors
- Transaction description embeddings for similarity search

**3. DuckDB - Analytics and ML Training**
- OLAP queries on transaction history
- Aggregations for dashboards and reports
- ML model training data preparation
- Export datasets for scikit-learn/XGBoost training
- In-memory for fast analytics

### API Endpoints (Python Backend)

**Chat:**
- `POST /api/v1/ai/chat` - Streaming chat with AI agents
- `POST /api/v1/ai/chat-sync` - Synchronous chat response

**Streaming:**
- `GET /api/v1/ai/stream` - Server-Sent Events (SSE) for real-time updates

**Health:**
- `GET /health` - System health check

**ML:**
- `POST /api/v1/ml/predict-fraud` - Fraud prediction for transaction
- `POST /api/v1/ml/credit-score` - Credit score calculation
- `POST /api/v1/ml/categorize-transaction` - Transaction categorization

**Admin:**
- `POST /api/v1/admin/retrain-models` - Trigger ML model retraining
- `GET /api/v1/admin/analytics` - System analytics dashboard

### Security Features

**Authentication:**
- JWT token validation (calls Node.js backend for verification)
- API key authentication for ML endpoints
- Rate limiting per user/IP

**Data Security:**
- No PII stored in LanceDB/DuckDB
- Encryption at rest (PostgreSQL)
- TLS for all API calls
- Audit logging for all AI interactions

**Compliance:**
- All AI recommendations subject to compliance checks
- Fraud detection alerts logged and reviewed
- Human oversight for critical operations (HITL)

### Analytics and Training Pipelines

**Daily Pipeline:**
- Export previous day's transactions to DuckDB
- Update aggregate statistics
- Detect anomalies and trends
- Generate daily reports

**Weekly Pipeline:**
- Retrain fraud detection model with new fraud cases
- Update transaction categorization model
- Refresh credit scoring model parameters
- Validate model performance metrics

**Monthly Pipeline:**
- Comprehensive analytics reports
- Model performance evaluation
- Compliance reporting
- Business intelligence dashboards

---

## Appendix: Quick Reference Tables

### Transaction Limit Summary

| KYC Tier | User Type | Daily Limit | Monthly Balance Limit | Required Documents |
|----------|-----------|-------------|----------------------|-------------------|
| Lite | Individual | N$10,000 | N$10,000 | Name, Nationality, ID Number |
| Lite | Business | N$10,000 | N$10,000 | Name, Nationality, ID Number, Company Reg |
| Full | Individual | N$20,000 | N$50,000 | Lite + Address, Contact Info |
| Full | Business | N$50,000 | N$100,000 | Full Individual + Company Reg, Business Location |

### Interchange Rate Summary

| Transaction Type | Card Type | Rate | Notes |
|-----------------|-----------|------|-------|
| Retail POS | Debit | 0.50% | - |
| Retail POS | Hybrid | 0.75% | - |
| Retail POS | Credit | 1.55% | - |
| Fuel POS | Debit | 0.50% | - |
| Fuel POS | Hybrid | 0.75% | - |
| Fuel POS | Credit | 0.80% | Lower than retail |
| Pure Cashback | All | N$1.25 | Flat fee |
| ATM Withdrawal | All | N$4.00 + N$0.80/N$100 | Reverse interchange |
| ATM Unsuccessful | All | N$4.80 | Flat fee |
| ATM Balance Enquiry | All | N$0.60 | Flat fee |
| Instant Payment (P2B) | N/A | 0.40% | Lower than card |
| Instant Payment (P2P) | N/A | 0% | Zero interchange |
| G2P | N/A | 0% | Zero interchange |

### Off-Us ATM Fees (User-Charged)

| Transaction Type | Fee Structure | Maximum | Notes |
|-----------------|---------------|---------|-------|
| Card Withdrawal | N$7.20 + N$13.70 per N$500 | N$35.00 | - |
| Card Balance Enquiry | N$1.60 | N$1.60 | Flat |
| Instant Payment Withdrawal | N$4.80 + N$9.00 | N/A | - |
| Instant Payment Balance Enquiry | N$1.60 | N$1.60 | Flat |
| Instant Payment (First Monthly) | N$0 | N$0 | Free |

### Capital Requirements Summary (Payment System Notice 2025)

| PSP Type | Initial Capital | Ongoing Capital |
|----------|----------------|-----------------|
| Non-Bank E-Money Issuer | N$1,500,000 | Avg outstanding liabilities (6 months) |
| Micro E-Money Issuer | N$500,000 | Not specified |
| Payment Facilitation Provider | N$1,500,000 | Not applicable |
| Third-Party PSP | N$1,000,000 | Not applicable |
| Banking Institution | Per Banking Act | Per Banking Act |

### Licensing Fees Summary (Payment System Notice 2025)

| Fee Type | PSP | Payment System Operator |
|----------|-----|------------------------|
| Application | N$5,000 | N$5,000 |
| Licensing/Authorization | N$20,000 | N$20,000 |
| Annual Renewal | N$10,000 | N$20,000 |
| Additional Category | N$5,000 | N/A |

**Note:** Banking institutions do not pay fees to offer payment services as PSPs.

### Fraud Pattern Summary (NPS Report 2013-2022)

| Fraud Type | % Incidents | % Value | Most Common Sub-Type | Prevention |
|------------|-------------|---------|---------------------|------------|
| Card Fraud | 95% | 38% | Card-Not-Present (53.6k, N$31.6M) | 3D Secure, CVV verification |
| EFT Fraud | 1% | 10% | Phishing (345, N$11.1M) | User education, 2FA |
| E-Money Fraud | 3% | 19% | Phone Scams (2.1k, N$27.1M) | "Never share OTP" campaigns |
| Cash Fraud | 1% | 33% | External Theft (N$36.6M) | Security, cash limits |

### Cybersecurity Risk Indicators (PSD-12)

| Metric | Target/Requirement | Notes |
|--------|-------------------|-------|
| Uptime (Critical Systems) | 99.9% minimum | Payment processing, authentication |
| Recovery Time Objective (RTO) | Within 2 hours | Time to restore service |
| Recovery Point Objective (RPO) | 5 minutes | Maximum data loss |
| Test Frequency | 2 successful tests/year | Response, resumption, recovery plans |
| Penetration Testing | Every 3 years | Critical systems only |
| 2FA Requirement | Every payment initiation | Non-negotiable |
| Data in Transit | Encrypted/tokenized/masked | Always |

### Voucher Redemption Methods Comparison

| Method | Speed | Location | Requirements | Process |
|--------|-------|----------|--------------|---------|
| Wallet | Instant | Anywhere (app) | Active wallet | Atomic DB transaction |
| NamPost | 1-2 days | NamPost branch | National ID, collection code | SMS code → visit branch → collect cash |
| SmartPay Agent | Same day | Agent location | PIN, National ID | SMS PIN → visit agent → collect cash |

---

## Glossary

**2FA (Two-Factor Authentication):** Security method requiring two independent factors: knowledge (password/PIN), possession (device/token), or inherence (biometric). REQUIRED for all payment initiations per PSD-12.

**AML (Anti-Money Laundering):** Policies and procedures to prevent the use of financial systems for money laundering. Part of FIA compliance.

**Atomic Transaction:** Database transaction where all operations succeed together or all fail together (ACID properties). Prevents partial updates.

**CDD (Customer Due Diligence):** Process of verifying customer identity and assessing risk. Required under Financial Intelligence Act.

**CFT (Counter-Financing of Terrorism):** Measures to prevent financial systems from being used to finance terrorism. Part of FIA compliance.

**CNP (Card-Not-Present):** Transaction where card is not physically present (online, phone, mail order). Highest fraud rate.

**DLT (Distributed Ledger Technology):** Blockchain and similar decentralized ledger systems. NOT used by Smartpay.

**FIA (Financial Intelligence Act):** Namibian law governing AML/CFT compliance. FIA 2012, Act No. 13 of 2012.

**FMI (Financial Market Infrastructure):** Systemically important payment, clearing, settlement, or recording systems. Subject to enhanced oversight.

**G2P (Government-to-Person):** Payments from government to individuals (e.g., social grants, vouchers). Zero interchange fee.

**Haversine Formula:** Mathematical formula to calculate distance between two points on a sphere using latitude/longitude. Used for finding nearest agents.

**HITL (Human-in-the-Loop):** AI system design where humans review and approve critical decisions. Used in Smartpay AI backend.

**KYC (Know Your Customer):** Identity verification process. Two tiers in Smartpay: Lite and Full.

**NAMQR:** Namibia QR Code Standards - standardized QR code format for interoperable payments across all issuers.

**NAD (Namibia Dollar):** Currency of Namibia. ISO code: NAD. All Smartpay transactions in NAD.

**NPS (National Payment System):** Entire payments ecosystem in Namibia including systems, rules, technologies, and institutions.

**OTP (One-Time Password):** Temporary password valid for single use. Sent via SMS for authentication.

**P2P (Person-to-Person):** Transfer between individuals. Zero interchange fee.

**PEP (Politically Exposed Person):** Individual in prominent public position. Subject to enhanced due diligence.

**PSA (Payments Association of Namibia):** Industry body for NPS participants. Formerly Payment System Management Body (PSMB).

**PSD (Payment System Determination):** Binding regulation issued by Bank of Namibia under PSMA. PSDs 1-13 currently active.

**PSMA (Payment System Management Act):** Act 14 of 2023. Primary legislation governing NPS in Namibia.

**PSP (Payment Service Provider):** Entity licensed to provide payment services (e-money issuers, card issuers, payment facilitators, etc.).

**RAG (Retrieval Augmented Generation):** AI technique combining vector search (LanceDB) with language models (DeepSeek) for grounded responses.

**RTO (Recovery Time Objective):** Maximum time to restore system after incident. PSD-12 target: 2 hours.

**RPO (Recovery Point Objective):** Maximum acceptable data loss period. PSD-12 target: 5 minutes.

**STR (Suspicious Transaction Report):** Report filed with Financial Intelligence Centre for suspicious activity. Confidential.

**Trust Account:** Segregated bank account holding 100% of customer e-money liabilities. Protected from issuer insolvency.

**VASP (Virtual Asset Service Provider):** Entity providing virtual asset services. Requires licensing under Virtual Assets Act 2023. NOT applicable to Smartpay.

---

**End of Knowledge Base**

**Document Version:** 1.0  
**Last Updated:** March 18, 2026  
**Prepared For:** LanceDB RAG Ingestion  
**Coverage:** Comprehensive Smartpay product features, Namibian payment regulations (PSDs 1-13, PSMA, ETA), fraud patterns, transaction workflows, agent banking, compliance requirements, and AI backend capabilities.
