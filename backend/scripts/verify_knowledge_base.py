#!/usr/bin/env python3
"""
Verify the Buffr AI knowledge base is populated (for testing and debugging).

Location: backend/scripts/verify_knowledge_base.py
Purpose: Check that knowledge_base_documents has content and optionally run a sample search.
Usage: cd backend && PYTHONPATH=. python scripts/verify_knowledge_base.py
"""

import asyncio
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

from buffr_ai.db_utils import get_db_pool, close_db_pool
from buffr_ai.knowledge_base.retrieve import retrieve


async def main() -> None:
    if not os.getenv("DATABASE_URL"):
        print("DATABASE_URL not set. Set it in backend/.env", file=sys.stderr)
        sys.exit(1)

    pool = await get_db_pool()
    try:
        # Count global documents
        row = await pool.fetchrow(
            "SELECT count(*) AS n FROM knowledge_base_documents WHERE scope = 'global' AND user_id IS NULL"
        )
        count = row["n"] if row else 0
        print(f"Global knowledge base documents: {count}")

        if count == 0:
            print("Run: PYTHONPATH=. python scripts/ingest_knowledge_base.py")
            sys.exit(1)

        # Sample search
        hits = await retrieve("redeem voucher", user_id=None, limit=2)
        print(f"Sample search 'redeem voucher': {len(hits)} hit(s)")
        for i, h in enumerate(hits[:2], 1):
            print(f"  {i}. {h.get('title', '')} (source: {h.get('source', '')})")
            snippet = (h.get("snippet") or "")[:200]
            if snippet:
                print(f"     Snippet: {snippet}...")
    finally:
        await close_db_pool()

    print("Knowledge base verification OK.")


if __name__ == "__main__":
    asyncio.run(main())
