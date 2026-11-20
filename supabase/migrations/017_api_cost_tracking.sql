-- API cost tracking for generation logs
-- Extends existing generation_logs table with cost calculation columns

-- Add cost tracking columns to generation_logs
ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS estimated_cost_usd DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
ADD COLUMN IF NOT EXISTS pricing_version TEXT DEFAULT '2026-11',
ADD COLUMN IF NOT EXISTS cost_calculation_method TEXT DEFAULT 'estimated';

-- Comments for documentation
COMMENT ON COLUMN generation_logs.estimated_cost_usd IS 'Estimated USD cost for this API call';
COMMENT ON COLUMN generation_logs.input_tokens IS 'Input token count (for token-based models)';
COMMENT ON COLUMN generation_logs.output_tokens IS 'Output token count (for token-based models)';
COMMENT ON COLUMN generation_logs.pricing_version IS 'Which pricing version was used for cost calculation (e.g., 2026-11)';
COMMENT ON COLUMN generation_logs.cost_calculation_method IS 'How cost was calculated: estimated, actual, or flat_rate';

-- Index for cost queries
CREATE INDEX IF NOT EXISTS generation_logs_cost_idx ON generation_logs(estimated_cost_usd) WHERE estimated_cost_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS generation_logs_pricing_version_idx ON generation_logs(pricing_version);

-- Create cost analytics view (extends existing generation_analytics)
CREATE OR REPLACE VIEW cost_analytics AS
SELECT
  DATE(created_at) as date,
  event_type,
  blueprint_id,
  user_id,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_requests,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_requests,
  SUM(estimated_cost_usd) FILTER (WHERE status = 'completed') as total_cost_usd,
  AVG(estimated_cost_usd) FILTER (WHERE status = 'completed') as avg_cost_per_request,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  AVG(duration_ms) FILTER (WHERE status = 'completed') as avg_duration_ms
FROM generation_logs
GROUP BY DATE(created_at), event_type, blueprint_id, user_id
ORDER BY date DESC, event_type;

-- Daily cost summary view for dashboard
CREATE OR REPLACE VIEW daily_cost_summary AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_requests,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_requests,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 1) as success_rate_pct,
  COALESCE(SUM(estimated_cost_usd) FILTER (WHERE status = 'completed'), 0) as total_cost_usd,
  COALESCE(AVG(estimated_cost_usd) FILTER (WHERE status = 'completed'), 0) as avg_cost_per_request,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT book_id) FILTER (WHERE book_id IS NOT NULL) as unique_books,
  COALESCE(AVG(duration_ms) FILTER (WHERE status = 'completed'), 0) as avg_duration_ms
FROM generation_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- User cost summary view for admin dashboard
CREATE OR REPLACE VIEW user_cost_summary AS
SELECT
  user_id,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_requests,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_requests,
  COALESCE(SUM(estimated_cost_usd) FILTER (WHERE status = 'completed'), 0) as total_cost_usd,
  COALESCE(AVG(estimated_cost_usd) FILTER (WHERE status = 'completed'), 0) as avg_cost_per_request,
  COUNT(DISTINCT book_id) FILTER (WHERE book_id IS NOT NULL) as total_books,
  MIN(created_at) as first_request_at,
  MAX(created_at) as last_request_at
FROM generation_logs
GROUP BY user_id
ORDER BY total_cost_usd DESC;

-- Book cost summary view
CREATE OR REPLACE VIEW book_cost_summary AS
SELECT
  book_id,
  user_id,
  blueprint_id,
  COUNT(*) as total_pages_generated,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_pages,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_pages,
  COUNT(*) FILTER (WHERE is_regenerate = true) as regenerations,
  COALESCE(SUM(estimated_cost_usd) FILTER (WHERE status = 'completed'), 0) as total_cost_usd,
  MIN(created_at) as generation_started_at,
  MAX(created_at) as generation_completed_at
FROM generation_logs
WHERE book_id IS NOT NULL
GROUP BY book_id, user_id, blueprint_id
ORDER BY generation_started_at DESC;
