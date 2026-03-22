# Database Audit Action Checklist

**Generated:** 2026-03-22  
**Full Report:** See `DATABASE_AUDIT_REPORT.md`

---

## 🔴 P0 - CRITICAL (Start Today)

### 1. Create Rollback Scripts
- [ ] Create rollback script for 001-010 migrations (Core tables)
- [ ] Create rollback script for 011-022 migrations (Features)
- [ ] Create rollback script for 023-037 migrations (OBS/Compliance)
- [ ] Create rollback script for 038-047 migrations (Recent features)
- [ ] Test rollback script for 042 (ML tables) in dev environment
- [ ] Add rollback command to `runMigrations.ts`

**Template:**
```sql
-- XXX_table_name_rollback.sql
DROP TABLE IF EXISTS table_name CASCADE;
DROP VIEW IF EXISTS view_name;
DROP FUNCTION IF EXISTS function_name(args);
-- Delete from migrations table:
-- DELETE FROM migrations WHERE name = 'XXX_table_name.sql';
```

**Estimated Effort:** 2-3 days  
**Risk if Skipped:** Cannot recover from production migration failures

---

### 2. Fix Migration Runner Transaction Handling
- [ ] Add BEGIN/COMMIT around migration execution
- [ ] Test migration failure rollback in dev
- [ ] Update error handling to rollback on failure

**File:** `apps/smartpay-backend/scripts/runMigrations.ts`

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(migrationSQL);
  await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**Estimated Effort:** 1 hour  
**Risk if Skipped:** Partial migrations = corrupted migration state

---

## 🟡 P1 - HIGH (Next Sprint)

### 3. Add Missing Foreign Key Constraints
- [ ] Create migration `048_fix_foreign_keys.sql`
- [ ] Add FK: compliance_alerts → users (ON DELETE SET NULL)
- [ ] Add FK: obs_consent_audit_log → obs_consents (ON DELETE RESTRICT)
- [ ] Add FK: kri_metrics.investigated_by → users (ON DELETE SET NULL)
- [ ] Add FK: kri_metrics.alert_recipients → users (if applicable)
- [ ] Add FK: fraud_rule_triggers → multiple tables (verify CASCADE)
- [ ] Add FK: 3 more missing constraints (see audit report)
- [ ] Test in dev environment with sample data
- [ ] Deploy to staging
- [ ] Deploy to production

**Estimated Effort:** 4 hours  
**Risk if Skipped:** Orphaned records, failed compliance audits

---

### 4. Add Missing Performance Indexes
- [ ] Create migration `049_performance_indexes.sql`
- [ ] Add index: daily_transaction_totals(wallet_id, date DESC)
- [ ] Add index: obs_consent_audit_log(created_at DESC)
- [ ] Add index: compliance_alerts(user_id, created_at DESC)
- [ ] Add index: transactions(type, created_at) for type-based queries
- [ ] Run EXPLAIN ANALYZE on critical queries before/after
- [ ] Verify query performance improvement (>50% faster)
- [ ] Deploy to production

**Estimated Effort:** 2 hours  
**Risk if Skipped:** Slow queries at scale (>1M transactions)

---

### 5. Verify Cron Job Configuration
- [ ] Check Node.js backend for trust account reconciliation job
- [ ] Verify cron runs daily at midnight UTC
- [ ] Check BoN reporting queue processor exists
- [ ] Verify KRI metrics calculation job
- [ ] Test cron failure alerts (email/Slack)
- [ ] Document all cron jobs in `docs/CRON_JOBS.md`

**Check Locations:**
- `apps/smartpay-backend/src/jobs/`
- `apps/smartpay-backend/src/cron/`
- Environment: `CRON_ENABLED=true`

**Estimated Effort:** 2 hours  
**Risk if Skipped:** Manual reconciliation = regulatory violation

---

## 🟢 P2 - MEDIUM (Plan for Next Quarter)

### 6. Add Webhook Delivery Logs Table
- [ ] Create migration `050_webhook_logs.sql`
- [ ] Design schema: webhook_id, url, payload, response, retry_count
- [ ] Add indexes: (created_at), (status, created_at)
- [ ] Integrate with Buffr Connect webhook handler
- [ ] Add observability dashboard (Grafana)

**Estimated Effort:** 3 hours  
**Value:** Audit external integrations, debug webhook failures

---

### 7. Plan Table Partitioning Strategy
- [ ] Monitor `transactions` table row count
- [ ] Implement partitioning when >1M rows reached
- [ ] Design: PARTITION BY RANGE (created_at) - monthly partitions
- [ ] Create migration `051_partition_transactions.sql`
- [ ] Test migration in dev with 1M+ sample rows
- [ ] Document maintenance: monthly partition creation

**Trigger:** When transactions.count > 1,000,000  
**Estimated Effort:** 1-2 days

---

### 8. Materialize Complex Views
- [ ] Monitor query performance for `vw_kri_trends`
- [ ] If p95 latency >500ms, create materialized view
- [ ] Add cron job to refresh every hour: `REFRESH MATERIALIZED VIEW vw_kri_trends_cached`
- [ ] Update backend to query cached view
- [ ] Verify performance improvement

**Trigger:** Dashboard loading >1 second  
**Estimated Effort:** 4 hours

---

## 🔵 P3 - LOW (Nice-to-Have)

### 9. Add Session Management Table
- [ ] Evaluate need for server-side session tracking
- [ ] If required by PSD-12 auditor, create migration `052_sessions.sql`
- [ ] Design: user_id, session_token, ip_address, user_agent, expires_at
- [ ] Integrate with Supabase Auth refresh token flow

**Estimated Effort:** 2 hours

---

### 10. Standardize Migration Documentation
- [ ] Create `docs/MIGRATION_GUIDE.md`
- [ ] Document required header format
- [ ] Document naming convention: `XXX_descriptive_name.sql`
- [ ] Document rollback script requirement
- [ ] Add migration template file
- [ ] Add pre-commit hook to validate header format

**Header Template:**
```sql
-- Migration: XXX_descriptive_name.sql
-- Purpose: Brief description (1-2 sentences)
-- Priority: CRITICAL | HIGH | MEDIUM | LOW
-- Date: YYYY-MM-DD
-- Related: PSD-X §Y.Z (if applicable)
```

**Estimated Effort:** 1 hour

---

## Verification Checklist

### Before Deploying to Production
- [ ] All P0 tasks completed
- [ ] Rollback scripts tested in dev/staging
- [ ] Migration runner transaction safety verified
- [ ] Foreign key constraints tested with data
- [ ] Performance indexes benchmarked (EXPLAIN ANALYZE)
- [ ] Cron jobs verified running
- [ ] Database backup created
- [ ] Rollback plan documented

### After Deploying to Production
- [ ] Monitor query performance (first 24 hours)
- [ ] Check daily trust account reconciliation runs successfully
- [ ] Verify KRI metrics updated correctly
- [ ] Check BoN reporting queue processes correctly
- [ ] Monitor error logs for FK constraint violations
- [ ] Verify no orphaned records created

---

## Success Metrics

**Migration Integrity:**
- ✅ 100% of migrations have rollback scripts
- ✅ 100% of migrations run in transactions
- ✅ 0 partial migration failures in production

**Data Integrity:**
- ✅ 0 orphaned records detected
- ✅ 100% of FK relationships enforced
- ✅ 0 cascade-related data loss incidents

**Performance:**
- ✅ p95 query latency <200ms (all queries)
- ✅ Daily limit check <50ms
- ✅ Trust reconciliation <2 seconds

**Compliance:**
- ✅ 100% trust account reconciliations completed on time
- ✅ 100% KRI metrics calculated correctly
- ✅ 0 compliance violations from missing data

---

## Timeline

| Week | Tasks | Priority |
|------|-------|----------|
| Week 1 | P0 tasks #1-2 | 🔴 CRITICAL |
| Week 2 | P1 tasks #3-5 | 🟡 HIGH |
| Month 2 | P2 tasks #6-8 | 🟢 MEDIUM |
| Quarter 2 | P3 tasks #9-10 | 🔵 LOW |

**Total Estimated Effort:**
- P0: 3 days (24 hours)
- P1: 2 days (16 hours)
- P2: 1 week (40 hours)
- P3: 1 day (8 hours)

**Total: 88 hours (~11 working days with 1 engineer)**

---

## Contact for Questions

**Database Lead:** [Your Name]  
**Compliance Officer:** [Compliance Team]  
**DevOps Lead:** [DevOps Team]

---

**Last Updated:** 2026-03-22  
**Next Review:** After P0/P1 completion
