/**
 * Run migration 016 - add sex column to characters
 */
require('dotenv').config({ path: '.env.local' });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_ID = 'kgnzhfueafnuzjqpcldj';

const sql = `
-- Migration: Add sex column to characters for correct pronoun generation
ALTER TABLE characters ADD COLUMN IF NOT EXISTS sex TEXT;

-- Add constraint for valid values (drop first if exists)
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_sex_check;
ALTER TABLE characters ADD CONSTRAINT characters_sex_check
  CHECK (sex IS NULL OR sex IN ('male', 'female'));

COMMENT ON COLUMN characters.sex IS 'Sex of the character for pronoun generation (he/she, him/her). NULL for pets/unknown.';
`;

async function runMigration() {
  console.log('Running migration 016: Add sex column...\n');

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Migration failed:', response.status, error);
    process.exit(1);
  }

  const result = await response.json();
  console.log('Migration completed successfully!');
  console.log(JSON.stringify(result, null, 2));
}

runMigration().catch(console.error);
