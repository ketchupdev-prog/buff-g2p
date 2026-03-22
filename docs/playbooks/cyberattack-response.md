# Cyberattack Incident Response Playbook

**PSD-12 Compliance:** Sections 11.7-11.15  
**Last Updated:** March 17, 2026  
**Version:** 1.0

## Purpose

This playbook provides step-by-step procedures for responding to cyberattack incidents, ensuring compliance with Bank of Namibia PSD-12 requirements.

## Scope

Applies to all cyberattack incidents including:
- Phishing attacks (92.5% of EFT fraud per NPS 10-year report)
- Denial-of-Service (DoS) attacks
- Malware/ransomware infections
- SQL injection attempts
- API abuse
- Brute force attacks
- Social engineering attacks

## PSD-12 Critical Deadlines

| Requirement | Deadline | Section |
|---|---|---|
| **BoN Preliminary Notification** | **24 hours** | 11.13 |
| **BoN Impact Assessment** | **1 month** | 11.14 |
| **Resume Critical Operations** | **2 hours** | 11.9 |

---

## Phase 1: DETECT & IDENTIFY (T+0 to T+30 minutes)

### Immediate Actions (First 5 Minutes)

**1. Alert Received**
- [ ] SIEM alert triggered
- [ ] User report received
- [ ] Automated monitoring detected anomaly
- [ ] Third-party notification received

**2. Initial Assessment** (PSD-12 Section 11.7)
- [ ] Verify alert is genuine (not false positive)
- [ ] Identify attack type and vector
- [ ] Determine scope of impact
- [ ] Classify severity:
  - **CRITICAL:** Active ransomware, massive data breach, total system down
  - **HIGH:** Active attack in progress, partial system compromise
  - **MEDIUM:** Attempted attack contained, limited impact
  - **LOW:** Unsuccessful attack attempt, no impact

**3. Activate Incident Response Team**
- [ ] Notify Security Operations Center (SOC)
- [ ] Alert CISO/Security Officer
- [ ] Activate on-call incident response team
- [ ] If CRITICAL/HIGH: Notify senior management immediately

**4. Create Incident Record** (Use IncidentResponseService)
```typescript
const incident = await incidentResponseService.createIncident({
  title: 'Suspected phishing attack targeting EFT users',
  description: 'Multiple users received fraudulent emails claiming to be from SmartPay',
  incidentType: 'CYBERATTACK',
  severity: 'HIGH',
  detectedBySystem: 'SIEM',
  attackVector: 'EMAIL',
});

// Note deadlines:
// BoN notification due: incident.bonNotification24HourDeadline
// Impact assessment due: incident.impactAssessment1MonthDeadline
```

**5. Start Incident Timeline**
- [ ] Document detection time
- [ ] Document detection method
- [ ] Begin logging all actions taken

---

## Phase 2: INVESTIGATE & CONTAIN (T+30 minutes to T+2 hours)

### Investigation (PSD-12 Section 11.7: "determine nature, extent, and damage")

**1. Gather Evidence**
- [ ] Collect logs from affected systems
- [ ] Capture network traffic (PCAP files)
- [ ] Screenshot suspicious activity
- [ ] Document Indicators of Compromise (IOCs):
  - IP addresses
  - Domain names
  - File hashes
  - Email addresses
  - URLs

**2. Determine Attack Scope**
- [ ] How many systems affected?
- [ ] How many users impacted?
- [ ] What data was accessed/exfiltrated?
- [ ] When did attack begin?
- [ ] Is attack still ongoing?

**3. Classify Attack Type** (Based on NPS 10-year fraud report)

#### Phishing Attack (92.5% of EFT fraud)
- [ ] Identify phishing email content
- [ ] Determine how many users received email
- [ ] Check if any users clicked malicious links
- [ ] Verify if any credentials were compromised
- [ ] Block sender domains/IPs
- [ ] Alert all users about phishing attempt

#### DoS/DDoS Attack
- [ ] Identify attack source IPs
- [ ] Determine attack type (volumetric, application layer, protocol)
- [ ] Measure impact on service availability
- [ ] Activate DDoS mitigation (CloudFlare, AWS Shield, etc.)

#### Malware/Ransomware
- [ ] Identify malware variant (hash, signature)
- [ ] Determine infection vector
- [ ] Isolate infected systems
- [ ] Check for lateral movement
- [ ] Assess if ransomware encryption occurred

### Containment (PSD-12 Section 11.8: "prevent further damage")

**1. Immediate Containment Actions**
- [ ] Block malicious IP addresses at firewall
- [ ] Disable compromised user accounts
- [ ] Quarantine infected systems
- [ ] Block malicious domains at DNS level
- [ ] Isolate affected network segments
- [ ] Disable compromised API keys/tokens

**2. Communication Blackout** (If necessary)
- [ ] Inform team: "Do NOT discuss incident on public channels"
- [ ] Use secure communication channels only
- [ ] Avoid tipping off attacker

**3. Preserve Evidence**
- [ ] Take disk images of affected systems
- [ ] Preserve logs before rotation
- [ ] Document all containment actions

**4. Update Incident Record**
```typescript
await incidentResponseService.updateIncident({
  incidentId: incident.incidentId,
  status: 'CONTAINED',
  containmentActions: [
    'Blocked 15 malicious IP addresses',
    'Disabled 8 compromised user accounts',
    'Quarantined 3 infected servers',
  ],
});
```

---

## Phase 3: NOTIFY STAKEHOLDERS (T+0 to T+24 hours)

### Bank of Namibia Notification (PSD-12 Section 11.13)

**CRITICAL REQUIREMENT: Preliminary notification within 24 hours**

**1. Determine if BoN Notification Required**
- [ ] Severity is CRITICAL or HIGH
- [ ] Critical systems affected (FMI, Retail Payment Systems)
- [ ] Data breach involving customer PII
- [ ] Financial loss occurred
- [ ] System availability impacted

**2. Send Preliminary Notification** (Before 24-hour deadline)
```typescript
await incidentResponseService.sendBonPreliminaryNotification(
  incident.incidentId,
  ciso_userId
);
```

**Notification must include:**
- Incident number and date detected
- Type and severity of incident
- Affected systems
- Current status
- Immediate actions taken
- Statement: "Full impact assessment to follow within 30 days"

**3. Internal Notifications**
- [ ] Notify Board of Directors (if CRITICAL)
- [ ] Notify senior management
- [ ] Notify affected departments
- [ ] Notify legal/compliance team
- [ ] Notify PR/communications (for external communications)

**4. Customer Notifications** (If data breach)
- [ ] Determine which customers affected
- [ ] Draft customer notification (legal review required)
- [ ] Send notifications via email/SMS/app
- [ ] Provide guidance to customers (password reset, account monitoring)

**5. External Notifications**
- [ ] Notify payment processors (if card fraud)
- [ ] Notify PAN (Payments Association of Namibia)
- [ ] Notify law enforcement (if criminal activity)
- [ ] Notify insurance provider (cyber insurance)

---

## Phase 4: ERADICATE & RECOVER (T+2 hours to T+48 hours)

### Eradication (PSD-12 Section 11.8)

**1. Remove Threat**
- [ ] Delete malware from all infected systems
- [ ] Close all backdoors/persistence mechanisms
- [ ] Reset compromised credentials
- [ ] Revoke compromised API keys/certificates
- [ ] Patch exploited vulnerabilities
- [ ] Update security rules/signatures

**2. Verify Eradication**
- [ ] Scan all systems for remaining threats
- [ ] Monitor for signs of attacker returning
- [ ] Verify all IOCs are blocked
- [ ] Confirm no suspicious activity

**3. Update Incident**
```typescript
await incidentResponseService.updateIncident({
  incidentId: incident.incidentId,
  status: 'ERADICATED',
  eradicationActions: [
    'Removed malware from 3 servers',
    'Reset 45 user passwords',
    'Patched CVE-2023-XXXX on all systems',
  ],
});
```

### Recovery (PSD-12 Section 11.9-11.12)

**PSD-12 Requirement: Resume critical operations within 2 hours**

**1. System Recovery**
- [ ] Restore systems from clean backups (if necessary)
- [ ] Verify system integrity before bringing online
- [ ] Test critical functions
- [ ] Monitor for anomalies

**2. Recovery Point Objective (RPO) Check**
- [ ] Target: Maximum 5 minutes data loss
- [ ] Verify: What data was lost?
- [ ] Document: Actual data loss (minutes/hours)

**3. Recovery Time Objective (RTO) Check**
- [ ] Target: Resume critical operations within 2 hours
- [ ] Actual: How long until systems restored?
- [ ] Document: Actual downtime (minutes/hours)

**4. Gradual Service Restoration**
- [ ] Start with critical payment systems
- [ ] Then restore supporting services
- [ ] Finally restore non-critical services
- [ ] Monitor closely during restoration

**5. User Communication**
- [ ] Notify users that service is restored
- [ ] Provide instructions for any required actions
- [ ] Apologize for disruption
- [ ] Reassure about security measures

**6. Update Incident**
```typescript
await incidentResponseService.updateIncident({
  incidentId: incident.incidentId,
  status: 'RECOVERED',
  recoveryActions: [
    'Restored payment gateway from backup',
    'All critical systems operational',
    'Downtime: 1 hour 45 minutes (within 2-hour RTO)',
  ],
});
```

---

## Phase 5: IMPACT ASSESSMENT (T+1 week to T+1 month)

### Complete Impact Assessment (PSD-12 Section 11.14 & 11.15)

**CRITICAL REQUIREMENT: Complete within 1 month of detection**

**Required Reporting (PSD-12 Section 11.15):**
1. **Financial Loss (in NAD)**
2. **Data Loss**
3. **Availability Loss (downtime in minutes)**

**1. Calculate Financial Loss**
- Direct costs:
  - [ ] Revenue lost during downtime
  - [ ] Fraudulent transactions
  - [ ] Refunds/chargebacks
- Recovery costs:
  - [ ] Incident response team time
  - [ ] External consultants/forensics
  - [ ] System restoration
  - [ ] Data recovery
- Remediation costs:
  - [ ] New security tools
  - [ ] Security upgrades
  - [ ] User notifications
  - [ ] Legal fees

**2. Assess Data Loss**
- [ ] Number of records compromised
- [ ] Types of data affected:
  - [ ] Customer PII (names, addresses, ID numbers)
  - [ ] Payment card data
  - [ ] Transaction history
  - [ ] Credentials (usernames/passwords)
- [ ] Potential impact to individuals

**3. Measure Availability Loss**
- [ ] Total downtime in minutes
- [ ] Systems affected
- [ ] Business operations impacted
- [ ] Revenue impact

**4. Submit Impact Assessment**
```typescript
await incidentResponseService.completeImpactAssessment({
  incidentId: incident.incidentId,
  financialLossNAD: 125000.00,
  dataLossDescription: 'Customer email addresses and transaction history',
  dataLossRecordCount: 1500,
  dataLossIncludesPII: true,
  availabilityLossMinutes: 105,
  completedByUserId: ciso_userId,
  documentUrl: 'https://secure-docs.smartpay.na/incident-reports/INC-2026-001.pdf',
});
```

**5. Send Final Report to BoN**
- Automatically sent when impact assessment is completed
- Includes complete incident details, impact, and lessons learned

---

## Phase 6: POST-INCIDENT REVIEW (T+1 month to T+2 months)

### Root Cause Analysis

**1. Identify Root Cause**
- [ ] How did attacker gain initial access?
- [ ] What vulnerabilities were exploited?
- [ ] Why did existing controls fail?
- [ ] Were there warning signs missed?

**2. Timeline Analysis**
- [ ] When did attack actually begin?
- [ ] When should it have been detected?
- [ ] What was the detection delay?
- [ ] How quickly did we respond?

**3. Document Root Cause**
```typescript
await incidentResponseService.updateIncident({
  incidentId: incident.incidentId,
  rootCause: 'Phishing email bypassed email security gateway due to use of compromised legitimate domain. User clicked link and entered credentials on fake login page. MFA not enabled for this user.',
});
```

### Lessons Learned

**1. What Went Well?**
- [ ] Early detection by SIEM
- [ ] Rapid team mobilization
- [ ] Effective containment
- [ ] BoN notification within 24 hours

**2. What Went Wrong?**
- [ ] Delayed detection (attack began 2 days before detection)
- [ ] User clicked phishing link (security awareness gap)
- [ ] MFA not enforced universally
- [ ] Insufficient email filtering

**3. Improvements Required**
- [ ] Deploy advanced email security (sandbox suspicious links)
- [ ] Mandatory MFA for all users (PSD-12 Section 12.2)
- [ ] Enhanced security awareness training
- [ ] Improve SIEM detection rules
- [ ] Faster incident response procedures

**4. Document Lessons Learned**
```typescript
await incidentResponseService.updateIncident({
  incidentId: incident.incidentId,
  lessonsLearned: `
1. MFA MUST be enforced for all users without exception (PSD-12 requirement)
2. Deploy advanced email security with sandboxing
3. Conduct quarterly phishing simulation exercises
4. Improve SIEM alerting for credential abuse patterns
5. Update incident response procedures to reduce detection-to-containment time
  `,
});
```

### Remediation Actions

**1. Implement Security Improvements**
- [ ] Deploy recommended security controls
- [ ] Update security policies
- [ ] Enhance monitoring/detection
- [ ] Conduct training

**2. Track Remediation Progress**
- [ ] Assign owners to each action
- [ ] Set deadlines
- [ ] Monitor completion
- [ ] Verify effectiveness

**3. Close Incident**
```typescript
await incidentResponseService.closeIncident(
  incident.incidentId,
  'Incident fully remediated. All security improvements implemented. No further action required.',
  ciso_userId
);
```

---

## Key Contacts

### Internal Contacts
- **CISO:** [Name] - [Phone] - [Email]
- **Security Operations Center:** [Phone] - [Email]
- **IT Operations Manager:** [Name] - [Phone]
- **Legal/Compliance:** [Name] - [Phone]
- **CEO/Managing Director:** [Name] - [Phone]

### External Contacts
- **Bank of Namibia NPS Oversight:**
  - Director: National Payment System
  - P.O. Box 2882, Windhoek
  - Email: nps@bon.com.na
  - Phone: +264 (0)61 283 5111

- **Payments Association of Namibia (PAN):**
  - Email: info@pan.com.na
  - Phone: [Number]

- **Cyber Insurance Provider:**
  - Company: [Name]
  - Claim Phone: [Number]
  - Email: [Email]

- **External Forensics/Incident Response:**
  - Company: [Name]
  - Phone: [24/7 Number]
  - Email: [Email]

---

## Compliance Checklist

Before closing incident, verify:
- [ ] BoN preliminary notification sent within 24 hours
- [ ] BoN final report sent with impact assessment
- [ ] Financial loss calculated and reported (NAD)
- [ ] Data loss quantified and reported
- [ ] Availability loss measured and reported (minutes)
- [ ] All actions logged to audit trail
- [ ] Root cause analysis completed
- [ ] Lessons learned documented
- [ ] Remediation actions identified and assigned
- [ ] Board notified (if CRITICAL severity)

---

## References

- **PSD-12:** Determination of Operational and Cybersecurity Standards (2023)
- **NPS Fraud Report:** 10-Year Fraud Trend Report (2013-2022)
- **NIST CSF:** Cybersecurity Framework v1.1
- **ISO 27035:** Information Security Incident Management

---

**Document Owner:** Chief Information Security Officer  
**Review Frequency:** Quarterly  
**Next Review:** June 17, 2026
