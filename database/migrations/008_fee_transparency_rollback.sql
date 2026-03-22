-- =============================================================================
-- ROLLBACK MIGRATION: 008_fee_transparency.sql
-- Purpose: Remove PSD-10 fee transparency & cap schedule
-- WARNING: Will delete all transaction fee configurations
-- Reference: PSD-10 Fee transparency requirements
-- =============================================================================

DROP TABLE IF EXISTS transaction_fee_schedule CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All transaction fee schedules will be permanently deleted
-- - Fee tier configurations will be lost
-- - Fee caps by channel and transaction type will be removed
-- - Historical fee structure data will be deleted
-- 
-- IMPACT:
-- - Fee calculation will fail (no fee schedule)
-- - May violate PSD-10 fee transparency requirements
-- - VAT tracking will be disabled
-- 
-- REQUIRED ACTIONS AFTER ROLLBACK:
-- 1. Implement alternative fee calculation mechanism
-- 2. Hard-code fees or use external configuration
-- 3. Update backend fee calculation logic
-- 
-- TO RESTORE: Re-run forward migration 008_fee_transparency.sql
-- =============================================================================
