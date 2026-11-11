-- Migration: Add characters snapshot to books for resilient generation
-- Stores character data at preview time so generation works even if characters are deleted

-- Add characters snapshot column
ALTER TABLE books ADD COLUMN IF NOT EXISTS characters_snapshot JSONB;

-- Comments for documentation
COMMENT ON COLUMN books.characters_snapshot IS 'Snapshot of character data at preview generation time - includes id, name, generated_image_url, identity_profile for resilient generation';
