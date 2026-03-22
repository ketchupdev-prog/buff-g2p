# Smartpay Documentation

**Complete documentation for the Smartpay fintech platform**

---

## 📍 Quick Navigation

### 🚀 Getting Started (Start Here!)

New to Smartpay? Start with these guides:

- **[Quick Start Overview](guides/getting-started/overview.md)** - 10-minute introduction
- **[Backend Setup Guide](guides/getting-started/backend-setup.md)** - Set up Node.js API
- **[Security Setup Guide](guides/getting-started/security-setup.md)** - Security configuration

**First-Time Setup:**
```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp apps/smartpay-backend/.env.example apps/smartpay-backend/.env
# Edit .env with your values

# 3. Run migrations
cd apps/smartpay-backend && npm run migrate

# 4. Start services
npm run dev:all
```

---

## 🏗️ Architecture

Understand how Smartpay is built:

### System Overview
- **[Node.js Backend Architecture](guides/architecture/backend-nodejs.md)** - Express API design
- **[Python AI Backend Architecture](guides/architecture/backend-python.md)** - FastAPI + LangGraph
- **[Database Architecture](guides/architecture/database.md)** - PostgreSQL schema & migrations
- **[LLM-as-Judge System](guides/architecture/llm-judge.md)** - AI quality & fraud detection

### Technology Stack

**Frontend:**
- React Native (Expo SDK 54)
- TypeScript
- Zustand (state management)

**Backend:**
- Node.js 18+ (Express)
- Python 3.11+ (FastAPI)
- PostgreSQL (Neon serverless)

**AI/ML:**
- LangGraph (multi-agent orchestration)
- LanceDB (vector database)
- DeepSeek-R1 (primary LLM)

**Infrastructure:**
- Vercel (Node.js deployment)
- Railway (Python deployment)
- GitHub Actions (CI/CD)

---

## 📚 API Reference

Complete API documentation:

**SmartPay Node routing (source of truth):** [`apps/smartpay-backend/docs/API_ROUTING.md`](../apps/smartpay-backend/docs/API_ROUTING.md) · **OBS:** [`apps/smartpay-backend/docs/OBS_ROUTES.md`](../apps/smartpay-backend/docs/OBS_ROUTES.md) · **API versioning + Copilot proxy:** [`../../API_VERSIONING_STRATEGY.md`](../../API_VERSIONING_STRATEGY.md) · **Archived cross-project inventory:** [`../../.archive/ecosystem-root-reports/CROSS_PROJECT_API_VERSIONING_REPORT.md`](../../.archive/ecosystem-root-reports/CROSS_PROJECT_API_VERSIONING_REPORT.md) · **API consistency pass:** [`../API_CONSISTENCY_IMPLEMENTATION_COMPLETE.md`](../API_CONSISTENCY_IMPLEMENTATION_COMPLETE.md) · **Copilot fixes / testing:** [`../../COPILOT_FIXES_COMPLETE.md`](../../COPILOT_FIXES_COMPLETE.md) · [`../../COPILOT_TEST_GUIDE.md`](../../COPILOT_TEST_GUIDE.md) · **Latest validation report:** [`scripts/reports/validation-report-LATEST.md`](../scripts/reports/validation-report-LATEST.md)

### Node.js Backend APIs
- **[Authentication API](guides/api/nodejs-auth.md)** - Sign up, sign in, JWT
- **[Wallet API](guides/api/nodejs-wallets.md)** - E-money wallets
- **[Transaction API](guides/api/nodejs-transactions.md)** - Payments & transfers
- **[KYC API](guides/api/nodejs-kyc.md)** - Identity verification

### Python AI Backend APIs
- **[Python AI Endpoints](guides/api/python-endpoints.md)** - Complete endpoint reference
- **[Copilot API](guides/api/copilot-api.md)** - End-to-end chat (mobile → Node proxy → FastAPI), schemas, threads, auth
- **[ML Prediction API](guides/api/python-ml.md)** - Fraud detection, credit scoring
- **[Analytics API](guides/api/python-analytics.md)** - Transaction insights

**Copilot testing & guardrails:** [Copilot test scenarios](guides/reference/copilot-test-scenarios.md)

### External Integrations
- **[Buffr Connect API](guides/api/buffr-reference.md)** - Open Banking integration
- **[Buffr Integration Guide](guides/api/buffr-integration.md)** - Complete integration guide

---

## ⚖️ Compliance & Regulatory

Bank of Namibia compliance documentation:

### Regulatory Framework
- **[Compliance Overview](compliance/README.md)** - Start here
- **[Implementation Checklist](compliance/implementation/checklist.md)** - Ensure 100% compliance
- **[E-Money Specification](compliance/implementation/e-money-spec.md)** - PSD-3 implementation
- **[Cybersecurity Guide](compliance/implementation/cybersecurity.md)** - PSD-12 implementation

### Bank of Namibia PSDs (18 Documents)

**Core Determinations:**
- [PSD-1: Licensing & Authorization](compliance/BON_PSDs/PSD-1.pdf)
- [PSD-3: E-Money Issuance](compliance/BON_PSDs/PSD-3.pdf)
- [PSD-6: System Participant Authorization](compliance/BON_PSDs/PSD-6.pdf)
- [PSD-11: Interchange Rates & Fees](compliance/BON_PSDs/PSD-11.pdf)
- [PSD-12: Cybersecurity Standards](compliance/BON_PSDs/PSD-12.pdf)
- [PSD-13: Systemically Important Systems](compliance/BON_PSDs/PSD-13.pdf)

**Additional Acts:**
- [Electronic Transactions Act](compliance/BON_PSDs/Electronic-Transactions-Act.pdf)
- [Financial Intelligence Act](compliance/BON_PSDs/FIA.pdf)
- [Namibia Open Banking Standards](compliance/BON_PSDs/OBS-v1.0.pdf)
- [NAMQR Standards](compliance/BON_PSDs/NAMQR-Standards.pdf)
- [NPS Fraud Report (10 Years)](compliance/BON_PSDs/NPS-Fraud-Report.pdf)

---

## 🚨 Incident Response Playbooks

Procedures for handling security and operational incidents:

### Security Incidents
- **[Fraud Incident Response](playbooks/fraud-incident-response.md)** - Suspected fraud detection & response
- **[Cyberattack Response](playbooks/cyberattack-response.md)** - DDoS, breach, ransomware
- **[Data Breach Response](playbooks/data-breach-response.md)** - Personal data compromise

### Operational Incidents
- **[System Outage Response](playbooks/system-outage-response.md)** - Service downtime
- **[Database Issues](playbooks/database-incident-response.md)** - Data corruption, connection issues

### Escalation Matrix

| Severity | Response Time | Escalation | Authority |
|----------|---------------|------------|-----------|
| P0 (Critical) | 15 minutes | CTO, CEO | Full authority |
| P1 (High) | 1 hour | Engineering Lead | Coordinate with CTO |
| P2 (Medium) | 4 hours | On-call Engineer | Follow playbook |
| P3 (Low) | 24 hours | Support Team | Standard process |

---

## 💻 Development Guides

How to develop Smartpay applications:

### Setup & Configuration
- **[Mobile Development Guide](guides/development/mobile-development.md)** - React Native setup
- **[Backend Development Guide](guides/development/backend-setup.md)** - Node.js setup
- **[Python Development Guide](guides/development/python-setup.md)** - AI backend setup
- **[Type Generation Guide](guides/development/type-generation.md)** - Working with shared types

### Development Workflow
- **[Git Workflow](guides/development/git-workflow.md)** - Branching strategy
- **[Code Review Guidelines](guides/development/code-review.md)** - What to check
- **[Testing Strategy](guides/development/testing.md)** - Unit, integration, E2E
- **[Debugging Guide](guides/development/debugging.md)** - Common issues & solutions

### Coding Standards
- **[TypeScript Style Guide](guides/development/typescript-style.md)** - Conventions
- **[Python Style Guide](guides/development/python-style.md)** - PEP 8 + additions
- **[Database Guidelines](guides/development/database-guidelines.md)** - Schema design, migrations

---

## 🚀 Deployment

How to deploy Smartpay to production:

### Deployment Guides
- **[Deployment Checklist](guides/deployment/checklist.md)** - Pre-deployment verification
- **[Mobile Build Guide](guides/deployment/mobile-build.md)** - iOS & Android builds
- **[Backend Deployment](guides/deployment/backend-deploy.md)** - Vercel deployment
- **[Python Deployment](guides/deployment/python-deploy.md)** - Railway deployment

### Infrastructure
- **[Vercel Configuration](guides/deployment/vercel-config.md)** - Node.js backend
- **[Railway Configuration](guides/deployment/railway-config.md)** - Python backend
- **[Neon Database Setup](guides/deployment/neon-setup.md)** - PostgreSQL hosting

### Monitoring
- **[Monitoring Setup](guides/deployment/monitoring.md)** - Error tracking, metrics
- **[Log Analysis](guides/deployment/logs.md)** - Finding issues in production

---

## 📊 Reference Documentation

Quick references for common tasks:

### Quick References
- **[Backend Quick Reference](guides/reference/backend-quick-ref.md)** - Common patterns
- **[Python Quick Reference](guides/reference/python-quick-ref.md)** - AI backend patterns
- **[OBS Quick Reference](guides/reference/obs-quick-ref.md)** - Open Banking
- **[Rate Limiter Reference](guides/reference/rate-limiter-ref.md)** - Rate limiting

### Database
- **[Database Schema Complete](guides/reference/database-schema.md)** - All 70 tables
- **[SQL Migration Guide](guides/reference/sql-migrations.md)** - Writing migrations

### Design & UI
- **[Design System](guides/reference/design-system.md)** - UI components
- **[Buffr Design Tokens](guides/reference/design-tokens.md)** - Colors, spacing, typography

---

## 🔧 Utilities & Tools

### Monorepo Structure

After March 2026 monorepo migration:

```
fintech/
├── apps/                      # Applications
│   ├── smartpay-backend/      # Node.js API
│   ├── smartpay-mobile/       # React Native app
│   └── smartpay-ai/           # Python AI service
├── packages/                  # Shared code
│   ├── shared-types/          # Type definitions
│   ├── shared-config/         # Configuration
│   └── shared-security/       # Security utilities
├── docs/                      # Documentation (you are here!)
├── database/                  # SQL migrations & schemas
└── scripts/                   # Build & utility scripts
```

**See:** [Monorepo Migration Plan](../MONOREPO_MIGRATION_PLAN.md) for details

---

### Scripts & Automation

**Type Generation:**
```bash
npm run types:generate
# Generates TypeScript + Python types from JSON schemas
```

**Database Migrations:**
```bash
cd apps/smartpay-backend
npm run migrate
# Runs all pending SQL migrations
```

**Testing:**
```bash
npm run test:all
# Runs all tests across all apps
```

**Development:**
```bash
npm run dev:all
# Starts all services concurrently
```

---

## 📖 Core Documents (Root Level)

**Planning & Tracking:**
- [PLANNING.md](../PLANNING.md) - Project planning, architecture decisions, roadmap
- [TASKS.md](../TASKS.md) - Active tasks and sprint planning
- [README.md](../README.md) - Project overview

**Migration Documentation:**
- [MONOREPO_MIGRATION_PLAN.md](../MONOREPO_MIGRATION_PLAN.md) - Detailed migration plan
- [CURRENT_STRUCTURE_ANALYSIS.md](../CURRENT_STRUCTURE_ANALYSIS.md) - Pre-migration analysis
- [MIGRATION_EXECUTION_GUIDE.md](../MIGRATION_EXECUTION_GUIDE.md) - Step-by-step guide

---

## 🎯 Documentation by Role

### For Developers

**Essential Reading:**
1. [Quick Start Overview](guides/getting-started/overview.md)
2. [Development Guide](guides/development/backend-setup.md)
3. [API Reference](guides/api/python-endpoints.md)
4. [Testing Guide](guides/development/testing.md)

**Daily Use:**
- [Quick References](guides/reference/)
- [Troubleshooting](guides/development/debugging.md)

---

### For DevOps Engineers

**Essential Reading:**
1. [Deployment Checklist](guides/deployment/checklist.md)
2. [Infrastructure Setup](guides/deployment/vercel-config.md)
3. [Monitoring Setup](guides/deployment/monitoring.md)

**Daily Use:**
- [Incident Playbooks](playbooks/)
- [Log Analysis](guides/deployment/logs.md)

---

### For Compliance Officers

**Essential Reading:**
1. [Compliance Overview](compliance/README.md)
2. [Implementation Checklist](compliance/implementation/checklist.md)
3. [All Bank of Namibia PSDs](compliance/BON_PSDs/)

**Audit Preparation:**
- [E-Money Specification](compliance/implementation/e-money-spec.md)
- [Cybersecurity Implementation](compliance/implementation/cybersecurity.md)
- [Database Schema](guides/reference/database-schema.md)

---

### For Business Stakeholders

**Essential Reading:**
1. [Project Overview (README)](../README.md)
2. [Product Requirements](guides/planning/prd.md)
3. [Compliance Overview](compliance/README.md)

**Progress Tracking:**
- [Project Planning](../PLANNING.md)
- [Active Tasks](../TASKS.md)

---

## 🔍 Finding Documentation

### By Topic

**Authentication & Security:**
- [Security Setup](guides/getting-started/security-setup.md)
- [Shared Security Package](../packages/shared-security/README.md)
- [Cybersecurity Guide](compliance/implementation/cybersecurity.md)

**Database & Data:**
- [Database Architecture](guides/architecture/database.md)
- [Database Schema Reference](guides/reference/database-schema.md)
- [Migration Guide](guides/reference/sql-migrations.md)

**AI & Machine Learning:**
- [Python AI Architecture](guides/architecture/backend-python.md)
- [Copilot API](guides/api/copilot-api.md)
- [Copilot test scenarios](guides/reference/copilot-test-scenarios.md)
- [LLM-as-Judge System](guides/architecture/llm-judge.md)
- [ML Prediction APIs](guides/api/python-ml.md)

**Open Banking:**
- [OBS Quick Reference](guides/reference/obs-quick-ref.md)
- [Buffr Connect Integration](guides/api/buffr-integration.md)
- [Bank OAuth Setup](guides/development/bank-oauth.md)

**Mobile Development:**
- [Mobile Development Guide](guides/development/mobile-development.md)
- [Component Library](guides/reference/component-library.md)
- [Build Instructions](guides/deployment/mobile-build.md)

---

### By Task

**"I want to..."**

**...add a new API endpoint**
→ See [Backend Development Guide](guides/development/backend-setup.md) + [API Patterns](guides/reference/backend-quick-ref.md)

**...add a new database table**
→ See [Database Guidelines](guides/development/database-guidelines.md) + [Migration Guide](guides/reference/sql-migrations.md)

**...add a new ML model**
→ See [Python AI Architecture](guides/architecture/backend-python.md) + [ML Endpoint Guide](guides/api/python-ml.md)

**...integrate a new bank**
→ See [Buffr Integration Guide](guides/api/buffr-integration.md) + [OBS Reference](guides/reference/obs-quick-ref.md)

**...deploy to production**
→ See [Deployment Checklist](guides/deployment/checklist.md) + [Deployment Guides](guides/deployment/)

**...respond to a security incident**
→ See [Incident Playbooks](playbooks/) immediately

**...understand compliance requirements**
→ See [Compliance Overview](compliance/README.md) + [Bank of Namibia PSDs](compliance/BON_PSDs/)

---

## 📦 Package Documentation

Shared packages in the monorepo:

- **[@smartpay/shared-types](../packages/shared-types/README.md)** - Type definitions
- **[@smartpay/shared-config](../packages/shared-config/README.md)** - Configuration files
- **[@smartpay/shared-security](../packages/shared-security/README.md)** - Security utilities

---

## 🎓 Learning Resources

### Video Tutorials (Planned)
- [ ] Smartpay Onboarding (30 min)
- [ ] Database Schema Walkthrough (45 min)
- [ ] AI Copilot Deep Dive (60 min)
- [ ] Compliance Training (90 min)

### Code Examples

**Located in:**
- `apps/smartpay-backend/examples/` - Node.js examples
- `apps/smartpay-ai/examples/` - Python examples
- Documentation code blocks throughout

---

## 🤝 Contributing

### Documentation Standards

**When adding documentation:**
1. Use clear, descriptive titles
2. Include code examples
3. Link to related docs
4. Keep it up-to-date
5. Test all commands/code

**Markdown Style:**
- Use ATX headers (`#`, `##`, `###`)
- Code blocks with language tags
- Link to other docs with relative paths
- Include "Last Updated" date

**File Naming:**
- Use kebab-case: `my-new-guide.md`
- Be specific: `nodejs-auth-api.md` not `auth.md`
- Indicate scope: `mobile-push-notifications.md`

---

### Updating Documentation

**Process:**
1. Create branch: `git checkout -b docs/update-xyz`
2. Make changes
3. Verify links work
4. Commit: `git commit -m "docs: Update XYZ guide"`
5. Create PR
6. Tag reviewer: @docs-team

---

## 📞 Support & Contact

### Technical Support

**Internal:**
- Engineering Lead: [TBD]
- DevOps: [TBD]
- Security: [TBD]

**Channels:**
- Slack: #dev-team
- Email: engineering@smartpay.na

---

### Compliance & Regulatory

**Contacts:**
- Compliance Officer: [TBD]
- Legal Counsel: [TBD]
- Bank of Namibia: nps@bon.org.na

---

### External Partners

**Buffr Connect (Open Banking):**
- Support: support@buffr.com
- Documentation: https://docs.buffr.com

**Neon (Database):**
- Support: Via dashboard
- Documentation: https://neon.tech/docs

---

## 🗺️ Documentation Roadmap

### Completed ✅
- ✅ Architecture documentation
- ✅ API references (partial)
- ✅ Compliance guides
- ✅ Incident playbooks
- ✅ Quick references

### In Progress 🚧
- 🚧 Complete API reference (all endpoints)
- 🚧 E2E testing guide
- 🚧 Performance optimization guide

### Planned 📋
- 📋 Video tutorials
- 📋 Interactive API documentation (Swagger/Postman)
- 📋 Troubleshooting database
- 📋 Code examples repository
- 📋 Architecture diagrams (visual)

---

## 📄 Document Index (A-Z)

Full alphabetical index of all documentation:

- [API: Buffr Integration](guides/api/buffr-integration.md)
- [API: Buffr Reference](guides/api/buffr-reference.md)
- [API: Copilot](guides/api/copilot-api.md)
- [API: Python Endpoints](guides/api/python-endpoints.md)
- [Architecture: Backend Node.js](guides/architecture/backend-nodejs.md)
- [Architecture: Backend Python](guides/architecture/backend-python.md)
- [Architecture: Database](guides/architecture/database.md)
- [Architecture: LLM Judge](guides/architecture/llm-judge.md)
- [Compliance: Checklist](compliance/implementation/checklist.md)
- [Compliance: Cybersecurity](compliance/implementation/cybersecurity.md)
- [Compliance: E-Money Spec](compliance/implementation/e-money-spec.md)
- [Compliance: Overview](compliance/README.md)
- [Deployment: Checklist](guides/deployment/checklist.md)
- [Deployment: Mobile Build](guides/deployment/mobile-build.md)
- [Development: Backend Setup](guides/development/backend-setup.md)
- [Development: Mobile Guide](guides/development/mobile-development.md)
- [Development: Python Setup](guides/development/python-setup.md)
- [Development: Testing](guides/development/testing.md)
- [Development: Type Generation](guides/development/type-generation.md)
- [Getting Started: Backend](guides/getting-started/backend-setup.md)
- [Getting Started: Overview](guides/getting-started/overview.md)
- [Getting Started: Security](guides/getting-started/security-setup.md)
- [Playbook: Cyberattack](playbooks/cyberattack-response.md)
- [Playbook: Fraud Incident](playbooks/fraud-incident-response.md)
- [Reference: Database Schema](guides/reference/database-schema.md)
- [Reference: OBS](guides/reference/obs-quick-ref.md)

*(Full index to be generated programmatically)*

---

## 🔄 Recent Updates

### March 21, 2026
- ✅ Added **[Copilot API guide](guides/api/copilot-api.md)** (architecture, proxy vs local agent, schemas, auth, threads, examples, troubleshooting) and linked **[copilot test scenarios](guides/reference/copilot-test-scenarios.md)** from the API section
- ✅ Documented end-to-end Copilot flow (mobile → Node `copilotProxy.ts` → smartpay-ai) and March 2026 reliability fixes (`await`, thread id, HTTP proxy) in app READMEs and root **`README.md`**
- ✅ Aligned SmartPay API docs with **`/api/v1/*`** (Node, FastAPI, PSD-12 security paths)
- ✅ Archived legacy audit/summary reports under **`.archive/old-reports/`**; kept **`validation-report-LATEST.md`**
- ✅ Linked **`API_ROUTING.md`**, **`OBS_ROUTES.md`**, and the root **`CROSS_PROJECT_API_VERSIONING_REPORT.md`** from this index

### March 18, 2026
- ✅ Created documentation structure (compliance, playbooks, guides)
- ✅ Migrated 50+ documentation files from root to organized structure
- ✅ Created this index (docs/README.md)
- ✅ Added navigation by role
- ✅ Added "I want to..." task-based navigation

### Previous Updates
- See [PLANNING.md Change Log](../PLANNING.md#change-log)

---

## 💡 Tips & Best Practices

### Finding What You Need

1. **Start with this README** - Use Quick Navigation above
2. **Search by topic** - Use the "By Topic" section
3. **Search by task** - Use the "I want to..." section
4. **Browse by category** - Check subdirectories (compliance, guides, playbooks)
5. **Use global search** - `grep -r "keyword" docs/`

### Keeping Docs Updated

- Update docs when you change code
- Link to docs in PR descriptions
- Review docs during code review
- Archive outdated docs (don't delete)

---

## 📧 Feedback

Have suggestions for improving documentation?

**How to Provide Feedback:**
1. Create GitHub issue with label `documentation`
2. Message in #dev-team Slack
3. Add comment in PR review
4. Email: engineering@smartpay.na

**What We Want to Know:**
- What's missing?
- What's unclear?
- What's outdated?
- What helped you most?

---

**Last Updated:** 2026-03-21  
**Maintained by:** Smartpay Engineering Team  
**Version:** 1.0.2 (Copilot API guide & cross-links)
