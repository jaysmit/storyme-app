-- Migration: Add sex column to characters for correct pronoun generation
-- This allows story text to use correct pronouns (he/she, him/her, his/hers)

ALTER TABLE characters ADD COLUMN IF NOT EXISTS sex TEXT;

-- Add constraint for valid values
ALTER TABLE characters ADD CONSTRAINT characters_sex_check
  CHECK (sex IS NULL OR sex IN ('male', 'female'));

COMMENT ON COLUMN characters.sex IS 'Sex of the character for pronoun generation (he/she, him/her). NULL for pets/unknown.';
