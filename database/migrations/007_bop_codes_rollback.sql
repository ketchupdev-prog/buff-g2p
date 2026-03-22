-- =============================================================================
-- ROLLBACK MIGRATION: 007_bop_codes.sql
-- Purpose: Remove PSD-9 BoP code mapping for cross-border EFT
-- WARNING: Will delete all balance of payments code mappings
-- Reference: PSD-9 Cross-border EFT requirements, BoN regulations
-- =============================================================================

DROP TABLE IF EXISTS bop_codes CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All BoP code mappings will be permanently deleted
-- - Documentation requirements by transaction type will be lost
-- - Amount thresholds for documentation-free transfers will be removed
-- 
-- SEEDED DATA LOST:
-- - 9 standard BoP codes (imports, exports, remittances, etc.)
-- - Documentation thresholds for each category
-- 
-- IMPACT:
-- - Cross-border EFT classification will fail
-- - BoN regulatory reporting will be incomplete
-- - May violate PSD-9 balance of payments reporting requirements
-- 
-- TO RESTORE: Re-run forward migration 007_bop_codes.sql
-- =============================================================================
