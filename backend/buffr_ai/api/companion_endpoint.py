"""
FastAPI router for the Buffr AI Companion chat (HITL).

Location: backend/buffr_ai/api/companion_endpoint.py
Purpose: POST /chat with thread_id and optional resume; uses graph on app.state.
"""

from typing import Any, List

from fastapi import APIRouter, Depends, Request, HTTPException
from langgraph.types import Command

from buffr_ai.agents.companion.agent import CompanionDeps
from buffr_ai.agents.companion.models import ChatRequest, ChatResponse
from buffr_ai.graph.workflow import get_compiled_graph

router = APIRouter(prefix="/api/buffr-companion", tags=["companion"])


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


async def get_deps() -> CompanionDeps:
    """Build CompanionDeps (in production: resolve user_id and auth_token from JWT)."""
    return CompanionDeps(user_id="user-123", auth_token="Bearer ...")


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

    if req.resume is not None:
        result = await graph.ainvoke(Command(resume=req.resume), config=config, context=deps)
    else:
        if not req.message:
            raise HTTPException(status_code=400, detail="message required when resume is not set")
        result = await graph.ainvoke(
            {"messages": [{"role": "user", "content": req.message}]},
            config=config,
            context=deps,
        )

    if "__interrupt__" in result:
        return ChatResponse(status="interrupt", approval_payload=result["__interrupt__"])
    return ChatResponse(
        status="ok",
        messages=_messages_to_dicts(result.get("messages", [])),
        last_tool_result=result.get("last_tool_result"),
    )
