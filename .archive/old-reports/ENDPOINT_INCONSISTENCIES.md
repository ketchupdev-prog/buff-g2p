# Fintech Backend/Mobile Endpoint Inconsistencies

**Ecosystem program:** Cross-repo API consistency work is **complete**. Canonical write-up: [`API_CONSISTENCY_IMPLEMENTATION_COMPLETE.md`](../API_CONSISTENCY_IMPLEMENTATION_COMPLETE.md) (repository root).

**This document:** Technical reference for endpoint alignment history and per-area status. Section headers below may still show follow-ups where a subsystem is not fully aligned.

**Last Updated:** 2026-03-21

## Summary

The mobile client references several endpoints that either don't exist, are disabled, or have different paths on the backend. This document tracks all inconsistencies and their resolution status.

---

## Critical Inconsistencies (Blocking Functionality)

### 1. Open Banking Routes ✅ **ADDRESSED** (2026-03-21)

**What was wrong:**
- OBS was commented out in `index.ts` and relied on a Prisma shim that threw at runtime.
- Path expectations differed between mobile (`/api/v1/obs/*`) and ad-hoc `/api/obs/*` usage.

**What we did:**
- Added `migrations/011_obs_open_banking.sql`: mobile `obs_consents` / `data_providers` / audit / PKCE / payment initiations, plus TPP OAuth tables `obs_oauth_consents` and `obs_oauth_access_tokens` (and AIS/PIS/bon support tables).
- Replaced Prisma usage in `src/services/obs/*` with `pg` / `pool` queries (same pattern as `routes/mobile/*.ts`).
- Mounted combined router at **`/api/v1/obs`** and **`/api/obs`** (same router) in `src/index.ts`.
- Bon (OBS URI) API lives under **`/api/v1/obs/bon/*`** (file: `src/routes/obsBon.ts`).
- Mobile consent review and Vercel redirect updated to versioned paths; integration tests use `/api/v1/obs/*`.

**Canonical paths:**
- Mobile proxy: `/api/v1/obs/consents`, `/api/v1/obs/ais/*`, `/api/v1/obs/pis/*`, `/api/v1/obs/providers`
- SCA HTML helpers: `/api/v1/obs/v1/authorize`, `/api/v1/obs/v1/authorize/confirm`
- Mock bank: `/api/v1/obs/mock/*`

**Status:** ✅ **IMPLEMENTED** — run `npm run migrate` after deploy; see `docs/OBS_ROUTES.md` in smartpay-backend for curl examples.

---

### 2. Location Services Mismatch ❌ **BLOCKING**

**Problem:**
Mobile client calls specific location endpoints that don't exist on backend.

**Mobile Client References:**
```typescript
// services/locationService.ts
const atmUrl = `${API_BASE}/api/v1/atms/nearby`;
const nampostUrl = `${API_BASE}/api/v1/locations/nampost`;
```

**Backend Reality:**
```typescript
// src/routes/v1/agents.ts - Unified endpoint
router.get('/api/v1/agents/nearest', async (req, res) => {
  // Query params: ?type=atm|nampost|bank&service=...
});
```

**Impact:** Medium - Location features broken

**Resolution:**
**Option A (Recommended):** Add alias routes
```typescript
// src/routes/v1/agents.ts
router.get('/api/v1/atms/nearby', (req, res, next) => {
  req.query.type = 'atm';
  return nearestAgentsHandler(req, res, next);
});

router.get('/api/v1/locations/nampost', (req, res, next) => {
  req.query.type = 'nampost';
  return nearestAgentsHandler(req, res, next);
});
```

**Option B:** Update mobile client
```typescript
// Use unified endpoint with query params
const url = `${API_BASE}/api/v1/agents/nearest?type=atm`;
```

**Status:** 🔄 **PENDING IMPLEMENTATION**

---

### 3. Transaction Summary Endpoint ❌ **BLOCKING**

**Problem:**
Mobile client and copilot tools reference a summary endpoint that doesn't exist.

**Mobile Client References:**
```typescript
// __tests__/integration/real-endpoints.test.ts
const summary = await fetch(`${BASE_URL}/api/v1/transactions/summary`);

// copilotTools.ts
const summaryResponse = await fetch(
  `${BACKEND_URL}/api/v1/transactions/summary`,
  ...
);
```

**Backend Reality:**
```typescript
// src/routes/mobile/transactions.ts - Only list and by-id
router.get('/api/v1/transactions', ...);      // List
router.get('/api/v1/transactions/:id', ...);   // By ID
// No /summary endpoint!
```

**Impact:** Medium - Summary features broken

**Resolution:**
Implement the missing endpoint:
```typescript
// src/routes/mobile/transactions.ts
router.get('/api/v1/transactions/summary', requireAuth, async (req, res) => {
  try {
    const { userId } = req.auth!;
    const result = await sql`
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM transactions
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '30 days'
    `;
    res.json(result[0]);
  } catch (error) {
    logger.error('Transaction summary failed:', error);
    res.status(500).json({ error: 'Failed to fetch transaction summary' });
  }
});
```

**Status:** 🔄 **PENDING IMPLEMENTATION**

---

### 4. Cash-Out QR Endpoint ❌ **BLOCKING**

**Problem:**
Copilot tools reference a QR endpoint for cash-out that doesn't exist.

**Mobile Client References:**
```typescript
// copilotTools.ts
const qrResponse = await fetch(
  `${BACKEND_URL}/api/v1/cash-out/qr`,
  {
    method: 'POST',
    body: JSON.stringify({ amount, method: 'qr' })
  }
);
```

**Backend Reality:**
```typescript
// src/routes/mobile/cashOut.ts - Available methods
router.post('/api/v1/cash-out/bank', ...);
router.post('/api/v1/cash-out/till', ...);
router.post('/api/v1/cash-out/agent', ...);
router.post('/api/v1/cash-out/merchant', ...);
router.post('/api/v1/cash-out/atm', ...);
// No /qr endpoint!
```

**Impact:** Low - QR feature not implemented yet

**Resolution Options:**
1. **Option A:** Implement QR cash-out endpoint
2. **Option B:** Remove from copilot tools

**Status:** 🔄 **PENDING DECISION** (Feature may not be needed)

---

## Medium Priority Inconsistencies

### 5. Analytics QR Tracking ⚠️

**Problem:**
```typescript
// services/receive.ts
await fetch(`${API_BASE}/api/v1/analytics/qr-generated`, ...);
```

**Backend:** No matching route

**Impact:** Low - Analytics feature

**Resolution:** Implement or remove from mobile

---

### 6. Open Banking Disconnect/Sync ⚠️

**Problem:**
```typescript
// services/openBanking.ts
await fetch(`${API_BASE}/api/v1/banking/disconnect`, ...);
await fetch(`${API_BASE}/api/v1/banking/sync`, ...);
```

**Backend:** No matching routes

**Impact:** Low - Banking management

**Resolution:** Implement or remove from mobile

---

### 7. User PIN Endpoints ⚠️

**Problem:**
```typescript
// services/twoFactorAuth.ts
await fetch(`${API_BASE}/api/v1/users/pin`, ...);
await fetch(`${API_API_BASE}/api/v1/users/verify-pin`, ...);
```

**Backend Reality:**
- Routes defined in `src/routes/users.ts` but **NOT MOUNTED** in `index.ts`
- Current mounted routes use `/api/v1/user/...` (singular) for profile

**Impact:** Medium - 2FA features may be broken

**Resolution:**
1. Mount `routes/users.ts` at `/api/v1/users`
2. OR move PIN endpoints to mounted routes

---

## API Versioning Inconsistencies

### 8. Dual Auth Namespaces ⚠️ **CONFUSING**

**Problem:**
Two different "auth" prefixes serving different purposes:

```typescript
// Mobile OTP authentication
POST /api/v1/auth/request-otp
POST /api/v1/auth/verify-otp

// Security module (PSD-12)
POST /api/auth/verify-2fa-session
POST /api/auth/verify-totp
POST /api/fraud/check-payment
```

**Impact:** Medium - Confusion, potential routing conflicts

**Resolution:**
Rename security module routes:
```typescript
// Option A: /api/security/*
POST /api/security/verify-2fa-session
POST /api/security/verify-totp

// Option B: /api/v1/security/*
POST /api/v1/security/2fa/verify-session
POST /api/v1/security/totp/verify
```

---

### 9. Copilot Dual Surfaces ⚠️

**Problem:**
Two copilot endpoints on different services:

```typescript
// Node.js backend
POST /api/copilot              // JWT auth
GET /api/copilot/health

// Python AI service (port 8000)
POST /api/smartpay-copilot/chat    // Optional auth
POST /api/smartpay-copilot/chat/stream
```

**Impact:** Low - Acceptable if documented

**Resolution:**
Document in OpenAPI:
- Node: Legacy copilot proxy
- Python: Primary AI copilot service

---

## Implementation Priority

### Sprint 1 (Critical - Week 1-2)
1. ✅ Fix Open Banking path mismatch
2. ✅ Add location service aliases OR update mobile
3. ✅ Implement transaction summary endpoint
4. ✅ Mount or remove user PIN routes

### Sprint 2 (Important - Week 3-4)
5. Implement or remove QR cash-out
6. Implement or remove analytics endpoints
7. Implement or remove banking disconnect/sync
8. Standardize auth namespaces

### Sprint 3 (Documentation - Week 5-6)
9. Update OpenAPI specs
10. Update mobile client to match reality
11. Add integration tests for new routes
12. Document versioning strategy

---

## Testing Strategy

### For Each Fixed Endpoint

1. **Unit Test:**
   ```typescript
   describe('GET /api/v1/transactions/summary', () => {
     it('should return summary for authenticated user', async () => {
       const response = await request(app)
         .get('/api/v1/transactions/summary')
         .set('Authorization', `Bearer ${validToken}`);
       
       expect(response.status).toBe(200);
       expect(response.body).toHaveProperty('total_count');
       expect(response.body).toHaveProperty('total_amount');
     });
   });
   ```

2. **Integration Test:**
   ```typescript
   it('mobile client can fetch transaction summary', async () => {
     const summary = await transactionService.getSummary();
     expect(summary).toBeDefined();
   });
   ```

3. **E2E Test:**
   - Mobile app flow testing
   - Copilot tool validation

---

## Validation Checklist

Before marking any inconsistency as resolved:

- [ ] Backend endpoint implemented and tested
- [ ] Mobile client updated (if needed)
- [ ] Integration tests passing
- [ ] OpenAPI spec updated
- [ ] Documentation updated
- [ ] No 404s in production logs for this endpoint

---

## Monitoring

### Metrics to Track Post-Fix

1. **404 Rate:** Should drop for fixed endpoints
2. **Mobile App Errors:** Should decrease
3. **Copilot Success Rate:** Should improve
4. **API Response Times:** Should remain stable

### Alerts to Add

```typescript
// Alert on 404s for known paths
if (status === 404 && KNOWN_PATHS.includes(path)) {
  logger.error('404 on known path - endpoint may be missing', { path });
  // Trigger alert
}
```

---

## References

- [API consistency implementation complete](../API_CONSISTENCY_IMPLEMENTATION_COMPLETE.md)
- [Ecosystem API consistency report (Phase 1)](../ECOSYSTEM_API_CONSISTENCY_REPORT.md)
- [Mobile Services Code](/apps/smartpay-mobile/services/)
- [Backend Routes Code](/apps/smartpay-backend/src/routes/)
- [Integration Tests](/apps/smartpay-mobile/__tests__/integration/)
- [API Versioning Strategy](../API_VERSIONING_STRATEGY.md)

---

**Next Update:** After Sprint 1 completion
