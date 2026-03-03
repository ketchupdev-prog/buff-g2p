#!/usr/bin/env python3
"""
Ingest curated Buffr docs into knowledge_base_documents (scope=global).

Location: backend/scripts/ingest_knowledge_base.py
Purpose: Run after migration 008. Reads paths from buffr_ai.knowledge_base.curated_sources.
Usage: cd backend && PYTHONPATH=. python scripts/ingest_knowledge_base.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Load backend/.env before importing buffr_ai
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

from buffr_ai.db_utils import get_db_pool, close_db_pool
from buffr_ai.knowledge_base.curated_sources import CURATED_GLOBAL_SOURCES, get_absolute_path


async def main() -> None:
    if not os.getenv("DATABASE_URL"):
        print("DATABASE_URL not set. Set it in backend/.env", file=sys.stderr)
        sys.exit(1)
    pool = await get_db_pool()
    ingested = 0
    skipped = 0
    for relative_path, title, section_hint in CURATED_GLOBAL_SOURCES:
        abspath = get_absolute_path(relative_path)
        if not abspath.exists():
            print(f"Skip (missing): {relative_path}")
            skipped += 1
            continue
        try:
            content = abspath.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            print(f"Skip (read error): {relative_path} – {e}")
            skipped += 1
            continue
        metadata = {"section": section_hint, "path": relative_path}
        await pool.execute(
            """
            INSERT INTO knowledge_base_documents (scope, user_id, title, source, content, metadata)
            VALUES ('global', NULL, $1, $2, $3, $4)
            ON CONFLICT (source) WHERE scope = 'global' AND user_id IS NULL
            DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, metadata = EXCLUDED.metadata
            """,
            title,
            relative_path,
            content,
            metadata,
        )
        print(f"Ingested: {relative_path}")
        ingested += 1
    await close_db_pool()
    print(f"Done. Ingested={ingested}, Skipped={skipped}")


if __name__ == "__main__":
    asyncio.run(main())
