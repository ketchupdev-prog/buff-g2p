-- Migration 013: Analytics, Error Logging, and Location Data
-- Implements backend endpoints for analytics tracking and real location data

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name VARCHAR(100) NOT NULL,
  properties JSONB,
  platform VARCHAR(20), -- 'ios', 'android', 'web'
  app_version VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform);

COMMENT ON TABLE analytics_events IS 'User analytics events from mobile/web clients';

-- ============================================================================
-- ERROR LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  error_name VARCHAR(200),
  error_message TEXT,
  error_stack TEXT,
  component_stack TEXT,
  context JSONB,
  platform VARCHAR(20),
  app_version VARCHAR(20),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_name ON error_logs(error_name);

COMMENT ON TABLE error_logs IS 'Application error logs from clients for monitoring';

-- ============================================================================
-- LOCATION DATA TABLES
-- ============================================================================

-- Cash-out agents (Till, Agent locations)
CREATE TABLE IF NOT EXISTS cashout_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'till', 'agent', 'merchant'
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  operating_hours JSONB, -- e.g., {"monday": "08:00-17:00", ...}
  fees JSONB, -- e.g., {"till_fee": 5.00, "cash_withdrawal_limit": 50000}
  active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashout_agents_location ON cashout_agents USING GIST (
  ll_to_earth(latitude, longitude)
);
CREATE INDEX IF NOT EXISTS idx_cashout_agents_type ON cashout_agents(type);
CREATE INDEX IF NOT EXISTS idx_cashout_agents_active ON cashout_agents(active);

COMMENT ON TABLE cashout_agents IS 'Physical locations for cash-out (till, agent, merchant)';

-- NamPost branches
CREATE TABLE IF NOT EXISTS nampost_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  branch_code VARCHAR(20) UNIQUE,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  operating_hours JSONB,
  services JSONB, -- e.g., ["voucher_redemption", "mail", "banking"]
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nampost_branches_location ON nampost_branches USING GIST (
  ll_to_earth(latitude, longitude)
);
CREATE INDEX IF NOT EXISTS idx_nampost_branches_active ON nampost_branches(active);

COMMENT ON TABLE nampost_branches IS 'NamPost branch locations for voucher redemption';

-- SmartPay units
CREATE TABLE IF NOT EXISTS smartpay_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  unit_code VARCHAR(20) UNIQUE,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  operating_hours JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smartpay_units_location ON smartpay_units USING GIST (
  ll_to_earth(latitude, longitude)
);
CREATE INDEX IF NOT EXISTS idx_smartpay_units_active ON smartpay_units(active);

COMMENT ON TABLE smartpay_units IS 'SmartPay unit locations for voucher redemption';

-- ATM locations
CREATE TABLE IF NOT EXISTS atm_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(100) NOT NULL,
  atm_id VARCHAR(50) UNIQUE,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  features JSONB, -- e.g., ["cash_withdrawal", "deposit", "24_hour"]
  daily_limit DECIMAL(14, 2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atm_locations_location ON atm_locations USING GIST (
  ll_to_earth(latitude, longitude)
);
CREATE INDEX IF NOT EXISTS idx_atm_locations_bank ON atm_locations(bank_name);
CREATE INDEX IF NOT EXISTS idx_atm_locations_active ON atm_locations(active);

COMMENT ON TABLE atm_locations IS 'ATM locations for cash withdrawal';

-- ============================================================================
-- COUNTRY SELECTION DATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS supported_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code CHAR(2) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2
  country_name VARCHAR(100) NOT NULL,
  currency_code CHAR(3) NOT NULL, -- ISO 4217
  currency_symbol VARCHAR(10),
  phone_prefix VARCHAR(10),
  flag_emoji CHAR(4),
  active BOOLEAN DEFAULT TRUE,
  features JSONB, -- Enabled features per country
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO supported_countries (country_code, country_name, currency_code, currency_symbol, phone_prefix, flag_emoji, features)
VALUES
  ('NA', 'Namibia', 'NAD', 'N$', '+264', '🇳🇦', '{"vouchers": true, "cash_out": true, "loans": true}'::jsonb),
  ('ZA', 'South Africa', 'ZAR', 'R', '+27', '🇿🇦', '{"vouchers": false, "cash_out": true, "loans": false}'::jsonb),
  ('BW', 'Botswana', 'BWP', 'P', '+267', '🇧🇼', '{"vouchers": false, "cash_out": true, "loans": false}'::jsonb),
  ('ZM', 'Zambia', 'ZMW', 'K', '+260', '🇿🇲', '{"vouchers": false, "cash_out": true, "loans": false}'::jsonb)
ON CONFLICT (country_code) DO NOTHING;

COMMENT ON TABLE supported_countries IS 'Countries supported by the Buffr G2P platform';

-- ============================================================================
-- GAMIFICATION TABLES
-- ============================================================================

-- User achievements/badges
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL, -- e.g., 'first_voucher', 'streak_7_days'
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  metadata JSONB,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_id ON user_achievements(achievement_id);

-- User points and levels
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  metadata JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_gamification IS 'User gamification progress, points, levels, and streaks';

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cashout_agents_updated_at ON cashout_agents;
CREATE TRIGGER update_cashout_agents_updated_at BEFORE UPDATE ON cashout_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nampost_branches_updated_at ON nampost_branches;
CREATE TRIGGER update_nampost_branches_updated_at BEFORE UPDATE ON nampost_branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_smartpay_units_updated_at ON smartpay_units;
CREATE TRIGGER update_smartpay_units_updated_at BEFORE UPDATE ON smartpay_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_atm_locations_updated_at ON atm_locations;
CREATE TRIGGER update_atm_locations_updated_at BEFORE UPDATE ON atm_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_gamification_updated_at ON user_gamification;
CREATE TRIGGER update_user_gamification_updated_at BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
