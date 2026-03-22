-- =====================================================
-- COMPLIANCE AUTOMATION TABLES
-- PSD-3 & PSD-12 Requirements
-- Migration: 012_compliance_automation.sql
-- =====================================================

-- =====================================================
-- 1. TRUST ACCOUNT RECONCILIATION (PSD-3 §18)
-- =====================================================

-- Trust accounts table
CREATE TABLE IF NOT EXISTS trust_accounts (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    current_balance BIGINT NOT NULL DEFAULT 0, -- in cents
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    currency_code CHAR(3) NOT NULL DEFAULT 'NAD',
    bank_code VARCHAR(10),
    branch_code VARCHAR(10),
    swift_code VARCHAR(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reconciled_at TIMESTAMP,
    notes TEXT
);

-- Create index for fast primary account lookup
CREATE INDEX idx_trust_accounts_primary ON trust_accounts(is_primary) WHERE is_primary = true;
CREATE INDEX idx_trust_accounts_status ON trust_accounts(status);

-- Trust account movements (for audit trail)
CREATE TABLE IF NOT EXISTS trust_account_movements (
    id SERIAL PRIMARY KEY,
    trust_account_id INTEGER NOT NULL REFERENCES trust_accounts(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE', 'ADJUSTMENT', 'TRANSFER')),
    amount BIGINT NOT NULL, -- in cents (positive for in, negative for out)
    description TEXT NOT NULL,
    bank_reference VARCHAR(100),
    reconciled BOOLEAN NOT NULL DEFAULT false,
    reconciled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    metadata JSONB
);

CREATE INDEX idx_trust_movements_account ON trust_account_movements(trust_account_id);
CREATE INDEX idx_trust_movements_date ON trust_account_movements(created_at DESC);
CREATE INDEX idx_trust_movements_type ON trust_account_movements(type);

-- Daily reconciliation log (PSD-3 requirement)
CREATE TABLE IF NOT EXISTS reconciliation_log (
    id SERIAL PRIMARY KEY,
    reconciliation_date DATE NOT NULL UNIQUE,
    wallets_sum NUMERIC(15,2) NOT NULL,
    agent_floats_sum NUMERIC(15,2) NOT NULL DEFAULT 0,
    trust_account_balance NUMERIC(15,2) NOT NULL,
    outstanding_liabilities NUMERIC(15,2) NOT NULL, -- wallets_sum + agent_floats_sum
    discrepancy NUMERIC(15,2) NOT NULL, -- trust_account_balance - outstanding_liabilities
    compliance_percentage NUMERIC(10,4) NOT NULL, -- (trust_account_balance / outstanding_liabilities) * 100
    status VARCHAR(20) NOT NULL CHECK (status IN ('COMPLIANT', 'WARNING', 'DEFICIENT', 'CRITICAL')),
    is_compliant BOOLEAN NOT NULL,
    wallet_breakdown JSONB, -- {active_wallets, dormant_wallets, individual_balance, business_balance, agent_wallet_balance}
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reconciliation_date ON reconciliation_log(reconciliation_date DESC);
CREATE INDEX idx_reconciliation_status ON reconciliation_log(status);
CREATE INDEX idx_reconciliation_compliant ON reconciliation_log(is_compliant);

-- =====================================================
-- 2. KEY RISK INDICATORS (KRI) - PSD-12 Annex B
-- =====================================================

CREATE TABLE IF NOT EXISTS kri_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    target_value NUMERIC(15,4),
    threshold_warning NUMERIC(15,4),
    threshold_critical NUMERIC(15,4),
    status VARCHAR(20) NOT NULL CHECK (status IN ('GOOD', 'WARNING', 'CRITICAL')),
    unit VARCHAR(50), -- 'percentage', 'count', 'seconds', 'nad', etc.
    category VARCHAR(50) NOT NULL, -- 'operational', 'security', 'compliance', 'financial'
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kri_date ON kri_metrics(metric_date DESC);
CREATE INDEX idx_kri_name ON kri_metrics(metric_name);
CREATE INDEX idx_kri_category ON kri_metrics(category);
CREATE INDEX idx_kri_status ON kri_metrics(status);
CREATE UNIQUE INDEX idx_kri_unique ON kri_metrics(metric_date, metric_name);

-- =====================================================
-- 3. SYSTEM UPTIME MONITORING (PSD-12 §10)
-- =====================================================

CREATE TABLE IF NOT EXISTS system_uptime_metrics (
    id SERIAL PRIMARY KEY,
    check_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    component VARCHAR(100) NOT NULL, -- 'api', 'database', 'redis', 'ai-service', 'overall'
    status VARCHAR(20) NOT NULL CHECK (status IN ('UP', 'DOWN', 'DEGRADED')),
    response_time_ms INTEGER,
    http_status_code INTEGER,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_uptime_timestamp ON system_uptime_metrics(check_timestamp DESC);
CREATE INDEX idx_uptime_component ON system_uptime_metrics(component);
CREATE INDEX idx_uptime_status ON system_uptime_metrics(status);

-- Uptime summary (daily aggregates for reporting)
CREATE TABLE IF NOT EXISTS uptime_daily_summary (
    id SERIAL PRIMARY KEY,
    summary_date DATE NOT NULL,
    component VARCHAR(100) NOT NULL,
    total_checks INTEGER NOT NULL,
    successful_checks INTEGER NOT NULL,
    failed_checks INTEGER NOT NULL,
    uptime_percentage NUMERIC(5,2) NOT NULL,
    avg_response_time_ms NUMERIC(10,2),
    max_response_time_ms INTEGER,
    min_response_time_ms INTEGER,
    downtime_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_uptime_summary_unique ON uptime_daily_summary(summary_date, component);
CREATE INDEX idx_uptime_summary_date ON uptime_daily_summary(summary_date DESC);

-- =====================================================
-- 4. BON INCIDENT REPORTING (PSD-12 §21)
-- =====================================================

CREATE TABLE IF NOT EXISTS security_incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(50) NOT NULL, -- 'data_breach', 'unauthorized_access', 'service_outage', 'fraud', 'system_compromise'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    affected_systems TEXT[],
    affected_users_count INTEGER DEFAULT 0,
    impact_assessment TEXT,
    root_cause TEXT,
    remediation_actions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    reported_to_bon BOOLEAN NOT NULL DEFAULT false,
    bon_report_id VARCHAR(100),
    bon_reported_at TIMESTAMP,
    bon_report_data JSONB,
    created_by VARCHAR(100),
    assigned_to VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_incidents_status ON security_incidents(status);
CREATE INDEX idx_incidents_detected ON security_incidents(detected_at DESC);
CREATE INDEX idx_incidents_bon_reported ON security_incidents(reported_to_bon);

-- BoN reporting queue (24-hour deadline tracking)
CREATE TABLE IF NOT EXISTS bon_reporting_queue (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES security_incidents(id),
    report_type VARCHAR(50) NOT NULL, -- 'incident', 'monthly', 'quarterly', 'ad-hoc'
    report_data JSONB NOT NULL,
    deadline TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'FAILED', 'ACKNOWLEDGED')),
    submission_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    submitted_at TIMESTAMP,
    bon_reference VARCHAR(100),
    bon_response JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bon_queue_status ON bon_reporting_queue(status);
CREATE INDEX idx_bon_queue_deadline ON bon_reporting_queue(deadline);
CREATE INDEX idx_bon_queue_incident ON bon_reporting_queue(incident_id);

-- =====================================================
-- 5. COMPLIANCE ALERTS & NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS compliance_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'trust_account', 'kri', 'uptime', 'incident', 'regulatory'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    regulation_reference VARCHAR(100),
    actions_required TEXT[],
    assigned_to TEXT[],
    data JSONB,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(100),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_type ON compliance_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON compliance_alerts(severity);
CREATE INDEX idx_alerts_acknowledged ON compliance_alerts(acknowledged);
CREATE INDEX idx_alerts_resolved ON compliance_alerts(resolved);
CREATE INDEX idx_alerts_created ON compliance_alerts(created_at DESC);

-- Alert notifications log (for audit trail)
CREATE TABLE IF NOT EXISTS alert_notifications (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES compliance_alerts(id),
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('EMAIL', 'SMS', 'SLACK', 'PUSH', 'WEBHOOK')),
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_alert ON alert_notifications(alert_id);
CREATE INDEX idx_notifications_status ON alert_notifications(status);
CREATE INDEX idx_notifications_sent ON alert_notifications(sent_at DESC);

-- =====================================================
-- 6. CAPITAL ADEQUACY TRACKING (PSD-3 §11.5)
-- =====================================================

CREATE TABLE IF NOT EXISTS capital_adequacy_reports (
    id SERIAL PRIMARY KEY,
    report_month DATE NOT NULL UNIQUE, -- First day of the month
    required_ongoing_capital NUMERIC(15,2) NOT NULL, -- Average liabilities over 6 months
    total_capital_held NUMERIC(15,2) NOT NULL,
    liquid_assets NUMERIC(15,2) NOT NULL,
    capital_surplus_deficit NUMERIC(15,2) NOT NULL, -- total_capital_held - required_ongoing_capital
    is_capital_adequate BOOLEAN NOT NULL,
    calculation_method TEXT,
    six_month_avg_liabilities NUMERIC(15,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP
);

CREATE INDEX idx_capital_reports_month ON capital_adequacy_reports(report_month DESC);
CREATE INDEX idx_capital_adequate ON capital_adequacy_reports(is_capital_adequate);

-- =====================================================
-- 7. BON MONTHLY REPORTS (PSD-3 Section 16)
-- =====================================================

CREATE TABLE IF NOT EXISTS bon_monthly_reports (
    id SERIAL PRIMARY KEY,
    report_year INTEGER NOT NULL,
    report_month INTEGER NOT NULL CHECK (report_month BETWEEN 1 AND 12),
    report_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUBMITTED', 'ACKNOWLEDGED')),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    submitted_at TIMESTAMP,
    bon_reference VARCHAR(100),
    bon_acknowledgment_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_bon_reports_period ON bon_monthly_reports(report_year, report_month);
CREATE INDEX idx_bon_reports_status ON bon_monthly_reports(status);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trust_accounts_updated_at BEFORE UPDATE ON trust_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_log_updated_at BEFORE UPDATE ON reconciliation_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_incidents_updated_at BEFORE UPDATE ON security_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bon_reporting_queue_updated_at BEFORE UPDATE ON bon_reporting_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_alerts_updated_at BEFORE UPDATE ON compliance_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bon_monthly_reports_updated_at BEFORE UPDATE ON bon_monthly_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default trust account (update with real values)
INSERT INTO trust_accounts (bank_name, account_number, current_balance, is_primary, bank_code, status)
VALUES ('First National Bank Namibia', '62000000000', 0, true, 'FNB', 'ACTIVE')
ON CONFLICT (account_number) DO NOTHING;

-- Insert predefined KRI metric definitions
INSERT INTO kri_metrics (metric_date, metric_name, metric_value, target_value, threshold_warning, threshold_critical, status, unit, category, description)
VALUES 
    (CURRENT_DATE, 'transaction_success_rate', 99.9, 99.5, 99.0, 98.0, 'GOOD', 'percentage', 'operational', 'Percentage of successful transactions'),
    (CURRENT_DATE, 'system_uptime', 99.95, 99.9, 99.5, 99.0, 'GOOD', 'percentage', 'operational', 'Overall system uptime percentage'),
    (CURRENT_DATE, '2fa_enforcement_rate', 100, 100, 99.5, 99.0, 'GOOD', 'percentage', 'security', 'Percentage of payments with 2FA'),
    (CURRENT_DATE, 'fraud_detection_accuracy', 99.0, 98.0, 95.0, 90.0, 'GOOD', 'percentage', 'security', 'Fraud detection accuracy'),
    (CURRENT_DATE, 'customer_complaint_rate', 0.5, 1.0, 2.0, 5.0, 'GOOD', 'percentage', 'operational', 'Customer complaints per 1000 users'),
    (CURRENT_DATE, 'avg_resolution_time_hours', 12, 24, 48, 72, 'GOOD', 'hours', 'operational', 'Average complaint resolution time'),
    (CURRENT_DATE, 'regulatory_breach_count', 0, 0, 1, 2, 'GOOD', 'count', 'compliance', 'Number of regulatory breaches'),
    (CURRENT_DATE, 'security_incident_count', 0, 0, 1, 3, 'GOOD', 'count', 'security', 'Number of security incidents'),
    (CURRENT_DATE, 'data_backup_success_rate', 100, 100, 99.5, 99.0, 'GOOD', 'percentage', 'operational', 'Data backup success rate'),
    (CURRENT_DATE, 'api_response_time_p95_ms', 200, 500, 1000, 2000, 'GOOD', 'milliseconds', 'operational', 'API response time 95th percentile'),
    (CURRENT_DATE, 'agent_network_uptime', 99.5, 99.0, 98.0, 95.0, 'GOOD', 'percentage', 'operational', 'Agent network uptime'),
    (CURRENT_DATE, 'trust_reconciliation_pass_rate', 100, 100, 99.0, 98.0, 'GOOD', 'percentage', 'compliance', 'Trust account reconciliation pass rate')
ON CONFLICT (metric_date, metric_name) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE trust_accounts IS 'Trust accounts for holding customer e-money (PSD-3 §11.2)';
COMMENT ON TABLE reconciliation_log IS 'Daily trust account reconciliation records (PSD-3 §18)';
COMMENT ON TABLE kri_metrics IS 'Key Risk Indicators for compliance monitoring (PSD-12 Annex B)';
COMMENT ON TABLE system_uptime_metrics IS 'System uptime monitoring data (PSD-12 §10 - 99.9% SLA)';
COMMENT ON TABLE security_incidents IS 'Security incident tracking and BoN reporting (PSD-12 §21)';
COMMENT ON TABLE bon_reporting_queue IS 'Queue for automated BoN incident reporting (24-hour deadline)';
COMMENT ON TABLE compliance_alerts IS 'Compliance alerts and notifications';
COMMENT ON TABLE capital_adequacy_reports IS 'Capital adequacy calculations (PSD-3 §11.5)';
COMMENT ON TABLE bon_monthly_reports IS 'Monthly reports to Bank of Namibia (PSD-3 Section 16)';

-- =====================================================
-- GRANT PERMISSIONS (adjust as needed)
-- =====================================================

-- Grant permissions to application role (if exists)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO smartpay_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO smartpay_app;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
