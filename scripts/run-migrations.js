// Run pending migrations using Supabase service role
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('Running migrations...\n');

  // Migration 005: Add pet_type column
  console.log('Migration 005: Adding pet_type column...');
  const { error: error1 } = await supabase.rpc('exec', {
    sql: 'ALTER TABLE characters ADD COLUMN IF NOT EXISTS pet_type TEXT'
  });

  if (error1) {
    // Try direct query if RPC doesn't work
    const { error: directError1 } = await supabase
      .from('characters')
      .select('pet_type')
      .limit(1);

    if (directError1 && directError1.message.includes('does not exist')) {
      console.log('  Column does not exist, need to add via SQL Editor');
    } else {
      console.log('  pet_type column already exists or was added');
    }
  } else {
    console.log('  Done');
  }

  // Migration 006: Add physical_description column
  console.log('Migration 006: Adding physical_description column...');
  const { error: error2 } = await supabase.rpc('exec', {
    sql: 'ALTER TABLE characters ADD COLUMN IF NOT EXISTS physical_description TEXT'
  });

  if (error2) {
    const { error: directError2 } = await supabase
      .from('characters')
      .select('physical_description')
      .limit(1);

    if (directError2 && directError2.message.includes('does not exist')) {
      console.log('  Column does not exist, need to add via SQL Editor');
    } else {
      console.log('  physical_description column already exists or was added');
    }
  } else {
    console.log('  Done');
  }

  console.log('\nMigration check complete.');
}

runMigrations().catch(console.error);
