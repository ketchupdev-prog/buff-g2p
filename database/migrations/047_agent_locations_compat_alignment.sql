-- Align legacy agent_locations schema with v1 agents route expectations.
-- This migration is additive and safe for existing deployments.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE agent_locations
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);

UPDATE agent_locations
SET
  name = COALESCE(name, agent_name),
  type = COALESCE(
    type,
    CASE
      WHEN agent_type = 'atm' THEN 'atm'
      WHEN agent_type = 'nampost' THEN 'nampost'
      ELSE 'agent'
    END
  ),
  services = CASE
    WHEN services IS NOT NULL AND cardinality(services) > 0 THEN services
    ELSE array_remove(
      ARRAY[
        CASE WHEN supports_cashout THEN 'cashout' END,
        CASE WHEN supports_voucher_redeem THEN 'voucher' END,
        CASE WHEN supports_ewallet THEN 'ewallet' END,
        CASE WHEN supports_namqr THEN 'namqr' END
      ],
      NULL
    )
  END,
  location = COALESCE(
    location,
    CASE
      WHEN latitude IS NOT NULL AND longitude IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::geography
      ELSE NULL
    END
  )
WHERE
  name IS NULL
  OR type IS NULL
  OR location IS NULL
  OR services IS NULL
  OR cardinality(services) = 0;

CREATE INDEX IF NOT EXISTS idx_agent_locations_type_active ON agent_locations(type, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_locations_services_gin ON agent_locations USING GIN (services);
CREATE INDEX IF NOT EXISTS idx_agent_locations_location_gist ON agent_locations USING GIST (location);
