-- SmartPay agent_locations with geography + services (replaces legacy lat/lng schema from 019)
DROP TABLE IF EXISTS agent_locations;

CREATE TABLE agent_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('agent', 'atm', 'nampost')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  services TEXT[],
  operating_hours JSONB,
  contact_phone VARCHAR(20),
  rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_locations_geo ON agent_locations USING GIST (location);
CREATE INDEX idx_agent_locations_type ON agent_locations (type);
CREATE INDEX idx_agent_locations_region ON agent_locations (region);

-- Full-text style search (simple config; no extra extension required)
CREATE INDEX idx_agent_locations_name_city ON agent_locations (name, city);
