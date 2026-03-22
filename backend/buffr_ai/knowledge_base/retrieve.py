"""
Knowledge base retrieval: user-isolated full-text search over knowledge_base_documents.

Location: backend/buffr_ai/knowledge_base/retrieve.py
Purpose: Used by companion tool search_knowledge_base; filters by scope (global) or (user + user_id).
"""

import json
import logging
from typing import Any, List, Optional

from buffr_ai.db_utils import get_db_pool

logger = logging.getLogger(__name__)


def _normalize_metadata(raw: Any) -> dict:
    """Return a dict from JSONB (asyncpg may return dict or str)."""
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


async def retrieve(
    query: str,
    user_id: Optional[str] = None,
    limit: int = 5,
) -> List[dict]:
    """
    Search the knowledge base with user isolation.
    Returns only rows where scope='global' OR (scope='user' AND user_id = :user_id).
    Uses PostgreSQL full-text search (plainto_tsquery) on content_search.
    """
    if not query or not query.strip():
        return []
    pool = await get_db_pool()
    # Normalize query for plainto_tsquery (single tokens; no syntax)
    q = query.strip().replace("'", " ")[:500]
    rows = await pool.fetch(
        """
        SELECT id, title, source, content, metadata,
               ts_headline('english', content, plainto_tsquery('english', $2), 'MaxFragments=2, MaxWords=50') AS snippet
        FROM knowledge_base_documents
        WHERE (scope = 'global' OR (scope = 'user' AND user_id = $3))
          AND content_search @@ plainto_tsquery('english', $2)
        ORDER BY ts_rank_cd(content_search, plainto_tsquery('english', $2)) DESC
        LIMIT $1
        """,
        limit,
        q,
        user_id or "",
    )
    return [
        {
            "id": str(r["id"]),
            "title": r["title"],
            "source": r["source"],
            "snippet": r["snippet"] or (r["content"][:300] + "…") if r["content"] else "",
            "metadata": _normalize_metadata(r["metadata"]),
        }
        for r in rows
    ]
