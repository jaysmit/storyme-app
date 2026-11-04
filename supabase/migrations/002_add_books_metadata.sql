-- Add metadata column to books table for storing generation parameters
ALTER TABLE books ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_books_metadata ON books USING gin(metadata);
