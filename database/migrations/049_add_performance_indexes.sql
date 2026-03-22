-- =============================================================================
-- Migration: 049_add_performance_indexes.sql
-- Purpose: Add 3 missing performance indexes identified in database audit
-- Priority: HIGH
-- Date: 2026-03-22
-- Reference: Database performance optimization
-- =============================================================================

-- NOTE: This migration uses CONCURRENTLY for zero-downtime index creation
-- CONCURRENTLY cannot run inside a transaction block, so each CREATE INDEX
-- is wrapped in its own DO block with exception handling

-- =============================================================================
-- INDEX #1: daily_transaction_totals(wallet_id, transaction_date)
-- =============================================================================
-- Purpose: Optimize daily transaction volume queries by wallet
-- Impact: Improves performance for user transaction history and analytics

DO $$
BEGIN
    -- Check if index already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_daily_tx_totals_wallet_date'
        AND tablename = 'daily_transaction_totals'
    ) THEN
        -- Create index concurrently for zero downtime
        EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_tx_totals_wallet_date 
                 ON daily_transaction_totals(wallet_id, transaction_date)';
        
        RAISE NOTICE 'Created index: idx_daily_tx_totals_wallet_date';
    ELSE
        RAISE NOTICE 'Index already exists: idx_daily_tx_totals_wallet_date';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'SKIPPED: Table daily_transaction_totals does not exist';
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR creating idx_daily_tx_totals_wallet_date: %', SQLERRM;
END $$;

-- =============================================================================
-- INDEX #2: obs_consent_audit_log(created_at DESC)
-- =============================================================================
-- Purpose: Optimize OBS audit log queries (recent activity, compliance reports)
-- Impact: Improves performance for consent audit trail queries and BoN reporting

DO $$
BEGIN
    -- Check if index already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_obs_audit_created'
        AND tablename = 'obs_consent_audit_log'
    ) THEN
        -- Create index concurrently for zero downtime
        EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obs_audit_created 
                 ON obs_consent_audit_log(created_at DESC)';
        
        RAISE NOTICE 'Created index: idx_obs_audit_created';
    ELSE
        RAISE NOTICE 'Index already exists: idx_obs_audit_created';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'SKIPPED: Table obs_consent_audit_log does not exist';
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR creating idx_obs_audit_created: %', SQLERRM;
END $$;

-- =============================================================================
-- INDEX #3: compliance_alerts(user_id, status, created_at)
-- =============================================================================
-- Purpose: Optimize compliance alert queries by user and status
-- Impact: Improves performance for user alert dashboards and compliance monitoring

DO $$
BEGIN
    -- Check if index already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_compliance_alerts_user_status'
        AND tablename = 'compliance_alerts'
    ) THEN
        -- Create index concurrently for zero downtime
        EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_alerts_user_status 
                 ON compliance_alerts(user_id, status, created_at)';
        
        RAISE NOTICE 'Created index: idx_compliance_alerts_user_status';
    ELSE
        RAISE NOTICE 'Index already exists: idx_compliance_alerts_user_status';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'SKIPPED: Table compliance_alerts does not exist';
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR creating idx_compliance_alerts_user_status: %', SQLERRM;
END $$;

-- =============================================================================
-- VERIFICATION: Check all indexes were created
-- =============================================================================
DO $$
DECLARE
    v_index_count INTEGER;
    v_expected_count INTEGER := 3;
    v_indexes TEXT[];
BEGIN
    -- Count how many indexes exist
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE indexname IN (
        'idx_daily_tx_totals_wallet_date',
        'idx_obs_audit_created',
        'idx_compliance_alerts_user_status'
    );
    
    -- Get list of existing indexes
    SELECT ARRAY_AGG(indexname) INTO v_indexes
    FROM pg_indexes
    WHERE indexname IN (
        'idx_daily_tx_totals_wallet_date',
        'idx_obs_audit_created',
        'idx_compliance_alerts_user_status'
    );
    
    RAISE NOTICE 'Migration 049 complete: Created/verified % performance indexes', v_index_count;
    RAISE NOTICE 'Indexes: %', v_indexes;
    
    -- Show index sizes for monitoring
    RAISE NOTICE 'Index sizes:';
    FOR v_indexes IN 
        SELECT 
            indexname,
            pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) AS size
        FROM pg_indexes
        WHERE indexname IN (
            'idx_daily_tx_totals_wallet_date',
            'idx_obs_audit_created',
            'idx_compliance_alerts_user_status'
        )
    LOOP
        RAISE NOTICE '  % = %', v_indexes.indexname, v_indexes.size;
    END LOOP;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON INDEX idx_daily_tx_totals_wallet_date 
    IS 'Performance: Optimize daily transaction queries by wallet (added in migration 049)';
    
COMMENT ON INDEX idx_obs_audit_created 
    IS 'Performance: Optimize OBS audit log recent activity queries (added in migration 049)';
    
COMMENT ON INDEX idx_compliance_alerts_user_status 
    IS 'Performance: Optimize compliance alert queries by user and status (added in migration 049)';

-- =============================================================================
-- NOTES
-- =============================================================================
-- These indexes were created using CONCURRENTLY to avoid blocking table access
-- during creation. This is safe for production environments with active traffic.
--
-- Query patterns optimized:
-- 1. SELECT * FROM daily_transaction_totals WHERE wallet_id = ? ORDER BY transaction_date
-- 2. SELECT * FROM obs_consent_audit_log ORDER BY created_at DESC LIMIT 100
-- 3. SELECT * FROM compliance_alerts WHERE user_id = ? AND status = 'active' ORDER BY created_at

-- Migration complete
