# Testing the AI Chat and Knowledge Base

This doc explains how the Buffr AI Companion uses the knowledge base and how to test chat and responses.

---

## Is the knowledge base configured?

**Yes.** The knowledge base is wired in code:

| Component | Role |
|-----------|------|
| **`docs/buffr_knowledge_base.md`** | Single curated source: consumer protection, fees, vouchers, cash-out, complaints, regulation, financial literacy, troubleshooting, contact. |
| **`backend/buffr_ai/knowledge_base/curated_sources.py`** | Registers that file as `("docs/buffr_knowledge_base.md", "Buffr Knowledge Base – ...", "full_kb")`. |
| **`backend/migrations/008_knowledge_base.sql`** | Creates `knowledge_base_documents` (scope, title, source, content, full-text search). |
| **`backend/scripts/ingest_knowledge_base.py`** | Reads the markdown file and upserts it into `knowledge_base_documents` (scope=global). |
| **`backend/buffr_ai/knowledge_base/retrieve.py`** | Full-text search over `knowledge_base_documents` (user-isolated). |
| **`backend/buffr_ai/agents/companion/tools.py`** | `search_knowledge_base` tool calls `retrieve()`. |
| **`backend/buffr_ai/agents/companion/agent.py`** | Registers `_search_knowledge_base` so the LLM can call it. |
| **`backend/buffr_ai/agents/companion/prompts.py`** | System prompt tells the companion: *"For questions about consumer protection, regulations, fees, complaints, redemption rights, NamPost redemption, biometric verification at branches, or financial literacy and education, use the search_knowledge_base tool and base your answer on the returned excerpts."* |

So the **content** of `buffr_knowledge_base.md` is what the companion is supposed to use when users ask about those topics—**after** it is ingested into the database.

---

## Make sure the knowledge base is loaded

1. **Run migration 008** (if not already applied):
   - Apply `backend/migrations/008_knowledge_base.sql` to your Neon (or Postgres) DB so the table `knowledge_base_documents` exists.

2. **Run the ingest script** (from repo root or `backend/`):
   ```bash
   cd backend
   # Ensure DATABASE_URL is set (e.g. in .env)
   PYTHONPATH=. python scripts/ingest_knowledge_base.py
   ```
   You should see: `Ingested: docs/buffr_knowledge_base.md` and `Done. Ingested=1, Skipped=0`.

3. **Optional: verify rows**
   ```bash
   cd backend
   PYTHONPATH=. python scripts/verify_knowledge_base.py
   ```
   This prints whether any global documents exist and runs a sample search.

---

## Test the AI chat from the mobile app

1. **Start the Buffr AI Companion API** (uses the same DB and thus the same knowledge base):
   ```bash
   cd backend
   source ai/bin/activate   # or your venv
   export DATABASE_URL=...  # same as G2P backend
   export LLM_API_KEY=...  # or OPENAI_API_KEY / DeepSeek
   PYTHONPATH=. uvicorn buffr_ai.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Point the mobile app at the Companion**
   - In `mobile/.env` or your Expo env, set:
     - `EXPO_PUBLIC_BUFFR_AI_URL=http://<your-machine-ip>:8000`  
     (use your machine’s LAN IP so the device/emulator can reach it; `localhost` only works for the same machine.)
   - Rebuild/restart the app so the env is picked up.

3. **Open the AI tab**
   - You should see “Buffr AI Companion” and “Online” when the service is reachable.
   - If you see “Not configured”, `EXPO_PUBLIC_BUFFR_AI_URL` is missing or empty.

4. **Test general and knowledge-base questions**
   - **General:** e.g. “What can you help me with?” → should get a short overview.
   - **From the knowledge base:** e.g. “How do I redeem a voucher?”, “What are the cash-out fees?”, “How do I complain?”, “What is proof-of-life?”  
   - The companion should call `search_knowledge_base` and answer using excerpts from `buffr_knowledge_base.md`. If the KB is empty (ingest not run), answers may be generic or the model may say it doesn’t have that information.

5. **Test from the G2P backend (optional)**
   - The Node server can proxy to the Companion. Set `BUFFR_AI_URL` in the backend env (e.g. `http://localhost:8000`). Mobile could then call the backend’s `/api/v1/mobile/ai-chat` instead of the Companion URL directly; the current mobile app uses `EXPO_PUBLIC_BUFFR_AI_URL` and talks to the Companion directly.

---

## Quick curl test (Companion only)

With the Companion running on port 8000:

```bash
# Health
curl -s http://localhost:8000/health

# Chat (no auth for local test)
curl -s -X POST http://localhost:8000/api/buffr-companion/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I redeem a voucher to my Buffr wallet?","thread_id":"curl-test-1"}'
```

The response should include an assistant message that reflects the voucher redemption steps from the knowledge base (if ingest was run and the model uses the tool).

---

## Summary

| Question | Answer |
|----------|--------|
| Is `buffr_knowledge_base.md` the official knowledge base? | Yes; it’s the single curated source in `curated_sources.py`. |
| Is it “configured” in code? | Yes: ingest script, table, retrieve, and companion tool + prompt are all wired. |
| Is it actually used at runtime? | Only after migration 008 is applied and `ingest_knowledge_base.py` has been run so the DB has content. |
| How do I test chat and responses? | Start the Companion, set `EXPO_PUBLIC_BUFFR_AI_URL` in the app, open the AI tab, and ask about vouchers, fees, complaints, etc.; optionally run `verify_knowledge_base.py` to confirm the DB has documents. |
