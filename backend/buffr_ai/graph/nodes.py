"""
LangGraph nodes for the Buffr AI Companion workflow (HITL).

Location: backend/buffr_ai/graph/nodes.py
Purpose: companion_node, guardian_check_node, human_approval_node, execute_tool_node.
"""

from langgraph.runtime import Runtime

from buffr_ai.agents.companion.agent import run_companion, CompanionDeps
from buffr_ai.agents.companion import tools as companion_tools
from buffr_ai.graph.state import BuffrAgentState


def _last_message_content(state: BuffrAgentState) -> str:
    """Extract content from the last message (dict or BaseMessage)."""
    messages = state.get("messages") or []
    if not messages:
        return ""
    last = messages[-1]
    if hasattr(last, "content"):
        return getattr(last, "content") or ""
    if isinstance(last, dict):
        return last.get("content") or ""
    return ""


async def companion_node(state: BuffrAgentState, runtime: Runtime[CompanionDeps]) -> dict:
    """Run Pydantic AI orchestrator; if it returns a pending action, pass it to state."""
    deps = runtime.context
    last_message = _last_message_content(state)
    response = await run_companion(last_message, deps)
    update: dict = {
        "last_tool_result": None,
        "error_message": None,
    }
    if response.pending_action:
        update["pending_action"] = response.pending_action
        update["messages"] = [{"role": "assistant", "content": response.message or "Please approve this action."}]
    else:
        update["pending_action"] = None
        update["messages"] = [{"role": "assistant", "content": response.message or "Done."}]
    return update


def guardian_check_node(state: BuffrAgentState) -> dict:
    """Assess risk for pending_action. If high risk, set error and clear pending_action."""
    action = state.get("pending_action")
    if not action:
        return {}
    # In practice: call Guardian agent/API, get risk score
    risk_score = 0.2  # placeholder
    if risk_score > 0.6:
        return {
            "error_message": "This action was flagged as high risk. Declined.",
            "pending_action": None,
            "approval_granted": None,
        }
    return {}


def human_approval_node(state: BuffrAgentState):
    """Pause for human approval. interrupt() returns the value passed to Command(resume=...)."""
    from langgraph.types import interrupt

    action = state.get("pending_action")
    if not action:
        return {}
    payload = {
        "action_type": action.action_type,
        "parameters": action.parameters,
        "summary_for_user": action.summary_for_user,
    }
    approved = interrupt(payload)
    return {
        "approval_granted": approved is True or (isinstance(approved, dict) and approved.get("approved") is True),
    }


async def execute_tool_node(state: BuffrAgentState, runtime: Runtime[CompanionDeps]) -> dict:
    """Execute the approved action via companion tools (backend/2FA in production)."""
    deps = runtime.context
    if not state.get("approval_granted") or not state.get("pending_action"):
        return {"last_tool_result": "No approved action to execute.", "pending_action": None, "approval_granted": None}
    action = state["pending_action"]
    result = await companion_tools.execute_pending_action(
        user_id=deps.user_id,
        auth_token=deps.auth_token,
        action_type=action.action_type,
        parameters=action.parameters,
    )
    return {
        "last_tool_result": str(result),
        "pending_action": None,
        "approval_granted": None,
    }
