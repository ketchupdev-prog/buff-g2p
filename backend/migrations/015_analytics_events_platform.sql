-- Migration 015: Add platform and app_version to analytics_events
-- Aligns with mobile client expectations

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS platform VARCHAR(20);

ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS app_version VARCHAR(20);

-- Rename event_data to properties for consistency
ALTER TABLE analytics_events 
RENAME COLUMN event_data TO properties;

-- Add index on platform
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform) WHERE platform IS NOT NULL;

-- Make user_id nullable (anonymous events)
ALTER TABLE analytics_events 
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN analytics_events.platform IS 'Platform: ios, android, web';
COMMENT ON COLUMN analytics_events.properties IS 'Event properties as JSONB';
