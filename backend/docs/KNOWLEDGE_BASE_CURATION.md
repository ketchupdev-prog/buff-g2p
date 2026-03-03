# Curating a Knowledge Base for the Buffr AI Companion

A robust knowledge base is essential for the Buffr AI Companion to provide accurate, contextual, and helpful responses. This document outlines a systematic approach to curating, structuring, and integrating a knowledge base that the companion can query using Retrieval-Augmented Generation (RAG).

---

## 1. Goals of the Knowledge Base

- **Answer user questions** about Buffr products, policies, and procedures.
- **Provide financial literacy** content tailored to Namibian beneficiaries.
- **Support troubleshooting** for common issues (e.g., voucher redemption, wallet setup).
- **Keep information up‑to‑date** as products and regulations evolve.

---

## 2. Sources of Knowledge

Gather content from authoritative internal and external sources.

### 2.1 Internal Buffr Documentation

| Source | Description |
|--------|-------------|
| **Product Requirements Document (PRD)** | Complete specification of all features, flows, and business rules. |
| **User Guides / FAQs** | Help articles written for beneficiaries (simple language). |
| **Agent Training Manuals** | Procedures for agents (cash‑out, proof‑of‑life, etc.). |
| **Release Notes** | Updates and new features. |
| **Support Ticket Histories** | Anonymised common issues and resolutions. |
| **API Documentation** | For technical queries (though companion is user‑facing). |
| **Terms of Service, Privacy Policy** | Legal disclosures. |

### 2.2 External Namibian Resources

| Source | Description |
|--------|-------------|
| **Bank of Namibia** | Regulations, payment system acts, NAMQR specifications. |
| **NamRA (Tax Authority)** | Tax information relevant to grants. |
| **Ministry of Gender Equality, Poverty Eradication and Social Welfare** | Grant types, eligibility, payment schedules. |
| **NamPost** | Branch locations, services, fees. |
| **Financial Literacy Trust Namibia** | Educational materials. |
| **Local News / Announcements** | Public service announcements (e.g., new grant programmes). |

---

## 3. NamPost and Biometric Verification (Buffr-specific)

Buffr uses **biometric verification at NamPost** for both voucher redemption and proof-of-life. The companion must be able to answer questions about this clearly.

| Topic | Source | Key facts |
|--------|--------|-----------|
| **Voucher redemption at NamPost** | PRD §2.2, §2.4 | Flow: select branch → branch displays dynamic NAMQR → user scans with app → **2FA (PIN or biometric)** → **at branch: teller may require biometric (face/fingerprint) on POS terminal (FP09)** → collect cash. **No fee** for cashing out at NamPost. |
| **Proof-of-life at NamPost** | PRD §2.4 | Beneficiary can do proof-of-life at agent/NamPost: visit with ID → agent selects "Proof-of-life" on **POS Terminal (FP09)** → beneficiary provides **biometric (face/fingerprint)** → terminal verifies against enrolled template. |
| **Frozen wallet** | PRD §2.4 | If proof-of-life is overdue (past grace period), wallet is frozen. **Vouchers can still be redeemed at NamPost/SmartPay with biometric verification at the point of redemption**, which also counts as proof-of-life. |
| **2FA in app** | Backend API, PRD | For sensitive actions (redeem, cash-out, send money) the app uses **PIN, biometric, or OTP** via `POST /api/v1/mobile/auth/verify-2fa`; method can be `pin`, `biometric`, or `otp`. |

**Example KB entry:** See `docs/kb_nampost_redemption.md` for a full article suitable for the knowledge base ("Redeem a voucher at NamPost"), including biometric verification at the branch.

---

## 4. Content Curation & Structuring

### 4.1 Define Topics and Categories

Organise content into a hierarchical taxonomy for efficient retrieval.

```
- Buffr Platform
  - Getting Started (onboarding, creating account)
  - Wallets (types, adding money, transferring, auto‑pay)
  - Vouchers (receiving, redeeming, expiry)
  - Groups (creating, managing members, sending/requesting)
  - Loans (voucher‑backed advances, eligibility, repayment)
  - Bill Payments (supported billers, payment methods)
  - Send Money (P2P, merchant payments)
  - Cash‑Out (agent, till, ATM, NamPost, bank transfer)
  - Cards (Buffr Card, adding cards, security)
  - Profile & Settings (updating info, security, proof‑of‑life)
- Financial Literacy
  - Budgeting
  - Saving
  - Understanding Credit
  - Grant Management
  - Avoiding Scams
- Support
  - Troubleshooting (failed transactions, login issues)
  - Fees and Charges
  - Complaint Process
  - Contact Support
- Legal & Compliance
  - Terms of Service
  - Privacy Policy
  - Data Protection
  - Regulatory Information
- Namibia‑Specific
  - Government Grants (old age, disability, child, veterans)
  - Agent Network (locations, hours)
  - NamPost Services (branches, biometric verification)
  - SmartPay Units
  - USSD (*123#) Guide
```

### 4.2 Content Format

- **Markdown** – easy to write, version‑control, and chunk.
- **HTML** – if richer formatting is needed (preserve links, tables).
- **PDF** – for existing brochures/leaflets (but should be converted to text).

Each document should have:
- Title
- Category tags
- Last updated date
- Authoritative source

### 4.3 Chunking Strategy

For RAG, documents must be split into semantically meaningful chunks.

- **Chunk size:** 500–1000 tokens (empirically tested).
- **Overlap:** 10–20% to preserve context across chunk boundaries.
- **Chunking method:** RecursiveCharacterTextSplitter (LangChain) or semantic splitting based on headings.

---

## 5. Ingestion into Vector Database

We’ll use a typical RAG pipeline:

1. **Load** documents from source (local files, CMS, APIs).
2. **Split** into chunks.
3. **Embed** chunks using a suitable embedding model (e.g., `text-embedding-3-small`, `BAAI/bge-base-en-v1.5`).
4. **Store** in a vector database (e.g., Pinecone, Weaviate, Qdrant, or pgvector with PostgreSQL).

### 5.1 Choice of Vector DB

Given the existing Buffr infrastructure (PostgreSQL), using **pgvector** is a natural fit. It allows storing embeddings alongside metadata in the same transactional database.

```sql
-- Enable pgvector extension
CREATE EXTENSION vector;

-- Table for knowledge base chunks
CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),          -- dimension depends on embedding model
    metadata JSONB,                   -- { title, category, source, updated_at }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for similarity search (HNSW or IVFFlat)
CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
```

**Note:** The current Buffr AI implementation uses **full-text search** on `knowledge_base_documents` (migration 008) with `scope` and `user_id` for user isolation. pgvector can be added later for semantic search; the curation and taxonomy above still apply.

### 5.2 Ingestion Script (Python)

See `backend/scripts/ingest_knowledge_base.py` for the current script that upserts from curated file paths into `knowledge_base_documents`. For vector-based RAG, extend to:

- Load documents from a directory (supports .md, .txt).
- Split with RecursiveCharacterTextSplitter (or similar).
- Generate embeddings and store in pgvector (e.g. `knowledge_chunks` or an `embedding` column on `knowledge_base_documents`).

---

## 6. Integration with the Buffr AI Companion

The companion has a tool **`search_knowledge_base`** that queries the knowledge base (FTS today; vector search when pgvector is added). Results are **user-isolated** (global content + that user’s content only).

Register the tool in the companion agent and instruct the agent to use it for consumer protection, regulation, financial literacy, **NamPost redemption**, and **biometric verification** questions.

---

## 7. Maintaining the Knowledge Base

### 7.1 Update Process

- **Version control** all source documents in the Git repository (e.g., `docs/`, `mobile/docs/`, `backend/docs/`).
- **CI/CD pipeline:** On merge to main, optionally re-run ingestion.
- **Manual overrides:** Re-run `backend/scripts/ingest_knowledge_base.py` after adding or editing curated sources.

### 7.2 Monitoring

- Track which queries return no results – these indicate knowledge gaps.
- Monitor user feedback (thumbs up/down) on answers to improve retrieval.

### 7.3 Periodic Review

- Schedule quarterly reviews with product and support teams to refresh content.
- Archive outdated information (e.g., superseded grant amounts).
- Keep **NamPost and biometric** procedures aligned with actual branch and POS behaviour.

---

## 8. Example Knowledge Base Entry

See **`docs/kb_nampost_redemption.md`** in this repo for a full example: "Redeem a voucher at NamPost", including ID, QR code, 2FA, and **biometric verification at the branch**.

---

## 9. Conclusion

A well‑curated knowledge base, integrated via RAG (or FTS), transforms the Buffr AI Companion into a comprehensive guide for beneficiaries. By combining authoritative internal documents with external Namibian resources and **explicit coverage of NamPost and biometric verification**, the companion can provide accurate, context‑aware answers and build trust with users.
