-- Buffr G2P – Knowledge base for AI companion (consumer protection, regulation, financial literacy).
-- User-isolated: scope 'global' (curated, shared) or 'user' (user_id set). Retrieval filters by scope + user_id.
-- Run after 007. Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope             VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'user')),
  user_id           TEXT,
  title             TEXT NOT NULL,
  source            TEXT NOT NULL,
  content           TEXT NOT NULL,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kb_docs_user_scope CHECK (scope != 'user' OR user_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_documents_global_source
  ON knowledge_base_documents (source) WHERE scope = 'global' AND user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_documents_user_source
  ON knowledge_base_documents (user_id, source) WHERE scope = 'user';

CREATE INDEX IF NOT EXISTS idx_kb_documents_scope_user ON knowledge_base_documents(scope, user_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_source ON knowledge_base_documents(source);

-- Full-text search over title + content (English; optional simple config)
ALTER TABLE knowledge_base_documents ADD COLUMN IF NOT EXISTS content_search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_kb_documents_content_search ON knowledge_base_documents USING GIN(content_search);

COMMENT ON TABLE knowledge_base_documents IS 'Curated and user-isolated knowledge for Buffr AI companion: consumer protection, regulation, financial literacy';
COMMENT ON COLUMN knowledge_base_documents.scope IS 'global = shared curated content; user = per-user content (user_id required)';
COMMENT ON COLUMN knowledge_base_documents.content_search IS 'Generated tsvector for full-text search; do not set manually';
