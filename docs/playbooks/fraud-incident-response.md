# Fraud Incident Response Playbook

**PSD-12 Compliance:** Section 11.6 - Monitor ALL payments for fraud  
**Based on:** NPS 10-Year Fraud Report (2013-2022)  
**Last Updated:** March 17, 2026  
**Version:** 1.0

## Purpose

This playbook provides procedures for responding to payment fraud incidents based on the fraud patterns identified in the Bank of Namibia's 10-Year NPS Fraud Report.

## Fraud Patterns (2013-2022 Data)

### By Volume:
- **Card Fraud:** 95% of incidents (63,045 incidents)
  - Card-not-present (CNP) payments: Majority
  - Lost/stolen cards
  - Forged/counterfeit cards
- **E-Money Fraud:** 3% of incidents (2,110 incidents)
  - Phone call scams
  - SIM card swapping
- **EFT Fraud:** 1% of incidents (373 incidents)
  - Phishing attacks: 92.5% of EFT fraud
  - SIM card swapping
  - Denial-of-service attacks

### By Value:
- **Card Fraud:** 38% (N$59.8M)
- **E-Money Fraud:** 19% (N$30.6M)
- **EFT Fraud:** 10% (N$15.3M)

---

## Phase 1: DETECT FRAUD (Real-time)

### Automated Detection (PSD-12 Section 11.6)

**1. Fraud Detection System Alerts**
- [ ] Real-time fraud detection engine triggered
- [ ] Risk score exceeds threshold (70+)
- [ ] Multiple fraud rules triggered
- [ ] ML model predicts fraud with high confidence

**2. User Reports**
- [ ] User disputes transaction
- [ ] User reports unauthorized access
- [ ] User reports receiving suspicious OTP
- [ ] User reports SIM swap

**3. Pattern Detection**
- [ ] Velocity anomaly detected
- [ ] Geographic impossibility detected
- [ ] Device fingerprint mismatch
- [ ] Behavioral anomaly detected

### Fraud Type Identification

#### Card-Not-Present (CNP) Fraud (95% of card fraud)
**Indicators:**
- [ ] Online transaction without card present
- [ ] High-value transaction from new device
- [ ] Multiple failed attempts before success
- [ ] Unusual merchant category
- [ ] Geographic mismatch

#### Phishing Attack (92.5% of EFT fraud)
**Indicators:**
- [ ] Login from unusual location
- [ ] Device change immediately after login
- [ ] Multiple failed login attempts
- [ ] Suspicious user behavior pattern
- [ ] Transaction immediately after password reset

#### SIM Swap Attack
**Indicators:**
- [ ] Phone number recently changed
- [ ] Device change coincides with phone change
- [ ] OTP sent but not used
- [ ] High-value transaction from new device
- [ ] User unable to receive SMS

#### Phone Call Scam (E-money fraud)
**Indicators:**
- [ ] User received suspicious call
- [ ] Transaction initiated shortly after call
- [ ] User social-engineered into sharing OTP
- [ ] Transaction to unknown recipient

---

## Phase 2: IMMEDIATE RESPONSE (T+0 to T+15 minutes)

### Block Transaction (If not yet completed)

**1. Automated Block**
```typescript
// Fraud detection service automatically blocks high-risk transactions
const fraudCheck = await fraudDetectionService.checkPayment(context);

if (fraudCheck.riskScore >= 70) {
  // Transaction blocked
  return { blocked: true, reason: fraudCheck.blockReason };
}
```

**2. Manual Block**
- [ ] Security team reviews flagged transaction
- [ ] If fraud confirmed, block transaction
- [ ] Notify user of block
- [ ] Request additional verification

### Freeze Accounts (If fraud confirmed)

**1. Freeze Affected Accounts**
- [ ] Freeze sender account (if compromised)
- [ ] Freeze payment instrument (card/wallet)
- [ ] Prevent further transactions
- [ ] Notify user

**2. Preserve Evidence**
- [ ] Save transaction logs
- [ ] Capture device fingerprint
- [ ] Record IP address
- [ ] Save screenshots
- [ ] Document timeline

**3. Notify User**
- [ ] Send SMS/email alert
- [ ] Call user to verify (if high-value)
- [ ] Request user to confirm/deny transaction
- [ ] Provide fraud report instructions

---

## Phase 3: INVESTIGATION (T+15 minutes to T+2 hours)

### Fraud Analysis

**1. Verify Fraud**
- [ ] Contact user to confirm unauthorized transaction
- [ ] Check for additional fraudulent transactions
- [ ] Identify compromised credentials
- [ ] Determine attack vector

**2. Scope Assessment**
- [ ] How many users affected?
- [ ] How many transactions fraudulent?
- [ ] Total financial loss?
- [ ] Is fraud ongoing?

**3. Attack Vector Analysis**

#### Card-Not-Present Fraud
- [ ] How was card data obtained?
- [ ] Which merchant was targeted?
- [ ] Is card physically still with user?
- [ ] Were CVV/expiry compromised?

#### Phishing Attack
- [ ] What phishing method was used? (Email, SMS, call)
- [ ] Which credentials were compromised?
- [ ] Was 2FA bypassed? How?
- [ ] Are other users at risk?

#### SIM Swap Attack
- [ ] When did SIM swap occur?
- [ ] Which mobile provider?
- [ ] How was swap authorized?
- [ ] Was user's identity stolen?

### Evidence Collection

**1. Transaction Evidence**
- [ ] Transaction ID
- [ ] Timestamp
- [ ] Amount and recipient
- [ ] Device information
- [ ] IP address and location
- [ ] 2FA method used (or bypassed)

**2. System Logs**
- [ ] Authentication logs
- [ ] Fraud detection logs
- [ ] Audit trail
- [ ] API access logs

**3. User Information**
- [ ] User statement/report
- [ ] Last known good transaction
- [ ] User's devices
- [ ] User's typical behavior

---

## Phase 4: CONTAINMENT (T+2 hours to T+24 hours)

### Stop Fraud Spread

**1. Identify Compromised Credentials**
- [ ] Reset user password
- [ ] Invalidate session tokens
- [ ] Revoke API keys
- [ ] Disable compromised 2FA method

**2. Block Fraudster**
- [ ] Add fraudster device to blacklist
- [ ] Block fraudster IP addresses
- [ ] Flag fraudster recipient accounts
- [ ] Alert other payment providers (via PAN)

**3. Pattern-Based Blocking**
- [ ] Update fraud detection rules
- [ ] Block similar transaction patterns
- [ ] Enhance velocity checks
- [ ] Add new fraud indicators

**4. User Protection**
- [ ] Issue new card (if card fraud)
- [ ] Update account security settings
- [ ] Enable additional 2FA
- [ ] Monitor account for 30 days

### Financial Recovery

**1. Reverse Fraudulent Transaction** (If possible)
- [ ] Contact recipient's payment provider
- [ ] Request transaction reversal
- [ ] Document reversal attempt
- [ ] Track recovery status

**2. Chargeback** (For card transactions)
- [ ] Initiate chargeback with card issuer
- [ ] Provide fraud evidence
- [ ] Follow PCI-DSS dispute procedures

**3. Insurance Claim** (If applicable)
- [ ] Notify fraud insurance provider
- [ ] Submit claim with evidence
- [ ] Track claim status

**4. Customer Reimbursement**
- [ ] Determine liability (user vs. SmartPay)
- [ ] Process customer refund (if SmartPay liable)
- [ ] Document reimbursement
- [ ] Update customer

---

## Phase 5: REPORTING & COMPLIANCE

### Internal Reporting

**1. Create Incident Record**
```typescript
const incident = await incidentResponseService.createIncident({
  title: 'Card-not-present fraud detected',
  description: '15 fraudulent transactions totaling NAD 45,000',
  incidentType: 'FRAUD',
  severity: 'HIGH',
  detectedBySystem: 'FRAUD_DETECTION_ENGINE',
});
```

**2. Document Loss**
```typescript
await incidentResponseService.completeImpactAssessment({
  incidentId: incident.incidentId,
  financialLossNAD: 45000.00,
  dataLossDescription: 'Card data compromised',
  dataLossRecordCount: 15,
  dataLossIncludesPII: false,
  availabilityLossMinutes: 0,
  completedByUserId: fraud_team_lead_userId,
});
```

### External Reporting

**1. Bank of Namibia** (If significant impact)
- [ ] Report if financial loss exceeds threshold
- [ ] Report if multiple users affected
- [ ] Follow PSD-12 Section 11.13 (24-hour notification)

**2. Payments Association of Namibia (PAN)**
- [ ] Share fraud patterns (anonymized)
- [ ] Alert other PSPs about attack vector
- [ ] Contribute to fraud prevention efforts

**3. Law Enforcement** (If criminal)
- [ ] File police report
- [ ] Provide evidence package
- [ ] Cooperate with investigation

**4. Card Networks** (For card fraud)
- [ ] Report to Visa/Mastercard
- [ ] Follow card network fraud reporting procedures
- [ ] Share fraud indicators

---

## Phase 6: RECOVERY & PREVENTION

### Customer Support

**1. User Communication**
- [ ] Explain what happened
- [ ] Detail steps taken to secure account
- [ ] Provide fraud prevention tips
- [ ] Offer credit monitoring (if PII compromised)

**2. Account Recovery**
- [ ] Restore account access (with enhanced security)
- [ ] Issue new payment instruments
- [ ] Re-enable services
- [ ] Monitor for 30 days

### Fraud Prevention Enhancements

**1. Update Fraud Detection Rules**
```typescript
// Add new rule based on this fraud pattern
await addFraudRule({
  ruleName: 'CNP High-Value New Device',
  ruleType: 'CARD_NOT_PRESENT',
  conditions: {
    isCardPresent: false,
    amount: { greaterThan: 5000 },
    isNewDevice: true,
  },
  riskScore: 35,
  actionOnTrigger: 'STEP_UP_AUTH',
});
```

**2. ML Model Training**
- [ ] Add fraud samples to training dataset
- [ ] Retrain fraud detection models
- [ ] Validate model improvements
- [ ] Deploy updated models

**3. Security Controls**
- [ ] Strengthen 2FA enforcement
- [ ] Enhance device fingerprinting
- [ ] Improve geolocation checks
- [ ] Add behavioral biometrics

**4. User Education**
- [ ] Send fraud awareness notifications
- [ ] Update security tips in app
- [ ] Conduct webinars on fraud prevention
- [ ] Share real fraud examples (anonymized)

---

## Fraud Pattern-Specific Procedures

### Card-Not-Present (CNP) Fraud

**Detection:**
- Online transaction without physical card
- High-value purchase from new merchant
- Multiple small test transactions followed by large one
- Mismatched billing/shipping address

**Response:**
- Require 3D Secure authentication
- Step-up 2FA for high-value CNP transactions
- Verify with cardholder via SMS/call
- Block if risk score > 70

**Prevention:**
- Enforce 3D Secure for all CNP transactions
- Limit CNP transaction amounts for new devices
- Verify cardholder contact information
- Monitor for card testing patterns

### Phishing Attack

**Detection:**
- Login from unusual location
- Multiple failed login attempts
- Transaction immediately after successful phishing
- User behavior anomalies

**Response:**
- Reset user password immediately
- Invalidate all sessions
- Enable account recovery process
- Notify user of compromise

**Prevention:**
- Enforce 2FA universally (PSD-12 Section 12.2)
- Deploy advanced email security
- Conduct phishing awareness training
- Implement DMARC/SPF/DKIM

### SIM Swap Attack

**Detection:**
- Phone number change + device change
- High-value transaction from new device
- OTP sent but not received by user
- User unable to authenticate

**Response:**
- Block transactions immediately
- Contact user via alternate method (email)
- Verify SIM swap with mobile provider
- Freeze account until user verified

**Prevention:**
- Multi-factor verification for account changes
- Additional security questions
- Biometric authentication (not SMS-based)
- Alert user of any SIM/phone changes

---

## Fraud Statistics Tracking

### Monthly Fraud Report

Track and report:
- [ ] Total fraud incidents
- [ ] Fraud by type (CNP, phishing, SIM swap, etc.)
- [ ] Total financial loss (NAD)
- [ ] Detection rate (% caught before completion)
- [ ] False positive rate
- [ ] Recovery rate (% of funds recovered)
- [ ] Average time to detection
- [ ] Average time to resolution

### Fraud KPIs

| KPI | Target | Current |
|---|---|---|
| Fraud Detection Rate | > 95% | % |
| False Positive Rate | < 5% | % |
| Average Detection Time | < 5 minutes | minutes |
| Funds Recovery Rate | > 70% | % |
| Customer Satisfaction | > 90% | % |

---

## Escalation Matrix

### Fraud Severity Levels

**Level 1 - Minor (< NAD 5,000)**
- Single user affected
- Small financial loss
- **Response:** Fraud analyst handles

**Level 2 - Moderate (NAD 5,000 - 50,000)**
- Few users affected
- Moderate financial loss
- **Response:** Fraud team lead + security team

**Level 3 - Major (NAD 50,000 - 500,000)**
- Multiple users affected
- Significant financial loss
- **Response:** CISO + management + legal

**Level 4 - Critical (> NAD 500,000)**
- Widespread attack
- Massive financial loss
- **Response:** CEO + Board + BoN notification

---

## Key Contacts

### Internal
- **Fraud Team Lead:** [Name] - [Phone] - [Email]
- **Security Operations:** [Phone] - [Email]
- **Customer Support:** [Phone] - [Email]
- **Legal/Compliance:** [Name] - [Phone]

### External
- **Bank of Namibia:** +264 (0)61 283 5111
- **PAN (Payments Association):** [Phone]
- **Namibian Police (Cyber Crime):** [Phone]
- **Mobile Providers:**
  - MTC: 081 123
  - Telecom Namibia: 091 123

---

## References

- **NPS 10-Year Fraud Report** (2013-2022)
- **PSD-12** Section 11.6: Monitor ALL payments for fraud
- **PCI-DSS** v4.0: Payment Card Industry Data Security Standard
- **EMV 3DS:** 3D Secure Authentication

---

**Document Owner:** Head of Fraud Prevention  
**Review Frequency:** Quarterly (after each NPS fraud report)  
**Next Review:** June 17, 2026
