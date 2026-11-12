-- Migration: Add name_mapping and personalized_pages for V2 book format
-- Supports story text personalization with character name templates

-- Add name_mapping column to store slot_id -> display_name mapping
-- Example: {"leon": "Tommy", "mum": "Sarah", "dad": "Michael"}
ALTER TABLE books ADD COLUMN IF NOT EXISTS name_mapping JSONB DEFAULT '{}';

-- Add personalized_pages column to store pre-computed personalized story text
-- Example: [{"page_number": 1, "title": "Game Day!", "story_text": "Tommy couldn't wait..."}]
ALTER TABLE books ADD COLUMN IF NOT EXISTS personalized_pages JSONB DEFAULT '[]';

-- Add blueprint_format column to track which format was used
-- Helps with debugging and allows format-specific handling
ALTER TABLE books ADD COLUMN IF NOT EXISTS blueprint_format TEXT DEFAULT 'v1';

-- Comment for documentation
COMMENT ON COLUMN books.name_mapping IS 'Maps V2 blueprint slot IDs (leon, mum, etc.) to customer display names';
COMMENT ON COLUMN books.personalized_pages IS 'Pre-computed personalized story text for each page in V2 books';
COMMENT ON COLUMN books.blueprint_format IS 'Blueprint format version used: v1 or v2';
