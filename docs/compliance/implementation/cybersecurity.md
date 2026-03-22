# Bank of Namibia PSD-12 Cybersecurity Implementation Guide

## Executive Summary

This document provides a complete, production-ready implementation of the **Determination of the Operational and Cybersecurity Standards within the National Payment System (PSD-12)** issued by the Bank of Namibia, effective July 1, 2023.

## Table of Contents

1. [Regulatory Requirements Summary](#regulatory-requirements-summary)
2. [Five-Phase Cybersecurity Framework](#five-phase-cybersecurity-framework)
3. [Implementation Architecture](#implementation-architecture)
4. [Security Components](#security-components)
5. [Compliance Monitoring](#compliance-monitoring)

---

## Regulatory Requirements Summary

### Key Obligations from PSD-12

#### **Section 9: Governance Requirements**
- ✅ Board approval of cybersecurity framework
- ✅ Quarterly risk profile reviews (4 times/year)
- ✅ Segregation of duties between Board and security officers
- ✅ Direct Board reporting access for security officers

#### **Section 11: Five-Phase Framework (Identify, Protect, Detect, Respond, Recover)**

##### **11.1-11.3: IDENTIFY Phase**
- ✅ Annual risk assessment (or when significant changes occur)
- ✅ Classify business functions by criticality
- ✅ Threat intelligence processes
- ✅ **Penetration testing every 3 years for critical systems**

##### **11.4-11.5: PROTECT Phase**
- ✅ Implement protective controls per best practices
- ✅ Third-party agreements must include safeguards
- ✅ Safeguard information assets and data

##### **11.6: DETECT Phase**
- ✅ Continuous monitoring for anomalous cyber activities
- ✅ Monitor ALL payments for fraudulent/suspicious activities

##### **11.7-11.8: RESPOND Phase**
- ✅ Investigate nature, extent, and damage of attacks
- ✅ Contain situation to prevent further damage
- ✅ Commence recovery efforts

##### **11.9-11.12: RECOVER Phase**
- ✅ **Resume critical operations within 2 hours**
- ✅ **Recovery Point Objective (RPO): 5 minutes**
- ✅ Test response plans **twice per year**
- ✅ Coordinate with internal/external stakeholders

#### **Section 11.13-11.15: Incident Reporting**
- ✅ **Report cyberattacks within 24 hours** (preliminary notification)
- ✅ **Full impact assessment within 1 month**
- ✅ Report financial loss, data loss, and availability loss

#### **Section 12: Safety Standards**
- ✅ **Encryption/tokenization/masking** for data transmission across open/public networks
- ✅ **Two-factor authentication (2FA) for EVERY payment transaction**
- ✅ Compliance with best practice standards (PCI-DSS, EMV, 3D Secure)

#### **Section 13: Key Risk Indicators (KRIs) & Tolerance Levels**

| Risk Indicator | Tolerance Level | Mandatory |
|---|---|---|
| **Uptime/Availability** | 99.9% | ✅ |
| **Recovery Time Objective (RTO)** | Within 2 hours | ✅ |
| **Recovery Point Objective (RPO)** | 5 minutes | ✅ |
| **Test Response Plans** | 2 successful tests/year | ✅ |

### Fraud Trends from NPS 10-Year Report

#### **Common Attack Vectors (2013-2022)**
1. **Card Fraud** (95% of incidents)
   - Card-not-present (CNP) payments
   - Lost/stolen cards
   - Forged/counterfeit cards
   
2. **EFT Fraud** (1% of incidents, 10% of value)
   - Phishing attacks (92.5% of EFT fraud)
   - SIM card swapping
   - Denial-of-service (DoS) attacks

3. **E-Money Fraud** (3% of incidents, 19% of value)
   - Phone call scams
   - SIM card swapping

#### **Total NPS Fraud (2013-2022)**
- **66,218 incidents** valued at **N$158.9 million**
- Card fraud: 63,045 incidents (N$59.8M)
- E-money fraud: 2,110 incidents (N$30.6M)
- Cash fraud: 623 incidents (N$53.1M)
- EFT fraud: 373 incidents (N$15.3M)

---

## Five-Phase Cybersecurity Framework

### Phase 1: IDENTIFY

#### Asset Inventory & Classification
```
CRITICAL SYSTEMS (per PSD-12 Section 3.5):
1. Financial Market Infrastructures (FMIs)
2. Interoperable Retail Payment Systems
   - Payment Card systems
   - Electronic Fund Transfers (EFT)
   - E-money systems
3. Supporting Infrastructure
   - Authentication services
   - Database systems
   - API gateways
```

#### Risk Assessment Requirements
- **Frequency**: Annually OR when significant changes occur
- **Scope**: All business functions and supporting processes
- **Output**: Criticality classification and interdependencies
- **Threat Intelligence**: Ongoing monitoring + penetration testing every 3 years

### Phase 2: PROTECT

#### Encryption Requirements
**Data at Rest** (Section 3.12):
- AES-256 encryption for databases
- Encrypted file systems
- Hardware Security Modules (HSM) for key management

**Data in Motion** (Section 3.11):
- TLS 1.3 for all network communications
- End-to-end encryption for payment data
- Certificate pinning for mobile apps

**Data in Use** (Section 3.10):
- Memory encryption
- Secure enclaves for sensitive operations
- Tokenization of card data

#### Tokenization Requirements
- Replace sensitive data with non-reversible tokens
- Dynamic tokens with no intrinsic value
- PCI-DSS compliant tokenization

#### Two-Factor Authentication (2FA)
**MANDATORY for EVERY payment** (Section 12.2):
- Payment initiation
- Payment instrument usage
- Website transactions
- Mobile application transactions

**Implementation Options**:
1. SMS OTP + Password
2. Authenticator App (TOTP) + Password
3. Biometric + Password/PIN
4. Hardware Token + Password

#### Access Controls
- Role-Based Access Control (RBAC)
- Principle of least privilege
- Segregation of duties
- Multi-factor authentication for admin access

### Phase 3: DETECT

#### Continuous Monitoring Requirements (Section 11.6)
- Real-time anomaly detection
- Security Information and Event Management (SIEM)
- **Monitor ALL payments for fraud**
- Network intrusion detection
- File integrity monitoring
- Database activity monitoring

#### Fraud Detection Patterns
Based on 10-year fraud trends, monitor for:
- **Card-not-present anomalies**
- **Phishing indicators**
- **SIM swap attempts**
- **Unusual transaction patterns**
- **Geographic anomalies**
- **Velocity checks**

### Phase 4: RESPOND

#### Incident Response Timeline
- **T+0**: Detect incident
- **T+24 hours**: Preliminary notification to Bank of Namibia
- **T+1 month**: Full impact assessment submitted

#### Response Actions (Section 11.7-11.8)
1. **Investigate**: Determine nature, extent, and damage
2. **Contain**: Prevent further damage
3. **Eradicate**: Remove threat
4. **Recover**: Restore operations

#### Reporting Requirements
Report to Bank of Namibia:
- Financial loss amount
- Data loss details
- Availability loss (downtime)
- Root cause analysis
- Remediation actions taken

### Phase 5: RECOVER

#### Recovery Time Requirements
- **RTO**: Resume critical operations within **2 hours**
- **RPO**: Maximum data loss of **5 minutes**
- **Testing**: **Twice per year** for critical systems
- **Coordination**: Internal and external stakeholders

#### Business Continuity Planning
- Disaster recovery site
- Data backup and replication
- Failover procedures
- Communication plans
- Stakeholder notification

---

## Implementation Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE LAYER                             │
│  Board → Security Officer → Quarterly Reviews → Risk Tolerances  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Mobile App   │  │ Web App      │  │ Admin Portal │          │
│  │ (2FA + Bio)  │  │ (2FA + OTP)  │  │ (MFA)        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓ TLS 1.3        ↓ TLS 1.3        ↓ TLS 1.3            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYER                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ API Gateway → WAF → Rate Limiting → Authentication         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Fraud Detection Engine (ML Models)                         │ │
│  │  - Card-not-present detection                              │ │
│  │  - Phishing detection                                      │ │
│  │  - SIM swap detection                                      │ │
│  │  - Velocity checks                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Payment Svc  │  │ User Svc     │  │ Wallet Svc   │          │
│  │ (2FA req)    │  │ (Auth)       │  │ (Tokenized)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PostgreSQL (AES-256 Encrypted at Rest)                     │ │
│  │  - Audit Logs (immutable)                                  │ │
│  │  - Transaction Records (tokenized)                         │ │
│  │  - User Data (encrypted PII)                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Redis (Encrypted) - Session Management                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               MONITORING & COMPLIANCE LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ SIEM         │  │ KRI Dashboard│  │ Incident Mgmt│          │
│  │ (Anomalies)  │  │ (99.9% SLA)  │  │ (24h Report) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 BACKUP & RECOVERY LAYER                          │
│  Continuous Replication → RPO: 5 min → RTO: 2 hours             │
│  Test DR Plans 2x/year                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Components

### Component 1: Two-Factor Authentication (2FA)
**Location**: `security/authentication/`
- SMS OTP provider
- TOTP authenticator
- Biometric authentication
- Hardware token support

### Component 2: Encryption & Tokenization
**Location**: `security/encryption/`
- AES-256 encryption service
- TLS 1.3 configuration
- Tokenization service (PCI-DSS compliant)
- Key management (HSM integration)

### Component 3: Fraud Detection Engine
**Location**: `security/fraud-detection/`
- ML models for anomaly detection
- Rule-based fraud detection
- Real-time transaction scoring
- Pattern recognition algorithms

### Component 4: Incident Response System
**Location**: `security/incident-response/`
- Incident logging and tracking
- Automated Bank of Namibia reporting (24h)
- Impact assessment workflows
- Stakeholder notification system

### Component 5: Vulnerability Management
**Location**: `security/vulnerability-management/`
- Asset inventory system
- Penetration testing scheduler (3-year cycle)
- Patch management
- Risk assessment automation

### Component 6: Audit & Compliance
**Location**: `security/audit-compliance/`
- Immutable audit logs
- KRI monitoring dashboard (99.9% uptime, RTO, RPO)
- Quarterly Board reports
- Compliance checklist automation

### Component 7: Business Continuity & Disaster Recovery
**Location**: `security/business-continuity/`
- Backup automation (RPO: 5 min)
- Failover orchestration (RTO: 2 hours)
- DR testing scheduler (2x/year)
- Recovery playbooks

---

## Compliance Monitoring

### Key Risk Indicators (KRIs) Dashboard

```
╔════════════════════════════════════════════════════════════╗
║         PSD-12 COMPLIANCE DASHBOARD                        ║
╠════════════════════════════════════════════════════════════╣
║ KRI 1: System Uptime                                       ║
║   Current: 99.95% ✅ (Target: 99.9%)                       ║
║   Last 30 days: 99.92% ✅                                  ║
║                                                            ║
║ KRI 2: Recovery Time Objective                            ║
║   Last Incident: 1h 45m ✅ (Target: < 2 hours)            ║
║   Avg Last 6 months: 1h 30m ✅                            ║
║                                                            ║
║ KRI 3: Recovery Point Objective                           ║
║   Current RPO: 3 minutes ✅ (Target: ≤ 5 minutes)         ║
║   Data Loss Last Incident: 2 minutes ✅                   ║
║                                                            ║
║ KRI 4: DR Testing                                         ║
║   Last Test: 2025-01-15 ✅                                ║
║   Next Test: 2025-07-15 (176 days)                        ║
║   Tests This Year: 1/2 ⚠️                                 ║
║                                                            ║
║ KRI 5: Penetration Testing                                ║
║   Last Test: 2024-06-01                                   ║
║   Next Test: 2027-06-01 (827 days)                        ║
║                                                            ║
║ KRI 6: Incident Reporting Compliance                      ║
║   Incidents This Year: 2                                  ║
║   Reported Within 24h: 2/2 ✅ (100%)                      ║
║   Impact Assessments: 2/2 ✅ (100%)                       ║
║                                                            ║
║ KRI 7: 2FA Compliance                                     ║
║   Payments with 2FA: 100% ✅                              ║
║   Failed 2FA Attempts: 127 (Last 24h)                    ║
║                                                            ║
║ KRI 8: Fraud Detection Rate                               ║
║   Transactions Monitored: 847,523 (Last 24h)             ║
║   Fraud Blocked: 34 (0.004%) ✅                           ║
║   False Positives: 2 (5.9%)                               ║
╚════════════════════════════════════════════════════════════╝
```

### Quarterly Board Reporting Template

**Required by Section 9.4**: Board must be apprised 4 times per year.

```markdown
# Quarterly Cybersecurity Report to Board
**Period**: Q1 2026 (Jan 1 - Mar 31, 2026)
**Submitted to**: Board of Directors
**Submitted by**: Chief Information Security Officer

## Executive Summary
- Overall Risk Level: **LOW** ✅
- Compliance Status: **COMPLIANT** ✅
- Critical Incidents: 0
- System Uptime: 99.96%

## 1. Risk Profile Status
| Risk Category | Status | Tolerance | Action Required |
|---|---|---|---|
| Cyberattacks | LOW ✅ | LOW | None |
| Fraud | MODERATE ⚠️ | MODERATE | Enhanced monitoring |
| Data Breaches | LOW ✅ | LOW | None |
| Availability | LOW ✅ | LOW | None |

## 2. Key Risk Indicators (KRIs)
[Insert KRI Dashboard - see above]

## 3. Incident Summary
- Total Incidents: 0
- Successful Cyberattacks: 0
- Near Misses: 2
- BoN Reports Filed: 0

## 4. Fraud Detection Performance
- Card-not-present blocked: 23 transactions (N$456,000)
- Phishing attempts blocked: 11 attempts
- SIM swap alerts: 0
- False positive rate: 6.2%

## 5. Compliance Status
✅ 2FA enforced on 100% of payments
✅ Encryption standards maintained
✅ Penetration testing scheduled
✅ DR testing on track (1/2 completed)
✅ Audit logs maintained

## 6. Recommendations
1. Increase fraud detection model training frequency
2. Conduct additional phishing awareness training
3. Review third-party vendor security agreements

## 7. Upcoming Activities
- Q2 DR Test (April 2026)
- Annual Risk Assessment (May 2026)
- Security awareness training (June 2026)
```

---

## Implementation Files

The following files are created in the `/security` directory:

### Database Schemas
1. `schemas/audit_logs.sql` - Immutable audit trail
2. `schemas/incidents.sql` - Incident tracking
3. `schemas/vulnerability_assessments.sql` - Vulnerability management
4. `schemas/kri_metrics.sql` - Key Risk Indicators
5. `schemas/2fa_logs.sql` - Authentication logs
6. `schemas/fraud_detection.sql` - Fraud events

### API Endpoints
1. `api/2fa.ts` - Two-factor authentication
2. `api/encryption.ts` - Encryption services
3. `api/fraud-detection.ts` - Fraud detection API
4. `api/incident-response.ts` - Incident management
5. `api/audit-logs.ts` - Audit log retrieval
6. `api/compliance-dashboard.ts` - KRI metrics

### Services & Middleware
1. `services/TwoFactorAuthService.ts` - 2FA implementation
2. `services/EncryptionService.ts` - Encryption/tokenization
3. `services/FraudDetectionService.ts` - ML-based fraud detection
4. `services/IncidentResponseService.ts` - Incident workflow
5. `services/AuditLogService.ts` - Audit logging
6. `middleware/require2FA.ts` - 2FA enforcement middleware

### ML Models
1. `ml-models/card-not-present-detector.py` - CNP fraud detection
2. `ml-models/phishing-detector.py` - Phishing detection
3. `ml-models/sim-swap-detector.py` - SIM swap detection
4. `ml-models/anomaly-detector.py` - General anomaly detection

### Incident Response Playbooks
1. `playbooks/cyberattack-response.md` - Cyberattack response
2. `playbooks/data-breach-response.md` - Data breach response
3. `playbooks/fraud-incident-response.md` - Fraud response
4. `playbooks/availability-incident-response.md` - Downtime response

---

## Next Steps

1. Review architecture and components
2. Deploy security infrastructure
3. Configure monitoring and alerting
4. Train security team on incident response
5. Conduct initial DR test
6. Present to Board for approval
7. Begin quarterly reporting cycle

---

## Contact Information

**Bank of Namibia NPS Oversight**
- Director: National Payment System
- P.O. Box 2882
- Windhoek, Namibia

**Internal Security Team**
- CISO: [Name]
- Security Officers: [Names]
- Incident Response Team: [Contact]

---

*This implementation guide is based on PSD-12 effective July 1, 2023, and incorporates fraud trends from the Bank of Namibia's 10-Year NPS Fraud Report (2013-2022) and the Bank of Namibia Data Engineering Technical Framework 2023.*
