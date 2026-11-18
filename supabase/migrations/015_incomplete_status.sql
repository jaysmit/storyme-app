-- Migration: Add "incomplete" status and improve book completion tracking
-- This migration adds support for books that have failed or missing pages

-- Step 1: Drop existing constraint (if any)
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;

-- Step 2: Add new constraint with "incomplete" status
ALTER TABLE books ADD CONSTRAINT books_status_check
  CHECK (status IN ('draft', 'generating', 'preview_ready', 'cover_approved', 'generating_full', 'incomplete', 'completed', 'purchased'));

-- Step 3: Add comment explaining statuses
COMMENT ON COLUMN books.status IS 'Book generation status:
  - draft: Initial state, no generation started
  - generating: Legacy status (cover generation)
  - preview_ready: Cover generated, ready for review
  - cover_approved: Cover approved, ready for full generation
  - generating_full: Full book generation in progress
  - incomplete: Generation finished but some pages failed/missing
  - completed: All pages successfully generated and validated
  - purchased: Book has been ordered for printing';

-- Step 4: Add validation metadata columns if not exist
-- These help track exactly what was expected vs what was generated
DO $$
BEGIN
  -- Add validation_result column to store last validation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'validation_result'
  ) THEN
    ALTER TABLE books ADD COLUMN validation_result JSONB;
    COMMENT ON COLUMN books.validation_result IS 'Last validation result with issues found';
  END IF;

  -- Add validated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'validated_at'
  ) THEN
    ALTER TABLE books ADD COLUMN validated_at TIMESTAMPTZ;
    COMMENT ON COLUMN books.validated_at IS 'When the book was last validated';
  END IF;
END $$;

-- Step 5: Identify and fix any incorrectly completed books
-- Books with status "completed" but have failed/pending/generating pages should be "incomplete"
UPDATE books
SET
  status = 'incomplete',
  updated_at = NOW()
WHERE
  status = 'completed'
  AND page_statuses IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(page_statuses) AS page
    WHERE page->>'status' IN ('failed', 'pending', 'generating')
  );

-- Step 6: Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_user_status ON books(user_id, status);
