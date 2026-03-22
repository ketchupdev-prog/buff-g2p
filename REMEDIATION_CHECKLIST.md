# SmartPay Security Remediation Checklist

**Quick Reference for Implementation Team**  
**Based on Security Audit dated March 22, 2026**

---

## 🔴 PHASE 1: CRITICAL (P0) - Complete by April 30, 2026

### ✅ Task 1: Encrypt PII Columns (40 hours)
**Deadline:** April 10, 2026  
**Owner:** Backend Dev

- [ ] Install PostgreSQL pgcrypto extension
- [ ] Create encryption helper functions
- [ ] Backup production database
- [ ] Encrypt `users.phone_number` column
- [ ] Encrypt `users.email` column
- [ ] Encrypt `users.national_id` column (if exists)
- [ ] Encrypt `wallet_accounts.wallet_number` column
- [ ] Update all queries to use pgp_sym_decrypt()
- [ ] Test decryption in staging
- [ ] Deploy to production (off-hours)
- [ ] Verify all user data accessible
- [ ] Update `.env` with PII_ENCRYPTION_KEY

**Files to Modify:**
- `/database/migrations/XXX_encrypt_pii.sql`
- `/apps/smartpay-backend/src/services/UserService.ts`
- `/apps/smartpay-backend/src/services/WalletService.ts`

**Test Command:**
```sql
-- Verify encryption
SELECT pgp_sym_decrypt(phone_number::bytea, 'key') FROM users LIMIT 1;
```

---

### ✅ Task 2: Implement Uptime Monitoring (60 hours)
**Deadline:** April 15, 2026  
**Owner:** DevOps

**Option A: Prometheus + Grafana**
- [ ] Deploy Prometheus server (Docker)
- [ ] Install node_exporter on API servers
- [ ] Configure Prometheus scraping (30s intervals)
- [ ] Deploy Grafana dashboard
- [ ] Import "Node Exporter Full" dashboard
- [ ] Create custom API health dashboard
- [ ] Configure 99.9% uptime alert
- [ ] Setup email/Slack alerts
- [ ] Test alert flow
- [ ] Document runbook

**Option B: Datadog**
- [ ] Create Datadog account
- [ ] Install Datadog agent on servers
- [ ] Enable APM (Application Performance Monitoring)
- [ ] Configure uptime monitors (API endpoints)
- [ ] Set 99.9% SLA threshold
- [ ] Configure alert notifications
- [ ] Create uptime dashboard
- [ ] Test alerting

**Files to Create:**
- `/monitoring/prometheus.yml`
- `/monitoring/grafana-dashboard.json`
- `/monitoring/alerts.yml`

**Success Criteria:**
- [ ] Dashboard shows current uptime percentage
- [ ] Alert triggers when uptime < 99.9%
- [ ] Historical data retained for 90 days

---

### ✅ Task 3: Deploy Trust Account Reconciliation (80 hours)
**Deadline:** April 15, 2026  
**Owner:** Backend Dev

- [ ] Create `trust_account_reconciliation` table
- [ ] Create reconciliation script
- [ ] Implement wallet balance summation query
- [ ] Implement trust account balance API call (bank integration)
- [ ] Create discrepancy calculation logic
- [ ] Add email alert (>N$100 discrepancy)
- [ ] Add SMS alert (>N$10,000 discrepancy)
- [ ] Create cron job (daily at 11:59 PM)
- [ ] Test in staging with mock data
- [ ] Deploy to production
- [ ] Monitor first 7 days
- [ ] Document resolution procedures

**Files to Create:**
- `/database/migrations/XXX_trust_account_reconciliation.sql`
- `/apps/smartpay-backend/src/scripts/reconcile-trust-account.ts`
- `/apps/smartpay-backend/src/services/TrustAccountService.ts`

**Cron Configuration:**
```bash
# Add to crontab
59 23 * * * cd /apps/smartpay-backend && node scripts/reconcile-trust-account.js >> /var/log/reconciliation.log 2>&1
```

**Success Criteria:**
- [ ] Reconciliation runs daily automatically
- [ ] Discrepancies logged in database
- [ ] Alerts sent to compliance officer
- [ ] 100% reconciliation for first 7 days

---

### ✅ Task 4: Fix npm Vulnerabilities (40 hours)
**Deadline:** April 5, 2026  
**Owner:** Backend Dev

**Critical Packages:**
- [ ] Update @mapbox/node-pre-gyp to latest
- [ ] Evaluate duckdb alternatives (or wait for upstream fix)
- [ ] Update jest-expo to v47.0.1
- [ ] Run `npm audit fix --force`
- [ ] Test application after updates
- [ ] Update package-lock.json
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Document dependency update policy

**DuckDB Options:**
1. **Wait for fix** (monitor CVE, deploy when available)
2. **Replace with PostgreSQL** (use native analytics queries)
3. **Use BigQuery/Redshift** (cloud analytics)

**Commands:**
```bash
# Update dependencies
npm update @mapbox/node-pre-gyp
npm install jest-expo@47.0.1

# Verify vulnerabilities fixed
npm audit --audit-level=high
```

**Success Criteria:**
- [ ] 0 high/critical vulnerabilities in npm audit
- [ ] All tests pass after updates
- [ ] Production deployment successful

---

### ✅ Task 5: Schedule Penetration Testing (120 hours)
**Deadline:** Q2 2026 (May-June)  
**Owner:** Security Lead

**Pre-Test Preparation:**
- [ ] Get Board approval for budget (N$80,000-N$200,000)
- [ ] Request quotes from 3 certified firms (CEH or CREST)
- [ ] Select vendor
- [ ] Define scope (APIs, auth, database, mobile app)
- [ ] Sign contract and NDA
- [ ] Prepare staging environment (clone of production)
- [ ] Document current security controls

**During Test (2-3 weeks):**
- [ ] Provide test credentials
- [ ] Monitor test progress
- [ ] Respond to vendor questions
- [ ] Track findings in real-time

**Post-Test (2 weeks):**
- [ ] Receive penetration test report
- [ ] Present findings to Board
- [ ] Create remediation plan for findings
- [ ] Fix critical/high findings (within 30 days)
- [ ] Schedule re-test for critical fixes
- [ ] Archive report at `/docs/security/penetration-tests/2026-Q2-report.pdf`

**Recommended Vendors (Namibia/South Africa):**
- Dimension Data (South Africa)
- Serianu (East/Southern Africa)
- SecureData (South Africa)

**Success Criteria:**
- [ ] Penetration test completed by June 30, 2026
- [ ] Report submitted to Board
- [ ] Critical findings remediated
- [ ] Next test scheduled for 2029

---

### ✅ Task 6: Conduct First DR Test (60 hours)
**Deadline:** April 25, 2026  
**Owner:** DevOps

**Pre-Test Planning:**
- [ ] Schedule 4-hour maintenance window
- [ ] Notify customers (72 hours advance)
- [ ] Backup all production data
- [ ] Document current architecture
- [ ] Create DR test scenario (database server failure)
- [ ] Prepare secondary infrastructure

**DR Test Execution:**
- [ ] Start timer (T=0)
- [ ] Simulate primary database failure
- [ ] Trigger failover to secondary database
- [ ] Restore from latest backup
- [ ] Verify data integrity
- [ ] Test all critical APIs
- [ ] Test mobile app connectivity
- [ ] Document time to recovery (RTO)
- [ ] Document data loss (RPO)
- [ ] Stop timer (measure RTO)

**Post-Test:**
- [ ] Restore production environment
- [ ] Verify all services operational
- [ ] Document lessons learned
- [ ] Update DR runbook
- [ ] Submit test report to Board
- [ ] Schedule next test (Q3 2026)

**Target Metrics:**
- RTO: < 2 hours (from failure to full restoration)
- RPO: < 5 minutes (maximum acceptable data loss)

**Success Criteria:**
- [ ] RTO < 2 hours achieved
- [ ] RPO < 5 minutes achieved
- [ ] Test report submitted to Board
- [ ] Runbook updated with findings

---

### ✅ Task 7: Implement RBAC (100 hours)
**Deadline:** April 30, 2026  
**Owner:** Backend Dev

**Database Schema:**
- [ ] Create `roles` table
- [ ] Create `permissions` table
- [ ] Create `role_permissions` junction table
- [ ] Create `user_roles` junction table
- [ ] Seed default roles (user, merchant, agent, admin, compliance_officer, super_admin)
- [ ] Seed default permissions (read:wallet, write:wallet, read:transactions, etc.)

**Backend Implementation:**
- [ ] Create RBAC middleware (`requireRole()`, `requirePermission()`)
- [ ] Protect admin endpoints with `requireRole(['admin', 'super_admin'])`
- [ ] Protect compliance endpoints with `requireRole(['compliance_officer', 'super_admin'])`
- [ ] Update user registration to assign default 'user' role
- [ ] Create admin API to assign/revoke roles
- [ ] Add role information to JWT payload
- [ ] Update authentication to load user roles

**Frontend/Mobile:**
- [ ] Add role-based UI hiding (admin menu, etc.)
- [ ] Display user role in settings screen
- [ ] Show "Contact admin for role upgrade" message

**Files to Create:**
- `/database/migrations/XXX_rbac_schema.sql`
- `/database/seeds/rbac_roles_permissions.sql`
- `/apps/smartpay-backend/src/middleware/rbac.ts`
- `/apps/smartpay-backend/src/services/RBACService.ts`

**Example Roles:**
```sql
INSERT INTO roles (name, description) VALUES
  ('user', 'Basic wallet user'),
  ('merchant', 'Merchant account'),
  ('agent', 'Cash-in/cash-out agent'),
  ('admin', 'System administrator'),
  ('compliance_officer', 'View audit logs and reports'),
  ('super_admin', 'Full system access');
```

**Success Criteria:**
- [ ] All users assigned to appropriate roles
- [ ] Admin endpoints protected
- [ ] Audit logs show role-based actions
- [ ] Unauthorized access returns 403 Forbidden

---

## ⚠️ PHASE 2: HIGH PRIORITY (P1) - Complete by June 30, 2026

### Task 8: Automate KRI Data Collection (60 hours)
**Deadline:** May 15, 2026

- [ ] Create KRICollectionService
- [ ] Query uptime from monitoring API
- [ ] Calculate 2FA enforcement rate
- [ ] Calculate fraud detection coverage
- [ ] Check audit log completeness
- [ ] Insert daily KRI values into `kri_metrics` table
- [ ] Create daily cron job (1 AM)

---

### Task 9: Create KRI Dashboard (80 hours)
**Deadline:** May 30, 2026

- [ ] Choose dashboard tool (Grafana, Metabase, or custom React)
- [ ] Create KRI visualization (gauges, charts)
- [ ] Display current vs target for each KRI
- [ ] Add red/yellow/green status indicators
- [ ] Create quarterly report export (PDF)

---

### Task 10: Automate BoN Incident Reporting (40 hours)
**Deadline:** May 10, 2026

- [ ] Create BankOfNamibiaReportingService
- [ ] Create email templates (cyberattack, outage, fraud)
- [ ] Implement auto-send on critical incidents
- [ ] Log all submissions in `incidents` table
- [ ] Track 30-day impact assessment deadline

---

### Task 11: Create Incident Response Playbooks (40 hours)
**Deadline:** May 20, 2026

- [ ] Write `/docs/security/playbooks/cyberattack-response.md`
- [ ] Write `/docs/security/playbooks/data-breach-response.md`
- [ ] Write `/docs/security/playbooks/fraud-incident-response.md`
- [ ] Write `/docs/security/playbooks/availability-incident-response.md`
- [ ] Train security team on playbooks

---

### Task 12: Implement Data Export/Deletion APIs (60 hours)
**Deadline:** June 10, 2026

- [ ] Create `POST /api/v1/users/export-data` endpoint
- [ ] Generate JSON file with all user data
- [ ] Create `POST /api/v1/users/delete-account` endpoint
- [ ] Soft delete (anonymize PII, retain transactions for 7 years)
- [ ] Add GDPR-style privacy policy

---

### Task 13: Restrict CORS Origins (8 hours)
**Deadline:** May 5, 2026

- [ ] Update `CORS_ORIGIN` from `*` to specific domains
- [ ] Test API access from allowed domains
- [ ] Verify rejection from unauthorized domains

---

### Task 14: Audit JWT Validation Consistency (40 hours)
**Deadline:** May 30, 2026

- [ ] Review mobile JWT implementation
- [ ] Review backend JWT implementation
- [ ] Ensure same secret/algorithm used
- [ ] Document JWT flow end-to-end
- [ ] Fix any inconsistencies

---

### Task 15: Document Secrets Rotation Policy (16 hours)
**Deadline:** May 15, 2026

- [ ] Create `/docs/security/secrets-rotation-policy.md`
- [ ] Define rotation schedule (JWT: 90 days, DB: 180 days, API keys: 365 days)
- [ ] Document rotation procedures

---

### Task 16: Implement API Key Rotation Policy (40 hours)
**Deadline:** June 15, 2026

- [ ] Create API key generation endpoint
- [ ] Add expiry date to API keys
- [ ] Send rotation reminder emails (30 days before expiry)
- [ ] Force rotation after 90 days

---

## 📊 Progress Tracking

### P0 Tasks Completion (Target: 100% by April 30)
- [ ] Task 1: PII Encryption (0%)
- [ ] Task 2: Uptime Monitoring (0%)
- [ ] Task 3: Trust Account Reconciliation (0%)
- [ ] Task 4: npm Vulnerabilities (0%)
- [ ] Task 5: Penetration Testing (0%)
- [ ] Task 6: DR Testing (0%)
- [ ] Task 7: RBAC Implementation (0%)

**Overall P0 Progress: 0/7 tasks (0%)**

### P1 Tasks Completion (Target: 75% by June 30)
- [ ] Task 8-16: (0%)

**Overall P1 Progress: 0/9 tasks (0%)**

---

## 📝 Weekly Status Report Template

```markdown
## SmartPay Security Remediation - Week [X] Status

**Reporting Period:** [Date] - [Date]  
**Overall Progress:** [X%]

### Completed This Week
- [Task name] - [Owner] - ✅ Complete
- [Task name] - [Owner] - ✅ Complete

### In Progress
- [Task name] - [Owner] - [X%] complete
  - Blocker: [if any]
  - Next steps: [action items]

### Planned Next Week
- [Task name] - [Owner] - [Start date]
- [Task name] - [Owner] - [Start date]

### Issues & Risks
- [Issue description] - Risk level: [High/Medium/Low]
  - Mitigation: [plan]

### Budget Status
- Spent: N$[X]
- Remaining: N$[X]
```

---

## 🚨 Escalation Procedures

### When to Escalate

**To CISO:**
- Task delayed >3 days
- Budget overrun >10%
- Technical blocker unresolved >2 days

**To Board:**
- P0 task will miss deadline
- Total delay >14 days
- Budget overrun >25%

### Contact List
- CISO: [email/phone]
- DevOps Lead: [email/phone]
- Backend Lead: [email/phone]
- Compliance Officer: [email/phone]

---

**Document Version:** 1.0  
**Last Updated:** March 22, 2026  
**Next Review:** April 1, 2026
