-- =============================================================================
-- ROLLBACK MIGRATION: 045_pin_lockout.sql
-- Purpose: Remove PIN verification lockout tracking columns
-- WARNING: This will disable PIN lockout security feature
-- Reference: PSD-12 Art. 4(30) - Strong customer authentication
-- Reference: PSD-3 Art. 74 - Security requirements for electronic communications
-- =============================================================================

-- Remove PIN lockout columns
ALTER TABLE users DROP COLUMN IF EXISTS pin_locked_until CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS pin_failed_attempts CASCADE;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
-- IRREVERSIBLE OPERATIONS:
-- - Current PIN lockout states will be lost
-- - Failed attempt counters will be reset
-- 
-- SECURITY WARNING:
-- - PIN brute-force protection will be DISABLED
-- - Users will have unlimited PIN verification attempts
-- - May violate PSD-12 Art. 4(30) strong customer authentication requirements
-- 
-- RECOMMENDED ACTIONS BEFORE ROLLBACK:
-- 1. Implement alternative PIN protection mechanism
-- 2. Review security policy for SCA compliance
-- 3. Notify security team of reduced protection
-- 
-- TO RESTORE: Re-run forward migration 045_pin_lockout.sql
-- =============================================================================
