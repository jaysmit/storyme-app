-- Pricing configuration table for API cost tracking
-- Stores model pricing with version support for handling price changes

CREATE TABLE IF NOT EXISTS pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identification
  model_id TEXT NOT NULL,                    -- e.g., 'gpt-4o', 'gpt-image-2', 'gpt-image-2.5-sunburst'
  model_display_name TEXT NOT NULL,          -- Human-readable name

  -- Pricing version (for handling price changes over time)
  pricing_version TEXT NOT NULL,             -- e.g., '2026-11'
  effective_from TIMESTAMPTZ NOT NULL,       -- When this pricing became effective
  effective_until TIMESTAMPTZ,               -- NULL means current pricing

  -- Pricing type
  pricing_type TEXT NOT NULL,                -- 'per_token' or 'flat_rate'

  -- Token-based pricing (for chat/completion models)
  input_cost_per_1m_tokens DECIMAL(10, 4),   -- Cost per 1M input tokens
  output_cost_per_1m_tokens DECIMAL(10, 4),  -- Cost per 1M output tokens

  -- Flat-rate pricing (for image models)
  flat_rate_per_image DECIMAL(10, 4),        -- Cost per image generation

  -- Image-specific pricing (varies by size/quality)
  size_1024x1024_cost DECIMAL(10, 4),
  size_1536x1024_cost DECIMAL(10, 4),
  size_1024x1536_cost DECIMAL(10, 4),
  quality_high_multiplier DECIMAL(4, 2) DEFAULT 1.0,
  quality_low_multiplier DECIMAL(4, 2) DEFAULT 0.5,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique model+version combinations
  UNIQUE(model_id, pricing_version)
);

-- Comments
COMMENT ON TABLE pricing_config IS 'API pricing configuration with version support';
COMMENT ON COLUMN pricing_config.pricing_type IS 'per_token for chat models, flat_rate for image models';
COMMENT ON COLUMN pricing_config.effective_until IS 'NULL means this is the current active pricing';

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS pricing_config_model_idx ON pricing_config(model_id);
CREATE INDEX IF NOT EXISTS pricing_config_version_idx ON pricing_config(pricing_version);
CREATE INDEX IF NOT EXISTS pricing_config_effective_idx ON pricing_config(effective_from DESC);

-- RLS policies - pricing config is read-only for everyone, write only via service role
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read pricing config (for transparency)
CREATE POLICY "Anyone can read pricing config" ON pricing_config
  FOR SELECT USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service can manage pricing config" ON pricing_config
  FOR ALL USING (true);

-- Seed with current OpenAI pricing (as of November 2026)
-- These are estimates based on public OpenAI pricing

-- GPT-4o (Vision/Chat model) - used for photo analysis
INSERT INTO pricing_config (
  model_id, model_display_name, pricing_version, effective_from,
  pricing_type, input_cost_per_1m_tokens, output_cost_per_1m_tokens,
  notes
) VALUES (
  'gpt-4o', 'GPT-4o Vision', '2026-11', '2026-11-01',
  'per_token', 2.50, 10.00,
  'Used for character photo analysis. Input includes image tokens (~765 tokens for 512x512).'
) ON CONFLICT (model_id, pricing_version) DO NOTHING;

-- GPT-Image-2 (Character illustrations) - flat rate per image
INSERT INTO pricing_config (
  model_id, model_display_name, pricing_version, effective_from,
  pricing_type, flat_rate_per_image,
  size_1024x1024_cost, quality_low_multiplier,
  notes
) VALUES (
  'gpt-image-2', 'DALL-E Image Edit (Standard)', '2026-11', '2026-11-01',
  'flat_rate', 0.040,
  0.040, 0.5,
  'Used for character caricature generation. Low quality (1024x1024).'
) ON CONFLICT (model_id, pricing_version) DO NOTHING;

-- GPT-Image-2.5-Sunburst (Book pages) - higher quality image generation
INSERT INTO pricing_config (
  model_id, model_display_name, pricing_version, effective_from,
  pricing_type, flat_rate_per_image,
  size_1024x1024_cost, size_1536x1024_cost, size_1024x1536_cost,
  quality_high_multiplier, quality_low_multiplier,
  notes
) VALUES (
  'gpt-image-2.5-sunburst', 'DALL-E Image Edit (Premium)', '2026-11', '2026-11-01',
  'flat_rate', 0.080,
  0.080, 0.100, 0.100,
  1.0, 0.5,
  'Used for book cover and interior pages. High quality, various sizes.'
) ON CONFLICT (model_id, pricing_version) DO NOTHING;

-- Function to get current pricing for a model
CREATE OR REPLACE FUNCTION get_current_pricing(p_model_id TEXT)
RETURNS TABLE(
  model_id TEXT,
  pricing_type TEXT,
  input_cost_per_1m_tokens DECIMAL,
  output_cost_per_1m_tokens DECIMAL,
  flat_rate_per_image DECIMAL,
  size_1024x1024_cost DECIMAL,
  size_1536x1024_cost DECIMAL,
  size_1024x1536_cost DECIMAL,
  quality_high_multiplier DECIMAL,
  quality_low_multiplier DECIMAL,
  pricing_version TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.model_id,
    pc.pricing_type,
    pc.input_cost_per_1m_tokens,
    pc.output_cost_per_1m_tokens,
    pc.flat_rate_per_image,
    pc.size_1024x1024_cost,
    pc.size_1536x1024_cost,
    pc.size_1024x1536_cost,
    pc.quality_high_multiplier,
    pc.quality_low_multiplier,
    pc.pricing_version
  FROM pricing_config pc
  WHERE pc.model_id = p_model_id
    AND pc.effective_until IS NULL
  ORDER BY pc.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
