"""
Knowledge base for Buffr AI Companion: curated consumer protection, regulation, financial literacy.

Location: backend/buffr_ai/knowledge_base/
Purpose: User-isolated retrieval and ingest; see docs/CURATED_KNOWLEDGE_BASE.md.
"""

from buffr_ai.knowledge_base.retrieve import retrieve

__all__ = ["retrieve"]
