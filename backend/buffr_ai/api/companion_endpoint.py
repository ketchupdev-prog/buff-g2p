"""
FastAPI router for the Buffr AI Companion chat (HITL).

Location: backend/buffr_ai/api/companion_endpoint.py
Purpose: POST /chat with thread_id and optional resume; uses graph on app.state.
        Resolves user profile from Node API (Authorization) for Companion context (DRY).
"""

from typing import Any, List

import logging
from fastapi import APIRouter, Depends, Request, HTTPException
from langgraph.types import Command
import psycopg

from buffr_ai.agents.companion.agent import CompanionDeps
from buffr_ai.agents.companion.models import ChatRequest, ChatResponse
from buffr_ai.graph.workflow import get_compiled_graph
from buffr_ai.user_profile import fetch_user_profile

router = APIRouter(prefix="/api/buffr-companion", tags=["companion"])
_log = logging.getLogger(__name__)


def _is_connection_error(exc: BaseException) -> bool:
    """True if the error is a transient Postgres connection/SSL failure (e.g. Neon idle close)."""
    def check(e: BaseException | None) -> bool:
        if e is None:
            return False
        if isinstance(e, psycopg.OperationalError):
            msg = (e.args[0] if e.args else "").lower()
            return "ssl" in msg or "connection" in msg or "closed" in msg or "terminated" in msg
        return check(getattr(e, "__cause__", None))
    return check(exc)


def _messages_to_dicts(messages: List[Any]) -> List[dict[str, Any]]:
    """Convert LangGraph/LangChain message objects to plain dicts for JSON response."""
    out = []
    for m in messages or []:
        if isinstance(m, dict):
            out.append(m)
            continue
        role = getattr(m, "type", None) or type(m).__name__
        if "human" in role.lower() or "user" in role.lower():
            role = "user"
        elif "ai" in role.lower() or "assistant" in role.lower():
            role = "assistant"
        else:
            role = "assistant"
        content = getattr(m, "content", str(m))
        if isinstance(content, list):
            content = " ".join(
                getattr(part, "text", str(part)) for part in content if hasattr(part, "text")
            ) or str(content)
        out.append({"role": role, "content": content})
    return out


async def get_deps(request: Request) -> CompanionDeps:
    """Build CompanionDeps: resolve user from Authorization and fetch profile from Node API (DRY)."""
    auth_header = request.headers.get("Authorization") or ""
    token = auth_header.strip()
    if token.startswith("Bearer "):
        token = token[7:].strip()
    user_profile = await fetch_user_profile(auth_header) if auth_header else None
    user_id = (user_profile.get("id") if user_profile else None) or "user-123"
    if not user_profile and auth_header:
        _log.info(
            "Companion: no user profile (set BUFFR_API_BASE_URL in backend/.env and ensure Node API is running)"
        )
    return CompanionDeps(
        user_id=str(user_id),
        auth_token=auth_header,
        user_profile=user_profile,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request, deps: CompanionDeps = Depends(get_deps)) -> ChatResponse:
    """Send a message or resume after human approval. Requires graph on request.app.state."""
    graph = getattr(request.app.state, "graph", None)
    if graph is None:
        raise HTTPException(
            status_code=503,
            detail="Companion graph not ready. Ensure lifespan started with DATABASE_URL.",
        )
    config: dict[str, Any] = {"configurable": {"thread_id": req.thread_id}}

    async def _invoke():
        if req.resume is not None:
            return await graph.ainvoke(Command(resume=req.resume), config=config, context=deps)
        if not req.message:
            raise HTTPException(status_code=400, detail="message required when resume is not set")
        return await graph.ainvoke(
            {"messages": [{"role": "user", "content": req.message}]},
            config=config,
            context=deps,
        )

    try:
        result = await _invoke()
    except Exception as e:
        if _is_connection_error(e):
            _log.warning("Companion checkpointer connection error (retrying once): %s", e)
            result = await _invoke()
        else:
            raise

    if "__interrupt__" in result:
        return ChatResponse(status="interrupt", approval_payload=result["__interrupt__"])
    return ChatResponse(
        status="ok",
        messages=_messages_to_dicts(result.get("messages", [])),
        last_tool_result=result.get("last_tool_result"),
    )
