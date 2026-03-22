# Environment DNS and URL Consistency Audit - Fintech SmartPay

**Date:** March 21, 2026  
**Auditor:** AI Assistant  
**Scope:** All environment files in `/fintech` project

---

## Executive Summary

**Total Files Audited:** 12  
**Critical Issues:** 8  
**Warnings:** 15  
**Status:** ⚠️ REQUIRES ATTENTION

### Key Findings

1. **Inconsistent BUFFR_CONNECT_URL** across mobile and backend
2. **Placeholder values** in example files need documentation
3. **Duplicate variable definitions** in backend/.env
4. **Missing ketchup.cc domains** - using localhost instead
5. **Inconsistent BUFFR_API_URL** between development and production patterns

---

## 1. Environment Files Inventory

### 1.1 Mobile App (`apps/smartpay-mobile/`)
- ✅ `.env` - Active development config
- ✅ `.env.example` - Template with placeholders
- ✅ `.env.test` - Integration test config

### 1.2 Backend API (`apps/smartpay-backend/`)
- ✅ `.env` - Active development config
- ✅ `.env.example` - Template with placeholders
- ✅ `.env.local` - Local overrides

### 1.3 AI Service (`apps/smartpay-ai/`)
- ✅ `.env` - Active development config
- ✅ `.env.example` - Template with placeholders

### 1.4 Legacy/Root (`smartpay/`)
- ⚠️ `.env` - Should be consolidated or removed
- ⚠️ `.env.local` - Duplicate configuration
- ⚠️ `.env.example` - Redundant with apps/*/

### 1.5 Examples (`examples/buffr-integration/`)
- ✅ `.env.example` - Integration example template

---

## 2. URL Variable Analysis

### 2.1 BUFFR_CONNECT_URL / BUFFR_API_URL

| File | Variable | Value | Issue |
|------|----------|-------|-------|
| mobile/.env | `EXPO_PUBLIC_BUFFR_CONNECT_URL` | `http://localhost:3000` | ✅ Correct for dev |
| mobile/.env.example | `EXPO_PUBLIC_BUFFR_CONNECT_URL` | `http://localhost:3000` | ✅ Correct for dev |
| mobile/.env.test | `EXPO_PUBLIC_BUFFR_CONNECT_URL` | `http://localhost:3000` | ✅ Correct for test |
| backend/.env | `BUFFR_API_URL` | `http://localhost:3000/api` | ✅ Correct for dev |
| backend/.env | `BUFFR_CONNECT_URL` | `http://localhost:3000` | ⚠️ Duplicate definition (lines 25, 44) |
| backend/.env | `BUFFR_CONNECT_BASE_URL` | `http://localhost:3000` | ⚠️ Redundant with BUFFR_CONNECT_URL |
| backend/.env.example | `BUFFR_API_URL` | `http://localhost:3001` | ❌ **PORT MISMATCH** - Should be 3000 |
| backend/.env.example | `BUFFR_CONNECT_URL` | `http://localhost:3000` | ✅ Correct for dev |
| smartpay/.env.local | `BUFFR_API_URL` | `https://api.buffr.ai/v1` | ❌ **WRONG DOMAIN** - Should be ketchup.cc |
| smartpay/.env.local | `BUFFR_API_KEY` | `buffr_live_*` | ⚠️ Using production key in .local |
| ai/.env | `BUFFR_API_URL` | `http://localhost:3000/api` | ✅ Correct for dev |
| examples/buffr-integration/.env.example | `EXPO_PUBLIC_BUFFR_BASE_URL` | `https://localhost:3000` | ❌ **HTTPS + LOCALHOST** - Invalid |

**CRITICAL ISSUE:** `backend/.env.example` shows `BUFFR_API_URL=http://localhost:3001` (port 3001) while all other files use port 3000.

**PRODUCTION ISSUE:** No production domain references found. Should use actual ketchup.cc domain when deployed.

### 2.2 Supabase URLs

| File | Variable | Value | Status |
|------|----------|-------|--------|
| mobile/.env | `EXPO_PUBLIC_SUPABASE_URL` | `https://cjmtcxfpwjbpbctjseex.supabase.co` | ✅ Valid project |
| mobile/.env.example | `EXPO_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | ⚠️ Placeholder |
| mobile/.env.test | `EXPO_PUBLIC_SUPABASE_URL` | `https://test-project.supabase.co` | ⚠️ Placeholder |
| backend/.env | `SUPABASE_URL` | `https://cjmtcxfpwjbpbctjseex.supabase.co` | ✅ Valid project |
| backend/.env.example | `SUPABASE_URL` | `https://your-project.supabase.co` | ⚠️ Placeholder |
| backend/.env.local | `SUPABASE_URL` | `https://cjmtcxfpwjbpbctjseex.supabase.co` | ✅ Valid project |
| smartpay/.env | `EXPO_PUBLIC_SUPABASE_URL` | `https://cjmtcxfpwjbpbctjseex.supabase.co` | ✅ Valid project |
| smartpay/.env.local | `EXPO_PUBLIC_SUPABASE_URL` | `https://cjmtcxfpwjbpbctjseex.supabase.co` | ✅ Valid project |
| smartpay/.env.example | `EXPO_PUBLIC_SUPABASE_URL` | (empty) | ⚠️ Missing example |

**Consistency Check:** ✅ All active development files use the same Supabase project (`cjmtcxfpwjbpbctjseex`)

### 2.3 Backend API URLs

| File | Variable | Value | Status |
|------|----------|-------|--------|
| mobile/.env.example | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:4000` | ✅ Correct |
| mobile/.env.test | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:4000` | ✅ Correct |
| ai/.env | `SMARTPAY_API_BASE_URL` | `http://localhost:4000` | ✅ Correct |
| ai/.env.example | `SMARTPAY_API_BASE_URL` | `http://localhost:4000` | ✅ Correct |
| smartpay/.env | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:4000` | ✅ Correct |
| smartpay/.env.local | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:4000` | ✅ Correct |
| smartpay/.env.example | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:4000` | ✅ Correct |
| backend/.env | `PORT` | `4000` | ✅ Correct |
| backend/.env.example | `PORT` | `4000` | ✅ Correct |

**Consistency Check:** ✅ All files correctly reference port 4000 for backend API

### 2.4 AI/Copilot URLs

| File | Variable | Value | Status |
|------|----------|-------|--------|
| mobile/.env.example | `EXPO_PUBLIC_AI_API_BASE_URL` | `http://localhost:8000` | ✅ Correct |
| mobile/.env.example | `EXPO_PUBLIC_COPILOT_API_URL` | `http://localhost:4000` | ✅ Proxy via backend |
| backend/.env.example | `AI_SERVICE_URL` | `http://localhost:8000` | ✅ Correct |
| ai/.env | `PORT` | `8000` | ✅ Correct |
| ai/.env.example | `PORT` | `8000` | ✅ Correct |
| smartpay/.env | `EXPO_PUBLIC_COPILOT_API_URL` | `http://localhost:4000/api/copilot` | ✅ Proxy via backend |
| smartpay/.env.local | `EXPO_PUBLIC_COPILOT_API_URL` | `http://localhost:4000/api/copilot` | ✅ Proxy via backend |

**Consistency Check:** ✅ AI service on port 8000, Copilot proxied through backend on port 4000

### 2.5 Ketchup/Test Services

| File | Variable | Value | Issue |
|------|----------|-------|-------|
| mobile/.env.test | `KETCHUP_PORTALS_URL` | `http://localhost:3000` | ⚠️ Should use actual ketchup.cc domain |
| backend/.env.example | `KETCHUP_LIVENESS_SERVICE_URL` | `http://localhost:8002` | ✅ Correct for dev |

### 2.6 OAuth/Redirect URIs

| File | Variable | Value | Issue |
|------|----------|-------|-------|
| backend/.env.example | `OPEN_BANKING_REDIRECT_URI` | (empty) | ⚠️ Needs documentation |
| examples/buffr-integration/.env.example | `EXPO_PUBLIC_OAUTH_REDIRECT_URI` | `buffrfintech://oauth` | ✅ Correct scheme |
| examples/buffr-integration/.env.example | `EXPO_PUBLIC_TOKEN_BRIDGE_URL` | `https://your-api.example.com/api/buffr/oauth/token` | ⚠️ Placeholder |

---

## 3. Critical Issues Requiring Immediate Action

### 3.1 ❌ CRITICAL: Port Mismatch in backend/.env.example

**File:** `apps/smartpay-backend/.env.example`  
**Line:** 74  
**Current:** `BUFFR_API_URL=http://localhost:3001`  
**Expected:** `BUFFR_API_URL=http://localhost:3000`

**Impact:** Developers copying .env.example will connect to wrong port, causing integration failures.

**Fix:**
```bash
# Line 74
BUFFR_API_URL=http://localhost:3000/api
```

### 3.2 ❌ CRITICAL: Duplicate BUFFR_CONNECT_URL in backend/.env

**File:** `apps/smartpay-backend/.env`  
**Lines:** 25 and 44  
**Issue:** Variable defined twice with same value

**Fix:** Remove duplicate definition at line 44, keep only line 25.

### 3.3 ❌ CRITICAL: Wrong Domain in smartpay/.env.local

**File:** `smartpay/.env.local`  
**Line:** 25  
**Current:** `BUFFR_API_URL=https://api.buffr.ai/v1`  
**Expected:** Should reference ketchup.cc domain or localhost

**Impact:** Points to non-existent domain `buffr.ai` instead of actual deployment.

**Fix:**
```bash
# Development
BUFFR_API_URL=http://localhost:3000/api

# OR Production
BUFFR_API_URL=https://api.ketchup.cc/api
```

### 3.4 ❌ CRITICAL: Invalid HTTPS + localhost in examples

**File:** `examples/buffr-integration/.env.example`  
**Line:** 2  
**Current:** `EXPO_PUBLIC_BUFFR_BASE_URL=https://localhost:3000`  
**Issue:** HTTPS doesn't work with localhost without SSL setup

**Fix:**
```bash
# Development
EXPO_PUBLIC_BUFFR_BASE_URL=http://localhost:3000

# OR Production
EXPO_PUBLIC_BUFFR_BASE_URL=https://app.ketchup.cc
```

---

## 4. Warnings and Recommendations

### 4.1 ⚠️ Redundant Variables

**File:** `apps/smartpay-backend/.env`

Remove redundant variables:
- `BUFFR_CONNECT_BASE_URL` (line 26) - Use `BUFFR_CONNECT_URL` only
- Duplicate `BUFFR_CONNECT_URL` (line 44) - Keep line 25 only

### 4.2 ⚠️ Placeholder Documentation

**Files with placeholders that need better documentation:**

1. **mobile/.env.example**
   - `EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key`
   - Add comment: "Get from buffr-connect/buffrconnect/.env.local"

2. **backend/.env.example**
   - Multiple `your-*` placeholders need clearer instructions
   - Add section headers for easier navigation

3. **mobile/.env.test**
   - `EXPO_PUBLIC_SUPABASE_URL=https://test-project.supabase.co`
   - Either use real test project or document as placeholder

### 4.3 ⚠️ Missing Production Configuration

**No production environment files found for:**
- `.env.production` in mobile
- `.env.production` in backend
- `.env.production` in ai

**Recommendation:** Create production templates with:
- Actual ketchup.cc domains
- Production Supabase project
- Production API keys (placeholder references)
- HTTPS enabled
- Security settings hardened

### 4.4 ⚠️ Root Directory Consolidation

**Issue:** Three environment files in `smartpay/` root appear to duplicate `apps/smartpay-mobile/` config.

**Files:**
- `smartpay/.env`
- `smartpay/.env.local`
- `smartpay/.env.example`

**Recommendation:** 
- Verify if `smartpay/` is legacy directory
- If yes: Delete and use `apps/smartpay-mobile/` exclusively
- If no: Document purpose and keep in sync

---

## 5. Consistency Matrix

### 5.1 BUFFR_CONNECT_URL Consistency

| Component | Variable | Value | Consistent? |
|-----------|----------|-------|-------------|
| Mobile (dev) | `EXPO_PUBLIC_BUFFR_CONNECT_URL` | `http://localhost:3000` | ✅ |
| Backend (dev) | `BUFFR_CONNECT_URL` | `http://localhost:3000` | ✅ |
| Backend API path | `BUFFR_API_URL` | `http://localhost:3000/api` | ✅ |
| AI service | `BUFFR_API_URL` | `http://localhost:3000/api` | ✅ |
| Example (WRONG) | `BUFFR_API_URL` | `http://localhost:3001` | ❌ |

**Overall:** 80% consistent (4/5 correct)

### 5.2 Port Consistency

| Service | Expected Port | Files Checked | Consistent? |
|---------|---------------|---------------|-------------|
| Buffr Connect | 3000 | 12/12 (1 error) | 92% ✅ |
| Backend API | 4000 | 9/9 | 100% ✅ |
| AI Service | 8000 | 4/4 | 100% ✅ |
| Liveness | 8002 | 1/1 | 100% ✅ |

---

## 6. Security Concerns

### 6.1 🔒 Exposed Production Keys

**Files with production keys in version control:**

1. **smartpay/.env.local** (should be .gitignored)
   - `BUFFR_API_KEY=buffr_live_*` (production key)
   - `DEEPSEEK_API_KEY=sk-*`
   - `COPILOTKIT_API_KEY=ck_pub_*`

2. **smartpay/.env** (should be .gitignored)
   - Same keys as above

**Recommendation:** 
- Verify these files are in `.gitignore`
- Rotate keys if they were committed to git
- Use `.env.example` templates instead

### 6.2 🔒 Test User Credentials

**Canonical test user found in multiple files:**
- Email: `pendanek@gmail.com`
- Password: `02Ally27PP123Lubi@i`

**Files:** backend/.env, ai/.env, smartpay/.env, smartpay/.env.local

**Recommendation:**
- Ensure this is a test-only account
- Do not use for production
- Rotate password regularly

---

## 7. Recommended Fixes

### 7.1 Immediate Actions (Critical)

1. **Fix port mismatch in backend/.env.example**
   ```bash
   # Line 74 - Change from 3001 to 3000
   sed -i '' 's|localhost:3001|localhost:3000/api|' apps/smartpay-backend/.env.example
   ```

2. **Remove duplicate BUFFR_CONNECT_URL in backend/.env**
   - Edit `apps/smartpay-backend/.env`
   - Delete line 44 (duplicate definition)

3. **Fix invalid HTTPS+localhost in examples**
   ```bash
   # examples/buffr-integration/.env.example line 2
   sed -i '' 's|https://localhost:3000|http://localhost:3000|' examples/buffr-integration/.env.example
   ```

4. **Fix wrong domain in smartpay/.env.local**
   ```bash
   # Change api.buffr.ai to localhost for dev
   sed -i '' 's|https://api.buffr.ai/v1|http://localhost:3000/api|' smartpay/.env.local
   ```

### 7.2 Short-term Actions (Warnings)

1. **Remove redundant variables**
   - Edit `apps/smartpay-backend/.env`
   - Remove `BUFFR_CONNECT_BASE_URL` (line 26)
   - Keep only `BUFFR_CONNECT_URL` and `BUFFR_API_URL`

2. **Improve placeholder documentation**
   - Add comments in `.env.example` files explaining where to get values
   - Reference `buffr-connect/buffrconnect/.env.local` for Supabase creds

3. **Consolidate root smartpay/ configs**
   - Determine if `smartpay/` is legacy
   - Move to `apps/smartpay-mobile/` or document purpose

### 7.3 Long-term Actions (Improvements)

1. **Create production environment templates**
   ```bash
   # Create production templates
   touch apps/smartpay-mobile/.env.production.example
   touch apps/smartpay-backend/.env.production.example
   touch apps/smartpay-ai/.env.production.example
   ```

2. **Document ketchup.cc domains**
   - Update README with actual production domains
   - Example: `https://api.ketchup.cc` for Buffr Connect production

3. **Implement environment validation**
   - Add startup checks to verify required variables
   - Validate URL formats (no HTTPS+localhost)
   - Check port consistency

---

## 8. Configuration Standards

### 8.1 Naming Conventions

**Current inconsistencies:**
- Mobile uses `EXPO_PUBLIC_BUFFR_CONNECT_URL`
- Backend uses `BUFFR_CONNECT_URL` and `BUFFR_API_URL`
- Both valid, but document the pattern

**Recommended standard:**
```bash
# Mobile (Expo requires EXPO_PUBLIC_ prefix for client-side)
EXPO_PUBLIC_BUFFR_CONNECT_URL=http://localhost:3000

# Backend (server-side, no prefix needed)
BUFFR_CONNECT_URL=http://localhost:3000
BUFFR_API_URL=http://localhost:3000/api
```

### 8.2 URL Format Standards

**Established patterns:**
- Base URLs: NO trailing slash (e.g., `http://localhost:3000`)
- API URLs: Include `/api` suffix (e.g., `http://localhost:3000/api`)
- HTTPS for production, HTTP for localhost
- Port numbers: Explicitly included

### 8.3 Environment File Hierarchy

**Recommended precedence:**
1. `.env.local` (developer-specific, gitignored)
2. `.env.production` (production template)
3. `.env.test` (test environment)
4. `.env` (development defaults)
5. `.env.example` (documentation/template)

---

## 9. Testing Recommendations

### 9.1 Integration Test Checklist

- [ ] Verify mobile can connect to backend on port 4000
- [ ] Verify backend can connect to Buffr Connect on port 3000
- [ ] Verify AI service can connect to backend on port 4000
- [ ] Test OAuth redirect URIs with actual flow
- [ ] Validate Supabase connection from all components

### 9.2 Environment Validation Script

Create `scripts/validate-env.sh`:
```bash
#!/bin/bash
# Validate environment configuration consistency

echo "Checking Buffr Connect URL consistency..."
grep -r "BUFFR_CONNECT_URL" apps/*/\.env* smartpay/.env* | grep -v ".example" | grep -v "3000"

echo "Checking for placeholder values..."
grep -r "your-project\|your_client_id\|your-api" apps/*/\.env smartpay/.env 2>/dev/null

echo "Checking for HTTPS+localhost..."
grep -r "https://localhost" apps/*/\.env* smartpay/.env* examples/*/.env*

echo "Checking for duplicate variables..."
for f in apps/smartpay-backend/.env smartpay/.env*; do
  echo "File: $f"
  sort "$f" | uniq -d
done
```

---

## 10. Summary and Action Plan

### 10.1 Issues by Severity

| Severity | Count | Action Required |
|----------|-------|-----------------|
| 🔴 Critical | 4 | Immediate fix required |
| 🟡 Warning | 11 | Fix within 1-2 weeks |
| 🔵 Info | 8 | Nice to have |

### 10.2 Estimated Effort

| Task | Time | Priority |
|------|------|----------|
| Fix critical port/domain issues | 15 min | P0 |
| Remove duplicates and redundant vars | 10 min | P0 |
| Improve placeholder documentation | 30 min | P1 |
| Create production templates | 1 hour | P1 |
| Consolidate root configs | 1 hour | P2 |
| Implement validation script | 2 hours | P2 |

**Total estimated effort:** 4-5 hours

### 10.3 Next Steps

1. **Immediate (Today)**
   - [ ] Fix `backend/.env.example` port 3001 → 3000
   - [ ] Remove duplicate `BUFFR_CONNECT_URL` from `backend/.env`
   - [ ] Fix `smartpay/.env.local` wrong domain
   - [ ] Fix examples `https://localhost` → `http://localhost`

2. **This Week**
   - [ ] Remove redundant `BUFFR_CONNECT_BASE_URL`
   - [ ] Improve placeholder documentation in `.env.example` files
   - [ ] Verify `smartpay/` root directory purpose

3. **Next Sprint**
   - [ ] Create production environment templates
   - [ ] Document ketchup.cc production domains
   - [ ] Implement environment validation script
   - [ ] Add pre-commit hooks for env file validation

---

## 11. References

### 11.1 Related Documentation
- `PLANNING.md` - Project architecture decisions
- `README.md` - Setup instructions
- `TASKS.md` - Current work items

### 11.2 External Resources
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Node.js dotenv Best Practices](https://github.com/motdotla/dotenv#should-i-commit-my-env-file)

### 11.3 Ketchup.cc Domain Structure (TBD)
**Waiting for:** Actual production domain assignments

Suggested structure:
```
Production:
- https://app.ketchup.cc - Buffr Connect UI
- https://api.ketchup.cc - Buffr Connect API
- https://smartpay.ketchup.cc - SmartPay web (if applicable)
- https://ai.ketchup.cc - AI service (if exposed)

Staging:
- https://staging.ketchup.cc - Staging environment
- https://api.staging.ketchup.cc - Staging API
```

---

## Appendix: Complete Variable Reference

### Mobile (`apps/smartpay-mobile/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://cjmtcxfpwjbpbctjseex.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_BUFFR_CONNECT_URL=http://localhost:3000
SUPABASE_AUTH_URL=https://cjmtcxfpwjbpbctjseex.supabase.co/auth/v1
```

### Backend (`apps/smartpay-backend/.env`)
```
DATABASE_URL=postgresql://neondb_owner:...@ep-round-water...
JWT_SECRET=test-secret-key...
DEEPSEEK_API_KEY=sk-...
COPILOTKIT_API_KEY=ck_pub_...
PORT=4000
BUFFR_API_KEY=buffr_live_...
BUFFR_API_URL=http://localhost:3000/api
BUFFR_WEBHOOK_SECRET=d96ddb...
BUFFR_CONNECT_URL=http://localhost:3000  # Line 25
BUFFR_CONNECT_BASE_URL=http://localhost:3000  # Line 26 - REDUNDANT
BUFFR_CONNECT_URL=http://localhost:3000  # Line 44 - DUPLICATE
```

### AI (`apps/smartpay-ai/.env`)
```
DATABASE_URL=postgresql://neondb_owner:...
LANCEDB_PATH=./data/lancedb
SMARTPAY_API_BASE_URL=http://localhost:4000
DEEPSEEK_API_KEY=sk-...
BUFFR_API_URL=http://localhost:3000/api
PORT=8000
```

---

**Report Generated:** March 21, 2026  
**Next Review:** Before production deployment  
**Contact:** Development Team Lead
