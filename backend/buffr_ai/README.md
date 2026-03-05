# Buffr AI Companion

Python package for the **Buffr AI Payment Companion**: orchestrator agent (Pydantic AI), LangGraph HITL workflow, and FastAPI chat endpoint. Lives under `backend/buffr_ai/` in the buffr-g2p repo. **There is no virtual environment inside `buffr_ai/`** — the venv is **`ai`** in `backend/` (create it there if missing).

## Design (Boy Scout + DRY)

- **Single source of truth:** `PendingAction`, `CompanionResponse`, `ChatRequest`/`ChatResponse` in `agents/companion/models.py`; graph shape in `graph/state.py` and `graph/workflow.py`.
- **No duplicate logic:** Analyst routing and write-action execution live in `agents/companion/tools.py`; graph nodes call into them.
- **Clean structure:** One module per concern (state, nodes, workflow, API).

## Blueprint

Full architecture, ML modules, and training: **`docs/BUFFR_AI_COMPANION_BLUEPRINT.md`** (sections 10–19).

**User context and state:** How the agent gets user profile and how conversation state is wired: **`docs/USER_CONTEXT_AND_STATE.md`**.

## Run

**Virtual environment:** The venv is **`ai`** in `backend/`, not inside `buffr_ai/`. Create it once if you get `no such file or directory: ai/bin/activate`:

```bash
# From backend/ – create venv once (if not already done)
cd backend
python3 -m venv ai
source ai/bin/activate   # Windows: ai\Scripts\activate
pip install -r buffr_ai/requirements.txt

# Verify imports and graph
PYTHONPATH=. python scripts/verify_buffr_ai.py
# Expect: "All buffr_ai imports OK", "Graph: CompiledStateGraph", "Done."

# Start the API (from backend/, with venv active). Use --host 0.0.0.0 so devices on LAN can reach it.
PYTHONPATH=. uvicorn buffr_ai.main:app --reload --host 0.0.0.0 --port 8000
```

**Or without venv** (system/python -m pip):

```bash
cd backend
pip install -r buffr_ai/requirements.txt
cp buffr_ai/.env.example .env   # or set DATABASE_URL, LLM_* in env
export DATABASE_URL=postgresql://...
export LLM_API_KEY=sk-...       # or use DeepSeek: LLM_PROVIDER=deepseek + LLM_API_KEY
PYTHONPATH=. uvicorn buffr_ai.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: `GET http://localhost:8000/health`
- Chat: `POST http://localhost:8000/api/buffr-companion/chat` with `{"message": "Create a savings wallet named Vacation", "thread_id": "test123"}`. If the flow interrupts for approval, send `{"thread_id": "test123", "resume": true}` (or `{"resume": {"approved": true}}`) to continue.

Set `OPENAI_API_KEY` or `LLM_API_KEY` (and `DATABASE_URL` for the checkpointer) so the app can start. For **DeepSeek**, set `LLM_PROVIDER=deepseek` and `LLM_API_KEY` (or `DEEPSEEK_API_KEY`); the default model is `deepseek-chat`.

**User profile (onboarding):** So the Companion can answer "What's my name?" and use the user's details, set **`BUFFR_API_BASE_URL`** in `backend/.env` to the Node backend base URL (e.g. `http://localhost:3001`). The mobile app sends the same Bearer token to the Companion; the Companion calls `GET {BUFFR_API_BASE_URL}/api/v1/mobile/user/profile` to fetch the current user (single source of truth in Node).

**Checkpointer / 500 on chat:** If you see `psycopg.OperationalError: SSL connection has been closed unexpectedly` when posting to `/api/buffr-companion/chat`, the Postgres connection used by the LangGraph checkpointer is dropping (common with serverless DBs like Neon). The chat endpoint **retries once** on connection/SSL errors; for a lasting fix use Neon's **pooled** connection string (e.g. host like `ep-xxx-pooler.us-east-2.aws.neon.tech` or the connection string from the Neon dashboard that includes pooling) and ensure `?sslmode=require` is set. Restart the Companion after changing `DATABASE_URL`.

**Test with curl (server running on port 8000):**
```bash
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/api/buffr-companion/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What can you help me with?","thread_id":"test-1"}'
```

## Agent tools

- **Registered with the agent** (model can call): `get_user_info`, `search_knowledge_base`, `route_to_guardian`, `route_to_transaction_analyst`, `route_to_voucher_analyst`. See `agents/companion/agent.py` and `agents/companion/tools.py`.
- **Write actions** (only after HITL approval): `create_wallet`, `create_group`, `add_members`, `remove_member`, `transfer_funds`, `pay_bill`, `redeem_voucher`, `apply_loan`. Dispatcher: `execute_pending_action()` in `tools.py`; called from `graph/nodes.py` `execute_tool_node`.
- Full list and flow: **`docs/USER_CONTEXT_AND_STATE.md`** (§ Companion agent tools).

## Layout

```
buffr_ai/
├── __init__.py
├── providers.py
├── db_utils.py
├── agents/companion/   # models, prompts, tools, agent
├── graph/              # state, nodes, workflow
├── api/                # companion_endpoint, ml_endpoint
├── ml/                 # 12 ML model modules (fraud, credit, churn, etc.)
├── models/             # Trained weights per model (.pkl, .pt) – loaded at startup by ml_service
├── data/               # Historical CSVs for training/reference
├── ml_service.py       # Unified ML service; loads from models/ when present
├── main.py
├── requirements.txt
└── .env.example
```

**ML:** At startup, `MLService.initialize()` loads trained weights from `backend/buffr_ai/models/<model_name>/` when the directory exists; otherwise the ensemble runs untrained. See `INTEGRATION_VERIFICATION.md` for the full ML checklist and API list.

Guardian, Transaction Analyst, and Voucher Analyst (and ML) are described in the blueprint; add them under `agents/` and wire routing in companion tools when ready.
