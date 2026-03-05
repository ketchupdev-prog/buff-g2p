-- Merchants Table
-- Stores registered merchants who accept Buffr payments
-- Migration 019
-- Created: 2026-03-04

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('grocery', 'pharmacy', 'transport', 'food', 'hardware', 'fuel', 'other')),
  address TEXT NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_open BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  minimum_transaction_amount DECIMAL(10, 2) DEFAULT 0,
  accepts_namqr BOOLEAN DEFAULT true,
  operating_hours JSONB,
  services JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category);
CREATE INDEX IF NOT EXISTS idx_merchants_is_open ON merchants(is_open);
CREATE INDEX IF NOT EXISTS idx_merchants_is_verified ON merchants(is_verified);
CREATE INDEX IF NOT EXISTS idx_merchants_name ON merchants(name);

-- Geospatial index for proximity search
CREATE INDEX IF NOT EXISTS idx_merchants_location ON merchants USING GIST (ll_to_earth(latitude, longitude))
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Seed data for development
INSERT INTO merchants (name, category, address, phone, latitude, longitude, is_open, is_verified, minimum_transaction_amount, services)
VALUES
  ('Checkers Windhoek', 'grocery', 'Wernhil Park, Independence Ave, Windhoek', '+264811234567', -22.5609, 17.0658, true, true, 10.00, '["Groceries", "Household", "Fresh Produce"]'::jsonb),
  ('Shoprite Katutura', 'grocery', 'Soweto Market, Katutura, Windhoek', '+264811234568', -22.5516, 17.0455, true, true, 10.00, '["Groceries", "Household"]'::jsonb),
  ('Medicare Pharmacy', 'pharmacy', 'Robert Mugabe Ave, Windhoek', '+264811234569', -22.5689, 17.0836, true, true, 20.00, '["Prescriptions", "Medical Supplies", "Health Products"]'::jsonb),
  ('City Chicken Takeaways', 'food', 'Hochland Road, Windhoek', '+264811234570', -22.5745, 17.0742, true, false, 15.00, '["Fast Food", "Takeaways"]'::jsonb),
  ('Intercape Bus Terminal', 'transport', 'Fidel Castro St, Windhoek', '+264811234571', -22.5605, 17.0836, true, true, 50.00, '["Bus Tickets", "Parcel Services"]'::jsonb),
  ('Builders Warehouse', 'hardware', 'Mandume Ndemufayo Ave, Windhoek', '+264811234572', -22.5456, 17.0523, true, true, 50.00, '["Building Materials", "Hardware", "Tools"]'::jsonb),
  ('Engen Fuel Station', 'fuel', 'Independence Ave, Klein Windhoek', '+264811234573', -22.5789, 17.0925, true, true, 100.00, '["Fuel", "Convenience Store"]'::jsonb),
  ('OK Grocer Khomasdal', 'grocery', 'Mandume Ndemufayo Ave, Khomasdal', '+264811234574', -22.5334, 17.0412, true, true, 10.00, '["Groceries"]'::jsonb),
  ('Hungry Lion', 'food', 'Grove Mall, Windhoek', '+264811234575', -22.5598, 17.0847, true, true, 20.00, '["Fast Food", "Chicken"]'::jsonb),
  ('Pick n Pay', 'grocery', 'Maerua Mall, Windhoek', '+264811234576', -22.5445, 17.0712, true, true, 10.00, '["Groceries", "Clothing", "Electronics"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Comments
COMMENT ON TABLE merchants IS 'Registered merchants accepting Buffr payments via NAMQR';
COMMENT ON COLUMN merchants.category IS 'Merchant category for filtering and display';
COMMENT ON COLUMN merchants.is_verified IS 'Whether merchant has been verified by Buffr';
COMMENT ON COLUMN merchants.minimum_transaction_amount IS 'Minimum amount for transactions at this merchant';
COMMENT ON COLUMN merchants.accepts_namqr IS 'Whether merchant accepts NAMQR QR code payments';
