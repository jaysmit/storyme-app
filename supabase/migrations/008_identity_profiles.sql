-- Migration: Add identity profiles to characters
-- Structured identity data for consistent character representation across book pages

-- Add identity profile columns to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS identity_profile JSONB,
ADD COLUMN IF NOT EXISTS identity_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_version INTEGER DEFAULT 1;

-- Create index for finding characters with pending identity confirmation
CREATE INDEX IF NOT EXISTS idx_characters_identity_pending
ON characters (user_id)
WHERE identity_confirmed = false AND generation_status = 'pending';

-- Comment on the new columns
COMMENT ON COLUMN characters.identity_profile IS 'Structured physical attributes (hair, eyes, skin tone) extracted from photo';
COMMENT ON COLUMN characters.identity_confirmed IS 'Whether the user has reviewed and confirmed the identity profile';
COMMENT ON COLUMN characters.identity_version IS 'Version number for identity profile schema, allows future migrations';
