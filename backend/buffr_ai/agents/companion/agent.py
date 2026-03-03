"""
Buffr AI Companion (orchestrator) agent: Pydantic AI agent and run_companion.

Location: backend/buffr_ai/agents/companion/agent.py
Purpose: Single agent definition; tools delegate to agents/companion/tools.py (DRY).
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional

from pydantic_ai import Agent, RunContext

from buffr_ai.providers import get_llm_model

from .models import CompanionResponse, PendingAction
from .prompts import COMPANION_SYSTEM_PROMPT
from . import tools as companion_tools


@dataclass
class CompanionDeps:
    """Dependencies injected into the companion agent and graph nodes."""

    user_id: str
    auth_token: str
    # Optional: backend client, analyst agents, etc.


# ---------------------------------------------------------------------------
# Tool wrappers for Pydantic AI (ctx.deps available)
# ---------------------------------------------------------------------------

async def _route_to_guardian(ctx: RunContext[CompanionDeps], query: str, context: Optional[Dict[str, Any]] = None) -> str:
    """Route a read-only fraud/risk query to the Guardian agent."""
    result = await companion_tools.route_to_guardian(query, context)
    return str(result.get("response", result))


async def _route_to_transaction_analyst(ctx: RunContext[CompanionDeps], query: str, context: Optional[Dict[str, Any]] = None) -> str:
    """Route spending/transaction analysis to the Transaction Analyst agent."""
    result = await companion_tools.route_to_transaction_analyst(query, context)
    return str(result.get("response", result))


async def _route_to_voucher_analyst(ctx: RunContext[CompanionDeps], query: str, context: Optional[Dict[str, Any]] = None) -> str:
    """Route voucher/redemption queries to the Voucher Analyst agent."""
    result = await companion_tools.route_to_voucher_analyst(query, context)
    return str(result.get("response", result))


async def _search_knowledge_base(ctx: RunContext[CompanionDeps], query: str) -> str:
    """Search the curated Buffr knowledge base (consumer protection, regulation, financial literacy). User-isolated."""
    return await companion_tools.search_knowledge_base(query, user_id=ctx.deps.user_id, limit=5)


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

companion_agent = Agent(
    get_llm_model(),
    deps_type=CompanionDeps,
    output_type=CompanionResponse,
    system_prompt=COMPANION_SYSTEM_PROMPT,
)

companion_agent.tool(_route_to_guardian)
companion_agent.tool(_route_to_transaction_analyst)
companion_agent.tool(_route_to_voucher_analyst)
companion_agent.tool(_search_knowledge_base)


async def run_companion(user_message: str, deps: CompanionDeps) -> CompanionResponse:
    """Run the companion agent; used by LangGraph companion_node."""
    result = await companion_agent.run(user_message, deps=deps)
    return result.output
