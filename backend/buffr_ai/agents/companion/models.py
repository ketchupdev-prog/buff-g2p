"""
Pydantic models for the Buffr AI Companion (orchestrator) agent and chat API.

Location: backend/buffr_ai/agents/companion/models.py
Purpose: Single source of truth for PendingAction, CompanionResponse, ChatRequest, ChatResponse (DRY).
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Action and response (used by agent output and graph state)
# ---------------------------------------------------------------------------

ACTION_TYPES = Literal[
    "create_wallet",
    "create_group",
    "add_members",
    "remove_member",
    "transfer_funds",
    "pay_bill",
    "redeem_voucher",
    "apply_loan",
]


class PendingAction(BaseModel):
    """Describes a write action awaiting human approval (HITL)."""

    action_type: ACTION_TYPES
    parameters: Dict[str, Any] = Field(default_factory=dict)
    summary_for_user: str


class CompanionResponse(BaseModel):
    """Orchestrator agent output: message and optional pending action."""

    message: Optional[str] = None
    pending_action: Optional[PendingAction] = None


# ---------------------------------------------------------------------------
# HTTP API (chat endpoint)
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    """Request body for POST /api/buffr-companion/chat."""

    message: Optional[str] = None
    thread_id: str
    resume: Optional[bool | Dict[str, Any]] = None  # If set, pass Command(resume=resume)


class ChatResponse(BaseModel):
    """Response for chat endpoint."""

    status: Literal["ok", "interrupt"]
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    approval_payload: Optional[Dict[str, Any]] = None
    last_tool_result: Optional[str] = None
