-- Add age column to characters table for proportionate sizing
ALTER TABLE characters ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add check constraint for reasonable age range
ALTER TABLE characters ADD CONSTRAINT age_check CHECK (age IS NULL OR (age >= 1 AND age <= 120));
