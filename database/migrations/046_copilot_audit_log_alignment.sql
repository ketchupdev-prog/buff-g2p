-- Align copilot_audit_log with backend ETA attribution writer.
-- Fixes runtime insert failures when legacy schemas only contain prompt_snippet.

ALTER TABLE copilot_audit_log
  ADD COLUMN IF NOT EXISTS input JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS result TEXT NOT NULL DEFAULT 'success';

COMMENT ON COLUMN copilot_audit_log.input IS 'Structured request payload captured for ETA attribution logging.';
COMMENT ON COLUMN copilot_audit_log.result IS 'Operation result for ETA attribution logging (success|failure).';
