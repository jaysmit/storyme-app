-- Add height_cm column to characters table
-- Height in centimeters, defaults based on age

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS height_cm INTEGER;

-- Add comment
COMMENT ON COLUMN characters.height_cm IS 'Character height in centimeters. Defaults based on age but can be customized.';
