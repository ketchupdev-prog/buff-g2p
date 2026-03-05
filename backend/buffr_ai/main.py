"""
Buffr AI Companion – FastAPI application entrypoint.

Location: backend/buffr_ai/main.py
Purpose: Lifespan (DB pool + compile graph with checkpointer), mount companion router, health.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

# Disable Pydantic logfire plugin to avoid ReadableLogRecord import error with current opentelemetry
os.environ.setdefault("PYDANTIC_DISABLE_PLUGINS", "logfire-plugin")

from dotenv import load_dotenv

from fastapi import FastAPI

# Load .env from backend/ so LLM_* and DATABASE_URL are set before agent imports
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

from buffr_ai.api.companion_endpoint import router as companion_router
from buffr_ai.api.ml_endpoint import router as ml_router
from buffr_ai.db_utils import get_db_pool, close_db_pool
from buffr_ai.graph.workflow import get_compiled_graph

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: DB pool, ML service init, and compiled graph with Postgres checkpointer. Shutdown: close pool."""
    await get_db_pool()
    # Optional: initialize ML service on startup so /api/ml/health and first prediction are fast (per ML_INTEGRATION_GUIDE)
    try:
        from buffr_ai.ml_service import get_ml_service
        get_ml_service().initialize()
    except Exception as e:
        logger.warning("ML service init skipped or failed: %s", e)
    postgres_uri = os.getenv("DATABASE_URL") or os.getenv("BUFFR_CHECKPOINT_DATABASE_URL")
    try:
        if postgres_uri:
            async with get_compiled_graph(postgres_uri) as graph:
                app.state.graph = graph
                logger.info("Companion graph ready with Postgres checkpointer")
                yield
        else:
            logger.warning("DATABASE_URL not set; companion graph not available")
            app.state.graph = None
            yield
    finally:
        await close_db_pool()


app = FastAPI(title="Buffr AI Companion", lifespan=lifespan)
app.include_router(companion_router)
app.include_router(ml_router)


@app.get("/health")
async def health():
    """Health check for load balancer and mobile app."""
    ml_available = False
    try:
        from buffr_ai.ml import ML_AVAILABLE
        ml_available = ML_AVAILABLE
    except Exception:
        pass
    return {"status": "ok", "ml_available": ml_available}
