-- Add text_overlays column to books table for user-editable text positioning
-- Each page can have text content, position, size, and color settings

ALTER TABLE books
ADD COLUMN IF NOT EXISTS text_overlays JSONB DEFAULT '[]';

-- Structure example:
-- [
--   {
--     "pageNumber": 1,
--     "text": "Leon couldn't wait to watch his beloved Bombers!",
--     "position": { "x": 50, "y": 90 },  -- percentage from top-left
--     "fontSize": 18,
--     "fontColor": "#FFFFFF",
--     "backgroundColor": "rgba(0,0,0,0.6)",
--     "textAlign": "center"
--   }
-- ]

COMMENT ON COLUMN books.text_overlays IS 'User-editable text overlays for each page with position, size, and color settings';
