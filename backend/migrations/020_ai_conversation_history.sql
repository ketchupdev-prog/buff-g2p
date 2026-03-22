-- Migration 020: AI Companion Conversation History (User-Isolated)
-- Implements personalized, user-specific conversation memory for Buffr AI Companion
-- Ensures conversation context is isolated per user for privacy and personalization

-- ============================================================================
-- AI CONVERSATION HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id VARCHAR(100), -- Optional thread/session ID for grouping conversations
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store tool calls, action results, sentiment, etc.
  
  -- Conversation context
  conversation_type VARCHAR(50) DEFAULT 'chat', -- 'chat', 'support', 'financial_advice', 'tutorial'
  intent VARCHAR(100), -- Detected user intent (e.g., 'send_money', 'check_balance', 'ask_fees')
  sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative', 'frustrated'
  
  -- Performance tracking
  response_time_ms INTEGER, -- Time taken to generate assistant response
  model_used VARCHAR(50), -- LLM model used (e.g., 'gpt-4o', 'deepseek-chat')
  tokens_used INTEGER, -- Total tokens consumed
  
  -- Quality metrics
  user_feedback INTEGER CHECK (user_feedback BETWEEN 1 AND 5), -- 1-5 star rating
  flagged BOOLEAN DEFAULT FALSE, -- Flagged for review (inappropriate content, errors)
  resolved BOOLEAN DEFAULT FALSE, -- Whether user issue was resolved
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR EFFICIENT QUERYING
-- ============================================================================

-- Primary access pattern: get recent conversation for user
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user_created 
  ON ai_conversation_history(user_id, created_at DESC);

-- Thread-based retrieval
CREATE INDEX IF NOT EXISTS idx_ai_conversation_thread 
  ON ai_conversation_history(thread_id, created_at ASC) WHERE thread_id IS NOT NULL;

-- Analytics and monitoring
CREATE INDEX IF NOT EXISTS idx_ai_conversation_type 
  ON ai_conversation_history(conversation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_intent 
  ON ai_conversation_history(intent) WHERE intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversation_sentiment 
  ON ai_conversation_history(sentiment) WHERE sentiment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversation_flagged 
  ON ai_conversation_history(flagged, created_at DESC) WHERE flagged = TRUE;

-- Performance optimization for recent messages (removed WHERE clause - NOW() is VOLATILE, not IMMUTABLE)
-- Note: Full index on (user_id, created_at DESC) is better than partial index with NOW() function
CREATE INDEX IF NOT EXISTS idx_ai_conversation_recent 
  ON ai_conversation_history(user_id, created_at DESC);

-- ============================================================================
-- CONVERSATION SUMMARY TABLE (for long conversations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id VARCHAR(100),
  summary TEXT NOT NULL, -- AI-generated summary of conversation
  message_count INTEGER NOT NULL, -- Number of messages summarized
  start_time TIMESTAMP WITH TIME ZONE NOT NULL, -- First message timestamp
  end_time TIMESTAMP WITH TIME ZONE NOT NULL, -- Last message timestamp
  topics TEXT[], -- Extracted topics/keywords
  action_items TEXT[], -- Identified action items or follow-ups
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, thread_id, start_time)
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_time 
  ON ai_conversation_summaries(user_id, end_time DESC);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_thread 
  ON ai_conversation_summaries(thread_id) WHERE thread_id IS NOT NULL;

-- ============================================================================
-- USER PREFERENCES FOR AI COMPANION
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Personalization settings
  preferred_name VARCHAR(100), -- How user wants to be addressed
  communication_style VARCHAR(20) DEFAULT 'balanced' CHECK (
    communication_style IN ('concise', 'balanced', 'detailed', 'friendly', 'professional')
  ),
  language_preference VARCHAR(10) DEFAULT 'en', -- 'en', 'af', etc.
  
  -- Feature preferences
  proactive_tips BOOLEAN DEFAULT TRUE, -- Show proactive financial tips
  spending_alerts BOOLEAN DEFAULT TRUE, -- Alert on unusual spending
  tutorial_mode BOOLEAN DEFAULT TRUE, -- Show tutorial hints for new features
  voice_enabled BOOLEAN DEFAULT FALSE, -- Enable voice input/output
  
  -- Conversation settings
  conversation_retention_days INTEGER DEFAULT 90 CHECK (conversation_retention_days > 0),
  auto_summarize_after_messages INTEGER DEFAULT 50,
  
  -- Privacy settings
  share_analytics BOOLEAN DEFAULT TRUE, -- Share anonymized usage data for improvement
  store_conversation BOOLEAN DEFAULT TRUE, -- Store conversation history
  
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  total_interactions INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_preferences_last_interaction 
  ON ai_user_preferences(last_interaction_at DESC) WHERE last_interaction_at IS NOT NULL;

-- ============================================================================
-- AUTOMATIC CONVERSATION CLEANUP (OLD MESSAGES)
-- ============================================================================
-- Function to archive/delete old conversations based on user preference
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete conversations older than user's retention preference
  DELETE FROM ai_conversation_history h
  USING ai_user_preferences p
  WHERE h.user_id = p.user_id
    AND h.created_at < NOW() - (p.conversation_retention_days || ' days')::INTERVAL
    AND p.store_conversation = TRUE; -- Only cleanup if storage is enabled
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONVERSATION STATISTICS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW ai_conversation_stats AS
SELECT 
  user_id,
  COUNT(*) AS total_messages,
  COUNT(*) FILTER (WHERE role = 'user') AS user_messages,
  COUNT(*) FILTER (WHERE role = 'assistant') AS assistant_messages,
  COUNT(DISTINCT thread_id) AS unique_threads,
  COUNT(*) FILTER (WHERE conversation_type = 'support') AS support_interactions,
  COUNT(*) FILTER (WHERE conversation_type = 'financial_advice') AS advice_interactions,
  AVG(response_time_ms) FILTER (WHERE role = 'assistant') AS avg_response_time_ms,
  SUM(tokens_used) FILTER (WHERE role = 'assistant') AS total_tokens_used,
  AVG(user_feedback) FILTER (WHERE user_feedback IS NOT NULL) AS avg_user_rating,
  COUNT(*) FILTER (WHERE flagged = TRUE) AS flagged_count,
  MIN(created_at) AS first_interaction,
  MAX(created_at) AS last_interaction,
  ROUND(
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::NUMERIC / 
    NULLIF(EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 86400, 0), 
    2
  ) AS messages_per_day_last_7d
FROM ai_conversation_history
GROUP BY user_id;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - CRITICAL FOR USER ISOLATION
-- ============================================================================

-- Enable RLS on conversation history
ALTER TABLE ai_conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own conversations
DROP POLICY IF EXISTS ai_conversation_user_isolation ON ai_conversation_history;
CREATE POLICY ai_conversation_user_isolation ON ai_conversation_history
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

DROP POLICY IF EXISTS ai_summaries_user_isolation ON ai_conversation_summaries;
CREATE POLICY ai_summaries_user_isolation ON ai_conversation_summaries
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

DROP POLICY IF EXISTS ai_preferences_user_isolation ON ai_user_preferences;
CREATE POLICY ai_preferences_user_isolation ON ai_user_preferences
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Note: Service role policies removed (Neon doesn't have service_role by default)
-- Backend can bypass RLS by setting: SET LOCAL app.current_user_id = '<user_id>';
-- Or by using SECURITY DEFINER functions

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_conversation_updated_at
  BEFORE UPDATE ON ai_conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER ai_preferences_updated_at
  BEFORE UPDATE ON ai_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

-- ============================================================================
-- SAMPLE DATA FOR TESTING (optional - remove in production)
-- ============================================================================

-- Initialize preferences for existing users
INSERT INTO ai_user_preferences (user_id, communication_style, tutorial_mode)
SELECT id, 'balanced', TRUE
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ai_conversation_history IS 
  'User-isolated conversation history for Buffr AI Companion. Enables personalized, context-aware interactions with full privacy.';

COMMENT ON TABLE ai_conversation_summaries IS 
  'Compressed summaries of long conversations to maintain context without storing every message forever.';

COMMENT ON TABLE ai_user_preferences IS 
  'User-specific preferences for AI Companion behavior, communication style, and privacy settings.';

COMMENT ON FUNCTION cleanup_old_conversations() IS 
  'Periodic cleanup function to remove old conversations based on user retention preferences. Call from cron job.';

COMMENT ON VIEW ai_conversation_stats IS 
  'Aggregated statistics per user for monitoring AI Companion usage, performance, and satisfaction.';

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- Retrieve recent conversation for user (last 20 messages):
-- SELECT * FROM ai_conversation_history 
-- WHERE user_id = $1 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- Get conversation context for AI (last 10 messages, chronological):
-- SELECT role, content, metadata 
-- FROM ai_conversation_history 
-- WHERE user_id = $1 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- Store new message:
-- INSERT INTO ai_conversation_history (user_id, thread_id, role, content, metadata)
-- VALUES ($1, $2, $3, $4, $5);

-- Update user interaction timestamp:
-- UPDATE ai_user_preferences 
-- SET last_interaction_at = NOW(), total_interactions = total_interactions + 1
-- WHERE user_id = $1;

-- Cleanup old conversations (run daily via cron):
-- SELECT cleanup_old_conversations();
