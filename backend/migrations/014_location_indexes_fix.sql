-- Migration 014: Fix location table indexes with proper geospatial support
-- Enables earthdistance extension and creates proper spatial indexes

-- Enable earthdistance extension (requires cube)
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Fix analytics_events platform index (was failing)
DROP INDEX IF EXISTS idx_analytics_events_platform;
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform) WHERE platform IS NOT NULL;

-- Add platform column if missing to error_logs
DO $$ BEGIN
  ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS platform VARCHAR(20);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Drop and recreate spatial indexes for location tables
DROP INDEX IF EXISTS idx_cashout_agents_location;
CREATE INDEX idx_cashout_agents_location ON cashout_agents USING GIST (
  ll_to_earth(latitude, longitude)
);

DROP INDEX IF EXISTS idx_nampost_branches_location;
CREATE INDEX idx_nampost_branches_location ON nampost_branches USING GIST (
  ll_to_earth(latitude, longitude)
);

DROP INDEX IF EXISTS idx_smartpay_units_location;
CREATE INDEX idx_smartpay_units_location ON smartpay_units USING GIST (
  ll_to_earth(latitude, longitude)
);

DROP INDEX IF EXISTS idx_atm_locations_location;
CREATE INDEX idx_atm_locations_location ON atm_locations USING GIST (
  ll_to_earth(latitude, longitude)
);

-- Seed some Namibia location data for development/testing
-- Windhoek area coordinates

-- Cash-out agents (Tills and Agents)
INSERT INTO cashout_agents (name, type, address, latitude, longitude, phone, operating_hours, fees, active, verified)
VALUES
  ('Spar Windhoek CBD', 'till', 'Independence Ave, Windhoek', -22.5609, 17.0658, '+264612345001', '{"monday":"08:00-19:00","tuesday":"08:00-19:00","wednesday":"08:00-19:00","thursday":"08:00-19:00","friday":"08:00-19:00","saturday":"08:00-17:00","sunday":"09:00-15:00"}'::jsonb, '{"fee": 5.00, "max_amount": 50000}'::jsonb, true, true),
  ('Checkers Maerua Mall', 'till', 'Maerua Mall, Robert Mugabe Ave', -22.5532, 17.0782, '+264612345002', '{"monday":"09:00-20:00","tuesday":"09:00-20:00","wednesday":"09:00-20:00","thursday":"09:00-20:00","friday":"09:00-20:00","saturday":"09:00-18:00","sunday":"09:00-17:00"}'::jsonb, '{"fee": 5.00, "max_amount": 50000}'::jsonb, true, true),
  ('OK Foods Katutura', 'till', 'Katutura, Windhoek', -22.5359, 17.0510, '+264612345003', '{"monday":"08:00-18:00","tuesday":"08:00-18:00","wednesday":"08:00-18:00","thursday":"08:00-18:00","friday":"08:00-18:00","saturday":"08:00-15:00","sunday":"closed"}'::jsonb, '{"fee": 5.00, "max_amount": 50000}'::jsonb, true, true),
  ('Buffr Agent - Maria Nangolo', 'agent', 'Oshakati Town Centre', -17.7889, 15.6964, '+264811234001', '{"monday":"09:00-17:00","tuesday":"09:00-17:00","wednesday":"09:00-17:00","thursday":"09:00-17:00","friday":"09:00-17:00","saturday":"09:00-13:00","sunday":"closed"}'::jsonb, '{"fee": 10.00, "max_amount": 20000}'::jsonb, true, true),
  ('Buffr Agent - Johannes Shikongo', 'agent', 'Rundu Main Road', -17.9289, 19.7606, '+264811234002', '{"monday":"08:00-17:00","tuesday":"08:00-17:00","wednesday":"08:00-17:00","thursday":"08:00-17:00","friday":"08:00-17:00","saturday":"08:00-14:00","sunday":"closed"}'::jsonb, '{"fee": 10.00, "max_amount": 20000}'::jsonb, true, true),
  ('Shoprite Ongwediva', 'merchant', 'Ongwediva Town Centre', -17.7834, 15.7637, '+264612345004', '{"monday":"08:00-19:00","tuesday":"08:00-19:00","wednesday":"08:00-19:00","thursday":"08:00-19:00","friday":"08:00-19:00","saturday":"08:00-17:00","sunday":"09:00-15:00"}'::jsonb, '{"fee": 5.00, "max_amount": 30000}'::jsonb, true, true)
ON CONFLICT DO NOTHING;

-- NamPost branches
INSERT INTO nampost_branches (name, branch_code, address, latitude, longitude, phone, operating_hours, services, active)
VALUES
  ('NamPost Windhoek Main', 'WDH001', 'Independence Ave, Windhoek', -22.5690, 17.0835, '+264612345101', '{"monday":"08:00-17:00","tuesday":"08:00-17:00","wednesday":"08:00-17:00","thursday":"08:00-17:00","friday":"08:00-17:00","saturday":"closed","sunday":"closed"}'::jsonb, '["voucher_redemption","mail","banking"]'::jsonb, true),
  ('NamPost Oshakati', 'OSH001', 'Oshakati Main Road', -17.7840, 15.6986, '+264612345102', '{"monday":"08:00-17:00","tuesday":"08:00-17:00","wednesday":"08:00-17:00","thursday":"08:00-17:00","friday":"08:00-17:00","saturday":"08:00-13:00","sunday":"closed"}'::jsonb, '["voucher_redemption","mail"]'::jsonb, true),
  ('NamPost Walvis Bay', 'WVB001', 'Sam Nujoma Ave, Walvis Bay', -22.9576, 14.5053, '+264612345103', '{"monday":"08:00-17:00","tuesday":"08:00-17:00","wednesday":"08:00-17:00","thursday":"08:00-17:00","friday":"08:00-17:00","saturday":"closed","sunday":"closed"}'::jsonb, '["voucher_redemption","mail","banking"]'::jsonb, true),
  ('NamPost Rundu', 'RND001', 'Rundu Town Centre', -17.9269, 19.7640, '+264612345104', '{"monday":"08:00-17:00","tuesday":"08:00-17:00","wednesday":"08:00-17:00","thursday":"08:00-17:00","friday":"08:00-17:00","saturday":"08:00-13:00","sunday":"closed"}'::jsonb, '["voucher_redemption","mail"]'::jsonb, true)
ON CONFLICT DO NOTHING;

-- SmartPay units
INSERT INTO smartpay_units (name, unit_code, address, latitude, longitude, phone, operating_hours, active)
VALUES
  ('SmartPay Wernhil Park', 'WHL001', 'Wernhil Park Mall, Windhoek', -22.5701, 17.0801, '+264612345201', '{"monday":"09:00-18:00","tuesday":"09:00-18:00","wednesday":"09:00-18:00","thursday":"09:00-18:00","friday":"09:00-18:00","saturday":"09:00-15:00","sunday":"closed"}'::jsonb, true),
  ('SmartPay Maerua Mall', 'MAE001', 'Maerua Mall, Windhoek', -22.5532, 17.0782, '+264612345202', '{"monday":"09:00-19:00","tuesday":"09:00-19:00","wednesday":"09:00-19:00","thursday":"09:00-19:00","friday":"09:00-19:00","saturday":"09:00-17:00","sunday":"09:00-15:00"}'::jsonb, true),
  ('SmartPay Oshakati', 'OSH002', 'Oshakati Shopping Centre', -17.7850, 15.6990, '+264612345203', '{"monday":"08:00-17:00","tuesday":"08:00-17:00","wednesday":"08:00-17:00","thursday":"08:00-17:00","friday":"08:00-17:00","saturday":"08:00-14:00","sunday":"closed"}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- ATM locations
INSERT INTO atm_locations (bank_name, atm_id, address, latitude, longitude, features, daily_limit, active)
VALUES
  ('Bank Windhoek', 'BWK-ATM-001', 'Independence Ave, Windhoek', -22.5695, 17.0840, '["cash_withdrawal","balance_inquiry","24_hour"]'::jsonb, 50000.00, true),
  ('Bank Windhoek', 'BWK-ATM-002', 'Maerua Mall, Windhoek', -22.5532, 17.0782, '["cash_withdrawal","balance_inquiry","24_hour"]'::jsonb, 50000.00, true),
  ('FNB Namibia', 'FNB-ATM-001', 'Post Street Mall, Windhoek', -22.5677, 17.0841, '["cash_withdrawal","balance_inquiry","24_hour"]'::jsonb, 40000.00, true),
  ('Standard Bank', 'STD-ATM-001', 'Wernhil Park, Windhoek', -22.5701, 17.0801, '["cash_withdrawal","balance_inquiry"]'::jsonb, 40000.00, true),
  ('Bank Windhoek', 'BWK-ATM-003', 'Oshakati Main Branch', -17.7845, 15.6980, '["cash_withdrawal","balance_inquiry","24_hour"]'::jsonb, 50000.00, true),
  ('FNB Namibia', 'FNB-ATM-002', 'Walvis Bay Waterfront', -22.9550, 14.5065, '["cash_withdrawal","balance_inquiry","24_hour"]'::jsonb, 40000.00, true)
ON CONFLICT DO NOTHING;

COMMENT ON EXTENSION earthdistance IS 'Calculate great circle distances on Earth';
