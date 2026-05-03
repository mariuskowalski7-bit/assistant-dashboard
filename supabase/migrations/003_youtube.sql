-- ============================================================
-- Migration 003: YouTube OAuth Token Storage
-- ============================================================

CREATE TABLE youtube_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  channel_id    text,          -- cached after first fetch
  channel_title text,          -- cached channel name
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER youtube_tokens_updated_at
  BEFORE UPDATE ON youtube_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE youtube_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_tokens: own data"
  ON youtube_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cache table: avoids hammering the YouTube API quota
CREATE TABLE youtube_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key   text NOT NULL,   -- e.g. 'latest_video', 'analytics:VIDEO_ID'
  data        jsonb NOT NULL,
  cached_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cache_key)
);

ALTER TABLE youtube_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_cache: own data"
  ON youtube_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_youtube_cache_user_key ON youtube_cache (user_id, cache_key);
