#!/usr/bin/env python3
"""
Verify buffr_ai imports and graph build.
Run from repo root with venv 'ai' activated:
  source ai/bin/activate && cd backend && PYTHONPATH=. python scripts/verify_buffr_ai.py
Or from backend/: PYTHONPATH=. python scripts/verify_buffr_ai.py
"""
from pathlib import Path

# Load backend/.env before any buffr_ai imports that need LLM_API_KEY
backend_dir = Path(__file__).resolve().parent.parent
env_file = backend_dir / ".env"
if env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(env_file)

from buffr_ai.providers import get_llm_model
from buffr_ai.db_utils import get_db_pool, close_db_pool
from buffr_ai.agents.companion.models import PendingAction, CompanionResponse, ChatRequest, ChatResponse
from buffr_ai.agents.companion.prompts import COMPANION_SYSTEM_PROMPT
from buffr_ai.agents.companion import tools as companion_tools
from buffr_ai.agents.companion.agent import companion_agent, CompanionDeps, run_companion
from buffr_ai.graph.state import BuffrAgentState
from buffr_ai.graph.nodes import companion_node, guardian_check_node, human_approval_node, execute_tool_node
from buffr_ai.graph.workflow import build_buffr_graph, get_compiled_graph
from buffr_ai.api.companion_endpoint import router
from buffr_ai.main import app

def main():
    print("All buffr_ai imports OK")
    g = build_buffr_graph()
    print("Graph:", type(g).__name__)
    print("FastAPI app:", app.title)
    print("Done.")

if __name__ == "__main__":
    main()
