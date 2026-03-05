# Buffr G2P – Documentation Index (Resolve AI Chat, Knowledge Base, Mobile)

This index points to all relevant documentation to resolve issues around **AI chat**, **knowledge base**, **ingest/verify**, and **mobile integration**. It was built using Archon MCP checks and repo docs.

---

## Archon MCP status

- **`get_available_sources`**: Returned **0 sources** – Archon’s RAG vector store has no Buffr content indexed.
- **`perform_rag_query`**: Returns **empty results** – no docs to retrieve.
- **`manage_project(action="list")`**: **Failed** – “Failed to list projects” (backend/config).

**Conclusion:** Use the **buffr-g2p repo docs** below until Archon is populated (e.g. by ingesting `docs/` or PRD into Archon).

---

## 1. AI chat and knowledge base (testing and configuration)

| Doc | Path | Use when |
|-----|------|----------|
| **Testing AI chat and KB** | `docs/TESTING_AI_CHAT_AND_KNOWLEDGE_BASE.md` | Testing the AI tab, verifying KB is loaded, curl tests, `EXPO_PUBLIC_BUFFR_AI_URL`. |
| **Buffr AI Companion (run/design)** | `backend/buffr_ai/README.md` | Running uvicorn, venv, health/chat endpoints, agent tools, checkpointer/Neon. |
| **Knowledge base curation** | `backend/docs/KNOWLEDGE_BASE_CURATION.md` | Goals, sources, NamPost/biometric, chunking, FTS vs pgvector, maintaining the KB. |

**Quick commands (from repo):**
```bash
# Ingest KB (after migration 008)
cd backend && PYTHONPATH=. python scripts/ingest_knowledge_base.py

# Verify KB populated
cd backend && PYTHONPATH=. python scripts/verify_knowledge_base.py

# Start Companion
cd backend && source ai/bin/activate && PYTHONPATH=. uvicorn buffr_ai.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 2. Knowledge base content and wiring

| Item | Path | Role |
|------|------|------|
| **Curated KB content** | `docs/buffr_knowledge_base.md` | Single source: consumer protection, fees, vouchers, cash-out, complaints, regulation, financial literacy, contact. |
| **Curated sources list** | `backend/buffr_ai/knowledge_base/curated_sources.py` | Registers `docs/buffr_knowledge_base.md` for ingest. |
| **Migration (table)** | `backend/migrations/008_knowledge_base.sql` | Creates `knowledge_base_documents` (FTS). |
| **Ingest script** | `backend/scripts/ingest_knowledge_base.py` | Upserts markdown into DB; use `json.dumps(metadata)` for JSONB. |
| **Verify script** | `backend/scripts/verify_knowledge_base.py` | Counts global docs and runs sample search. |
| **Retrieval** | `backend/buffr_ai/knowledge_base/retrieve.py` | FTS over `knowledge_base_documents`; `_normalize_metadata()` for JSONB. |
| **Companion tool** | `backend/buffr_ai/agents/companion/tools.py` | `search_knowledge_base` calls `retrieve()`. |
| **System prompt** | `backend/buffr_ai/agents/companion/prompts.py` | Tells agent to use `search_knowledge_base` for consumer protection, fees, complaints, NamPost, financial literacy. |

---

## 3. Mobile app (AI tab and env)

| Item | Path | Role |
|------|------|------|
| **AI tab screen** | `mobile/app/(tabs)/ai/index.tsx` | Uses `companionApi.sendCompanionMessage`, `checkCompanionHealth`, shows Online/Offline. |
| **Companion API client** | `mobile/services/companionApi.ts` | `EXPO_PUBLIC_BUFFR_AI_URL` → `POST /api/buffr-companion/chat`; `COMPANION_NOT_CONFIGURED` when URL empty. |
| **Env** | `mobile/.env` or Expo env | Set `EXPO_PUBLIC_BUFFR_AI_URL=http://<machine-ip>:8000` so the device can reach the Companion. |

---

## 4. Backend (G2P Node and Companion proxy)

| Item | Path | Role |
|------|------|------|
| **AI health** | `backend/src/server.ts` | `GET /api/v1/mobile/ai-health` → `BUFFR_AI_URL/health`. |
| **AI chat proxy** | `backend/src/server.ts` | `POST /api/v1/mobile/ai-chat` → proxies to `BUFFR_AI_URL/api/buffr-companion/chat`. |
| **Companion endpoint** | `backend/buffr_ai/api/companion_endpoint.py` | `POST /api/buffr-companion/chat`; uses graph and `CompanionDeps` (user profile from Node API). |

---

## 5. Common fixes already applied

- **Ingest JSONB:** In `ingest_knowledge_base.py`, pass `json.dumps(metadata)` and use `$4::jsonb` so asyncpg accepts the metadata.
- **Retrieve metadata:** In `retrieve.py`, use `_normalize_metadata(r["metadata"])` so both dict and string JSONB from asyncpg are handled.

---

## 6. Optional: Populate Archon for RAG

To use Archon MCP’s `perform_rag_query` for Buffr docs later:

1. Ensure Archon backend is running and list projects: `manage_project(action="list")`.
2. Add a project and documents (e.g. `manage_document`) with content from `docs/buffr_knowledge_base.md`, `docs/TESTING_AI_CHAT_AND_KNOWLEDGE_BASE.md`, and/or PRD sections.
3. If Archon supports URL/file ingestion for RAG, point it at the repo’s `docs/` or key markdown files so `get_available_sources` and `perform_rag_query` return results.

---

*Generated for resolving AI chat, knowledge base ingest/verify, and mobile integration. Update paths if the repo layout changes.*
