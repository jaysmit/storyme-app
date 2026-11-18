/**
 * Run a database migration
 * Usage: node scripts/run-migration.js <migration-file>
 * Example: node scripts/run-migration.js 015_incomplete_status.sql
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`Running migration: ${migrationFile}`);
  console.log('---');

  // Split by semicolons but be careful with DO blocks
  // For complex migrations, we'll run the whole thing at once
  const { data, error } = await supabase.rpc('run_sql', { sql_string: sql });

  if (error) {
    // If RPC doesn't exist, try using REST API
    console.log('RPC not available, trying direct connection...');
    console.log('Please run this SQL manually in Supabase SQL Editor:');
    console.log('---');
    console.log(sql);
    console.log('---');
    console.log('Or run: supabase db push --linked');
    return;
  }

  console.log('Migration completed successfully!');
  console.log(data);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.log('Usage: node scripts/run-migration.js <migration-file>');
  console.log('Example: node scripts/run-migration.js 015_incomplete_status.sql');
  process.exit(1);
}

runMigration(migrationFile);
