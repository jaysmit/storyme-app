-- Add physical_description column to characters table
-- This stores the AI-analyzed description of the person/pet from their photo
-- Used to maintain consistent appearance across story scene generations

ALTER TABLE characters ADD COLUMN IF NOT EXISTS physical_description TEXT;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN characters.physical_description IS 'AI-generated physical description from uploaded photo, used for consistent character appearance in story illustrations';
