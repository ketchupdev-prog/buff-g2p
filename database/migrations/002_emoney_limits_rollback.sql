-- =============================================================================
-- ROLLBACK MIGRATION: 002_emoney_limits.sql
-- Purpose: Remove PSD-3 e-money transaction and balance limits
-- WARNING: Will disable transaction limit enforcement
-- Reference: PSD-3 E-money directive, BoN regulations
-- =============================================================================

-- Drop monthly totals table
DROP TABLE IF EXISTS emoney_monthly_totals CASCADE;

-- Drop daily totals table
DROP TABLE IF EXISTS emoney_daily_totals CASCADE;

-- Drop limits configuration table
DROP TABLE IF EXISTS emoney_limits CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - All e-money limit configurations (basic/standard/premium) will be deleted
-- - Daily transaction totals tracking will be removed
-- - Monthly transaction totals tracking will be removed
-- 
-- COMPLIANCE WARNING:
-- - Transaction limit enforcement will be DISABLED
-- - May violate PSD-3 e-money requirements
-- - BoN regulatory compliance at risk
-- 
-- REQUIRED ACTIONS AFTER ROLLBACK:
-- 1. Implement alternative transaction limit mechanism
-- 2. Update backend to remove limit checks
-- 3. Notify compliance team of regulatory impact
-- 
-- TO RESTORE: Re-run forward migration 002_emoney_limits.sql
-- =============================================================================
