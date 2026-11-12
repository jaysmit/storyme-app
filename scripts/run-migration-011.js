// Run migration 011 for V2 name_mapping columns
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration 011: V2 name_mapping columns...\n');

  // Test if columns exist by trying to select them
  const columnsToCheck = [
    { name: 'name_mapping', default: '{}' },
    { name: 'personalized_pages', default: '[]' },
    { name: 'blueprint_format', default: "'v1'" }
  ];

  for (const col of columnsToCheck) {
    console.log(`Checking column: ${col.name}...`);

    const { data, error } = await supabase
      .from('books')
      .select(col.name)
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log(`  Column ${col.name} does not exist - please run via SQL Editor:`);
      console.log(`  ALTER TABLE books ADD COLUMN IF NOT EXISTS ${col.name} ${col.name === 'blueprint_format' ? 'TEXT' : 'JSONB'} DEFAULT ${col.default};`);
    } else if (error) {
      console.log(`  Error checking ${col.name}: ${error.message}`);
    } else {
      console.log(`  Column ${col.name} exists`);
    }
  }

  console.log('\nMigration check complete.');
  console.log('\nTo apply missing columns, run this SQL in Supabase SQL Editor:');
  console.log(`
-- Migration: Add name_mapping and personalized_pages for V2 book format
ALTER TABLE books ADD COLUMN IF NOT EXISTS name_mapping JSONB DEFAULT '{}';
ALTER TABLE books ADD COLUMN IF NOT EXISTS personalized_pages JSONB DEFAULT '[]';
ALTER TABLE books ADD COLUMN IF NOT EXISTS blueprint_format TEXT DEFAULT 'v1';
  `);
}

runMigration().catch(console.error);
