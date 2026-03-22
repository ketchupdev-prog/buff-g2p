-- =============================================================================
-- ROLLBACK MIGRATION: 011_copilot_security.sql
-- Purpose: Remove PSD-12 agentic-layer cybersecurity event tracking
-- WARNING: Will delete all copilot security event logs
-- Reference: PSD-12 Cybersecurity requirements for AI agents
-- =============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_copilot_security_type CASCADE;
DROP INDEX IF EXISTS idx_copilot_security_user CASCADE;

-- Drop table
DROP TABLE IF EXISTS copilot_security_events CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All copilot security event logs will be permanently deleted
-- - Prompt injection attempt records will be lost
-- - Tool abuse detection history will be removed
-- - PII in prompt tracking will be deleted
-- 
-- SECURITY WARNING:
-- - AI agent security monitoring will be DISABLED
-- - Prompt injection attacks will go undetected
-- - Tool abuse and suspicious patterns will not be logged
-- - May violate PSD-12 cybersecurity requirements for AI systems
-- 
-- TO RESTORE: Re-run forward migration 011_copilot_security.sql
-- =============================================================================
