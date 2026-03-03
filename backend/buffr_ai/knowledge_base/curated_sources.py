"""
Curated list of Buffr doc paths for consumer protection, regulation, financial literacy.

Location: backend/buffr_ai/knowledge_base/curated_sources.py
Purpose: Single source for ingest script; paths relative to repo root. See docs/CURATED_KNOWLEDGE_BASE.md.
"""

from pathlib import Path
from typing import List, Tuple

# Repo root: backend/buffr_ai/knowledge_base -> backend -> repo root
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# (relative_path, title, optional_section_hint for metadata)
# Only the consolidated KB is ingested; no internal code or IP-bearing files.
CURATED_GLOBAL_SOURCES: List[Tuple[str, str, str]] = [
    ("docs/buffr_knowledge_base.md", "Buffr Knowledge Base – consumer protection, regulation, financial literacy, NamPost & biometric", "full_kb"),
]


def get_absolute_path(relative_path: str) -> Path:
    """Return absolute path for a curated source (repo root + relative_path)."""
    return _REPO_ROOT / relative_path
