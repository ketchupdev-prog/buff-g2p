"""
Companion agent tools: read-only routing to analysts and write-action execution helpers.

Location: backend/buffr_ai/agents/companion/tools.py
Purpose: Used by Pydantic AI agent (read-only) and by graph execute_tool_node (write after approval).
"""

import logging
from typing import Any, Dict, List, Optional

from buffr_ai.knowledge_base import retrieve as kb_retrieve

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Knowledge base (user-isolated: consumer protection, regulation, financial literacy)
# ---------------------------------------------------------------------------

async def search_knowledge_base(query: str, user_id: Optional[str] = None, limit: int = 5) -> str:
    """Search the curated Buffr knowledge base. Results are user-isolated (global + that user only)."""
    try:
        hits = await kb_retrieve(query, user_id=user_id, limit=limit)
    except Exception as e:
        logger.exception("Knowledge base search failed: %s", e)
        return "The knowledge base is temporarily unavailable. Please try again or ask in a different way."
    if not hits:
        return "No matching articles found. You can ask about fees, complaints, redemption, regulations, or financial tips."
    parts = []
    for h in hits:
        parts.append(f"[{h['title']}]\n{h['snippet']}")
    return "\n\n---\n\n".join(parts)


# ---------------------------------------------------------------------------
# Read-only analyst routers (stubs – in production call actual agents/APIs)
# ---------------------------------------------------------------------------

async def route_to_guardian(query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Route a read-only fraud/risk query to the Guardian agent."""
    logger.info("Guardian called with query: %s", query)
    return {"agent": "guardian", "response": f"Guardian analysis for: {query}"}


async def route_to_transaction_analyst(query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Route spending/transaction analysis to the Transaction Analyst agent."""
    logger.info("Transaction Analyst called with query: %s", query)
    return {"agent": "transaction_analyst", "response": f"Spending analysis for: {query}"}


async def route_to_voucher_analyst(query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Route voucher/redemption queries to the Voucher Analyst agent."""
    logger.info("Voucher Analyst called with query: %s", query)
    return {"agent": "voucher_analyst", "response": f"Voucher analysis for: {query}"}


# ---------------------------------------------------------------------------
# Write-action execution (called by graph execute_tool_node after approval)
# ---------------------------------------------------------------------------

async def create_wallet_tool(
    user_id: str,
    auth_token: str,
    name: str,
    wallet_type: str = "savings",
    **kwargs: Any,
) -> Dict[str, Any]:
    """Create a new wallet. In production call backend API with auth_token."""
    logger.info("Creating wallet: %s (%s) for user %s", name, wallet_type, user_id)
    return {"id": "wallet_123", "name": name, "type": wallet_type}


async def create_group_tool(
    user_id: str,
    auth_token: str,
    name: str,
    description: str = "",
    member_ids: Optional[List[str]] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Create a group. In production call backend API."""
    logger.info("Creating group: %s for user %s", name, user_id)
    return {"id": "group_123", "name": name, "member_count": len(member_ids or [])}


async def add_group_members_tool(
    user_id: str,
    auth_token: str,
    group_id: str,
    member_ids: List[str],
    **kwargs: Any,
) -> Dict[str, Any]:
    """Add members to a group."""
    logger.info("Adding %d members to group %s", len(member_ids), group_id)
    return {"group_id": group_id, "added": member_ids}


async def remove_group_member_tool(
    user_id: str,
    auth_token: str,
    group_id: str,
    member_id: str,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Remove a member from a group."""
    logger.info("Removing member %s from group %s", member_id, group_id)
    return {"group_id": group_id, "removed": member_id}


async def transfer_funds_tool(
    user_id: str,
    auth_token: str,
    from_wallet_id: str,
    to_wallet_id: str,
    amount: float,
    verification_token: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Transfer funds between wallets. 2FA verification_token required in production."""
    logger.info("Transferring %s from %s to %s", amount, from_wallet_id, to_wallet_id)
    if not verification_token:
        return {"error": "2FA token required"}
    return {"success": True, "transaction_id": "tx_123"}


async def pay_bill_tool(
    user_id: str,
    auth_token: str,
    bill_id: str,
    amount: float,
    wallet_id: str,
    verification_token: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Pay a bill. In production call backend bill-pay API."""
    logger.info("Paying bill %s amount %s from wallet %s", bill_id, amount, wallet_id)
    return {"success": True, "payment_id": "pay_123"}


async def redeem_voucher_tool(
    user_id: str,
    auth_token: str,
    voucher_id: str,
    target_wallet_id: Optional[str] = None,
    verification_token: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Redeem a voucher to wallet or cash. In production call backend voucher API."""
    logger.info("Redeeming voucher %s for user %s", voucher_id, user_id)
    return {"success": True, "voucher_id": voucher_id}


async def apply_loan_tool(
    user_id: str,
    auth_token: str,
    amount: float,
    voucher_ids: Optional[List[str]] = None,
    verification_token: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Apply for a voucher-backed loan. In production call backend loan API."""
    logger.info("Applying for loan amount %s for user %s", amount, user_id)
    return {"success": True, "loan_id": "loan_123"}


# ---------------------------------------------------------------------------
# Dispatcher for execute_tool_node (DRY: one place mapping action_type → tool)
# ---------------------------------------------------------------------------

ACTION_TOOL_MAP = {
    "create_wallet": create_wallet_tool,
    "create_group": create_group_tool,
    "add_members": add_group_members_tool,
    "remove_member": remove_group_member_tool,
    "transfer_funds": transfer_funds_tool,
    "pay_bill": pay_bill_tool,
    "redeem_voucher": redeem_voucher_tool,
    "apply_loan": apply_loan_tool,
}


async def execute_pending_action(
    user_id: str,
    auth_token: str,
    action_type: str,
    parameters: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute an approved pending action. Used by graph execute_tool_node."""
    fn = ACTION_TOOL_MAP.get(action_type)
    if not fn:
        return {"error": f"Unknown action type: {action_type}"}
    try:
        result = await fn(
            user_id=user_id,
            auth_token=auth_token,
            **{k: v for k, v in parameters.items() if k != "verification_token"},
            verification_token=parameters.get("verification_token"),
        )
        return result
    except Exception as e:
        logger.exception("Execute action %s failed", action_type)
        return {"error": str(e)}
