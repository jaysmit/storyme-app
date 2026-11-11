-- Migration: Add page-level status tracking for full book generation
-- Enables Step 5 where users approve cover and generate all interior pages

-- Add per-page status tracking for generation progress
ALTER TABLE books ADD COLUMN IF NOT EXISTS page_statuses JSONB DEFAULT '[]'::jsonb;

-- Add generation config for retry/resume functionality
ALTER TABLE books ADD COLUMN IF NOT EXISTS generation_config JSONB;

-- Update status constraint to include new states
-- First drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'books_status_check'
    ) THEN
        ALTER TABLE books DROP CONSTRAINT books_status_check;
    END IF;
END $$;

-- Add new constraint with additional statuses
ALTER TABLE books ADD CONSTRAINT books_status_check
    CHECK (status IN ('draft', 'generating', 'preview_ready', 'cover_approved', 'generating_full', 'completed', 'purchased'));

-- Add index for finding books in active generation
CREATE INDEX IF NOT EXISTS idx_books_generating_full
ON books (user_id, status)
WHERE status = 'generating_full';

-- Comments for documentation
COMMENT ON COLUMN books.page_statuses IS 'Array of PageStatus objects tracking generation state for each page';
COMMENT ON COLUMN books.generation_config IS 'Configuration used for generation (characterIds, artStyle, bookId) for resume capability';
