# AIS Platform - Implementation Quick Reference

**Last Updated:** 2026-03-22  
**Status:** Production Blocker Gaps Identified  
**Full Plan:** See `AIS_PLATFORM_IMPLEMENTATION_PLAN.md`

---

## 🚨 Critical Gaps Summary

| Category | Missing Items | Priority | Effort |
|----------|--------------|----------|--------|
| **Routes** | 23 endpoints | P0 | 40h |
| **Middleware** | 4 services | P0 | 24h |
| **Database** | 18 functions + 12 indexes | P0 | 32h |
| **Integration** | 3 services | P0 | 24h |
| **Testing** | Full test suite | P0 | 40h |
| **Total** | - | - | **160h** |

---

## 📋 Missing Routes Checklist

### Bank Simulator (6 routes) - **NEW FILE**
```
File: apps/smartpay-backend/src/routes/simulator/bankSimulator.ts

☐ POST   /api/v1/simulator/accounts        
☐ GET    /api/v1/simulator/accounts/:id    
☐ POST   /api/v1/simulator/transactions    
☐ POST   /api/v1/simulator/reset           
☐ GET    /api/v1/simulator/scenarios       
☐ POST   /api/v1/simulator/scenarios/:id   
```

### PIS Enhancement (6 routes) - **ENHANCE EXISTING**
```
File: apps/smartpay-backend/src/routes/obs/pisRoutes.ts

☐ POST   /api/v1/obs/pis/domestic          
☐ POST   /api/v1/obs/pis/international     
☐ GET    /api/v1/obs/pis/payments/:id      
☐ POST   /api/v1/obs/pis/payments/:id/cancel
☐ POST   /api/v1/obs/pis/beneficiaries     
☐ GET    /api/v1/obs/pis/beneficiaries     
```

### Consent Management (4 routes) - **ENHANCE EXISTING**
```
File: apps/smartpay-backend/src/routes/obs/consentsRoutes.ts

☐ GET    /api/v1/obs/consents/history       
☐ POST   /api/v1/obs/consents/:id/extend    
☐ POST   /api/v1/obs/consents/:id/modify    
☐ GET    /api/v1/obs/consents/expiring      
```

### Webhook Management (6 routes) - **NEW FILE**
```
File: apps/smartpay-backend/src/routes/webhookManagement.ts

☐ POST   /api/v1/webhooks/subscribe         
☐ GET    /api/v1/webhooks/subscriptions     
☐ DELETE /api/v1/webhooks/subscriptions/:id 
☐ POST   /api/v1/webhooks/test               
☐ GET    /api/v1/webhooks/logs               
☐ POST   /api/v1/webhooks/retry/:id          
```

### Token Management (6 routes) - **NEW FILE**
```
File: apps/smartpay-backend/src/routes/tokenManagement.ts

☐ POST   /api/v1/tokens/refresh              
☐ POST   /api/v1/tokens/revoke               
☐ GET    /api/v1/tokens/active               
☐ POST   /api/v1/apikeys/generate            
☐ GET    /api/v1/apikeys                     
☐ DELETE /api/v1/apikeys/:id                 
```

---

## 🔒 Missing Middleware

### 1. RBAC (Role-Based Access Control)
```
File: apps/smartpay-backend/src/middleware/rbac.ts (NEW)

Functions:
- requireRole(options)
- requirePermission(permission)
- requireAdmin
- requireTPP
- requireDataProvider

Status: Critical - blocks secure route implementation
```

### 2. Dynamic Rate Limiter
```
File: apps/smartpay-backend/src/middleware/dynamicRateLimiter.ts (NEW)

Presets:
- standard: 100 req/min
- payments: 10 req/min
- ais: 30 req/min
- tpp: 1000 req/min

Status: High - prevents abuse
```

### 3. Audit Logger
```
File: apps/smartpay-backend/src/middleware/auditLogger.ts (NEW)

Features:
- Logs all requests to audit_logs table
- PII-safe (redacts sensitive fields)
- 7-year retention (FIA/PSD-12 compliance)

Status: Critical - compliance requirement
```

### 4. Centralized Error Handler
```
File: apps/smartpay-backend/src/middleware/errorHandler.ts (ENHANCE)

Features:
- Consistent error responses
- Error classification
- Monitoring integration

Status: Medium - improves reliability
```

---

## 🗄️ Missing Database Functions

### Stored Procedures (18 functions)
```
File: database/migrations/050_ais_stored_procedures.sql (NEW)

Critical Functions:
☐ validate_consent_active(consent_id, user_id)
☐ refresh_consent_token(consent_id, new_token, expires_in)
☐ revoke_consent_cascade(consent_id, user_id)
☐ get_active_consents_count(user_id, provider_id)
☐ expire_old_consents() -- Cron job
☐ log_ais_api_call(consent_id, endpoint, status, response_time)
☐ calculate_sla_compliance(provider_id, start_date, end_date)
☐ get_consent_usage_stats(consent_id)
☐ validate_tpp_authorization(participant_id, scope)
☐ create_payment_initiation(user_id, consent_id, amount, ...)
☐ batch_expire_consents(batch_size)
☐ get_expiring_consents(days_ahead)
☐ cleanup_old_audit_logs() -- 7-year retention
☐ validate_pkce_challenge(consent_id, code_verifier)
☐ aggregate_consent_metrics(start_date, end_date)
☐ detect_anomalous_api_usage(consent_id, threshold)
☐ calculate_data_provider_ranking()
☐ reconcile_consent_tokens() -- Nightly cleanup
```

### Performance Indexes (12 indexes)
```
File: database/migrations/051_ais_performance_indexes.sql (NEW)

☐ idx_obs_consents_user_status_expires
☐ idx_obs_consents_provider_status
☐ idx_obs_api_call_logs_consent_created
☐ idx_obs_api_call_logs_provider_created
☐ idx_obs_audit_user_created
☐ idx_obs_audit_consent_event
☐ idx_obs_payments_user_status
☐ idx_obs_payments_consent
☐ idx_obs_beneficiaries_user
☐ idx_simulator_accounts_number
☐ idx_simulator_txns_account_created
☐ idx_data_providers_status
```

### Supporting Tables
```
File: database/migrations/052_bank_simulator_tables.sql (NEW)

☐ simulator_accounts
☐ simulator_transactions

File: database/migrations/053_webhook_tables.sql (NEW)

☐ webhook_subscriptions
☐ webhook_delivery_logs
```

---

## 🔌 Missing Integration Services

### 1. Bank Simulator Service
```
File: apps/smartpay-backend/src/services/bankSimulator.ts (NEW)

Methods:
- createAccount(scenario)
- simulateTransaction(accountId, type, amount)
- getAccountBalance(accountId)
- getTransactionHistory(accountId, limit)

Status: Critical - enables testing
```

### 2. Webhook Delivery Service
```
File: apps/smartpay-backend/src/services/webhookDelivery.ts (NEW)

Methods:
- deliver(subscriptionId, event, data, retryCount)
- generateSignature(payload, secret)
- broadcast(event, data)

Features:
- HMAC signature verification
- Exponential backoff retry (5 attempts)
- Delivery logging

Status: High - external integration
```

### 3. Token Management Service
```
File: apps/smartpay-backend/src/services/tokenManagement.ts (NEW)

Methods:
- refreshAccessToken(consentId)
- revokeTokens(consentId)
- ensureValidToken(consentId)

Status: Critical - prevents expired token failures
```

---

## 🧪 Testing Requirements

### Unit Tests (6 files)
```
☐ __tests__/routes/simulator/bankSimulator.test.ts
☐ __tests__/routes/obs/pisRoutes.test.ts
☐ __tests__/routes/webhookManagement.test.ts
☐ __tests__/middleware/rbac.test.ts
☐ __tests__/services/webhookDelivery.test.ts
☐ __tests__/services/tokenManagement.test.ts
```

### Integration Tests (2 files)
```
☐ __tests__/integration/ais-flow.test.ts
☐ __tests__/integration/pis-flow.test.ts
```

### Test Coverage Target
```
☐ >80% code coverage
☐ All critical paths tested
☐ All error scenarios tested
☐ Load testing (100 concurrent users)
```

---

## 📅 Implementation Timeline

### Week 1: Foundation
**Focus:** Middleware + Bank Simulator  
**Effort:** 40 hours

- [ ] Day 1-2: RBAC middleware + tests
- [ ] Day 2-3: Audit logger + rate limiter
- [ ] Day 3-4: Bank simulator routes + tables
- [ ] Day 4-5: Bank simulator service + tests

**Deliverables:**
- ✅ 4 middleware files
- ✅ Bank simulator fully functional
- ✅ 50+ unit tests passing

---

### Week 2: Routes + Database
**Focus:** Complete all missing routes, deploy database functions  
**Effort:** 40 hours

- [ ] Day 1: PIS routes enhancement
- [ ] Day 2: Consent management enhancement
- [ ] Day 3: Webhook management routes
- [ ] Day 4: Token management routes
- [ ] Day 5: Database migrations (050-053)

**Deliverables:**
- ✅ 22 new/enhanced routes
- ✅ 18 stored procedures deployed
- ✅ 12 indexes created
- ✅ Route tests passing

---

### Week 3: Services + Integration
**Focus:** Implement integration services  
**Effort:** 40 hours

- [ ] Day 1-2: Webhook Delivery Service
- [ ] Day 2-3: Token Management Service
- [ ] Day 3-4: Service tests
- [ ] Day 4-5: Integration testing

**Deliverables:**
- ✅ 2 integration services
- ✅ Service tests passing
- ✅ Integration tests passing

---

### Week 4: Testing + Documentation
**Focus:** Comprehensive testing and finalization  
**Effort:** 40 hours

- [ ] Day 1: End-to-end AIS flow test
- [ ] Day 2: End-to-end PIS flow test
- [ ] Day 3: Load testing + performance tuning
- [ ] Day 4: Security audit + fixes
- [ ] Day 5: Documentation + deployment

**Deliverables:**
- ✅ 100% critical path coverage
- ✅ Load test passed (100 users)
- ✅ Security audit clean
- ✅ Production deployment ready

---

## 🎯 Success Criteria

### Functional
- [ ] All 23 routes implemented and tested
- [ ] Bank simulator operational with 6 test scenarios
- [ ] Webhook delivery with 99% success rate
- [ ] Token refresh automatic and reliable
- [ ] All stored procedures deployed and tested

### Non-Functional
- [ ] API latency <200ms (p95)
- [ ] Database queries <50ms avg
- [ ] 100 concurrent users supported
- [ ] Zero breaking changes to existing code
- [ ] >80% test coverage

### Compliance
- [ ] Audit logging for all routes
- [ ] RBAC enforced on sensitive endpoints
- [ ] Rate limiting prevents abuse
- [ ] 7-year data retention configured

---

## 🚀 Quick Start Commands

### Deploy Migrations
```bash
# Backup first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Deploy in order
psql $DATABASE_URL -f database/migrations/050_ais_stored_procedures.sql
psql $DATABASE_URL -f database/migrations/051_ais_performance_indexes.sql
psql $DATABASE_URL -f database/migrations/052_bank_simulator_tables.sql
psql $DATABASE_URL -f database/migrations/053_webhook_tables.sql
```

### Run Tests
```bash
# Unit tests
npm test -- --testPathPattern="simulator|rbac|webhook|token"

# Integration tests
npm run test:integration -- --testPathPattern="ais-flow|pis-flow"

# Coverage
npm test -- --coverage
```

### Deploy Services
```bash
# Build backend
npm run build --workspace=@smartpay/backend

# Run migrations
npm run migrate --workspace=@smartpay/backend

# Start server
npm run start --workspace=@smartpay/backend

# Health check
curl http://localhost:4000/api/health
```

---

## 📞 Support & Questions

**Implementation Questions:** See full plan in `AIS_PLATFORM_IMPLEMENTATION_PLAN.md`

**Code Templates:** All templates included in full plan

**Migration Scripts:** See `scripts/deploy-ais-migrations.sh`

**Architecture Diagrams:** See `docs/guides/architecture/`

---

**Status:** ✅ Ready for Implementation  
**Risk Level:** Medium (comprehensive rollback plan in place)  
**Expected Completion:** 4 weeks with 1 engineer
