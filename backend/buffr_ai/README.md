# Buffr AI Companion

Python package for the **Buffr AI Payment Companion**: orchestrator agent (Pydantic AI), LangGraph HITL workflow, and FastAPI chat endpoint. Lives under `backend/buffr_ai/` in the buffr-g2p repo.

## Design (Boy Scout + DRY)

- **Single source of truth:** `PendingAction`, `CompanionResponse`, `ChatRequest`/`ChatResponse` in `agents/companion/models.py`; graph shape in `graph/state.py` and `graph/workflow.py`.
- **No duplicate logic:** Analyst routing and write-action execution live in `agents/companion/tools.py`; graph nodes call into them.
- **Clean structure:** One module per concern (state, nodes, workflow, API).

## Blueprint

Full architecture, ML modules, and training: **`docs/BUFFR_AI_COMPANION_BLUEPRINT.md`** (sections 10–19).

## Run

**Using the project venv `ai` (from repo root):**

```bash
# Create venv once (already done if you ran this)
python3 -m venv ai
source ai/bin/activate   # Windows: ai\Scripts\activate
pip install -r backend/buffr_ai/requirements.txt

# Verify imports and graph
cd backend && PYTHONPATH=. python scripts/verify_buffr_ai.py
# Expect: "All buffr_ai imports OK", "Graph: CompiledStateGraph", "Done."

# Start the API (from backend/, with venv active)
cd backend
PYTHONPATH=. uvicorn buffr_ai.main:app --reload --port 8000
```

**Or without venv** (system/python -m pip):

```bash
cd backend
pip install -r buffr_ai/requirements.txt
cp buffr_ai/.env.example .env   # or set DATABASE_URL, LLM_* in env
export DATABASE_URL=postgresql://...
export LLM_API_KEY=sk-...       # or use DeepSeek: LLM_PROVIDER=deepseek + LLM_API_KEY
PYTHONPATH=. uvicorn buffr_ai.main:app --reload --port 8000
```

- Health: `GET http://localhost:8000/health`
- Chat: `POST http://localhost:8000/api/buffr-companion/chat` with `{"message": "Create a savings wallet named Vacation", "thread_id": "test123"}`. If the flow interrupts for approval, send `{"thread_id": "test123", "resume": true}` (or `{"resume": {"approved": true}}`) to continue.

Set `OPENAI_API_KEY` or `LLM_API_KEY` (and `DATABASE_URL` for the checkpointer) so the app can start. For **DeepSeek**, set `LLM_PROVIDER=deepseek` and `LLM_API_KEY` (or `DEEPSEEK_API_KEY`); the default model is `deepseek-chat`.

**Test with curl (server running on port 8000):**
```bash
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/api/buffr-companion/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What can you help me with?","thread_id":"test-1"}'
```

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
