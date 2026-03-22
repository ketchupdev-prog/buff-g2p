"""
LangGraph state for the Buffr AI Companion workflow (HITL).

Location: backend/buffr_ai/graph/state.py
Purpose: Single state shape; PendingAction imported from companion models (DRY).
"""

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages

from buffr_ai.agents.companion.models import PendingAction


class BuffrAgentState(TypedDict):
    """State for the Buffr companion graph."""

    messages: Annotated[list, add_messages]
    pending_action: PendingAction | None
    approval_granted: bool | None
    last_tool_result: str | None
    error_message: str | None
