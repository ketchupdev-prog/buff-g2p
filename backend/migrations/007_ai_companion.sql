-- Buffr G2P – AI Companion & exchange rates (from ketchup-smartpay/buffr/buffr_ai/sql).
-- Run after 001–006. Safe to re-run (IF NOT EXISTS).
-- LangGraph checkpointer tables are created by the library at runtime (AsyncPostgresSaver.setup()).

-- Ensure UUID extension (buffr-g2p 001 uses gen_random_uuid; uuid-ossp provides uuid_generate_v4 if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CONVERSATIONS (Companion Agent history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT NOT NULL,
  user_id           TEXT,
  user_message      TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  agents_consulted  TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id, created_at DESC);

-- ============================================================================
-- EXCHANGE RATES (NAD rates for display/ML)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency     TEXT NOT NULL DEFAULT 'NAD',
  target_currency   TEXT NOT NULL,
  rate              DECIMAL(15, 6) NOT NULL,
  trend             TEXT DEFAULT 'stable',
  source            TEXT DEFAULT 'exchangerate.host',
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  fetched_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_unique
  ON exchange_rates (base_currency, target_currency, fetched_date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_target_fetched ON exchange_rates (target_currency, fetched_at DESC);

-- ============================================================================
-- EXCHANGE RATE FETCH LOG (rate limiting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exchange_rate_fetch_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fetch_date        DATE NOT NULL,
  fetch_time        TIME NOT NULL,
  currencies_fetched INTEGER NOT NULL DEFAULT 0,
  success           BOOLEAN NOT NULL DEFAULT true,
  api_source        TEXT DEFAULT 'exchangerate.host',
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rate_fetch_log_unique
  ON exchange_rate_fetch_log (fetch_date, fetch_time);
CREATE INDEX IF NOT EXISTS idx_exchange_rate_fetch_log_date ON exchange_rate_fetch_log (fetch_date DESC);
