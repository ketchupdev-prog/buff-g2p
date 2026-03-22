"""
Pydantic models for the Smartpay AI Copilot (orchestrator) agent and chat API.

Location: backend_python/smartpay_ai/agents/copilot/models.py
Purpose: Single source of truth for PendingAction, CopilotResponse, ChatRequest, ChatResponse (DRY).
         CopilotDeps lives in agents/copilot/agent.py (extends BaseAgentDeps).
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
    "transfer_money",
    "pay_bill",
    "split_bill",
    "contribute_to_group",
    "send_from_group",
    "redeem_voucher",
    "apply_loan",
    "initiate_cashout",
    "join_group",
]


class PendingAction(BaseModel):
    """Describes a write action awaiting human approval (HITL)."""

    action_type: ACTION_TYPES
    parameters: Dict[str, Any] = Field(default_factory=dict)
    summary_for_user: str
    risk_level: Literal["low", "medium", "high"] = "low"


class CopilotResponse(BaseModel):
    """Orchestrator agent output: message and optional pending action. Message is always populated for display."""

    message: Optional[str] = Field(default="I'm sorry, I couldn't complete that. Please try again or rephrase.")
    pending_action: Optional[PendingAction] = None
    suggested_followups: List[str] = Field(default_factory=list)
    intent: Optional[str] = None


# ---------------------------------------------------------------------------
# HTTP API (chat endpoint)
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    """Request body for POST /api/v1/copilot/chat."""

    message: Optional[str] = None
    user_id: Optional[str] = None  # Optional - extracted from Authorization header if not provided
    thread_id: str
    resume: Optional[bool | Dict[str, Any]] = None  # If set, pass Command(resume=resume)


class ChatResponse(BaseModel):
    """Response for chat endpoint."""

    status: Literal["ok", "interrupt"]
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    approval_payload: Optional[Dict[str, Any]] = None
    last_tool_result: Optional[str] = None
    thread_id: str
