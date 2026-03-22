# Documentation Fixes Checklist

**Created:** March 22, 2026  
**Purpose:** Track immediate documentation fixes  
**Owner:** Engineering Team

---

## 🚨 P0 - Critical (This Week)

### [ ] 1. Fix PLANNING.md False Claims (4-6 hours)

**Issues Found:**
- [ ] Line 73: Claims "Empty LanceDB" - INCORRECT
  - Reality: `data/lancedb/knowledge_base.lance/` exists
  - Reality: `apps/smartpay-ai/data/lancedb/` exists
  - **Action:** Update to reflect actual LanceDB status
  
- [ ] Test Coverage Claims - UNVERIFIED
  - Claims "96% test coverage" - NO REPORTS FOUND
  - **Action:** Run coverage, document actual numbers
  
- [ ] Line 1367: Claims "313 tests" AND "581 tests" - CONTRADICTORY
  - **Action:** Count actual tests, update with correct number
  
- [ ] References to removed sandbox code
  - **Action:** Remove all sandbox references
  
- [ ] References to "CopilotKit" (should be "AG-UI")
  - **Action:** Find/replace CopilotKit → AG-UI

**Commands to Run:**
```bash
# Count actual test files
find fintech -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "test_*.py" | grep -v node_modules | wc -l

# Run test coverage (backend)
cd apps/smartpay-backend && npm run test:coverage

# Run test coverage (mobile)
cd apps/smartpay-mobile && npm run test:coverage

# Run test coverage (python)
cd apps/smartpay-ai && pytest --cov=smartpay_ai --cov-report=html
```

**Deliverable:** Accurate PLANNING.md with verified claims

---

### [ ] 2. Fix Broken Documentation Links (2-4 hours)

**Option A: Create Stub Files (Recommended for Quick Fix)**
```bash
# Create stub files for all missing guides
touch docs/guides/getting-started/backend-setup.md
touch docs/guides/getting-started/security-setup.md
touch docs/guides/api/nodejs-auth.md
touch docs/guides/api/nodejs-wallets.md
touch docs/guides/api/nodejs-transactions.md
touch docs/guides/api/nodejs-kyc.md
touch docs/guides/api/python-ml.md
touch docs/guides/api/python-analytics.md
# ... (see full list in audit report)
```

Each stub file should contain:
```markdown
# [Title]

**Status:** 🚧 Under Construction  
**Priority:** P1  
**Estimated Completion:** [Date]

## Overview

This guide is currently being written. Check back soon!

## What Will Be Covered

- [Topic 1]
- [Topic 2]
- [Topic 3]

## Temporary Resources

- See [related-doc.md] for similar information
- Contact: [team-member] for questions

---

**Last Updated:** [Date]  
**Next Review:** [Date]
```

**Option B: Remove References (Alternative)**
- Edit `docs/README.md` to remove all broken links
- Add "Coming Soon" section for planned documentation

**Deliverable:** No broken links in documentation

---

### [ ] 3. Handle MONOREPO_MIGRATION_PLAN.md (4-8 hours)

**Decision Required:** Create or Remove?

**Option A: Create the Document**
- [ ] Create file: `MONOREPO_MIGRATION_PLAN.md`
- [ ] Document current structure
- [ ] Document target structure
- [ ] Create migration steps
- [ ] Add rollback procedures
- [ ] Set timeline

**Option B: Remove All References**
- [ ] Search for all references: `rg -i "MONOREPO_MIGRATION_PLAN" .`
- [ ] Remove or update 12+ references
- [ ] Update README.md
- [ ] Update PLANNING.md
- [ ] Update docs/README.md

**Deliverable:** Either complete MONOREPO_MIGRATION_PLAN.md OR no broken references

---

### [ ] 4. Generate OpenAPI Specification (8-16 hours)

**Steps:**

1. **Install Dependencies**
```bash
cd apps/smartpay-backend
npm install --save-dev swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
```

2. **Create OpenAPI Config**
```bash
touch swagger.config.ts
```

3. **Annotate Routes**
- Add JSDoc comments to all API routes
- Document request/response schemas
- Add authentication requirements
- Document error responses

4. **Generate Specification**
```bash
npm run swagger:generate
```

5. **Set Up Swagger UI**
- Add Swagger UI endpoint
- Configure authentication
- Test all endpoints

6. **Commit Files**
```bash
git add openapi.yaml swagger.config.ts
git commit -m "docs: Add OpenAPI specification and Swagger UI"
```

**Deliverable:** `openapi.yaml` + Swagger UI at `/api-docs`

---

### [ ] 5. Create Deployment Guides (16-24 hours)

**Files to Create:**

- [ ] `docs/guides/deployment/mobile-build.md` (3 hours)
  - iOS build process
  - Android build process
  - App Store submission
  - Play Store submission

- [ ] `docs/guides/deployment/backend-deploy.md` (2 hours)
  - Vercel configuration
  - Environment variables
  - Database connection
  - Testing deployment

- [ ] `docs/guides/deployment/python-deploy.md` (2 hours)
  - Railway configuration
  - Python dependencies
  - Environment setup
  - Health checks

- [ ] `docs/guides/deployment/vercel-config.md` (1.5 hours)
  - vercel.json configuration
  - Environment variables
  - Build settings
  - Domain setup

- [ ] `docs/guides/deployment/railway-config.md` (1.5 hours)
  - Railway.toml configuration
  - Service configuration
  - Volume setup
  - Monitoring

- [ ] `docs/guides/deployment/neon-setup.md` (2 hours)
  - Database provisioning
  - Connection pooling
  - Branching strategy
  - Backup configuration

- [ ] `docs/guides/deployment/monitoring.md` (2 hours)
  - Sentry setup
  - Log aggregation
  - Alert configuration
  - Dashboard setup

- [ ] `docs/guides/deployment/logs.md` (2 hours)
  - Log collection
  - Log analysis
  - Debugging production issues
  - Log retention

**Deliverable:** Complete deployment documentation

---

### [ ] 6. Document Test Coverage (2-4 hours)

**Steps:**

1. **Run Coverage Analysis**
```bash
# Backend
cd apps/smartpay-backend
npm run test:coverage > coverage-backend.txt

# Mobile
cd apps/smartpay-mobile
npm run test:coverage > coverage-mobile.txt

# Python
cd apps/smartpay-ai
pytest --cov=smartpay_ai --cov-report=term --cov-report=html > coverage-python.txt
```

2. **Create Coverage Report**
- [ ] Create `TEST_COVERAGE_REPORT.md`
- [ ] Document actual coverage numbers
- [ ] Create coverage badges
- [ ] Set coverage thresholds
- [ ] Document uncovered areas

3. **Update Documentation**
- [ ] Update PLANNING.md with actual coverage
- [ ] Update PRD with actual coverage
- [ ] Remove false "96%" claim
- [ ] Add link to coverage report

**Deliverable:** Accurate test coverage documentation

---

## 📋 P1 - High Priority (Weeks 2-3)

### [ ] 7. Create Database Documentation (8-12 hours)

- [ ] Generate ER diagrams using dbdiagram.io or similar
- [ ] Document each table's purpose
- [ ] Create migration guide
- [ ] Document backup/restore procedures
- [ ] Create `docs/guides/reference/database-schema.md`

---

### [ ] 8. Create Architecture Diagrams (12-16 hours)

- [ ] System architecture diagram (draw.io or similar)
- [ ] Data flow diagrams
- [ ] Sequence diagrams:
  - [ ] Authentication flow
  - [ ] Transaction flow
  - [ ] Copilot request flow
- [ ] Component diagram
- [ ] Deployment architecture

---

### [ ] 9. Write Missing API Guides (24-32 hours)

Create the following files:
- [ ] `docs/guides/api/nodejs-auth.md`
- [ ] `docs/guides/api/nodejs-wallets.md`
- [ ] `docs/guides/api/nodejs-transactions.md`
- [ ] `docs/guides/api/nodejs-kyc.md`
- [ ] `docs/guides/api/python-ml.md`
- [ ] `docs/guides/api/python-analytics.md`

Each guide should include:
- Overview
- Authentication
- Endpoints
- Request/response examples
- Error codes
- Rate limits
- Code examples

---

### [ ] 10. Write Setup Guides (20-30 hours)

- [ ] `docs/guides/getting-started/backend-setup.md`
- [ ] `docs/guides/getting-started/security-setup.md`
- [ ] `docs/guides/development/backend-setup.md`
- [ ] `docs/guides/development/git-workflow.md`
- [ ] `docs/guides/development/code-review.md`
- [ ] `docs/guides/development/testing.md`
- [ ] `docs/guides/development/debugging.md`
- [ ] `docs/guides/development/typescript-style.md`
- [ ] `docs/guides/development/database-guidelines.md`

---

## 🔄 Documentation Workflow (Establish)

### PR Template Addition

Add to `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Documentation

- [ ] Updated relevant documentation
- [ ] Added/updated code examples
- [ ] Updated API specification (if API changed)
- [ ] No broken links introduced
- [ ] "Last Updated" date updated

**Documentation files changed:**
- 

**Documentation review needed:** Yes / No
```

---

### Documentation Review Checklist

Create `.github/DOC_REVIEW_CHECKLIST.md`:

```markdown
# Documentation Review Checklist

## Accuracy
- [ ] All claims verified
- [ ] Code examples tested
- [ ] Links work
- [ ] Screenshots up-to-date

## Completeness
- [ ] All features documented
- [ ] Error cases covered
- [ ] Examples provided
- [ ] Prerequisites listed

## Quality
- [ ] Clear and concise
- [ ] Proper grammar/spelling
- [ ] Consistent terminology
- [ ] Proper formatting

## Maintenance
- [ ] "Last Updated" date added
- [ ] Related docs linked
- [ ] Deprecated features marked
```

---

## 📊 Progress Tracking

### Week 1 Progress
- [ ] P0 Item 1: PLANNING.md fixed
- [ ] P0 Item 2: Broken links resolved
- [ ] P0 Item 3: MONOREPO plan handled
- [ ] P0 Item 4: OpenAPI spec created
- [ ] P0 Item 5: Deployment guides written
- [ ] P0 Item 6: Test coverage documented

**Target: 6/6 P0 items complete by end of Week 1**

### Week 2-3 Progress
- [ ] P1 Item 7: Database docs created
- [ ] P1 Item 8: Architecture diagrams created
- [ ] P1 Item 9: API guides written
- [ ] P1 Item 10: Setup guides written

**Target: 4/4 P1 items complete by end of Week 3**

---

## 🎯 Success Criteria

### Week 1 Goals
- ✅ Zero false claims in documentation
- ✅ Zero broken links
- ✅ OpenAPI specification exists
- ✅ Can deploy to production using guides
- ✅ Test coverage is documented and accurate

### Week 3 Goals
- ✅ All P0 and P1 items complete
- ✅ Documentation health score: 72 → 85+
- ✅ Developer onboarding: <2 days
- ✅ All critical documentation exists

---

## 📝 Notes

**Team Assignments:**
- P0 Items 1-3: [Developer 1]
- P0 Items 4-6: [Developer 2]
- P1 Items 7-8: [Developer 1]
- P1 Items 9-10: [Developer 2 + Tech Writer]

**Blockers:**
- [ ] None identified yet

**Questions:**
- [ ] Create or remove MONOREPO_MIGRATION_PLAN.md?
- [ ] Create stubs or remove broken links?

---

**Last Updated:** March 22, 2026  
**Next Review:** Daily during Week 1
