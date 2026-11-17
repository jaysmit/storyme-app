-- Generation logs for user analytics
-- Track all generation events, timing, success/failure, and user edits

CREATE TABLE IF NOT EXISTS generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,

  -- Event type
  event_type TEXT NOT NULL, -- 'cover_generate', 'cover_regenerate', 'page_generate', 'page_regenerate', 'caricature_generate', 'caricature_regenerate'

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER, -- Calculated on completion

  -- Result
  status TEXT NOT NULL DEFAULT 'started', -- 'started', 'completed', 'failed'
  error_message TEXT,

  -- Generation details
  page_number INTEGER, -- Which page (0 = cover)
  character_count INTEGER, -- How many characters involved
  blueprint_id TEXT, -- Which blueprint/story
  blueprint_format TEXT, -- 'v1' or 'v2'

  -- User edits (what they asked for)
  edit_instructions TEXT, -- User's edit request (if any)
  is_regenerate BOOLEAN DEFAULT FALSE, -- Was this a regeneration vs first generation

  -- Token usage
  tokens_used INTEGER,

  -- Image details
  output_url TEXT, -- Generated image URL
  image_size TEXT, -- '1024x1024', '1536x1024', etc.

  -- Model info
  model_used TEXT DEFAULT 'gpt-image-2.5-sunburst',

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS generation_logs_user_id_idx ON generation_logs(user_id);
CREATE INDEX IF NOT EXISTS generation_logs_book_id_idx ON generation_logs(book_id);
CREATE INDEX IF NOT EXISTS generation_logs_event_type_idx ON generation_logs(event_type);
CREATE INDEX IF NOT EXISTS generation_logs_status_idx ON generation_logs(status);
CREATE INDEX IF NOT EXISTS generation_logs_created_at_idx ON generation_logs(created_at DESC);

-- RLS policies
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own logs" ON generation_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update (for API routes)
CREATE POLICY "Service can manage logs" ON generation_logs
  FOR ALL USING (true);

-- Summary view for quick analytics
CREATE OR REPLACE VIEW generation_analytics AS
SELECT
  DATE(created_at) as date,
  event_type,
  blueprint_id,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(duration_ms) FILTER (WHERE status = 'completed') as avg_duration_ms,
  SUM(tokens_used) as total_tokens,
  COUNT(*) FILTER (WHERE is_regenerate) as regenerations,
  COUNT(*) FILTER (WHERE edit_instructions IS NOT NULL AND edit_instructions != '') as edits_with_instructions
FROM generation_logs
GROUP BY DATE(created_at), event_type, blueprint_id
ORDER BY date DESC, event_type;
