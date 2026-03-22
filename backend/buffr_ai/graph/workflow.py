"""
LangGraph workflow: build_buffr_graph and get_compiled_graph (with Postgres checkpointer).

Location: backend/buffr_ai/graph/workflow.py
Purpose: Single place for graph construction and checkpointer lifecycle (DRY).
"""

from contextlib import asynccontextmanager
from typing import Literal

from langgraph.graph import START, END, StateGraph
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from buffr_ai.graph.state import BuffrAgentState
from buffr_ai.agents.companion.agent import CompanionDeps
from buffr_ai.graph.nodes import (
    companion_node,
    guardian_check_node,
    human_approval_node,
    execute_tool_node,
)


def route_after_companion(state: BuffrAgentState) -> Literal["guardian_check", "end"]:
    """Route to guardian_check when there is a pending action, else end."""
    if state.get("pending_action"):
        return "guardian_check"
    return "end"


def route_after_guardian(state: BuffrAgentState) -> Literal["human_approval", "companion"]:
    """Route to human_approval when no error, else back to companion with error."""
    if state.get("error_message"):
        return "companion"
    return "human_approval"


def _add_nodes_and_edges(builder: StateGraph):
    """Add all nodes and edges to the builder (DRY)."""
    builder.add_node("companion", companion_node)
    builder.add_node("guardian_check", guardian_check_node)
    builder.add_node("human_approval", human_approval_node)
    builder.add_node("execute_tool", execute_tool_node)
    builder.add_edge(START, "companion")
    builder.add_conditional_edges(
        "companion",
        route_after_companion,
        {"guardian_check": "guardian_check", "end": END},
    )
    builder.add_conditional_edges(
        "guardian_check",
        route_after_guardian,
        {"human_approval": "human_approval", "companion": "companion"},
    )
    builder.add_edge("human_approval", "execute_tool")
    builder.add_edge("execute_tool", "companion")


def build_buffr_graph():
    """Build and compile the Buffr companion graph without checkpointer (e.g. tests)."""
    builder = StateGraph(BuffrAgentState, context_schema=CompanionDeps)
    _add_nodes_and_edges(builder)
    return builder.compile()


@asynccontextmanager
async def get_compiled_graph(postgres_uri: str):
    """
    Async context manager: yield a compiled graph with Postgres checkpointer.
    Keep the context open for the app lifetime (e.g. FastAPI lifespan).
    """
    builder = StateGraph(BuffrAgentState, context_schema=CompanionDeps)
    _add_nodes_and_edges(builder)
    async with AsyncPostgresSaver.from_conn_string(postgres_uri) as checkpointer:
        await checkpointer.setup()
        graph = builder.compile(checkpointer=checkpointer)
        yield graph
