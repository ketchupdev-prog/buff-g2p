"""
LangGraph nodes for the Buffr AI Companion workflow (HITL).

Location: backend/buffr_ai/graph/nodes.py
Purpose: companion_node, guardian_check_node, human_approval_node, execute_tool_node.
"""

from typing import Any
from langgraph.runtime import Runtime

from buffr_ai.agents.companion.agent import run_companion, CompanionDeps
from buffr_ai.agents.companion.models import CompanionResponse
from buffr_ai.agents.companion import tools as companion_tools
from buffr_ai.graph.state import BuffrAgentState
from buffr_ai.user_profile import format_user_context
from buffr_ai.conversation_history import (
    store_message,
    format_conversation_for_llm,
    get_user_preferences,
)


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
    """
    Run Pydantic AI orchestrator with personalized conversation history.
    Implements user-isolated memory management for contextual, personalized responses.
    """
    import time
    deps = runtime.context
    last_message = _last_message_content(state)
    
    # Store user message in conversation history
    await store_message(
        user_id=deps.user_id,
        role="user",
        content=last_message,
        conversation_type="chat",
    )
    
    # Get user preferences for personalization
    prefs = await get_user_preferences(deps.user_id)
    
    # Inject conversation history for context (last 10 messages)
    conversation_context = await format_conversation_for_llm(
        user_id=deps.user_id,
        limit=10,
    )
    
    # Inject user profile context
    profile_context = ""
    if deps.user_profile:
        profile_context = format_user_context(deps.user_profile)
    
    # Build enhanced message with context
    enhanced_message = last_message
    if profile_context:
        enhanced_message = f"{profile_context}\n\n{enhanced_message}"
    if conversation_context:
        enhanced_message = f"{conversation_context}\n\n{enhanced_message}"
    
    # Add personalization preferences to context
    if prefs.get("preferred_name"):
        enhanced_message = f"[User prefers to be called: {prefs.get('preferred_name')}]\n\n{enhanced_message}"
    if prefs.get("communication_style") and prefs.get("communication_style") != "balanced":
        enhanced_message = f"[Communication style: {prefs.get('communication_style')}]\n\n{enhanced_message}"
    
    # Run companion with enhanced context
    start_time = time.time()
    try:
        response = await run_companion(enhanced_message, deps)
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("companion_node run_companion failed: %s", e)
        response = CompanionResponse(
            message="I ran into an issue. Please try again or rephrase your question.",
            pending_action=None,
        )
    response_time_ms = int((time.time() - start_time) * 1000)
    
    # Store assistant response in conversation history
    await store_message(
        user_id=deps.user_id,
        role="assistant",
        content=response.message or "Done.",
        conversation_type="chat",
        response_time_ms=response_time_ms,
        model_used="gpt-4o",  # TODO: Make dynamic based on LLM_MODEL env var
        metadata={
            "has_pending_action": bool(response.pending_action),
            "action_type": response.pending_action.action_type if response.pending_action else None,
        },
    )
    
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
    """
    Assess risk for pending_action. If high risk, set error and clear pending_action.
    
    Risk Scoring System (0.0 - 1.0):
    - 0.0 - 0.3: Low risk (read-only operations)
    - 0.3 - 0.6: Medium risk (standard transactions within limits)
    - 0.6 - 0.8: High risk (large amounts, unusual patterns)
    - 0.8 - 1.0: Critical risk (suspicious activity, policy violations)
    
    Location: backend/buffr_ai/graph/nodes.py
    """
    action = state.get("pending_action")
    if not action:
        return {}
    
    # Calculate risk score based on action type and parameters
    risk_score = _calculate_risk_score(action, state)
    
    # Log risk assessment
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Guardian risk assessment: {action.action_type} = {risk_score:.2f}")
    
    # High risk threshold: 0.6
    if risk_score > 0.6:
        return {
            "error_message": f"This action was flagged as high risk (score: {risk_score:.2f}). Declined for safety.",
            "pending_action": None,
            "approval_granted": None,
        }
    
    # Medium risk: proceed but log for audit
    if risk_score > 0.3:
        logger.warning(f"Medium risk action approved: {action.action_type} (score: {risk_score:.2f})")
    
    return {}


def _calculate_risk_score(action: Any, state: BuffrAgentState) -> float:
    """
    Calculate risk score based on action type and parameters.
    
    Risk factors:
    1. Action type (send_money > create_wallet)
    2. Transaction amount (higher = riskier)
    3. Frequency (rapid repeated actions)
    4. User history (new users = higher risk)
    5. Unusual patterns (large amounts, off-hours)
    6. ML fraud probability when ML_AVAILABLE and amount present (graceful fallback on error).
    """
    from datetime import datetime

    base_risk = {
        "create_wallet": 0.1,
        "create_group": 0.2,
        "send_money": 0.4,
        "make_payment": 0.5,
        "link_bank_account": 0.3,
        "initiate_loan": 0.6,
        "update_profile": 0.1,
        "unknown": 0.5,
    }
    
    action_type = getattr(action, "action_type", "unknown")
    params = getattr(action, "parameters", {}) or {}
    
    # Start with base risk for action type
    risk = base_risk.get(action_type, 0.5)
    
    # Factor 1: Transaction amount
    if "amount" in params:
        try:
            amount = float(params["amount"])
            # High amounts increase risk
            if amount > 50000:  # DAILY_CASHOUT_LIMIT_NAD
                risk += 0.3
            elif amount > 20000:  # DAILY_SEND_LIMIT_NAD
                risk += 0.2
            elif amount > 10000:
                risk += 0.1
            # Very small amounts also suspicious (structuring)
            elif amount < 10:
                risk += 0.1
        except (ValueError, TypeError):
            pass
    
    # ML-enhanced risk when amount present (per ML_INTEGRATION_GUIDE §5.1)
    if "amount" in params:
        try:
            from buffr_ai.ml import ML_AVAILABLE
            if ML_AVAILABLE:
                from buffr_ai.ml_service import predict_fraud
                now = datetime.utcnow()
                features = {
                    "amount": float(params.get("amount", 0)),
                    "hour_of_day": now.hour,
                    "day_of_week": now.weekday(),
                    "transaction_frequency": 5,
                    "avg_transaction_amount": float(params.get("amount", 0)),
                    "distance_from_home": 0.0,
                    "device_score": 0.9,
                    "account_age_days": 90,
                    "num_failed_attempts": 0,
                    "velocity_1h": 0,
                    "velocity_24h": 5,
                    "merchant_category": 0,
                    "country_risk_score": 0.1,
                }
                ml_result = predict_fraud(features)
                fraud_prob = ml_result.prediction if isinstance(ml_result.prediction, (int, float)) else 0.0
                risk = max(risk, float(fraud_prob))
        except Exception:
            pass  # Keep rule-based risk on ML failure (Boy Scout: don't break existing behavior)
    
    # Factor 2: Recipient validation
    if action_type == "send_money" and "recipient" in params:
        recipient = params.get("recipient", "")
        # New/unverified recipient = higher risk
        if not recipient or len(str(recipient)) < 5:
            risk += 0.15
    
    # Factor 3: Unusual timing (not implemented - would check time of day)
    # In production: check if action is at unusual hours (2am - 5am) -> +0.1
    
    # Factor 4: Rapid repeat actions
    messages = state.get("messages") or []
    if len(messages) > 5:
        # Check if this is the 3rd+ action of same type in short sequence
        recent_actions = [
            getattr(msg, "action_type", None) 
            for msg in messages[-5:] 
            if hasattr(msg, "action_type")
        ]
        if recent_actions.count(action_type) >= 2:
            risk += 0.2  # Repeated action pattern
    
    # Cap risk at 1.0
    return min(risk, 1.0)


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
