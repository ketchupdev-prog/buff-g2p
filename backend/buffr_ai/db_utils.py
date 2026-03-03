"""
Database pool and LangGraph Postgres checkpointer for Buffr AI.

Location: backend/buffr_ai/db_utils.py
Purpose: Shared asyncpg pool and AsyncPostgresSaver for conversation state persistence (HITL resume).
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import asyncpg
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_db_pool() -> asyncpg.Pool:
    """Create or return the shared asyncpg pool. Requires DATABASE_URL."""
    global _pool
    if _pool is None:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL not set")
        _pool = await asyncpg.create_pool(database_url, min_size=1, max_size=10)
        logger.info("Database pool created")
    return _pool


async def close_db_pool() -> None:
    """Close the shared pool (e.g. on app shutdown)."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")


@asynccontextmanager
async def get_checkpointer() -> AsyncIterator[AsyncPostgresSaver]:
    """Yield an AsyncPostgresSaver wired to DATABASE_URL. Caller must run setup()."""
    conn_string = os.getenv("DATABASE_URL") or os.getenv("BUFFR_CHECKPOINT_DATABASE_URL")
    if not conn_string:
        raise RuntimeError("DATABASE_URL or BUFFR_CHECKPOINT_DATABASE_URL not set")
    async with AsyncPostgresSaver.from_conn_string(conn_string) as checkpointer:
        await checkpointer.setup()
        yield checkpointer
