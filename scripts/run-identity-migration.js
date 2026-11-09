// Run identity profile migration
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
  console.log('Running identity profile migration...\n');

  // Check if columns exist by trying to query them
  console.log('Checking identity_profile column...');
  const { error: checkError } = await supabase
    .from('characters')
    .select('identity_profile')
    .limit(1);

  if (checkError && checkError.message.includes('does not exist')) {
    console.log('  Column does not exist - please run this SQL in Supabase dashboard:\n');
    console.log(`
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS identity_profile JSONB,
ADD COLUMN IF NOT EXISTS identity_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_characters_identity_pending
ON characters (user_id)
WHERE identity_confirmed = false AND generation_status = 'pending';
    `);
  } else {
    console.log('  identity_profile column already exists');

    // Check other columns
    const { error: check2 } = await supabase
      .from('characters')
      .select('identity_confirmed, identity_version')
      .limit(1);

    if (check2) {
      console.log('  Some columns missing, may need manual SQL');
    } else {
      console.log('  All identity columns exist');
    }
  }

  console.log('\nMigration check complete.');
}

runMigration().catch(console.error);
