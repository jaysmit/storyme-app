-- Add pet_type column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS pet_type TEXT;
